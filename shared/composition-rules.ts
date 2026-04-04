/**
 * Moteur de validation des règles de composition des mots-clés SEO.
 *
 * Fonction pure, sans appel API — exécution instantanée côté client ou serveur.
 * Les règles sont advisory : elles ne bloquent jamais l'utilisateur.
 */

import type { ArticleLevel } from './types/keyword-validate.types.js'
import type { CompositionRuleResult, CompositionCheckResult } from './types/composition.types.js'
import {
  LOCATION_TERMS,
  LOCATION_MULTIWORD,
  AUDIENCE_TERMS,
  DISCOURAGED_AUDIENCE,
} from './composition-dictionaries.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeKeyword(keyword: string): string {
  return keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function getWords(keyword: string): string[] {
  return keyword.trim().split(/\s+/).filter(w => w.length > 0)
}

const LEVEL_LABELS: Record<ArticleLevel, string> = {
  pilier: 'Pilier',
  intermediaire: 'Intermédiaire',
  specifique: 'Spécialisé',
}

// ---------------------------------------------------------------------------
// Règle 1 : Nombre de mots
// ---------------------------------------------------------------------------

function checkWordCount(keyword: string, level: ArticleLevel): CompositionRuleResult {
  const count = getWords(keyword).length

  if (level === 'pilier' || level === 'intermediaire') {
    const label = LEVEL_LABELS[level]
    const pass = count >= 3 && count <= 4
    return {
      rule: 'word_count',
      pass,
      message: pass
        ? `${count} mots — moyenne traîne conforme`
        : count < 3
          ? `${count} mot${count > 1 ? 's' : ''} — un ${label} devrait avoir 3-4 mots (moyenne traîne)`
          : `${count} mots — un ${label} devrait avoir 3-4 mots (moyenne traîne)`,
      severity: 'warning',
    }
  }

  // specifique : 5+ mots
  const pass = count >= 5
  return {
    rule: 'word_count',
    pass,
    message: pass
      ? `${count} mots — longue traîne conforme`
      : `${count} mots — un Spécialisé devrait avoir 5+ mots (longue traîne)`,
    severity: 'warning',
  }
}

// ---------------------------------------------------------------------------
// Règle 2 : Localisation géographique
// ---------------------------------------------------------------------------

function hasLocation(keyword: string): boolean {
  const normalized = normalizeKeyword(keyword)
  const words = normalized.split(/[\s-]+/)

  // Check single-word locations
  if (words.some(w => LOCATION_TERMS.has(w))) return true

  // Check multi-word locations
  if (LOCATION_MULTIWORD.some(phrase => normalized.includes(phrase))) return true

  return false
}

function checkLocation(keyword: string, level: ArticleLevel): CompositionRuleResult | null {
  if (level === 'specifique') return null

  const found = hasLocation(keyword)

  if (level === 'pilier') {
    return {
      rule: 'location_present',
      pass: found,
      message: found
        ? 'Localisation détectée — conforme pour un Pilier'
        : 'Pilier sans localisation — le mot-clé devrait inclure une ville ou région (ex: Toulouse, toulousain, Occitanie)',
      severity: 'warning',
    }
  }

  // intermediaire : PAS de localisation
  return {
    rule: 'location_absent',
    pass: !found,
    message: !found
      ? 'Pas de localisation — conforme pour un Intermédiaire'
      : 'Localisation détectée — un Intermédiaire ne devrait pas contenir de ville ou région',
    severity: 'warning',
  }
}

// ---------------------------------------------------------------------------
// Règle 3 : Audience / cible
// ---------------------------------------------------------------------------

function checkAudience(keyword: string, level: ArticleLevel): CompositionRuleResult | null {
  if (level === 'specifique') return null

  const normalized = normalizeKeyword(keyword)
  const words = normalized.split(/[\s-]+/)

  const hasValidAudience = words.some(w => AUDIENCE_TERMS.has(w))
  const hasDiscouraged = words.some(w => DISCOURAGED_AUDIENCE.has(w))

  const label = LEVEL_LABELS[level]

  if (hasValidAudience) {
    return {
      rule: 'audience_present',
      pass: true,
      message: `Cible détectée — conforme pour un ${label}`,
      severity: 'warning',
    }
  }

  if (hasDiscouraged) {
    return {
      rule: 'audience_present',
      pass: false,
      message: `« PME/TPE » détecté — préférer « entreprises », « dirigeants » ou « professionnels »`,
      severity: 'warning',
    }
  }

  return {
    rule: 'audience_present',
    pass: false,
    message: `${label} sans cible — le mot-clé devrait inclure une référence au public visé (entreprises, professionnels, dirigeants…)`,
    severity: 'warning',
  }
}

// ---------------------------------------------------------------------------
// Règle 4 : Format question (spécifique uniquement)
// ---------------------------------------------------------------------------

const INTERROGATIVE_STARTS = new Set([
  'comment', 'pourquoi', 'quand', 'combien',
  'quel', 'quelle', 'quels', 'quelles',
  'ou', 'qui', 'que',
  'est-ce', 'faut-il', 'peut-on', 'doit-on',
])

function checkQuestionFormat(keyword: string, level: ArticleLevel): CompositionRuleResult | null {
  if (level !== 'specifique') return null

  const normalized = normalizeKeyword(keyword)
  const words = normalized.split(/\s+/)
  const firstWord = words[0] ?? ''

  const startsWithInterrogative = INTERROGATIVE_STARTS.has(firstWord)
  const hasQuestionMark = keyword.includes('?')
  const isQuestion = startsWithInterrogative || hasQuestionMark

  return {
    rule: 'question_format',
    pass: isQuestion,
    message: isQuestion
      ? 'Format question détecté — conforme pour un Spécialisé'
      : 'Pas de format question — un Spécialisé devrait être formulé comme une question ou un problème concret (comment…, pourquoi…, quel…)',
    severity: 'warning',
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée principal
// ---------------------------------------------------------------------------

export function checkKeywordComposition(
  keyword: string,
  level: ArticleLevel,
): CompositionCheckResult {
  const checks = [
    checkWordCount(keyword, level),
    checkLocation(keyword, level),
    checkAudience(keyword, level),
    checkQuestionFormat(keyword, level),
  ].filter((r): r is CompositionRuleResult => r !== null)

  return {
    keyword,
    level,
    results: checks,
    warningCount: checks.filter(c => !c.pass && c.severity === 'warning').length,
    allPass: checks.every(c => c.pass),
  }
}
