/**
 * FR-RED-ENRICH-PASSES / FR-RED-SECTION-REWRITE — l'enrichissement se fait
 * chapitre par chapitre, et c'est l'utilisateur qui accepte ou refuse.
 *
 * Ce que le store garantit :
 *   - une passe ne vise que les chapitres utiles (sources : ceux qui ont un
 *     « à sourcer » ; FAQ : une seule, avant la conclusion, jamais deux) ;
 *   - accepter remplace UN chapitre, sans toucher aux autres ;
 *   - une proposition ⛔ ne s'accepte pas ;
 *   - un chapitre modifié depuis la proposition n'est pas écrasé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockStartStreamOnce } = vi.hoisted(() => ({ mockStartStreamOnce: vi.fn() }))
vi.mock('../../../src/composables/editor/useStreaming', () => ({
  startStreamOnce: mockStartStreamOnce,
  useStreaming: vi.fn(),
}))
vi.mock('../../../src/services/api.service', () => ({ apiPost: vi.fn(), apiPut: vi.fn(), apiGet: vi.fn() }))

import { useEnrichmentStore } from '../../../src/stores/article/enrichment.store'
import { useEditorStore } from '../../../src/stores/article/editor.store'
import { listChapters } from '../../../shared/chapters'
import type { EnrichmentProposal } from '../../../shared/types/enrichment.types'

const ARTICLE = [
  '<h1>Créer un site vitrine</h1><p>Chapeau.</p>',
  '<h2>Le budget</h2><p>Beaucoup d’artisans <mark data-a-sourcer>[à sourcer : part des TPE sans site]</mark> hésitent.</p>',
  '<h2>Les étapes</h2><p>On commence par le message.</p>',
  '<h2>Conclusion</h2><p>Passez à l’action.</p>',
].join('\n')

const ctx = { articleId: 7, keyword: 'site vitrine', keywords: ['artisan'] }

function proposal(over: Partial<EnrichmentProposal>): EnrichmentProposal {
  return { pass: 'exemples', chapterIndex: 0, before: '', html: '', issues: [], webSources: [], blocked: false, usage: null, ...over }
}

/** Le serveur simulé : renvoie le chapitre reçu, enrichi d'un paragraphe. */
function serverAdds(paragraph: string) {
  mockStartStreamOnce.mockImplementation(async (_url: string, body: { chapterIndex: number; chapterHtml: string }) => ({
    result: proposal({ chapterIndex: body.chapterIndex, before: body.chapterHtml, html: `${body.chapterHtml}<p>${paragraph}</p>` }),
    usage: null, errorMessage: null, aborted: false,
  }))
}

let store: ReturnType<typeof useEnrichmentStore>
let editor: ReturnType<typeof useEditorStore>

beforeEach(() => {
  setActivePinia(createPinia())
  mockStartStreamOnce.mockReset()
  store = useEnrichmentStore()
  editor = useEditorStore()
  editor.setContent(ARTICLE)
})

describe('chapitres visés par une passe', () => {
  it('sources : seulement les chapitres qui ont un passage à sourcer', () => {
    expect(store.targetsFor('sources', ARTICLE).map(c => c.title)).toEqual(['Le budget'])
  })

  it('exemples, tableaux, images : les chapitres H2, hors conclusion', () => {
    expect(store.targetsFor('exemples', ARTICLE).map(c => c.title)).toEqual(['Le budget', 'Les étapes'])
  })

  it('FAQ : une seule, et aucune si l’article en a déjà une', () => {
    expect(store.targetsFor('faq', ARTICLE)).toHaveLength(1)
    const withFaq = ARTICLE.replace('<h2>Conclusion</h2>', '<h2>Questions fréquentes</h2><h3>Pourquoi ?</h3><p>Parce que.</p><h2>Conclusion</h2>')
    expect(store.targetsFor('faq', withFaq)).toEqual([])
  })
})

describe('runPass', () => {
  it('propose chapitre par chapitre, puis accepter remplace ce seul chapitre', async () => {
    serverAdds('Prenons un menuisier.')
    await store.runPass('exemples', ctx)

    expect(mockStartStreamOnce).toHaveBeenCalledTimes(2)
    expect(mockStartStreamOnce.mock.calls[0]![0]).toBe('/api/generate/enrich/exemples')
    expect(mockStartStreamOnce.mock.calls[0]![1]).toMatchObject({ articleId: 7, chapterIndex: 0, keyword: 'site vitrine', articleHtml: ARTICLE })
    expect(store.items.map(i => i.status)).toEqual(['ready', 'ready'])

    store.accept(store.items[1]!.key)
    const chapters = listChapters(editor.content!)
    expect(chapters[2]!.html).toContain('Prenons un menuisier.')
    expect(chapters[1]!.html).not.toContain('Prenons un menuisier.')
    expect(editor.isDirty).toBe(true)
    expect(store.items[1]!.status).toBe('accepted')
  })

  it('FAQ acceptée : insérée avant la conclusion', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: proposal({ pass: 'faq', chapterIndex: 2, html: '<h2>Questions fréquentes</h2><h3>Combien ?</h3><p>Cela dépend.</p>' }),
      usage: null, errorMessage: null, aborted: false,
    })
    await store.runPass('faq', ctx)
    expect(mockStartStreamOnce.mock.calls[0]![1]).toMatchObject({ chapterIndex: 2, chapterHtml: '' })
    store.accept(store.items[0]!.key)
    expect(listChapters(editor.content!).map(c => c.title)).toEqual(['Introduction', 'Le budget', 'Les étapes', 'Questions fréquentes', 'Conclusion'])
  })

  // R23 — la FAQ s'insérait sans vérifier que l'article n'avait pas bougé depuis la proposition.
  it('FAQ : pas d’insertion si la conclusion a changé depuis la proposition', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: proposal({ pass: 'faq', chapterIndex: 2, html: '<h2>Questions fréquentes</h2><h3>Combien ?</h3><p>Cela dépend.</p>' }),
      usage: null, errorMessage: null, aborted: false,
    })
    await store.runPass('faq', ctx)
    editor.setContent(ARTICLE.replace('Passez à l’action.', 'Conclusion réécrite à la main.'))
    store.accept(store.items[0]!.key)
    expect(editor.content).not.toContain('Questions fréquentes')
    expect(store.items[0]!.status).toBe('stale')
  })

  it('une erreur du serveur est montrée sur le chapitre, la passe continue', async () => {
    mockStartStreamOnce
      .mockResolvedValueOnce({ result: null, usage: null, errorMessage: 'La recherche web exige Claude', aborted: false })
      .mockResolvedValueOnce({ result: proposal({ chapterIndex: 1, before: '', html: '<h2>Les étapes</h2><p>x</p>' }), usage: null, errorMessage: null, aborted: false })
    await store.runPass('exemples', ctx)
    expect(store.items[0]).toMatchObject({ status: 'error', error: 'La recherche web exige Claude' })
    expect(store.items[1]!.status).toBe('ready')
  })
})

describe('accepter — garde-fous', () => {
  it('⛔ une proposition bloquée ne s’accepte pas', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: proposal({ chapterIndex: 0, before: listChapters(ARTICLE)[1]!.html, html: '<h2>Autre titre</h2>', blocked: true, issues: [{ rule: 'enrich-headings-changed', level: 'technique', message: 'x' }] }),
      usage: null, errorMessage: null, aborted: false,
    })
    await store.runPass('sources', ctx)
    store.accept(store.items[0]!.key)
    expect(editor.content).toBe(ARTICLE)
    expect(store.items[0]!.status).toBe('ready')
  })

  it('un chapitre modifié depuis la proposition n’est pas écrasé', async () => {
    serverAdds('Prenons un menuisier.')
    await store.runPass('exemples', ctx)
    editor.setContent(ARTICLE.replace('On commence par le message.', 'Texte retouché à la main.'))
    store.accept(store.items[1]!.key)
    expect(editor.content).toContain('Texte retouché à la main.')
    expect(store.items[1]!.status).toBe('stale')
  })

  it('refuser ne touche pas au texte', async () => {
    serverAdds('Prenons un menuisier.')
    await store.runPass('exemples', ctx)
    store.refuse(store.items[0]!.key)
    expect(editor.content).toBe(ARTICLE)
    expect(store.items[0]!.status).toBe('refused')
  })

  it('tout accepter : seulement les propositions sans aucune alerte', async () => {
    mockStartStreamOnce.mockImplementation(async (_url: string, body: { chapterIndex: number; chapterHtml: string }) => ({
      result: proposal({
        chapterIndex: body.chapterIndex, before: body.chapterHtml, html: `${body.chapterHtml}<p>Ajout ${body.chapterIndex}.</p>`,
        issues: body.chapterIndex === 1 ? [{ rule: 'enrich-unsourced-figure', level: 'risque', message: 'x' }] : [],
      }),
      usage: null, errorMessage: null, aborted: false,
    }))
    await store.runPass('exemples', ctx)
    store.acceptAllClean()
    expect(store.items.map(i => i.status)).toEqual(['accepted', 'ready'])
    expect(editor.content).toContain('Ajout 0.')
    expect(editor.content).not.toContain('Ajout 1.')
  })
})

describe('réécrire un chapitre', () => {
  it('envoie la consigne et le chapitre, propose sans appliquer', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: proposal({ pass: 'reecriture', chapterIndex: 1, before: listChapters(ARTICLE)[2]!.html, html: '<h2>Les étapes</h2><p>Allons droit au but.</p>' }),
      usage: null, errorMessage: null, aborted: false,
    })
    await store.rewriteChapter(1, 'Plus direct, avec un exemple', ctx)
    expect(mockStartStreamOnce.mock.calls[0]![0]).toBe('/api/generate/section-rewrite')
    expect(mockStartStreamOnce.mock.calls[0]![1]).toMatchObject({ chapterIndex: 1, instruction: 'Plus direct, avec un exemple' })
    expect(editor.content).toBe(ARTICLE)
    store.accept(store.items[0]!.key)
    expect(editor.content).toContain('Allons droit au but.')
  })
})
