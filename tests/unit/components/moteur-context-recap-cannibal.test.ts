import { describe, it, expect } from 'vitest'

// Extract the cannibalization logic from MoteurContextRecap for unit testing
function hasCannibalization(slug: string, capitainesMap: Record<string, string>): boolean {
  const cap = capitainesMap[slug]
  if (!cap) return false
  const capLower = cap.toLowerCase()
  return Object.entries(capitainesMap).some(
    ([s, c]) => s !== slug && c.toLowerCase() === capLower,
  )
}

describe('hasCannibalization — AC 6', () => {
  it('returns false when article has no capitaine', () => {
    expect(hasCannibalization('article-a', {})).toBe(false)
  })

  it('returns false when article is the only one with that capitaine', () => {
    expect(hasCannibalization('article-a', {
      'article-a': 'creation site web',
      'article-b': 'refonte site web',
    })).toBe(false)
  })

  it('returns true when two articles share the same capitaine', () => {
    const map = {
      'article-a': 'creation site web',
      'article-b': 'creation site web',
    }
    expect(hasCannibalization('article-a', map)).toBe(true)
    expect(hasCannibalization('article-b', map)).toBe(true)
  })

  it('is case-insensitive', () => {
    const map = {
      'article-a': 'Creation Site Web',
      'article-b': 'creation site web',
    }
    expect(hasCannibalization('article-a', map)).toBe(true)
  })

  it('returns false for non-matching articles when others do match', () => {
    const map = {
      'article-a': 'creation site web',
      'article-b': 'creation site web',
      'article-c': 'refonte site web',
    }
    expect(hasCannibalization('article-c', map)).toBe(false)
  })
})
