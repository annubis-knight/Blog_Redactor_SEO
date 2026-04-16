import { provide, inject, ref, computed, readonly, type InjectionKey, type Ref, type ComputedRef } from 'vue'

export interface RecapRadioGroupContext {
  openPanelId: Readonly<Ref<string | null>>
  toggle: (id: string) => void
}

export const RECAP_RADIO_KEY: InjectionKey<RecapRadioGroupContext> = Symbol('recap-radio-group')

/**
 * Call in the parent view to create a radio group.
 * All descendant RecapToggle panels will share this group:
 * only one can be open at a time, all start collapsed.
 */
export function provideRecapRadioGroup(): RecapRadioGroupContext {
  const openPanelId = ref<string | null>(null)

  function toggle(id: string) {
    openPanelId.value = openPanelId.value === id ? null : id
  }

  const ctx: RecapRadioGroupContext = { openPanelId: readonly(openPanelId), toggle }
  provide(RECAP_RADIO_KEY, ctx)
  return ctx
}

/**
 * Call inside each panel component.
 * Returns reactive isOpen + toggle for a specific panelId.
 * Falls back to local state if no group provider exists (standalone usage).
 */
export function useRecapPanel(panelId: string): { isOpen: ComputedRef<boolean>; toggle: () => void } {
  const group = inject(RECAP_RADIO_KEY, null)

  if (group) {
    return {
      isOpen: computed(() => group.openPanelId.value === panelId),
      toggle: () => group.toggle(panelId),
    }
  }

  // Standalone fallback — no provider ancestor
  const localOpen = ref(false)
  return {
    isOpen: computed(() => localOpen.value),
    toggle: () => { localOpen.value = !localOpen.value },
  }
}
