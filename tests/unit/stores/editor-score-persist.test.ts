/**
 * FR-RED-SEO-SCORE-PERSIST — le score enregistré est celui du texte enregistré.
 *
 * Les scores SEO et GEO sont calculés dans l'éditeur. Ils ne sont enregistrés
 * qu'avec le contenu (et la méta, pour le SEO) sur lequel ils ont été calculés :
 * un score d'une autre version du texte n'est jamais enregistré, la base porte
 * alors « inconnu » (null) plutôt qu'un chiffre faux.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockApiPut = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiStream: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useEditorStore } = await import('@/stores/article/editor.store')
const { seoScoreKey } = await import('@/utils/score-key')

const HTML_A = '<h2>Pourquoi un site vitrine</h2><p>Un plombier à Toulouse…</p>'
const HTML_B = '<h2>Pourquoi un site vitrine</h2><p>Un plombier à Toulouse, version revue…</p>'

function editorWith(content: string, metaTitle = 'Plombier Toulouse', metaDescription = 'Dépannage rapide') {
  const store = useEditorStore()
  store.$patch({ content, metaTitle, metaDescription, isDirty: true })
  return store
}

function lastBody(): Record<string, unknown> {
  return mockApiPut.mock.calls.at(-1)![1] as Record<string, unknown>
}

describe('editor store — scores enregistrés avec leur texte', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockApiPut.mockResolvedValue({})
  })

  it('un score calculé sur le texte enregistré part avec lui', async () => {
    const store = editorWith(HTML_A)
    store.recordScore('seo', 72, seoScoreKey(HTML_A, 'Plombier Toulouse', 'Dépannage rapide'))
    store.recordScore('geo', 55, HTML_A)
    await store.saveArticle(12)
    expect(mockApiPut).toHaveBeenCalledTimes(1)
    expect(lastBody()).toMatchObject({ content: HTML_A, seoScore: 72, geoScore: 55 })
  })

  it('un score d’une autre version du texte n’est jamais enregistré : la base porte « inconnu »', async () => {
    const store = editorWith(HTML_A)
    store.recordScore('seo', 72, seoScoreKey(HTML_A, 'Plombier Toulouse', 'Dépannage rapide'))
    store.recordScore('geo', 55, HTML_A)
    store.$patch({ content: HTML_B })
    await store.saveArticle(12)
    expect(lastBody()).toMatchObject({ content: HTML_B, seoScore: null, geoScore: null })
  })

  it('une méta modifiée périme le score SEO, pas le score GEO', async () => {
    const store = editorWith(HTML_A)
    store.recordScore('seo', 72, seoScoreKey(HTML_A, 'Plombier Toulouse', 'Dépannage rapide'))
    store.recordScore('geo', 55, HTML_A)
    store.$patch({ metaTitle: 'Plombier Toulouse — urgence 24 h/24' })
    await store.saveArticle(12)
    expect(lastBody()).toMatchObject({ seoScore: null, geoScore: 55 })
  })

  it('un score calculé APRÈS la sauvegarde, sur le texte enregistré, est enregistré seul', async () => {
    const store = editorWith(HTML_B)
    await store.saveArticle(12)
    expect(lastBody()).toMatchObject({ seoScore: null })

    store.recordScore('seo', 64, seoScoreKey(HTML_B, 'Plombier Toulouse', 'Dépannage rapide'))
    await vi.waitFor(() => expect(mockApiPut).toHaveBeenCalledTimes(2))
    expect(mockApiPut.mock.calls[1]).toEqual(['/articles/12', { seoScore: 64 }])
  })

  it('un score d’un texte pas encore enregistré n’envoie rien', async () => {
    const store = editorWith(HTML_A)
    await store.saveArticle(12)
    store.$patch({ content: HTML_B, isDirty: true })
    store.recordScore('seo', 80, seoScoreKey(HTML_B, 'Plombier Toulouse', 'Dépannage rapide'))
    await Promise.resolve()
    expect(mockApiPut).toHaveBeenCalledTimes(1)
  })

  it('un score calculé PENDANT la sauvegarde, sur le texte enregistré, part dès qu’elle se termine', async () => {
    let finish: (v: unknown) => void = () => {}
    mockApiPut.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const store = editorWith(HTML_A)
    const saving = store.saveArticle(12)
    store.recordScore('seo', 68, seoScoreKey(HTML_A, 'Plombier Toulouse', 'Dépannage rapide'))
    finish({})
    await saving
    await vi.waitFor(() => expect(mockApiPut).toHaveBeenCalledTimes(2))
    expect(mockApiPut.mock.calls[1]).toEqual(['/articles/12', { seoScore: 68 }])
  })

  it('le même score recalculé n’est pas renvoyé deux fois', async () => {
    const store = editorWith(HTML_A)
    const key = seoScoreKey(HTML_A, 'Plombier Toulouse', 'Dépannage rapide')
    store.recordScore('seo', 72, key)
    await store.saveArticle(12)
    store.recordScore('seo', 72, key)
    await Promise.resolve()
    expect(mockApiPut).toHaveBeenCalledTimes(1)
  })
})
