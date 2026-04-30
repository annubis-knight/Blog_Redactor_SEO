/**
 * Tests anti-régression pour LieutenantCard — carte d'un lieutenant proposé.
 *
 * Composant rendu N fois dans la liste de propositions Lieutenants. Couvre :
 *   1. affichage keyword + score + suggestedHnLevel
 *   2. reasoning text affiché
 *   3. badges sources avec classe par source (paa/serp/group/root/content-gap)
 *   4. source inconnue → fallback unknown
 *   5. checkbox reflète prop checked
 *   6. clic checkbox émet update:checked avec inversion
 *   7. disabled bloque la checkbox + applique classe visuelle
 *   8. classe lt-card--checked appliquée si checked
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantCard from '../../../src/components/moteur/LieutenantCard.vue'
import type { ProposedLieutenant } from '../../../shared/types/serp-analysis.types'

function makeLieutenant(over: Partial<ProposedLieutenant> = {}): ProposedLieutenant {
  return {
    keyword: 'agence locale',
    reasoning: 'Bon recouvrement avec le pilier',
    sources: ['paa', 'serp'],
    suggestedHnLevel: 2,
    score: 78,
    ...over,
  }
}

describe('LieutenantCard', () => {
  it('affiche keyword + score + tag Hn', () => {
    const wrapper = mount(LieutenantCard, {
      props: {
        lieutenant: makeLieutenant({ keyword: 'consultant seo', score: 82, suggestedHnLevel: 3 }),
        checked: false,
      },
    })
    expect(wrapper.find('.lt-card__keyword').text()).toBe('consultant seo')
    expect(wrapper.find('.lt-card__score').text()).toBe('82')
    expect(wrapper.find('.lt-card__hn-tag').text()).toBe('H3')
  })

  it('reasoning affiché', () => {
    const wrapper = mount(LieutenantCard, {
      props: {
        lieutenant: makeLieutenant({ reasoning: 'Forte intention commerciale détectée' }),
        checked: false,
      },
    })
    expect(wrapper.find('.lt-card__reasoning').text()).toBe('Forte intention commerciale détectée')
  })

  it('badges sources avec classe par source', () => {
    const wrapper = mount(LieutenantCard, {
      props: {
        lieutenant: makeLieutenant({ sources: ['paa', 'serp', 'root'] }),
        checked: false,
      },
    })
    const badges = wrapper.findAll('.lt-source')
    expect(badges).toHaveLength(3)
    expect(badges[0].classes()).toContain('lt-source--paa')
    expect(badges[1].classes()).toContain('lt-source--serp')
    expect(badges[2].classes()).toContain('lt-source--root')
  })

  it('REGRESSION GUARD : source inconnue → classe fallback unknown', () => {
    const wrapper = mount(LieutenantCard, {
      props: {
        lieutenant: makeLieutenant({ sources: ['weird-source' as never] }),
        checked: false,
      },
    })
    const badge = wrapper.find('.lt-source')
    expect(badge.classes()).toContain('lt-source--unknown')
  })

  it('checked=true → classe --checked appliquée + checkbox cochée', () => {
    const wrapper = mount(LieutenantCard, {
      props: { lieutenant: makeLieutenant(), checked: true },
    })
    expect(wrapper.classes()).toContain('lt-card--checked')
    const cb = wrapper.find('[data-testid="lt-card-checkbox"]')
    expect((cb.element as HTMLInputElement).checked).toBe(true)
  })

  it('checked=false → checkbox décochée + pas de classe --checked', () => {
    const wrapper = mount(LieutenantCard, {
      props: { lieutenant: makeLieutenant(), checked: false },
    })
    expect(wrapper.classes()).not.toContain('lt-card--checked')
    const cb = wrapper.find('[data-testid="lt-card-checkbox"]')
    expect((cb.element as HTMLInputElement).checked).toBe(false)
  })

  it('clic checkbox → emit update:checked avec valeur inversée', async () => {
    const wrapper = mount(LieutenantCard, {
      props: { lieutenant: makeLieutenant(), checked: false },
    })
    await wrapper.find('[data-testid="lt-card-checkbox"]').trigger('change')
    expect(wrapper.emitted('update:checked')).toBeTruthy()
    expect(wrapper.emitted('update:checked')![0]).toEqual([true])
  })

  it('clic sur checkbox déjà cochée → emit update:checked=false', async () => {
    const wrapper = mount(LieutenantCard, {
      props: { lieutenant: makeLieutenant(), checked: true },
    })
    await wrapper.find('[data-testid="lt-card-checkbox"]').trigger('change')
    expect(wrapper.emitted('update:checked')![0]).toEqual([false])
  })

  it('disabled=true → checkbox disabled + classe --disabled', () => {
    const wrapper = mount(LieutenantCard, {
      props: { lieutenant: makeLieutenant(), checked: false, disabled: true },
    })
    expect(wrapper.classes()).toContain('lt-card--disabled')
    const cb = wrapper.find('[data-testid="lt-card-checkbox"]')
    expect((cb.element as HTMLInputElement).disabled).toBe(true)
  })

  it('REGRESSION GUARD : tooltip score affiché en title sur le badge score', () => {
    const wrapper = mount(LieutenantCard, {
      props: { lieutenant: makeLieutenant({ score: 90 }), checked: false },
    })
    expect(wrapper.find('.lt-card__score').attributes('title')).toBe('Score IA: 90/100')
  })
})
