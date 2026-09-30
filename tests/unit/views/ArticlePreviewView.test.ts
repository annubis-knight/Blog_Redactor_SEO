/**
 * FR-RED-EXPORT-HTML, FR-RED-PUBLISH-GATE — « Exporter HTML » télécharge le
 * texte que la porte de publication vient de juger.
 *
 * Recette du 2026-09-30 (RED-23) : un aperçu ouvert avant une correction, puis
 * exporté sans être rechargé, téléchargeait la version chargée à l'ouverture de
 * l'onglet (chiffres, phrase anglaise, « à sourcer » déjà corrigés), alors que
 * la porte avait jugé la nouvelle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPut: vi.fn(), apiPost: vi.fn() }))
vi.mock('@/services/api.service', () => api)
vi.mock('@/utils/logger', () => ({ log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { articleId: '1335' } }) }))

const ArticlePreviewView = (await import('@/views/ArticlePreviewView.vue')).default

let downloaded: Blob[] = []
const createObjectURL = vi.fn((blob: Blob) => { downloaded.push(blob); return 'blob:fichier' })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  downloaded = []
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  api.apiGet.mockResolvedValue({ html: '<html>ANCIENNE VERSION</html>', id: 1335, title: 'Recette' })
  api.apiPut.mockResolvedValue({})
})

afterEach(() => vi.restoreAllMocks())

describe('ArticlePreviewView — export', () => {
  it('après la porte, télécharge la page à jour demandée au serveur, pas l’aperçu chargé à l’ouverture', async () => {
    const wrapper = mount(ArticlePreviewView)
    await flushPromises()
    // Entre-temps, l'article a été corrigé dans un autre onglet.
    api.apiPost.mockResolvedValue({ html: '<html>VERSION JUGÉE</html>', id: 1335 })
    api.apiGet.mockResolvedValue({ html: '<html>VERSION JUGÉE (aperçu)</html>', id: 1335, title: 'Recette' })

    await wrapper.get('[data-testid="preview-export"]').trigger('click')
    await flushPromises()

    expect(api.apiPut).toHaveBeenCalledWith('/articles/1335/status', { status: 'publié' })
    expect(api.apiPost).toHaveBeenCalledWith('/export/1335', {})
    expect(downloaded).toHaveLength(1)
    expect(await downloaded[0]!.text()).toBe('<html>VERSION JUGÉE</html>')
    // L'aperçu est rechargé : l'écran montre ce qui vient d'être publié.
    expect(wrapper.get('iframe').attributes('srcdoc')).toContain('VERSION JUGÉE (aperçu)')
  })

  it('publication refusée par la porte : rien n’est téléchargé', async () => {
    api.apiPut.mockRejectedValue(new Error('Erreur réseau'))
    const wrapper = mount(ArticlePreviewView)
    await flushPromises()
    await wrapper.get('[data-testid="preview-export"]').trigger('click')
    await flushPromises()
    expect(api.apiPost).not.toHaveBeenCalled()
    expect(downloaded).toEqual([])
    expect(wrapper.get('[data-testid="preview-export-notice"]').text()).toContain('Publication impossible')
  })
})
