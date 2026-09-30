/**
 * FR-DASH-WORKFLOW-CHOICE — un cocon inconnu se dit en français, avec un lien
 * de retour.
 *
 * Recette du 2026-09-30 (DASH-6, 01-T13) : `/cocoon/999999` affichait
 * « Cocoon 999999 not found » (le 404 anglais de ses articles) et un
 * « Réessayer » qui refaisait le même 404.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CocoonLandingView from '@/views/CocoonLandingView.vue'
import { apiGet } from '@/services/api.service'

const route = vi.hoisted(() => ({ params: { cocoonId: '999999' } }))
vi.mock('vue-router', () => ({ useRoute: () => route }))

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
}))

const COCOON = {
  id: 7, name: 'Recette 2026-09-30', siloName: 'Stratégie & Visibilité', articles: [], publishedArticles: [],
  stats: { totalArticles: 2, byType: { pilier: 1, intermediaire: 1, specialise: 0 }, byStatus: { aRediger: 1, brouillon: 0, publie: 1 }, completionPercent: 50 },
}

const STUBS = {
  RouterLink: { template: '<a class="router-link" :href="to"><slot /></a>', props: ['to'] },
  Breadcrumb: { template: '<nav />' },
  WorkflowChoice: { template: '<div class="workflow-choice" />' },
  SkeletonCard: { template: '<div />' },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(apiGet).mockReset()
})

describe('FR-DASH-WORKFLOW-CHOICE — cocon introuvable (recette 2026-09-30, 01-T13)', () => {
  it('message français et lien vers l’accueil, sans demander ses articles', async () => {
    route.params.cocoonId = '999999'
    vi.mocked(apiGet).mockImplementation((async (url: string) => {
      if (url === '/cocoons') return [COCOON]
      throw new Error(`Cocoon 999999 not found (${url})`)
    }) as never)
    const wrapper = mount(CocoonLandingView, { global: { stubs: STUBS } })
    await flushPromises()

    const notFound = wrapper.find('[data-testid="cocoon-not-found"]')
    expect(notFound.exists()).toBe(true)
    expect(notFound.text()).toContain('Cocon introuvable')
    expect(notFound.find('a.router-link').attributes('href')).toBe('/')
    expect(wrapper.text()).not.toContain('not found')
    expect(wrapper.text()).not.toContain('Réessayer')
    expect(vi.mocked(apiGet).mock.calls.map(c => c[0])).toEqual(['/cocoons'])
  })

  it('un cocon existant garde sa page', async () => {
    route.params.cocoonId = '7'
    vi.mocked(apiGet).mockImplementation((async (url: string) => {
      if (url === '/cocoons') return [COCOON]
      return []
    }) as never)
    const wrapper = mount(CocoonLandingView, { global: { stubs: STUBS } })
    await flushPromises()

    expect(wrapper.find('[data-testid="cocoon-not-found"]').exists()).toBe(false)
    expect(wrapper.find('.workflow-choice').exists()).toBe(true)
  })
})
