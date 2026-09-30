/**
 * AUTHORITY: PostgreSQL `lexique_explorations` (cache article-scoped des
 *            propositions TF-IDF + IA upfront pour chaque sourceKeyword exploré).
 * READS FROM: GET /articles/:id/explorations (hydrateFromDb / mergeFromDb),
 *             sous contrat `explorations` (NFR-INT-DISPLAY-CONTRACTS).
 * WRITES TO: rien en base — famille LECTURE stricte (FR-LEX-LECTURE-VS-VERROUILLAGE).
 *            Aucun appel apiPut/apiPost/apiDelete sur /articles/:id/keywords.
 *            Aucun import de useArticleKeywordsStore (sauf typage).
 *            En mémoire seulement : applyIaAnalysis range l'analyse que le serveur
 *            vient d'enregistrer (ai-lexique-upfront, saveLexiqueAi).
 * CONSUMERS: LexiquePanel.vue (listes, onglets, résumé, termes manquants),
 *            useLexiqueIa (badges et compteurs du panneau lisent iaRecommendations).
 * RELATED FR: FR-LEX-LECTURE-VS-VERROUILLAGE (AC.LEX-SEP.1, AC.LEX-SEP.3),
 *             FR-LEX-MULTI-KEYWORD-TABS (cache pastExplorations alimenté ici),
 *             FR-LEX-AI-PANEL (une seule analyse affichée : celle du mot-clé affiché),
 *             FR-MOT-CACHE-PANEL-COUNT (les compteurs DB tirent depuis le cache hydrate).
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import { articleExplorationsContract } from '@shared/contracts/article-explorations.contract.js'
import { isGenericTerm } from '@shared/utils/generic-terms.js'
import type {
  TfidfResult,
  LexiqueAnalysisResult,
  LexiqueExploration,
  LexiqueTermRecommendation,
} from '@shared/types/serp-analysis.types.js'

export type LexiqueExplorationEntry = LexiqueExploration

/** Analyse de l'IA d'un mot-clé exploré, telle qu'enregistrée dans `lexique_explorations`. */
interface LexiqueIaAnalysis {
  recommendations: Map<string, LexiqueTermRecommendation>
  summary: string | null
  missingTerms: string[]
}

export interface UseLexiqueExplorationsInput {
  articleId: Ref<number | undefined>
  captainKeyword: Ref<string | null>
}

export interface UseLexiqueExplorationsApi {
  pastExplorations: Ref<LexiqueExplorationEntry[]>
  activeSourceKeyword: Ref<string>
  tfidfResult: Ref<TfidfResult | null>
  /**
   * Mot-clé de la liste affichée : l'onglet ouvert, sinon (onglet « Tester un
   * mot-clé ») celui de la liste restée à l'écran, sinon le Capitaine. L'analyse
   * de l'IA part pour lui et s'affiche pour lui (FR-LEX-AI-PANEL).
   */
  analysisKeyword: ComputedRef<string>
  /** Recommandations de l'analyse affichée (clé : terme en minuscules). */
  iaRecommendations: ComputedRef<Map<string, LexiqueTermRecommendation>>
  /** Résumé de l'analyse affichée, `null` sans analyse. */
  iaSummary: ComputedRef<string | null>
  /** Termes manquants de l'analyse affichée. */
  iaMissingTerms: ComputedRef<string[]>
  hydrateFromDb: () => Promise<void>
  mergeFromDb: () => Promise<void>
  selectExploration: (sourceKeyword: string) => void
  addExploration: (entry: LexiqueExplorationEntry) => void
  /** Range l'analyse que le serveur vient d'enregistrer pour `sourceKeyword`. */
  applyIaAnalysis: (sourceKeyword: string, result: LexiqueAnalysisResult) => void
  reset: () => void
}

const NO_RECOMMENDATIONS: ReadonlyMap<string, LexiqueTermRecommendation> = new Map()

function keyOf(keyword: string): string {
  return keyword.trim().toLowerCase()
}

/**
 * Même filtre qu'à la relecture en base (`lexique-exploration.service`
 * `rowToExploration`) : l'analyse reçue s'affiche comme elle reviendra au
 * rechargement (FR-LEX-METIER-ONLY).
 */
function toAnalysis(
  recommendations: LexiqueTermRecommendation[],
  summary: string | null,
  missingTerms: string[],
): LexiqueIaAnalysis {
  const map = new Map<string, LexiqueTermRecommendation>()
  for (const rec of recommendations) {
    if (!isGenericTerm(rec.term)) map.set(rec.term.toLowerCase(), rec)
  }
  return {
    recommendations: map,
    summary: summary?.trim() ? summary : null,
    missingTerms: missingTerms.filter(t => !isGenericTerm(t)),
  }
}

function analysisOfEntry(entry: LexiqueExplorationEntry): LexiqueIaAnalysis | null {
  const analysis = toAnalysis(entry.aiRecommendations, entry.aiSummary, entry.aiMissingTerms)
  const isEmpty = analysis.recommendations.size === 0 && !analysis.summary && analysis.missingTerms.length === 0
  return isEmpty ? null : analysis
}

export function useLexiqueExplorations(
  input: UseLexiqueExplorationsInput,
): UseLexiqueExplorationsApi {
  const pastExplorations = ref<LexiqueExplorationEntry[]>([])
  const activeSourceKeyword = ref<string>('')
  const tfidfResult = ref<TfidfResult | null>(null)
  /** Analyses connues de l'article, par mot-clé exploré (clé `keyOf`). */
  const analyses = ref<Map<string, LexiqueIaAnalysis>>(new Map())

  const analysisKeyword = computed(() =>
    activeSourceKeyword.value || tfidfResult.value?.keyword || input.captainKeyword.value || '',
  )
  const displayedAnalysis = computed(() => analyses.value.get(keyOf(analysisKeyword.value)) ?? null)
  const iaRecommendations = computed(
    () => (displayedAnalysis.value?.recommendations ?? NO_RECOMMENDATIONS) as Map<string, LexiqueTermRecommendation>,
  )
  const iaSummary = computed(() => displayedAnalysis.value?.summary ?? null)
  const iaMissingTerms = computed(() => displayedAnalysis.value?.missingTerms ?? [])

  /** Range les analyses relues en base. `onlyNew` : ne remplace pas une analyse déjà connue. */
  function rememberAnalyses(entries: LexiqueExplorationEntry[], onlyNew: boolean): void {
    const next = new Map(analyses.value)
    for (const entry of entries) {
      const key = keyOf(entry.sourceKeyword)
      if (onlyNew && next.has(key)) continue
      const analysis = analysisOfEntry(entry)
      if (analysis) next.set(key, analysis)
    }
    analyses.value = next
  }

  /**
   * Hydrate depuis DB au mount : restore pastExplorations + tfidfResult pour le
   * sourceKeyword qui matche le capitaine (le cas échéant), et les analyses de
   * l'IA de chaque mot-clé exploré.
   * Aucun appel externe DataForSEO — pure lecture cache article-scoped.
   */
  async function hydrateFromDb(): Promise<void> {
    const id = input.articleId.value
    if (!id) return
    try {
      const payload = await apiGet(`/articles/${id}/explorations`, { contract: articleExplorationsContract })
      pastExplorations.value = payload.lexique
      rememberAnalyses(payload.lexique, false)
      log.debug('[useLexiqueExplorations] DB hydration', { count: pastExplorations.value.length })

      const active = activeSourceKeyword.value || input.captainKeyword.value || ''
      const match = pastExplorations.value.find(
        e => e.sourceKeyword.toLowerCase() === active.toLowerCase(),
      )
      if (match && match.tfidfTerms) {
        tfidfResult.value = match.tfidfTerms
        activeSourceKeyword.value = match.sourceKeyword
        log.info(
          `[useLexiqueExplorations] Restored from DB for "${match.sourceKeyword}" (${shouldRegenerate(match.exploredAt) ? 'stale' : 'fresh'})`,
        )
      }
    } catch (err) {
      log.warn(`[useLexiqueExplorations] DB hydration failed — ${(err as Error).message}`)
    }
  }

  /**
   * Variante merge-only : récupère les explorations Lexique persistées et
   * fusionne SANS doublon dans `pastExplorations`. Clé d'unicité : sourceKeyword
   * (lowercase trim — algorithme préservé du `mergeFromDb` historique).
   */
  async function mergeFromDb(): Promise<void> {
    const id = input.articleId.value
    if (!id) return
    try {
      const payload = await apiGet(`/articles/${id}/explorations`, { contract: articleExplorationsContract })
      const incoming = payload.lexique
      const seen = new Set(
        pastExplorations.value.map(e => e.sourceKeyword.trim().toLowerCase()),
      )
      const additions: LexiqueExplorationEntry[] = []
      for (const entry of incoming) {
        const key = entry.sourceKeyword.trim().toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          additions.push(entry)
        }
      }
      if (additions.length > 0) {
        pastExplorations.value = [...pastExplorations.value, ...additions]
      }
      rememberAnalyses(incoming, true)
      log.info(
        `[useLexiqueExplorations] Merged ${additions.length} explorations (skipped ${incoming.length - additions.length} duplicates)`,
      )
    } catch (err) {
      log.warn(`[useLexiqueExplorations] DB merge failed — ${(err as Error).message}`)
    }
  }

  /**
   * Switch onglet pur (LECTURE) : lit le cache pastExplorations, n'effectue
   * aucun fetch. Cohérence affichage/calcul §2.0 : matching strict sur
   * sourceKeyword brut (pas de transformation). L'analyse affichée suit le
   * mot-clé de l'onglet (`analysisKeyword`).
   */
  function selectExploration(sourceKeyword: string): void {
    const entry = pastExplorations.value.find(e => e.sourceKeyword === sourceKeyword)
    if (!entry) return
    activeSourceKeyword.value = entry.sourceKeyword
    tfidfResult.value = entry.tfidfTerms
  }

  /**
   * Push local d'une nouvelle exploration (post-extractCustomKeyword côté
   * parent). Sélectionne automatiquement le nouvel onglet pour l'afficher.
   */
  function addExploration(entry: LexiqueExplorationEntry): void {
    pastExplorations.value = [...pastExplorations.value, entry]
    rememberAnalyses([entry], false)
    activeSourceKeyword.value = entry.sourceKeyword
    tfidfResult.value = entry.tfidfTerms
  }

  function applyIaAnalysis(sourceKeyword: string, result: LexiqueAnalysisResult): void {
    const next = new Map(analyses.value)
    next.set(keyOf(sourceKeyword), toAnalysis(result.recommendations, result.summary, result.missingTerms))
    analyses.value = next
  }

  /**
   * Reset utilisé sur switch d'article (le parent re-déclenche hydrateFromDb
   * ensuite).
   */
  function reset(): void {
    pastExplorations.value = []
    activeSourceKeyword.value = ''
    tfidfResult.value = null
    analyses.value = new Map()
  }

  return {
    pastExplorations,
    activeSourceKeyword,
    tfidfResult,
    analysisKeyword,
    iaRecommendations,
    iaSummary,
    iaMissingTerms,
    hydrateFromDb,
    mergeFromDb,
    selectExploration,
    addExploration,
    applyIaAnalysis,
    reset,
  }
}
