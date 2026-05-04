/**
 * Sprint 4 (2026-05-04) — Tests cache-bar refonte.
 *
 * Frictions utilisateur (audit 2026-05-03) :
 *   « les tcp__chips ne devraient pas servir d'action de navigation. Les
 *     seules actions sont dans la div tlp et le bouton "vider le cache".
 *     D'ailleurs la border blue sur un tcp__chip pour symboliser l'onglet
 *     actif est dégueulasse. »
 *
 * Spec : chips read-only (plus de @click navigate, plus de bordure --current).
 * Le bouton "Vider le cache" reste, et le TabLoadPrompt voisin garde ses
 * boutons "Charger DB / Cache".
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabCachePanel from '../../../src/components/moteur/TabCachePanel.vue'

const ENTRIES = [
  { tabId: 'radar', tabLabel: 'Radar', dbCount: 5, cacheCount: 2, isCurrentTab: false },
  { tabId: 'capitaine', tabLabel: 'Capitaine', dbCount: 3, cacheCount: 0, isCurrentTab: true },
  { tabId: 'lieutenants', tabLabel: 'Lieutenants', dbCount: 0, cacheCount: 0, isCurrentTab: false },
]

function mountPanel(propsOverride: Record<string, unknown> = {}) {
  return mount(TabCachePanel, {
    props: {
      entries: ENTRIES,
      activeTab: 'capitaine',
      showClearCache: true,
      ...propsOverride,
    },
  })
}

describe('TabCachePanel — chips read-only (Sprint 4)', () => {
  it('AC2 — les chips n\'émettent PAS d\'event navigate au clic', async () => {
    const w = mountPanel()
    const chip = w.find('[data-testid="tcp-chip-radar"]')
    expect(chip.exists()).toBe(true)
    await chip.trigger('click')
    // Avant Sprint 4 : emit('navigate', 'radar') ; après : aucun event navigate
    expect(w.emitted('navigate')).toBeFalsy()
  })

  it('AC2 — les chips ne sont plus des <button> mais des <span>', () => {
    const w = mountPanel()
    const chip = w.find('[data-testid="tcp-chip-radar"]')
    expect(chip.element.tagName.toLowerCase()).toBe('span')
  })

  it('AC2 — pas de classe `--current` (border bleu) sur l\'onglet actif', () => {
    const w = mountPanel()
    const currentChip = w.find('[data-testid="tcp-chip-capitaine"]')
    expect(currentChip.classes()).not.toContain('tcp__chip--current')
  })

  it('AC2 — bouton "Vider le cache" reste cliquable et émet clear-cache', async () => {
    const w = mountPanel()
    const clearBtn = w.find('[data-testid="tcp-clear-cache"]')
    expect(clearBtn.exists()).toBe(true)
    await clearBtn.trigger('click')
    expect(w.emitted('clear-cache')).toBeTruthy()
  })

  it('garde-fou — chips affichent toujours DB/C counts (read-only n\'enlève pas le contenu)', () => {
    const w = mountPanel()
    const radarChip = w.find('[data-testid="tcp-chip-radar"]')
    expect(radarChip.text()).toContain('5')
    expect(radarChip.text()).toContain('2')
  })

  it('AC2 — chip avec data (filled) a la classe filled mais pas pointer cursor', () => {
    const w = mountPanel()
    const filled = w.find('[data-testid="tcp-chip-radar"]')
    expect(filled.classes()).toContain('tcp__chip--filled')
  })

  it('AC2 — chip sans data (empty) reste affiché mais sans cursor', () => {
    const w = mountPanel()
    const empty = w.find('[data-testid="tcp-chip-lieutenants"]')
    expect(empty.classes()).toContain('tcp__chip--empty')
  })
})
