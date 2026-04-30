/**
 * Tests pour useResizablePanel — drag du drawer Capitaine + bornes + persistance.
 *
 * Compromis JSDOM : la classe PointerEvent n'existe pas en environnement de
 * test. On dispatch des Event customs avec un attribut `clientX` numérique,
 * c'est suffisant pour tester la logique métier (le composable lit juste
 * `e.clientX`). Idem pour `document.body.style` qu'on observe directement.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, defineComponent, h } from 'vue'
import { mount as vtuMount } from '@vue/test-utils'
import { useResizablePanel } from '@/composables/ui/useResizablePanel'

void mount

const STORAGE_KEY = 'blog-redactor:panel-width'

/**
 * Mounte un composant minimal qui appelle le composable, expose ses retours
 * pour les assertions, et installe les listeners document via Vue lifecycle.
 */
function mountResizablePanel() {
  const composableRefs: ReturnType<typeof useResizablePanel> | null = null
  let captured: ReturnType<typeof useResizablePanel>
  const TestHost = defineComponent({
    setup() {
      captured = useResizablePanel()
      return () => h('div')
    },
  })
  const wrapper = vtuMount(TestHost)
  return { wrapper, composable: () => captured!, composableRefs }
}

/** Crée un fake PointerEvent avec clientX réglable (JSDOM-compatible). */
function pointerEvent(name: string, clientX: number): Event {
  const e = new Event(name, { bubbles: true })
  Object.defineProperty(e, 'clientX', { value: clientX, configurable: true })
  return e
}

// 2026-04-30 — Plus de borne haute (`PANEL_MAX_WIDTH` retiré).
// Le panel est `position: fixed` et redimensionnable sans limite.
// Seul le floor minimum (240px) est conservé.

describe('useResizablePanel', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY)
  })

  it('panelWidth démarre à la valeur par défaut (300) si localStorage vide', () => {
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().panelWidth.value).toBe(300)
    wrapper.unmount()
  })

  it('panelWidth lit la valeur persistée si présente dans localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '380')
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().panelWidth.value).toBe(380)
    wrapper.unmount()
  })

  it('panelWidth clamp en dessous du min (240)', () => {
    localStorage.setItem(STORAGE_KEY, '100')
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().panelWidth.value).toBe(240)
    wrapper.unmount()
  })

  it('panelWidth accepte n\'importe quelle valeur élevée (pas de borne haute)', () => {
    // 2026-04-30 — Le panel est flottant, l'utilisateur peut l'étirer sans limite.
    localStorage.setItem(STORAGE_KEY, '9999')
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().panelWidth.value).toBe(9999)
    wrapper.unmount()
  })

  it('expose la borne PANEL_MIN_WIDTH (PANEL_MAX_WIDTH supprimé)', () => {
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().PANEL_MIN_WIDTH).toBe(240)
    // PANEL_MAX_WIDTH n'est plus exposé — le panel n'a plus de borne haute.
    expect((composable() as Record<string, unknown>).PANEL_MAX_WIDTH).toBeUndefined()
    wrapper.unmount()
  })

  it('onPointerDown active isResizing et applique cursor=col-resize sur body', () => {
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().isResizing.value).toBe(false)

    const fakeEvt = pointerEvent('pointerdown', 1000)
    composable().onPointerDown(fakeEvt as PointerEvent)

    expect(composable().isResizing.value).toBe(true)
    expect(document.body.style.cursor).toBe('col-resize')
    expect(document.body.style.userSelect).toBe('none')
    wrapper.unmount()
  })

  it('drag vers la gauche élargit le panel (panel à droite)', async () => {
    const { wrapper, composable } = mountResizablePanel()
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    // Drag de 50px vers la gauche → delta = 1000 - 950 = +50 → 300 + 50 = 350
    document.dispatchEvent(pointerEvent('pointermove', 950))
    expect(composable().panelWidth.value).toBe(350)
    wrapper.unmount()
  })

  it('drag vers la droite réduit le panel', async () => {
    const { wrapper, composable } = mountResizablePanel()
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    // Drag 30px à droite → delta = 1000 - 1030 = -30 → 300 - 30 = 270
    document.dispatchEvent(pointerEvent('pointermove', 1030))
    expect(composable().panelWidth.value).toBe(270)
    wrapper.unmount()
  })

  it('drag clamp à PANEL_MIN_WIDTH (240) si on tire trop à droite', async () => {
    const { wrapper, composable } = mountResizablePanel()
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    // Drag énorme à droite → 300 - 500 = -200, clamp à 240
    document.dispatchEvent(pointerEvent('pointermove', 1500))
    expect(composable().panelWidth.value).toBe(240)
    wrapper.unmount()
  })

  it('drag énorme à gauche : aucune borne haute, le panel s\'étire sans limite', async () => {
    const { wrapper, composable } = mountResizablePanel()
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    // Drag énorme à gauche → 300 + 5000 = 5300, accepté sans clamp.
    document.dispatchEvent(pointerEvent('pointermove', -4000))
    expect(composable().panelWidth.value).toBe(5300)
    wrapper.unmount()
  })

  it('pointermove SANS pointerdown préalable est ignoré (pas de resize fantôme)', () => {
    const { wrapper, composable } = mountResizablePanel()
    expect(composable().panelWidth.value).toBe(300)
    document.dispatchEvent(pointerEvent('pointermove', 500))
    expect(composable().panelWidth.value).toBe(300)
    wrapper.unmount()
  })

  it('pointerup termine le drag, reset isResizing et nettoie body styles', () => {
    const { wrapper, composable } = mountResizablePanel()
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    expect(composable().isResizing.value).toBe(true)

    document.dispatchEvent(pointerEvent('pointerup', 1000))

    expect(composable().isResizing.value).toBe(false)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
    wrapper.unmount()
  })

  it('après un drag complet, la largeur est persistée en localStorage', async () => {
    const { wrapper, composable } = mountResizablePanel()
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    document.dispatchEvent(pointerEvent('pointermove', 900)) // +100 → 400
    document.dispatchEvent(pointerEvent('pointerup', 900))
    // Laisse useLocalStorage flush son setItem (sync en VueUse mais on attend le tick)
    await Promise.resolve()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('400')
    wrapper.unmount()
  })

  it('plusieurs séquences de drag successives mettent à jour la largeur de manière cumulative', () => {
    const { wrapper, composable } = mountResizablePanel()

    // Drag 1 : 300 → 360
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    document.dispatchEvent(pointerEvent('pointermove', 940))
    expect(composable().panelWidth.value).toBe(360)
    document.dispatchEvent(pointerEvent('pointerup', 940))

    // Drag 2 : 360 → 410
    composable().onPointerDown(pointerEvent('pointerdown', 1000) as PointerEvent)
    document.dispatchEvent(pointerEvent('pointermove', 950))
    expect(composable().panelWidth.value).toBe(410)
    document.dispatchEvent(pointerEvent('pointerup', 950))

    wrapper.unmount()
  })
})
