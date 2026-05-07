/**
 * Tests anti-régression pour LieutenantH2Structure — structure Hn vers l'éditeur.
 *
 * Macro qui affiche la structure Hn proposée par l'IA + récurrence concurrents.
 * Couvre :
 *   1. structure Hn de l'IA : H2 + enfants H3 rendus hiérarchiquement
 *   2. structure absente → section visible avec hint + bouton Générer
 *      (FR-MOT-HN-EMPTY-VISIBLE 2026-05-07 : la section reste affichée
 *       avec un placeholder pour signaler à l'utilisateur qu'une HN est
 *       attendue ici, plutôt que de disparaître silencieusement.)
 *   3. bouton Sauvegarder visible si !isLocked, masqué si locked
 *   4. clic Sauvegarder → emit save-hn
 *   5. bouton disabled pendant isSavingHn
 *   6. badge "Sauvegardée" affiché si hnSaved=true
 *   7. badge "Validée avec lieutenants" affiché si isLocked + !hnSaved
 *   8. tabs keywords pour Hn concurrents (multi-keywords)
 *   9. clic tab → emit update:activeHnTab
 *  10. liste de récurrence avec count, total, percent + bar
 *  11. liste vide → message dédié
 *  12. Régénération HN : bouton + propagation lockedHeadings
 *      (FR-MOT-HN-REGEN-LOCKED 2026-05-07)
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantH2Structure from '../../../src/components/moteur/LieutenantH2Structure.vue'
import type { ProposeLieutenantsHnNode, HnRecurrenceItem, SerpAnalysisResult } from '../../../shared/types/serp-analysis.types'

const STUBS = {
  CollapsableSection: {
    props: ['title', 'defaultOpen'],
    template: '<section><h3>{{ title }}</h3><slot /></section>',
  },
  Transition: { template: '<div><slot /></div>' },
}

const BASE = {
  hnStructure: [] as ProposeLieutenantsHnNode[],
  activeHnRecurrence: [] as HnRecurrenceItem[],
  hnRecurrence: [] as HnRecurrenceItem[],
  serpResultsByKeyword: new Map<string, SerpAnalysisResult>(),
  activeHnTab: '__all__',
  isLocked: false,
  hnSaved: false,
  isSavingHn: false,
  selectedCardsSize: 0,
  hnRegenStreaming: false,
  hnRegenError: null as string | null,
}

describe('LieutenantH2Structure', () => {
  it('structure Hn IA absente → section visible avec hint + bouton Generer', () => {
    const wrapper = mount(LieutenantH2Structure, { props: BASE, global: { stubs: STUBS } })
    // FR-MOT-HN-EMPTY-VISIBLE : la section reste affichée même vide.
    expect(wrapper.find('[data-testid="hn-structure-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hn-structure-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hn-generate-btn"]').exists()).toBe(true)
    // Sans lieutenants cochés, le bouton est désactivé.
    expect((wrapper.find('[data-testid="hn-generate-btn"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('structure Hn IA absente + lieutenants cochés → bouton Generer activable', () => {
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, selectedCardsSize: 3 },
      global: { stubs: STUBS },
    })
    expect((wrapper.find('[data-testid="hn-generate-btn"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('clic Generer → emit regenerate-hn avec lockedHeadings vide (aucun titre verrouillé)', async () => {
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, selectedCardsSize: 3 },
      global: { stubs: STUBS },
    })
    await wrapper.find('[data-testid="hn-generate-btn"]').trigger('click')
    expect(wrapper.emitted('regenerate-hn')![0]).toEqual([[]])
  })

  it('verrou + Regenerer → emit regenerate-hn avec lockedHeadings du H2 verrouillé', async () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [
      { level: 2, text: 'H2 à garder' },
      { level: 2, text: 'H2 jetable' },
    ]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, selectedCardsSize: 3 },
      global: { stubs: STUBS },
    })
    // Verrouille le premier H2
    const lockBtns = wrapper.findAll('.hn-lock-btn')
    await lockBtns[0].trigger('click')
    // Click Régénérer
    await wrapper.find('[data-testid="hn-regenerate-btn"]').trigger('click')
    const emitted = wrapper.emitted('regenerate-hn')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual([{ level: 2, text: 'H2 à garder', children: undefined }])
  })

  it('hnRegenStreaming=true → texte "Regeneration..." + bouton désactivé', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, selectedCardsSize: 3, hnRegenStreaming: true },
      global: { stubs: STUBS },
    })
    const btn = wrapper.find('[data-testid="hn-regenerate-btn"]')
    expect(btn.text()).toContain('Regeneration')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('hnRegenError → message d\'erreur affiché', () => {
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, selectedCardsSize: 3, hnRegenError: 'Erreur réseau' },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Erreur réseau')
  })

  it('structure Hn IA : H2 + enfants H3 rendus hiérarchiquement', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [
      {
        level: 2,
        text: 'Pourquoi choisir une agence',
        children: [
          { level: 3, text: 'Les avantages métier' },
          { level: 3, text: 'Les coûts' },
        ],
      },
      { level: 2, text: 'Comment évaluer une agence' },
    ]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure },
      global: { stubs: STUBS },
    })

    const items = wrapper.findAll('.hn-structure-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('H2')
    expect(items[0].text()).toContain('Pourquoi choisir une agence')

    const children = wrapper.findAll('.hn-structure-child')
    expect(children).toHaveLength(2)
    expect(children[0].text()).toContain('H3')
    expect(children[0].text()).toContain('Les avantages métier')
  })

  it('REGRESSION GUARD : bouton Sauvegarder visible quand !isLocked', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, isLocked: false },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.btn-save-hn').exists()).toBe(true)
  })

  it('REGRESSION GUARD : bouton Sauvegarder masqué quand isLocked', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, isLocked: true },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.btn-save-hn').exists()).toBe(false)
  })

  it('clic Sauvegarder → emit save-hn', async () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure },
      global: { stubs: STUBS },
    })
    await wrapper.find('.btn-save-hn').trigger('click')
    expect(wrapper.emitted('save-hn')).toBeTruthy()
  })

  it('bouton disabled pendant isSavingHn + texte "Sauvegarde..."', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, isSavingHn: true },
      global: { stubs: STUBS },
    })
    const btn = wrapper.find('.btn-save-hn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    expect(btn.text()).toContain('Sauvegarde')
  })

  it('badge "Sauvegardée" affiché si hnSaved=true', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, hnSaved: true },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Sauvegardee')
  })

  it('badge "Validée avec lieutenants" si isLocked + !hnSaved', () => {
    const hnStructure: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'H2' }]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, hnStructure, isLocked: true, hnSaved: false },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Validee avec les lieutenants')
  })

  it('tabs keywords visibles si serpResultsByKeyword.size > 1', () => {
    const map = new Map<string, SerpAnalysisResult>()
    map.set('kw1', {} as never)
    map.set('kw2', {} as never)
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, serpResultsByKeyword: map },
      global: { stubs: STUBS },
    })
    const tabs = wrapper.findAll('.kw-tab-btn')
    // 1 tab "Tous" + 2 tabs keyword = 3
    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toContain('Tous')
  })

  it('REGRESSION GUARD : tabs masqués si une seule keyword', () => {
    const map = new Map<string, SerpAnalysisResult>()
    map.set('kw1', {} as never)
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, serpResultsByKeyword: map },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('.kw-tab-headers').exists()).toBe(false)
  })

  it('clic tab keyword → emit update:activeHnTab', async () => {
    const map = new Map<string, SerpAnalysisResult>()
    map.set('kw1', {} as never)
    map.set('kw2', {} as never)
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, serpResultsByKeyword: map, activeHnTab: '__all__' },
      global: { stubs: STUBS },
    })
    const tabs = wrapper.findAll('.kw-tab-btn')
    await tabs[1].trigger('click') // premier kw → "kw1"
    expect(wrapper.emitted('update:activeHnTab')![0]).toEqual(['kw1'])
  })

  it('liste de récurrence : count/total + percent + bar', () => {
    const hnRecurrence: HnRecurrenceItem[] = [
      { level: 2, text: 'Pricing', count: 4, total: 5, percent: 80 },
      { level: 3, text: 'FAQ', count: 2, total: 5, percent: 40 },
    ]
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, activeHnRecurrence: hnRecurrence, hnRecurrence },
      global: { stubs: STUBS },
    })
    const items = wrapper.findAll('.hn-recurrence-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Pricing')
    expect(items[0].text()).toContain('4/5')
    expect(items[0].text()).toContain('(80%)')
    // Bar avec width = percent
    expect((items[0].find('.hn-bar').element as HTMLElement).style.width).toBe('80%')
  })

  it('récurrence vide → message "Aucun heading extrait"', () => {
    const wrapper = mount(LieutenantH2Structure, {
      props: { ...BASE, activeHnRecurrence: [] },
      global: { stubs: STUBS },
    })
    expect(wrapper.text()).toContain('Aucun heading extrait')
  })
})
