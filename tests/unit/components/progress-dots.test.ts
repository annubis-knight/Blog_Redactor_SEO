import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProgressDots from '@/components/moteur/ProgressDots.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import { useArticleProgressStore } from '@/stores/article-progress.store'

const ALL_CHECKS = [
  'discovery_done', 'radar_done',
  'intent_done', 'audit_done', 'local_done',
  'captain_chosen', 'assignment_done',
]

// --- ProgressDots unit tests ---

describe('ProgressDots — Rendering', () => {
  it('renders 7 empty dots when no checks are completed', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [] },
    })

    const dots = wrapper.findAll('.progress-dot')
    expect(dots).toHaveLength(7)

    const filled = wrapper.findAll('.progress-dot--filled')
    expect(filled).toHaveLength(0)
  })

  it('renders 4 filled + 3 empty dots when 4 checks completed', () => {
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: [
          'discovery_done', 'radar_done',
          'intent_done', 'audit_done',
        ],
      },
    })

    const dots = wrapper.findAll('.progress-dot')
    expect(dots).toHaveLength(7)

    const filled = wrapper.findAll('.progress-dot--filled')
    expect(filled).toHaveLength(4)
  })

  it('renders 7 filled dots when all checks completed', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [...ALL_CHECKS] },
    })

    const filled = wrapper.findAll('.progress-dot--filled')
    expect(filled).toHaveLength(7)
  })
})

describe('ProgressDots — Phase grouping', () => {
  it('renders 3 phase groups with 2+3+2 dots', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [] },
    })

    const groups = wrapper.findAll('.progress-dots-group')
    expect(groups).toHaveLength(3)

    // Phase ① Générer: 2 dots
    expect(groups[0].findAll('.progress-dot')).toHaveLength(2)
    // Phase ② Valider: 3 dots
    expect(groups[1].findAll('.progress-dot')).toHaveLength(3)
    // Phase ③ Assigner: 2 dots
    expect(groups[2].findAll('.progress-dot')).toHaveLength(2)
  })

  it('fills dots in correct phase positions', () => {
    // Only Phase ② checks completed
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: ['intent_done', 'audit_done', 'local_done'],
      },
    })

    const groups = wrapper.findAll('.progress-dots-group')

    // Phase ① — 0 filled
    expect(groups[0].findAll('.progress-dot--filled')).toHaveLength(0)
    // Phase ② — 3 filled
    expect(groups[1].findAll('.progress-dot--filled')).toHaveLength(3)
    // Phase ③ — 0 filled
    expect(groups[2].findAll('.progress-dot--filled')).toHaveLength(0)
  })
})

describe('ProgressDots — Accessibility', () => {
  it('has aria-label with progression count', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: ['discovery_done', 'radar_done'] },
    })

    const root = wrapper.find('.progress-dots')
    expect(root.attributes('aria-label')).toBe('Progression : 2 sur 7')
  })

  it('each dot has a tooltip title', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [] },
    })

    const dots = wrapper.findAll('.progress-dot')
    const titles = dots.map(d => d.attributes('title'))

    expect(titles).toEqual([
      'Discovery', 'Radar',
      'Intention', 'Audit', 'Local',
      'Capitaine', 'Assignation',
    ])
  })
})

describe('ProgressDots — Edge cases', () => {
  it('ignores unknown checks in completedChecks', () => {
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: ['unknown_check', 'intent-analyzed', 'discovery_done'],
      },
    })

    const filled = wrapper.findAll('.progress-dot--filled')
    // Only 'discovery_done' matches a Moteur check
    expect(filled).toHaveLength(1)
  })
})

// --- MoteurContextRecap integration ---

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn().mockResolvedValue(null),
  apiPost: vi.fn().mockResolvedValue(null),
  apiPut: vi.fn().mockResolvedValue(null),
}))

describe('MoteurContextRecap — ProgressDots integration', () => {
  const proposedArticles = [
    { title: 'Article Pilier A', type: 'Pilier', accepted: true, suggestedKeyword: 'kw1', painPoint: '' },
    { title: 'Article Spécialisé B', type: 'Spécialisé', accepted: true, suggestedKeyword: 'kw2', painPoint: '' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders ProgressDots for each suggested article', () => {
    // Pre-populate store
    const store = useArticleProgressStore()
    store.progressMap['article-pilier-a'] = { phase: 'generer', completedChecks: ['discovery_done'] } as any
    store.progressMap['article-specialise-b'] = { phase: 'generer', completedChecks: [] } as any

    const wrapper = mount(MoteurContextRecap, {
      props: {
        proposedArticles,
        publishedArticles: [],
        selectedSlug: null,
      },
    })

    const dotComponents = wrapper.findAllComponents(ProgressDots)
    expect(dotComponents.length).toBe(2)
  })

  it('passes correct completedChecks from progress store', () => {
    const store = useArticleProgressStore()
    store.progressMap['article-pilier-a'] = {
      phase: 'valider',
      completedChecks: ['discovery_done', 'radar_done', 'intent_done'],
    } as any

    const wrapper = mount(MoteurContextRecap, {
      props: {
        proposedArticles: [proposedArticles[0]],
        publishedArticles: [],
        selectedSlug: null,
      },
    })

    const dotComponent = wrapper.findComponent(ProgressDots)
    expect(dotComponent.props('completedChecks')).toEqual(['discovery_done', 'radar_done', 'intent_done'])
  })
})
