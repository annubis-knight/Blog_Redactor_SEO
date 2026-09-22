// @vitest-environment node
/**
 * KPI du Capitaine calculés par une seule expression, au premier clic comme au
 * rechargement (CLAUDE.md §2.0, NFR-INT-DISPLAY-CONTRACTS, FR-INFRA-KPI-NULLABLE).
 */
import { describe, it, expect } from 'vitest'
import {
  scoreCaptainPaa,
  captainAutocompletePosition,
  captainKpisFromMetricsRow,
} from '../../../server/services/keyword/captain-kpis.js'

const paa = [
  { question: 'Combien coûte la création de site web à Toulouse ?', answer: 'Entre 1 500 et 5 000 €.' },
  { question: 'Comment devenir développeur ?', answer: null },
]

describe('scoreCaptainPaa — même score au clic et au rechargement', () => {
  it('donne le même résultat pour les mêmes questions et le même titre', () => {
    const a = scoreCaptainPaa('création site web toulouse', 'Guide création de site', paa)
    const b = scoreCaptainPaa('création site web toulouse', 'Guide création de site', paa)
    expect(a).toEqual(b)
    expect(a.matched).toHaveLength(2)
  })

  it('une question sur le sujet compte, une question hors sujet non', () => {
    const { matched, weightedScore } = scoreCaptainPaa('création site web toulouse', undefined, paa)
    expect(matched[0]!.match).not.toBe('none')
    expect(matched[1]!.match).toBe('none')
    expect(weightedScore).toBeGreaterThan(0)
  })

  it('aucune question → score 0 (Google n’en affiche pas : c’est une vraie valeur)', () => {
    expect(scoreCaptainPaa('x', undefined, []).weightedScore).toBe(0)
  })
})

describe('captainAutocompletePosition — trouvé, non trouvé, inconnu', () => {
  const suggestions = [{ text: 'création site web', position: 1 }, { text: 'création site web toulouse', position: 2 }]

  it('trouvé → sa position', () => {
    expect(captainAutocompletePosition('Création site web Toulouse', suggestions, true)).toBe(2)
  })

  it('suggestions connues mais mot absent → 0 (« Non trouvé », comme au premier clic)', () => {
    expect(captainAutocompletePosition('autre mot', suggestions, true)).toBe(0)
  })

  it('suggestions jamais récupérées → inconnu (« — »)', () => {
    expect(captainAutocompletePosition('autre mot', [], false)).toBeNull()
  })
})

describe('captainKpisFromMetricsRow — relecture en base', () => {
  const row = {
    keyword: 'création site web toulouse',
    search_volume: 480,
    keyword_difficulty: null,
    cpc: '20.87',
    intent_raw: 0.8,
    autocomplete_suggestions: [{ text: 'création site web toulouse', position: 1 }],
    autocomplete_source: 'google',
    metrics_fetched_at: new Date('2026-09-21'),
    article_title: 'Guide création de site',
  }

  it('recompose les 6 KPI : absents absents, NUMERIC converti, PAA recalculé', () => {
    const kpis = captainKpisFromMetricsRow(row, paa)
    const value = (name: string) => kpis.find(k => k.name === name)?.rawValue
    expect(kpis.map(k => k.name).sort()).toEqual(['autocomplete', 'cpc', 'intent', 'kd', 'paa', 'volume'])
    expect(value('volume')).toBe(480)
    expect(value('kd')).toBeNull()
    expect(value('cpc')).toBe(20.87)
    expect(value('autocomplete')).toBe(1)
    expect(value('paa')).toBe(scoreCaptainPaa(row.keyword, row.article_title, paa).weightedScore)
  })

  it('jamais mesuré → aucun KPI (verdict GRAY côté écran)', () => {
    expect(captainKpisFromMetricsRow({ ...row, metrics_fetched_at: null }, paa)).toEqual([])
  })
})

describe('captainIntentValue — intention inconnue affichée « — », pas « 0.50 »', async () => {
  const { captainIntentValue } = await import('../../../server/services/keyword/captain-kpis.js')
  it('inconnue → null ; mesurée → bornée entre 0 et 1', () => {
    expect(captainIntentValue(null)).toBeNull()
    expect(captainIntentValue(0.8)).toBe(0.8)
    expect(captainIntentValue(1.4)).toBe(1)
    expect(captainIntentValue('0.3')).toBe(0.3)
  })
})
