import type {
  ArticleLevel,
  KpiColor,
  KpiResult,
  ValidateVerdict,
  ThresholdConfig,
} from './types/keyword-validate.types.js'

// ---------------------------------------------------------------------------
// Thresholds by article level
// ---------------------------------------------------------------------------

const THRESHOLDS: Record<ArticleLevel, ThresholdConfig> = {
  pilier: {
    volume:       { green: 1000, orange: 200 },
    kd:           { green: 40, orange: 65 },
    cpc:          { bonus: 2 },
    paa:          { green: 3.0, orange: 1.0 },
    intent:       { green: 0.7, orange: 0.4 },
    autocomplete: { green: 3, orange: 6 },
  },
  intermediaire: {
    volume:       { green: 200, orange: 50 },
    kd:           { green: 30, orange: 50 },
    cpc:          { bonus: 2 },
    paa:          { green: 2.0, orange: 0.5 },
    intent:       { green: 0.7, orange: 0.4 },
    autocomplete: { green: 4, orange: 7 },
  },
  specifique: {
    volume:       { green: 30, orange: 5 },
    kd:           { green: 20, orange: 40 },
    cpc:          { bonus: 2 },
    paa:          { green: 1.0, orange: 0.25 },
    intent:       { green: 0.7, orange: 0.4 },
    autocomplete: { green: 5, orange: 8 },
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getThresholds(level: ArticleLevel): ThresholdConfig {
  return THRESHOLDS[level]
}

/**
 * Score a single KPI based on its raw value and the threshold config.
 */
export function scoreKpi(
  name: string,
  rawValue: number,
  config: ThresholdConfig,
): KpiResult {
  switch (name) {
    case 'volume':       return scoreVolume(rawValue, config)
    case 'kd':           return scoreKd(rawValue, config)
    case 'cpc':          return scoreCpc(rawValue, config)
    case 'paa':          return scorePaa(rawValue, config)
    case 'intent':       return scoreIntent(rawValue, config)
    case 'autocomplete': return scoreAutocomplete(rawValue, config)
    default:
      return { name, rawValue, color: 'neutral', label: String(rawValue), thresholds: { green: 0 } }
  }
}

/**
 * Compute the global verdict from an array of 6 KPI results.
 *
 * Niveaux possibles :
 *  - `GRAY`  : données insuffisantes (volume + PAA + autocomplete absents du signal)
 *  - `NO-GO` : données présentes mais toutes à zéro (keyword inexistant)
 *  - `GO`    : ≥4/6 verts, pas de red sur Volume/KD/PAA
 *  - `ORANGE`: signaux mixtes (fallback)
 */
export function computeVerdict(kpis: KpiResult[]): ValidateVerdict {
  const volume = kpis.find(k => k.name === 'volume')
  const kd = kpis.find(k => k.name === 'kd')
  const paa = kpis.find(k => k.name === 'paa')
  const autocomplete = kpis.find(k => k.name === 'autocomplete')

  // GRAY : données insuffisantes — aucun des 3 KPI principaux n'est présent dans les résultats.
  // Distinct du NO-GO (où les KPI existent mais sont à zéro).
  if (!volume && !paa && !autocomplete) {
    return {
      level: 'GRAY',
      greenCount: 0,
      totalKpis: kpis.length,
      reason: 'Données insuffisantes',
      autoNoGo: false,
    }
  }

  // Auto NO-GO: volume=0 AND paa=0 AND autocomplete=0
  if (
    volume && volume.rawValue === 0 &&
    paa && paa.rawValue === 0 &&
    autocomplete && autocomplete.rawValue === 0
  ) {
    return {
      level: 'NO-GO',
      greenCount: 0,
      totalKpis: kpis.length,
      reason: 'Aucun signal détecté',
      autoNoGo: true,
    }
  }

  // Count greens (bonus counts as green)
  const greenCount = kpis.filter(k => k.color === 'green' || k.color === 'bonus').length

  // Check for reds on critical KPIs
  const volumeRed = volume?.color === 'red'
  const kdRed = kd?.color === 'red'
  const paaRed = paa?.color === 'red'

  // NO-GO: red Volume AND KD, OR red PAA + red Volume
  if ((volumeRed && kdRed) || (paaRed && volumeRed)) {
    return {
      level: 'NO-GO',
      greenCount,
      totalKpis: kpis.length,
      reason: 'KPIs critiques en rouge',
      autoNoGo: false,
    }
  }

  // GO: ≥4/6 greens, no red on Volume or KD, PAA not red
  if (greenCount >= 4 && !volumeRed && !kdRed && !paaRed) {
    return {
      level: 'GO',
      greenCount,
      totalKpis: kpis.length,
      autoNoGo: false,
    }
  }

  // ORANGE: everything else
  return {
    level: 'ORANGE',
    greenCount,
    totalKpis: kpis.length,
    reason: 'Signaux mixtes',
    autoNoGo: false,
  }
}

// ---------------------------------------------------------------------------
// Internal scoring functions
// ---------------------------------------------------------------------------

function scoreVolume(rawValue: number, config: ThresholdConfig): KpiResult {
  const { green, orange } = config.volume
  let color: KpiColor
  if (rawValue >= green) color = 'green'
  else if (rawValue >= orange) color = 'orange'
  else color = 'red'

  return {
    name: 'volume',
    rawValue,
    color,
    label: `${rawValue.toLocaleString('fr-FR')} rech/m`,
    thresholds: { green, orange },
  }
}

function scoreKd(rawValue: number, config: ThresholdConfig): KpiResult {
  const { green, orange } = config.kd
  let color: KpiColor
  if (rawValue <= green) color = 'green'
  else if (rawValue <= orange) color = 'orange'
  else color = 'red'

  return {
    name: 'kd',
    rawValue,
    color,
    label: `KD ${rawValue}`,
    thresholds: { green, orange },
  }
}

function scoreCpc(rawValue: number, config: ThresholdConfig): KpiResult {
  const color: KpiColor = rawValue > config.cpc.bonus ? 'bonus' : 'neutral'

  return {
    name: 'cpc',
    rawValue,
    color,
    label: `${rawValue.toFixed(2)}€`,
    thresholds: { green: config.cpc.bonus },
  }
}

function scorePaa(rawValue: number, config: ThresholdConfig): KpiResult {
  const { green, orange } = config.paa
  let color: KpiColor
  if (rawValue >= green) color = 'green'
  else if (rawValue >= orange) color = 'orange'
  else color = 'red'

  return {
    name: 'paa',
    rawValue,
    color,
    label: `${rawValue.toFixed(1)} pts`,
    thresholds: { green, orange },
  }
}

function scoreIntent(rawValue: number, config: ThresholdConfig): KpiResult {
  const { green, orange } = config.intent
  let color: KpiColor
  if (rawValue >= green) color = 'green'
  else if (rawValue >= orange) color = 'orange'
  else color = 'red'

  return {
    name: 'intent',
    rawValue,
    color,
    label: rawValue.toFixed(2),
    thresholds: { green, orange },
  }
}

function scoreAutocomplete(rawValue: number, config: ThresholdConfig): KpiResult {
  const { green, orange } = config.autocomplete
  let color: KpiColor
  if (rawValue === 0) {
    color = 'red'
  } else if (rawValue <= green) {
    color = 'green'
  } else if (rawValue <= orange) {
    color = 'orange'
  } else {
    color = 'red'
  }

  return {
    name: 'autocomplete',
    rawValue,
    color,
    label: rawValue === 0 ? 'Non trouvé' : `Position ${rawValue}`,
    thresholds: { green, orange },
  }
}
