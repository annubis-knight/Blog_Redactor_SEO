import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { RadarKeyword, RadarCard } from '@shared/types/intent.types.js'
import type { SelectedArticle } from '@shared/types/index.js'
import type { RadarCacheStatus } from '@/composables/keyword/useResonanceScore'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import type { useMoteurBasketStore } from '@/stores/article/moteur-basket.store'
import { log } from '@/utils/logger'

/**
 * Vague 3 — Composable extrait de MoteurView.
 *
 * Encapsule l'état partagé entre onglets du Moteur (Discovery → Radar →
 * Capitaine → Lieutenants → Lexique) et leurs handlers d'événements
 * cross-tab.
 *
 * Implémente l'invariant FR-MOT-NO-AUTO-ACTION (aucune action auto) +
 * FR-MOT-CHECKS (émission des checks via callback `emitCheckCompleted`).
 *
 * Dépendances explicites en paramètres → testable en isolation.
 *
 * NOTE : `setActiveTab` et `emitCheckCompleted` sont injectés en callbacks
 * pour éviter le cycle composable → store → composable.
 */
export interface MoteurCrossTabStateDeps {
  selectedArticle: Ref<SelectedArticle | null>
  articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
  basketStore: ReturnType<typeof useMoteurBasketStore>
  setActiveTab: (tabId: string) => void
  emitCheckCompleted: (check: string) => void
}

export interface MoteurCrossTabStateApi {
  /** Keywords envoyés depuis Discovery vers Radar. */
  discoveryRadarKeywords: Ref<RadarKeyword[]>
  /** Résultat du dernier scan Radar (globalScore + heatLevel). Mutable depuis useArticleResults.onRadarLoaded. */
  radarScanResult: Ref<{ globalScore: number; heatLevel: string } | null>
  /** Statut du cache Radar pour le keyword courant. Mutable depuis handleSelectArticle. */
  radarCacheStatus: Ref<RadarCacheStatus | null>
  /** Cards Radar envoyées au Capitaine via "Envoyer au Capitaine". */
  radarCardsForCaptain: Ref<RadarCard[]>
  /** Root keywords envoyés depuis Capitaine vers Lieutenants. Mutable. */
  captainRootKeywords: Ref<string[]>
  /**
   * Root keywords effectifs : si l'utilisateur a explicitement envoyé un
   * payload depuis Capitaine, l'utilise ; sinon fallback sur le store.
   */
  effectiveRootKeywords: ComputedRef<string[]>
  /** Lieutenants sélectionnés localement (avant lock). */
  selectedLieutenantsLocal: Ref<string[]>
  /** Lieutenants à passer au Lexique : selection locale OU store si vide. */
  selectedLieutenantsForLexique: ComputedRef<string[]>

  /** Handlers d'événements cross-tab. */
  handleCardsSelected: (cards: RadarCard[]) => void
  handleRadarScanned: (payload: { globalScore: number; heatLevel: string }) => void
  handleSendToRadar: (keywords: RadarKeyword[]) => void
  handleKeywordsCleared: () => void
  handleSendToLieutenants: (payload: { keyword: string; rootKeywords: string[] }) => void
  handleLieutenantsUpdated: (selected: string[]) => void

  /**
   * Reset complet de l'état cross-tab. Appelé par le parent depuis
   * `handleSelectArticle` lors d'un switch d'article.
   */
  resetCrossTabState: () => void
}

export function useMoteurCrossTabState(deps: MoteurCrossTabStateDeps): MoteurCrossTabStateApi {
  const { articleKeywordsStore, basketStore, setActiveTab, emitCheckCompleted } = deps

  const discoveryRadarKeywords = ref<RadarKeyword[]>([])
  const radarScanResult = ref<{ globalScore: number; heatLevel: string } | null>(null)
  const radarCacheStatus = ref<RadarCacheStatus | null>(null)
  const radarCardsForCaptain = ref<RadarCard[]>([])
  const captainRootKeywords = ref<string[]>([])
  const selectedLieutenantsLocal = ref<string[]>([])

  const effectiveRootKeywords = computed(() =>
    captainRootKeywords.value.length > 0
      ? captainRootKeywords.value
      : articleKeywordsStore.keywords?.rootKeywords ?? [],
  )

  const selectedLieutenantsForLexique = computed(() =>
    selectedLieutenantsLocal.value.length > 0
      ? selectedLieutenantsLocal.value
      : articleKeywordsStore.keywords?.lieutenants ?? [],
  )

  function handleCardsSelected(cards: RadarCard[]): void {
    // S4 — Dédup défensive (2e niveau) : si le payload contient des doublons
    // (régression upstream possible), on les écrase ici. Card avec kpis non-null
    // (racine) prime sur card kpis null (longue-traîne).
    const seen = new Map<string, RadarCard>()
    for (const c of cards) {
      const norm = c.keyword.trim().toLowerCase()
      const existing = seen.get(norm)
      if (!existing || (existing.kpis === null && c.kpis !== null)) {
        seen.set(norm, c)
      }
    }
    const deduped = Array.from(seen.values())
    log.info(`[MoteurCrossTabState] Send ${deduped.length} radar cards to Capitaine (dedup ${cards.length - deduped.length})`)
    radarCardsForCaptain.value = deduped
    setActiveTab('capitaine')
  }

  function handleRadarScanned(payload: { globalScore: number; heatLevel: string }): void {
    log.debug('[MoteurCrossTabState] Radar scanned', payload)
    radarScanResult.value = payload
    emitCheckCompleted('radar_done')
  }

  function handleSendToRadar(keywords: RadarKeyword[]): void {
    log.info(`[MoteurCrossTabState] Send to radar: ${keywords.length} keywords`)
    discoveryRadarKeywords.value = keywords
    setActiveTab('radar')
    emitCheckCompleted('discovery_done')

    // Add to basket
    basketStore.addKeywords(keywords.map(k => ({
      keyword: k.keyword,
      source: 'discovery' as const,
      reasoning: k.reasoning,
    })))
  }

  function handleKeywordsCleared(): void {
    log.debug('[MoteurCrossTabState] Keywords cleared')
    discoveryRadarKeywords.value = []
    radarScanResult.value = null
  }

  function handleSendToLieutenants(payload: { keyword: string; rootKeywords: string[] }): void {
    log.info('[MoteurCrossTabState] Send to Lieutenants', payload)
    captainRootKeywords.value = payload.rootKeywords
    setActiveTab('lieutenants')
  }

  function handleLieutenantsUpdated(selected: string[]): void {
    selectedLieutenantsLocal.value = selected
  }

  function resetCrossTabState(): void {
    selectedLieutenantsLocal.value = []
    discoveryRadarKeywords.value = []
    radarScanResult.value = null
    radarCacheStatus.value = null
    radarCardsForCaptain.value = []
    captainRootKeywords.value = []
  }

  return {
    discoveryRadarKeywords,
    radarScanResult,
    radarCacheStatus,
    radarCardsForCaptain,
    captainRootKeywords,
    effectiveRootKeywords,
    selectedLieutenantsLocal,
    selectedLieutenantsForLexique,
    handleCardsSelected,
    handleRadarScanned,
    handleSendToRadar,
    handleKeywordsCleared,
    handleSendToLieutenants,
    handleLieutenantsUpdated,
    resetCrossTabState,
  }
}
