/**
 * FR-LEX-CHECKBOX-LOCK-IMMEDIATE — la sélection du Lexique reste ajustable.
 *
 * L'exigence est explicite : « Décocher la case retire le terme immédiatement »,
 * et sa mise en situation décrit l'utilisateur qui « coche un Différenciateur,
 * décoche un Obligatoire qu'il juge déplacé — la sélection s'ajuste à chaque
 * clic, sans validation explicite ».
 *
 * Les cases portaient pourtant `:disabled="isLocked"`, où `isLocked` vaut vrai
 * dès qu'un seul terme est retenu : la liste se figeait au premier clic, et
 * l'utilisateur ne pouvait plus rien retirer. Le défaut est devenu flagrant une
 * fois le pré-cochage persisté (FR-LEX-PRECHECK-PERSISTE), puisque la liste
 * arrivait alors figée d'emblée.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LexiqueTermsList from '../../../src/components/moteur/lexique/LexiqueTermsList.vue'

const TERMES = [
  { term: 'garantie décennale', density: 3.2, presencePct: 100 },
  { term: 'devis gratuit', density: 2.1, presencePct: 86 },
  { term: 'artisan certifié', density: 1.4, presencePct: 71 },
]

function monter(selection: string[], isLocked: boolean) {
  return mount(LexiqueTermsList, {
    props: {
      title: 'Obligatoire (70%+)',
      terms: TERMES as never,
      selectedTerms: new Set(selection),
      isLocked,
      defaultOpen: true,
      isIaRecommended: () => null,
      getRecommendation: () => undefined,
      sortTermsByAlignment: <T,>(t: T[]) => t,
      emptyLabel: 'Aucun terme',
    },
    global: { stubs: { CollapsableSection: { template: '<div><slot /></div>' } } },
  })
}

describe('LexiqueTermsList — une case cochée reste décochable', () => {
  it('laisse les cases actives quand des termes sont déjà retenus', () => {
    const wrapper = monter(['garantie décennale', 'devis gratuit'], true)

    const cases = wrapper.findAll('.term-checkbox')
    expect(cases.length).toBe(3)
    for (const [i, c] of cases.entries()) {
      expect(
        (c.element as HTMLInputElement).disabled,
        `la case ${i} doit rester cliquable pour pouvoir être retirée`,
      ).toBe(false)
    }
  })

  it('laisse les cases actives quand rien n’est encore retenu', () => {
    const wrapper = monter([], false)

    for (const c of wrapper.findAll('.term-checkbox')) {
      expect((c.element as HTMLInputElement).disabled).toBe(false)
    }
  })

  it('reflète la sélection reçue', () => {
    const wrapper = monter(['garantie décennale'], true)
    const cases = wrapper.findAll('.term-checkbox')

    expect((cases[0].element as HTMLInputElement).checked).toBe(true)
    expect((cases[1].element as HTMLInputElement).checked).toBe(false)
  })

  it('signale chaque bascule au parent, dans les deux sens', async () => {
    const wrapper = monter(['garantie décennale'], true)
    const cases = wrapper.findAll('.term-checkbox')

    await cases[0].trigger('change')
    await cases[2].trigger('change')

    const bascules = wrapper.emitted('toggle-term') as Array<[string]> | undefined
    expect(bascules, 'le parent doit être prévenu').toBeTruthy()
    expect(bascules!.map(b => b[0])).toEqual(['garantie décennale', 'artisan certifié'])
  })
})
