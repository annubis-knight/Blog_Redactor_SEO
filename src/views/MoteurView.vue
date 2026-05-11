<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useKeywordsStore } from '@/stores/keyword/keywords.store'
import { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { useDiscoveryPanel } from '@/composables/keyword/useDiscoveryPanel'
import { useArticleResults } from '@/composables/editor/useArticleResults'
import { useRadarExplorationStore } from '@/stores/article/radar-exploration.store'
import { useWorkflowNavStore } from '@/stores/ui/workflow-nav.store'
import { apiGet } from '@/services/api.service'
import type { RadarCacheStatus } from '@/composables/keyword/useResonanceScore'
import { log } from '@/utils/logger'
import type { SelectedArticle, Article } from '@shared/types/index.js'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'

import MoteurStrategyContext from '@/components/moteur/MoteurStrategyContext.vue'
import TabCachePanel from '@/components/moteur/TabCachePanel.vue'
import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'
import TabLoadPrompt from '@/components/moteur/TabLoadPrompt.vue'
import { useTabLoadPrompt, type LoadPromptTab } from '@/composables/moteur/useTabLoadPrompt'
import { useMoteurSoftGating } from '@/composables/moteur/useMoteurSoftGating'
import { useMoteurTabs } from '@/composables/moteur/useMoteurTabs'
import { useMoteurCrossTabState } from '@/composables/moteur/useMoteurCrossTabState'
import { useMoteurArticleSync } from '@/composables/moteur/useMoteurArticleSync'
import { buildTabCacheEntries } from '@/utils/tab-cache-entries'
import { provideRecapRadioGroup } from '@/composables/ui/useRecapRadioGroup'

// Phase ① Générer
import DiscoveryPanel from '@/components/moteur/DiscoveryPanel.vue'
import RadarPanel from '@/components/intent/RadarPanel.vue'

// Phase ② Valider
import CaptainPanel from '@/components/moteur/CaptainPanel.vue'
import LieutenantsPanel from '@/components/moteur/LieutenantsPanel.vue'
import LexiquePanel from '@/components/moteur/LexiquePanel.vue'
import FinalisationPanel from '@/components/moteur/FinalisationPanel.vue'

import { useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const cocoonsStore = useCocoonsStore()
const keywordsStore = useKeywordsStore()
const strategyStore = useCocoonStrategyStore()
const articleKeywordsStore = useArticleKeywordsStore()
const articleProgressStore = useArticleProgressStore()
const { reset: resetDiscovery, checkCacheForSeed, wordGroups: discoveryWordGroups } = useDiscoveryPanel()
const radarExplorationStore = useRadarExplorationStore()
const workflowNavStore = useWorkflowNavStore()

// Keep reference to recap radio to close panels when article selected
const recapRadioGroup = provideRecapRadioGroup()

const selectedArticle = ref<SelectedArticle | null>(null)


const cocoonId = computed(() => Number(route.params.cocoonId))

const cocoon = computed(() =>
  cocoonsStore.cocoons.find(c => c.id === cocoonId.value),
)

const cocoonName = computed(() => cocoon.value?.name ?? '')

// --- Article sync ---
const {
  capitainesMap,
  explorationCounts,
  refreshCapitainesMap,
  refreshExplorationCounts,
  emitCheckCompleted,
  handleCheckRemoved,
  clearExternalCacheForArticle,
} = useMoteurArticleSync({
  selectedArticle,
  cocoonName,
  articleProgressStore,
})

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
    painIntentExpected: p.painIntentExpected,
  })),
)

// FR-MOT-RECAP-PUBLISHED : la section récap "Articles publiés" ne doit afficher
// Articles `phase IN ('redaction', 'published')`. Backend filtre déjà ; lire champ filtré.
const publishedArticles = computed(() =>
  cocoon.value?.publishedArticles ?? [],
)

const pilierKeyword = computed(() =>
  keywordsStore.keywords.find(k => k.type === 'Pilier')?.keyword ?? cocoon.value?.name ?? '',
)

// --- Soft gating (Vague 3 — extracted to useMoteurSoftGating) ---
const {
  isCaptaineLocked,
  isLieutenantsLocked,
  isLexiqueValidated,
  finalisationUnlocked,
  finalisationButtonTitle,
  isDiscoveryAllowed,
} = useMoteurSoftGating({
  selectedArticle,
  articleProgressStore,
  keywordsStore,
})

// --- Phase navigation (Vague 3 — extracted to useMoteurTabs) ---
const {
  activeTab,
  visitedTabs,
  nextTab,
  isInGenererPhase,
  setActiveTab,
  computeSmartTab,
} = useMoteurTabs({
  selectedArticle,
  isDiscoveryAllowed,
  articleProgressStore,
  workflowNavStore,
})

const TAB_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  radar: 'Radar',
  capitaine: 'Capitaine',
  lieutenants: 'Lieutenants',
  lexique: 'Lexique',
  finalisation: 'Finalisation',
}

function navigateToRedaction() {
  if (selectedArticle.value?.id) {
    router.push(`/cocoon/${cocoonId.value}/redaction?articleId=${selectedArticle.value.id}`)
  } else {
    router.push(`/cocoon/${cocoonId.value}/redaction`)
  }
}

// (phases, isInGenererPhase, setActiveTab, navGroups, watcher publish,
//  onBeforeUnmount cleanup, computeSmartTab moved to useMoteurTabs above)

function handleSelectArticle(article: SelectedArticle | null) {
  log.debug('[MoteurView] Article toggled', {
    slug: article?.slug ?? '(none)',
    keyword: article?.keyword ?? '(none)',
    title: article?.title?.substring(0, 50) ?? '(none)',
    activeTab: activeTab.value,
  })
  selectedArticle.value = article

  // (Articles suggérés / publiés) pour libérer la place au contenu principal.
  if (article && recapRadioGroup.openPanelId.value !== null) {
    recapRadioGroup.toggle(recapRadioGroup.openPanelId.value)
  }
  // Le watch sur `selectedArticle?.id` (plus haut) déclenche refreshExplorationCounts() automatiquement.

  // Navigate to the smart tab (components handle article change via their id watchers)
  const smartTab = article ? computeSmartTab(article.id) : 'capitaine'
  setActiveTab(smartTab)
  visitedTabs.value[smartTab] = true

  // FR-RAD-DB-FIRST : hydrate le store radar_explorations pour l'article
  // sélectionné. Permet aux onglets Lieutenants/Lexique de proposer des
  // keywords via KeywordAssistPanel sans dépendre du basket déprécié.
  radarExplorationStore.setArticle(article?.id ?? null)

  // Reset cross-tab state (Vague 3 — déléguée au composable)
  resetCrossTabState()

  // Clear previous analysis results then reload cached ones for the new article
  clearResults()

  // Fetch article-level keywords (capitaine, lieutenants, lexique).
  // Bloc 3 — fetchKeywordsMerge au lieu de fetchKeywords : la variante merge
  // fusionne sans écraser l'état mémoire et déclenche correctement la
  // restauration du container Capitaine (exploredKeywords). fetchKeywords
  // (replace) provoquait une race condition avec une stub-entry du watcher
  // CaptainPanel, laissant souvent 0-1 carte affichée alors que la DB
  // en contenait davantage.
  //
  // bleed-through pendant la fenêtre async : entre l'instant `selectedArticle`
  // change et la résolution du fetch, `articleKeywordsStore.keywords` contient
  // encore les keywords de l'article précédent. Sans reset, `getDisplayedKeyword`
  // / `displayedCaptainKeyword` peuvent matcher la mauvaise garde `articleId`
  // si l'ancien et le nouveau articleId entrent en collision (LRU, refresh
  // partiel). Reset = état neutre, helpers retombent sur la prop figée jusqu'à
  // ce que le fetch peuple le store avec le bon `articleId`.
  if (article) {
    articleKeywordsStore.$reset()
    articleKeywordsStore.fetchKeywordsMerge(article.id)
    loadCachedResults(article.id)

    // au sélection d'article. Discovery est exclu (modèle seed-based,
    // cf. docs/moteur-data-flow.md §8bis). L'utilisateur garde le bouton
    // manuel via TabLoadPrompt en filet de secours.
    // Le radarRef peut être null au tout premier mount avant que Vue n'ait
    // résolu le ref : on attend un nextTick pour être sûr.
    void Promise.resolve().then(() => {
      if (radarRef.value && selectedArticle.value?.id === article.id) {
        radarRef.value.mergeFromRadarSource(article.id).catch((err: unknown) => {
          log.warn('[MoteurView] auto-load radar failed', { error: (err as Error).message })
        })
      }
    })

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

// --- Cross-tab state (Vague 3 — extracted to useMoteurCrossTabState) ---
const {
  discoveryRadarKeywords,
  radarScanResult,
  radarCacheStatus,
  radarCardsForCaptain,
  effectiveRootKeywords,
  selectedLieutenantsForLexique,
  handleCardsSelected,
  handleRadarScanned,
  handleSendToRadar,
  handleKeywordsCleared,
  handleSendToLieutenants,
  handleLieutenantsUpdated,
  resetCrossTabState,
} = useMoteurCrossTabState({
  selectedArticle,
  articleKeywordsStore,
  setActiveTab,
  emitCheckCompleted,
})

// useArticleResults : doit être placé APRÈS useMoteurCrossTabState pour que
// `radarScanResult` soit déjà défini quand le callback `onRadarLoaded` est
// appelé. La closure capture la Ref par référence — l'ordre matters au moment
// du call, mais TypeScript exige aussi l'ordre de déclaration.
const { clearResults, loadCachedResults } = useArticleResults({
  onRadarLoaded: (result) => {
    radarScanResult.value = { globalScore: result.globalScore, heatLevel: result.heatLevel }
  },
})

// (Soft gating computeds moved to useMoteurSoftGating composable above)

// --- Lieutenants props ---
const captainKeyword = computed(() =>
  articleKeywordsStore.keywords?.capitaine ?? selectedArticle.value?.keyword ?? null,
)

const articleLevelForLieutenants = computed(() => {
  if (!selectedArticle.value) return null
  const typeMap: Record<string, string> = { Pilier: 'pilier', Cluster: 'intermediaire', Support: 'specifique' }
  return (typeMap[selectedArticle.value.type ?? ''] ?? 'intermediaire') as 'pilier' | 'intermediaire' | 'specifique'
})

// --- Suggested keywords from strategy for CaptainPanel ---
const suggestedKeywordsForArticle = computed(() => {
  if (!selectedArticle.value) return []
  const title = selectedArticle.value.title
  const proposed = strategyStore.strategy?.proposedArticles?.find(a => a.title === title)
  return proposed?.suggestedKeywords ?? []
})

// (captainRootKeywords, effectiveRootKeywords, selectedLieutenantsLocal,
//  selectedLieutenantsForLexique, handleLieutenantsUpdated, handleSendToLieutenants
//  moved to useMoteurCrossTabState above)

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
    // Réactif : reflète immédiatement les ajouts/suppressions via le store
    // DB-first (input manuel Radar ou batch Discovery), sans attendre un
    // refresh d'explorationCounts (qui ne se déclenche qu'au switch d'article
    // et aux check workflow).
    radarGeneratedKeywordsCount: radarExplorationStore.generatedKeywords.length,
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
  radarExplorationStore.$reset()
  resetCrossTabState()
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

      <!--
           supprimé. Il dupliquait MoteurContextRecap (titre + type + douleur)
           et n'apportait que la progression, qui reste accessible via les
           ProgressDots de la navbar et les checks workflow. -->
      <!-- <SelectedArticlePanel … /> -->


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

      <!--
           "Continuer vers {TabSuivant}" remplace ce banner d'attention. -->

      <!-- BasketStrip supprimé 2026-05-11 (chantier radar-dbfirst-refactor, FR-MOT-BASKET-DEPRECATED).
           Les keywords accumulés vivent désormais en DB via radar_explorations. -->

      <!-- Unified cache panel — sticky bottom, toujours visible quand un article est sélectionné.
           Conditions plus restrictives retirées pour que les `C=0` (caches lus mais vides) restent
           perceptibles : prouve que la lecture a bien eu lieu. Le bouton "Vider le cache" est intégré
           dans la carte (visible uniquement quand cacheTotal > 0). -->
      <!-- Wrapper sticky : TabCachePanel + TabLoadPrompt côte à côte, solidaires.
           Le wrapper gère le sticky bottom unique pour les deux composants ;
           chaque composant ne sait rien de l'autre. -->
      <div v-if="selectedArticle" class="cache-bar">
        <!--
             sont devenues read-only ; la nav passe par les onglets standards. -->
        <TabCachePanel
          :entries="tabCacheEntries"
          :active-tab="activeTab"
          :show-clear-cache="true"
          @clear-cache="clearExternalCacheForArticle"
        />
        <!--
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
        <!--  -->
        <div v-if="visitedTabs.discovery" v-show="activeTab === 'discovery'" class="tab-content">
          <DiscoveryPanel
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
          <RadarPanel
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
          <CaptainPanel
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
          <LieutenantsPanel
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
          <LexiquePanel
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
          <FinalisationPanel
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
