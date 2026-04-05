import { describe, it, expect } from 'vitest'
import {
  getThresholds,
  scoreKpi,
  computeVerdict,
  computeIntentScore,
} from '../../../server/services/keyword-validate.service'
import type { KpiResult, ThresholdConfig } from '../../../shared/types/keyword-validate.types'

// Helper to build a full set of 6 KPIs quickly
function buildKpis(overrides: Partial<Record<string, KpiResult>>): KpiResult[] {
  const defaults: KpiResult[] = [
    { name: 'volume', rawValue: 2000, color: 'green', label: '', thresholds: { green: 1000, orange: 200 } },
    { name: 'kd', rawValue: 20, color: 'green', label: '', thresholds: { green: 40, orange: 65 } },
    { name: 'cpc', rawValue: 3, color: 'bonus', label: '', thresholds: { green: 2 } },
    { name: 'paa', rawValue: 3.5, color: 'green', label: '', thresholds: { green: 3.0, orange: 1.0 } },
    { name: 'intent', rawValue: 0.85, color: 'green', label: '', thresholds: { green: 0.7, orange: 0.4 } },
    { name: 'autocomplete', rawValue: 2, color: 'green', label: '', thresholds: { green: 3, orange: 6 } },
  ]
  return defaults.map(k => overrides[k.name] ?? k)
}

// --- Task 4: Tests du service de scoring ---

describe('keyword-validate.service', () => {
  describe('getThresholds', () => {
    it('returns thresholds for pilier', () => {
      const t = getThresholds('pilier')
      expect(t.volume.green).toBe(1000)
      expect(t.kd.green).toBe(40)
      expect(t.cpc.bonus).toBe(2)
    })

    it('returns thresholds for intermediaire', () => {
      const t = getThresholds('intermediaire')
      expect(t.volume.green).toBe(200)
      expect(t.kd.green).toBe(30)
    })

    it('returns thresholds for specifique', () => {
      const t = getThresholds('specifique')
      expect(t.volume.green).toBe(30)
      expect(t.kd.green).toBe(20)
    })
  })

  // --- AC #2: Seuils Pilier ---
  describe('scoreKpi — Pilier thresholds', () => {
    const config = getThresholds('pilier')

    it('volume >1000 = green', () => {
      const r = scoreKpi('volume', 1500, config)
      expect(r.color).toBe('green')
    })

    it('volume =1000 = green (boundary)', () => {
      const r = scoreKpi('volume', 1000, config)
      expect(r.color).toBe('green')
    })

    it('volume 500 = orange', () => {
      const r = scoreKpi('volume', 500, config)
      expect(r.color).toBe('orange')
    })

    it('volume 100 = red', () => {
      const r = scoreKpi('volume', 100, config)
      expect(r.color).toBe('red')
    })

    it('KD <40 = green', () => {
      const r = scoreKpi('kd', 30, config)
      expect(r.color).toBe('green')
    })

    it('KD =40 = green (boundary)', () => {
      const r = scoreKpi('kd', 40, config)
      expect(r.color).toBe('green')
    })

    it('KD 50 = orange', () => {
      const r = scoreKpi('kd', 50, config)
      expect(r.color).toBe('orange')
    })

    it('KD 70 = red', () => {
      const r = scoreKpi('kd', 70, config)
      expect(r.color).toBe('red')
    })

    it('CPC >2€ = bonus', () => {
      const r = scoreKpi('cpc', 3.2, config)
      expect(r.color).toBe('bonus')
    })
  })

  // --- AC #3: Seuils Spécifique ---
  describe('scoreKpi — Spécifique thresholds', () => {
    const config = getThresholds('specifique')

    it('volume >30 = green', () => {
      const r = scoreKpi('volume', 50, config)
      expect(r.color).toBe('green')
    })

    it('volume 10 = orange', () => {
      const r = scoreKpi('volume', 10, config)
      expect(r.color).toBe('orange')
    })

    it('volume 3 = red', () => {
      const r = scoreKpi('volume', 3, config)
      expect(r.color).toBe('red')
    })

    it('KD <20 = green', () => {
      const r = scoreKpi('kd', 15, config)
      expect(r.color).toBe('green')
    })

    it('KD 30 = orange', () => {
      const r = scoreKpi('kd', 30, config)
      expect(r.color).toBe('orange')
    })

    it('KD 50 = red', () => {
      const r = scoreKpi('kd', 50, config)
      expect(r.color).toBe('red')
    })
  })

  // --- AC #4: Seuils Intermédiaire ---
  describe('scoreKpi — Intermédiaire thresholds', () => {
    const config = getThresholds('intermediaire')

    it('volume >200 = green', () => {
      const r = scoreKpi('volume', 300, config)
      expect(r.color).toBe('green')
    })

    it('volume 100 = orange', () => {
      const r = scoreKpi('volume', 100, config)
      expect(r.color).toBe('orange')
    })

    it('volume 20 = red', () => {
      const r = scoreKpi('volume', 20, config)
      expect(r.color).toBe('red')
    })

    it('KD <30 = green', () => {
      const r = scoreKpi('kd', 25, config)
      expect(r.color).toBe('green')
    })

    it('KD 40 = orange', () => {
      const r = scoreKpi('kd', 40, config)
      expect(r.color).toBe('orange')
    })

    it('KD 55 = red', () => {
      const r = scoreKpi('kd', 55, config)
      expect(r.color).toBe('red')
    })
  })

  // --- AC #5: NO-GO automatique ---
  describe('computeVerdict — auto NO-GO', () => {
    it('returns NO-GO with reason when volume=0 AND paa=0 AND autocomplete=0', () => {
      const kpis = buildKpis({
        volume: { name: 'volume', rawValue: 0, color: 'red', label: '', thresholds: { green: 1000 } },
        paa: { name: 'paa', rawValue: 0, color: 'red', label: '', thresholds: { green: 3 } },
        autocomplete: { name: 'autocomplete', rawValue: 0, color: 'red', label: '', thresholds: { green: 3 } },
      })

      const v = computeVerdict(kpis)
      expect(v.level).toBe('NO-GO')
      expect(v.autoNoGo).toBe(true)
      expect(v.reason).toBe('Aucun signal détecté')
    })

    it('does NOT auto NO-GO when volume=0 but paa>0', () => {
      const kpis = buildKpis({
        volume: { name: 'volume', rawValue: 0, color: 'red', label: '', thresholds: { green: 1000 } },
        paa: { name: 'paa', rawValue: 2, color: 'orange', label: '', thresholds: { green: 3 } },
        autocomplete: { name: 'autocomplete', rawValue: 0, color: 'red', label: '', thresholds: { green: 3 } },
      })

      const v = computeVerdict(kpis)
      expect(v.autoNoGo).toBe(false)
    })
  })

  // --- AC #6: CPC asymétrique ---
  describe('scoreKpi — CPC asymétrique', () => {
    const config = getThresholds('pilier')

    it('CPC 3.2€ = bonus (AC #6)', () => {
      const r = scoreKpi('cpc', 3.2, config)
      expect(r.color).toBe('bonus')
    })

    it('CPC 0.5€ = neutral (AC #5)', () => {
      const r = scoreKpi('cpc', 0.5, config)
      expect(r.color).toBe('neutral')
    })

    it('CPC 2.0€ = neutral (boundary — not strictly greater)', () => {
      const r = scoreKpi('cpc', 2.0, config)
      expect(r.color).toBe('neutral')
    })

    it('CPC is NEVER red', () => {
      const r = scoreKpi('cpc', 0, config)
      expect(r.color).not.toBe('red')
      expect(r.color).toBe('neutral')
    })
  })

  // --- AC #7: Verdict GO ---
  describe('computeVerdict — GO', () => {
    it('GO when ≥4/6 verts, no red Volume/KD, PAA non-rouge', () => {
      // All 6 green/bonus
      const kpis = buildKpis({})
      const v = computeVerdict(kpis)
      expect(v.level).toBe('GO')
      expect(v.greenCount).toBe(6)
      expect(v.totalKpis).toBe(6)
    })

    it('GO with exactly 4 greens (bonus counts)', () => {
      const kpis = buildKpis({
        intent: { name: 'intent', rawValue: 0.5, color: 'orange', label: '', thresholds: { green: 1 } },
        autocomplete: { name: 'autocomplete', rawValue: 7, color: 'orange', label: '', thresholds: { green: 3 } },
      })
      const v = computeVerdict(kpis)
      expect(v.level).toBe('GO')
      expect(v.greenCount).toBe(4)
    })
  })

  // --- AC #8: Verdict ORANGE ---
  describe('computeVerdict — ORANGE', () => {
    it('ORANGE with 3 greens (below threshold)', () => {
      const kpis = buildKpis({
        volume: { name: 'volume', rawValue: 500, color: 'orange', label: '', thresholds: { green: 1000 } },
        intent: { name: 'intent', rawValue: 0.5, color: 'orange', label: '', thresholds: { green: 1 } },
        autocomplete: { name: 'autocomplete', rawValue: 7, color: 'orange', label: '', thresholds: { green: 3 } },
      })
      const v = computeVerdict(kpis)
      expect(v.level).toBe('ORANGE')
      expect(v.greenCount).toBe(3)
    })

    it('ORANGE when enough greens but volume red (non-critical alone)', () => {
      // Volume red alone doesn't trigger NO-GO (needs KD red too)
      const kpis = buildKpis({
        volume: { name: 'volume', rawValue: 50, color: 'red', label: '', thresholds: { green: 1000 } },
      })
      const v = computeVerdict(kpis)
      // 5 greens but volume is red — GO requires no red on Volume
      expect(v.level).toBe('ORANGE')
    })
  })

  // --- AC #9: Verdict NO-GO ---
  describe('computeVerdict — NO-GO', () => {
    it('NO-GO when red Volume AND KD', () => {
      const kpis = buildKpis({
        volume: { name: 'volume', rawValue: 10, color: 'red', label: '', thresholds: { green: 1000 } },
        kd: { name: 'kd', rawValue: 80, color: 'red', label: '', thresholds: { green: 40 } },
      })
      const v = computeVerdict(kpis)
      expect(v.level).toBe('NO-GO')
      expect(v.autoNoGo).toBe(false)
    })

    it('NO-GO when red PAA + red Volume', () => {
      const kpis = buildKpis({
        volume: { name: 'volume', rawValue: 10, color: 'red', label: '', thresholds: { green: 1000 } },
        paa: { name: 'paa', rawValue: 0, color: 'red', label: '', thresholds: { green: 3 } },
      })
      const v = computeVerdict(kpis)
      expect(v.level).toBe('NO-GO')
    })
  })

  // --- Scoring individual KPIs ---
  describe('scoreKpi — PAA (weighted score)', () => {
    const config = getThresholds('pilier')

    it('PAA weighted ≥3.0 = green (pilier)', () => {
      expect(scoreKpi('paa', 3.5, config).color).toBe('green')
    })

    it('PAA weighted 3.0 = green (boundary)', () => {
      expect(scoreKpi('paa', 3.0, config).color).toBe('green')
    })

    it('PAA weighted 1.5 = orange (pilier)', () => {
      expect(scoreKpi('paa', 1.5, config).color).toBe('orange')
    })

    it('PAA weighted 0.5 = red (pilier, <1.0)', () => {
      expect(scoreKpi('paa', 0.5, config).color).toBe('red')
    })

    it('PAA weighted 0 = red (pilier)', () => {
      expect(scoreKpi('paa', 0, config).color).toBe('red')
    })

    it('PAA label shows weighted format', () => {
      expect(scoreKpi('paa', 3.5, config).label).toBe('3.5 pts')
    })

    it('PAA weighted specifique: 0 = red (orange threshold 0.25)', () => {
      const specConfig = getThresholds('specifique')
      expect(scoreKpi('paa', 0, specConfig).color).toBe('red')
    })

    it('PAA weighted specifique: 0.25 = orange (boundary)', () => {
      const specConfig = getThresholds('specifique')
      expect(scoreKpi('paa', 0.25, specConfig).color).toBe('orange')
    })

    it('PAA weighted intermediaire: 2.0 = green (boundary)', () => {
      const interConfig = getThresholds('intermediaire')
      expect(scoreKpi('paa', 2.0, interConfig).color).toBe('green')
    })

    it('PAA weighted intermediaire: 0.5 = orange (boundary)', () => {
      const interConfig = getThresholds('intermediaire')
      expect(scoreKpi('paa', 0.5, interConfig).color).toBe('orange')
    })
  })

  describe('scoreKpi — Intent (continuous thresholds)', () => {
    const config = getThresholds('pilier')

    it('intent >= 0.7 = green', () => {
      expect(scoreKpi('intent', 0.85, config).color).toBe('green')
    })

    it('intent = 0.7 = green (boundary)', () => {
      expect(scoreKpi('intent', 0.7, config).color).toBe('green')
    })

    it('intent 0.5 = orange (>= 0.4)', () => {
      expect(scoreKpi('intent', 0.5, config).color).toBe('orange')
    })

    it('intent 0.4 = orange (boundary)', () => {
      expect(scoreKpi('intent', 0.4, config).color).toBe('orange')
    })

    it('intent 0.3 = red (< 0.4)', () => {
      expect(scoreKpi('intent', 0.3, config).color).toBe('red')
    })

    it('intent 0 = red', () => {
      expect(scoreKpi('intent', 0, config).color).toBe('red')
    })

    it('intent label shows rounded score', () => {
      expect(scoreKpi('intent', 0.85, config).label).toBe('0.85')
    })

    it('intent thresholds match config', () => {
      const r = scoreKpi('intent', 0.5, config)
      expect(r.thresholds).toEqual({ green: 0.7, orange: 0.4 })
    })
  })

  describe('computeIntentScore', () => {
    it('informational + pilier = 0.7 * probability', () => {
      expect(computeIntentScore('informational', 1.0, 'pilier')).toBeCloseTo(0.7)
    })

    it('informational + specifique = 1.0 * probability', () => {
      expect(computeIntentScore('informational', 0.85, 'specifique')).toBeCloseTo(0.85)
    })

    it('commercial + pilier = 1.0 * probability', () => {
      expect(computeIntentScore('commercial', 0.9, 'pilier')).toBeCloseTo(0.9)
    })

    it('commercial + specifique = 0.5 * probability', () => {
      expect(computeIntentScore('commercial', 1.0, 'specifique')).toBeCloseTo(0.5)
    })

    it('transactional + pilier = 0.3 * probability', () => {
      expect(computeIntentScore('transactional', 1.0, 'pilier')).toBeCloseTo(0.3)
    })

    it('transactional + intermediaire = 0.7 * probability', () => {
      expect(computeIntentScore('transactional', 0.8, 'intermediaire')).toBeCloseTo(0.56)
    })

    it('navigational = 0.2 for all levels', () => {
      expect(computeIntentScore('navigational', 1.0, 'pilier')).toBeCloseTo(0.2)
      expect(computeIntentScore('navigational', 1.0, 'intermediaire')).toBeCloseTo(0.2)
      expect(computeIntentScore('navigational', 1.0, 'specifique')).toBeCloseTo(0.2)
    })

    it('unknown intent falls back to 0.5', () => {
      expect(computeIntentScore('unknown_intent', 1.0, 'pilier')).toBe(0.5)
    })

    it('probability scales the score', () => {
      expect(computeIntentScore('informational', 0.5, 'specifique')).toBeCloseTo(0.5)
    })
  })

  describe('scoreKpi — Autocomplete', () => {
    const config = getThresholds('pilier')

    it('position 2 = green (pilier, threshold 3)', () => {
      expect(scoreKpi('autocomplete', 2, config).color).toBe('green')
    })

    it('position 5 = orange (pilier, threshold 6)', () => {
      expect(scoreKpi('autocomplete', 5, config).color).toBe('orange')
    })

    it('position 0 (not found) = red', () => {
      expect(scoreKpi('autocomplete', 0, config).color).toBe('red')
    })

    it('position 8 = red (beyond orange threshold)', () => {
      expect(scoreKpi('autocomplete', 8, config).color).toBe('red')
    })
  })

  describe('scoreKpi — labels', () => {
    const config = getThresholds('pilier')

    it('volume label includes formatted number', () => {
      const r = scoreKpi('volume', 1500, config)
      expect(r.label).toContain('rech/m')
    })

    it('cpc label includes € symbol', () => {
      const r = scoreKpi('cpc', 2.5, config)
      expect(r.label).toContain('€')
    })

    it('autocomplete label shows position', () => {
      const r = scoreKpi('autocomplete', 3, config)
      expect(r.label).toBe('Position 3')
    })

    it('autocomplete label shows "Non trouvé" when 0', () => {
      const r = scoreKpi('autocomplete', 0, config)
      expect(r.label).toBe('Non trouvé')
    })
  })
})
