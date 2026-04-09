import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotify } from '../../../src/composables/useNotify'

describe('useNotify', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('expose les méthodes success/error/warning/info', () => {
    const { success, error, warning, info } = useNotify()
    expect(typeof success).toBe('function')
    expect(typeof error).toBe('function')
    expect(typeof warning).toBe('function')
    expect(typeof info).toBe('function')
  })

  it('appelle le store quand on utilise success()', () => {
    const { success } = useNotify()
    const id = success('Test notification')
    expect(typeof id).toBe('string')
  })
})
