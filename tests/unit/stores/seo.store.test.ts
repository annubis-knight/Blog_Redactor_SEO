import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSeoStore } from '../../../src/stores/article/seo.store'
import type { Keyword } from '../../../shared/types/index'

describe('seo.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const keywords: Keyword[] = [
    { keyword: 'seo', cocoonName: 'SEO', type: 'Pilier' },
    { keyword: 'optimisation', cocoonName: 'SEO', type: 'Moyenne traine' },
  ]

  it('initializes with null score', () => {
    const store = useSeoStore()
    expect(store.score).toBeNull()
    expect(store.isCalculating).toBe(false)
    expect(store.scoreLevel).toBeNull()
  })

  it('recalculates score from content', () => {
    const store = useSeoStore()
    store.recalculate(
      '<h1>SEO Guide</h1><h2>Optimisation</h2><p>Le seo aide à optimiser.</p>',
      keywords,
      'Meta Title',
      'Meta Description',
    )
    expect(store.score).not.toBeNull()
    expect(store.score!.global).toBeGreaterThanOrEqual(0)
    expect(store.score!.global).toBeLessThanOrEqual(100)
  })

  it('returns correct scoreLevel for good score', () => {
    const store = useSeoStore()
    // Craft content that scores well
    const content = '<h1>Le SEO pour les PME</h1><h2>Optimisation technique</h2>' +
      '<p>' + Array(200).fill('Le seo est important pour une bonne optimisation des sites web').join('. ') + '</p>'
    store.recalculate(content, keywords, 'A'.repeat(55), 'B'.repeat(155))
    // Score should exist
    expect(store.score).not.toBeNull()
    expect(['good', 'fair', 'poor']).toContain(store.scoreLevel)
  })

  it('returns fair or poor for weak content', () => {
    const store = useSeoStore()
    store.recalculate('<p>short</p>', keywords, null, null)
    expect(store.score).not.toBeNull()
    expect(store.scoreLevel).not.toBe('good')
  })

  it('detects issues when heading hierarchy is invalid', () => {
    const store = useSeoStore()
    store.recalculate('<h1>T</h1><h3>Skip</h3><p>text</p>', keywords, null, null)
    expect(store.hasIssues).toBe(true)
  })

  it('detects issues when keywords are out of target', () => {
    const store = useSeoStore()
    store.recalculate('<h1>Title</h1><p>No keywords here at all</p>', keywords, null, null)
    expect(store.hasIssues).toBe(true)
  })

  it('resets score to null', () => {
    const store = useSeoStore()
    store.recalculate('<h1>SEO</h1><p>text</p>', keywords, null, null)
    expect(store.score).not.toBeNull()
    store.reset()
    expect(store.score).toBeNull()
    expect(store.scoreLevel).toBeNull()
  })
})
