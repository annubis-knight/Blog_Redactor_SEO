// @vitest-environment node
/**
 * FR-INFRA-TYPE-RULES-SSOT — une seule définition de ce qu'est un pilier, un
 * intermédiaire, un spécialisé.
 *
 * Constat du 2026-09-25 : un intermédiaire faisait « 1 000-1 500 mots » dans
 * deux prompts, 1 800 mots cibles dans le code, 1 850 à l'écran ; le mode
 * automatique retenait 8 lieutenants pour un pilier quand l'écran en gardait 5.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ARTICLE_TYPE_RULES, describeTypeRules, targetWordsFor, DEFAULT_TARGET_WORDS_FALLBACK } from '../../../shared/constants/article-type-rules'
import { calculateContentLength } from '../../../src/stores/strategy/brief.store'
import { computeHeuristicTarget } from '../../../server/services/article/target-word-count.service'
import { validateArticleSeo } from '../../../shared/seo-validators'
import { pickLieutenants } from '../../../scripts/auto-article/heuristics/pick-lieutenants'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

const ROOT = join(__dirname, '..', '..', '..')
const LEVELS = Object.keys(ARTICLE_TYPE_RULES) as ArticleLevel[]

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '_archive', 'dist'].includes(entry.name)) walk(full, exts, out)
    } else if (exts.some(e => entry.name.endsWith(e))) {
      out.push(full)
    }
  }
  return out
}

describe('les prompts citent les règles, ils ne les recopient pas', () => {
  it('aucun prompt n’écrit de fourchette de mots, de H2 ou de candidats', () => {
    // Une fourchette sur une ligne qui nomme un type (« Pilier : 6-8 H2 »,
    // « pilier (N2) = 2000-3000 mots »). Une consigne de format sans type
    // (« une capsule de 20 à 25 mots ») n'est pas une règle par type.
    const RANGE = /\b\d[\d\s]*\s*(?:-|à|a)\s*\d[\d\s]*\s*(?:mots|H2|H3|candidats)\b|\b(?:pilier|intermediaire|specifique)\s*:\s*\d/i
    // Pas de \b : il ignore les lettres accentuées (« Spécialisé » passait).
    const TYPE = /(?<![\p{L}\d])(?:pilier|interm[eé]diaire|sp[eé]cialis[eé]|specifique|N[234])(?![\p{L}\d])/iu
    const offenders = walk(join(ROOT, 'server/prompts'), ['.md'])
      .flatMap(file => readFileSync(file, 'utf8').split('\n').map((line, i) => ({ file, line, i })))
      .filter(({ line }) => RANGE.test(line) && TYPE.test(line))
      .map(({ file, line, i }) => `${relative(ROOT, file)}:${i + 1} — ${line.trim()}`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it.each(LEVELS)('describeTypeRules(%s) rend les valeurs de la source', (level) => {
    const r = ARTICLE_TYPE_RULES[level]
    const text = describeTypeRules(level)
    expect(text).toContain(r.label)
    for (const value of [r.wordsMin, r.wordsMax, r.targetWords]) expect(text).toContain(value.toLocaleString('fr-FR'))
    expect(text).toContain(`${r.h2Min} à ${r.h2Max} H2`)
    expect(text).toContain(`${r.h3PerH2Min} à ${r.h3PerH2Max} H3`)
    expect(text).toContain(`${r.lieutenantCandidatesMin} à ${r.lieutenantCandidatesMax} candidats`)
    expect(text).toContain(`${r.minLieutenants} au minimum et ${r.maxLieutenants} au maximum`)
    expect(text).toContain(r.localH2Max === 0 ? 'aucun H2 ne cite la ville' : `au plus ${r.localH2Max} H2 citent la ville`)
  })
})

describe('chaque calcul lit la source', () => {
  it.each(LEVELS)('%s : la longueur affichée sans l’IA = la longueur visée par la rédaction', (level) => {
    expect(calculateContentLength(level)).toBe(ARTICLE_TYPE_RULES[level].targetWords)
    expect(targetWordsFor(level)).toBe(ARTICLE_TYPE_RULES[level].targetWords)
    expect(computeHeuristicTarget({ articleType: level, competitorsAvgWordCount: null }).value).toBe(ARTICLE_TYPE_RULES[level].targetWords)
  })

  it('type inconnu : une seule valeur par défaut', () => {
    expect(targetWordsFor('chapitre')).toBe(DEFAULT_TARGET_WORDS_FALLBACK)
    expect(calculateContentLength('chapitre' as ArticleLevel)).toBe(DEFAULT_TARGET_WORDS_FALLBACK)
  })

  it.each(LEVELS)('%s : l’alerte « contenu mince » se déclenche sous le plancher de la source', (level) => {
    const { wordsFloor } = ARTICLE_TYPE_RULES[level]
    const content = (words: number) => `<p>${'mot '.repeat(words)}</p>`
    const rules = (words: number) => validateArticleSeo({ title: 'Titre', slug: 'titre', level, content: content(words) }).map(i => i.rule)
    expect(rules(wordsFloor - 1)).toContain('seo-thin-content')
    expect(rules(wordsFloor + 50)).not.toContain('seo-thin-content')
  })

  it.each(LEVELS)('%s : le mode automatique retient au plus le maximum de lieutenants', (level) => {
    const candidates = Array.from({ length: 20 }, (_, i) => ({ keyword: `lieutenant ${i}`, marketScore: 20 - i }))
    expect(pickLieutenants(candidates as never, 'capitaine', level)).toHaveLength(ARTICLE_TYPE_RULES[level].maxLieutenants)
  })
})

describe('aucune autre table de nombres par type', () => {
  // Tables par type qui ne sont PAS des règles d'article (autre donnée métier).
  const NOT_TYPE_RULES = new Set([
    'server/services/article/linking.service.ts', // profondeur dans le cocon (0, 1, 2)
    'server/services/keyword/keyword-scan.service.ts', // poids de l'intention par type
    'scripts/auto-article/heuristics/pick-radar-candidates.ts', // taille du balayage Radar du mode automatique
    'shared/constants/article-type-rules.ts', // la source elle-même
  ])

  it('seule la source associe un nombre à pilier / intermédiaire / spécialisé', () => {
    // Valeur non nulle : un compteur initialisé à zéro n'est pas une règle.
    const TABLE_ENTRY = /['"]?\b(?:pilier|intermediaire|specifique)['"]?\s*:\s*(?:\{\s*min|[1-9])/
    const offenders = ['server', 'src', 'shared', 'scripts']
      .flatMap(dir => walk(join(ROOT, dir), ['.ts', '.vue']))
      .filter(file => !NOT_TYPE_RULES.has(relative(ROOT, file).replaceAll('\\', '/')))
      .flatMap(file => readFileSync(file, 'utf8').split('\n').map((line, i) => ({ file, line, i })))
      .filter(({ line }) => TABLE_ENTRY.test(line) && !line.trim().startsWith('//'))
      .map(({ file, line, i }) => `${relative(ROOT, file)}:${i + 1} — ${line.trim()}`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
