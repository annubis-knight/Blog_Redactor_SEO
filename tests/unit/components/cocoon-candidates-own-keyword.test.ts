/**
 * FR-CER-KEYWORD-REAL-DATA — proposer son propre mot-clé quand aucun candidat ne
 * convient ou n'a de données.
 *
 * Recette réelle du 2026-10-02 : cinq candidats sur cinq du pilier étaient des
 * phrases longues sans aucune donnée chez DataForSEO, tous « Non mesuré » ; rien
 * ne pouvait être choisi et le pilier ne pouvait pas être créé.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CocoonCandidatesPanel from '../../../src/components/production/brain/CocoonCandidatesPanel.vue'
import type { ChildCandidate } from '../../../shared/types/cocoon-tree.types'

function candidate(keyword: string, measured: boolean): ChildCandidate {
  return {
    keyword, title: `Titre ${keyword}`, rationale: 'r', painPoint: null, painIntentExpected: null,
    metrics: measured ? { searchVolume: 320, keywordDifficulty: 30, cpc: 2, intent: 'commercial' } : null,
    serp: [],
  } as ChildCandidate
}

const BASE = {
  targetLabel: 'Le pilier du cocon',
  candidates: [] as ChildCandidate[],
  isProposing: false,
  proposeError: null as string | null,
  isCreating: false,
  createError: null as string | null,
  isMeasuringOwn: false,
  measureOwnError: null as string | null,
}

describe('CocoonCandidatesPanel — FR-CER-KEYWORD-REAL-DATA : votre mot-clé', () => {
  it('tous les candidats non mesurés : l’écran le dit et invite à proposer son mot-clé', () => {
    const w = mount(CocoonCandidatesPanel, { props: { ...BASE, candidates: [candidate('phrase longue', false), candidate('autre phrase', false)] } })
    expect(w.find('[data-testid="candidates-none-measured"]').text()).toMatch(/proposez votre propre mot-clé/i)
    expect(w.find('[data-testid="own-keyword-form"]').exists()).toBe(true)
  })

  it('un candidat mesuré : pas d’alerte, le formulaire reste disponible', () => {
    const w = mount(CocoonCandidatesPanel, { props: { ...BASE, candidates: [candidate('site sur mesure', true)] } })
    expect(w.find('[data-testid="candidates-none-measured"]').exists()).toBe(false)
    expect(w.find('[data-testid="own-keyword-form"]').exists()).toBe(true)
  })

  it('« Mesurer ce mot-clé » émet le mot-clé tapé ; trop court, le bouton reste grisé', async () => {
    const w = mount(CocoonCandidatesPanel, { props: { ...BASE, candidates: [candidate('phrase longue', false)] } })
    const input = w.find('[data-testid="own-keyword-input"]')
    const button = w.find('[data-testid="own-keyword-measure"]')
    await input.setValue('a')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    await input.setValue('  site internet sur mesure ')
    expect((button.element as HTMLButtonElement).disabled).toBe(false)
    await w.find('[data-testid="own-keyword-form"]').trigger('submit')
    expect(w.emitted('measure')).toEqual([['site internet sur mesure']])
  })

  it('après un échec de la proposition de l’IA, on peut encore proposer son mot-clé', () => {
    const w = mount(CocoonCandidatesPanel, { props: { ...BASE, proposeError: 'Aucun candidat : l’IA n’a pas répondu.' } })
    expect(w.find('[data-testid="own-keyword-form"]').exists()).toBe(true)
  })

  it('pendant la mesure, puis en cas de refus : l’état et la raison s’affichent', async () => {
    const w = mount(CocoonCandidatesPanel, { props: { ...BASE, isMeasuringOwn: true } })
    expect(w.find('[data-testid="own-keyword-measure"]').text()).toMatch(/Mesure en cours/)
    await w.setProps({ isMeasuringOwn: false, measureOwnError: '« isolation combles » est déjà le mot-clé d’un article de ce cocon.' })
    expect(w.find('[data-testid="own-keyword-error"]').text()).toMatch(/déjà le mot-clé/)
  })

  it('pendant la proposition de l’IA, pas de formulaire', () => {
    const w = mount(CocoonCandidatesPanel, { props: { ...BASE, isProposing: true } })
    expect(w.find('[data-testid="own-keyword-form"]').exists()).toBe(false)
  })
})
