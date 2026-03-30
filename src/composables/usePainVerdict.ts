import type { KeywordAuditResult } from '../../shared/types/index.js'

export type PainVerdict = 'brulante' | 'emergente' | 'froide' | 'neutre'

export interface PainVerdictInfo {
  verdict: PainVerdict
  label: string
  color: string
  bgColor: string
}

const VERDICTS: Record<PainVerdict, Omit<PainVerdictInfo, 'verdict'>> = {
  brulante: { label: 'Brûlante', color: '#dc2626', bgColor: '#fef2f2' },
  emergente: { label: 'Émergente', color: '#d97706', bgColor: '#fffbeb' },
  froide: { label: 'Froide', color: '#2563eb', bgColor: '#eff6ff' },
  neutre: { label: 'Neutre', color: '#6b7280', bgColor: '#f9fafb' },
}

export function usePainVerdict() {
  function getVerdict(kw: KeywordAuditResult): PainVerdict {
    // Brûlante: high volume + high CPC = strong commercial intent
    if (kw.searchVolume > 200 && kw.cpc > 3) return 'brulante'
    // Froide: no volume + no CPC = no market signal
    if (kw.searchVolume === 0 && kw.cpc === 0) return 'froide'
    // Émergente: low volume but many related keywords = growing topic
    if (kw.searchVolume < 200 && kw.relatedKeywords.length > 5) return 'emergente'
    // Default: neutral
    return 'neutre'
  }

  function getVerdictInfo(kw: KeywordAuditResult): PainVerdictInfo {
    const verdict = getVerdict(kw)
    return { verdict, ...VERDICTS[verdict] }
  }

  function getVerdictSummary(results: KeywordAuditResult[]): Record<PainVerdict, number> {
    const summary: Record<PainVerdict, number> = { brulante: 0, emergente: 0, froide: 0, neutre: 0 }
    for (const kw of results) {
      summary[getVerdict(kw)]++
    }
    return summary
  }

  return { getVerdict, getVerdictInfo, getVerdictSummary }
}
