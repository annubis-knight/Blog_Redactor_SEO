import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProgressDots from '@/components/moteur/ProgressDots.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'

const ALL_CHECKS = [
  'moteur:discovery_done', 'moteur:radar_done',
  'moteur:capitaine_locked', 'moteur:lieutenants_locked', 'moteur:lexique_validated',
]

// --- ProgressDots unit tests ---

describe('ProgressDots — Rendering', () => {
  it('renders 5 empty dots when no checks are completed', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [] },
    })

    const dots = wrapper.findAll('.progress-dot')
    expect(dots).toHaveLength(5)

    const filled = wrapper.findAll('.progress-dot--filled')
    expect(filled).toHaveLength(0)
  })

  it('renders 3 filled + 2 empty dots when 3 checks completed', () => {
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: [
          'moteur:discovery_done', 'moteur:radar_done',
          'moteur:capitaine_locked',
        ],
      },
    })

    const dots = wrapper.findAll('.progress-dot')
    expect(dots).toHaveLength(5)

    const filled = wrapper.findAll('.progress-dot--filled')
    expect(filled).toHaveLength(3)
  })

  it('renders 5 filled dots when all checks completed', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [...ALL_CHECKS] },
    })

    const filled = wrapper.findAll('.progress-dot--filled')
    expect(filled).toHaveLength(5)
  })
})

describe('ProgressDots — Phase grouping', () => {
  it('renders 2 phase groups with 2+3 dots', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [] },
    })

    const groups = wrapper.findAll('.progress-dots-group')
    expect(groups).toHaveLength(2)

    // Phase ① Générer: 2 dots
    expect(groups[0].findAll('.progress-dot')).toHaveLength(2)
    // Phase ② Valider: 3 dots
    expect(groups[1].findAll('.progress-dot')).toHaveLength(3)
  })

  it('fills dots in correct phase positions', () => {
    // Only Phase ② checks completed
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: ['moteur:capitaine_locked', 'moteur:lieutenants_locked', 'moteur:lexique_validated'],
      },
    })

    const groups = wrapper.findAll('.progress-dots-group')

    // Phase ① — 0 filled
    expect(groups[0].findAll('.progress-dot--filled')).toHaveLength(0)
    // Phase ② — 3 filled
    expect(groups[1].findAll('.progress-dot--filled')).toHaveLength(3)
  })
})

describe('ProgressDots — Accessibility', () => {
  it('has aria-label with progression count', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: ['moteur:discovery_done', 'moteur:radar_done'] },
    })

    const root = wrapper.find('.progress-dots')
    expect(root.attributes('aria-label')).toBe('Progression : 2 sur 5')
  })

  it('aria-label counts only valid checks, ignoring unknown ones', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: ['moteur:discovery_done', 'intent_done', 'unknown_check'] },
    })

    const root = wrapper.find('.progress-dots')
    // Only discovery_done is a valid check — intent_done and unknown_check are ignored
    expect(root.attributes('aria-label')).toBe('Progression : 1 sur 5')
  })

  it('each dot has a tooltip title', () => {
    const wrapper = mount(ProgressDots, {
      props: { completedChecks: [] },
    })

    const dots = wrapper.findAll('.progress-dot')
    const titles = dots.map(d => d.attributes('title'))

    expect(titles).toEqual([
      'Discovery', 'Radar',
      'Capitaine', 'Lieutenants', 'Lexique',
    ])
  })
})

describe('ProgressDots — Edge cases', () => {
  it('ignores unknown checks in completedChecks', () => {
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: ['unknown_check', 'intent-analyzed', 'moteur:discovery_done'],
      },
    })

    const filled = wrapper.findAll('.progress-dot--filled')
    // Only 'moteur:discovery_done' matches a Moteur check
    expect(filled).toHaveLength(1)
  })

  it('ignores old checks that no longer exist', () => {
    const wrapper = mount(ProgressDots, {
      props: {
        completedChecks: ['intent_done', 'audit_done', 'local_done', 'captain_chosen', 'assignment_done', 'moteur:discovery_done'],
      },
    })

    const filled = wrapper.findAll('.progress-dot--filled')
    // Only 'moteur:discovery_done' matches — old checks are ignored
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
  const suggestedArticles = [
    { id: 42, title: 'Article Pilier A', type: 'Pilier', slug: 'article-pilier-a', topic: null, status: 'draft', phase: 'generer', completedChecks: [], suggestedKeyword: 'kw1', captainKeywordLocked: null, painPoint: '' },
    { id: 43, title: 'Article Spécialisé B', type: 'Spécialisé', slug: 'article-specialise-b', topic: null, status: 'draft', phase: 'generer', completedChecks: [], suggestedKeyword: 'kw2', captainKeywordLocked: null, painPoint: '' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders ProgressDots for each suggested article', () => {
    // Pre-populate store
    const store = useArticleProgressStore()
    store.progressMap['42'] = { phase: 'generer', completedChecks: ['moteur:discovery_done'] } as any
    store.progressMap['43'] = { phase: 'generer', completedChecks: [] } as any

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles,
        publishedArticles: [],
        selectedSlug: null,
      },
    })

    const dotComponents = wrapper.findAllComponents(ProgressDots)
    expect(dotComponents.length).toBe(2)
  })

  it('passes correct completedChecks from progress store', () => {
    const store = useArticleProgressStore()
    store.progressMap['42'] = {
      phase: 'valider',
      completedChecks: ['moteur:discovery_done', 'moteur:radar_done', 'moteur:capitaine_locked'],
    } as any

    const wrapper = mount(MoteurContextRecap, {
      props: {
        suggestedArticles: [suggestedArticles[0]],
        publishedArticles: [],
        selectedSlug: null,
      },
    })

    const dotComponent = wrapper.findComponent(ProgressDots)
    expect(dotComponent.props('completedChecks')).toEqual(['moteur:discovery_done', 'moteur:radar_done', 'moteur:capitaine_locked'])
  })
})
