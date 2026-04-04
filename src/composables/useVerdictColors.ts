import type { VerdictLevel, KpiColor } from '@shared/types/index.js'

/** Verdict → CSS color */
export const VERDICT_COLORS: Record<VerdictLevel, string> = {
  'GO': 'var(--color-success, #22c55e)',
  'ORANGE': 'var(--color-warning, #f59e0b)',
  'NO-GO': 'var(--color-error, #ef4444)',
}

/** KPI color name → CSS color */
export const KPI_COLORS: Record<KpiColor, string> = {
  green: 'var(--color-success, #22c55e)',
  orange: 'var(--color-warning, #f59e0b)',
  red: 'var(--color-error, #ef4444)',
  neutral: 'var(--color-text-muted, #94a3b8)',
  bonus: 'var(--color-success, #22c55e)',
}

/** Verdict → icon + label + color + bg (for thermometer/banners) */
export const VERDICT_CONFIG: Record<VerdictLevel, { icon: string; color: string; bg: string }> = {
  'GO': { icon: '\u2705', color: VERDICT_COLORS['GO'], bg: 'rgba(22, 163, 74, 0.06)' },
  'ORANGE': { icon: '\u26a0\ufe0f', color: VERDICT_COLORS['ORANGE'], bg: 'rgba(245, 158, 11, 0.06)' },
  'NO-GO': { icon: '\u274c', color: VERDICT_COLORS['NO-GO'], bg: 'rgba(239, 68, 68, 0.06)' },
}

export function getVerdictColor(verdict: string): string {
  return VERDICT_COLORS[verdict as VerdictLevel] ?? VERDICT_COLORS['ORANGE']
}

export function getKpiColor(color: string): string {
  return KPI_COLORS[color as KpiColor] ?? 'inherit'
}
