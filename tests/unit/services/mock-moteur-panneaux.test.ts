// @vitest-environment node
/**
 * NFR-COST-AI-MOCK — en mode simulé, les panneaux IA du Moteur reçoivent une
 * réponse préparée dans la forme que le code applique à la réponse :
 *
 *   - FR-LEX-AI-PANEL : l'avis du Lexique rendait `{ term, category, reasoning }`
 *     et `missing` au lieu de `{ term, aiRecommended, aiReason }` et
 *     `missingTerms` (contrat `lexique-ai`). Toutes les recommandations étaient
 *     écartées : aucun badge, et l'analyse semblait à refaire à chaque ouverture.
 *     Les termes rendus étaient ceux d'un plombier, quel que soit le mot-clé.
 *   - FR-LIE-PROPOSE-AI : la proposition de Lieutenants n'avait ni `sources`, ni
 *     `suggestedHnLevel`, ni `contentGapInsights`, et sa liste `eliminated`
 *     n'était lue par personne ; trois candidats seulement, jamais d'« Autres
 *     candidats ».
 *   - FR-RAD-LONGTAIL-GENERATE : la réponse des longues traînes cherchait les
 *     mots-clés du Radar dans le message utilisateur, alors que le service les
 *     place dans la consigne : la liste revenait toujours vide.
 *
 * Chaque test rejoue l'appel réel : la consigne rendue par `loadPrompt` avec les
 * variables de la route (ou du service), le message utilisateur qu'elle écrit,
 * le choix de la réponse préparée (première qui répond), puis le contrat ou le
 * schéma que le code applique à la réponse.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { classifyJsonMock } from '../../../server/services/external/mock.service'
import { loadPrompt } from '../../../server/utils/prompt-loader'
import { parseAiJson } from '../../../server/utils/ai-json-parser'
import { combineRoots } from '../../../server/services/keyword/long-tail-combinator.service'
import { parseContract, setContractReporter, type ContractEvent } from '../../../shared/contracts/core'
import { lexiqueAnalysisContract } from '../../../shared/contracts/lexique.contract'
import { proposeLieutenantsAiContract } from '../../../shared/contracts/lieutenants.contract'
import { ARTICLE_TYPE_RULES, describeTypeRules } from '../../../shared/constants/article-type-rules'
import { longTailSuggestionsResponseSchema, type LongTailSuggestionsResponse } from '../../../shared/schemas/long-tail-suggestions.schema'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

/** La réponse préparée choisie pour cet appel, et son texte. */
function repondre(systemPrompt: string, userPrompt: string, attendue: string): string {
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  expect(fixture?.name, 'la réponse préparée choisie pour cet appel').toBe(attendue)
  const out = fixture!.builder({ systemPrompt, userPrompt })
  const text = typeof out === 'string' ? out : Array.isArray(out) ? out.join('') : out.text
  expect(text).not.toContain('[Mock provider]')
  return text
}

/** Écarts signalés par les contrats : une réponse conforme n'en produit aucun. */
let ecarts: ContractEvent[] = []
beforeEach(() => {
  ecarts = []
  setContractReporter(event => ecarts.push(event))
})
afterEach(() => setContractReporter(() => {}))

// ---------------------------------------------------------------------------
// Lexique — POST /keywords/:keyword/ai-lexique-upfront
// ---------------------------------------------------------------------------

interface Termes { obligatoire: string[]; differenciateur: string[]; optionnel: string[] }

async function analyseLexique(keyword: string, level: ArticleLevel, termes: Termes) {
  const systemPrompt = await loadPrompt('lexique-analysis-upfront', {
    keyword,
    level,
    painPoint: 'Les propriétaires ne savent pas quelle isolation choisir',
    obligatoire_terms: termes.obligatoire.join(', ') || 'aucun',
    differenciateur_terms: termes.differenciateur.join(', ') || 'aucun',
    optionnel_terms: termes.optionnel.join(', ') || 'aucun',
  })
  const userPrompt = `Analyse tous les termes TF-IDF pour l'article "${keyword}" de niveau ${level}. Recommande ou exclue chaque terme avec une raison. Retourne le JSON structuré.`
  const text = repondre(systemPrompt, userPrompt, 'ai-lexique-upfront')
  return parseContract(lexiqueAnalysisContract, parseAiJson<unknown>(text), 'server')
}

const TERMES_ISOLATION: Termes = {
  obligatoire: ['isolation', 'combles', 'laine de verre'],
  differenciateur: ['pare-vapeur', 'soufflage', 'aide maprimerenov'],
  optionnel: ['écureuil', 'isolation combles perdus prix', 'toiture'],
}

describe('FR-LEX-AI-PANEL — l’avis simulé du Lexique suit le contrat et les termes reçus', () => {
  it('chaque terme reçu a sa décision et sa raison, sans écart au contrat', async () => {
    const analyse = await analyseLexique('isolation combles perdus', 'pilier', TERMES_ISOLATION)
    expect(ecarts, 'aucune recommandation écartée ni champ corrigé').toEqual([])
    const tous = [...TERMES_ISOLATION.obligatoire, ...TERMES_ISOLATION.differenciateur, ...TERMES_ISOLATION.optionnel]
    expect(analyse.recommendations.map(r => r.term).sort()).toEqual([...tous].sort())
    for (const r of analyse.recommendations) expect(r.aiReason.trim(), r.term).not.toBe('')
  })

  it('les obligatoires sont recommandés, et l’analyse écarte aussi des termes', async () => {
    const analyse = await analyseLexique('isolation combles perdus', 'pilier', TERMES_ISOLATION)
    const decision = new Map(analyse.recommendations.map(r => [r.term, r.aiRecommended]))
    for (const terme of TERMES_ISOLATION.obligatoire) expect(decision.get(terme), terme).toBe(true)
    expect([...decision.values()]).toContain(false)
  })

  it('au plus 5 termes manquants, absents des listes reçues, et un résumé', async () => {
    const analyse = await analyseLexique('isolation combles perdus', 'pilier', TERMES_ISOLATION)
    const recus = new Set([...TERMES_ISOLATION.obligatoire, ...TERMES_ISOLATION.differenciateur, ...TERMES_ISOLATION.optionnel])
    expect(analyse.missingTerms.length).toBeGreaterThan(0)
    expect(analyse.missingTerms.length).toBeLessThanOrEqual(5)
    for (const terme of analyse.missingTerms) expect(recus.has(terme), terme).toBe(false)
    expect(analyse.summary).toContain('isolation combles perdus')
  })

  it('d’autres termes reçus donnent d’autres recommandations', async () => {
    const autre = await analyseLexique('création site vitrine', 'intermediaire', {
      obligatoire: ['site vitrine', 'référencement'], differenciateur: ['charte graphique'], optionnel: [],
    })
    expect(autre.recommendations.map(r => r.term).sort()).toEqual(['charte graphique', 'référencement', 'site vitrine'])
  })
})

// ---------------------------------------------------------------------------
// Lieutenants — POST /keywords/:keyword/propose-lieutenants
// ---------------------------------------------------------------------------

const PAA = ['Combien coûte une isolation des combles perdus ?', 'Quelle épaisseur d’isolant pour des combles ?']

async function propositionLieutenants(keyword: string, level: ArticleLevel, existants: string[] = []) {
  // Mêmes mises en forme que la route.
  const systemPrompt = await loadPrompt('propose-lieutenants', {
    keyword,
    level,
    painPoint: 'Les propriétaires ne savent pas quelle isolation choisir',
    paa_questions: PAA.map(q => `- ${q}`).join('\n'),
    hn_recurrence: 'H2: "Les différentes techniques d’isolation" (3x, 60%)',
    serp_competitors: '#1 exemple-isolation.fr — "Isolation des combles : le guide"',
    root_keywords_serp_data: 'Aucune donnée SERP de mots-clés racine disponible.',
    word_groups: 'isolant biosourcé, isolation par soufflage',
    root_keywords: 'isolation combles',
    existing_lieutenants: existants.length > 0 ? existants.join(', ') : 'Aucun (premier article du cocon)',
    type_rules: describeTypeRules(level),
  })
  const userPrompt = `Propose les meilleurs lieutenants pour l'article "${keyword}" de niveau ${level}. Analyse toutes les données fournies et retourne le JSON structuré.`
  const text = repondre(systemPrompt, userPrompt, 'propose-lieutenants')
  const brut = parseAiJson<Record<string, unknown>>(text)
  return { brut, proposition: parseContract(proposeLieutenantsAiContract, brut, 'server') }
}

describe('FR-LIE-PROPOSE-AI — la proposition simulée de Lieutenants suit le contrat et le prompt', () => {
  it('chaque candidat a score, niveau H2/H3, raison et sources, sans écart au contrat', async () => {
    const { brut, proposition } = await propositionLieutenants('isolation combles perdus', 'pilier')
    expect(ecarts, 'aucun champ corrigé ni candidat écarté par le contrat').toEqual([])
    expect(Object.keys(brut).sort(), 'la forme du prompt : pas de liste « eliminated »').toEqual(['contentGapInsights', 'lieutenants'])
    expect(proposition.contentGapInsights.trim()).not.toBe('')
    for (const lt of proposition.lieutenants) {
      expect(lt.score, lt.keyword).not.toBeNull()
      expect([2, 3]).toContain(lt.suggestedHnLevel)
      expect(lt.sources.length, lt.keyword).toBeGreaterThan(0)
      expect(lt.reasoning.trim(), lt.keyword).not.toBe('')
    }
  })

  it.each<ArticleLevel>(['pilier', 'intermediaire', 'specifique'])('%s : autant de candidats que le type en demande', async (level) => {
    const { proposition } = await propositionLieutenants('isolation combles perdus', level)
    const rules = ARTICLE_TYPE_RULES[level]
    expect(proposition.lieutenants.length).toBeGreaterThanOrEqual(rules.lieutenantCandidatesMin)
    expect(proposition.lieutenants.length).toBeLessThanOrEqual(rules.lieutenantCandidatesMax)
  })

  it('un pilier a des « Autres candidats » au-delà du plafond retenu', async () => {
    const { proposition } = await propositionLieutenants('isolation combles perdus', 'pilier')
    expect(proposition.lieutenants.length).toBeGreaterThan(ARTICLE_TYPE_RULES.pilier.maxLieutenants)
  })

  it('les candidats viennent des données de la consigne (PAA), jamais du capitaine ni des interdits', async () => {
    const interdit = 'prix isolation combles perdus'
    const { proposition } = await propositionLieutenants('isolation combles perdus', 'pilier', [interdit])
    const keywords = proposition.lieutenants.map(l => l.keyword)
    expect(keywords).toContain('combien coûte une isolation des combles perdus')
    expect(proposition.lieutenants.find(l => l.keyword === 'combien coûte une isolation des combles perdus')?.sources).toContain('paa')
    expect(keywords).not.toContain('isolation combles perdus')
    expect(keywords).not.toContain(interdit)
  })
})

// ---------------------------------------------------------------------------
// Longues traînes du Radar — generateLongTailSuggestions (outil suggest_long_tail)
// ---------------------------------------------------------------------------

async function longuesTraines(radarKeywords: string[], articleTitle: string): Promise<LongTailSuggestionsResponse> {
  // Mêmes blocs que le service.
  const candidates = combineRoots(radarKeywords)
  const systemPrompt = await loadPrompt('radar-long-tail-suggest', {
    article_title: articleTitle,
    article_pain_point: 'Les propriétaires ne savent pas quelle isolation choisir',
    radar_keywords_with_kpis: radarKeywords.map(k => `- "${k}"`).join('\n'),
    candidate_combinations: candidates.length > 0
      ? candidates.map(c => `- ${c.keyword}  (${c.derivedFromRoots.join(' + ')})`).join('\n')
      : 'Aucune combinaison candidate calculee.',
  })
  const userPrompt = `Genere les suggestions longue-traine pour l'article "${articleTitle}".`
  // `classifyWithTool` en mode simulé : message + format de sortie + nom de l'outil.
  const { data } = await classifyJsonMock<unknown>(systemPrompt, `${userPrompt}\n\nFORMAT DE SORTIE OBLIGATOIRE : JSON valide qui respecte ce schéma :\n{}\nDescription : Genere jusqu'a 10 longues-traines a partir des mots-cles racines.\nTool : suggest_long_tail`)
  const parsed = longTailSuggestionsResponseSchema.safeParse(data)
  expect(parsed.success, 'la sortie passe le schéma du service').toBe(true)
  return parsed.data!
}

describe('FR-RAD-LONGTAIL-GENERATE — les longues traînes simulées partent des mots-clés envoyés', () => {
  const RADAR = ['isolation combles', 'laine de verre', 'aide maprimerenov', 'isolation toulouse']

  it('la liste n’est pas vide, et chaque suggestion dérive des mots-clés du Radar', async () => {
    const { suggestions } = await longuesTraines(RADAR, 'Isoler ses combles perdus')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.length).toBeLessThanOrEqual(10)
    for (const s of suggestions) {
      for (const root of s.derivedFromRoots) expect(RADAR, s.keyword).toContain(root)
    }
  })

  it('les suggestions sont triées par préférence décroissante', async () => {
    const scores = (await longuesTraines(RADAR, 'Isoler ses combles perdus')).suggestions.map(s => s.preferenceScore)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('d’autres mots-clés donnent d’autres suggestions', async () => {
    const a = (await longuesTraines(RADAR, 'Isoler ses combles perdus')).suggestions.map(s => s.keyword)
    const b = (await longuesTraines(['site vitrine', 'artisan', 'référencement local'], 'Site vitrine pour artisan')).suggestions.map(s => s.keyword)
    expect(b.length).toBeGreaterThan(0)
    expect(b).not.toEqual(a)
  })
})
