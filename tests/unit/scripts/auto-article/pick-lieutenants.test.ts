import { describe, it, expect } from 'vitest'
import { pickLieutenants } from '../../../../scripts/auto-article/heuristics/pick-lieutenants.js'
import type { RadarCandidate } from '../../../../scripts/auto-article/types.js'

const cand = (keyword: string, marketScore: number): RadarCandidate => ({ keyword, reasoning: '', marketScore })

describe('auto:pick-lieutenants', () => {
  const many = Array.from({ length: 10 }, (_, i) => cand(`k${i}`, i))

  it('exclut le Capitaine (insensible à la casse)', () => {
    const out = pickLieutenants([cand('SEO Local', 50), cand('avis', 40)], 'seo local', 'intermediaire')
    expect(out).not.toContain('SEO Local')
    expect(out).toContain('avis')
  })

  it('plafonne selon le niveau (specifique=3, intermediaire=5, pilier=8)', () => {
    expect(pickLieutenants(many, 'zzz', 'specifique')).toHaveLength(3)
    expect(pickLieutenants(many, 'zzz', 'intermediaire')).toHaveLength(5)
    expect(pickLieutenants(many, 'zzz', 'pilier')).toHaveLength(8)
  })

  it('trie par marketScore décroissant', () => {
    const out = pickLieutenants([cand('a', 10), cand('b', 30), cand('c', 20)], 'zzz', 'specifique')
    expect(out).toEqual(['b', 'c', 'a'])
  })
})
