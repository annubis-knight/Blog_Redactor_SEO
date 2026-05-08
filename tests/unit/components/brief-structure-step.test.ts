/**
 * Tests anti-régression pour BriefStructureStep — porte d'entrée Rédaction.
 *
 * Composant macro orchestrant brief + outline avant génération article.
 * 722 lignes, 7 stores Pinia, multiples sous-composants → on stub agressivement
 * et on cible les COMPORTEMENTS LOGIQUES :
 *   1. dérivation cocoonSlug (normalisation NFD + kebab-case)
 *   2. loadMicroContext au mount → GET /articles/:id/micro-context
 *   3. saveMicroContext → PUT + emit check-completed quand contenu suffisant
 *   4. saveMicroContext + champ vide → pas d'emit check-completed
 *   5. handleOutlineValidated → store.validateOutline + emit outline-validated
 *   6. handleTargetWordCountUpdate → met à jour la valeur + déclenche save
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import BriefStructureStep from '../../../src/components/workflow/BriefStructureStep.vue'
import { apiGet, apiPut } from '../../../src/services/api.service'
import { useOutlineStore } from '../../../src/stores/article/outline.store'

// Mocks API : pas d'appel réseau réel.
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn().mockResolvedValue({ ok: true }),
}))

// Mock useStreaming : on n'a pas besoin d'IA pour ces tests.
vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    isStreaming: { value: false },
    startStream: vi.fn(),
  }),
}))

const mockedGet = vi.mocked(apiGet)
const mockedPut = vi.mocked(apiPut)

// Stubs pour les sous-composants : on isole BriefStructureStep.
const STUBS = {
  CollapsableSection: { template: '<div><slot name="header" /><slot /></div>' },
  ContextRecap: true,
  RecapToggle: { template: '<div><slot /></div>' },
  KeywordList: true,
  ContentRecommendation: true,
  OutlineEditor: true,
  OutlineDisplay: true,
  ArticleKeywordsPanel: true,
  Transition: { template: '<div><slot /></div>' },
}

const BASE_PROPS = {
  articleId: 42,
  cocoonName: 'Mon Cocon SEO',
  siloName: 'SEO Local',
  articleTitle: 'Mon article',
}

describe('BriefStructureStep — comportements macro user-facing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedGet.mockReset()
    mockedPut.mockReset()
    mockedGet.mockResolvedValue(null) // pas de micro-context existant par défaut
    mockedPut.mockResolvedValue({ ok: true })
  })

  it('au mount : appelle GET /articles/:id/micro-context', async () => {
    mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    await flushPromises()

    expect(mockedGet).toHaveBeenCalledWith('/articles/42/micro-context')
  })

  it('REGRESSION GUARD : cocoonSlug normalise accents + kebab-case', async () => {
    // Le slug est dérivé du cocoonName et passé aux sous-composants. Si la
    // normalisation casse, les prompts IA reçoivent un mauvais slug → casse
    // toute la génération en aval.
    const wrapper = mount(BriefStructureStep, {
      props: { ...BASE_PROPS, cocoonName: 'Référencement Naturel' } as never,
      global: { stubs: STUBS },
    })
    await flushPromises()

    // Le composable cocoonSlug doit produire "referencement-naturel"
    // On accède au computed via $.setupState (vue-test-utils internal).
    const setup = (wrapper.vm as unknown as { cocoonSlug: { value?: string } | string }).cocoonSlug
    const slug = typeof setup === 'string' ? setup : setup?.value
    expect(slug).toBe('referencement-naturel')
  })

  it('hydrate les champs depuis le micro-context retourné par l\'API', async () => {
    mockedGet.mockResolvedValueOnce({
      angle: 'angle existant',
      tone: 'pedagogique',
      directives: 'consignes existantes',
      targetWordCount: 1500,
    })

    const wrapper = mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    // loadMicroContext() s'exécute au mount via onMounted async — il faut
    // laisser plusieurs microtasks pour que le `await apiGet()` se résolve
    // ET que le DOM se mette à jour avec les nouvelles refs.
    await flushPromises()
    await nextTick()

    // On vérifie via setupState pour éviter les nuances DOM (les refs angle/tone
    // sont exposées via le proxy de setup quand <script setup> les utilise).
    const vm = wrapper.vm as unknown as { angle: string; tone: string; directives: string }
    expect(vm.angle).toBe('angle existant')
    expect(vm.tone).toBe('pedagogique')
    expect(vm.directives).toBe('consignes existantes')
  })

  it('saveMicroContext (via blur sur l\'angle) → PUT avec le payload + emit check-completed quand suffisant', async () => {
    mockedGet.mockResolvedValueOnce(null)

    const wrapper = mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    await flushPromises()

    // On remplit angle + tone (suffisant pour que brief-validated soit émis)
    const angleArea = wrapper.find('textarea')
    await angleArea.setValue('mon angle differenciant')
    const toneInput = wrapper.find('input[type="text"]')
    await toneInput.setValue('pedagogique')
    await toneInput.trigger('blur')
    await flushPromises()

    expect(mockedPut).toHaveBeenCalledWith(
      '/articles/42/micro-context',
      expect.objectContaining({
        angle: 'mon angle differenciant',
        tone: 'pedagogique',
      }),
    )
    // Émis quand angle + (tone || directives) sont remplis
    expect(wrapper.emitted('check-completed')).toBeTruthy()
    const events = wrapper.emitted('check-completed')!
    // 2026-05-08 — emit utilise la constante REDACTION_BRIEF_VALIDATED
    // ('redaction:brief_validated') au lieu de la legacy 'brief-validated'.
    expect(events.some(e => e[0] === 'redaction:brief_validated')).toBe(true)
  })

  it('REGRESSION GUARD : angle vide seul → PUT mais PAS d\'emit check-completed', async () => {
    mockedGet.mockResolvedValueOnce(null)

    const wrapper = mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    await flushPromises()

    const angleArea = wrapper.find('textarea')
    await angleArea.setValue('')
    await angleArea.trigger('blur')
    await flushPromises()

    // PUT a lieu (pour persister le reset) mais pas l'emit (champ critique vide).
    expect(wrapper.emitted('check-completed')).toBeFalsy()
  })

  it('handleOutlineValidated → outlineStore.validateOutline(articleId) + emit outline-validated', async () => {
    const wrapper = mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    await flushPromises()

    const outlineStore = useOutlineStore()
    const validateSpy = vi.spyOn(outlineStore, 'validateOutline').mockResolvedValue(undefined as never)

    // On invoque la fonction interne via setupState (testabilité directe sans
    // dépendre de l'arbre DOM lourd qui peut bouger entre versions).
    const vm = wrapper.vm as unknown as { handleOutlineValidated: () => void }
    vm.handleOutlineValidated()
    await nextTick()

    expect(validateSpy).toHaveBeenCalledWith(42)
    expect(wrapper.emitted('outline-validated')).toBeTruthy()
  })

  it('handleTargetWordCountUpdate → met à jour targetWordCount + déclenche save', async () => {
    mockedGet.mockResolvedValueOnce({ angle: 'a', tone: 't', directives: '', targetWordCount: undefined })

    const wrapper = mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    await flushPromises()
    mockedPut.mockClear()

    const vm = wrapper.vm as unknown as { handleTargetWordCountUpdate: (v: number) => void }
    vm.handleTargetWordCountUpdate(1800)
    await flushPromises()

    expect(mockedPut).toHaveBeenCalledWith(
      '/articles/42/micro-context',
      expect.objectContaining({ targetWordCount: 1800 }),
    )
  })

  it('handle save error : ne propage pas l\'erreur réseau au parent', async () => {
    mockedGet.mockResolvedValueOnce(null)
    mockedPut.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mount(BriefStructureStep, {
      props: BASE_PROPS as never,
      global: { stubs: STUBS },
    })
    await flushPromises()

    const angleArea = wrapper.find('textarea')
    await angleArea.setValue('mon angle')
    await angleArea.trigger('blur')

    // Pas de throw : l'erreur est loggée mais le composant ne crash pas.
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    // Pas d'emit check-completed sur erreur
    expect(wrapper.emitted('check-completed')).toBeFalsy()
  })
})
