<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useKeywordsStore } from '@/stores/keyword/keywords.store'
import { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { useKeywordDiscoveryTab } from '@/composables/keyword/useKeywordDiscoveryTab'
import { useArticleResults } from '@/composables/editor/useArticleResults'
import { useMoteurBasketStore } from '@/stores/article/moteur-basket.store'
import { useWorkflowNavStore } from '@/stores/ui/workflow-nav.store'
import { apiGet, apiDelete } from '@/services/api.service'
import type { RadarCacheStatus } from '@/composables/keyword/useResonanceScore'
import { log } from '@/utils/logger'
import type { SelectedArticle, Article } from '@shared/types/index.js'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import SelectedArticlePanel from '@/components/moteur/SelectedArticlePanel.vue'
import type { NavGroup } from '@/components/shared/WorkflowNav.vue'

// Phase = structure interne (gating, transition banner, smart-tab logic).
// Conservée même si la nav-app utilise désormais NavGroup.
interface Phase {
  id: string
  label: string
  number: number
  tabs: { id: string; label: string; optional?: boolean; locked?: boolean }[]
}
import MoteurStrategyContext from '@/components/moteur/MoteurStrategyContext.vue'
import BasketStrip from '@/components/moteur/BasketStrip.vue'
import TabCachePanel from '@/components/moteur/TabCachePanel.vue'
import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'
import TabLoadPrompt from '@/components/moteur/TabLoadPrompt.vue'
import { useTabLoadPrompt, type LoadPromptTab } from '@/composables/moteur/useTabLoadPrompt'
import { isFinalisationUnlocked, finalisationButtonTitle as buildFinalisationButtonTitle } from '@/composables/moteur/useFinalisationGating'
import { buildTabCacheEntries } from '@/utils/tab-cache-entries'
import { provideRecapRadioGroup } from '@/composables/ui/useRecapRadioGroup'

// Phase ① Générer
import KeywordDiscoveryTab from '@/components/moteur/KeywordDiscoveryTab.vue'
import DouleurIntentScanner from '@/components/intent/DouleurIntentScanner.vue'
import type { RadarKeyword, RadarCard } from '@shared/types/intent.types.js'

// Phase ② Valider
import CaptainValidation from '@/components/moteur/CaptainValidation.vue'
import LieutenantsSelection from '@/components/moteur/LieutenantsSelection.vue'
import LexiqueExtraction from '@/components/moteur/LexiqueExtraction.vue'
import FinalisationRecap from '@/components/moteur/FinalisationRecap.vue'

import { useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const cocoonsStore = useCocoonsStore()
const keywordsStore = useKeywordsStore()
const strategyStore = useCocoonStrategyStore()
const articleKeywordsStore = useArticleKeywordsStore()
const articleProgressStore = useArticleProgressStore()
const { reset: resetDiscovery, checkCacheForSeed, wordGroups: discoveryWordGroups } = useKeywordDiscoveryTab()
const { clearResults, loadCachedResults } = useArticleResults({
  onRadarLoaded: (result) => {
    radarScanResult.value = { globalScore: result.globalScore, heatLevel: result.heatLevel }
  },
})
const basketStore = useMoteurBasketStore()
const workflowNavStore = useWorkflowNavStore()

provideRecapRadioGroup()

const selectedArticle = ref<SelectedArticle | null>(null)

// --- Cannibalization detection ---
const capitainesMap = ref<Record<string, string>>({})

function refreshCapitainesMap() {
  if (!cocoonName.value) return
  apiGet<Record<string, string>>(`/cocoons/${encodeURIComponent(cocoonName.value)}/capitaines`)
    .then(data => { capitainesMap.value = data })
    .catch(err => { log.warn('[MoteurView] refreshCapitainesMap failed', { error: err }) })
}

// Sprint — handler du bouton "Vider le cache" intégré au TabCachePanel.
// Purge les entrées api_cache (autocomplete, PAA, SERP, validate) liées au
// capitaine de l'article courant. Ne touche pas aux *_explorations (DB persistée).
async function clearExternalCacheForArticle() {
  const id = selectedArticle.value?.id
  if (!id) return
  try {
    const res = await apiDelete<{ cleared: number }>(`/articles/${id}/external-cache`)
    log.info('[MoteurView] external cache cleared', { articleId: id, cleared: res.cleared })
  } catch (err) {
    log.warn('[MoteurView] clearExternalCacheForArticle failed', { articleId: id, error: err })
  }
}

// 2026-04-30 — Comptes réels des explorations persistées en DB pour le TabCachePanel.
// L'endpoint GET /articles/:id/explorations/counts existe déjà (cf.
// server/routes/article-explorations.routes.ts) mais n'était pas consommé par
// MoteurView, ce qui faisait afficher DB 0 même avec des données réelles.
// Fix : on fetch au mount, à chaque changement d'article et après chaque check.
const explorationCounts = ref<{
  radar?: number
  captain?: number
  lieutenants?: number
  lexique?: number
}>({})

async function refreshExplorationCounts() {
  const id = selectedArticle.value?.id
  if (!id) {
    explorationCounts.value = {}
    return
  }
  try {
    const counts = await apiGet<Record<string, number>>(`/articles/${id}/explorations/counts`)
    explorationCounts.value = counts
    log.debug('[MoteurView] exploration counts refreshed', { articleId: id, counts })
  } catch (err) {
    log.warn('[MoteurView] refreshExplorationCounts failed', { articleId: id, error: err })
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

function emitCheckCompleted(check: string) {
  const id = selectedArticle.value?.id
  if (!id) return
  articleProgressStore.addCheck(id, check).catch(err =>
    log.warn('[MoteurView] addCheck failed', { articleId: id, check, error: err }),
  )
  if (check === 'capitaine_locked') refreshCapitainesMap()
  // Tab cache : un check signe une mutation côté DB (capitaine validé,
  // lieutenants verrouillés, lexique validé) → recharger les counts.
  refreshExplorationCounts()
}

function handleCheckRemoved(check: string) {
  const id = selectedArticle.value?.id
  if (!id) return
  articleProgressStore.removeCheck(id, check).catch(err =>
    log.warn('[MoteurView] removeCheck failed', { articleId: id, check, error: err }),
  )
  refreshExplorationCounts()
  if (check === 'capitaine_locked') refreshCapitainesMap()
}

const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const cocoonName = computed(() => cocoon.value?.name ?? '')

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: cocoon.value?.siloName ?? 'Silo' },
  { label: cocoon.value?.name ?? 'Cocon', to: `/cocoon/${cocoonId.value}` },
  { label: 'Moteur' },
])

const cocoonSlug = computed(() =>
  (cocoon.value?.name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
)

const proposedArticles = computed(() =>
  strategyStore.strategy?.proposedArticles ?? [],
)

// Mapping ProposedArticle → Article pour <MoteurContextRecap> qui attend Article[].
// Les ProposedArticle viennent de la strategy (cocoon-level brainstorm) et ne sont
// pas encore persistés ; on synthétise les champs Article minimaux que le recap
// utilise (id/slug/title/type/keyword/painPoint).
const suggestedArticlesForRecap = computed<Article[]>(() =>
  proposedArticles.value.map(p => ({
    id: p.dbId,
    title: p.title,
    type: p.type,
    slug: p.suggestedSlug,
    topic: null,
    status: 'à rédiger' as const,
    phase: 'proposed' as const,
    completedChecks: [],
    suggestedKeyword: p.suggestedKeyword || null,
    captainKeywordLocked: null,
    painPoint: p.painPoint || null,
  })),
)

const publishedArticles = computed(() =>
  cocoon.value?.articles ?? [],
)

const pilierKeyword = computed(() =>
  keywordsStore.keywords.find(k => k.type === 'Pilier')?.keyword ?? cocoon.value?.name ?? '',
)

// Discovery/Radar tabs are only available when keywords are NOT validated
const isDiscoveryAllowed = computed(() => {
  if (!selectedArticle.value) return true
  const articleKw = selectedArticle.value.keyword
  if (!articleKw) return true
  const kw = keywordsStore.keywords.find(
    k => k.keyword.toLowerCase() === articleKw.toLowerCase(),
  )
  return !kw || kw.status === 'suggested'
})

// --- Phase navigation ---
// Bloc 2 — 'finalisation' ajouté comme onglet dédié de Phase ③ (cf.
// docs/moteur-data-flow.md §1). Remplace l'ancienne modale qui s'ouvrait
// depuis un bouton non gardé.
const TAB_IDS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique', 'finalisation'] as const
type Tab = typeof TAB_IDS[number]
const activeTab = ref<Tab>('capitaine')

// Track which tabs have been visited — v-if creates them lazily, v-show keeps them alive
const visitedTabs = ref<Record<string, boolean>>({ capitaine: true })
watch(activeTab, (tab) => { visitedTabs.value[tab] = true })

// Sprint 1.3/5.1 — contextual next-tab button. Shows "Continuer vers {TabSuivant}"
// at the bottom of every tab so the user can chain phases without hunting for a CTA.
const TAB_LABELS: Record<Tab, string> = {
  discovery: 'Discovery',
  radar: 'Radar',
  capitaine: 'Capitaine',
  lieutenants: 'Lieutenants',
  lexique: 'Lexique',
  finalisation: 'Finalisation',
}
const nextTab = computed<Tab | null>(() => {
  const idx = TAB_IDS.indexOf(activeTab.value)
  if (idx < 0 || idx >= TAB_IDS.length - 1) return null
  return TAB_IDS[idx + 1] ?? null
})

function navigateToRedaction() {
  if (selectedArticle.value?.id) {
    router.push(`/cocoon/${cocoonId.value}/redaction?articleId=${selectedArticle.value.id}`)
  } else {
    router.push(`/cocoon/${cocoonId.value}/redaction`)
  }
}

const phases = computed<Phase[]>(() => [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: !isDiscoveryAllowed.value },
      { id: 'radar', label: 'Radar', optional: true, locked: !isDiscoveryAllowed.value },
    ],
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'capitaine', label: 'Capitaine' },
      { id: 'lieutenants', label: 'Lieutenants' },
      { id: 'lexique', label: 'Lexique' },
    ],
  },
  {
    id: 'finaliser',
    label: 'Finaliser',
    number: 3,
    tabs: [
      { id: 'finalisation', label: 'Finalisation' },
    ],
  },
])

const isInGenererPhase = computed(() =>
  activeTab.value === 'discovery' || activeTab.value === 'radar',
)

function setActiveTab(tabId: string) {
  if ((TAB_IDS as readonly string[]).includes(tabId)) {
    activeTab.value = tabId as Tab
  }
}

// Sprint 2.4 — PhaseTransitionBanner retiré (PHASE_CHECKS, PHASE_NEXT,
// currentPhaseId, isCurrentPhaseComplete, bannerDismissed, transitionBanner,
// showTransitionBanner supprimés). Le bouton bas-de-page "Continuer vers
// {TabSuivant}" remplace ce banner.

// --- Publish workflow nav state to AppNavbar (right slot)
// La navbar globale (AppNavbar) lit `useWorkflowNavStore` et rend la nav.
// On publie ici l'état de phases/onglets actifs ; on nettoie au unmount.
const navGroups = computed<NavGroup[]>(() =>
  phases.value.map(p => ({
    id: p.id,
    label: p.label,
    number: p.number,
    items: p.tabs.map(t => ({
      id: t.id,
      label: t.label,
      locked: t.locked || !selectedArticle.value,
      hint: !selectedArticle.value
        ? 'Sélectionnez un article ci-dessus'
        : t.locked
          ? 'Mots-clés déjà validés — onglet verrouillé'
          : undefined,
    })),
  })),
)

watch(
  [navGroups, activeTab],
  ([groups, active]) => {
    workflowNavStore.setWorkflowNav({
      workflow: 'moteur',
      activeId: active,
      groups,
      onNavigate: (id: string) => setActiveTab(id),
    })
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => { workflowNavStore.clearWorkflowNav() })

function computeSmartTab(articleId: number): Tab {
  const progress = articleProgressStore.getProgress(articleId)
  const checks = progress?.completedChecks ?? []
  if (checks.length === 0) return 'capitaine'
  // Bloc 2 — tous les verrous Phase ② posés → onglet Finalisation (récap
  // avant Rédaction). Plus pertinent que de renvoyer sur Capitaine.
  if (checks.includes('capitaine_locked') && checks.includes('lieutenants_locked') && checks.includes('lexique_validated')) return 'finalisation'
  if (checks.includes('lieutenants_locked')) return 'lexique'
  if (checks.includes('capitaine_locked')) return 'lieutenants'
  return 'capitaine'
}

function handleSelectArticle(article: SelectedArticle | null) {
  log.debug('[MoteurView] Article toggled', {
    slug: article?.slug ?? '(none)',
    keyword: article?.keyword ?? '(none)',
    title: article?.title?.substring(0, 50) ?? '(none)',
    activeTab: activeTab.value,
  })
  selectedArticle.value = article
  // Le watch sur `selectedArticle?.id` (plus haut) déclenche refreshExplorationCounts() automatiquement.

  // Navigate to the smart tab (components handle article change via their id watchers)
  const smartTab = article ? computeSmartTab(article.id) : 'capitaine'
  activeTab.value = smartTab
  visitedTabs.value[smartTab] = true

  // Sync basket with article
  basketStore.setArticle(article?.id ?? null)

  // Reset cross-tab state
  selectedLieutenantsLocal.value = []
  discoveryRadarKeywords.value = []
  radarScanResult.value = null
  radarCacheStatus.value = null
  radarCardsForCaptain.value = []
  captainRootKeywords.value = []

  // Clear previous analysis results then reload cached ones for the new article
  clearResults()

  // Fetch article-level keywords (capitaine, lieutenants, lexique).
  // Bloc 3 — fetchKeywordsMerge au lieu de fetchKeywords : la variante merge
  // fusionne sans écraser l'état mémoire et déclenche correctement la
  // restauration du container Capitaine (validationHistory). fetchKeywords
  // (replace) provoquait une race condition avec une stub-entry du watcher
  // CaptainValidation, laissant souvent 0-1 carte affichée alors que la DB
  // en contenait davantage.
  if (article) {
    articleKeywordsStore.fetchKeywordsMerge(article.id)
    loadCachedResults(article.id)

    // Check discovery + radar cache for this article's seed keyword
    const seed = article.keyword || pilierKeyword.value
    if (seed) {
      checkCacheForSeed(seed)
      apiGet<RadarCacheStatus>(`/radar-cache/check?seed=${encodeURIComponent(seed)}`)
        .then(status => { radarCacheStatus.value = status })
        .catch(() => { radarCacheStatus.value = null })
    }

  } else {
    articleKeywordsStore.$reset()
  }

  // If switching to a validated article while on an optional (discovery/radar) tab, redirect
  if (article) {
    const kw = keywordsStore.keywords.find(
      k => k.keyword.toLowerCase() === article.keyword.toLowerCase(),
    )
    const isValidated = kw && kw.status !== 'suggested'
    if (isValidated && (activeTab.value === 'discovery' || activeTab.value === 'radar')) {
      log.debug('[MoteurView] Keywords validated, redirecting from optional tab to capitaine')
      activeTab.value = 'capitaine'
    }
  }
}

// --- Cross-tab state ---
const discoveryRadarKeywords = ref<RadarKeyword[]>([])
const radarScanResult = ref<{ globalScore: number; heatLevel: string } | null>(null)
const radarCacheStatus = ref<RadarCacheStatus | null>(null)
const radarCardsForCaptain = ref<RadarCard[]>([])

function handleCardsSelected(cards: RadarCard[]) {
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
  log.info(`[MoteurView] Send ${deduped.length} radar cards to Capitaine (dedup ${cards.length - deduped.length})`)
  radarCardsForCaptain.value = deduped
  activeTab.value = 'capitaine'
}

function handleRadarScanned(payload: { globalScore: number; heatLevel: string }) {
  log.debug('[MoteurView] Radar scanned', payload)
  radarScanResult.value = payload
  emitCheckCompleted('radar_done')
}

function handleSendToRadar(keywords: RadarKeyword[]) {
  log.info(`[MoteurView] Send to radar: ${keywords.length} keywords`)
  discoveryRadarKeywords.value = keywords
  activeTab.value = 'radar'
  emitCheckCompleted('discovery_done')

  // Add to basket
  basketStore.addKeywords(keywords.map(k => ({
    keyword: k.keyword,
    source: 'discovery' as const,
    reasoning: k.reasoning,
  })))
}

function handleKeywordsCleared() {
  log.debug('[MoteurView] Keywords cleared')
  discoveryRadarKeywords.value = []
  radarScanResult.value = null
}

// --- Soft gating computeds for Phase ② sous-onglets ---
const isCaptaineLocked = computed(() => {
  const id = selectedArticle.value?.id
  if (!id) return false
  return articleProgressStore.getProgress(id)?.completedChecks?.includes('capitaine_locked') ?? false
})

const isLieutenantsLocked = computed(() => {
  const id = selectedArticle.value?.id
  if (!id) return false
  return articleProgressStore.getProgress(id)?.completedChecks?.includes('lieutenants_locked') ?? false
})

const isLexiqueValidated = computed(() => {
  const id = selectedArticle.value?.id
  if (!id) return false
  return articleProgressStore.getProgress(id)?.completedChecks?.includes('lexique_validated') ?? false
})

// Bloc 2 — Gating Finalisation/Rédaction. Logique pure extraite dans
// useFinalisationGating pour être testable unitairement (cf.
// tests/unit/composables/finalisation-gating.test.ts).
const finalisationChecksInput = computed(() => ({
  capitaineLocked: isCaptaineLocked.value,
  lieutenantsLocked: isLieutenantsLocked.value,
  lexiqueValidated: isLexiqueValidated.value,
}))

const finalisationUnlocked = computed(() => isFinalisationUnlocked(finalisationChecksInput.value))
const finalisationButtonTitle = computed(() => buildFinalisationButtonTitle(finalisationChecksInput.value))

// --- Lieutenants props ---
const captainKeyword = computed(() =>
  articleKeywordsStore.keywords?.capitaine ?? selectedArticle.value?.keyword ?? null,
)

const articleLevelForLieutenants = computed(() => {
  if (!selectedArticle.value) return null
  const typeMap: Record<string, string> = { Pilier: 'pilier', Cluster: 'intermediaire', Support: 'specifique' }
  return (typeMap[selectedArticle.value.type ?? ''] ?? 'intermediaire') as 'pilier' | 'intermediaire' | 'specifique'
})

// --- Suggested keywords from strategy for CaptainValidation ---
const suggestedKeywordsForArticle = computed(() => {
  if (!selectedArticle.value) return []
  const title = selectedArticle.value.title
  const proposed = strategyStore.strategy?.proposedArticles?.find(a => a.title === title)
  return proposed?.suggestedKeywords ?? []
})

const captainRootKeywords = ref<string[]>([])

const effectiveRootKeywords = computed(() =>
  captainRootKeywords.value.length > 0
    ? captainRootKeywords.value
    : articleKeywordsStore.keywords?.rootKeywords ?? [],
)

const selectedLieutenantsLocal = ref<string[]>([])

const selectedLieutenantsForLexique = computed(() =>
  selectedLieutenantsLocal.value.length > 0
    ? selectedLieutenantsLocal.value
    : articleKeywordsStore.keywords?.lieutenants ?? [],
)

function handleLieutenantsUpdated(selected: string[]) {
  selectedLieutenantsLocal.value = selected
}

function handleSendToLieutenants(payload: { keyword: string; rootKeywords: string[] }) {
  log.info('[MoteurView] Send to Lieutenants', payload)
  captainRootKeywords.value = payload.rootKeywords
  activeTab.value = 'lieutenants'
  visitedTabs.value.lieutenants = true
}

// --- Tab cache entries for unified cache panel ---
// La construction des entrées est déléguée à `buildTabCacheEntries` (utilitaire
// pur testé), pour pouvoir bloquer toute régression du contrat dbCount = vrais
// counts DB (cf. fix bea9e4f). Voir tests/unit/utils/tab-cache-entries.test.ts.
const tabCacheEntries = computed<TabCacheEntry[]>(() => buildTabCacheEntries(
  explorationCounts.value,
  {
    activeTab: activeTab.value,
    radarScanResult: radarScanResult.value
      ? { globalScore: radarScanResult.value.globalScore }
      : null,
    radarCacheStatus: radarCacheStatus.value
      ? { exists: radarCacheStatus.value.exists, globalScore: radarCacheStatus.value.globalScore }
      : null,
    isCaptaineLocked: isCaptaineLocked.value,
    captainKeyword: captainKeyword.value ?? null,
    lockedLieutenantsCount: articleKeywordsStore.keywords?.lieutenants?.length ?? 0,
    validatedLexiqueCount: articleKeywordsStore.keywords?.lexique?.length ?? 0,
  },
))

// --- TabLoadPrompt — notification "Charger DB / Cache" par onglet ---
// Ancrée à droite du TabCachePanel. Apparaît à chaque visite d'un onglet où
// des données existent en DB ou Cache. Les loaders délèguent aux mergers
// exposés par chaque domaine pour garantir l'absence de doublons.
const radarRef = ref<{ mergeFromRadarSource: (id: string | number) => Promise<boolean> } | null>(null)
const lexiqueRef = ref<{ mergeFromDb: () => Promise<void>; hydrateFromDb: () => Promise<void> } | null>(null)

const tabLoadPrompt = useTabLoadPrompt({
  activeTab,
  selectedArticleId: computed(() => selectedArticle.value?.id ?? null),
  tabCacheEntries,
  loaders: {
    async loadFromDb(tab: LoadPromptTab) {
      const id = selectedArticle.value?.id
      if (!id) return false
      switch (tab) {
        case 'radar':
          return radarRef.value ? radarRef.value.mergeFromRadarSource(id) : false
        case 'capitaine':
        case 'lieutenants':
          await articleKeywordsStore.fetchKeywordsMerge(id)
          return true
        case 'lexique':
          if (!lexiqueRef.value) return false
          await lexiqueRef.value.mergeFromDb()
          return true
      }
      return false
    },
    async loadFromCache(tab: LoadPromptTab) {
      const seed = selectedArticle.value?.keyword || pilierKeyword.value
      if (!seed) return false
      switch (tab) {
        case 'radar':
          return radarRef.value ? radarRef.value.mergeFromRadarSource(seed) : false
        // Capitaine, Lieutenants, Lexique n'ont pas de cache séparé de la DB —
        // leur cacheCount est toujours 0 dans buildTabCacheEntries. On délègue
        // donc au merger DB pour rester safe si une future refonte change ça.
        case 'capitaine':
        case 'lieutenants':
          if (!selectedArticle.value?.id) return false
          await articleKeywordsStore.fetchKeywordsMerge(selectedArticle.value.id)
          return true
        case 'lexique':
          if (!lexiqueRef.value) return false
          await lexiqueRef.value.mergeFromDb()
          return true
      }
      return false
    },
  },
  onLoaded: () => {
    refreshExplorationCounts()
  },
})

// Top-level alias pour exposer current/isLoading directement au template.
const tabLoadPromptCurrent = tabLoadPrompt.current
const tabLoadPromptIsLoading = tabLoadPrompt.isLoading

// --- Data loading ---
async function loadData() {
  if (cocoonsStore.cocoons.length === 0) {
    await cocoonsStore.fetchCocoons()
  }

  const name = cocoonsStore.cocoons.find(c => c.id === cocoonId.value)?.name
  if (name) {
    await keywordsStore.fetchKeywordsByCocoon(name)
    if (cocoonSlug.value) {
      strategyStore.fetchStrategy(cocoonSlug.value)
    }
    refreshCapitainesMap()
  }

  strategyStore.fetchContext(cocoonId.value)
}

onMounted(() => {
  log.debug('[MoteurView] onMounted — full reset + loadData', { cocoonId: cocoonId.value })
  resetDiscovery()
  articleKeywordsStore.$reset()
  basketStore.$reset()
  discoveryRadarKeywords.value = []
  radarScanResult.value = null
  radarCacheStatus.value = null
  loadData()
})
</script>

<template>
  <div class="moteur-view">
    <Breadcrumb :items="breadcrumbItems" />

    <LoadingSpinner v-if="keywordsStore.isLoading" />

    <template v-else>
      <!-- Strategic context (Cerveau → Moteur bridge) -->
      <MoteurStrategyContext
        v-if="strategyStore.strategicContext"
        :cible="strategyStore.strategicContext.cible"
        :douleur="strategyStore.strategicContext.douleur"
        :angle="strategyStore.strategicContext.angle"
        :promesse="strategyStore.strategicContext.promesse"
        :cta="strategyStore.strategicContext.cta"
      />

      <!-- Context Recap: proposed + published articles -->
      <MoteurContextRecap
        :suggested-articles="suggestedArticlesForRecap"
        :published-articles="publishedArticles"
        :selected-slug="selectedArticle?.slug ?? null"
        :capitaines-map="capitainesMap"
        @select="handleSelectArticle"
      />

      <!-- Selected article panel -->
      <SelectedArticlePanel
        v-if="selectedArticle"
        :article="selectedArticle"
      />

      <!-- Article gating message -->
      <div v-if="!selectedArticle" class="article-gate">
        <p class="article-gate-message">Sélectionnez un article ci-dessus pour accéder au Moteur.</p>
      </div>

      <!-- Phase navigation rendue dans la navbar via useWorkflowNavStore (voir setWorkflowNav ci-dessous). -->

      <!-- Lock banner for Phase ① Générer -->
      <div
        v-if="selectedArticle && !isDiscoveryAllowed && isInGenererPhase"
        class="lock-banner"
      >
        <p class="lock-banner-message">
          Les onglets Discovery et Radar sont verrouillés car des mots-clés sont déjà validés pour cet article.
        </p>
        <button class="lock-banner-link" @click="activeTab = 'capitaine'">
          Voir le Capitaine &rarr;
        </button>
      </div>

      <!-- Sprint 2.4 — PhaseTransitionBanner retiré. Le bouton bas-de-page
           "Continuer vers {TabSuivant}" remplace ce banner d'attention. -->

      <!-- Basket strip (persistent across tabs) -->
      <BasketStrip
        v-if="selectedArticle && !basketStore.isEmpty"
        :keywords="basketStore.keywords"
        @remove="basketStore.removeKeyword"
        @clear="basketStore.clear"
      />

      <!-- Unified cache panel — sticky bottom, toujours visible quand un article est sélectionné.
           Conditions plus restrictives retirées pour que les `C=0` (caches lus mais vides) restent
           perceptibles : prouve que la lecture a bien eu lieu. Le bouton "Vider le cache" est intégré
           dans la carte (visible uniquement quand cacheTotal > 0). -->
      <!-- Wrapper sticky : TabCachePanel + TabLoadPrompt côte à côte, solidaires.
           Le wrapper gère le sticky bottom unique pour les deux composants ;
           chaque composant ne sait rien de l'autre. -->
      <div v-if="selectedArticle" class="cache-bar">
        <TabCachePanel
          :entries="tabCacheEntries"
          :active-tab="activeTab"
          :show-clear-cache="true"
          @navigate="setActiveTab"
          @clear-cache="clearExternalCacheForArticle"
        />
        <!-- 2026-05-01 — Notification "Charger DB / Cache" pour l'onglet courant.
             Mêmes codes visuels que le TabCachePanel (extension naturelle). -->
        <TabLoadPrompt
          v-if="tabLoadPromptCurrent"
          :prompt="tabLoadPromptCurrent"
          :is-loading="tabLoadPromptIsLoading"
          @load-db="tabLoadPrompt.loadFromDb"
          @load-cache="tabLoadPrompt.loadFromCache"
          @dismiss="tabLoadPrompt.dismiss"
        />
      </div>

      <!-- Tab content (only when article is selected) -->
      <template v-if="selectedArticle">
        <!-- Phase ① Générer — Discovery -->
        <!-- Sprint 1.2 — PainTranslator retiré du workflow (toujours dispo dans LaboView pour expérimenter). -->
        <div v-if="visitedTabs.discovery" v-show="activeTab === 'discovery'" class="tab-content">
          <KeywordDiscoveryTab
            mode="workflow"
            :pilier-keyword="cocoon?.name ?? pilierKeyword"
            :article-id="selectedArticle?.id ?? null"
            :article-title="selectedArticle?.title ?? ''"
            :article-keyword="selectedArticle?.keyword ?? ''"
            :article-pain-point="selectedArticle?.painPoint ?? ''"
            :article-type="selectedArticle?.type"
            :cocoon-name="cocoonName"
            :cocoon-theme="cocoon?.siloName"
            @send-to-radar="handleSendToRadar"
          />
        </div>

        <!-- Phase ① Générer — Radar -->
        <div v-if="visitedTabs.radar" v-show="activeTab === 'radar'" class="tab-content">
          <DouleurIntentScanner
            ref="radarRef"
            mode="workflow"
            :pilier-keyword="cocoon?.name ?? pilierKeyword"
            :article-id="selectedArticle?.id ?? null"
            :article-topic="selectedArticle?.title ?? ''"
            :article-keyword="selectedArticle?.keyword ?? ''"
            :article-pain-point="selectedArticle?.painPoint ?? ''"
            :article-level="articleLevelForLieutenants ?? 'intermediaire'"
            :injected-keywords="discoveryRadarKeywords"
            @scanned="handleRadarScanned"
            @keywords-cleared="handleKeywordsCleared"
            @cards-selected="handleCardsSelected"
          />
        </div>

        <!-- Phase ② Valider — Capitaine -->
        <div v-if="visitedTabs.capitaine" v-show="activeTab === 'capitaine'" class="tab-content">
          <CaptainValidation
            :selected-article="selectedArticle"
            mode="workflow"
            :initial-locked="isCaptaineLocked"
            :suggested-keywords="suggestedKeywordsForArticle"
            :radar-cards="radarCardsForCaptain"
            @check-completed="emitCheckCompleted"
            @check-removed="handleCheckRemoved"
            @send-to-lieutenants="handleSendToLieutenants"
          />
        </div>

        <!-- Phase ② Valider — Lieutenants (gating souple : nécessite Capitaine verrouillé) -->
        <div v-if="visitedTabs.lieutenants" v-show="activeTab === 'lieutenants'" class="tab-content">
          <LieutenantsSelection
            :selected-article="selectedArticle"
            :mode="'workflow'"
            :captain-keyword="captainKeyword"
            :article-level="articleLevelForLieutenants"
            :isCaptaineLocked="isCaptaineLocked"
            :word-groups="discoveryWordGroups"
            :root-keywords="effectiveRootKeywords"
            :initial-locked="isLieutenantsLocked"
            :cocoon-slug="cocoonSlug"
            @check-completed="emitCheckCompleted"
            @check-removed="handleCheckRemoved"
            @lieutenants-updated="handleLieutenantsUpdated"
          />
        </div>

        <!-- Phase ② Valider — Lexique (gating souple : nécessite Capitaine verrouillé) -->
        <div v-if="visitedTabs.lexique" v-show="activeTab === 'lexique'" class="tab-content">
          <div v-if="!isCaptaineLocked" class="soft-gate-message">
            <p>Verrouillez d'abord le Capitaine pour débloquer les actions Lexique.</p>
          </div>
          <LexiqueExtraction
            ref="lexiqueRef"
            :selected-article="selectedArticle"
            :captain-keyword="captainKeyword"
            :article-level="articleLevelForLieutenants"
            :selected-lieutenants="selectedLieutenantsForLexique"
            :isCaptaineLocked="isCaptaineLocked"
            :initial-locked="isLexiqueValidated"
            :cocoon-slug="cocoonSlug"
            @check-completed="emitCheckCompleted"
            @check-removed="handleCheckRemoved"
          />
        </div>

        <!-- Phase ③ Finaliser — récap lecture seule (Capitaine + Lieutenants + Lexique)
             Bloc 2 — onglet dédié remplaçant l'ancienne modale. Toujours
             accessible via la nav, mais le bouton "Continuer vers la Rédaction"
             est désactivé tant que les 3 verrous Phase ② ne sont pas posés. -->
        <div v-if="visitedTabs.finalisation" v-show="activeTab === 'finalisation'" class="tab-content">
          <FinalisationRecap
            :selected-article="selectedArticle"
            @navigate-redaction="navigateToRedaction"
          />
        </div>
      </template>

      <!-- Bottom navigation -->
      <!-- Bloc 2 — bouton "Continuer vers la Rédaction" sur le dernier onglet
           (finalisation). Désactivé tant que les 3 checks Phase ② manquent ;
           le tooltip natif HTML liste ce qui manque encore. -->
      <div class="bottom-nav">
        <RouterLink :to="`/cocoon/${cocoonId}`" class="btn-back">&larr; Retour au cocon</RouterLink>
        <button
          v-if="nextTab"
          type="button"
          class="btn btn-primary"
          data-testid="cta-next-tab"
          @click="setActiveTab(nextTab)"
        >Continuer vers {{ TAB_LABELS[nextTab] }} &rarr;</button>
        <button
          v-else
          type="button"
          class="btn btn-primary"
          data-testid="cta-redaction"
          :disabled="!finalisationUnlocked"
          :title="finalisationButtonTitle"
          @click="navigateToRedaction"
        >Continuer vers la R&eacute;daction &rarr;</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.moteur-view {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* --- Sticky cache bar : TabCachePanel + TabLoadPrompt côte à côte ---
   Le wrapper porte le sticky bottom + fond blanc opaque + ombre. Les enfants
   gardent leur DA verte (gradient + border-radius) pour rester visuellement
   solidaires. */
.cache-bar {
  position: fixed;
  left: 50%;
  bottom: 0.75rem;
  transform: translateX(-50%);
  z-index: 50;
  max-width: min(1200px, calc(100vw - 2rem));
  display: inline-flex;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.25rem;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
  opacity: 0.92;
  transition: opacity 0.15s;
  pointer-events: auto;
}
.cache-bar:hover { opacity: 1; }

/* --- Article gate --- */
.article-gate {
  margin-bottom: 1rem;
  padding: 1.25rem 1.5rem;
  background: var(--color-block-info-bg);
  border: 1px solid var(--color-block-info-border);
  border-radius: 8px;
  text-align: center;
}

.article-gate-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text);
}

/* --- Lock banner --- */
.lock-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 8px;
}

.lock-banner-message {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.lock-banner-link {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.lock-banner-link:hover {
  background: var(--color-primary);
  color: white;
}

/* --- Soft gate message --- */
.soft-gate-message {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 8px;
}

.soft-gate-message p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.content-disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* --- Subtab placeholder --- */
.subtab-placeholder {
  padding: 2rem;
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.subtab-placeholder-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.subtab-placeholder-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* --- Tab content --- */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.btn-primary {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  text-decoration: none;
}

/* Bloc 2 — état désactivé du bouton "Continuer vers la Rédaction" quand
   les 3 verrous Phase ② ne sont pas tous posés. Pattern aligné avec
   CaptainLockPanel.vue. */
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Empty & Navigation --- */
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.bottom-nav {
  margin-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-back {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-decoration: none;
}

.btn-back:hover {
  color: var(--color-primary);
  text-decoration: none;
}

</style>
