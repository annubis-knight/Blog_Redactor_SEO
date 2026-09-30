// @vitest-environment node
/**
 * NFR-UX-SCREEN-TEXT — la raison d'un mot-clé envoyé de Discovery au Radar est
 * écrite en français.
 *
 * Recette du 2026-09-30 : une carte du Radar venue de Discovery sans raison de
 * l'IA affichait « Discovered via suggest-alphabet » (anglais et identifiant
 * technique). Elle nomme désormais la source comme la section de Discovery.
 */
import { describe, it, expect } from 'vitest'
import { toRadarKeywords, DISCOVERY_SOURCE_LABELS } from '../../../shared/types/discovery-tab.types'

describe('NFR-UX-SCREEN-TEXT — toRadarKeywords', () => {
  it('sans raison de l’IA : la source en français, comme le titre de sa section', () => {
    const [kw] = toRadarKeywords([{ keyword: 'agence web toulouse', source: 'suggest-alphabet' }])
    expect(kw!.reasoning).toBe('Trouvé par Discovery : Alphabet (A-Z).')
  })

  it('la raison de l’IA est gardée telle quelle', () => {
    const [kw] = toRadarKeywords([{ keyword: 'prix site', source: 'ai', reasoning: 'Intention d’achat.' }])
    expect(kw!.reasoning).toBe('Intention d’achat.')
  })

  it('chaque source a un libellé', () => {
    for (const label of Object.values(DISCOVERY_SOURCE_LABELS)) expect(label.trim()).not.toBe('')
  })
})
