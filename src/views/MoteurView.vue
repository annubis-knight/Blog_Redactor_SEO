<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useKeywordsStore } from '@/stores/keywords.store'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article-progress.store'
import { useKeywordDiscoveryTab } from '@/composables/useKeywordDiscoveryTab'
import { useArticleResults } from '@/composables/useArticleResults'
import { useMoteurBasketStore } from '@/stores/moteur-basket.store'
import { apiGet } from '@/services/api.service'
import type { RadarCacheStatus } from '@/composables/useResonanceScore'
import { log } from '@/utils/logger'
import type { SelectedArticle } from '@shared/types/index.js'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import SelectedArticlePanel from '@/components/moteur/SelectedArticlePanel.vue'
import MoteurPhaseNavigation from '@/components/moteur/MoteurPhaseNavigation.vue'
import type { Phase } from '@/components/moteur/MoteurPhaseNavigation.vue'
import PhaseTransitionBanner from '@/components/moteur/PhaseTransitionBanner.vue'
import MoteurStrategyContext from '@/components/moteur/MoteurStrategyContext.vue'
import BasketStrip from '@/components/moteur/BasketStrip.vue'
import TabCachePanel from '@/components/moteur/TabCachePanel.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

// Phase ① Générer
import KeywordDiscoveryTab from '@/components/moteur/KeywordDiscoveryTab.vue'
import DouleurIntentScanner from '@/components/intent/DouleurIntentScanner.vue'
import PainTranslator from '@/components/intent/PainTranslator.vue'
import type { TranslatedKeyword, RadarKeyword, RadarCard } from '@shared/types/intent.types.js'

// Phase ② Valider
import CaptainValidation from '@/components/moteur/CaptainValidation.vue'
import LieutenantsSelection from '@/components/moteur/LieutenantsSelection.vue'
import LexiqueExtraction from '@/components/moteur/LexiqueExtraction.vue'

const route = useRoute()
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

const selectedArticle = ref<SelectedArticle | null>(null)

function emitCheckCompleted(check: string) {
  const slug = selectedArticle.value?.slug
  if (!slug) return
  articleProgressStore.addCheck(slug, check)
}

function handleCheckRemoved(check: string) {
  const slug = selectedArticle.value?.slug
  if (!slug) return
  articleProgressStore.removeCheck(slug, check)
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
const activeTab = ref<Tab>('discovery')

// Track which tabs have been visited — v-if creates them lazily, v-show keeps them alive
const visitedTabs = ref<Record<string, boolean>>({ discovery: true })
watch(activeTab, (tab) => { visitedTabs.value[tab] = true })

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

// --- Phase transition banner ---
const PHASE_CHECKS: Record<string, string[]> = {
  generer: ['discovery_done', 'radar_done'],
  valider: ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'],
}

const PHASE_NEXT: Record<string, { phaseLabel: string; firstTab: Tab }> = {
  generer: { phaseLabel: 'Valider', firstTab: 'capitaine' },
}

const currentPhaseId = computed(() => {
  const tab = activeTab.value
  if (tab === 'discovery' || tab === 'radar') return 'generer'
  return 'valider'
})

const isCurrentPhaseComplete = computed(() => {
  const slug = selectedArticle.value?.slug
  if (!slug) return false
  const checks = articleProgressStore.getProgress(slug)?.completedChecks ?? []
  const required = PHASE_CHECKS[currentPhaseId.value]
  if (!required) return false
  return required.every(c => checks.includes(c))
})

const bannerDismissed = ref(false)

watch(currentPhaseId, () => { bannerDismissed.value = false })
watch(() => selectedArticle.value?.slug, () => { bannerDismissed.value = false })

const transitionBanner = computed(() => {
  if (!isCurrentPhaseComplete.value) return null

  const next = PHASE_NEXT[currentPhaseId.value]
  if (next) {
    const phase = phases.value.find(p => p.id === currentPhaseId.value)
    return {
      message: `Phase ${phase?.label ?? currentPhaseId.value} complète — passer à ${next.phaseLabel} ?`,
      actionLabel: `Passer à ${next.phaseLabel}`,
      firstTab: next.firstTab,
    }
  }

  // Completion banner — last phase, no next phase
  return {
    message: 'Validation complète — tous les mots-clés sont prêts pour la rédaction !',
    actionLabel: undefined as string | undefined,
    firstTab: undefined as Tab | undefined,
  }
})

const showTransitionBanner = computed(() =>
  transitionBanner.value !== null && !bannerDismissed.value,
)

function handleSelectArticle(article: SelectedArticle | null) {
  log.debug('[MoteurView] Article toggled', {
    slug: article?.slug ?? '(none)',
    keyword: article?.keyword ?? '(none)',
    title: article?.title?.substring(0, 50) ?? '(none)',
    activeTab: activeTab.value,
  })
  selectedArticle.value = article

  // Reset visited tabs so components are re-created for the new article context
  visitedTabs.value = { [activeTab.value]: true }

  // Sync basket with article
  basketStore.setArticle(article?.slug ?? null)

  // Reset cross-tab state
  selectedLieutenantsLocal.value = []
  discoveryRadarKeywords.value = []
  radarScanResult.value = null
  radarCardsForCaptain.value = []

  // Clear previous analysis results then reload cached ones for the new article
  clearResults()

  // Fetch article-level keywords (capitaine, lieutenants, lexique)
  if (article) {
    articleKeywordsStore.fetchKeywords(article.slug)
    loadCachedResults(article.slug)

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
const translatedKeywords = ref<TranslatedKeyword[]>([])
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

function handleTranslated(keywords: TranslatedKeyword[]) {
  translatedKeywords.value = keywords

  // Add to basket
  basketStore.addKeywords(keywords.map(k => ({
    keyword: k.keyword,
    source: 'pain-translator' as const,
    reasoning: k.reasoning,
  })))
}

// --- Soft gating computeds for Phase ② sous-onglets ---
const isCaptaineLocked = computed(() => {
  const slug = selectedArticle.value?.slug
  if (!slug) return false
  return articleProgressStore.getProgress(slug)?.completedChecks?.includes('capitaine_locked') ?? false
})

const isLieutenantsLocked = computed(() => {
  const slug = selectedArticle.value?.slug
  if (!slug) return false
  return articleProgressStore.getProgress(slug)?.completedChecks?.includes('lieutenants_locked') ?? false
})

const isLexiqueValidated = computed(() => {
  const slug = selectedArticle.value?.slug
  if (!slug) return false
  return articleProgressStore.getProgress(slug)?.completedChecks?.includes('lexique_validated') ?? false
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

const selectedLieutenantsLocal = ref<string[]>([])

const selectedLieutenantsForLexique = computed(() =>
  selectedLieutenantsLocal.value.length > 0
    ? selectedLieutenantsLocal.value
    : articleKeywordsStore.keywords?.lieutenants ?? [],
)

function handleLieutenantsUpdated(selected: string[]) {
  selectedLieutenantsLocal.value = selected
}

// --- Tab cache entries for unified cache panel ---
const tabCacheEntries = computed(() => [
  {
    tabId: 'discovery',
    tabLabel: 'Discovery',
    hasCachedData: discoveryHasResults.value || (discoveryCacheStatus.value?.cached ?? false),
    summary: discoveryCacheStatus.value?.cached
      ? `${discoveryCacheStatus.value.keywordCount ?? '?'} mots-clés`
      : discoveryHasResults.value
        ? 'Résultats en mémoire'
        : undefined,
    isCurrentTab: activeTab.value === 'discovery',
  },
  {
    tabId: 'radar',
    tabLabel: 'Radar',
    hasCachedData: radarScanResult.value !== null || (radarCacheStatus.value?.cached ?? false),
    summary: radarScanResult.value
      ? `Score ${radarScanResult.value.globalScore}/100`
      : radarCacheStatus.value?.cached
        ? `Score ${radarCacheStatus.value.globalScore}/100 (cache)`
        : undefined,
    isCurrentTab: activeTab.value === 'radar',
  },
  {
    tabId: 'capitaine',
    tabLabel: 'Capitaine',
    hasCachedData: false,
    summary: undefined,
    isCurrentTab: activeTab.value === 'capitaine',
  },
  {
    tabId: 'lieutenants',
    tabLabel: 'Lieutenants',
    hasCachedData: false,
    summary: undefined,
    isCurrentTab: activeTab.value === 'lieutenants',
  },
  {
    tabId: 'lexique',
    tabLabel: 'Lexique',
    hasCachedData: false,
    summary: undefined,
    isCurrentTab: activeTab.value === 'lexique',
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
  }

  strategyStore.fetchContext(cocoonId.value)
}

onMounted(() => {
  log.debug('[MoteurView] onMounted — full reset + loadData', { cocoonId: cocoonId.value })
  resetDiscovery()
  articleKeywordsStore.$reset()
  basketStore.$reset()
  translatedKeywords.value = []
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
        :proposed-articles="proposedArticles"
        :published-articles="publishedArticles"
        :selected-slug="selectedArticle?.slug ?? null"
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

      <!-- Phase navigation -->
      <MoteurPhaseNavigation
        :phases="phases"
        :active-tab="activeTab"
        :disabled="!selectedArticle"
        @update:active-tab="setActiveTab"
      />

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

      <!-- Phase transition banner -->
      <PhaseTransitionBanner
        v-if="showTransitionBanner"
        :message="transitionBanner!.message"
        :action-label="transitionBanner!.actionLabel"
        @navigate="transitionBanner?.firstTab && setActiveTab(transitionBanner.firstTab)"
        @dismiss="bannerDismissed = true"
      />

      <!-- Basket strip (persistent across tabs) -->
      <BasketStrip
        v-if="selectedArticle && !basketStore.isEmpty"
        :keywords="basketStore.keywords"
        @remove="basketStore.removeKeyword"
        @clear="basketStore.clear"
      />

      <!-- Unified cache panel (shows which tabs have previous results) -->
      <TabCachePanel
        v-if="selectedArticle && tabCacheEntries.some(e => e.hasCachedData && !e.isCurrentTab)"
        :entries="tabCacheEntries"
        :active-tab="activeTab"
        @navigate="setActiveTab"
      />

      <!-- Tab content (only when article is selected) -->
      <template v-if="selectedArticle">
        <!-- Phase ① Générer — Discovery (includes PainTranslator) -->
        <div v-if="visitedTabs.discovery" v-show="activeTab === 'discovery'" class="tab-content">
          <KeywordDiscoveryTab
            mode="workflow"
            :pilier-keyword="cocoon?.name ?? pilierKeyword"
            :article-title="selectedArticle?.title ?? ''"
            :article-keyword="selectedArticle?.keyword ?? ''"
            :article-pain-point="selectedArticle?.painPoint ?? ''"
            :article-type="selectedArticle?.type"
            :cocoon-name="cocoonName"
            :cocoon-theme="cocoon?.siloName"
            @send-to-radar="handleSendToRadar"
          />

          <!-- Pain Translator section embedded in Discovery -->
          <CollapsableSection title="Traduction Sémantique" :default-open="false">
            <PainTranslator
              mode="workflow"
              :initial-pain-text="selectedArticle?.painPoint ?? ''"
              :suggested-keyword="selectedArticle?.keyword ?? ''"
              @translated="handleTranslated"
            />
          </CollapsableSection>
        </div>

        <!-- Phase ① Générer — Radar -->
        <div v-if="visitedTabs.radar" v-show="activeTab === 'radar'" class="tab-content">
          <DouleurIntentScanner
            mode="workflow"
            :pilier-keyword="cocoon?.name ?? pilierKeyword"
            :article-topic="selectedArticle?.title ?? ''"
            :article-keyword="selectedArticle?.keyword ?? ''"
            :article-pain-point="selectedArticle?.painPoint ?? ''"
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
            :initial-locked="isLieutenantsLocked"
            :cocoon-slug="cocoonSlug"
            @check-completed="emitCheckCompleted"
            @check-removed="handleCheckRemoved"
            @lieutenants-updated="handleLieutenantsUpdated"
          />
        </div>

        <!-- Phase ② Valider — Lexique (gating souple : nécessite Lieutenants verrouillés) -->
        <div v-if="visitedTabs.lexique" v-show="activeTab === 'lexique'" class="tab-content">
          <div v-if="!isLieutenantsLocked" class="soft-gate-message">
            <p>Verrouillez d'abord les Lieutenants pour débloquer les actions Lexique.</p>
          </div>
          <LexiqueExtraction
            :selected-article="selectedArticle"
            :captain-keyword="captainKeyword"
            :article-level="articleLevelForLieutenants"
            :selected-lieutenants="selectedLieutenantsForLexique"
            :is-lieutenants-locked="isLieutenantsLocked"
            :initial-locked="isLexiqueValidated"
            :cocoon-slug="cocoonSlug"
            @check-completed="emitCheckCompleted"
            @check-removed="handleCheckRemoved"
          />
        </div>
      </template>

      <!-- Bottom navigation -->
      <div class="bottom-nav">
        <RouterLink :to="`/cocoon/${cocoonId}`" class="btn-back">&larr; Retour au cocon</RouterLink>
        <RouterLink :to="`/cocoon/${cocoonId}/redaction`" class="btn btn-primary">
          Continuer vers la Rédaction &rarr;
        </RouterLink>
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
</style>
