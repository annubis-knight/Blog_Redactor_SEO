/**
 * AUTHORITY: PostgreSQL `lexique_explorations` (cache article-scoped des
 *            propositions TF-IDF + IA upfront pour chaque sourceKeyword exploré).
 * READS FROM: GET /articles/:id/explorations (hydrateFromDb / mergeFromDb).
 * WRITES TO: rien — famille LECTURE stricte (FR-LEX-LECTURE-VS-VERROUILLAGE).
 *            Aucun appel apiPut/apiPost/apiDelete sur /articles/:id/keywords.
 *            Aucun import de useArticleKeywordsStore (sauf typage).
 * CONSUMERS: LexiquePanel.vue (chantier 3 E3-S3 — refacto LECTURE/VERROUILLAGE).
 * RELATED FR: FR-LEX-LECTURE-VS-VERROUILLAGE (AC.LEX-SEP.1, AC.LEX-SEP.3),
 *             FR-LEX-MULTI-KEYWORD-TABS (cache pastExplorations alimenté ici),
 *             FR-MOT-CACHE-PANEL-COUNT (les compteurs DB tirent depuis le cache hydrate).
 */
import { ref, type Ref } from 'vue'
import { apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import type { TfidfResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'

export interface LexiqueExplorationEntry {
  articleId: number
  sourceKeyword: string
  tfidfTerms: TfidfResult | null
  aiRecommendations: LexiqueTermRecommendation[]
  aiMissingTerms: string[]
  aiSummary: string | null
  exploredAt: string
}

export interface UseLexiqueExplorationsInput {
  articleId: Ref<number | undefined>
  captainKeyword: Ref<string | null>
}

export interface UseLexiqueExplorationsApi {
  pastExplorations: Ref<LexiqueExplorationEntry[]>
  activeSourceKeyword: Ref<string>
  tfidfResult: Ref<TfidfResult | null>
  iaRecommendations: Ref<Map<string, LexiqueTermRecommendation>>
  hydrateFromDb: () => Promise<void>
  mergeFromDb: () => Promise<void>
  selectExploration: (sourceKeyword: string) => void
  addExploration: (entry: LexiqueExplorationEntry) => void
  reset: () => void
}

export function useLexiqueExplorations(
  input: UseLexiqueExplorationsInput,
): UseLexiqueExplorationsApi {
  const pastExplorations = ref<LexiqueExplorationEntry[]>([])
  const activeSourceKeyword = ref<string>('')
  const tfidfResult = ref<TfidfResult | null>(null)
  const iaRecommendations = ref<Map<string, LexiqueTermRecommendation>>(new Map())

  /**
   * Hydrate depuis DB au mount : restore pastExplorations + tfidfResult/iaRecommendations
   * pour le sourceKeyword qui matche le capitaine (le cas échéant).
   * Aucun appel externe DataForSEO — pure lecture cache article-scoped.
   */
  async function hydrateFromDb(): Promise<void> {
    const id = input.articleId.value
    if (!id) return
    try {
      const payload = await apiGet<{ lexique: LexiqueExplorationEntry[] }>(
        `/articles/${id}/explorations`,
      )
      pastExplorations.value = payload.lexique ?? []
      log.debug('[useLexiqueExplorations] DB hydration', { count: pastExplorations.value.length })

      const active = activeSourceKeyword.value || input.captainKeyword.value || ''
      const match = pastExplorations.value.find(
        e => e.sourceKeyword.toLowerCase() === active.toLowerCase(),
      )
      if (match && match.tfidfTerms) {
        tfidfResult.value = match.tfidfTerms
        activeSourceKeyword.value = match.sourceKeyword
        const map = new Map<string, LexiqueTermRecommendation>()
        for (const rec of match.aiRecommendations) map.set(rec.term.toLowerCase(), rec)
        iaRecommendations.value = map
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
      const payload = await apiGet<{ lexique: LexiqueExplorationEntry[] }>(
        `/articles/${id}/explorations`,
      )
      const incoming = payload.lexique ?? []
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
   * sourceKeyword brut (pas de transformation).
   */
  function selectExploration(sourceKeyword: string): void {
    const entry = pastExplorations.value.find(e => e.sourceKeyword === sourceKeyword)
    if (!entry) return
    activeSourceKeyword.value = entry.sourceKeyword
    tfidfResult.value = entry.tfidfTerms
    const map = new Map<string, LexiqueTermRecommendation>()
    for (const rec of entry.aiRecommendations) map.set(rec.term.toLowerCase(), rec)
    iaRecommendations.value = map
  }

  /**
   * Push local d'une nouvelle exploration (post-extractCustomKeyword côté
   * parent). Sélectionne automatiquement le nouvel onglet pour l'afficher.
   */
  function addExploration(entry: LexiqueExplorationEntry): void {
    pastExplorations.value = [...pastExplorations.value, entry]
    activeSourceKeyword.value = entry.sourceKeyword
    tfidfResult.value = entry.tfidfTerms
    const map = new Map<string, LexiqueTermRecommendation>()
    for (const rec of entry.aiRecommendations) map.set(rec.term.toLowerCase(), rec)
    iaRecommendations.value = map
  }

  /**
   * Reset utilisé sur switch d'article (le parent re-déclenche hydrateFromDb
   * ensuite).
   */
  function reset(): void {
    pastExplorations.value = []
    activeSourceKeyword.value = ''
    tfidfResult.value = null
    iaRecommendations.value = new Map()
  }

  return {
    pastExplorations,
    activeSourceKeyword,
    tfidfResult,
    iaRecommendations,
    hydrateFromDb,
    mergeFromDb,
    selectExploration,
    addExploration,
    reset,
  }
}
