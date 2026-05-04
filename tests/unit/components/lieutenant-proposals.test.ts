/**
 * Tests anti-régression pour LieutenantProposals — liste de propositions IA.
 *
 * Macro qui affiche les lieutenants proposés par Claude. Couvre :
 *   1. état streaming → pulse-dot + message "Analyse IA en cours"
 *   2. état error → message + bouton retry → emit retry
 *   3. liste vide → message d'attente
 *   4. cards retenues rendues + counter "X / Y générés"
 *   5. info filtre (retenus/éliminés) si éliminés présents
 *   6. cards éliminées masquées par défaut, toggle expand
 *   7. clic sur card → emit toggle(card)
 *   8. isLocked → cards disabled
 *   9. contentGapInsights rendu en markdown via v-safe-html
 *  10. checked reflète selectedCards.has(keyword)
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantProposals from '../../../src/components/moteur/LieutenantProposals.vue'
import type { ProposedLieutenant } from '../../../shared/types/serp-analysis.types'

const safeHtmlStub = {
  mounted: (el: HTMLElement, binding: { value: string }) => { el.innerHTML = binding.value },
  updated: (el: HTMLElement, binding: { value: string }) => { el.innerHTML = binding.value },
}

const LieutenantCardStub = {
  name: 'LieutenantCard',
  props: ['lieutenant', 'checked', 'disabled'],
  emits: ['update:checked'],
  template: `
    <div class="stub-lt-card"
      :data-keyword="lieutenant.keyword"
      :data-checked="checked"
      :data-disabled="disabled"
    >
      <button class="stub-toggle" @click="$emit('update:checked', !checked)">{{ lieutenant.keyword }}</button>
    </div>`,
}

const GLOBAL = {
  directives: { 'safe-html': safeHtmlStub },
  stubs: { LieutenantCard: LieutenantCardStub },
}

function makeLt(keyword: string, score = 70): ProposedLieutenant {
  return {
    keyword,
    reasoning: `reasoning-${keyword}`,
    sources: ['paa'],
    suggestedHnLevel: 2,
    score,
  }
}

const BASE = {
  iaIsStreaming: false,
  iaChunks: '',
  iaError: null,
  lieutenantCards: [] as ProposedLieutenant[],
  eliminatedCards: [] as ProposedLieutenant[],
  totalGenerated: 0,
  selectedCards: new Map<string, ProposedLieutenant>(),
  isLocked: false,
  contentGapInsights: '',
}

describe('LieutenantProposals', () => {
  it('streaming → message "Analyse IA en cours" + pulse-dot', () => {
    const wrapper = mount(LieutenantProposals, {
      props: { ...BASE, iaIsStreaming: true },
      global: GLOBAL,
    })
    expect(wrapper.find('[data-testid="ia-loading"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Analyse IA en cours')
  })

  it('error → message d\'erreur + bouton retry → emit retry', async () => {
    const wrapper = mount(LieutenantProposals, {
      props: { ...BASE, iaError: 'API down' },
      global: GLOBAL,
    })
    expect(wrapper.find('[data-testid="ia-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('API down')
    await wrapper.find('.btn-retry').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('liste vide → message d\'attente', () => {
    const wrapper = mount(LieutenantProposals, { props: BASE, global: GLOBAL })
    expect(wrapper.find('.section-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('proposera des lieutenants')
  })

  it('cards retenues rendues + counter affiché si des éliminés existent', () => {
    // Le compteur `[data-testid="lieutenant-counter"]` n'est rendu QUE si
    // `eliminatedCards.length > 0` (cf. LieutenantProposals.vue:101). C'est
    // l'invariant : pas d'info filtre si rien n'a été filtré.
    const cards = [makeLt('agence', 80), makeLt('expert', 70), makeLt('local', 60)]
    const eliminated = [makeLt('rejet', 30), makeLt('bof', 20)]
    const selected = new Map<string, ProposedLieutenant>()
    selected.set('agence', cards[0])
    selected.set('expert', cards[1])

    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: cards,
        eliminatedCards: eliminated,
        selectedCards: selected,
        totalGenerated: 5,
      },
      global: GLOBAL,
    })
    const counter = wrapper.find('[data-testid="lieutenant-counter"]')
    expect(counter.exists()).toBe(true)
    expect(counter.text()).toContain('3 retenus')
    expect(counter.text()).toContain('2 éliminés')
    expect(wrapper.findAll('.stub-lt-card')).toHaveLength(3)
  })

  it('REGRESSION GUARD : info filtre "retenus / éliminés" affichée seulement si éliminés', () => {
    // Sans éliminés → pas de filter-info
    const w1 = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: [makeLt('a')],
        selectedCards: new Map(),
        totalGenerated: 1,
      },
      global: GLOBAL,
    })
    expect(w1.find('.filter-info').exists()).toBe(false)

    // Avec éliminés → filter-info visible
    const w2 = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: [makeLt('a')],
        eliminatedCards: [makeLt('b')],
        selectedCards: new Map(),
        totalGenerated: 2,
      },
      global: GLOBAL,
    })
    expect(w2.find('.filter-info').exists()).toBe(true)
    expect(w2.find('.filter-info').text()).toContain('1 retenus')
    expect(w2.find('.filter-info').text()).toContain('1 éliminés')
  })

  it('cards éliminées masquées par défaut, toggle expand → visibles', async () => {
    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: [makeLt('a')],
        eliminatedCards: [makeLt('b'), makeLt('c')],
        selectedCards: new Map(),
        totalGenerated: 3,
      },
      global: GLOBAL,
    })

    // Masqué par défaut
    expect(wrapper.find('[data-testid="eliminated-cards-list"]').exists()).toBe(false)

    await wrapper.find('.eliminated-toggle').trigger('click')

    // Apparu après clic
    expect(wrapper.find('[data-testid="eliminated-cards-list"]').exists()).toBe(true)
    // 1 retenue + 2 éliminées = 3 stubs au total
    expect(wrapper.findAll('.stub-lt-card')).toHaveLength(3)
  })

  it('clic sur une card → emit toggle(card)', async () => {
    const cards = [makeLt('agence'), makeLt('expert')]
    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: cards,
        selectedCards: new Map(),
        totalGenerated: 2,
      },
      global: GLOBAL,
    })
    await wrapper.findAll('.stub-toggle')[1].trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0][0]).toEqual(cards[1])
  })

  it('isLocked=true → toutes les cards passent disabled', () => {
    const cards = [makeLt('a'), makeLt('b')]
    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: cards,
        selectedCards: new Map(),
        totalGenerated: 2,
        isLocked: true,
      },
      global: GLOBAL,
    })
    const stubs = wrapper.findAll('.stub-lt-card')
    expect(stubs[0].attributes('data-disabled')).toBe('true')
    expect(stubs[1].attributes('data-disabled')).toBe('true')
  })

  it('checked reflète selectedCards.has(keyword)', () => {
    const cards = [makeLt('a'), makeLt('b'), makeLt('c')]
    const selected = new Map<string, ProposedLieutenant>()
    selected.set('b', cards[1]) // seul 'b' sélectionné

    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: cards,
        selectedCards: selected,
        totalGenerated: 3,
      },
      global: GLOBAL,
    })
    const stubs = wrapper.findAll('.stub-lt-card')
    expect(stubs[0].attributes('data-checked')).toBe('false')
    expect(stubs[1].attributes('data-checked')).toBe('true')
    expect(stubs[2].attributes('data-checked')).toBe('false')
  })

  it('contentGapInsights → markdown rendu via v-safe-html', () => {
    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: [makeLt('a')],
        selectedCards: new Map(),
        totalGenerated: 1,
        contentGapInsights: '## Failles\n- pas de FAQ\n- pas de cas pratiques',
      },
      global: GLOBAL,
    })
    const block = wrapper.find('.content-gap-section')
    expect(block.exists()).toBe(true)
    expect(block.html()).toContain('<h2')
    expect(block.html()).toContain('FAQ')
  })

  it('contentGapInsights vide → bloc absent', () => {
    const wrapper = mount(LieutenantProposals, {
      props: {
        ...BASE,
        lieutenantCards: [makeLt('a')],
        selectedCards: new Map(),
        totalGenerated: 1,
        contentGapInsights: '',
      },
      global: GLOBAL,
    })
    expect(wrapper.find('.content-gap-section').exists()).toBe(false)
  })
})
