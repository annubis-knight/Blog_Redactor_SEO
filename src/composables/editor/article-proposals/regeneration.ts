import type { Ref } from 'vue'
import type { CocoonSuggestRequest } from '@shared/types/index.js'
import type { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'

/**
 * Factory : crée les actions de régénération (titre, mot-clé, slug) et de
 * sélection dans l'historique. Toutes ces actions interagissent avec le store
 * de stratégie et l'API IA — elles ne sont volontairement pas pures, mais
 * isoler ce bloc permet de garder le composable principal sous 400 lignes.
 */
export function createRegenerationActions(deps: {
  store: ReturnType<typeof useCocoonStrategyStore>
  cocoonSlug: Ref<string>
  cocoonName: Ref<string>
  getSuggestContext: () => CocoonSuggestRequest['context']
}) {
  const { store, cocoonSlug, cocoonName, getSuggestContext } = deps

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

  return {
    regenerateTitle,
    selectTitle,
    regenerateKeyword,
    selectKeyword,
    regenerateSlug,
    selectSlug,
  }
}
