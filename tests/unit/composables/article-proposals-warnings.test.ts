// @vitest-environment node
/**
 * NFR-UX-SCREEN-TEXT — les alertes de la carte du cocon parlent la langue de
 * l'utilisateur, jamais celle du code.
 *
 * Recette du 2026-09-30 (CER-10) : un article « Sans titre » non rattaché
 * affichait « Pas de lien vers un Intermédiaire (parentTitle manquant). » — le
 * nom d'un champ interne dans une alerte.
 */
import { describe, it, expect } from 'vitest'
import { createArticleComputeds } from '../../../src/composables/editor/article-proposals/computeds'
import type { useCocoonStrategyStore } from '../../../src/stores/strategy/cocoon-strategy.store'

type Store = ReturnType<typeof useCocoonStrategyStore>

function warningsFor(proposedArticles: Array<{ title: string; type: string; parentTitle?: string | null }>) {
  const store = { strategy: { proposedArticles } } as unknown as Store
  const { articleWarnings } = createArticleComputeds(store)
  return articleWarnings.value
}

/** Un identifiant du code : un mot collé en camelCase (`parentTitle`) ou en snake_case. */
const CODE_WORD = /\b[a-z]+(?:[A-Z][a-z]+)+\b|\b[a-z]+_[a-z_]+\b/

describe('NFR-UX-SCREEN-TEXT — alertes de la carte du cocon (recette 2026-09-30, CER-10)', () => {
  it('un spécialisé sans intermédiaire : phrase claire, qui renvoie au bouton « Lien »', () => {
    const warnings = warningsFor([
      { title: 'Le guide', type: 'pilier' },
      { title: 'Le budget', type: 'intermediaire', parentTitle: 'Le guide' },
      { title: 'Sans titre', type: 'specifique', parentTitle: null },
    ])
    const missing = warnings.get(2)?.find(w => w.type === 'missing_parent')
    expect(missing?.message).toBe('Ce spécialisé n’est rattaché à aucun intermédiaire : rattachez-le avec « Lien ».')
  })

  it('sans intermédiaire sur la carte, pas de renvoi à un bouton absent', () => {
    const warnings = warningsFor([{ title: 'Seul', type: 'specifique', parentTitle: '' }])
    expect(warnings.get(0)?.find(w => w.type === 'missing_parent')?.message).toBe('Ce spécialisé n’est rattaché à aucun intermédiaire.')
  })

  it('un intermédiaire sans pilier : phrase claire', () => {
    const warnings = warningsFor([{ title: 'Le budget', type: 'intermediaire', parentTitle: null }])
    expect(warnings.get(0)?.find(w => w.type === 'missing_parent')?.message).toBe('Cet intermédiaire n’est rattaché à aucun pilier.')
  })

  it('aucune alerte de la carte ne cite un nom du code', () => {
    const warnings = warningsFor([
      { title: 'Le budget', type: 'intermediaire', parentTitle: null },
      { title: 'Autre budget', type: 'intermediaire', parentTitle: 'Pilier fantôme' },
      { title: 'Sans titre', type: 'specifique', parentTitle: null },
      { title: 'Orphelin', type: 'specifique', parentTitle: 'Intermédiaire fantôme' },
    ])
    const messages = [...warnings.values()].flat().map(w => w.message)
    expect(messages.length).toBeGreaterThan(3)
    expect(messages.filter(m => CODE_WORD.test(m))).toEqual([])
  })
})
