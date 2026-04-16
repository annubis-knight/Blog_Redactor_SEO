import { onBeforeUnmount, onMounted } from 'vue'

export interface KeyboardShortcut {
  /** Key combo, e.g. 'ctrl+s', 'escape' */
  keys: string
  action: (e: KeyboardEvent) => void
  /** If true, shortcut fires even when an input/textarea is focused. Default: false */
  global?: boolean
  /** If true (default), calls preventDefault on the event. Set to false to let the browser handle it too. */
  preventDefault?: boolean
}

function matchesCombo(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split('+')
  const requiresCtrl = parts.includes('ctrl') || parts.includes('meta')
  const requiresShift = parts.includes('shift')
  const requiresAlt = parts.includes('alt')
  const key = parts.filter(p => !['ctrl', 'meta', 'shift', 'alt'].includes(p))[0]

  if (requiresCtrl && !(e.ctrlKey || e.metaKey)) return false
  if (!requiresCtrl && (e.ctrlKey || e.metaKey)) return false
  if (requiresShift && !e.shiftKey) return false
  if (!requiresShift && e.shiftKey) return false
  if (requiresAlt && !e.altKey) return false
  if (!requiresAlt && e.altKey) return false

  return e.key.toLowerCase() === key
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((document.activeElement as HTMLElement)?.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  function handler(e: KeyboardEvent) {
    for (const shortcut of shortcuts) {
      if (!matchesCombo(e, shortcut.keys)) continue

      // Skip non-global shortcuts when input is focused
      if (!shortcut.global && isInputFocused()) continue

      if (shortcut.preventDefault !== false) e.preventDefault()
      shortcut.action(e)
      return
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handler)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handler)
  })

  return { handler }
}
