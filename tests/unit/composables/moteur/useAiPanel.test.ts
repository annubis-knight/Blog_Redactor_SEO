import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, nextTick } from 'vue'
import { useAiPanel } from '@/composables/moteur/useAiPanel'

vi.mock('@/composables/editor/useStreaming', () => {
  return {
    useStreaming: <T,>() => {
      const isStreaming = ref(false)
      const error = ref<string | null>(null)
      const result = ref<T | null>(null)
      let aborted = false
      const abort = vi.fn(() => {
        aborted = true
        isStreaming.value = false
      })
      const startStream = vi.fn(async (_url: string, _body: unknown, cbs?: { onDone?: (d: T) => void, onError?: (m: string) => void }) => {
        aborted = false
        isStreaming.value = true
        // Wait long enough for tests to observe the 'streaming' state.
        await new Promise<void>(r => setTimeout(r, 5))
        if (aborted) {
          isStreaming.value = false
          return
        }
        const payload = { ok: true } as unknown as T
        result.value = payload
        cbs?.onDone?.(payload)
        isStreaming.value = false
      })
      return { isStreaming, error, result, abort, startStream }
    },
  }
})

interface DummyResult { ok: boolean }

describe('useAiPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts in idle state', () => {
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
    })
    expect(panel.state.value).toBe('idle')
    expect(panel.result.value).toBeNull()
    expect(panel.error.value).toBeNull()
    expect(panel.isStale.value).toBe(false)
  })

  it('moves to streaming → success on trigger', async () => {
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
    })
    const promise = panel.trigger()
    // Microtask flush: isStreaming is set synchronously inside the awaited fn.
    await Promise.resolve()
    await nextTick()
    expect(panel.state.value).toBe('streaming')
    await promise
    expect(panel.state.value).toBe('success')
    expect(panel.result.value).toEqual({ ok: true })
  })

  it('exposes state="error" if streaming layer reports error', async () => {
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
    })
    panel._setErrorForTest('boom')
    await nextTick()
    expect(panel.state.value).toBe('error')
    expect(panel.error.value).toBe('boom')
  })

  it('reset() returns to idle and clears result/error', async () => {
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
    })
    await panel.trigger()
    expect(panel.state.value).toBe('success')
    panel.reset()
    expect(panel.state.value).toBe('idle')
    expect(panel.result.value).toBeNull()
    expect(panel.error.value).toBeNull()
  })

  it('isStale becomes true after ttlMs elapsed since last success', async () => {
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
      ttlMs: 1000,
    })
    const realNow = Date.now
    let fakeNow = realNow()
    Date.now = () => fakeNow
    try {
      await panel.trigger()
      expect(panel.isStale.value).toBe(false)
      fakeNow += 1500
      // Force re-eval by reading after time advance.
      expect(panel.isStale.value).toBe(true)
    } finally {
      Date.now = realNow
    }
  })

  it('abort() cancels the underlying stream and returns to idle', async () => {
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
    })
    const promise = panel.trigger()
    await Promise.resolve()
    await nextTick()
    panel.abort()
    await promise
    expect(panel.state.value).toBe('idle')
    expect(panel.result.value).toBeNull()
  })

  it('uses custom parser when provided', async () => {
    const parser = vi.fn((raw: unknown) => ({ ok: !!raw }))
    const panel = useAiPanel<DummyResult>({
      endpoint: '/api/test',
      payload: () => ({ k: 'v' }),
      parser,
    })
    await panel.trigger()
    expect(parser).toHaveBeenCalled()
    expect(panel.result.value).toEqual({ ok: true })
  })
})
