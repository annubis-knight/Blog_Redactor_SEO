import type { DataForSeoCacheEntry } from '@shared/types/index.js'

export type HealthLevel = 'good' | 'warning' | 'danger'

export interface KeywordHealthAlert {
  level: HealthLevel
  message: string
}

const VOLUME_ZERO = 0
const VOLUME_LOW = 50
const DIFFICULTY_HIGH = 70

export function evaluateKeywordHealth(data: DataForSeoCacheEntry): KeywordHealthAlert[] {
  const alerts: KeywordHealthAlert[] = []
  const { searchVolume, difficulty } = data.keywordData

  // Danger: no data at all
  if (searchVolume === VOLUME_ZERO) {
    alerts.push({
      level: 'danger',
      message: "Aucun volume de recherche \u2014 ce mot-cl\u00e9 n'existe pas dans Google",
    })
  }

  if (data.serp.length === 0) {
    alerts.push({
      level: 'danger',
      message: 'Aucun r\u00e9sultat SERP \u2014 mot-cl\u00e9 trop sp\u00e9cifique ou mal orthographi\u00e9',
    })
  }

  // Warnings
  if (searchVolume > VOLUME_ZERO && searchVolume < VOLUME_LOW) {
    alerts.push({
      level: 'warning',
      message: `Volume tr\u00e8s faible (${searchVolume}/mois) \u2014 trafic limit\u00e9`,
    })
  }

  if (difficulty > DIFFICULTY_HIGH) {
    alerts.push({
      level: 'warning',
      message: `Difficult\u00e9 \u00e9lev\u00e9e (${difficulty}/100) \u2014 concurrence forte`,
    })
  }

  if (searchVolume > VOLUME_ZERO && data.serp.length > 0 && data.paa.length === 0) {
    alerts.push({
      level: 'warning',
      message: "Aucune PAA \u2014 pas d'opportunit\u00e9 de position z\u00e9ro",
    })
  }

  // Good: no issues found
  if (alerts.length === 0) {
    alerts.push({
      level: 'good',
      message: 'Mot-cl\u00e9 viable \u2014 volume et concurrence corrects',
    })
  }

  return alerts
}
