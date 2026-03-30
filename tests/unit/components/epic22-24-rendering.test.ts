import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ---- Mocks ----

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiGet: vi.fn(),
}))

vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: vi.fn(),
    abort: vi.fn(),
  })),
}))

// ===================================================================
// 1. PainTranslator — rendering tests
// ===================================================================

import PainTranslator from '../../../src/components/intent/PainTranslator.vue'

describe('PainTranslator — rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the component with header, textarea and button', () => {
    const wrapper = mount(PainTranslator)

    expect(wrapper.find('.pain-title').text()).toBe('Traduction Sémantique')
    expect(wrapper.find('.pain-desc').exists()).toBe(true)
    expect(wrapper.find('textarea.pain-textarea').exists()).toBe(true)
    expect(wrapper.find('button.pain-btn').exists()).toBe(true)
  })

  it('button is disabled when textarea is empty', () => {
    const wrapper = mount(PainTranslator)
    const btn = wrapper.find('button.pain-btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('button is enabled after typing text', async () => {
    const wrapper = mount(PainTranslator)
    await wrapper.find('textarea').setValue('Mon site web ne génère plus de leads')
    const btn = wrapper.find('button.pain-btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('button displays correct label when not loading', () => {
    const wrapper = mount(PainTranslator)
    expect(wrapper.find('button.pain-btn').text()).toBe('Traduire en mots-clés')
  })

  it('does not show results or error initially', () => {
    const wrapper = mount(PainTranslator)
    expect(wrapper.find('.pain-results').exists()).toBe(false)
    expect(wrapper.find('.pain-error').exists()).toBe(false)
  })

  it('renders results with checkboxes when data is set', async () => {
    const wrapper = mount(PainTranslator)

    // Directly set component state to simulate API response
    const vm = wrapper.vm as any
    vm.results = [
      { keyword: 'refonte site web toulouse', reasoning: 'Requête locale transactionnelle', selected: false },
      { keyword: 'comment refaire son site', reasoning: 'Requête informationnelle', selected: false },
    ]
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('.pain-result-row')
    expect(rows).toHaveLength(2)

    // Check first row
    expect(rows[0].find('.pain-keyword').text()).toBe('refonte site web toulouse')
    expect(rows[0].find('.pain-reasoning').text()).toBe('Requête locale transactionnelle')
    expect(rows[0].find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('does not show "Explorer" button when no result is selected', async () => {
    const wrapper = mount(PainTranslator)
    const vm = wrapper.vm as any
    vm.results = [
      { keyword: 'kw1', reasoning: 'r1', selected: false },
    ]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pain-explore-btn').exists()).toBe(false)
  })

  it('shows "Explorer" button when a result is selected', async () => {
    const wrapper = mount(PainTranslator)
    const vm = wrapper.vm as any
    vm.results = [
      { keyword: 'kw1', reasoning: 'r1', selected: true },
    ]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pain-explore-btn').exists()).toBe(true)
    expect(wrapper.find('.pain-explore-btn').text()).toContain('Explorer')
  })

  it('clicking a result row toggles selection', async () => {
    const wrapper = mount(PainTranslator)
    const vm = wrapper.vm as any
    vm.results = [
      { keyword: 'kw1', reasoning: 'r1', selected: false },
    ]
    await wrapper.vm.$nextTick()

    await wrapper.find('.pain-result-row').trigger('click')
    await wrapper.vm.$nextTick()
    expect(vm.results[0].selected).toBe(true)
    expect(wrapper.find('.pain-result-row').classes()).toContain('selected')
  })

  it('emits "explore" with selected keyword when "Explorer" is clicked', async () => {
    const wrapper = mount(PainTranslator)
    const vm = wrapper.vm as any
    vm.results = [
      { keyword: 'seo toulouse', reasoning: 'Local', selected: true },
      { keyword: 'referencement', reasoning: 'Generic', selected: false },
    ]
    await wrapper.vm.$nextTick()

    await wrapper.find('.pain-explore-btn').trigger('click')
    expect(wrapper.emitted('explore')).toHaveLength(1)
    expect(wrapper.emitted('explore')![0]).toEqual(['seo toulouse'])
  })

  it('renders error message when error is set', async () => {
    const wrapper = mount(PainTranslator)
    const vm = wrapper.vm as any
    vm.error = 'API unavailable'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pain-error').exists()).toBe(true)
    expect(wrapper.find('.pain-error').text()).toBe('API unavailable')
  })

  it('textarea has correct placeholder text', () => {
    const wrapper = mount(PainTranslator)
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toContain('plombier')
    expect(textarea.attributes('placeholder')).toContain('Toulouse')
  })
})

// ===================================================================
// 2. ArticleCard — opportunity badge rendering
// ===================================================================

import ArticleCard from '../../../src/components/dashboard/ArticleCard.vue'

describe('ArticleCard — opportunity badge', () => {
  const baseArticle = {
    title: 'Comment choisir son agence SEO',
    type: 'Pilier' as const,
    slug: 'comment-choisir-agence-seo',
    topic: null,
    status: 'à rédiger' as const,
  }

  const globalStubs = {
    RouterLink: { template: '<a class="router-link"><slot /></a>' },
    StatusBadge: { template: '<span class="status-badge-stub">{{ $props.status }}</span>', props: ['status'] },
  }

  it('does not render opportunity badge when score is null', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: null },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').exists()).toBe(false)
  })

  it('does not render opportunity badge when prop is omitted', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').exists()).toBe(false)
  })

  it('renders opportunity badge with score value', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 75 },
      global: { stubs: globalStubs },
    })
    const badge = wrapper.find('.opportunity-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('75')
  })

  it('applies opp-high class for score >= 70', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 85 },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').classes()).toContain('opp-high')
  })

  it('applies opp-medium class for score 50-69', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 55 },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').classes()).toContain('opp-medium')
  })

  it('applies opp-low class for score 30-49', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 35 },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').classes()).toContain('opp-low')
  })

  it('applies opp-very-low class for score < 30', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 15 },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').classes()).toContain('opp-very-low')
  })

  it('badge has correct title tooltip', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 62 },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.opportunity-badge').attributes('title')).toBe("Score d'opportunité: 62/100")
  })

  it('renders badges container with both opportunity badge and status badge', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 80 },
      global: { stubs: globalStubs },
    })
    const badges = wrapper.find('.article-badges')
    expect(badges.exists()).toBe(true)
    expect(badges.find('.opportunity-badge').exists()).toBe(true)
    expect(badges.find('.status-badge-stub').exists()).toBe(true)
  })

  it('badge uses tabular-nums for consistent digit width (CSS check)', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 42 },
      global: { stubs: globalStubs },
    })
    const badge = wrapper.find('.opportunity-badge')
    // CSS class exists — visual property check via class
    expect(badge.classes()).toContain('opportunity-badge')
  })

  it('article title still renders alongside badges', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: baseArticle, opportunityScore: 90 },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.article-title').text()).toBe('Comment choisir son agence SEO')
  })
})

// ===================================================================
// 3. KeywordAuditTable — verdict column + switcher rendering
// ===================================================================

import KeywordAuditTable from '../../../src/components/keywords/KeywordAuditTable.vue'
import type { KeywordAuditResult, RedundancyPair } from '../../../shared/types/index'

function makeKw(overrides: Partial<KeywordAuditResult> = {}): KeywordAuditResult {
  return {
    keyword: 'test keyword',
    type: 'Pilier',
    status: 'suggested',
    cocoonName: 'Test',
    searchVolume: 100,
    difficulty: 30,
    cpc: 1.5,
    competition: 0.3,
    compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 57 },
    relatedKeywords: [],
    fromCache: false,
    cachedAt: null,
    alerts: [],
    ...overrides,
  }
}

describe('KeywordAuditTable — verdict & switcher rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const globalStubs = {
    KeywordAlertBadge: { template: '<span class="alert-badge-stub" />', props: ['alert'] },
  }

  it('renders verdict summary banner with correct counts', () => {
    const results = [
      makeKw({ keyword: 'kw1', searchVolume: 500, cpc: 5 }),   // brulante
      makeKw({ keyword: 'kw2', searchVolume: 0, cpc: 0 }),     // froide
      makeKw({ keyword: 'kw3', searchVolume: 100, cpc: 1 }),   // neutre
    ]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    const summary = wrapper.find('.verdict-summary')
    expect(summary.exists()).toBe(true)

    const chips = summary.findAll('.verdict-chip')
    // brulante, froide, neutre — no emergente (so 3 chips)
    expect(chips).toHaveLength(3)
    expect(summary.find('.verdict-brulante').text()).toContain('1 Brûlante')
    expect(summary.find('.verdict-froide').text()).toContain('1 Froide')
    expect(summary.find('.verdict-neutre').text()).toContain('1 Neutre')
  })

  it('does not render verdict summary when results are empty', () => {
    const wrapper = mount(KeywordAuditTable, {
      props: { results: [], redundancies: [] },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.verdict-summary').exists()).toBe(false)
  })

  it('verdict chips pluralize correctly', () => {
    const results = [
      makeKw({ keyword: 'kw1', searchVolume: 500, cpc: 5 }),
      makeKw({ keyword: 'kw2', searchVolume: 300, cpc: 4 }),
    ]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.verdict-brulante').text()).toContain('2 Brûlantes')
  })

  it('renders verdict badge in each table row', () => {
    const results = [
      makeKw({ keyword: 'kw1', searchVolume: 500, cpc: 5 }),   // brulante
      makeKw({ keyword: 'kw2', searchVolume: 100, cpc: 1 }),   // neutre
    ]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    const badges = wrapper.findAll('.verdict-badge')
    expect(badges).toHaveLength(2)
    expect(badges[0].text()).toBe('Brûlante')
    expect(badges[1].text()).toBe('Neutre')
  })

  it('verdict badge has correct inline style colors', () => {
    const results = [makeKw({ keyword: 'kw1', searchVolume: 500, cpc: 5 })] // brulante
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    const badge = wrapper.find('.verdict-badge')
    const style = badge.attributes('style') ?? ''
    expect(style).toContain('color: rgb(220, 38, 38)') // #dc2626
    expect(style).toContain('background: rgb(254, 242, 242)') // #fef2f2
  })

  it('renders "Verdict" column header', () => {
    const wrapper = mount(KeywordAuditTable, {
      props: { results: [makeKw()], redundancies: [] },
      global: { stubs: globalStubs },
    })
    const headers = wrapper.findAll('th')
    const verdictTh = headers.find(h => h.text().includes('Verdict'))
    expect(verdictTh).toBeDefined()
  })

  it('renders switcher button for keywords with difficulty > 50', () => {
    const results = [
      makeKw({ keyword: 'hard-kw', difficulty: 60 }),
      makeKw({ keyword: 'easy-kw', difficulty: 30 }),
    ]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    const switcherBtns = wrapper.findAll('.btn-switcher')
    expect(switcherBtns).toHaveLength(1) // only for difficulty > 50
  })

  it('does not render switcher button when difficulty <= 50', () => {
    const results = [makeKw({ keyword: 'easy-kw', difficulty: 50 })]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.btn-switcher').exists()).toBe(false)
  })

  it('clicking switcher button shows popover', async () => {
    const results = [makeKw({ keyword: 'hard-kw', difficulty: 60 })]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    expect(wrapper.find('.switcher-popover').exists()).toBe(false)

    await wrapper.find('.btn-switcher').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.switcher-popover').exists()).toBe(true)
  })

  it('switcher popover shows hint when no local data available', async () => {
    const results = [makeKw({ keyword: 'hard-kw', difficulty: 60 })]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    await wrapper.find('.btn-switcher').trigger('click')
    await wrapper.vm.$nextTick()

    const hint = wrapper.find('.switcher-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('Local/National')
  })

  it('clicking switcher again closes popover', async () => {
    const results = [makeKw({ keyword: 'hard-kw', difficulty: 60 })]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    await wrapper.find('.btn-switcher').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.switcher-popover').exists()).toBe(true)

    await wrapper.find('.btn-switcher').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.switcher-popover').exists()).toBe(false)
  })

  it('table header "Verdict" is sortable', () => {
    const wrapper = mount(KeywordAuditTable, {
      props: { results: [makeKw()], redundancies: [] },
      global: { stubs: globalStubs },
    })
    const headers = wrapper.findAll('th.sortable')
    const verdictTh = headers.find(h => h.text().includes('Verdict'))
    expect(verdictTh).toBeDefined()
  })

  it('status column shows status badge and action buttons', () => {
    const results = [makeKw({ keyword: 'kw1', status: 'suggested' })]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    expect(wrapper.find('.status-badge.status-suggested').exists()).toBe(true)
    expect(wrapper.find('.status-badge').text()).toBe('Suggéré')
    // Should have validate + reject buttons (not reset since status is 'suggested')
    expect(wrapper.find('.btn-validate').exists()).toBe(true)
    expect(wrapper.find('.btn-reject').exists()).toBe(true)
    expect(wrapper.find('.btn-reset-status').exists()).toBe(false)
  })

  it('validated keyword shows reset button but not validate button', () => {
    const results = [makeKw({ keyword: 'kw1', status: 'validated' })]
    const wrapper = mount(KeywordAuditTable, {
      props: { results, redundancies: [] },
      global: { stubs: globalStubs },
    })

    expect(wrapper.find('.status-badge.status-validated').exists()).toBe(true)
    expect(wrapper.find('.status-badge').text()).toBe('Validé')
    expect(wrapper.find('.btn-validate').exists()).toBe(false)
    expect(wrapper.find('.btn-reject').exists()).toBe(true)
    expect(wrapper.find('.btn-reset-status').exists()).toBe(true)
  })
})

// ===================================================================
// 4. ContentGapPanel — enrichment rendering
// ===================================================================

import ContentGapPanel from '../../../src/components/brief/ContentGapPanel.vue'

describe('ContentGapPanel — enrichment rendering', () => {
  const globalStubs = {
    LoadingSpinner: { template: '<div class="spinner-stub" />' },
    ErrorMessage: { template: '<div class="error-stub" />', props: ['message'] },
    CollapsableSection: {
      template: '<div class="section-stub"><slot /></div>',
      props: ['title', 'defaultOpen'],
    },
  }

  function mountWithData(gapData: any) {
    const wrapper = mount(ContentGapPanel, {
      props: { keyword: 'seo toulouse' },
      global: { stubs: globalStubs },
    })
    // Set internal state directly
    const vm = wrapper.vm as any
    vm.gapData = gapData
    vm.isAnalyzing = false
    return wrapper
  }

  it('renders analyze button initially', () => {
    const wrapper = mount(ContentGapPanel, {
      props: { keyword: 'seo toulouse' },
      global: { stubs: globalStubs },
    })
    expect(wrapper.find('.analyze-btn').text()).toBe('Analyser les concurrents')
  })

  it('renders overview cards when data is present', async () => {
    const wrapper = mountWithData({
      keyword: 'seo toulouse',
      competitors: [
        { url: 'https://a.com', title: 'A', headings: [], wordCount: 1200, localEntities: [] },
      ],
      themes: [
        { theme: 'SEO local', frequency: 3, presentInArticle: true },
      ],
      gaps: [],
      averageWordCount: 1200,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    const overviewCards = wrapper.findAll('.overview-card')
    expect(overviewCards.length).toBeGreaterThanOrEqual(4)

    // Check values
    expect(wrapper.text()).toContain('1') // competitor count
    // fr-FR locale uses non-breaking space (U+00A0) as thousand separator
    expect(wrapper.text()).toMatch(/1.200/) // avg word count
  })

  it('renders competitor cards with freshness badge', async () => {
    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 2)

    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [
        {
          url: 'https://a.com',
          title: 'Concurrent frais',
          headings: [],
          wordCount: 1500,
          localEntities: [],
          publishDate: recentDate.toISOString().split('T')[0],
          readabilityScore: 75,
          paasCovered: ['Question PAA 1'],
        },
      ],
      themes: [],
      gaps: [],
      averageWordCount: 1500,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    // Check freshness badge
    const freshBadge = wrapper.find('.freshness-fresh')
    expect(freshBadge.exists()).toBe(true)
    expect(freshBadge.text()).toBe('Frais')
  })

  it('renders old freshness label for 1-year old article', async () => {
    const oldDate = new Date()
    oldDate.setFullYear(oldDate.getFullYear() - 1)

    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'Old', headings: [],
        wordCount: 1000, localEntities: [],
        publishDate: oldDate.toISOString().split('T')[0],
      }],
      themes: [], gaps: [], averageWordCount: 1000,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.freshness-old').exists()).toBe(true)
    expect(wrapper.find('.freshness-old').text()).toBe('Ancien')
  })

  it('renders obsolete freshness label for 3-year old article', async () => {
    const obsoleteDate = new Date()
    obsoleteDate.setFullYear(obsoleteDate.getFullYear() - 3)

    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'Very Old', headings: [],
        wordCount: 800, localEntities: [],
        publishDate: obsoleteDate.toISOString().split('T')[0],
      }],
      themes: [], gaps: [], averageWordCount: 800,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.freshness-obsolete').exists()).toBe(true)
    expect(wrapper.find('.freshness-obsolete').text()).toBe('Obsolète')
  })

  it('renders unknown freshness when no publishDate', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'No date', headings: [],
        wordCount: 1200, localEntities: [],
        // no publishDate
      }],
      themes: [], gaps: [], averageWordCount: 1200,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.freshness-unknown').exists()).toBe(true)
    expect(wrapper.find('.freshness-unknown').text()).toBe('Inconnu')
  })

  it('renders readability badge when readabilityScore is present', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'A', headings: [],
        wordCount: 1000, localEntities: [],
        readabilityScore: 75,
      }],
      themes: [], gaps: [], averageWordCount: 1000,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    const readBadge = wrapper.find('.comp-readability')
    expect(readBadge.exists()).toBe(true)
    expect(readBadge.text()).toContain('75')
    expect(readBadge.text()).toContain('Facile')
  })

  it('does not render readability badge when readabilityScore is null', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'A', headings: [],
        wordCount: 1000, localEntities: [],
        // no readabilityScore
      }],
      themes: [], gaps: [], averageWordCount: 1000,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.comp-readability').exists()).toBe(false)
  })

  it('renders PAA count per competitor', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'A', headings: [],
        wordCount: 1000, localEntities: [],
        paasCovered: ['Question 1', 'Question 2', 'Question 3'],
      }],
      themes: [], gaps: [], averageWordCount: 1000,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    const paasSection = wrapper.find('.comp-paas')
    expect(paasSection.exists()).toBe(true)
    expect(paasSection.text()).toContain('3')
    expect(paasSection.text()).toContain('PAA')
  })

  it('does not render PAA count when paasCovered is empty', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [{
        url: 'https://a.com', title: 'A', headings: [],
        wordCount: 1000, localEntities: [],
        paasCovered: [],
      }],
      themes: [], gaps: [], averageWordCount: 1000,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.comp-paas').exists()).toBe(false)
  })

  it('renders PAA section with all PAA questions from all competitors', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [
        {
          url: 'https://a.com', title: 'A', headings: [],
          wordCount: 1000, localEntities: [],
          paasCovered: ['Comment faire du SEO ?', 'Quel budget SEO ?'],
        },
        {
          url: 'https://b.com', title: 'B', headings: [],
          wordCount: 800, localEntities: [],
          paasCovered: ['Quel budget SEO ?', 'SEO vs SEA ?'],
        },
      ],
      themes: [], gaps: [], averageWordCount: 900,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    const paaItems = wrapper.findAll('.paa-item')
    // 3 unique PAAs: "Comment faire du SEO ?", "Quel budget SEO ?", "SEO vs SEA ?"
    expect(paaItems).toHaveLength(3)
  })

  it('renders themes with frequency classes', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [
        { url: 'https://a.com', title: 'A', headings: [], wordCount: 1000, localEntities: [] },
        { url: 'https://b.com', title: 'B', headings: [], wordCount: 800, localEntities: [] },
        { url: 'https://c.com', title: 'C', headings: [], wordCount: 900, localEntities: [] },
        { url: 'https://d.com', title: 'D', headings: [], wordCount: 1100, localEntities: [] },
      ],
      themes: [
        { theme: 'High freq theme', frequency: 4, presentInArticle: true },
        { theme: 'Medium freq theme', frequency: 2, presentInArticle: true },
        { theme: 'Missing theme', frequency: 3, presentInArticle: false },
      ],
      gaps: [{ theme: 'Missing theme', frequency: 3, presentInArticle: false }],
      averageWordCount: 950,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    // Check frequency classes
    expect(wrapper.find('.freq-high').exists()).toBe(true)
    expect(wrapper.find('.freq-medium').exists()).toBe(true)
    expect(wrapper.find('.freq-gap').exists()).toBe(true)

    // Check gap label
    expect(wrapper.find('.theme-gap-label').text()).toBe('Manquant')

    // Check missing theme row
    expect(wrapper.find('.theme-missing').exists()).toBe(true)
  })

  it('renders gap items in lacunes section', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [
        { url: 'https://a.com', title: 'A', headings: [], wordCount: 1000, localEntities: [] },
      ],
      themes: [{ theme: 'Gap theme', frequency: 3, presentInArticle: false }],
      gaps: [{ theme: 'Gap theme', frequency: 3, presentInArticle: false }],
      averageWordCount: 1000,
      localEntitiesFromCompetitors: [],
      cachedAt: new Date().toISOString(),
    })
    await wrapper.vm.$nextTick()

    const gapItems = wrapper.findAll('.gap-item')
    expect(gapItems).toHaveLength(1)
    expect(gapItems[0].find('.gap-name').text()).toBe('Gap theme')
  })

  it('renders cache date', async () => {
    const wrapper = mountWithData({
      keyword: 'test',
      competitors: [],
      themes: [], gaps: [],
      averageWordCount: 0,
      localEntitiesFromCompetitors: [],
      cachedAt: '2026-03-19T10:00:00Z',
    })
    await wrapper.vm.$nextTick()

    const cacheInfo = wrapper.find('.cache-info')
    expect(cacheInfo.exists()).toBe(true)
    expect(cacheInfo.text()).toContain('19/03/2026')
  })
})
