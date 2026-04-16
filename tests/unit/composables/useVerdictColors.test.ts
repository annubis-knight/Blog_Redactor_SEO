import { describe, it, expect } from 'vitest'
import {
  VERDICT_COLORS,
  KPI_COLORS,
  VERDICT_CONFIG,
  getVerdictColor,
  getKpiColor,
} from '../../../src/composables/ui/useVerdictColors'

describe('useVerdictColors', () => {
  describe('VERDICT_COLORS', () => {
    it('maps GO to success color', () => {
      expect(VERDICT_COLORS['GO']).toContain('--color-success')
    })

    it('maps ORANGE to warning color', () => {
      expect(VERDICT_COLORS['ORANGE']).toContain('--color-warning')
    })

    it('maps NO-GO to error color', () => {
      expect(VERDICT_COLORS['NO-GO']).toContain('--color-error')
    })
  })

  describe('KPI_COLORS', () => {
    it('maps green to success', () => {
      expect(KPI_COLORS['green']).toContain('--color-success')
    })

    it('maps orange to warning', () => {
      expect(KPI_COLORS['orange']).toContain('--color-warning')
    })

    it('maps red to error', () => {
      expect(KPI_COLORS['red']).toContain('--color-error')
    })

    it('maps neutral to text-muted', () => {
      expect(KPI_COLORS['neutral']).toContain('--color-text-muted')
    })

    it('maps bonus to success', () => {
      expect(KPI_COLORS['bonus']).toContain('--color-success')
    })
  })

  describe('VERDICT_CONFIG', () => {
    it('provides icon, color and bg for each verdict', () => {
      for (const key of ['GO', 'ORANGE', 'NO-GO'] as const) {
        const cfg = VERDICT_CONFIG[key]
        expect(cfg).toHaveProperty('icon')
        expect(cfg).toHaveProperty('color')
        expect(cfg).toHaveProperty('bg')
        expect(cfg.color).toBe(VERDICT_COLORS[key])
      }
    })
  })

  describe('getVerdictColor', () => {
    it('returns color for known verdict', () => {
      expect(getVerdictColor('GO')).toBe(VERDICT_COLORS['GO'])
    })

    it('falls back to ORANGE for unknown verdict', () => {
      expect(getVerdictColor('UNKNOWN')).toBe(VERDICT_COLORS['ORANGE'])
    })
  })

  describe('getKpiColor', () => {
    it('returns color for known KPI color', () => {
      expect(getKpiColor('green')).toBe(KPI_COLORS['green'])
    })

    it('returns inherit for unknown color', () => {
      expect(getKpiColor('unknown')).toBe('inherit')
    })
  })
})
