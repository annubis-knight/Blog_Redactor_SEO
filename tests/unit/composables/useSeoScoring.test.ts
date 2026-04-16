import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../../src/stores/editor.store'
import { useSeoStore } from '../../../src/stores/seo.store'
import type { Keyword, ArticleKeywords } from '../../../shared/types/index'

// Mock useStreaming used by editor store
vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: vi.fn(),
    abort: vi.fn(),
  })),
}))

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiGet: vi.fn(),
}))

describe('useSeoScoring', () => {
  const keywords: Keyword[] = [
    { keyword: 'seo', cocoonName: 'SEO', type: 'Pilier' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seo store recalculates when called directly', () => {
    const seoStore = useSeoStore()
    expect(seoStore.score).toBeNull()

    seoStore.recalculate(
      '<h1>SEO Guide</h1><p>Le seo est important.</p>',
      keywords,
      'Meta title SEO',
      'Description about seo',
    )

    expect(seoStore.score).not.toBeNull()
    expect(seoStore.score!.global).toBeGreaterThanOrEqual(0)
    // Without articleKeywords, no keyword densities are computed (no fallback)
    expect(seoStore.score!.keywordDensities).toHaveLength(0)
    expect(seoStore.score!.hasArticleKeywords).toBe(false)
  })

  it('seo store resets properly', () => {
    const seoStore = useSeoStore()
    seoStore.recalculate('<h1>T</h1><p>content</p>', keywords, null, null)
    expect(seoStore.score).not.toBeNull()

    seoStore.reset()
    expect(seoStore.score).toBeNull()
    expect(seoStore.isCalculating).toBe(false)
  })

  it('editor store content changes trigger isDirty', () => {
    const editorStore = useEditorStore()
    expect(editorStore.isDirty).toBe(false)

    editorStore.setContent('<p>new content</p>')
    expect(editorStore.isDirty).toBe(true)
    expect(editorStore.content).toBe('<p>new content</p>')
  })

  it('seo store recalculates with articleKeywords using capitaine', () => {
    const seoStore = useSeoStore()
    const articleKw: ArticleKeywords = {
      articleSlug: 'test',
      capitaine: 'design web',
      lieutenants: ['ux design'],
      lexique: ['interface', 'responsive'],
    }

    seoStore.recalculate(
      '<h1>Design web</h1><p>Le design web est important pour le ux design.</p>',
      keywords,
      'Meta title design web',
      'Description about design web',
      undefined,
      undefined,
      articleKw,
    )

    expect(seoStore.score).not.toBeNull()
    expect(seoStore.score!.global).toBeGreaterThanOrEqual(0)
    // Should use capitaine + lieutenants for density
    expect(seoStore.score!.keywordDensities.some(d => d.keyword === 'design web')).toBe(true)
    expect(seoStore.score!.keywordDensities.some(d => d.keyword === 'ux design')).toBe(true)
    // Should NOT have cocoon keywords
    expect(seoStore.score!.keywordDensities.some(d => d.keyword === 'seo')).toBe(false)
  })
})
