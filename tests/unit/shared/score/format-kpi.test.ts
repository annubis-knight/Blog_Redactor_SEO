/**
 * Tests Red — helpers de formatage KPI marché (FR-INFRA-KPI-DISPLAY-DASH).
 *
 * Cible : `shared/score/format.ts` — fonctions formatVolume, formatCpc,
 * formatKd, formatPercent. Doivent être ajoutées (n'existent pas encore →
 * ces tests échouent avant implémentation, c'est voulu).
 *
 * Voir _bmad-output/planning-artifacts/prd.md §FR-INFRA-KPI-DISPLAY-DASH.
 */
import { describe, it, expect } from 'vitest'
import {
  formatVolume,
  formatCpc,
  formatKd,
  formatPercent,
  SCORE_PLACEHOLDER,
} from '../../../../shared/score/index.js'

describe('FR-INFRA-KPI-DISPLAY-DASH — formatVolume', () => {
  it('AC1.a — formatVolume(null) retourne le placeholder "—"', () => {
    expect(formatVolume(null)).toBe(SCORE_PLACEHOLDER)
    expect(formatVolume(null)).toBe('—')
  })

  it('AC1.b — formatVolume(undefined) retourne "—" (jamais "0" ni "")', () => {
    expect(formatVolume(undefined)).toBe('—')
  })

  it('AC1.c — formatVolume(0) retourne "0" (0 est une vraie valeur, pas une absence)', () => {
    expect(formatVolume(0)).toBe('0')
  })

  it('AC1.d — formatVolume(124) retourne "124" (entier sans suffixe)', () => {
    expect(formatVolume(124)).toBe('124')
  })

  it('AC1.e — formatVolume(1234) retourne "1.2k" (suffixe k au-dessus de 1000)', () => {
    expect(formatVolume(1234)).toBe('1.2k')
  })

  it('AC1.f — formatVolume(12345) retourne "12.3k"', () => {
    expect(formatVolume(12345)).toBe('12.3k')
  })

  it('AC1.g — formatVolume(999) reste sans suffixe (seuil inclusif à 1000)', () => {
    expect(formatVolume(999)).toBe('999')
  })
})

describe('FR-INFRA-KPI-DISPLAY-DASH — formatCpc', () => {
  it('AC2.a — formatCpc(null) retourne "—"', () => {
    expect(formatCpc(null)).toBe('—')
  })

  it('AC2.b — formatCpc(undefined) retourne "—"', () => {
    expect(formatCpc(undefined)).toBe('—')
  })

  it('AC2.c — formatCpc(1.234) retourne "1.23 €" (toFixed 2 + suffixe euro)', () => {
    expect(formatCpc(1.234)).toBe('1.23 €')
  })

  it('AC2.d — formatCpc(0) retourne "0.00 €" (vrai zéro affiché)', () => {
    expect(formatCpc(0)).toBe('0.00 €')
  })

  it('AC2.e — formatCpc(2) retourne "2.00 €" (entier formaté à 2 décimales)', () => {
    expect(formatCpc(2)).toBe('2.00 €')
  })
})

describe('FR-INFRA-KPI-DISPLAY-DASH — formatKd', () => {
  it('AC3.a — formatKd(null) retourne "—"', () => {
    expect(formatKd(null)).toBe('—')
  })

  it('AC3.b — formatKd(undefined) retourne "—"', () => {
    expect(formatKd(undefined)).toBe('—')
  })

  it('AC3.c — formatKd(42) retourne "42"', () => {
    expect(formatKd(42)).toBe('42')
  })

  it('AC3.d — formatKd(42.7) retourne "43" (arrondi à l\'entier)', () => {
    expect(formatKd(42.7)).toBe('43')
  })

  it('AC3.e — formatKd(0) retourne "0" (vrai zéro)', () => {
    expect(formatKd(0)).toBe('0')
  })
})

describe('FR-INFRA-KPI-DISPLAY-DASH — formatPercent', () => {
  it('AC4.a — formatPercent(null) retourne "—"', () => {
    expect(formatPercent(null)).toBe('—')
  })

  it('AC4.b — formatPercent(undefined) retourne "—"', () => {
    expect(formatPercent(undefined)).toBe('—')
  })

  it('AC4.c — formatPercent(42) (entier déjà en %) retourne "42 %"', () => {
    expect(formatPercent(42)).toBe('42 %')
  })

  it('AC4.d — formatPercent(0.42, { fromRatio: true }) retourne "42 %"', () => {
    expect(formatPercent(0.42, { fromRatio: true })).toBe('42 %')
  })

  it('AC4.e — formatPercent(0) retourne "0 %" (vrai zéro)', () => {
    expect(formatPercent(0)).toBe('0 %')
  })
})
