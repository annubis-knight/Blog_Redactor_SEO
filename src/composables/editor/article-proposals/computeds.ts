import { computed } from 'vue'
import { checkKeywordComposition } from '@/composables/seo/useCompositionCheck'
import { articleTypeToLevel } from '@/composables/keyword/useCapitaineValidation'
import type { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { GROUP_COLORS, normalizeTitle } from './builders'

/**
 * Factory : crée tous les computeds dérivés du store de stratégie
 * (colonnes, warnings, groupes, couleurs, scoring de composition).
 *
 * Ces computeds sont volontairement extraits du composable principal pour
 * isoler la logique d'agrégation, qui est aussi la plus volumineuse.
 */
export function createArticleComputeds(store: ReturnType<typeof useCocoonStrategyStore>) {
  const intermediateTitles = computed(() => {
    if (!store.strategy) return [] as string[]
    return store.strategy.proposedArticles
      .filter(a => a.type === 'Intermédiaire' && a.title.trim())
      .map(a => a.title)
  })

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

  return {
    intermediateTitles,
    articleColumns,
    articleWarnings,
    globalWarnings,
    groupColors,
    groupedSpecArticles,
    compositionResults,
  }
}
