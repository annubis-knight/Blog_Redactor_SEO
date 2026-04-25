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
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
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
const { reset: resetDiscovery, hasResults: discoveryHasResults, cacheStatus: discoveryCacheStatus, checkCacheForSeed, wordGroups: discoveryWordGroups } = useKeywordDiscoveryTab()
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

function emitCheckCompleted(check: string) {
  const id = selectedArticle.value?.id
  if (!id) return
  articleProgressStore.addCheck(id, check).catch(err =>
    log.warn('[MoteurView] addCheck failed', { articleId: id, check, error: err }),
  )
  if (check === 'capitaine_locked') refreshCapitainesMap()
}

function handleCheckRemoved(check: string) {
  const id = selectedArticle.value?.id
  if (!id) return
  articleProgressStore.removeCheck(id, check).catch(err =>
    log.warn('[MoteurView] removeCheck failed', { articleId: id, check, error: err }),
  )
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

const activeKeyword = computed(() =>
  selectedArticle.value?.keyword || pilierKeyword.value,
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
const TAB_IDS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique'] as const
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
}
const nextTab = computed<Tab | null>(() => {
  const idx = TAB_IDS.indexOf(activeTab.value)
  if (idx < 0 || idx >= TAB_IDS.length - 1) return null
  return TAB_IDS[idx + 1] ?? null
})

// --- Finalisation modal ---
// Affichée comme étape de transition douce entre Moteur (workflow de validation)
// et Rédaction (production de contenu). Permet à l'utilisateur de relire
// Capitaine + Lieutenants + Lexique en lecture seule avant de se lancer.
// Bénéfice SEO : un dernier "ai-je un cluster cohérent ?" avant 2000 mots.
const showFinalisationModal = ref(false)

function openFinalisationModal() {
  showFinalisationModal.value = true
}

function closeFinalisationModal() {
  showFinalisationModal.value = false
}

function navigateToRedaction() {
  showFinalisationModal.value = false
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
  // All Phase 2 checks done → back to capitaine (review from start)
  if (checks.includes('capitaine_locked') && checks.includes('lieutenants_locked') && checks.includes('lexique_validated')) return 'capitaine'
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

  // Fetch article-level keywords (capitaine, lieutenants, lexique)
  if (article) {
    articleKeywordsStore.fetchKeywords(article.id)
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
  log.info(`[MoteurView] Send ${cards.length} radar cards to Capitaine`)
  radarCardsForCaptain.value = cards
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
// Le composant TabCachePanel a été refondu pour distinguer la donnée persistée
// (`dbCount`, dans la table *_explorations) du cache volatile (`cacheCount`, mémoire
// ou api_cache). On adapte ici les états existants vers ce nouveau format :
//  - état "locked"/persisté → dbCount = 1
//  - état "en mémoire seul"  → cacheCount = 1
//  - sinon                   → 0/0 (rien à afficher)
const tabCacheEntries = computed<TabCacheEntry[]>(() => [
  {
    tabId: 'discovery',
    tabLabel: 'Discovery',
    dbCount: discoveryCacheStatus.value?.cached ? (discoveryCacheStatus.value.keywordCount ?? 1) : 0,
    cacheCount: discoveryHasResults.value && !discoveryCacheStatus.value?.cached ? 1 : 0,
    isCurrentTab: activeTab.value === 'discovery',
    hint: discoveryCacheStatus.value?.cached
      ? `${discoveryCacheStatus.value.keywordCount ?? '?'} mots-clés`
      : discoveryHasResults.value
        ? 'Résultats en mémoire'
        : undefined,
  },
  {
    tabId: 'radar',
    tabLabel: 'Radar',
    dbCount: radarCacheStatus.value?.exists ? 1 : 0,
    cacheCount: radarScanResult.value !== null && !radarCacheStatus.value?.exists ? 1 : 0,
    isCurrentTab: activeTab.value === 'radar',
    hint: radarScanResult.value
      ? `Score ${radarScanResult.value.globalScore}/100`
      : radarCacheStatus.value?.exists
        ? `Score ${radarCacheStatus.value.globalScore}/100 (cache)`
        : undefined,
  },
  {
    tabId: 'capitaine',
    tabLabel: 'Capitaine',
    dbCount: isCaptaineLocked.value ? 1 : 0,
    cacheCount: 0,
    isCurrentTab: activeTab.value === 'capitaine',
    hint: isCaptaineLocked.value ? `${captainKeyword.value ?? 'verrouillé'}` : undefined,
  },
  {
    tabId: 'lieutenants',
    tabLabel: 'Lieutenants',
    dbCount: isLieutenantsLocked.value ? (articleKeywordsStore.keywords?.lieutenants?.length ?? 1) : 0,
    cacheCount: 0,
    isCurrentTab: activeTab.value === 'lieutenants',
    hint: isLieutenantsLocked.value
      ? `${articleKeywordsStore.keywords?.lieutenants?.length ?? 0} lieutenants`
      : undefined,
  },
  {
    tabId: 'lexique',
    tabLabel: 'Lexique',
    dbCount: isLexiqueValidated.value ? (articleKeywordsStore.keywords?.lexique?.length ?? 1) : 0,
    cacheCount: 0,
    isCurrentTab: activeTab.value === 'lexique',
    hint: isLexiqueValidated.value
      ? `${articleKeywordsStore.keywords?.lexique?.length ?? 0} termes`
      : undefined,
  },
])

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
      <TabCachePanel
        v-if="selectedArticle"
        :entries="tabCacheEntries"
        :active-tab="activeTab"
        :show-clear-cache="true"
        sticky
        @navigate="setActiveTab"
        @clear-cache="clearExternalCacheForArticle"
      />

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
            mode="workflow"
            :pilier-keyword="cocoon?.name ?? pilierKeyword"
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
      </template>

      <!-- Bottom navigation -->
      <!-- Sprint 1.3/5.1 — contextual next-tab button. Shows the next tab in the
           phase order; on the last tab (lexique), opens the FinalisationRecap
           modal as a soft transition between Moteur and Rédaction. -->
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
          data-testid="cta-finalisation-modal"
          @click="openFinalisationModal"
        >Continuer vers la R&eacute;daction &rarr;</button>
      </div>
    </template>

    <!-- Modale Finalisation : récap lecture seule (Capitaine + Lieutenants + Lexique)
         affichée au moment de quitter le Moteur pour la Rédaction. C'est le seul
         moment "calme" du workflow où l'utilisateur voit toutes ses décisions
         ensemble — un point de contrôle stratégique avant de se lancer dans
         2000 mots de rédaction. -->
    <div
      v-if="showFinalisationModal"
      class="finalisation-backdrop"
      data-testid="finalisation-backdrop"
      @click.self="closeFinalisationModal"
    >
      <div class="finalisation-modal" role="dialog" aria-modal="true" aria-labelledby="finalisation-title">
        <button
          type="button"
          class="finalisation-modal__close"
          aria-label="Fermer"
          data-testid="finalisation-close"
          @click="closeFinalisationModal"
        >&times;</button>
        <FinalisationRecap
          :selected-article="selectedArticle"
          @navigate-redaction="navigateToRedaction"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.moteur-view {
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
}

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

/* Finalisation modal — récap avant transition Moteur → Rédaction */
.finalisation-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  padding: 1rem;
  animation: finalisation-fade-in 0.2s ease;
}

.finalisation-modal {
  position: relative;
  background: var(--color-background, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  padding: 1.5rem 2rem 2rem;
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.32);
}

.finalisation-modal__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.finalisation-modal__close:hover {
  background: var(--color-bg-soft, #f1f5f9);
  color: var(--color-text, #1e293b);
}

@keyframes finalisation-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
