import { describe, it, expect } from 'vitest'
import { pickRadarCandidates, dedupeRadarKeywords, type RadarCardLike } from '../../../../scripts/auto-article/heuristics/pick-radar-candidates.js'

function card(keyword: string, total: number | null, kpis: unknown = {}): RadarCardLike {
  return { keyword, kpis, marketScore: total === null ? null : { total } }
}

describe('auto:pick-radar-candidates', () => {
  it('trie par marketScore décroissant', () => {
    const out = pickRadarCandidates([card('a', 10), card('b', 30), card('c', 20)], 'intermediaire')
    expect(out.map((c) => c.keyword)).toEqual(['b', 'c', 'a'])
  })

  it('exclut les cards sans KPI (kpis null)', () => {
    const out = pickRadarCandidates([card('a', 50, null), card('b', 20)], 'intermediaire')
    expect(out.map((c) => c.keyword)).toEqual(['b'])
  })

  it('exclut les cards sans score numérique', () => {
    const out = pickRadarCandidates([card('a', null), card('b', 15)], 'intermediaire')
    expect(out.map((c) => c.keyword)).toEqual(['b'])
  })

  it('plafonne à K selon le type (specifique = 5)', () => {
    const many = Array.from({ length: 12 }, (_, i) => card(`k${i}`, i))
    expect(pickRadarCandidates(many, 'specifique')).toHaveLength(5)
    expect(pickRadarCandidates(many, 'intermediaire')).toHaveLength(8)
    expect(pickRadarCandidates(many, 'pilier')).toHaveLength(12)
  })
})

describe('auto:dedupeRadarKeywords', () => {
  it('déduplique par mot-clé insensible à la casse, préserve l\'ordre', () => {
    const out = dedupeRadarKeywords([
      { keyword: 'SEO local', reasoning: 'pilier' },
      { keyword: 'seo local', reasoning: 'dup' },
      { keyword: 'avis', reasoning: 'x' },
    ])
    expect(out.map((k) => k.keyword)).toEqual(['SEO local', 'avis'])
  })

  it('ignore les mots-clés vides', () => {
    const out = dedupeRadarKeywords([{ keyword: '  ', reasoning: 'x' }, { keyword: 'a', reasoning: 'y' }])
    expect(out.map((k) => k.keyword)).toEqual(['a'])
  })
})
