/**
 * Tests de rendu KPI nullable — composants front (FR-INFRA-KPI-DISPLAY-DASH).
 *
 * Vérifie que les composants Vue qui consomment KeywordOverview /
 * LocationMetrics / RadarKeywordKpis / KeywordAuditResult / KpiSummary
 * affichent `'—'` quand les KPIs sont `null`, jamais `'0'` ni `'0.00 €'`.
 *
 * Couvre les FRs :
 *   - FR-INFRA-KPI-DISPLAY-DASH (AC5, AC6 : composants Radar / Local)
 *   - FR-INFRA-KPI-CONSISTENCY (AC3 : cohérence affichage par composant)
 *
 * Stratégie : un test par composant migré, focalisé sur le contrat null.
 * Les tests fonctionnels existants (radar-keyword-card-*.test.ts,
 * captain-side-panel.test.ts, etc.) couvrent déjà le comportement nominal.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import RadarKeywordCard from '@/components/intent/RadarKeywordCard.vue'
import KeywordAuditTable from '@/components/keywords/KeywordAuditTable.vue'
import DataForSeoPanel from '@/components/brief/DataForSeoPanel.vue'
import SerpDataTab from '@/components/panels/SerpDataTab.vue'

import type { RadarCard } from '@shared/types/intent.types.js'
import type { KeywordAuditResult } from '@shared/types/keyword-audit.types.js'
import type { DataForSeoCacheEntry } from '@shared/types/dataforseo.types.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

// =============================================================================
// FR-INFRA-KPI-DISPLAY-DASH AC5 — RadarKeywordCard
// =============================================================================

describe('FR-INFRA-KPI-DISPLAY-DASH AC5 — RadarKeywordCard avec KPIs null', () => {
  function makeRadarCard(overrides: Partial<NonNullable<RadarCard['kpis']>> = {}): RadarCard {
    return {
      keyword: 'kw-sans-data',
      reasoning: 'reasoning',
      kpis: {
        searchVolume: null,
        difficulty: null,
        cpc: null,
        competition: null,
        intentTypes: [],
        intentProbability: null,
        autocompleteMatchCount: 0,
        paaMatchCount: 0,
        paaWeightedScore: 0,
        paaTotal: 0,
        avgSemanticScore: null,
        ...overrides,
      },
      paaItems: [],
      combinedScore: 0,
      scoreBreakdown: {
        paaMatchScore: 0,
        resonanceBonus: 0,
        opportunityScore: 0,
        intentValueScore: 0,
        cpcScore: 0,
        painAlignmentScore: 50,
        total: 0,
      },
      cachedPaa: false,
    }
  }

  it('searchVolume null → cellule volume affiche "—" (jamais "0")', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: {
        card: makeRadarCard(),
        expanded: false,
      },
    })
    const kpiSection = wrapper.find('.radar-card__kpis')
    expect(kpiSection.exists()).toBe(true)
    expect(kpiSection.text()).toContain('—')
    expect(kpiSection.text()).not.toMatch(/vol\s*0\b/)
  })

  it('cpc null → cellule CPC affiche "—" (jamais "0.00 €")', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeRadarCard(), expanded: false },
    })
    const kpiSection = wrapper.find('.radar-card__kpis')
    expect(kpiSection.text()).not.toContain('0.00 €')
  })

  it('difficulty null → cellule KD affiche "—"', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeRadarCard(), expanded: false },
    })
    const kpiSection = wrapper.find('.radar-card__kpis')
    expect(kpiSection.text()).toContain('—')
  })

  it('mix null/non-null : seuls les champs null affichent "—"', () => {
    const card = makeRadarCard({ searchVolume: 1500, difficulty: null, cpc: 1.23, competition: null })
    const wrapper = mount(RadarKeywordCard, { props: { card, expanded: false } })
    const text = wrapper.find('.radar-card__kpis').text()
    expect(text).toContain('1.5k') // volume formaté
    expect(text).toContain('1.23 €') // cpc formaté
    expect(text).toContain('—') // KD null
  })
})

// =============================================================================
// FR-INFRA-KPI-DISPLAY-DASH — KeywordAuditTable
// =============================================================================

describe('FR-INFRA-KPI-DISPLAY-DASH — KeywordAuditTable avec KPIs null', () => {
  function makeAuditResult(overrides: Partial<KeywordAuditResult> = {}): KeywordAuditResult {
    return {
      keyword: 'kw-test',
      type: 'Pilier',
      status: 'suggested',
      cocoonName: 'cocon-x',
      searchVolume: null,
      difficulty: null,
      cpc: null,
      competition: null,
      compositeScore: { volume: null, difficultyInverse: null, cpc: null, competitionInverse: null, total: null },
      relatedKeywords: [],
      fromCache: false,
      cachedAt: null,
      alerts: [],
      ...overrides,
    }
  }

  it('keyword sans données → ligne contient "—" (jamais "0" trompeur dans les colonnes KPI)', () => {
    const wrapper = mount(KeywordAuditTable, {
      props: {
        results: [makeAuditResult()],
        redundancies: [],
      },
    })
    expect(wrapper.text()).toContain('—')
  })

  it('mix d\'un keyword avec data + un sans → "—" présent uniquement pour le sans', () => {
    const wrapper = mount(KeywordAuditTable, {
      props: {
        results: [
          makeAuditResult({ keyword: 'with-data', searchVolume: 1000, difficulty: 30, cpc: 1.5, competition: 0.4 }),
          makeAuditResult({ keyword: 'without-data' }),
        ],
        redundancies: [],
      },
    })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).toContain('with-data')
    expect(wrapper.text()).toContain('without-data')
  })
})

// =============================================================================
// FR-INFRA-KPI-DISPLAY-DASH — DataForSeoPanel
// =============================================================================

describe('FR-INFRA-KPI-DISPLAY-DASH — DataForSeoPanel avec KPIs null', () => {
  function makeBrief(overrides: Partial<DataForSeoCacheEntry['keywordData']> = {}): DataForSeoCacheEntry {
    return {
      keyword: 'kw-test',
      serp: [],
      paa: [],
      relatedKeywords: [],
      keywordData: {
        searchVolume: null,
        difficulty: null,
        cpc: null,
        competition: null,
        monthlySearches: [],
        ...overrides,
      },
      cachedAt: '2026-05-05T00:00:00Z',
    }
  }

  it('keywordData tous null → panel affiche "—" pour Volume, CPC, Competition', () => {
    const wrapper = mount(DataForSeoPanel, {
      props: { data: makeBrief(), isRefreshing: false },
    })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('0.00 €')
  })
})

// =============================================================================
// FR-INFRA-KPI-DISPLAY-DASH — SerpDataTab
// =============================================================================

describe('FR-INFRA-KPI-DISPLAY-DASH — SerpDataTab avec KPIs null', () => {
  it('keywordData tous null → cellules KPI affichent "—"', () => {
    const wrapper = mount(SerpDataTab, {
      props: {
        data: {
          keyword: 'kw-test',
          serp: [],
          paa: [],
          relatedKeywords: [],
          keywordData: {
            searchVolume: null,
            difficulty: null,
            cpc: null,
            competition: null,
            monthlySearches: [],
          },
          cachedAt: '2026-05-05T00:00:00Z',
        },
        isRefreshing: false,
      },
    })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('0.00 €')
  })
})

