/**
 * FR-RED-EDITOR-TIPTAP — « Supprimer le contenu » efface le texte en base
 * (recette du 2026-09-30, RED-26).
 *
 * Avant : l'écran se vidait et la méta partait, mais le texte était envoyé en
 * `content: null` par l'enregistrement ordinaire, que le serveur lit comme
 * « inchangé » : le texte restait en base et revenait au rechargement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockApiPut = vi.fn()
const mockApiDelete = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
  apiStream: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useEditorStore } = await import('@/stores/article/editor.store')
const { seoScoreKey } = await import('@/utils/score-key')

const TEXTE = '<h2>Le budget à prévoir</h2><p>Texte du pilier…</p>'

describe('editor store — « Supprimer le contenu » (FR-RED-EDITOR-TIPTAP)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockApiPut.mockResolvedValue({})
    mockApiDelete.mockResolvedValue({ content: null })
  })

  it('efface le texte en base par sa propre écriture, puis vide l’écran', async () => {
    const store = useEditorStore()
    store.loadExistingContent({ content: TEXTE, metaTitle: 'Titre', metaDescription: 'Desc', articleId: 1335, seoScore: 86 })

    const ok = await store.deleteContent(1335)

    expect(ok).toBe(true)
    expect(mockApiDelete).toHaveBeenCalledWith('/articles/1335/content')
    expect(mockApiPut, 'pas d’enregistrement ordinaire, qui garderait le texte').not.toHaveBeenCalled()
    expect(store.content).toBeNull()
    expect(store.metaTitle).toBeNull()
    expect(store.metaDescription).toBeNull()
    expect(store.isDirty).toBe(false)
  })

  it('après la suppression, un score tardif sur l’ancien texte ne part pas', async () => {
    const store = useEditorStore()
    store.loadExistingContent({ content: TEXTE, metaTitle: 'Titre', metaDescription: 'Desc', articleId: 1335, seoScore: 86 })
    await store.deleteContent(1335)

    store.recordScore('seo', 70, seoScoreKey(TEXTE, 'Titre', 'Desc'))
    await Promise.resolve()
    expect(mockApiPut).not.toHaveBeenCalled()
  })

  it('suppression refusée par le serveur : le texte reste à l’écran et l’erreur est dite', async () => {
    mockApiDelete.mockRejectedValueOnce(new Error('Serveur indisponible'))
    const store = useEditorStore()
    store.loadExistingContent({ content: TEXTE, metaTitle: 'Titre', metaDescription: 'Desc', articleId: 1335 })

    const ok = await store.deleteContent(1335)

    expect(ok).toBe(false)
    expect(store.content).toBe(TEXTE)
    expect(store.metaTitle).toBe('Titre')
    expect(store.error).toContain('Serveur indisponible')
  })
})
