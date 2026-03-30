<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useKeywordsStore } from '@/stores/keywords.store'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'
import { useIntentStore } from '@/stores/intent.store'
import { useLocalStore } from '@/stores/local.store'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article-progress.store'
import { useKeywordScoring } from '@/composables/useKeywordScoring'
import { useKeywordDiscoveryTab } from '@/composables/useKeywordDiscoveryTab'
import { useNlpAnalysis } from '@/composables/useNlpAnalysis'
import { useArticleResults } from '@/composables/useArticleResults'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { SelectedArticle } from '@shared/types/index.js'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import MoteurContextRecap from '@/components/moteur/MoteurContextRecap.vue'
import SelectedArticlePanel from '@/components/moteur/SelectedArticlePanel.vue'
import MoteurPhaseNavigation from '@/components/moteur/MoteurPhaseNavigation.vue'
import type { Phase } from '@/components/moteur/MoteurPhaseNavigation.vue'
import PhaseTransitionBanner from '@/components/moteur/PhaseTransitionBanner.vue'
import MoteurStrategyContext from '@/components/moteur/MoteurStrategyContext.vue'

// Phase ① Générer
import KeywordDiscoveryTab from '@/components/moteur/KeywordDiscoveryTab.vue'
import DouleurIntentScanner from '@/components/intent/DouleurIntentScanner.vue'
import PainTranslator from '@/components/intent/PainTranslator.vue'
import type { TranslatedKeyword, RadarKeyword } from '@shared/types/intent.types.js'

// Phase ② Valider
import PainValidation from '@/components/intent/PainValidation.vue'
import ExplorationInput from '@/components/intent/ExplorationInput.vue'
import IntentStep from '@/components/intent/IntentStep.vue'
import ExplorationVerdict from '@/components/intent/ExplorationVerdict.vue'
import AutocompleteValidation from '@/components/intent/AutocompleteValidation.vue'
import KeywordAuditTable from '@/components/keywords/KeywordAuditTable.vue'
import KeywordComparison from '@/components/keywords/KeywordComparison.vue'
import KeywordEditor from '@/components/keywords/KeywordEditor.vue'
import DiscoveryPanel from '@/components/keywords/DiscoveryPanel.vue'
import LocalComparisonStep from '@/components/intent/LocalComparisonStep.vue'
import MapsStep from '@/components/local/MapsStep.vue'

// Phase ③ Assigner
import KeywordBadge from '@/components/shared/KeywordBadge.vue'
import KeywordMigrationPreview from '@/components/keywords/KeywordMigrationPreview.vue'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'

const route = useRoute()
const cocoonsStore = useCocoonsStore()
const keywordsStore = useKeywordsStore()
const auditStore = useKeywordAuditStore()
const intentStore = useIntentStore()
const localStore = useLocalStore()
const strategyStore = useCocoonStrategyStore()
const articleKeywordsStore = useArticleKeywordsStore()
const articleProgressStore = useArticleProgressStore()
const { getScoreColor, getScoreLabel } = useKeywordScoring()
const { reset: resetDiscovery } = useKeywordDiscoveryTab()
const { resetResults: resetNlpResults } = useNlpAnalysis()
const { clearResults, loadCachedResults } = useArticleResults()

const selectedArticle = ref<SelectedArticle | null>(null)

function emitCheckCompleted(check: string) {
  const slug = selectedArticle.value?.slug
  if (!slug) return
  articleProgressStore.addCheck(slug, check)
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
const TAB_IDS = ['discovery', 'douleur-intent', 'douleur', 'validation', 'exploration', 'audit', 'local', 'assignation'] as const
type Tab = typeof TAB_IDS[number]
const activeTab = ref<Tab>('discovery')

const phases = computed<Phase[]>(() => [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: !isDiscoveryAllowed.value },
      { id: 'douleur-intent', label: 'Douleur Intent', optional: true, locked: !isDiscoveryAllowed.value },
      { id: 'douleur', label: 'Douleur' },
    ],
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'validation', label: 'Validation' },
      { id: 'exploration', label: 'Exploration' },
      { id: 'audit', label: 'Audit' },
      { id: 'local', label: 'Local' },
    ],
  },
  {
    id: 'assigner',
    label: 'Assigner',
    number: 3,
    tabs: [
      { id: 'assignation', label: 'Assignation' },
    ],
  },
])

const isInGenererPhase = computed(() =>
  activeTab.value === 'discovery' || activeTab.value === 'douleur-intent' || activeTab.value === 'douleur',
)

function setActiveTab(tabId: string) {
  if ((TAB_IDS as readonly string[]).includes(tabId)) {
    activeTab.value = tabId as Tab
  }
}

// --- Phase transition banner ---
const PHASE_CHECKS: Record<string, string[]> = {
  generer: ['discovery_done', 'radar_done'],
  valider: ['intent_done', 'audit_done', 'local_done'],
  assigner: ['captain_chosen', 'assignment_done'],
}

const PHASE_NEXT: Record<string, { phaseLabel: string; firstTab: Tab }> = {
  generer: { phaseLabel: 'Valider', firstTab: 'validation' },
  valider: { phaseLabel: 'Assigner', firstTab: 'assignation' },
}

const currentPhaseId = computed(() => {
  const tab = activeTab.value
  if (tab === 'discovery' || tab === 'douleur-intent' || tab === 'douleur') return 'generer'
  if (tab === 'validation' || tab === 'exploration' || tab === 'audit' || tab === 'local') return 'valider'
  return 'assigner'
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
  const next = PHASE_NEXT[currentPhaseId.value]
  if (!next) return null
  const phase = phases.value.find(p => p.id === currentPhaseId.value)
  return {
    message: `Phase ${phase?.label ?? currentPhaseId.value} complète — passer à ${next.phaseLabel} ?`,
    actionLabel: `Passer à ${next.phaseLabel}`,
    firstTab: next.firstTab,
  }
})

const showTransitionBanner = computed(() =>
  isCurrentPhaseComplete.value && !bannerDismissed.value && transitionBanner.value !== null,
)

function handleSelectArticle(article: SelectedArticle | null) {
  log.debug('[MoteurView] Article toggled', {
    slug: article?.slug ?? '(none)',
    keyword: article?.keyword ?? '(none)',
    title: article?.title?.substring(0, 50) ?? '(none)',
    activeTab: activeTab.value,
  })
  selectedArticle.value = article

  // Clear previous analysis results then reload cached ones for the new article
  clearResults()

  // Fetch article-level keywords (capitaine, lieutenants, lexique)
  if (article) {
    articleKeywordsStore.fetchKeywords(article.slug)
    loadCachedResults(article.slug)
  } else {
    articleKeywordsStore.$reset()
  }

  // If switching to a validated article while on an optional (discovery/radar) tab, redirect
  if (article) {
    const kw = keywordsStore.keywords.find(
      k => k.keyword.toLowerCase() === article.keyword.toLowerCase(),
    )
    const isValidated = kw && kw.status !== 'suggested'
    if (isValidated && (activeTab.value === 'discovery' || activeTab.value === 'douleur-intent')) {
      log.debug('[MoteurView] Keywords validated, redirecting from optional tab to validation')
      activeTab.value = 'validation'
    }
  }
}

// --- Cross-tab state ---
const discoveryRadarKeywords = ref<RadarKeyword[]>([])
const radarScanResult = ref<{ globalScore: number; heatLevel: string } | null>(null)
const translatedKeywords = ref<TranslatedKeyword[]>([])

function handleRadarScanned(payload: { globalScore: number; heatLevel: string }) {
  log.debug('[MoteurView] Radar scanned', payload)
  radarScanResult.value = payload
  emitCheckCompleted('radar_done')
}

function handleSendToRadar(keywords: RadarKeyword[]) {
  log.info(`[MoteurView] Send to radar: ${keywords.length} keywords`)
  discoveryRadarKeywords.value = keywords
  activeTab.value = 'douleur-intent'
  emitCheckCompleted('discovery_done')
}

function handleKeywordsCleared() {
  log.debug('[MoteurView] Keywords cleared')
  discoveryRadarKeywords.value = []
  radarScanResult.value = null
}

function handleTranslated(keywords: TranslatedKeyword[]) {
  translatedKeywords.value = keywords
}

// --- Exploration ---
function handleExplore(keyword: string) {
  intentStore.exploreKeyword(keyword)
}

function handleValidationSelect(keyword: string) {
  log.debug('[MoteurView] Validation select → exploration', { keyword })
  activeTab.value = 'exploration'
  intentStore.exploreKeyword(keyword)
}

function handleExplorationContinue() {
  activeTab.value = 'audit'
  emitCheckCompleted('intent_done')
}

// --- Exploration → Audit ---
async function handleAddToAudit(keyword: string) {
  log.info(`[MoteurView] Add to audit: "${keyword}"`)
  try {
    await auditStore.addKeyword(keyword, cocoonName.value, 'Longue traine')
    await auditStore.fetchAudit(cocoonName.value, false)
  } catch {
    // keyword may already exist in audit
  }
}

// --- Keyword migration (Phase ③ Assigner) ---
const showMigration = ref(false)
const migrationPreview = ref<{ assignments: any[]; warnings: string[] } | null>(null)
const isApplyingMigration = ref(false)
const migrationError = ref<string | null>(null)

async function startMigration() {
  if (!cocoonName.value) return
  migrationError.value = null
  try {
    const data = await apiPost<{ cocoonName: string; assignments: any[]; warnings: string[] }>(
      `/keywords/migrate/${encodeURIComponent(cocoonName.value)}/preview`,
      {},
    )
    migrationPreview.value = data
    showMigration.value = true
  } catch (err) {
    migrationError.value = (err as Error).message
  }
}

async function handleApplyMigration(assignments: any[]) {
  isApplyingMigration.value = true
  migrationError.value = null
  if (!cocoonName.value) return
  try {
    await apiPost(`/keywords/migrate/${encodeURIComponent(cocoonName.value)}/apply`, { assignments })
    showMigration.value = false
    migrationPreview.value = null
    emitCheckCompleted('captain_chosen')
    emitCheckCompleted('assignment_done')
  } catch (err) {
    migrationError.value = (err as Error).message
  } finally {
    isApplyingMigration.value = false
  }
}

function cancelMigration() {
  showMigration.value = false
  migrationPreview.value = null
  migrationError.value = null
}

// --- Keywords by type (Phase ③ Assigner) ---
const pilierKeywords = computed(() =>
  keywordsStore.keywords.filter(k => k.type === 'Pilier'),
)
const moyenneKeywords = computed(() =>
  keywordsStore.keywords.filter(k => k.type === 'Moyenne traine' || k.type === 'Intermédiaire'),
)
const longueKeywords = computed(() =>
  keywordsStore.keywords.filter(k => k.type === 'Longue traine' || k.type === 'Spécialisé'),
)

function getTypeScore(type: string) {
  return auditStore.typeScores.find(ts => ts.type === type)
}

// --- Audit ---
const showComparison = ref(false)
const comparisonKeyword = ref('')
const showEditor = ref(false)

function openComparison(keyword: string) {
  comparisonKeyword.value = keyword
  showComparison.value = true
}

function closeComparison() {
  showComparison.value = false
  comparisonKeyword.value = ''
}

function openEditor() {
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
}

async function handleKeywordChange() {
  await auditStore.fetchAudit(cocoonName.value, false)
  emitCheckCompleted('audit_done')
}

function handleLocalContinue() {
  emitCheckCompleted('local_done')
}

// --- Data loading ---
async function loadData() {
  if (cocoonsStore.cocoons.length === 0) {
    await cocoonsStore.fetchCocoons()
  }

  const name = cocoonsStore.cocoons.find(c => c.id === cocoonId.value)?.name
  if (name) {
    await keywordsStore.fetchKeywordsByCocoon(name)
    auditStore.fetchCacheStatus(name)
    if (cocoonSlug.value) {
      strategyStore.fetchStrategy(cocoonSlug.value)
    }
  }

  strategyStore.fetchContext(cocoonId.value)
}

onMounted(() => {
  log.debug('[MoteurView] onMounted — full reset + loadData', { cocoonId: cocoonId.value })
  intentStore.reset()
  localStore.reset()
  auditStore.$reset()
  resetDiscovery()
  resetNlpResults()
  articleKeywordsStore.$reset()
  translatedKeywords.value = []
  discoveryRadarKeywords.value = []
  radarScanResult.value = null
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
          Les onglets Discovery et Douleur Intent sont verrouillés car des mots-clés sont déjà validés pour cet article.
        </p>
        <button class="lock-banner-link" @click="activeTab = 'audit'">
          Voir l'Audit &rarr;
        </button>
      </div>

      <!-- Phase transition banner -->
      <PhaseTransitionBanner
        v-if="showTransitionBanner"
        :message="transitionBanner!.message"
        :action-label="transitionBanner!.actionLabel"
        @navigate="setActiveTab(transitionBanner!.firstTab)"
        @dismiss="bannerDismissed = true"
      />

      <!-- Tab content (only when article is selected) -->
      <template v-if="selectedArticle">
        <!-- Phase ① Générer — Discovery -->
        <div v-if="activeTab === 'discovery'" class="tab-content">
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
        </div>

        <!-- Phase ① Générer — Douleur Intent -->
        <div v-if="activeTab === 'douleur-intent'" class="tab-content">
          <DouleurIntentScanner
            mode="workflow"
            :pilier-keyword="cocoon?.name ?? pilierKeyword"
            :article-topic="selectedArticle?.title ?? ''"
            :article-keyword="selectedArticle?.keyword ?? ''"
            :article-pain-point="selectedArticle?.painPoint ?? ''"
            :injected-keywords="discoveryRadarKeywords"
            @scanned="handleRadarScanned"
            @keywords-cleared="handleKeywordsCleared"
          />
        </div>

        <!-- Phase ① Générer — Douleur -->
        <div v-if="activeTab === 'douleur'" class="tab-content">
          <PainTranslator
            mode="workflow"
            :initial-pain-text="selectedArticle?.painPoint ?? ''"
            :suggested-keyword="selectedArticle?.keyword ?? ''"
            @explore="handleExplore"
            @translated="handleTranslated"
          />
        </div>

        <!-- Phase ② Valider — Validation -->
        <div v-if="activeTab === 'validation'" class="tab-content">
          <PainValidation
            mode="workflow"
            :translated-keywords="translatedKeywords"
            :radar-heat="radarScanResult"
            @select="handleValidationSelect"
            @back="activeTab = 'douleur'"
          />
        </div>

        <!-- Phase ② Valider — Exploration & Intention -->
        <div v-if="activeTab === 'exploration'" class="tab-content">
          <ExplorationInput mode="workflow" :default-keyword="translatedKeywords[0]?.keyword ?? activeKeyword" @explore="handleExplore" />
          <template v-if="intentStore.explorationKeyword">
            <AutocompleteValidation mode="workflow" :keyword="intentStore.explorationKeyword" @explore-keyword="handleExplore" />
            <IntentStep mode="workflow" :keyword="intentStore.explorationKeyword" />
            <ExplorationVerdict mode="workflow" @continue="handleExplorationContinue" @add-to-audit="handleAddToAudit" />
          </template>
        </div>

        <!-- Phase ② Valider — Audit -->
        <div v-if="activeTab === 'audit'" class="tab-content">
          <div class="audit-header">
            <div>
              <h3 class="audit-title">Audit des mots-clés</h3>
              <p class="audit-subtitle">{{ cocoonName }}</p>
            </div>
            <div class="audit-actions">
              <button class="btn-secondary" @click="openEditor">+ Ajouter un mot-clé</button>
              <button
                class="btn-primary"
                :disabled="auditStore.loading"
                @click="auditStore.fetchAudit(cocoonName, true)"
              >
                {{ auditStore.loading ? 'Analyse en cours...' : 'Relancer l\'audit' }}
              </button>
            </div>
          </div>

          <div v-if="auditStore.results.length > 0" class="audit-summary">
            <div
              v-for="ts in auditStore.typeScores"
              :key="ts.type"
              class="summary-card"
            >
              <div class="summary-card-header">
                <span class="summary-card-type">{{ ts.type }}</span>
                <span class="summary-card-count">{{ ts.keywordCount }} mots-clés</span>
              </div>
              <div class="summary-card-score">
                <ScoreGauge :score="ts.averageScore" :label="ts.type" size="md" />
                <span class="summary-card-label" :style="{ color: getScoreColor(ts.averageScore) }">
                  {{ getScoreLabel(ts.averageScore) }}
                </span>
              </div>
              <div v-if="ts.alertCount > 0" class="summary-card-alerts">
                {{ ts.alertCount }} alerte{{ ts.alertCount > 1 ? 's' : '' }}
              </div>
            </div>
          </div>

          <div v-if="auditStore.loading" class="audit-loading">
            <LoadingSpinner />
            <p>Analyse des mots-clés via DataForSEO...</p>
          </div>

          <ErrorMessage
            v-else-if="auditStore.error"
            :message="auditStore.error"
            @retry="auditStore.fetchAudit(cocoonName)"
          />

          <KeywordAuditTable
            v-else-if="auditStore.results.length > 0"
            :results="auditStore.results"
            :redundancies="auditStore.redundancies"
            :strategic-context="strategyStore.strategicContext"
            @compare="openComparison"
            @delete="handleKeywordChange"
          />

          <KeywordComparison
            v-if="showComparison"
            :keyword="comparisonKeyword"
            :cocoon-name="cocoonName"
            @close="closeComparison"
            @replace="handleKeywordChange"
          />

          <KeywordEditor
            v-if="showEditor"
            :cocoon-name="cocoonName"
            @close="closeEditor"
            @saved="handleKeywordChange"
          />

          <DiscoveryPanel
            v-if="cocoonName"
            :cocoon-name="cocoonName"
            @keyword-added="handleKeywordChange"
          />
        </div>

        <!-- Phase ② Valider — Local (fusionné: Local/National + Maps & GBP) -->
        <div v-if="activeTab === 'local'" class="tab-content">
          <section class="local-section">
            <h3 class="local-section-title">Comparaison Local / National</h3>
            <LocalComparisonStep mode="workflow" :keyword="activeKeyword" />
          </section>

          <section class="local-section">
            <h3 class="local-section-title">Maps &amp; GBP</h3>
            <MapsStep mode="workflow" :keyword="activeKeyword" @continue="handleLocalContinue" />
          </section>
        </div>

        <!-- Phase ③ Assigner — Assignation -->
        <div v-if="activeTab === 'assignation'" class="tab-content">
          <!-- AssignmentGate: soft message when no capitaine assigned -->
          <div v-if="!articleKeywordsStore.hasKeywords" class="assignment-gate">
            <p class="assignment-gate-message">
              Aucun mot-clé capitaine validé pour cet article.
              Passez par l'Audit pour valider vos mots-clés avant l'assignation.
            </p>
            <button class="assignment-gate-link" @click="activeTab = 'audit'">
              Aller à l'Audit &rarr;
            </button>
          </div>

          <div v-if="keywordsStore.keywords.length > 0" class="theme-keywords">
            <div class="theme-keywords-header">
              <span class="theme-keywords-title">Mots-clés de la thématique</span>
              <div class="theme-keywords-actions">
                <button class="btn-migrate-keywords" @click="startMigration">
                  Assigner les mots-clés aux articles
                </button>
                <button class="btn-improve-keywords" @click="activeTab = 'audit'">
                  Améliorer les mots-clés &rarr;
                </button>
              </div>
            </div>

            <p v-if="migrationError" class="migration-error">{{ migrationError }}</p>

            <KeywordMigrationPreview
              v-if="showMigration && migrationPreview"
              :assignments="migrationPreview.assignments"
              :warnings="migrationPreview.warnings"
              :is-applying="isApplyingMigration"
              @apply="handleApplyMigration"
              @cancel="cancelMigration"
            />

            <div v-if="pilierKeywords.length > 0" class="keywords-section">
              <div class="keywords-section-header">
                <span class="keywords-label">Courte traîne</span>
                <ScoreGauge
                  v-if="getTypeScore('Pilier')?.averageScore != null && auditStore.results.length > 0"
                  :score="getTypeScore('Pilier')!.averageScore"
                  label="Pilier"
                  size="sm"
                />
                <span v-else class="score-placeholder">Audit non effectué</span>
              </div>
              <div class="keywords-list">
                <KeywordBadge v-for="kw in pilierKeywords" :key="kw.keyword" :keyword="kw" />
              </div>
            </div>

            <div v-if="moyenneKeywords.length > 0" class="keywords-section">
              <div class="keywords-section-header">
                <span class="keywords-label">Moyenne traîne</span>
                <ScoreGauge
                  v-if="getTypeScore('Moyenne traine')?.averageScore != null && auditStore.results.length > 0"
                  :score="getTypeScore('Moyenne traine')!.averageScore"
                  label="Moy."
                  size="sm"
                />
                <span v-else class="score-placeholder">Audit non effectué</span>
              </div>
              <div class="keywords-list">
                <KeywordBadge v-for="kw in moyenneKeywords" :key="kw.keyword" :keyword="kw" />
              </div>
            </div>

            <div v-if="longueKeywords.length > 0" class="keywords-section">
              <div class="keywords-section-header">
                <span class="keywords-label">Longue traîne</span>
                <ScoreGauge
                  v-if="getTypeScore('Longue traine')?.averageScore != null && auditStore.results.length > 0"
                  :score="getTypeScore('Longue traine')!.averageScore"
                  label="Long."
                  size="sm"
                />
                <span v-else class="score-placeholder">Audit non effectué</span>
              </div>
              <div class="keywords-list">
                <KeywordBadge v-for="kw in longueKeywords" :key="kw.keyword" :keyword="kw" />
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <p>Aucun mot-clé défini pour cette thématique.</p>
          </div>
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

/* --- Assignment gate --- */
.assignment-gate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-info-bg);
  border: 1px solid var(--color-block-info-border);
  border-radius: 8px;
}

.assignment-gate-message {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.assignment-gate-link {
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

.assignment-gate-link:hover {
  background: var(--color-primary);
  color: white;
}

/* --- Tab content --- */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Local fusionné --- */
.local-section {
  margin-bottom: 1.5rem;
}

.local-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-heading);
}

/* --- Keywords section (Phase ③ Assigner) --- */
.theme-keywords {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.theme-keywords-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.theme-keywords-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.theme-keywords-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-improve-keywords {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-badge-blue-bg);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-improve-keywords:hover {
  background: var(--color-primary);
  color: white;
}

.btn-migrate-keywords {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-success);
  background: var(--color-badge-green-bg);
  border: 1px solid var(--color-success);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-migrate-keywords:hover {
  background: var(--color-success);
  color: white;
}

.migration-error {
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-error);
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: 6px;
}

.keywords-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.keywords-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.keywords-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.score-placeholder {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

/* --- Audit section --- */
.audit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.audit-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.audit-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

.audit-actions {
  display: flex;
  gap: 0.5rem;
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

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.audit-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.summary-card-type {
  font-size: 0.8125rem;
  font-weight: 600;
}

.summary-card-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.summary-card-score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.summary-card-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.summary-card-alerts {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-warning);
}

.audit-loading {
  text-align: center;
  padding: 3rem 0;
  color: var(--color-text-muted);
}

.audit-loading p {
  margin: 0.75rem 0;
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
