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

  it('trie par marketScore décroissant sans données SERP', () => {
    const out = pickLieutenants([cand('a', 10), cand('b', 30), cand('c', 20)], 'zzz', 'specifique')
    expect(out).toEqual(['b', 'c', 'a'])
  })
})

describe('auto:pick-lieutenants — ancrage SERP (audit défaut n°14)', () => {
  const candidates = [
    cand('tarif hébergement web', 10), // faible marché, mais traité par le SERP
    cand('serveur dédié infogéré', 90), // fort marché, absent du SERP
  ]
  const headings = [
    'Combien coûte un tarif hébergement web en 2026 ?',
    'Le tarif hébergement web selon les besoins',
  ]

  it('privilégie le candidat traité par les concurrents malgré un marché plus faible', () => {
    const out = pickLieutenants(candidates, 'zzz', 'specifique', { competitorHeadings: headings })
    expect(out[0]).toBe('tarif hébergement web')
  })

  it('retombe sur le marché seul quand le SERP est indisponible', () => {
    const out = pickLieutenants(candidates, 'zzz', 'specifique', { competitorHeadings: [] })
    expect(out[0]).toBe('serveur dédié infogéré')
  })

  it('une couverture SERP totale l\'emporte quel que soit l\'écart de marché', () => {
    // 0,6 × 1 = 0,6 > 0,4 × 1 : invariant de la pondération.
    const out = pickLieutenants(
      [cand('tarif hébergement web', 1), cand('serveur dédié infogéré', 100)],
      'zzz',
      'specifique',
      { competitorHeadings: headings },
    )
    expect(out[0]).toBe('tarif hébergement web')
  })

  it('respecte toujours le plafond par niveau', () => {
    const many = Array.from({ length: 10 }, (_, i) => cand(`kw${i}`, i))
    expect(pickLieutenants(many, 'zzz', 'intermediaire', { competitorHeadings: headings })).toHaveLength(5)
  })
})
