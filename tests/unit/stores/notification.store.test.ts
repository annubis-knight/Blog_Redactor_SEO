import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '../../../src/stores/notification.store'

describe('notification.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('démarre avec zéro notification', () => {
    const store = useNotificationStore()
    expect(store.notifications).toHaveLength(0)
    expect(store.hasNotifications).toBe(false)
  })

  it('ajoute une notification success', () => {
    const store = useNotificationStore()
    store.success('OK')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].type).toBe('success')
    expect(store.notifications[0].message).toBe('OK')
  })

  it('ajoute une notification error avec durée plus longue', () => {
    const store = useNotificationStore()
    store.error('Fail')
    expect(store.notifications[0].duration).toBe(8000)
  })

  it('supprime une notification par id', () => {
    const store = useNotificationStore()
    const id = store.success('temp')
    expect(store.notifications).toHaveLength(1)
    store.remove(id)
    expect(store.notifications).toHaveLength(0)
  })

  it('auto-dismiss après la durée', () => {
    const store = useNotificationStore()
    store.success('temp', 100)
    expect(store.notifications).toHaveLength(1)
    vi.advanceTimersByTime(150)
    expect(store.notifications).toHaveLength(0)
  })

  it('limite à 5 notifications', () => {
    const store = useNotificationStore()
    for (let i = 0; i < 7; i++) {
      store.info(`msg-${i}`)
    }
    expect(store.notifications).toHaveLength(5)
    // The last 5 should be present
    expect(store.notifications[0].message).toBe('msg-2')
    expect(store.notifications[4].message).toBe('msg-6')
  })

  it('hasNotifications est réactif', () => {
    const store = useNotificationStore()
    expect(store.hasNotifications).toBe(false)
    store.info('hello')
    expect(store.hasNotifications).toBe(true)
    store.remove(store.notifications[0].id)
    expect(store.hasNotifications).toBe(false)
  })
})
