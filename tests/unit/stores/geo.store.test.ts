import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGeoStore } from '../../../src/stores/geo.store'

describe('geo.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with null score', () => {
    const store = useGeoStore()
    expect(store.score).toBeNull()
    expect(store.isCalculating).toBe(false)
    expect(store.scoreLevel).toBeNull()
  })

  it('recalculates score from content', () => {
    const store = useGeoStore()
    store.recalculate('<h2>Comment optimiser?</h2><p>Le SEO améliore la visibilité.</p>')
    expect(store.score).not.toBeNull()
    expect(store.score!.global).toBeGreaterThanOrEqual(0)
    expect(store.score!.global).toBeLessThanOrEqual(100)
  })

  it('returns scoreLevel', () => {
    const store = useGeoStore()
    store.recalculate('<h2>Question?</h2><p>Short answer.</p>')
    expect(store.score).not.toBeNull()
    expect(['good', 'fair', 'poor']).toContain(store.scoreLevel)
  })

  it('detects issues when no question headings', () => {
    const store = useGeoStore()
    store.recalculate('<h2>Statement heading</h2><p>Content</p>')
    expect(store.hasIssues).toBe(true)
  })

  it('resets score to null', () => {
    const store = useGeoStore()
    store.recalculate('<h2>Test</h2><p>text</p>')
    expect(store.score).not.toBeNull()
    store.reset()
    expect(store.score).toBeNull()
    expect(store.scoreLevel).toBeNull()
  })
})
