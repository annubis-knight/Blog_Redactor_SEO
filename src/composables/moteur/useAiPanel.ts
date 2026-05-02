import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useStreaming } from '@/composables/editor/useStreaming'

/**
 * État unifié des Panels IA du Moteur.
 *
 *   idle      → pas encore lancé
 *   streaming → en cours d'appel/streaming
 *   success   → résultat reçu et valide
 *   error     → la couche streaming a remonté une erreur
 */
export type AiPanelState = 'idle' | 'streaming' | 'success' | 'error'

export interface UseAiPanelOptions<T> {
  /** URL relative de l'endpoint IA (ex: '/keywords/abc/ai-panel'). */
  endpoint: string
  /** Payload POST envoyé à chaque trigger — calculé au moment du clic. */
  payload: () => unknown
  /** TTL avant que `isStale` ne devienne true (millisecondes). 0 = jamais stale. */
  ttlMs?: number
  /**
   * Parser optionnel pour transformer la réponse brute en T. Si absent, on
   * garde le payload tel que renvoyé par useStreaming.
   */
  parser?: (raw: unknown) => T
}

export interface UseAiPanelReturn<T> {
  state: ComputedRef<AiPanelState>
  result: Ref<T | null>
  error: Ref<string | null>
  /**
   * Getter (lecture-seule) qui calcule la fraîcheur à la demande.
   * Pas un `computed` — la dépendance réactive serait vide (`Date.now()` n'est
   * pas observable) et la valeur ne changerait jamais après le premier accès.
   */
  isStale: { readonly value: boolean }
  trigger: () => Promise<void>
  abort: () => void
  reset: () => void
  /** @internal — exposé uniquement pour tests. */
  _setErrorForTest: (msg: string) => void
}

/**
 * Plomberie commune des Panels IA du workflow Moteur.
 *
 * Wrappe `useStreaming` avec :
 *   - une machine à états (idle/streaming/success/error)
 *   - un timestamp de fraîcheur (isStale)
 *   - un parser optionnel
 *
 * Les composables métier (useCapitaineValidation, useLexiqueIa, etc.) délèguent
 * la plomberie à ce hook et exposent au-dessus leurs méthodes spécifiques
 * (handoff, sélection, etc.).
 */
export function useAiPanel<T>(opts: UseAiPanelOptions<T>): UseAiPanelReturn<T> {
  const { isStreaming, error: streamError, result: streamResult, abort: streamAbort, startStream } = useStreaming<T>()

  const result = ref<T | null>(null) as Ref<T | null>
  const error = ref<string | null>(null)
  const lastSuccessAt = ref<number | null>(null)

  // Synchronise l'erreur côté streaming → état local.
  watch(streamError, (val) => {
    if (val) error.value = val
  })

  const state = computed<AiPanelState>(() => {
    if (error.value) return 'error'
    if (isStreaming.value) return 'streaming'
    if (result.value !== null) return 'success'
    return 'idle'
  })

  // Pas un `computed` : la fraîcheur dépend de `Date.now()` qui n'est pas
  // observable. On expose un getter lazy — recalculé à chaque lecture.
  const isStale: { readonly value: boolean } = {
    get value() {
      if (!opts.ttlMs || opts.ttlMs <= 0) return false
      if (lastSuccessAt.value === null) return false
      return Date.now() - lastSuccessAt.value > opts.ttlMs
    },
  }

  async function trigger() {
    error.value = null
    result.value = null
    await startStream(opts.endpoint, opts.payload(), {
      onDone: (data) => {
        const parsed = opts.parser ? opts.parser(data) : (data as T)
        result.value = parsed
        lastSuccessAt.value = Date.now()
      },
      onError: (msg) => {
        error.value = msg
      },
    })
    // Si useStreaming a écrit un résultat sans onDone (rare), on le récupère.
    if (result.value === null && streamResult.value !== null && !error.value) {
      const parsed = opts.parser ? opts.parser(streamResult.value) : (streamResult.value as T)
      result.value = parsed
      lastSuccessAt.value = Date.now()
    }
  }

  function abort() {
    streamAbort()
    error.value = null
    result.value = null
  }

  function reset() {
    error.value = null
    result.value = null
    lastSuccessAt.value = null
  }

  function _setErrorForTest(msg: string) {
    error.value = msg
  }

  return { state, result, error, isStale, trigger, abort, reset, _setErrorForTest }
}
