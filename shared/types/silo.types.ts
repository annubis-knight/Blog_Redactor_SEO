import type { Cocoon } from './cocoon.types.js'

/** Top-level theme describing the blog's editorial positioning */
export interface Theme {
  nom: string
  description: string
}

/** Silo grouping related cocoons under a strategic axis */
export interface Silo {
  id: number
  nom: string
  description: string
  cocons: Cocoon[]
  stats?: SiloStats
}

/** Aggregated statistics for a silo */
export interface SiloStats {
  totalArticles: number
  byType: { pilier: number; intermediaire: number; specialise: number }
  byStatus: { aRediger: number; brouillon: number; publie: number }
  completionPercent: number
}

/** Theme-level configuration for business context (injected into AI prompts) */
export interface ThemeConfig {
  avatar: {
    sector: string
    companySize: string
    location: string
    budget: string
    digitalMaturity: string
  }
  positioning: {
    targetAudience: string
    mainPromise: string
    differentiators: string[]
    painPoints: string[]
  }
  offerings: {
    services: string[]
    mainCTA: string
    ctaTarget: string
  }
  toneOfVoice: {
    style: string
    vocabulary: string[]
  }
}
