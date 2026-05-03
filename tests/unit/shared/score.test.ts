/**
 * Tests pour shared/score/ — module unifié S3.1.
 *
 * **Règle de cohérence** (CLAUDE.md §2.0) : la même expression doit
 * produire l'affichage et le tri. Les `null` sont **toujours** en bas,
 * **toujours** ignorés dans les agrégats.
 */
import { describe, it, expect } from 'vitest'
import {
  formatScore,
  SCORE_PLACEHOLDER,
  compareScores,
  compareScoresAsc,
  averageScores,
  maxScore,
  minScore,
  countValidScores,
  type Score,
} from '../../../shared/score/index.js'

describe('shared/score:formatScore', () => {
  it('formats null as the placeholder "—"', () => {
    expect(formatScore(null)).toBe(SCORE_PLACEHOLDER)
    expect(formatScore(null)).toBe('—')
  })

  it('formats 0 as "0" (NOT as placeholder — 0 is a value, null is absence)', () => {
    expect(formatScore(0)).toBe('0')
  })

  it('rounds non-integer scores to nearest integer', () => {
    expect(formatScore(84.4)).toBe('84')
    expect(formatScore(84.5)).toBe('85')
    expect(formatScore(84.6)).toBe('85')
  })

  it('handles 100 as "100"', () => {
    expect(formatScore(100)).toBe('100')
  })

  // @ts-expect-error - undefined n'est pas dans le type Score, mais le runtime le gère
  it('treats undefined like null (defensive)', () => {
    expect(formatScore(undefined)).toBe(SCORE_PLACEHOLDER)
  })
})

describe('shared/score:compareScores (descending)', () => {
  it('places higher score first', () => {
    expect(compareScores(80, 50)).toBeLessThan(0)
    expect(compareScores(50, 80)).toBeGreaterThan(0)
  })

  it('returns 0 for equal scores', () => {
    expect(compareScores(50, 50)).toBe(0)
  })

  it('places null AFTER any number', () => {
    expect(compareScores(null, 50)).toBeGreaterThan(0) // null in last position
    expect(compareScores(50, null)).toBeLessThan(0) // 50 first
  })

  it('places null AFTER 0 (0 is a valid value, null is not)', () => {
    expect(compareScores(null, 0)).toBeGreaterThan(0)
    expect(compareScores(0, null)).toBeLessThan(0)
  })

  it('returns 0 when both are null', () => {
    expect(compareScores(null, null)).toBe(0)
  })

  it('keeps null at the bottom when sorting an array', () => {
    const scores: Score[] = [null, 80, null, 50, 100, null]
    const sorted = [...scores].sort(compareScores)
    expect(sorted).toEqual([100, 80, 50, null, null, null])
  })
})

describe('shared/score:compareScoresAsc (ascending)', () => {
  it('places smaller score first', () => {
    expect(compareScoresAsc(50, 80)).toBeLessThan(0)
    expect(compareScoresAsc(80, 50)).toBeGreaterThan(0)
  })

  it('places null AFTER numbers (even in ascending mode)', () => {
    // Convention CLAUDE.md §2.0 : null toujours en bas, peu importe le sens
    expect(compareScoresAsc(null, 50)).toBeGreaterThan(0)
    expect(compareScoresAsc(50, null)).toBeLessThan(0)
  })

  it('keeps null at the bottom when sorting ascendingly', () => {
    const scores: Score[] = [null, 80, 50, null, 100]
    const sorted = [...scores].sort(compareScoresAsc)
    expect(sorted).toEqual([50, 80, 100, null, null])
  })
})

describe('shared/score:averageScores', () => {
  it('returns null for empty array', () => {
    expect(averageScores([])).toBeNull()
  })

  it('returns null when all values are null', () => {
    expect(averageScores([null, null, null])).toBeNull()
  })

  it('IGNORES null values (does not treat as 0)', () => {
    // [80, null, 60] : moyenne sur 2 valeurs = 70, PAS sur 3 (= 46.67)
    expect(averageScores([80, null, 60])).toBe(70)
  })

  it('computes regular average when no nulls', () => {
    expect(averageScores([100, 50])).toBe(75)
    expect(averageScores([10, 20, 30])).toBe(20)
  })

  it('handles single non-null value', () => {
    expect(averageScores([null, 80, null])).toBe(80)
  })
})

describe('shared/score:maxScore / minScore', () => {
  it('maxScore ignores null values', () => {
    expect(maxScore([80, null, 100, null, 50])).toBe(100)
  })

  it('minScore ignores null values', () => {
    expect(minScore([80, null, 100, null, 50])).toBe(50)
  })

  it('returns null when no valid value', () => {
    expect(maxScore([null, null])).toBeNull()
    expect(minScore([])).toBeNull()
  })
})

describe('shared/score:countValidScores', () => {
  it('counts non-null entries only', () => {
    expect(countValidScores([80, null, 100, null, 0])).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(countValidScores([])).toBe(0)
  })

  it('returns 0 when all null', () => {
    expect(countValidScores([null, null])).toBe(0)
  })
})

describe('shared/score:cohérence affichage / tri (anti-régression CLAUDE.md §2.0)', () => {
  it('un score null s\'affiche "—" ET est trié en bas — même expression source', () => {
    // Scénario réel : 3 cards, l'une sans score
    const cards: { name: string; total: Score }[] = [
      { name: 'A', total: 80 },
      { name: 'B', total: null },
      { name: 'C', total: 50 },
    ]
    // Affichage : tous formatés via formatScore
    const display = cards.map((c) => `${c.name}: ${formatScore(c.total)}`)
    // Tri : via compareScores
    const sorted = [...cards].sort((a, b) => compareScores(a.total, b.total))

    // Card B s'affiche bien "—"
    expect(display.find((d) => d.startsWith('B'))).toBe('B: —')
    // Card B est trié EN BAS, jamais "comme un 0"
    expect(sorted[sorted.length - 1]!.name).toBe('B')
    expect(sorted.map((c) => c.name)).toEqual(['A', 'C', 'B'])
  })

  it('agrégat ne masque pas l\'absence : moyenne(80, null, 60) = 70, jamais 46.67', () => {
    expect(averageScores([80, null, 60])).toBe(70)
    // Anti-piège : si on faisait `null ?? 0` partout, la moyenne serait
    // (80+0+60)/3 = 46.67. averageScores ignore les null, donc la moyenne
    // est sur 2 valeurs : (80+60)/2 = 70.
    const buggyAvg = (80 + 0 + 60) / 3 // simulation d'un fallback ?? 0
    expect(buggyAvg).toBeCloseTo(46.67, 1)
    expect(averageScores([80, null, 60])).not.toBe(buggyAvg)
  })
})
