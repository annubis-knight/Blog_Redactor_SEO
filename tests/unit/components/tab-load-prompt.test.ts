/**
 * Tests du composant `TabLoadPrompt` — notification "Charger DB / Cache" qui
 * apparaît à droite du TabCachePanel lors de la visite d'un onglet ayant des
 * données disponibles.
 *
 * Couvre :
 *   - Rendu du label de l'onglet courant.
 *   - Affichage conditionnel des boutons DB / Cache selon les compteurs.
 *   - Émission des events `load-db`, `load-cache`, `dismiss`.
 *   - Désactivation des boutons quand `isLoading` est true.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabLoadPrompt from '../../../src/components/moteur/TabLoadPrompt.vue'

function makePrompt(over: Partial<{ tabId: string; tabLabel: string; dbCount: number; cacheCount: number }> = {}) {
  return {
    tabId: 'capitaine' as const,
    tabLabel: 'Capitaine',
    dbCount: 10,
    cacheCount: 0,
    ...over,
  } as unknown as { tabId: 'radar' | 'capitaine' | 'lieutenants' | 'lexique'; tabLabel: string; dbCount: number; cacheCount: number }
}

describe('TabLoadPrompt — rendu', () => {
  it('affiche le label de l\'onglet dans le titre', () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ tabLabel: 'Radar' }) } })
    expect(wrapper.text()).toContain('Radar')
  })

  it('affiche le bouton "Charger DB" avec le compteur si dbCount > 0', () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 25, cacheCount: 0 }) } })
    const dbBtn = wrapper.find('[data-testid="tlp-load-db"]')
    expect(dbBtn.exists()).toBe(true)
    expect(dbBtn.text()).toContain('25')
  })

  it('cache le bouton "Charger DB" si dbCount = 0', () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 0, cacheCount: 1 }) } })
    expect(wrapper.find('[data-testid="tlp-load-db"]').exists()).toBe(false)
  })

  it('affiche le bouton "Charger Cache" si cacheCount > 0', () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 0, cacheCount: 1 }) } })
    const cacheBtn = wrapper.find('[data-testid="tlp-load-cache"]')
    expect(cacheBtn.exists()).toBe(true)
    expect(cacheBtn.text()).toContain('1')
  })

  it('cache le bouton "Charger Cache" si cacheCount = 0', () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 5, cacheCount: 0 }) } })
    expect(wrapper.find('[data-testid="tlp-load-cache"]').exists()).toBe(false)
  })

  it('peut afficher les deux boutons quand DB et Cache > 0', () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 25, cacheCount: 1 }) } })
    expect(wrapper.find('[data-testid="tlp-load-db"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tlp-load-cache"]').exists()).toBe(true)
  })
})

describe('TabLoadPrompt — events', () => {
  it('émet load-db au clic sur le bouton DB', async () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 10 }) } })
    await wrapper.find('[data-testid="tlp-load-db"]').trigger('click')
    expect(wrapper.emitted('load-db')).toHaveLength(1)
  })

  it('émet load-cache au clic sur le bouton Cache', async () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 0, cacheCount: 1 }) } })
    await wrapper.find('[data-testid="tlp-load-cache"]').trigger('click')
    expect(wrapper.emitted('load-cache')).toHaveLength(1)
  })

  it('émet dismiss au clic sur la croix', async () => {
    const wrapper = mount(TabLoadPrompt, { props: { prompt: makePrompt({ dbCount: 5 }) } })
    await wrapper.find('[data-testid="tlp-dismiss"]').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})

describe('TabLoadPrompt — isLoading', () => {
  it('désactive les boutons DB/Cache quand isLoading=true', () => {
    const wrapper = mount(TabLoadPrompt, {
      props: { prompt: makePrompt({ dbCount: 5, cacheCount: 1 }), isLoading: true },
    })
    const dbBtn = wrapper.find('[data-testid="tlp-load-db"]').element as HTMLButtonElement
    const cacheBtn = wrapper.find('[data-testid="tlp-load-cache"]').element as HTMLButtonElement
    expect(dbBtn.disabled).toBe(true)
    expect(cacheBtn.disabled).toBe(true)
  })

  it('boutons actifs par défaut', () => {
    const wrapper = mount(TabLoadPrompt, {
      props: { prompt: makePrompt({ dbCount: 5, cacheCount: 1 }) },
    })
    const dbBtn = wrapper.find('[data-testid="tlp-load-db"]').element as HTMLButtonElement
    expect(dbBtn.disabled).toBe(false)
  })
})
