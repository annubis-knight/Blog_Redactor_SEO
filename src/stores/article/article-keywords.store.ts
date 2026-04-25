import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPut, apiPost, apiPatch } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleKeywords, CaptainValidationEntry, RichRootKeyword, RichLieutenant } from '@shared/types/index.js'
import type { ProposedLieutenant } from '@shared/types/serp-analysis.types.js'

const MAX_VALIDATION_HISTORY = 30

export const useArticleKeywordsStore = defineStore('article-keywords', () => {
  const keywords = ref<ArticleKeywords | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isSuggestingLexique = ref(false)
  const error = ref<string | null>(null)

  const hasKeywords = computed(() => !!keywords.value?.capitaine)

  // ---- Rich computed getters ----

  const captainValidationHistory = computed(() =>
    keywords.value?.richCaptain?.validationHistory ?? [],
  )

  const lockedLieutenants = computed(() =>
    keywords.value?.richLieutenants?.filter(lt => lt.status === 'locked') ?? [],
  )

  const eliminatedLieutenants = computed(() =>
    keywords.value?.richLieutenants?.filter(lt => lt.status === 'eliminated') ?? [],
  )

  // ---- Fetch ----

  async function fetchKeywords(id: number) {
    isLoading.value = true
    error.value = null
    try {
      keywords.value = await apiGet<ArticleKeywords | null>(`/articles/${id}/keywords`)
      log.debug(`[article-keywords] fetched for article ${id}`, { capitaine: keywords.value?.capitaine })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[article-keywords] fetchKeywords failed`, { articleId: id, error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  // ---- Decision-only save (article_keywords table) ----

  async function saveDecisions(id: number) {
    if (!keywords.value) ensureKeywords(id)
    const kw = keywords.value!
    isSaving.value = true
    error.value = null
    try {
      keywords.value = await apiPut<ArticleKeywords>(`/articles/${id}/keywords`, {
        capitaine: kw.capitaine,
        lieutenants: kw.lieutenants,
        lexique: kw.lexique,
        rootKeywords: kw.rootKeywords ?? [],
        hnStructure: kw.hnStructure ?? [],
      })
      log.debug(`[article-keywords] decisions saved for article ${id}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      log.error(`[article-keywords] saveDecisions failed`, { articleId: id, error: error.value })
    } finally {
      isSaving.value = false
    }
  }

  /** @deprecated Use saveDecisions() — kept as alias during transition */
  async function saveKeywords(id: number) {
    return saveDecisions(id)
  }

  // ---- Exploration saves (dedicated tables) ----

  async function saveCaptainExplorationEntry(articleId: number, entry: CaptainValidationEntry) {
    try {
      await apiPost(`/articles/${articleId}/captain-explorations`, entry)
      log.debug(`[article-keywords] captain exploration saved`, { keyword: entry.keyword })
    } catch (err) {
      log.error(`[article-keywords] saveCaptainExplorationEntry failed`, { articleId, keyword: entry.keyword, error: err })
    }
  }

  async function saveCaptainExplorationAiPanel(articleId: number, keyword: string, markdown: string) {
    try {
      await apiPatch(`/articles/${articleId}/captain-explorations/ai-panel`, { keyword, markdown })
      log.debug(`[article-keywords] captain AI panel saved`, { keyword })
    } catch (err) {
      log.error(`[article-keywords] saveCaptainExplorationAiPanel failed`, { articleId, keyword, error: err })
    }
  }

  async function saveLieutenantExplorationEntries(articleId: number, entries: RichLieutenant[], captainKeyword: string) {
    try {
      await apiPost(`/articles/${articleId}/lieutenant-explorations`, { entries, captainKeyword })
      log.debug(`[article-keywords] lieutenant explorations saved`, { count: entries.length })
    } catch (err) {
      log.error(`[article-keywords] saveLieutenantExplorationEntries failed`, { articleId, error: err })
    }
  }

  // ---- Misc ----

  async function suggestLexique(articleId: number, articleTitle: string, cocoonName: string) {
    if (!keywords.value?.capitaine) return
    log.info(`[article-keywords] suggesting lexique for article ${articleId}`)
    isSuggestingLexique.value = true
    error.value = null
    try {
      const result = await apiPost<{ lexique: string[] }>('/keywords/lexique-suggest', {
        capitaine: keywords.value.capitaine,
        articleTitle,
        cocoonName,
      })
      if (keywords.value) {
        keywords.value.lexique = result.lexique
        log.debug(`[article-keywords] lexique suggested: ${result.lexique.length} terms`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de suggestion'
      log.error(`[article-keywords] suggestLexique failed`, { articleId, error: error.value })
    } finally {
      isSuggestingLexique.value = false
    }
  }

  // ---- Ensure keywords initialized ----

  function ensureKeywords(id: number) {
    if (!keywords.value) {
      initEmpty(id)
    }
  }

  // ---- Captain mutations ----

  function setCapitaine(value: string) {
    if (!keywords.value) {
      keywords.value = { articleId: 0, capitaine: value, lieutenants: [], lexique: [], rootKeywords: [] }
    } else {
      keywords.value.capitaine = value
    }
    if (keywords.value.richCaptain) {
      keywords.value.richCaptain.keyword = value
    }
  }

  function addCaptainValidation(entry: CaptainValidationEntry, articleId?: number) {
    if (!keywords.value) {
      if (articleId) ensureKeywords(articleId)
      else return
    }
    const kw = keywords.value!
    if (!kw.richCaptain) {
      kw.richCaptain = {
        keyword: '',
        status: 'suggested',
        validationHistory: [],
        aiPanelMarkdown: null,
        lockedAt: null,
      }
    }
    // Dedup by keyword — update in place if already exists
    const history = kw.richCaptain.validationHistory
    const existingIdx = history.findIndex(h => h.keyword === entry.keyword)
    if (existingIdx !== -1) {
      history[existingIdx] = entry
    } else {
      history.push(entry)
      if (history.length > MAX_VALIDATION_HISTORY) {
        history.splice(0, history.length - MAX_VALIDATION_HISTORY)
      }
    }
  }

  function lockCaptain(keyword: string, aiPanelMarkdown: string | null, articleId?: number) {
    if (!keywords.value) {
      if (articleId) ensureKeywords(articleId)
      else return
    }
    const kw = keywords.value!
    kw.capitaine = keyword
    if (!kw.richCaptain) {
      kw.richCaptain = {
        keyword,
        status: 'locked',
        validationHistory: [],
        aiPanelMarkdown,
        lockedAt: new Date().toISOString(),
      }
    } else {
      kw.richCaptain.keyword = keyword
      kw.richCaptain.status = 'locked'
      kw.richCaptain.aiPanelMarkdown = aiPanelMarkdown
      kw.richCaptain.lockedAt = new Date().toISOString()
    }
  }

  function updateCaptainValidationAiPanel(keyword: string, aiPanelMarkdown: string) {
    const history = keywords.value?.richCaptain?.validationHistory
    if (!history) return
    const entry = history.find(h => h.keyword === keyword)
    if (entry) entry.aiPanelMarkdown = aiPanelMarkdown
  }

  // ---- Root keyword mutations ----

  function addRootKeywordValidation(root: RichRootKeyword, articleId?: number) {
    if (!keywords.value) {
      if (articleId) ensureKeywords(articleId)
      else return
    }
    const kw = keywords.value!
    if (!kw.richRootKeywords) {
      kw.richRootKeywords = []
    }
    // Avoid duplicates (same keyword + same parent)
    const exists = kw.richRootKeywords.some(
      r => r.keyword === root.keyword && r.parentKeyword === root.parentKeyword,
    )
    if (!exists) {
      kw.richRootKeywords.push(root)
    }
  }

  // ---- Lieutenant mutations ----

  function setRootKeywords(roots: string[]) {
    if (!keywords.value) return
    keywords.value.rootKeywords = roots
  }

  function addLieutenant(value: string) {
    if (!keywords.value) return
    if (!keywords.value.lieutenants.includes(value)) {
      keywords.value.lieutenants.push(value)
    }
  }

  function removeLieutenant(value: string) {
    if (!keywords.value) return
    keywords.value.lieutenants = keywords.value.lieutenants.filter(l => l !== value)
    // Mark as eliminated in rich data if exists
    const rich = keywords.value.richLieutenants?.find(lt => lt.keyword === value)
    if (rich) {
      rich.status = 'eliminated'
    }
  }

  function saveRichLieutenantProposals(selected: ProposedLieutenant[], eliminated: ProposedLieutenant[]) {
    if (!keywords.value) return
    const rich: RichLieutenant[] = [
      ...selected.map(lt => ({
        keyword: lt.keyword,
        status: 'suggested' as const,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
        kpis: null,
        lockedAt: null,
      })),
      ...eliminated.map(lt => ({
        keyword: lt.keyword,
        status: 'eliminated' as const,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
        kpis: null,
        lockedAt: null,
      })),
    ]
    keywords.value.richLieutenants = rich
    log.debug(`[article-keywords] rich lieutenant proposals saved`, { selected: selected.length, eliminated: eliminated.length })
  }

  function setRichLieutenants(selected: ProposedLieutenant[], eliminated: ProposedLieutenant[]) {
    if (!keywords.value) return
    const now = new Date().toISOString()
    const rich: RichLieutenant[] = [
      ...selected.map(lt => ({
        keyword: lt.keyword,
        status: 'locked' as const,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
        kpis: null,
        lockedAt: now,
      })),
      ...eliminated.map(lt => ({
        keyword: lt.keyword,
        status: 'eliminated' as const,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
        kpis: null,
        lockedAt: null,
      })),
    ]
    keywords.value.richLieutenants = rich
    // Sync flat lieutenants with locked ones only
    keywords.value.lieutenants = selected.map(lt => lt.keyword)
    log.debug(`[article-keywords] rich lieutenants locked`, { locked: selected.length, eliminated: eliminated.length })
  }

  // ---- Lexique ----

  function addLexiqueTerm(value: string) {
    if (!keywords.value) return
    if (!keywords.value.lexique.includes(value)) {
      keywords.value.lexique.push(value)
    }
  }

  function removeLexiqueTerm(value: string) {
    if (!keywords.value) return
    keywords.value.lexique = keywords.value.lexique.filter(t => t !== value)
  }

  // ---- Init & reset ----

  function initEmpty(id: number) {
    keywords.value = {
      articleId: id,
      capitaine: '',
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      richCaptain: undefined,
      richRootKeywords: [],
      richLieutenants: [],
    }
  }

  function $reset() {
    keywords.value = null
    isLoading.value = false
    isSaving.value = false
    isSuggestingLexique.value = false
    error.value = null
  }

  return {
    keywords, isLoading, isSaving, isSuggestingLexique, error, hasKeywords,
    captainValidationHistory, lockedLieutenants, eliminatedLieutenants,
    fetchKeywords, saveKeywords, saveDecisions, suggestLexique,
    saveCaptainExplorationEntry, saveCaptainExplorationAiPanel, saveLieutenantExplorationEntries,
    setCapitaine, addCaptainValidation, lockCaptain, updateCaptainValidationAiPanel,
    addRootKeywordValidation,
    setRootKeywords, addLieutenant, removeLieutenant,
    saveRichLieutenantProposals, setRichLieutenants,
    addLexiqueTerm, removeLexiqueTerm,
    initEmpty, $reset,
  }
})
