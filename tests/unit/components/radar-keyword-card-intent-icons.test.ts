/**
 * FR-UI-RADAR-CARD — les pictogrammes d'intention se voient.
 *
 * Recette du 2026-09-30 (UI-1, RAD-4, UI-2) : sur les cartes du Radar et du
 * Capitaine, chaque `span.intent-badge` portait un `<svg>` vide. Les tracés
 * (`intentConfig[…].svg`, sans `<svg>` englobant) passent par la directive
 * `v-safe-svg`, qui les retirait. On monte la carte avec la directive telle
 * que `main.ts` l'enregistre.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import { safeSvgDirective } from '../../../src/directives/v-safe-html'
import type { RadarCard } from '../../../shared/types/intent.types'

function card(intentTypes: string[]): RadarCard {
  return {
    keyword: 'plombier toulouse',
    reasoning: '',
    cachedPaa: false,
    kpis: {
      searchVolume: 673000, difficulty: 54, cpc: 4.63, competition: 0.5,
      paaTotal: 2, paaMatchCount: 1, paaWeightedScore: 2,
      intentTypes, intentProbability: 0.8,
      autocompleteMatchCount: 3, avgSemanticScore: null,
    },
    paaItems: [],
  } as unknown as RadarCard
}

function badges(intentTypes: string[]) {
  const wrapper = mount(RadarKeywordCard, {
    props: { card: card(intentTypes), articleLevel: 'intermediaire' },
    global: { directives: { 'safe-svg': safeSvgDirective } },
  })
  return wrapper.findAll('.intent-badge')
}

describe('FR-UI-RADAR-CARD — pictogrammes d’intention visibles (recette 2026-09-30, UI-1)', () => {
  it.each([
    ['informational', 'Informationnel'],
    ['commercial', 'Commercial'],
    ['transactional', 'Transactionnel'],
    ['navigational', 'Navigationnel'],
  ])('« %s » : le pictogramme a un tracé, et l’infobulle « %s »', (intent, label) => {
    const [badge] = badges([intent])
    expect(badge?.attributes('title')).toBe(label)
    const svg = badge!.find('svg').element
    expect(svg.children.length, 'le <svg> du pictogramme ne doit pas être vide').toBeGreaterThan(0)
  })
})
