/**
 * FR-HN-TAB / FR-HN-LOCK-GATE — l'onglet Structure du Moteur.
 *
 * - Sans lieutenant retenu, rien à construire : l'écran le dit.
 * - « Valider la structure » enregistre, écrit le sommaire, PUIS demande
 *   l'étape `moteur:hn_locked` (la porte serveur juge la base).
 * - Une structure validée puis modifiée et enregistrée perd son étape.
 * - Mode libre : on édite, aucune étape n'est demandée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const { mockApiPost, mockApiPut, mockApiGet } = vi.hoisted(() => ({ mockApiPost: vi.fn(), mockApiPut: vi.fn(), mockApiGet: vi.fn() }))
vi.mock('../../../src/services/api.service', () => ({ apiPost: mockApiPost, apiPut: mockApiPut, apiGet: mockApiGet, apiPatch: vi.fn() }))
vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({ isStreaming: ref(false), startStream: vi.fn() }),
}))

import StructureHnPanel from '../../../src/components/moteur/StructureHnPanel.vue'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'
import { useArticleProgressStore } from '../../../src/stores/article/article-progress.store'
import { MOTEUR_HN_LOCKED } from '../../../shared/constants/workflow-checks.constants'

const STRUCTURE = [
  { level: 1, text: 'Site vitrine pour artisan : le guide' },
  { level: 2, text: 'Le prix d’un site vitrine' },
]
const article = { id: 7, title: 'Site vitrine', slug: 's', keyword: null, type: 'Pilier' }

function mountPanel(opts: { locked?: string[]; saved?: unknown[]; checks?: string[]; mode?: 'workflow' | 'libre' } = {}) {
  const store = useArticleKeywordsStore()
  store.keywords = {
    articleId: 7, capitaine: 'site vitrine artisan', lieutenants: opts.locked ?? ['prix site vitrine'], lexique: [], rootKeywords: [],
    richLieutenants: (opts.locked ?? ['prix site vitrine']).map(keyword => ({ keyword, status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: 80 })),
    hnStructure: opts.saved ?? [],
  } as never
  useArticleProgressStore().progressMap = { '7': { articleId: 7, phase: 'moteur', completedChecks: opts.checks ?? [] } } as never
  return mount(StructureHnPanel, {
    props: { selectedArticle: article as never, captainKeyword: 'site vitrine artisan', articleLevel: 'pilier', mode: opts.mode ?? 'workflow' },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockApiPut.mockResolvedValue({})
  mockApiPost.mockRejectedValue(new Error('hors ligne'))
  mockApiGet.mockResolvedValue(null)
})

describe('StructureHnPanel', () => {
  it('sans lieutenant retenu : l’écran demande d’en retenir, rien à valider', async () => {
    const wrapper = mountPanel({ locked: [] })
    await flushPromises()
    expect(wrapper.find('[data-testid="structure-needs-lieutenants"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="structure-validate"]').attributes('disabled')).toBeDefined()
  })

  it('valider : structure et sommaire enregistrés, PUIS l’étape demandée', async () => {
    const wrapper = mountPanel({ saved: STRUCTURE })
    await flushPromises()
    await wrapper.get('[data-testid="structure-validate"]').trigger('click')
    await flushPromises()
    const paths = mockApiPut.mock.calls.map(([path]) => path)
    expect(paths.slice(0, 2)).toEqual(['/articles/7/keywords', '/articles/7'])
    expect(wrapper.emitted('check-completed')).toEqual([[MOTEUR_HN_LOCKED]])
  })

  it('structure validée et inchangée : l’écran le dit', async () => {
    const wrapper = mountPanel({ saved: STRUCTURE, checks: [MOTEUR_HN_LOCKED] })
    await flushPromises()
    expect(wrapper.find('[data-testid="structure-validated"]').exists()).toBe(true)
  })

  it('une structure validée, modifiée puis enregistrée perd son étape', async () => {
    const wrapper = mountPanel({ saved: STRUCTURE, checks: [MOTEUR_HN_LOCKED] })
    await flushPromises()
    const editor = wrapper.findComponent({ name: 'LieutenantH2Structure' })
    await editor.vm.$emit('save-hn')
    await flushPromises()
    expect(wrapper.emitted('check-removed')).toEqual([[MOTEUR_HN_LOCKED]])
  })

  // M18 (FR-MOT-NO-AUTO-ACTION) : ouvrir l'onglet ne paie rien ; l'analyse
  // des concurrents ne part que sur « Générer la structure ».
  it('à l’ouverture, la base seulement ; l’analyse part sur « Générer »', async () => {
    mockApiPost.mockResolvedValue(null)
    const wrapper = mountPanel()
    await flushPromises()
    expect(mockApiPost.mock.calls.map(([, body]) => (body as { cacheOnly?: boolean }).cacheOnly)).toEqual([true])
    expect(wrapper.find('[data-testid="structure-competitors-missing"]').exists()).toBe(true)

    const editor = wrapper.findComponent({ name: 'LieutenantH2Structure' })
    await editor.vm.$emit('regenerate-hn', [])
    await flushPromises()
    expect(mockApiPost.mock.calls).toHaveLength(2)
    expect(mockApiPost.mock.calls[1]![1]).not.toHaveProperty('cacheOnly')
  })

  it('mode libre : pas de bouton de validation, aucune étape', async () => {
    const wrapper = mountPanel({ saved: STRUCTURE, mode: 'libre' })
    await flushPromises()
    expect(wrapper.find('[data-testid="structure-validate"]').exists()).toBe(false)
    const editor = wrapper.findComponent({ name: 'LieutenantH2Structure' })
    await editor.vm.$emit('save-hn')
    await flushPromises()
    expect(wrapper.emitted('check-removed')).toBeUndefined()
    expect(wrapper.emitted('check-completed')).toBeUndefined()
  })
})
