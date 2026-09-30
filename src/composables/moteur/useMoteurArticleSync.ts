import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { apiGet, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import { useNotify } from '@/composables/ui/useNotify'
import { isGateBlocked } from '@/stores/ui/gate-alarm.store'
import type { useArticleProgressStore } from '@/stores/article/article-progress.store'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import type { useGateAlarmStore } from '@/stores/ui/gate-alarm.store'
import type { SelectedArticle } from '@shared/types/index.js'
import { MOTEUR_CAPITAINE_LOCKED } from '@shared/constants/workflow-checks.constants.js'

/**
 * AUTHORITY: PostgreSQL `articles.completed_checks` (via article-progress.store) ;
 *            les checks gardés passent par les portes du serveur (422 GATE_BLOCKED).
 * READS FROM: GET /articles/:id/keywords et GET /articles/:id/progress (au choix
 *            d'un article : lecture seule, `articleReady` quand les deux sont là),
 *            GET /cocoons/:name/capitaines, GET /articles/:id/explorations/counts.
 * WRITES TO: POST /articles/:id/progress/check et /uncheck (addCheck / removeCheck),
 *            jamais pendant la lecture d'un article ; DELETE /articles/:id/external-cache.
 * CONSUMERS: MoteurView (articleReady, articleLoadError, capitainesMap,
 *            explorationCounts, emitCheckCompleted, handleCheckRemoved).
 * RELATED FR: FR-MOT-CHECKS, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-MOT-RECAP-LOCK-SYNC,
 *             FR-CAP-CHECK (un refus d'une demande d'étape dépassée n'ouvre pas d'alarme),
 *             FR-MOT-CHECK-RECONCILIATION, FR-MOT-NO-AUTO-ACTION (choisir un article
 *             ne fait que relire), NFR-INT-COMPLETED-CHECKS-SSOT
 *
 * Vague 5 — Composable extrait de MoteurView.
 *
 * Encapsule la synchronisation article-side du Moteur :
 *  - lecture des données de l'article choisi (mots-clés + progression) ; les
 *    panneaux ne sont montés qu'une fois `articleReady`, et aucune étape n'est
 *    écrite avant (recette du 2026-09-30, F4)
 *  - `capitainesMap` : map keyword → article slug (cannibalization detection)
 *  - `explorationCounts` : counts DB par onglet (radar/captain/lieutenants/lexique)
 *  - `emitCheckCompleted` / `handleCheckRemoved` : delegate au progress store
 *    + refresh capitaines + counts
 *  - `clearExternalCacheForArticle` : DELETE api_cache pour le capitaine courant
 *  - watcher défensif sur `selectedArticle.id` qui rafraîchit les counts
 *
 * Dépendances explicites en paramètres → testable en isolation.
 */
export interface MoteurArticleSyncDeps {
  selectedArticle: Ref<SelectedArticle | null>
  cocoonName: ComputedRef<string>
  articleProgressStore: Pick<ReturnType<typeof useArticleProgressStore>, 'addCheck' | 'removeCheck' | 'getProgress' | 'fetchProgress'>
  /** Mots-clés de l'article : vidés puis relus à chaque choix d'article. */
  articleKeywordsStore: Pick<ReturnType<typeof useArticleKeywordsStore>, '$reset' | 'fetchKeywordsMerge' | 'loadedArticleId'>
  /**
   * Alarme graduée : un check gardé par une porte et refusé par le serveur
   * (422 `GATE_BLOCKED`) l'ouvre, puis est rejoué après dérogation.
   * FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE.
   */
  gateAlarm?: Pick<ReturnType<typeof useGateAlarmStore>, 'runThroughGate'>
}

export interface MoteurArticleSyncApi {
  /**
   * Les données enregistrées de l'article choisi (mots-clés et étapes) sont
   * relues : les panneaux peuvent être montés et juger leurs étapes.
   */
  articleReady: ComputedRef<boolean>
  /** Échec de la lecture des données de l'article choisi (message à l'écran). */
  articleLoadError: Ref<string | null>
  /** Relit les données de l'article choisi (bouton « Réessayer »). */
  reloadSelectedArticle: () => Promise<void>
  /**
   * Map articleId (number) → captain-keyword. Cohérent contrat backend
   * `/cocoons/:name/capitaines` : Record<number, string>.
   */
  capitainesMap: Ref<Record<number, string>>
  /** Counts persistés en DB par onglet pour l'article courant. */
  explorationCounts: Ref<{ radar?: number; captain?: number; lieutenants?: number; lexique?: number }>
  /** Recharge la map capitaines depuis l'API cocon. */
  refreshCapitainesMap: () => void
  /** Recharge les counts depuis l'API explorations. */
  refreshExplorationCounts: () => Promise<void>
  /** Émet un check complété + refresh capitaines (si capitaine_locked) + counts. */
  emitCheckCompleted: (check: string) => void
  /** Retire un check + refresh counts + capitaines (si capitaine_locked). */
  handleCheckRemoved: (check: string) => void
  /** DELETE api_cache lié au capitaine de l'article courant. */
  clearExternalCacheForArticle: () => Promise<void>
}

export function useMoteurArticleSync(deps: MoteurArticleSyncDeps): MoteurArticleSyncApi {
  const { selectedArticle, cocoonName, articleProgressStore, articleKeywordsStore, gateAlarm } = deps

  // --- Lecture des données de l'article choisi (FR-MOT-CHECK-RECONCILIATION) ---
  // Choisir un article ne fait que relire. Tant que ses mots-clés et ses étapes
  // ne sont pas arrivés, un store vide ne veut pas dire « rien de fait » : les
  // panneaux ne sont pas montés et aucune étape n'est écrite. Avant cela, le
  // store vidé au choix faisait retirer « Lieutenants » puis, par cascade du
  // serveur, « Structure validée », jamais rendue (recette du 2026-09-30, F4).
  const readyArticleId = ref<number | null>(null)
  const articleLoadError = ref<string | null>(null)

  const articleReady = computed(() => {
    const article = selectedArticle.value
    if (!article) return false
    // Article proposé par la stratégie mais pas encore créé en base : rien à relire.
    if (!article.id) return true
    return readyArticleId.value === article.id && articleKeywordsStore.loadedArticleId === article.id
  })

  async function loadArticleData(id: number): Promise<void> {
    readyArticleId.value = null
    articleLoadError.value = null
    articleKeywordsStore.$reset()
    const [, progress] = await Promise.all([
      articleKeywordsStore.fetchKeywordsMerge(id),
      articleProgressStore.getProgress(id) ?? articleProgressStore.fetchProgress(id),
    ])
    // Un autre article a été choisi pendant la lecture : sa propre lecture décide.
    if (selectedArticle.value?.id !== id) return
    if (articleKeywordsStore.loadedArticleId !== id || !progress) {
      articleLoadError.value = 'Les données de cet article n’ont pas pu être relues. Réessayez.'
      log.warn('[useMoteurArticleSync] lecture de l’article impossible', { articleId: id, keywords: articleKeywordsStore.loadedArticleId === id, progress: !!progress })
      return
    }
    readyArticleId.value = id
    log.debug('[useMoteurArticleSync] données de l’article relues', { articleId: id })
  }

  async function reloadSelectedArticle(): Promise<void> {
    const id = selectedArticle.value?.id
    if (id) await loadArticleData(id)
  }

  watch(
    () => selectedArticle.value?.id ?? null,
    (id) => {
      if (id) {
        void loadArticleData(id)
      } else {
        readyArticleId.value = null
        articleLoadError.value = null
        articleKeywordsStore.$reset()
      }
    },
    { immediate: true },
  )

  /** Une étape n'est écrite que sur un article relu, jamais pendant sa lecture. */
  function canWriteCheck(check: string, action: 'check' | 'uncheck'): boolean {
    if (articleReady.value) return true
    log.info('[useMoteurArticleSync] étape ignorée : données de l’article en cours de lecture', {
      articleId: selectedArticle.value?.id, check, action,
    })
    return false
  }

  const capitainesMap = ref<Record<number, string>>({})

  function refreshCapitainesMap(): void {
    if (!cocoonName.value) return
    apiGet<Record<number, string>>(`/cocoons/${encodeURIComponent(cocoonName.value)}/capitaines`)
      .then(data => { capitainesMap.value = data })
      .catch(err => { log.warn('[useMoteurArticleSync] refreshCapitainesMap failed', { error: err }) })
  }

  async function clearExternalCacheForArticle(): Promise<void> {
    const id = selectedArticle.value?.id
    if (!id) return
    try {
      const res = await apiDelete<{ cleared: number }>(`/articles/${id}/external-cache`)
      log.info('[useMoteurArticleSync] external cache cleared', { articleId: id, cleared: res.cleared })
    } catch (err) {
      log.warn('[useMoteurArticleSync] clearExternalCacheForArticle failed', { articleId: id, error: err })
    }
  }

  const explorationCounts = ref<{
    radar?: number
    captain?: number
    lieutenants?: number
    lexique?: number
  }>({})

  async function refreshExplorationCounts(): Promise<void> {
    const id = selectedArticle.value?.id
    if (!id) {
      explorationCounts.value = {}
      return
    }
    try {
      const counts = await apiGet<Record<string, number>>(`/articles/${id}/explorations/counts`)
      explorationCounts.value = counts
      log.debug('[useMoteurArticleSync] exploration counts refreshed', { articleId: id, counts })
    } catch (err) {
      log.warn('[useMoteurArticleSync] refreshExplorationCounts failed', { articleId: id, error: err })
    }
  }

  // Watch défensif : si `selectedArticle` mute par un autre chemin que
  // handleSelectArticle (refresh de page, navigation profonde), on rafraîchit
  // quand même les counts. `immediate: true` couvre le cas du mount initial.
  watch(
    () => selectedArticle.value?.id ?? null,
    () => { refreshExplorationCounts() },
    { immediate: true },
  )

  // Dernière intention par article et par étape : une demande d'étape dont la
  // réponse arrive après une demande plus récente (déverrouiller pendant que le
  // verrouillage s'enregistre) est dépassée. Son refus éventuel n'ouvre pas
  // d'alarme : le serveur a jugé un état qui n'existe plus (FR-CAP-CHECK).
  const latestIntent = new Map<string, number>()

  /** Enregistre une nouvelle intention ; renvoie « est-elle toujours la dernière ? ». */
  function recordIntent(id: number, check: string): () => boolean {
    const key = `${id}:${check}`
    const generation = (latestIntent.get(key) ?? 0) + 1
    latestIntent.set(key, generation)
    return () => latestIntent.get(key) === generation
  }

  function emitCheckCompleted(check: string): void {
    const id = selectedArticle.value?.id
    if (!id || !canWriteCheck(check, 'check')) return
    const stillWanted = recordIntent(id, check)
    const addCheck = () => articleProgressStore.addCheck(id, check)
    const attempt = gateAlarm
      ? gateAlarm.runThroughGate(id, addCheck, { stillWanted })
      : addCheck().then(() => ({ ok: true as const }))
    attempt
      .then((res) => {
        if (!res.ok) log.info('[useMoteurArticleSync] étape non validée : porte refusée', { articleId: id, check })
      })
      .catch((err) => {
        log.warn('[useMoteurArticleSync] addCheck failed', { articleId: id, check, error: err })
        // Refusée même après la décision de l'utilisateur (les données ont bougé
        // entre-temps) : il doit le savoir, pas croire l'étape validée.
        if (isGateBlocked(err)) {
          try { useNotify().warning(`Étape toujours refusée : ${err.details.blocking.length} point(s) à revoir.`) } catch { /* hors contexte Pinia */ }
        }
      })
      // La carte des capitaines et les compteurs relisent la base : on attend
      // la réponse du serveur, qui a pu refuser l'étape.
      .finally(() => {
        // Compare check constant (moteur:capitaine_locked, pas 'capitaine_locked').
        if (check === MOTEUR_CAPITAINE_LOCKED) refreshCapitainesMap()
        refreshExplorationCounts()
      })
  }

  function handleCheckRemoved(check: string): void {
    const id = selectedArticle.value?.id
    if (!id || !canWriteCheck(check, 'uncheck')) return
    recordIntent(id, check)
    articleProgressStore.removeCheck(id, check).catch(err =>
      log.warn('[useMoteurArticleSync] removeCheck failed', { articleId: id, check, error: err }),
    )
    refreshExplorationCounts()
    if (check === MOTEUR_CAPITAINE_LOCKED) refreshCapitainesMap()
  }

  return {
    articleReady,
    articleLoadError,
    reloadSelectedArticle,
    capitainesMap,
    explorationCounts,
    refreshCapitainesMap,
    refreshExplorationCounts,
    emitCheckCompleted,
    handleCheckRemoved,
    clearExternalCacheForArticle,
  }
}
