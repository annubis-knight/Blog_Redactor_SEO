/**
 * Sprint D-1 (2026-05-02) — Tests DiscoveryAiPanel.
 *
 * Panel suggestion bas-de-page sans appel IA. Surface les meilleurs candidats
 * du basket Discovery via tri local (signal × Jaccard douleur). Handoff
 * 'push-to-radar' avec liste cochée par l'utilisateur.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiscoveryAiPanel from '@/components/moteur/DiscoveryAiPanel.vue'
import type { BasketKeyword } from '@/stores/article/moteur-basket.store'

function makeBasket(items: Array<Partial<BasketKeyword> & { keyword: string }>): BasketKeyword[] {
  return items.map((it, i) => ({
    keyword: it.keyword,
    source: it.source ?? 'discovery',
    addedAt: it.addedAt ?? `2026-05-02T00:00:0${i}.000Z`,
    score: it.score ?? 50,
    validated: false,
    pushedToRadar: it.pushedToRadar ?? false,
  }))
}

describe('DiscoveryAiPanel', () => {
  const COMMON = {
    basket: [] as BasketKeyword[],
    painPoint: '' as string | null,
    isLocked: false,
  }

  it('rend la coque suggestion', () => {
    const w = mount(DiscoveryAiPanel, { props: COMMON })
    expect(w.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
  })

  it('basket vide → idle visible avec hint', () => {
    const w = mount(DiscoveryAiPanel, { props: COMMON })
    expect(w.text()).toContain('basket')
  })

  it('basket non vide → liste de candidats avec checkbox', () => {
    const basket = makeBasket([
      { keyword: 'douleur dos', score: 80 },
      { keyword: 'mal de dos chronique', score: 60 },
    ])
    const w = mount(DiscoveryAiPanel, { props: { ...COMMON, basket, painPoint: 'Soulager la douleur de dos' } })
    const list = w.find('[data-testid="discovery-ai-list"]')
    expect(list.exists()).toBe(true)
    expect(list.findAll('input[type="checkbox"]').length).toBe(2)
  })

  it('cocher des candidats puis "Pousser vers Radar" → emit push-to-radar avec la sélection', async () => {
    const basket = makeBasket([
      { keyword: 'douleur dos', score: 80 },
      { keyword: 'velo paris', score: 70 },
    ])
    const w = mount(DiscoveryAiPanel, { props: { ...COMMON, basket } })
    const checkboxes = w.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await w.find('[data-testid="discovery-ai-handoff"]').trigger('click')
    expect(w.emitted('push-to-radar')).toBeTruthy()
    const payload = w.emitted('push-to-radar')![0][0] as string[]
    expect(payload.length).toBe(1)
    expect(payload[0]).toBe('douleur dos')
  })

  it('candidats déjà pushedToRadar → checkbox désactivée + pas re-cochables', () => {
    const basket = makeBasket([
      { keyword: 'douleur dos', score: 80, pushedToRadar: true },
    ])
    const w = mount(DiscoveryAiPanel, { props: { ...COMMON, basket } })
    const cb = w.find('input[type="checkbox"]')
    expect((cb.element as HTMLInputElement).disabled).toBe(true)
  })

  it('handoff désactivé tant que rien n\'est coché', () => {
    const basket = makeBasket([{ keyword: 'velo', score: 60 }])
    const w = mount(DiscoveryAiPanel, { props: { ...COMMON, basket } })
    const btn = w.find('[data-testid="discovery-ai-handoff"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
