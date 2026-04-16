import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMoteurBasketStore } from '@/stores/moteur-basket.store'

describe('useMoteurBasketStore', () => {
  let store: ReturnType<typeof useMoteurBasketStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMoteurBasketStore()
  })

  it('initializes with empty keywords', () => {
    expect(store.keywords).toEqual([])
    expect(store.isEmpty).toBe(true)
    expect(store.count).toBe(0)
    expect(store.bestKeyword).toBeNull()
  })

  it('addKeywords adds unique keywords', () => {
    store.addKeywords([
      { keyword: 'erp cloud', reasoning: 'test' },
      { keyword: 'logiciel gestion', reasoning: 'test2' },
    ], 'discovery')

    expect(store.count).toBe(2)
    expect(store.keywordStrings).toEqual(['erp cloud', 'logiciel gestion'])
    expect(store.isEmpty).toBe(false)
  })

  it('addKeywords deduplicates by lowercase', () => {
    store.addKeywords([{ keyword: 'ERP Cloud' }], 'discovery')
    store.addKeywords([{ keyword: 'erp cloud' }], 'radar')
    store.addKeywords([{ keyword: 'Erp CLOUD' }], 'pain-translator')

    expect(store.count).toBe(1)
    expect(store.keywords[0].keyword).toBe('ERP Cloud') // keeps first
  })

  it('removeKeyword removes by case-insensitive match', () => {
    store.addKeywords([
      { keyword: 'erp cloud' },
      { keyword: 'logiciel gestion' },
    ], 'discovery')

    store.removeKeyword('ERP Cloud')
    expect(store.count).toBe(1)
    expect(store.keywordStrings).toEqual(['logiciel gestion'])
  })

  it('setArticle clears keywords when slug changes', () => {
    store.setArticle(1)
    store.addKeywords([{ keyword: 'erp cloud' }], 'discovery')

    expect(store.count).toBe(1)
    expect(store.articleId).toBe(1)

    store.setArticle(2)
    expect(store.count).toBe(0)
    expect(store.articleId).toBe(2)
  })

  it('setArticle does not clear when same slug is set again', () => {
    store.setArticle(1)
    store.addKeywords([{ keyword: 'erp cloud' }], 'discovery')
    expect(store.count).toBe(1)

    store.setArticle(1) // same id
    expect(store.count).toBe(1) // still there
  })

  it('bestKeyword returns validated keyword first', () => {
    store.addKeywords([
      { keyword: 'low score' },
      { keyword: 'high score' },
    ], 'discovery')

    store.markValidated('low score', 30)
    store.markValidated('high score', 90)

    // bestKeyword prefers validated + highest score
    expect(store.bestKeyword?.keyword).toBe('high score')
  })

  it('bestKeyword returns highest-score keyword when none validated', () => {
    store.addKeywords([
      { keyword: 'kw1' },
      { keyword: 'kw2' },
    ], 'discovery')

    // No validation, no score → returns first
    expect(store.bestKeyword?.keyword).toBe('kw1')
  })

  it('markValidated sets validated flag and optional score', () => {
    store.addKeywords([{ keyword: 'erp cloud' }], 'discovery')
    store.markValidated('erp cloud', 85)

    expect(store.keywords[0].validated).toBe(true)
    expect(store.keywords[0].score).toBe(85)
    expect(store.validatedKeywords).toHaveLength(1)
  })

  it('markValidated is case-insensitive', () => {
    store.addKeywords([{ keyword: 'ERP Cloud' }], 'discovery')
    store.markValidated('erp cloud', 75)

    expect(store.keywords[0].validated).toBe(true)
  })

  it('clear empties keywords but keeps articleId', () => {
    store.setArticle(1)
    store.addKeywords([{ keyword: 'erp cloud' }], 'discovery')

    store.clear()
    expect(store.count).toBe(0)
    expect(store.articleId).toBe(1)
  })

  it('$reset empties everything', () => {
    store.setArticle(1)
    store.addKeywords([{ keyword: 'erp cloud' }], 'discovery')

    store.$reset()
    expect(store.count).toBe(0)
    expect(store.articleId).toBeNull()
  })
})
