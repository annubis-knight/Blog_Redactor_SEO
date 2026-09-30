/**
 * FR-RED-EDITOR-TIPTAP, FR-RED-OUTLINE, FR-RED-SEO-SCORE-PERSIST — rien d'un
 * article ne passe à un autre (recette du 2026-09-30, RED-3 et 01-T1).
 *
 * Rédaction guidée du pilier 1335, puis de l'enfant 1341 (sans texte, sans
 * sommaire) sans recharger la page : l'enfant affichait le sommaire, la méta et
 * le texte du pilier, et sa page envoyait `PUT /articles/1335 {"seoScore":68}`
 * (le texte du pilier noté avec les mots-clés de l'enfant). Même chose en
 * ouvrant l'éditeur de l'enfant après celui du pilier.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Outline } from '@shared/types/index.js'

const route = { params: { articleId: '1341', cocoonId: '28025' } as Record<string, string> }
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() }),
}))

const mockApiPut = vi.fn()
const mockApiGet = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiPost: vi.fn().mockResolvedValue({}),
  apiPatch: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({}),
  apiStream: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useEditorStore } = await import('@/stores/article/editor.store')
const { useOutlineStore } = await import('@/stores/article/outline.store')
const { default: ArticleWorkflowView } = await import('@/views/ArticleWorkflowView.vue')
const { default: ArticleEditorView } = await import('@/views/ArticleEditorView.vue')

const PILIER_TEXTE = '<h2>Le budget à prévoir</h2><p>Texte du pilier, 2 441 mots…</p>'
const PILIER_SOMMAIRE: Outline = {
  sections: [{ id: 'h1', level: 1, title: 'Recette 2026-09-30 : le guide pratique', status: 'pending' }],
} as never

/** Réponses du serveur pour l'enfant 1341 : ni texte, ni sommaire, ni méta. */
function serveurEnfant(url: string): unknown {
  if (url === '/articles/1341/content') {
    return { outline: null, content: null, metaTitle: null, metaDescription: null, seoScore: null, geoScore: null, updatedAt: null }
  }
  if (url === '/articles/1341/keywords') {
    return { articleId: 1341, capitaine: 'questions à se poser', lieutenants: [], lexique: [], rootKeywords: [] }
  }
  if (url === '/articles/1341') {
    return { article: { id: 1341, title: 'Questions à se poser : le guide complet', type: 'Intermédiaire', slug: 'questions', suggestedKeyword: 'questions à se poser', captainKeywordLocked: null }, cocoonName: 'Recette 2026-09-30' }
  }
  // Listes (mots-clés du cocon, cocons) : vides.
  if (url.startsWith('/keywords/') || url.startsWith('/cocoons')) return []
  return null
}

/** Le pilier vient d'être ouvert : son texte, sa méta, son sommaire et son score sont en mémoire. */
function piliersEnMemoire() {
  useEditorStore().loadExistingContent({
    content: PILIER_TEXTE, metaTitle: 'Recette 2026-09-30 : le guide concret', metaDescription: 'Méta du pilier',
    articleId: 1335, seoScore: 86, geoScore: 23,
  })
  useOutlineStore().loadExistingOutline(PILIER_SOMMAIRE)
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockApiGet.mockImplementation(async (url: string) => serveurEnfant(url))
  mockApiPut.mockResolvedValue({})
})

describe('Ouvrir un article sans recharger la page — rien du précédent ne reste', () => {
  it('rédaction guidée : ni le texte, ni la méta, ni le sommaire du pilier ; aucune écriture sur le pilier', async () => {
    piliersEnMemoire()
    shallowMount(ArticleWorkflowView)
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 400)) // calculs de score (300 ms)
    await flushPromises()

    const editor = useEditorStore()
    expect(editor.content, 'texte du pilier').toBeNull()
    expect(editor.metaTitle, 'méta du pilier').toBeNull()
    expect(editor.metaDescription).toBeNull()
    expect(useOutlineStore().outline, 'sommaire du pilier').toBeNull()
    const ecrituresPilier = mockApiPut.mock.calls.filter(([url]) => String(url).startsWith('/articles/1335'))
    expect(ecrituresPilier, 'aucun score du pilier envoyé depuis l’enfant').toEqual([])
  })

  it('éditeur : ni le texte, ni la méta, ni le sommaire du pilier ; aucune écriture sur le pilier', async () => {
    piliersEnMemoire()
    shallowMount(ArticleEditorView)
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 400))
    await flushPromises()

    const editor = useEditorStore()
    expect(editor.content).toBeNull()
    expect(editor.metaTitle).toBeNull()
    expect(useOutlineStore().outline).toBeNull()
    expect(mockApiPut.mock.calls.filter(([url]) => String(url).startsWith('/articles/1335'))).toEqual([])
  })
})
