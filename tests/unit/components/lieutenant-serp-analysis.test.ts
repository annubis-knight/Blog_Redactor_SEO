/**
 * Tests anti-régression pour LieutenantSerpAnalysis — analyse SERP top concurrents.
 *
 * Macro composant qui pilote l'analyse SERP avant la proposition de lieutenants.
 * Couvre :
 *   1. slider value affiché + emit update:sliderValue au drag
 *   2. bouton Analyser disabled si !canAnalyze
 *   3. bouton Refresh visible UNIQUEMENT si serpResult + !isLocked
 *   4. multi-step progress affiché selon currentStep
 *   5. tabs SERP par keyword + clic emit update:activeSerpTab
 *   6. filtre Blogs/Autres : toggle + counts
 *   7. badges blog/autre par concurrent
 *   8. concurrent en erreur : strike + tooltip explicatif
 *   9. summary "fromCache" badge si applicable
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantSerpAnalysis from '../../../src/components/moteur/LieutenantSerpAnalysis.vue'
import type { SerpAnalysisResult, SerpCompetitor } from '../../../shared/types'

function makeCompetitor(over: Partial<SerpCompetitor> = {}): SerpCompetitor {
  return {
    position: 1,
    title: 'Top result',
    url: 'https://example.com',
    domain: 'example.com',
    headings: [],
    textContent: '',
    isBlog: true,
    ...over,
  }
}

function makeSerpResult(over: Partial<SerpAnalysisResult> = {}): SerpAnalysisResult {
  return {
    keyword: 'agence seo',
    articleLevel: 'pilier',
    competitors: [makeCompetitor()],
    paaQuestions: [],
    maxScraped: 5,
    cachedAt: '2026-04-30T10:00:00.000Z',
    fromCache: false,
    ...over,
  }
}

const BASE_PROPS = {
  serpResultsByKeyword: new Map<string, SerpAnalysisResult>(),
  activeSerpTab: '',
  activeSerpTabResult: null,
  displayedCompetitors: [] as SerpCompetitor[],
  serpResult: null,
  sliderValue: 5,
  isLoading: false,
  canAnalyze: true,
  isLocked: false,
  iaIsStreaming: false,
  serpDoneCount: 0,
  serpTotalCount: 0,
  iaChunks: '',
  currentStep: 'idle',
}

describe('LieutenantSerpAnalysis', () => {
  it('slider affiche la valeur courante + min=3 max=10', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, sliderValue: 7 },
    })
    expect(wrapper.find('.slider-label').text()).toContain('7')
    const slider = wrapper.find('input[type="range"]')
    expect(slider.attributes('min')).toBe('3')
    expect(slider.attributes('max')).toBe('10')
  })

  it('drag du slider → emit update:sliderValue avec nouveau Number', async () => {
    const wrapper = mount(LieutenantSerpAnalysis, { props: BASE_PROPS })
    const slider = wrapper.find('input[type="range"]')
    await slider.setValue('8')
    expect(wrapper.emitted('update:sliderValue')).toBeTruthy()
    expect(wrapper.emitted('update:sliderValue')![0]).toEqual([8])
  })

  it('REGRESSION GUARD : bouton Analyser disabled quand canAnalyze=false', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, canAnalyze: false },
    })
    const btn = wrapper.find('.btn-analyze')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('clic bouton Analyser → emit analyze', async () => {
    const wrapper = mount(LieutenantSerpAnalysis, { props: BASE_PROPS })
    await wrapper.find('.btn-analyze').trigger('click')
    expect(wrapper.emitted('analyze')).toBeTruthy()
  })

  it('bouton Refresh masqué tant qu\'aucun résultat', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResult: null },
    })
    expect(wrapper.find('.btn-refresh').exists()).toBe(false)
  })

  it('REGRESSION GUARD : bouton Refresh masqué si isLocked=true (même avec serpResult)', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResult: makeSerpResult(), isLocked: true },
    })
    expect(wrapper.find('.btn-refresh').exists()).toBe(false)
  })

  it('bouton Refresh visible si serpResult + !isLocked', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResult: makeSerpResult(), isLocked: false },
    })
    expect(wrapper.find('.btn-refresh').exists()).toBe(true)
  })

  it('clic Refresh → emit refresh', async () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResult: makeSerpResult() },
    })
    await wrapper.find('.btn-refresh').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('multi-step progress affiché si currentStep ≠ "idle"/"done"', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, currentStep: 'serp' },
    })
    expect(wrapper.find('[data-testid="analysis-steps"]').exists()).toBe(true)
  })

  it('multi-step progress masqué si currentStep="idle"', () => {
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, currentStep: 'idle' },
    })
    expect(wrapper.find('[data-testid="analysis-steps"]').exists()).toBe(false)
  })

  it('tabs SERP par keyword + count concurrents non-fail', () => {
    const map = new Map<string, SerpAnalysisResult>()
    map.set('kw1', makeSerpResult({
      keyword: 'kw1',
      competitors: [makeCompetitor({ position: 1 }), makeCompetitor({ position: 2 })],
    }))
    map.set('kw2', makeSerpResult({
      keyword: 'kw2',
      competitors: [makeCompetitor({ position: 1, fetchError: 'timeout' })],
    }))

    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResultsByKeyword: map, activeSerpTab: 'kw1' },
    })
    const tabs = wrapper.findAll('.serp-tab-btn')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].text()).toContain('kw1')
    expect(tabs[0].text()).toContain('2') // 2 concurrents OK
    expect(tabs[1].text()).toContain('kw2')
    expect(tabs[1].text()).toContain('0') // 1 fetchError → exclu du count
  })

  it('clic sur un tab SERP → emit update:activeSerpTab', async () => {
    const map = new Map<string, SerpAnalysisResult>()
    map.set('kw1', makeSerpResult({ keyword: 'kw1' }))
    map.set('kw2', makeSerpResult({ keyword: 'kw2' }))

    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResultsByKeyword: map, activeSerpTab: 'kw1' },
    })
    const tabs = wrapper.findAll('.serp-tab-btn')
    await tabs[1].trigger('click')
    expect(wrapper.emitted('update:activeSerpTab')).toBeTruthy()
    expect(wrapper.emitted('update:activeSerpTab')![0]).toEqual(['kw2'])
  })

  it('filtre Blogs : toggle on (active) puis off (clear)', async () => {
    const result = makeSerpResult({
      competitors: [
        makeCompetitor({ position: 1, isBlog: true, url: 'https://blog.com' }),
        makeCompetitor({ position: 2, isBlog: false, url: 'https://corp.com' }),
        makeCompetitor({ position: 3, isBlog: true, url: 'https://other-blog.com' }),
      ],
    })
    const map = new Map([['kw1', result]])
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: {
        ...BASE_PROPS,
        serpResultsByKeyword: map,
        activeSerpTab: 'kw1',
        activeSerpTabResult: result,
        serpResult: result,
      },
    })

    // Initial : 3 résultats visibles
    expect(wrapper.findAll('.serp-url-item')).toHaveLength(3)

    // Activer filtre Blogs → 2 visibles
    const blogBtns = wrapper.findAll('.blog-filter-btn')
    expect(blogBtns[0].text()).toContain('Blogs (2)')
    expect(blogBtns[1].text()).toContain('Autres (1)')
    await blogBtns[0].trigger('click')
    expect(wrapper.findAll('.serp-url-item')).toHaveLength(2)

    // Re-cliquer même bouton → clear filtre, retour à 3
    await blogBtns[0].trigger('click')
    expect(wrapper.findAll('.serp-url-item')).toHaveLength(3)
  })

  it('REGRESSION GUARD : concurrent en erreur affiche le badge ! et le strike', () => {
    const result = makeSerpResult({
      competitors: [makeCompetitor({ position: 1, fetchError: 'HTTP 503' })],
    })
    const map = new Map([['kw1', result]])
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: {
        ...BASE_PROPS,
        serpResultsByKeyword: map,
        activeSerpTab: 'kw1',
        activeSerpTabResult: result,
        serpResult: result,
      },
    })

    const item = wrapper.find('.serp-url-item')
    expect(item.classes()).toContain('serp-url-error')
    expect(item.attributes('title')).toContain('HTTP 503')
    expect(wrapper.find('.serp-url-error-badge').exists()).toBe(true)
  })

  it('badge cache visible si fromCache=true', () => {
    const result = makeSerpResult({ fromCache: true })
    const wrapper = mount(LieutenantSerpAnalysis, {
      props: { ...BASE_PROPS, serpResult: result, displayedCompetitors: result.competitors },
    })
    expect(wrapper.find('.cache-badge').exists()).toBe(true)
  })
})
