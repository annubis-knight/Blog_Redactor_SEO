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
vi.mock('../../../src/services/api.service', () => ({ apiPost: vi.fn(), apiPut: mockApiPut, apiGet: vi.fn() }))

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

  it('sans capitaine verrouillé, les passes restent grisées', () => {
    useArticleKeywordsStore().keywords = null
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('capitaine')
    expect(wrapper.get('[data-testid="enrich-pass-exemples"]').attributes('disabled')).toBeDefined()
  })
})
