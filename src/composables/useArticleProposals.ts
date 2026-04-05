import { computed, ref, watch, type Ref } from 'vue'
import { checkKeywordComposition } from '@/composables/useCompositionCheck'
import { articleTypeToLevel } from '@/composables/useCapitaineValidation'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import type { ProposedArticle, CocoonSuggestRequest, SuggestedTopic } from '@shared/types/index.js'
import { apiPost, apiDelete, apiPatch } from '@/services/api.service'

type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'

const GROUP_COLORS = ['#f59e0b', '#d97706', '#b45309', '#ea580c', '#c2410c', '#92400e']

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Derive a URL-friendly slug from a keyword (fallback when AI doesn't provide one) */
function keywordToSlug(keyword: string): string {
  if (!keyword.trim()) return ''
  return keyword
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9\s-]/g, '')      // remove special chars
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '')             // trim leading/trailing hyphens
}

export function useArticleProposals(params: {
  cocoonSlug: Ref<string>
  cocoonName: Ref<string>
  getSuggestContext: () => CocoonSuggestRequest['context']
}) {
  const { cocoonSlug, cocoonName, getSuggestContext } = params
  const store = useCocoonStrategyStore()
  const cocoonsStore = useCocoonsStore()

  const truncationWarning = ref<string | null>(null)
  const generationPhase = ref<'idle' | 'structure' | 'paa-queries' | 'paa-fetch' | 'specialises' | 'done' | 'error'>('idle')
  const generationWarning = ref<string | null>(null)
  const addingArticleType = ref<ArticleType | null>(null)

  // --- Migrate existing articles: derive slugs + assign IDs + backfill dbSlug ---
  watch(() => store.strategy?.proposedArticles, (articles) => {
    if (!articles) return
    let patched = false
    // Build title→slug map from BDD for dbSlug backfill
    const cocoon = cocoonsStore.cocoons.find(c => c.name === cocoonName.value)
    const dbTitleToSlug = new Map<string, string>()
    if (cocoon) {
      for (const a of cocoon.articles) {
        dbTitleToSlug.set(a.title, a.slug)
      }
    }
    for (const article of articles) {
      if (!article.id) {
        article.id = crypto.randomUUID()
        patched = true
      }
      if (!article.suggestedSlug && article.suggestedKeyword) {
        article.suggestedSlug = keywordToSlug(article.suggestedKeyword)
        if (!article.suggestedSlugs?.length) {
          article.suggestedSlugs = [article.suggestedSlug]
        }
        patched = true
      }
      // Backfill dbSlug for articles already in BDD but missing the field
      if (article.createdInDb && !article.dbSlug && article.title) {
        const found = dbTitleToSlug.get(article.title)
        if (found) {
          article.dbSlug = found
          patched = true
        }
      }
    }
    if (patched) {
      store.saveStrategy(cocoonSlug.value)
    }
  }, { immediate: true })

  // --- Parsing helpers ---

  function buildSingleArticle(
    obj: Record<string, unknown>,
    fallbackType: ArticleType,
  ): ProposedArticle {
    const validTypes = ['Pilier', 'Intermédiaire', 'Spécialisé'] as const
    const type = validTypes.includes(obj.type as typeof validTypes[number])
      ? (obj.type as typeof validTypes[number])
      : fallbackType
    const title = String(obj.title ?? '').trim()
    const keyword = String(obj.suggestedKeyword ?? '')
    const slug = String(obj.suggestedSlug ?? '') || keywordToSlug(keyword)
    return {
      id: crypto.randomUUID(),
      title,
      suggestedTitles: title ? [title] : [],
      type,
      parentTitle: (obj.parentTitle as string) ?? null,
      rationale: String(obj.rationale ?? ''),
      painPoint: String(obj.painPoint ?? ''),
      suggestedKeyword: keyword,
      suggestedKeywords: keyword ? [keyword] : [],
      suggestedSlug: slug,
      suggestedSlugs: slug ? [slug] : [],
      validatedSearchQuery: null,
      keywordValidated: false,
      searchQueryValidated: false,
      titleValidated: false,
      accepted: false,
      createdInDb: false,
      dbSlug: '',
    }
  }

  function parseSingleArticle(
    text: string,
    fallbackType: ArticleType,
  ): ProposedArticle | null {
    const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    try {
      const obj = JSON.parse(stripped)
      const item = Array.isArray(obj) ? obj[0] : obj
      if (item?.title && typeof item.title === 'string') {
        return buildSingleArticle(item, fallbackType)
      }
    } catch { /* try regex fallback */ }

    const match = stripped.match(/\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/)
    if (match) {
      try {
        const obj = JSON.parse(match[0])
        return buildSingleArticle(obj, fallbackType)
      } catch { /* give up */ }
    }
    return null
  }

  function extractArticlesFromJson(text: string): ProposedArticle[] {
    const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const objectRegex = /\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*\}/g
    const matches = stripped.match(objectRegex)
    if (!matches) return []

    const articles: ProposedArticle[] = []
    for (const raw of matches) {
      try {
        const obj = JSON.parse(raw) as Record<string, unknown>
        if (typeof obj.title === 'string' && obj.title.trim()) {
          const kw = (obj.suggestedKeyword as string) ?? ''
          const sl = ((obj.suggestedSlug as string) ?? '') || keywordToSlug(kw)
          articles.push({
            id: crypto.randomUUID(),
            title: obj.title.trim(),
            suggestedTitles: [obj.title.trim()],
            type: (['Pilier', 'Intermédiaire', 'Spécialisé'] as const).includes(obj.type as any) ? (obj.type as ArticleType) : 'Spécialisé',
            parentTitle: (obj.parentTitle as string) ?? null,
            rationale: (obj.rationale as string) ?? '',
            painPoint: (obj.painPoint as string) ?? '',
            suggestedKeyword: kw,
            suggestedKeywords: kw ? [kw] : [],
            suggestedSlug: sl,
            suggestedSlugs: sl ? [sl] : [],
            validatedSearchQuery: null,
            keywordValidated: false,
            searchQueryValidated: false,
            titleValidated: false,
            accepted: false,
            createdInDb: false,
            dbSlug: '',
          })
        }
      } catch { /* skip malformed object */ }
    }
    return articles
  }

  function extractPaaQueries(text: string): Array<{ interTitle: string; searchQueries: string[] }> {
    const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    try {
      const jsonMatch = stripped.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const arr = JSON.parse(jsonMatch[0]) as Array<{ interTitle: string; searchQueries: string[] }>
        return arr.filter(item => item.interTitle && Array.isArray(item.searchQueries))
      }
    } catch { /* fallback to regex */ }

    const objectRegex = /\{[^{}]*"interTitle"\s*:\s*"[^"]+?"[^{}]*\}/g
    const matches = stripped.match(objectRegex)
    if (!matches) return []

    const results: Array<{ interTitle: string; searchQueries: string[] }> = []
    for (const raw of matches) {
      try {
        const obj = JSON.parse(raw) as Record<string, unknown>
        if (typeof obj.interTitle === 'string' && Array.isArray(obj.searchQueries)) {
          results.push({
            interTitle: obj.interTitle,
            searchQueries: (obj.searchQueries as string[]).filter(q => typeof q === 'string'),
          })
        }
      } catch { /* skip */ }
    }
    return results
  }

  function parseArticlesFromSuggestion(suggestion: string): ProposedArticle[] {
    try {
      const jsonMatch = suggestion.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const articles = JSON.parse(jsonMatch[0]) as ProposedArticle[]
        return articles.map(a => {
          const kw = a.suggestedKeyword ?? ''
          const sl = (a.suggestedSlug ?? '') || keywordToSlug(kw)
          return {
            id: crypto.randomUUID(),
            title: a.title ?? '',
            suggestedTitles: a.title ? [a.title] : [],
            type: a.type ?? 'Spécialisé',
            parentTitle: a.parentTitle ?? null,
            rationale: a.rationale ?? '',
            painPoint: a.painPoint ?? '',
            suggestedKeyword: kw,
            suggestedKeywords: kw ? [kw] : [],
            suggestedSlug: sl,
            suggestedSlugs: sl ? [sl] : [],
            validatedSearchQuery: null,
            keywordValidated: false,
            searchQueryValidated: false,
            titleValidated: false,
            accepted: false,
            createdInDb: false,
            dbSlug: '',
          }
        })
      }
    } catch { /* try object-by-object */ }
    return extractArticlesFromJson(suggestion)
  }

  // --- Article CRUD ---

  function addEmptyArticle(type: ArticleType) {
    if (!store.strategy) return
    store.strategy.proposedArticles.push({
      id: crypto.randomUUID(),
      title: '',
      suggestedTitles: [],
      type,
      parentTitle: null,
      rationale: '',
      painPoint: '',
      suggestedKeyword: '',
      suggestedKeywords: [],
      suggestedSlug: '',
      suggestedSlugs: [],
      validatedSearchQuery: null,
      keywordValidated: false,
      searchQueryValidated: false,
      titleValidated: false,
      accepted: false,
      createdInDb: false,
      dbSlug: '',
    })
  }

  async function addSmartArticle(type: ArticleType, userInput?: string) {
    if (!store.strategy) return
    addingArticleType.value = type

    try {
      const existingDetail = store.strategy.proposedArticles
        .filter(a => a.title)
        .map(a => ({
          title: a.title,
          type: a.type,
          parentTitle: a.parentTitle,
          suggestedKeyword: a.suggestedKeyword,
        }))

      const context = getSuggestContext()

      const payload: Record<string, string> = {
        articleType: type,
        existingArticlesDetail: JSON.stringify(existingDetail, null, 2),
      }
      if (userInput) payload.userInput = userInput

      const suggestion = await store.requestSuggestion(cocoonSlug.value, {
        step: 'add-article',
        currentInput: JSON.stringify(payload),
        context,
      })

      if (suggestion && store.strategy) {
        const article = parseSingleArticle(suggestion, type)
        if (article) {
          store.strategy.proposedArticles.push(article)
          store.saveStrategy(cocoonSlug.value)
          return
        }
      }
      addEmptyArticle(type)
    } catch {
      addEmptyArticle(type)
    } finally {
      addingArticleType.value = null
    }
  }

  async function removeProposedArticle(index: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return

    if (article.createdInDb && article.dbSlug) {
      try {
        await apiDelete(`/articles/${article.dbSlug}`)
      } catch {
        // Article may already have been removed
      }
    }

    store.strategy.proposedArticles.splice(index, 1)
    store.saveStrategy(cocoonSlug.value)
    await cocoonsStore.fetchCocoons()
  }

  async function createArticleInDb(article: ProposedArticle): Promise<void> {
    if (article.createdInDb || !article.title.trim()) return
    try {
      const created = await apiPost<Array<{ slug: string }>>('/articles/batch-create', {
        cocoonName: cocoonName.value,
        articles: [{ title: article.title, type: article.type, slug: article.suggestedSlug || undefined }],
      })
      if (created?.[0]?.slug) {
        article.dbSlug = created[0].slug
      }
      if (article.suggestedKeyword.trim()) {
        await apiPost('/keywords', {
          keyword: article.suggestedKeyword,
          cocoonName: cocoonName.value,
          type: article.type,
        })
      }
      article.createdInDb = true
    } catch {
      // Slug duplicate or other error
    }
  }

  async function toggleAccept(index: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    const nowAccepted = !article.accepted
    store.strategy.proposedArticles[index] = { ...article, accepted: nowAccepted }
    if (nowAccepted && !article.createdInDb) {
      await createArticleInDb(store.strategy.proposedArticles[index])
      store.saveStrategy(cocoonSlug.value)
      await cocoonsStore.fetchCocoons()
    }
  }

  // --- Regeneration ---

  async function regenerateTitle(index: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    const context = getSuggestContext()

    const typeRules: Record<string, string> = {
      'Pilier': 'Ton d\'expert, ancrage local naturel. Ne PAS écrire "PME" — utiliser "entreprises", "dirigeants". Ne PAS plaquer "Toulouse" — utiliser "toulousain", "Occitanie".',
      'Intermédiaire': 'Spécifique métier ou technique. PAS de ville. Utiliser des synonymes de PME ("activité", "structure", "équipe").',
      'Spécialisé': 'Question directe ou problème concret que le dirigeant se pose, en langage courant (pas de jargon).',
    }

    const allPreviousTitles = article.suggestedTitles?.length ? article.suggestedTitles.join('" / "') : article.title
    const suggestion = await store.requestSuggestion(cocoonSlug.value, {
      step: 'articles',
      currentInput: `Régénère uniquement le titre (H1) de cet article de type "${article.type}" pour le cocon "${cocoonName.value}". Mot-clé technique : "${article.suggestedKeyword}". Slug : "${article.suggestedSlug}". Titres déjà générés à NE PAS réutiliser : "${allPreviousTitles}". Propose un titre DIFFÉRENT. Le titre est la couche humaine du H1 : il intègre le mot-clé de façon naturelle, pas mot pour mot. Règle pour ce type : ${typeRules[article.type] ?? ''}. Réponds avec un seul nouveau titre, sans guillemets, sans explication.`,
      context,
    })
    if (suggestion && store.strategy) {
      const newTitle = suggestion.trim().replace(/^["«]|["»]$/g, '')
      const history = [...(article.suggestedTitles || [article.title]), newTitle]
      const uniqueHistory = [...new Set(history)]
      store.strategy.proposedArticles[index] = { ...article, title: newTitle, suggestedTitles: uniqueHistory }
    }
  }

  function selectTitle(articleIndex: number, titleIndex: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[articleIndex]
    if (!article?.suggestedTitles?.[titleIndex]) return
    store.strategy.proposedArticles[articleIndex] = {
      ...article,
      title: article.suggestedTitles[titleIndex],
    }
  }

  async function regenerateKeyword(index: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    const context = getSuggestContext()

    const typeRules: Record<string, string> = {
      'Pilier': '3-4 mots nominatifs, inclure la cible et la ville/région. Exemple : "stratégie digitale entreprises Toulouse".',
      'Intermédiaire': '3-4 mots nominatifs, sujet + cible. PAS de ville. Exemple : "design émotionnel site professionnel".',
      'Spécialisé': '4-6 mots nominatifs, longue traîne. Exemple : "choix couleurs site web professionnel".',
    }

    const allPrevious = article.suggestedKeywords?.length ? article.suggestedKeywords.join(', ') : article.suggestedKeyword
    const suggestion = await store.requestSuggestion(cocoonSlug.value, {
      step: 'articles',
      currentInput: `Régénère uniquement le mot-clé technique (racine technique) de cet article de type "${article.type}" pour le cocon "${cocoonName.value}". Titre actuel : "${article.title}". Mots-clés déjà générés à NE PAS réutiliser : ${allPrevious}. Propose un mot-clé DIFFÉRENT. Le mot-clé est une RACINE TECHNIQUE : forme nominative uniquement, PAS de verbe conjugué, PAS de "comment"/"pourquoi"/"quel", PAS de mots de liaison (de, du, des, le, la, les, un, une, pour, en, et, ou, avec, sur, dans, par). Format : mot1 mot2 mot3 (minuscules, espaces simples). Règle pour ce type : ${typeRules[article.type] ?? ''}. Réponds avec un seul mot-clé, sans guillemets, sans explication.`,
      context,
    })
    if (suggestion && store.strategy) {
      const newKeyword = suggestion.trim().replace(/^["«]|["»]$/g, '')
      const history = [...(article.suggestedKeywords || [article.suggestedKeyword]), newKeyword]
      const uniqueHistory = [...new Set(history)]
      store.strategy.proposedArticles[index] = { ...article, suggestedKeyword: newKeyword, suggestedKeywords: uniqueHistory }
    }
  }

  function selectKeyword(articleIndex: number, keywordIndex: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[articleIndex]
    if (!article?.suggestedKeywords?.[keywordIndex]) return
    store.strategy.proposedArticles[articleIndex] = {
      ...article,
      suggestedKeyword: article.suggestedKeywords[keywordIndex],
    }
  }

  async function regenerateSlug(index: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    const context = getSuggestContext()

    const allPrevious = article.suggestedSlugs?.length ? article.suggestedSlugs.join(', ') : article.suggestedSlug
    const suggestion = await store.requestSuggestion(cocoonSlug.value, {
      step: 'articles',
      currentInput: `Régénère uniquement le slug URL de cet article pour le cocon "${cocoonName.value}". Mot-clé technique : "${article.suggestedKeyword}". Slugs déjà générés à NE PAS réutiliser : ${allPrevious}. Le slug est dérivé du mot-clé : remplacer les espaces par des tirets, tout en minuscules, sans accents, sans mots vides (de, du, des, le, la, les, un, une, pour, en, et, ou, avec, sur, dans, par). Maximum 6 segments. Réponds avec un seul slug, sans guillemets, sans explication.`,
      context,
    })
    if (suggestion && store.strategy) {
      const newSlug = suggestion.trim().replace(/^["«]|["»]$/g, '').toLowerCase().replace(/\s+/g, '-')
      const prev = article.suggestedSlugs?.length ? article.suggestedSlugs : (article.suggestedSlug ? [article.suggestedSlug] : [])
      const history = [...prev, newSlug]
      const uniqueHistory = [...new Set(history)]
      store.strategy.proposedArticles[index] = { ...article, suggestedSlug: newSlug, suggestedSlugs: uniqueHistory }
    }
  }

  function selectSlug(articleIndex: number, slugIndex: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[articleIndex]
    if (!article?.suggestedSlugs?.[slugIndex]) return
    store.strategy.proposedArticles[articleIndex] = {
      ...article,
      suggestedSlug: article.suggestedSlugs[slugIndex],
    }
  }

  // --- Hierarchy ---

  const intermediateTitles = computed(() => {
    if (!store.strategy) return [] as string[]
    return store.strategy.proposedArticles
      .filter(a => a.type === 'Intermédiaire' && a.title.trim())
      .map(a => a.title)
  })

  function changeParent(index: number, parentTitle: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, parentTitle }
    store.saveStrategy(cocoonSlug.value)
  }

  async function editTitle(index: number, value: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, title: value }
    store.saveStrategy(cocoonSlug.value)
    if (article.createdInDb && article.dbSlug) {
      try {
        await apiPatch(`/articles/${article.dbSlug}`, { title: value })
        await cocoonsStore.fetchCocoons()
      } catch { /* BDD sync failed — strategy still saved */ }
    }
  }

  function editKeyword(index: number, value: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, suggestedKeyword: value }
    store.saveStrategy(cocoonSlug.value)
  }

  function editSlug(index: number, value: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, suggestedSlug: value }
    store.saveStrategy(cocoonSlug.value)
  }

  // --- Column computeds ---

  const articleColumns = computed(() => {
    if (!store.strategy) return []
    const cols = [
      { key: 'pilier', label: 'Pilier', cssClass: 'col-pilier', type: 'Pilier' as const, tooltip: 'Mot-clé : moyenne traîne (3-4 mots), inclure cible + ville.\nTitre : ancrage local naturel, pas de « PME » brut.\nEx : stratégie digitale entreprises Toulouse' },
      { key: 'inter', label: 'Intermédiaire', cssClass: 'col-inter', type: 'Intermédiaire' as const, tooltip: 'Mot-clé : moyenne traîne (3-4 mots), sans ville.\nTitre : spécifique métier/technique.\nEx : design émotionnel site professionnel' },
      { key: 'spec', label: 'Spécialisé', cssClass: 'col-spec', type: 'Spécialisé' as const, tooltip: 'Mot-clé : longue traîne (5+ mots), forme question.\nTitre : problème concret, langage du dirigeant.\nEx : comment choisir couleurs site web professionnel' },
    ]
    return cols.map(col => ({
      ...col,
      articles: store.strategy!.proposedArticles
        .map((a, i) => ({ ...a, originalIndex: i }))
        .filter(a => a.type === col.type),
    }))
  })

  const articleWarnings = computed(() => {
    if (!store.strategy) return new Map<number, Array<{ type: string; message: string }>>()
    const articles = store.strategy.proposedArticles
    const map = new Map<number, Array<{ type: string; message: string }>>()

    const piliers = articles.filter(a => a.type === 'Pilier')
    const inters = articles.filter(a => a.type === 'Intermédiaire')
    const specs = articles.filter(a => a.type === 'Spécialisé')

    const pilierTitles = new Set(piliers.map(a => normalizeTitle(a.title)))
    const interTitles = new Set(inters.map(a => normalizeTitle(a.title)))

    function pushWarning(idx: number, type: string, message: string) {
      if (!map.has(idx)) map.set(idx, [])
      map.get(idx)!.push({ type, message })
    }

    articles.forEach((article, i) => {
      if (article.type === 'Intermédiaire') {
        if (!article.parentTitle || !article.parentTitle.trim()) {
          pushWarning(i, 'missing_parent', 'Pas de lien vers le Pilier (parentTitle manquant).')
        } else if (!pilierTitles.has(normalizeTitle(article.parentTitle))) {
          pushWarning(i, 'orphan_inter', `Pilier inexistant : "${article.parentTitle}".`)
        }
        const childCount = specs.filter(s => s.parentTitle && normalizeTitle(s.parentTitle) === normalizeTitle(article.title)).length
        if (childCount < 2) {
          pushWarning(i, 'ratio_low', `Seulement ${childCount} Spécialisé(s) rattaché(s) (minimum 2).`)
        }
        if (childCount > 3) {
          pushWarning(i, 'ratio_high', `${childCount} Spécialisés rattachés (maximum 3).`)
        }
      }
      if (article.type === 'Spécialisé') {
        if (!article.parentTitle || !article.parentTitle.trim()) {
          pushWarning(i, 'missing_parent', 'Pas de lien vers un Intermédiaire (parentTitle manquant).')
        } else if (!interTitles.has(normalizeTitle(article.parentTitle))) {
          pushWarning(i, 'orphan_spe', `Intermédiaire inexistant : "${article.parentTitle}".`)
        }
      }
    })

    return map
  })

  const globalWarnings = computed(() => {
    if (!store.strategy) return []
    const warnings: Array<{ type: string; message: string }> = []
    const hasPilier = store.strategy.proposedArticles.some(a => a.type === 'Pilier')
    if (!hasPilier) {
      warnings.push({ type: 'no_pilier', message: 'Aucun article Pilier dans la liste.' })
    }
    return warnings
  })

  const groupColors = computed(() => {
    if (!store.strategy) return new Map<string, string>()
    const map = new Map<string, string>()
    const inters = store.strategy.proposedArticles.filter(a => a.type === 'Intermédiaire')
    inters.forEach((inter, i) => {
      map.set(normalizeTitle(inter.title), GROUP_COLORS[i % GROUP_COLORS.length]!)
    })
    return map
  })

  const groupedSpecArticles = computed(() => {
    if (!store.strategy) return []
    const specs = store.strategy.proposedArticles
      .map((a, i) => ({ ...a, originalIndex: i }))
      .filter(a => a.type === 'Spécialisé')

    const groups: Array<{ parentTitle: string; color: string; articles: typeof specs }> = []
    const groupMap = new Map<string, typeof specs>()

    for (const spec of specs) {
      const key = spec.parentTitle ? normalizeTitle(spec.parentTitle) : '__orphan__'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(spec)
    }

    const inters = store.strategy.proposedArticles.filter(a => a.type === 'Intermédiaire')
    for (const inter of inters) {
      const key = normalizeTitle(inter.title)
      const arts = groupMap.get(key)
      if (arts && arts.length > 0) {
        groups.push({ parentTitle: inter.title, color: groupColors.value.get(key) ?? '#9ca3af', articles: arts })
        groupMap.delete(key)
      }
    }

    const orphans: typeof specs = []
    for (const [, arts] of groupMap) {
      orphans.push(...arts)
    }
    if (orphans.length > 0) {
      groups.push({ parentTitle: 'Non rattachés', color: '#9ca3af', articles: orphans })
    }

    return groups
  })

  const compositionResults = computed(() => {
    if (!store.strategy) return new Map<number, ReturnType<typeof checkKeywordComposition>>()
    const map = new Map<number, ReturnType<typeof checkKeywordComposition>>()
    store.strategy.proposedArticles.forEach((a, i) => {
      if (a.suggestedKeyword.trim().length >= 2) {
        map.set(i, checkKeywordComposition(a.suggestedKeyword, articleTypeToLevel(a.type)))
      }
    })
    return map
  })

  // --- Generation ---

  function getTopicEnrichedContext() {
    const context = getSuggestContext()
    if (store.strategy) {
      const checked = store.strategy.suggestedTopics
        ?.filter(t => t.checked)
        .map(t => t.topic) ?? []
      if (checked.length > 0) context.topicSuggestions = checked
      const userCtx = store.strategy.topicsUserContext?.trim()
      if (userCtx) context.topicUserContext = userCtx
    }
    return context
  }

  async function generateArticleProposals() {
    truncationWarning.value = null
    generationWarning.value = null
    generationPhase.value = 'structure'
    const context = getTopicEnrichedContext()

    let pilierAndInterArticles: ProposedArticle[] = []

    try {
      type PaaMap = Record<string, Array<{ question: string; answer: string | null }>>
      const cocoonPaaPromise = apiPost<PaaMap>('/paa/batch', {
        queries: [cocoonName.value],
      }).catch(() => ({} as PaaMap))

      const structureSuggestion = await store.requestSuggestion(cocoonSlug.value, {
        step: 'articles-structure',
        currentInput: 'Génère le Pilier et les Intermédiaires.',
        context,
      })

      if (!structureSuggestion || !store.strategy) {
        generationPhase.value = 'error'
        return
      }

      pilierAndInterArticles = parseArticlesFromSuggestion(structureSuggestion)
      if (pilierAndInterArticles.length === 0) {
        generationPhase.value = 'error'
        return
      }

      store.strategy.proposedArticles = pilierAndInterArticles

      // === Phase 2: PAA queries ===
      generationPhase.value = 'paa-queries'

      const paaContext: Record<string, Array<{ question: string; answer: string | null }>> = {}

      try {
        const paaQueriesSuggestion = await store.requestSuggestion(cocoonSlug.value, {
          step: 'articles-paa-queries',
          currentInput: JSON.stringify(pilierAndInterArticles.map(a => ({ title: a.title, type: a.type, parentTitle: a.parentTitle }))),
          context,
        })

        if (paaQueriesSuggestion) {
          const paaQueryItems = extractPaaQueries(paaQueriesSuggestion)
          const allQueries = paaQueryItems.flatMap(item => item.searchQueries)

          if (allQueries.length > 0) {
            generationPhase.value = 'paa-fetch'
            const paaData = await apiPost<PaaMap>('/paa/batch', {
              queries: allQueries,
            }).catch(() => ({} as PaaMap))

            for (const item of paaQueryItems) {
              const questions: Array<{ question: string; answer: string | null }> = []
              const seen = new Set<string>()
              for (const query of item.searchQueries) {
                if (paaData[query]) {
                  for (const q of paaData[query]) {
                    if (!seen.has(q.question)) {
                      seen.add(q.question)
                      questions.push(q)
                    }
                  }
                }
              }
              paaContext[item.interTitle] = questions
            }
          }
        }

        const allEmpty = Object.values(paaContext).every(arr => arr.length === 0)
        if (allEmpty) {
          const cocoonPaaResult = await cocoonPaaPromise
          const cocoonPaa = cocoonPaaResult[cocoonName.value] ?? []
          if (cocoonPaa.length > 0) {
            const inters = pilierAndInterArticles.filter(a => a.type === 'Intermédiaire')
            for (const inter of inters) {
              paaContext[inter.title] = cocoonPaa
            }
          }
        }
      } catch {
        // Phase 2 failure — continue without PAA
      }

      // === Phase 3: Spécialisés enrichis ===
      generationPhase.value = 'specialises'

      try {
        const speSuggestion = await store.requestSuggestion(cocoonSlug.value, {
          step: 'articles-spe',
          currentInput: JSON.stringify(pilierAndInterArticles.map(a => ({ title: a.title, type: a.type, parentTitle: a.parentTitle }))),
          context: { ...context, paaContext },
        })

        if (speSuggestion) {
          const titleOccurrences = (speSuggestion.match(/"title"\s*:/g) || []).length
          const speArticles = parseArticlesFromSuggestion(speSuggestion)

          if (speArticles.length > 0) {
            store.strategy.proposedArticles = [...pilierAndInterArticles, ...speArticles]
            const lost = titleOccurrences - speArticles.length
            if (lost > 0) {
              truncationWarning.value = `${lost} article${lost > 1 ? 's' : ''} Spécialisé${lost > 1 ? 's' : ''} tronqué${lost > 1 ? 's' : ''} — seuls les articles complets sont affichés.`
            }
          } else {
            generationWarning.value = 'Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés.'
          }
        } else {
          generationWarning.value = 'Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés.'
        }
      } catch {
        generationWarning.value = 'Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés.'
      }

      generationPhase.value = 'done'
    } catch {
      generationPhase.value = 'error'
    }
  }

  async function validateArticles() {
    if (!store.strategy) return
    store.strategy.proposedArticles = store.strategy.proposedArticles.map(a => ({ ...a, accepted: true }))
    const toCreate = store.strategy.proposedArticles.filter(a => !a.createdInDb)
    for (const article of toCreate) {
      await createArticleInDb(article)
    }
    if (toCreate.length > 0) {
      store.saveStrategy(cocoonSlug.value)
      await cocoonsStore.fetchCocoons()
    }
  }

  // --- Topic Suggestions ---

  const topicsLoading = ref(false)
  const topicsError = ref<string | null>(null)

  let saveContextTimeout: ReturnType<typeof setTimeout> | null = null

  function generateTopicId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  function parseTopicsFromSuggestion(raw: string): string[] {
    // Strip code fences if present
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    try {
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed.filter(s => s.trim().length > 0)
      }
      // Handle array of objects with topic field
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && item.topic)) {
        return parsed.map(item => item.topic).filter((s: string) => s.trim().length > 0)
      }
    } catch {
      // Try to extract a JSON array from the text
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          const arr = JSON.parse(match[0])
          if (Array.isArray(arr)) return arr.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
        } catch { /* give up */ }
      }
    }
    return []
  }

  async function generateTopics() {
    if (topicsLoading.value || !store.strategy) return
    topicsLoading.value = true
    topicsError.value = null

    try {
      const context = getSuggestContext()
      // Guard: verify we have meaningful strategic content (F3 fix)
      const answers = context.previousAnswers ?? {}
      if (Object.keys(answers).length < 1) {
        topicsError.value = 'Complétez au moins les premières étapes stratégiques avant de générer les sujets.'
        return
      }

      const suggestion = await store.requestSuggestion(cocoonSlug.value, {
        step: 'articles-topics',
        currentInput: 'Propose les sujets du cocon.',
        context,
      })

      if (!suggestion || !store.strategy) {
        topicsError.value = 'Échec de la génération des sujets. Réessayez.'
        return
      }

      const topics = parseTopicsFromSuggestion(suggestion)
      if (topics.length === 0) {
        topicsError.value = 'Aucun sujet retourné. Réessayez.'
        return
      }

      store.strategy.suggestedTopics = topics.map(topic => ({
        id: generateTopicId(),
        topic,
        checked: true,
      }))
      store.saveStrategy(cocoonSlug.value)
    } catch {
      topicsError.value = 'Erreur lors de la génération des sujets.'
    } finally {
      topicsLoading.value = false
    }
  }

  function toggleTopic(index: number) {
    if (!store.strategy || index < 0 || index >= store.strategy.suggestedTopics.length) return
    store.strategy.suggestedTopics[index]!.checked = !store.strategy.suggestedTopics[index]!.checked
    store.saveStrategy(cocoonSlug.value)
  }

  function removeTopic(index: number) {
    if (!store.strategy || index < 0 || index >= store.strategy.suggestedTopics.length) return
    store.strategy.suggestedTopics.splice(index, 1)
    store.saveStrategy(cocoonSlug.value)
  }

  function addTopic(topic: string) {
    if (!store.strategy || !topic.trim()) return
    store.strategy.suggestedTopics.push({
      id: generateTopicId(),
      topic: topic.trim(),
      checked: true,
    })
    store.saveStrategy(cocoonSlug.value)
  }

  function updateUserContext(text: string) {
    if (!store.strategy) return
    store.strategy.topicsUserContext = text
    if (saveContextTimeout) clearTimeout(saveContextTimeout)
    saveContextTimeout = setTimeout(() => {
      store.saveStrategy(cocoonSlug.value)
    }, 500)
  }

  // Auto-generate topics when arriving at step 6 (Articles) for the first time
  watch(() => store.currentStep, (step) => {
    if (
      step === 5
      && store.strategy
      && (!store.strategy.suggestedTopics || store.strategy.suggestedTopics.length === 0)
      && !topicsLoading.value
    ) {
      generateTopics()
    }
  })

  return {
    // Refs
    truncationWarning,
    generationPhase,
    generationWarning,
    addingArticleType,
    topicsLoading,
    topicsError,
    // Computeds
    articleColumns,
    articleWarnings,
    globalWarnings,
    groupColors,
    groupedSpecArticles,
    compositionResults,
    intermediateTitles,
    // Helpers
    normalizeTitle,
    // Actions
    addEmptyArticle,
    addSmartArticle,
    removeProposedArticle,
    toggleAccept,
    regenerateTitle,
    selectTitle,
    regenerateKeyword,
    selectKeyword,
    regenerateSlug,
    selectSlug,
    changeParent,
    editTitle,
    editKeyword,
    editSlug,
    generateArticleProposals,
    validateArticles,
    // Topic actions
    generateTopics,
    toggleTopic,
    removeTopic,
    addTopic,
    updateUserContext,
  }
}
