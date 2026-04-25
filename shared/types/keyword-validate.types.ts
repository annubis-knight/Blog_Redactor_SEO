// --- Keyword Validation / Scoring Types (Story 6.2) ---

export type ArticleLevel = 'pilier' | 'intermediaire' | 'specifique'

export type KpiColor = 'green' | 'orange' | 'red' | 'neutral' | 'bonus'

export interface KpiResult {
  name: string           // 'volume' | 'kd' | 'cpc' | 'paa' | 'intent' | 'autocomplete'
  rawValue: number
  color: KpiColor
  label: string          // Ex: "1 250 recherches/mois"
  thresholds: {          // Seuils appliqués (pour tooltip frontend)
    green: number
    orange?: number
    red?: number
  }
}

export type VerdictLevel = 'GO' | 'ORANGE' | 'NO-GO' | 'GRAY'

export interface ValidateVerdict {
  level: VerdictLevel
  greenCount: number     // Nombre de KPIs verts
  totalKpis: number      // Toujours 6
  reason?: string        // Ex: "Aucun signal détecté", "KPIs faibles"
  autoNoGo: boolean      // True si NO-GO automatique (0 signaux)
}

export interface PaaQuestionValidate {
  question: string
  answer: string | null
  match?: 'none' | 'partial' | 'total'
  matchQuality?: 'exact' | 'stem'
}

export interface ValidateResponse {
  keyword: string
  articleLevel: ArticleLevel
  kpis: KpiResult[]
  verdict: ValidateVerdict
  fromCache: boolean
  cachedAt: string | null
  paaQuestions?: PaaQuestionValidate[]
}

export interface ThresholdConfig {
  volume: { green: number; orange: number }
  kd: { green: number; orange: number }
  cpc: { bonus: number }
  paa: { green: number; orange: number }
  intent: { green: number; orange: number }
  autocomplete: { green: number; orange: number }
}
