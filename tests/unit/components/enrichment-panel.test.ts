/**
 * FR-RED-ENRICH-PASSES / FR-RED-SECTION-REWRITE — le panneau « Enrichir » :
 * rien ne change sans « Accepter », une proposition ⛔ ne s'accepte pas, une
 * réécriture demande une vraie consigne.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const { mockStartStreamOnce } = vi.hoisted(() => ({ mockStartStreamOnce: vi.fn() }))
vi.mock('../../../src/composables/editor/useStreaming', () => ({ startStreamOnce: mockStartStreamOnce, useStreaming: vi.fn() }))
const { mockApiPut } = vi.hoisted(() => ({ mockApiPut: vi.fn() }))
const { mockApiGet } = vi.hoisted(() => ({ mockApiGet: vi.fn() }))
vi.mock('../../../src/services/api.service', () => ({ apiPost: vi.fn(), apiPut: mockApiPut, apiGet: mockApiGet }))

import EnrichmentPanel from '../../../src/components/panels/EnrichmentPanel.vue'
import { useEditorStore } from '../../../src/stores/article/editor.store'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'
import { safeHtmlDirective } from '../../../src/directives/v-safe-html'

const ARTICLE = '<h1>Site vitrine</h1><p>Chapeau.</p><h2>Le budget</h2><p>On prévoit.</p><h2>Les étapes</h2><p>On avance.</p><h2>Conclusion</h2><p>Fin.</p>'

function mountPanel() {
  return mount(EnrichmentPanel, { props: { articleId: 7 }, global: { directives: { 'safe-html': safeHtmlDirective } } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockStartStreamOnce.mockReset()
  useEditorStore().setContent(ARTICLE)
  useArticleKeywordsStore().keywords = { capitaine: 'site vitrine', lieutenants: ['artisan'] } as never
  mockApiGet.mockReset()
  mockApiGet.mockResolvedValue([])
})

describe('EnrichmentPanel', () => {
  it('une passe propose, et seul « Accepter » change le texte', async () => {
    mockStartStreamOnce.mockImplementation(async (_url: string, body: { chapterIndex: number; chapterHtml: string }) => ({
      result: { pass: 'exemples', chapterIndex: body.chapterIndex, before: body.chapterHtml, html: `${body.chapterHtml}<p>Prenons un menuisier ${body.chapterIndex}.</p>`, issues: [], webSources: [], blocked: false, usage: null },
      usage: null, errorMessage: null, aborted: false,
    }))
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-exemples"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="proposal-"][data-status="ready"]')).toHaveLength(2)
    expect(useEditorStore().content).toBe(ARTICLE)

    await wrapper.get('[data-testid="proposal-0"] [data-testid="proposal-accept"]').trigger('click')
    expect(useEditorStore().content).toContain('Prenons un menuisier 0.')
    expect(useEditorStore().content).not.toContain('Prenons un menuisier 1.')
    expect(wrapper.get('[data-testid="proposal-0"]').attributes('data-status')).toBe('accepted')
    await flushPromises()
    expect(mockApiPut, 'accepté = enregistré, même sans enregistrement automatique').toHaveBeenCalledWith('/articles/7', expect.objectContaining({ content: expect.stringContaining('Prenons un menuisier 0.') }))
  })

  it('⛔ une proposition bloquée : bouton grisé, défaut affiché', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: { pass: 'faq', chapterIndex: 2, before: '', html: '<h3>Sans titre ?</h3>', issues: [{ rule: 'enrich-faq-malformed', level: 'technique', message: 'La FAQ doit commencer par un titre H2.' }], webSources: [], blocked: true, usage: null },
      usage: null, errorMessage: null, aborted: false,
    })
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-faq"]').trigger('click')
    await flushPromises()

    const card = wrapper.get('[data-testid="proposal-2"]')
    expect(card.get('[data-rule="enrich-faq-malformed"]').attributes('data-level')).toBe('technique')
    expect(card.get('[data-testid="proposal-accept"]').attributes('disabled')).toBeDefined()
  })

  // Suite C5b : la passe Images pose une place « à fournir » que la publication
  // refuse ; le bouton qui la remplace n'est que dans l'éditeur. Le panneau
  // doit le dire, surtout dans la vue workflow, qui n'a pas d'éditeur.
  it('une image acceptée : le panneau dit où la fournir', async () => {
    mockStartStreamOnce.mockImplementation(async (_url: string, body: { chapterIndex: number; chapterHtml: string }) => ({
      result: { pass: 'images', chapterIndex: body.chapterIndex, before: body.chapterHtml, html: `${body.chapterHtml}<img src="/images/image-a-fournir.svg" alt="Un devis signé">`, issues: [], webSources: [], blocked: false, usage: null },
      usage: null, errorMessage: null, aborted: false,
    }))
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-images"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="enrich-images-to-provide"]').exists(), 'rien d’accepté, rien à dire').toBe(false)

    await wrapper.get('[data-testid="proposal-0"] [data-testid="proposal-accept"]').trigger('click')
    const hint = wrapper.get('[data-testid="enrich-images-to-provide"]').text()
    expect(hint).toMatch(/éditeur/i)
    expect(hint).toMatch(/Image/)
    expect(hint).toMatch(/publication/i)
  })

  // Suite C5b : une FAQ déjà présente donnait « le chapitre a changé » — faux.
  it('FAQ refusée parce qu’une FAQ existe déjà : le message le dit', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: { pass: 'faq', chapterIndex: 2, before: '', html: '<h2>Questions fréquentes</h2><h3>Combien ça coûte ?</h3><p>Ça dépend.</p>', issues: [], webSources: [], blocked: false, usage: null },
      usage: null, errorMessage: null, aborted: false,
    })
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-faq"]').trigger('click')
    await flushPromises()
    // Entre-temps, une FAQ a été écrite à la main.
    useEditorStore().setContent(ARTICLE.replace('<h2>Conclusion</h2>', '<h2>Questions fréquentes</h2><h3>Un délai ?</h3><p>Oui.</p><h2>Conclusion</h2>'))
    await wrapper.get('[data-testid="proposal-accept"]').trigger('click')

    const card = wrapper.get('li.proposal')
    expect(card.attributes('data-status')).toBe('stale')
    expect(card.text()).toMatch(/foire aux questions existe déjà/i)
    expect(card.text()).not.toMatch(/chapitre a changé/i)
  })

  // C7 — passe Résumer : un chapitre dont est né un article devient un résumé.
  it('résumer : seul le chapitre dont est né un article est proposé ; sans enfant, le panneau le dit', async () => {
    mockApiGet.mockResolvedValue([{ id: 11, title: 'Les étapes en détail', parentSection: 'Les étapes', keyword: null, status: 'à rédiger' }])
    mockStartStreamOnce.mockImplementation(async (_url: string, body: { chapterIndex: number; chapterHtml: string }) => ({
      result: { pass: 'resumes', chapterIndex: body.chapterIndex, before: body.chapterHtml, html: '<h2>Les étapes</h2><p>Résumé.</p>', issues: [], webSources: [], blocked: false, usage: null },
      usage: null, errorMessage: null, aborted: false,
    }))
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.get('[data-testid="enrich-pass-resumes"]').trigger('click')
    await flushPromises()
    expect(mockStartStreamOnce).toHaveBeenCalledTimes(1)
    expect(mockStartStreamOnce.mock.calls[0]![0]).toBe('/api/generate/enrich/resumes')
    expect(wrapper.findAll('li.proposal').map(li => li.find('.proposal-title').text())).toEqual(['Les étapes'])

    mockApiGet.mockResolvedValue([])
    const sansEnfant = mountPanel()
    await flushPromises()
    await sansEnfant.get('[data-testid="enrich-pass-resumes"]').trigger('click')
    await flushPromises()
    expect(sansEnfant.get('[data-testid="enrich-empty"]').text()).toMatch(/aucun chapitre n’a encore donné naissance/i)
  })

  it('les sources trouvées sont listées, liens ouverts ailleurs', async () => {
    mockStartStreamOnce.mockResolvedValue({
      result: { pass: 'sources', chapterIndex: 0, before: '<h2>Le budget</h2><p>On prévoit.</p>', html: '<h2>Le budget</h2><p>On prévoit (selon l’Insee).</p>', issues: [], webSources: [{ url: 'https://www.insee.fr/a', title: 'Insee', pageAge: null }], blocked: false, usage: null },
      usage: null, errorMessage: null, aborted: false,
    })
    useEditorStore().setContent(ARTICLE.replace('On prévoit.', 'On prévoit <mark data-a-sourcer>[à sourcer : budget moyen]</mark>.'))
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-sources"]').trigger('click')
    await flushPromises()
    const link = wrapper.get('.sources a')
    expect(link.attributes('href')).toBe('https://www.insee.fr/a')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('rien à sourcer : le panneau le dit au lieu d’appeler l’IA', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-sources"]').trigger('click')
    await flushPromises()
    expect(mockStartStreamOnce).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="enrich-empty"]').text()).toMatch(/rien à chercher/)
  })

  it('réécrire : il faut choisir un chapitre et donner une consigne', async () => {
    const wrapper = mountPanel()
    const submit = wrapper.get('[data-testid="rewrite-submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="rewrite-chapter"]').setValue(1)
    await wrapper.get('[data-testid="rewrite-instruction"]').setValue('ok')
    expect(submit.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="rewrite-instruction"]').setValue('Plus direct, avec un exemple')
    expect(submit.attributes('disabled')).toBeUndefined()
  })

  // T12 — la relecture de la langue relit l'article section par section, puis l'enregistre.
  it('relecture de la langue : humanisation avec le capitaine et les lieutenants, puis enregistrement', async () => {
    const editor = useEditorStore()
    const relire = vi.spyOn(editor, 'humanizeArticle').mockImplementation(async () => {
      editor.setContent(ARTICLE.replace('On prévoit.', 'On anticipe.'))
    })
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="enrich-pass-langue"]').trigger('click')
    await flushPromises()
    expect(relire).toHaveBeenCalledWith(7, 'site vitrine', ['artisan'])
    expect(mockApiPut).toHaveBeenCalledWith('/articles/7', expect.objectContaining({ content: expect.stringContaining('On anticipe.') }))
  })

  it('sans capitaine verrouillé, les passes restent grisées', () => {
    useArticleKeywordsStore().keywords = null
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('capitaine')
    expect(wrapper.get('[data-testid="enrich-pass-exemples"]').attributes('disabled')).toBeDefined()
  })
})
