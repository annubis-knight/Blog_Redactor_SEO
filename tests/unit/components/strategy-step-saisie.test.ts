/**
 * FR-CER-SAISIE-PRESERVEE — écrire pendant le chargement ne doit rien perdre.
 *
 * La stratégie du cocon est chargée par une requête asynchrone au montage du
 * Cerveau. Quand la réponse arrivait après que l'utilisateur ait commencé à
 * écrire, le watcher sur `stepData.input` réécrivait le champ avec la valeur
 * distante — vide — et la réponse en cours de saisie disparaissait. Le bouton
 * « Valider » repassait alors en grisé sans explication.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StrategyStep from '../../../src/components/strategy/StrategyStep.vue'
import type { StrategyStepData } from '../../../shared/types/index.js'

const STUBS = {
  CollapsableSection: { template: '<div><slot /></div>' },
  SubQuestionCard: true,
}

function etape(overrides: Partial<StrategyStepData> = {}): StrategyStepData {
  return { input: '', suggestion: null, validated: '', subQuestions: [], ...overrides } as StrategyStepData
}

function monter(stepData: StrategyStepData) {
  return mount(StrategyStep, {
    props: {
      title: 'Cible',
      description: 'À qui vous adressez-vous ?',
      stepData,
      isSuggesting: false,
    },
    global: { stubs: STUBS },
  })
}

describe('StrategyStep — la saisie en cours survit au chargement', () => {
  it('ne se laisse pas effacer par une valeur distante vide', async () => {
    const wrapper = monter(etape())
    const champ = wrapper.find('[data-testid="step-input"]')

    await champ.setValue('Dirigeants de TPE à Toulouse')
    expect((champ.element as HTMLTextAreaElement).value).toBe('Dirigeants de TPE à Toulouse')

    // La stratégie arrive du serveur, vide, après le début de la saisie.
    await wrapper.setProps({ stepData: etape({ input: '' }) })

    expect(
      (wrapper.find('[data-testid="step-input"]').element as HTMLTextAreaElement).value,
      'le texte tapé doit rester',
    ).toBe('Dirigeants de TPE à Toulouse')
  })

  it('laisse le bouton Valider actif après ce chargement', async () => {
    const wrapper = monter(etape())
    await wrapper.find('[data-testid="step-input"]').setValue('Une réponse')
    await wrapper.setProps({ stepData: etape({ input: '' }) })

    const valider = wrapper.find('[data-testid="step-validate"]')
    expect(valider.attributes('disabled'), 'Valider reste cliquable').toBeUndefined()
  })

  it('accepte toujours une valeur distante non vide', async () => {
    const wrapper = monter(etape({ input: 'brouillon' }))
    await wrapper.setProps({ stepData: etape({ input: 'réponse rechargée' }) })

    expect((wrapper.find('[data-testid="step-input"]').element as HTMLTextAreaElement).value)
      .toBe('réponse rechargée')
  })

  it('accepte un vide distant quand rien n’est saisi localement', async () => {
    const wrapper = monter(etape({ input: 'ancienne valeur' }))
    await wrapper.find('[data-testid="step-input"]').setValue('')
    await wrapper.setProps({ stepData: etape({ input: '' }) })

    expect((wrapper.find('[data-testid="step-input"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('propose les trois façons de valider quand saisie et suggestion coexistent', async () => {
    const wrapper = monter(etape({ suggestion: 'Une suggestion de Claude' }))
    await wrapper.find('[data-testid="step-input"]').setValue('Ma propre réponse')
    await wrapper.find('[data-testid="step-validate"]').trigger('click')

    expect(wrapper.find('[data-testid="step-validate-own"]').exists(), 'mon texte').toBe(true)
    expect(wrapper.find('[data-testid="step-validate-suggestion"]').exists(), 'la suggestion').toBe(true)
    expect(wrapper.find('[data-testid="step-validate-merge"]').exists(), 'fusionner').toBe(true)
  })
})
