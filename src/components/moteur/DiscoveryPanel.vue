<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useDiscoveryPanel } from '@/composables/keyword/useDiscoveryPanel'
import { useCaptainTriggerStore } from '@/stores/ui/captain-trigger.store'
import { articleTypeToLevel } from '@/composables/keyword/useCapitaineScan'
import AiPanel from '@/components/moteur/ai-panel/AiPanel.vue'
import DiscoveryWordGroupsSidebar from '@/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue'
import DiscoveryAnalysisResults from '@/components/moteur/discovery/DiscoveryAnalysisResults.vue'
import DiscoverySourcesList from '@/components/moteur/discovery/DiscoverySourcesList.vue'
import KeywordDiscoveryCacheBar from '@/components/moteur/discovery/KeywordDiscoveryCacheBar.vue'
import KeywordDiscoveryRelevanceToggle from '@/components/moteur/discovery/KeywordDiscoveryRelevanceToggle.vue'
import type { AiPanelState } from '@/composables/moteur/useAiPanel'
import { log } from '@/utils/logger'
import type { DiscoverySource, DiscoveredKeyword } from '@shared/types/discovery-tab.types'
import type { RadarKeyword } from '@shared/types/intent.types'
import type { DiscoveryContext } from '@shared/types/discovery-cache.types'
import type { ArticleType } from '@shared/types/article.types.js'

const props = withDefaults(defineProps<{
  pilierKeyword: string
  articleId?: number | null
  articleTitle?: string
  articleKeyword?: string
  articlePainPoint?: string
  articleType?: string
  cocoonName?: string
  cocoonTheme?: string
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const emit = defineEmits<{
  (e: 'send-to-radar', keywords: RadarKeyword[]): void
}>()

const {
  suggestAlphabetKw,
  suggestQuestionsKw,
  suggestIntentsKw,
  suggestPrepositionsKw,
  aiKeywords,
  dataforseoKeywords,
  suggestLoading,
  aiLoading,
  dataforseoLoading,
  isAnyLoading,
  wordGroups,
  wordGroupsLoading,
  activeGroupFilter,
  error,
  selectedCount,
  hasResults,
  // Relevance filter
  relevanceFilterEnabled,
  semanticLoading,
  irrelevantCount,
  scoringProgress,
  uniqueKeywordCount,
  relevantCount,
  toggleRelevanceFilter,
  isRelevant,
  filteringSuspect,
  // Multi-source
  getKeywordSources,
  isMultiSource,
  // Actions
  discover,
  filteredList,
  toggleSelect,
  isSelected,
  selectAllInSource,
  deselectAllInSource,
  isAllSourceSelected,
  setGroupFilter,
  getRadarKeywords,
  // AI Analysis
  analysisResult,
  analysisLoading,
  analyzeResults,
  // Analysis selection
  selectAllAnalysis,
  deselectAllAnalysis,
  isAllAnalysisSelected,
  // Cache
  cacheStatus,
  cacheLoading,
  checkCacheForSeed,
  loadFromCache,
  saveToCache,
  clearCacheForSeed,
  reset,
} = useDiscoveryPanel()

const seedInput = ref(props.articleKeyword || props.pilierKeyword)
const hasDiscovered = ref(hasResults.value)

// Collapsed state per source section
const collapsed = ref<Record<string, boolean>>({})

function isCollapsed(key: string): boolean {
  return collapsed.value[key] ?? false
}

function toggleCollapsed(key: string) {
  collapsed.value[key] = !isCollapsed(key)
}

// P3 — Pagination simple : une liste de plus de VISIBLE_THRESHOLD items est
// rendue tronquée jusqu'à clic explicite sur « Tout afficher ». Évite le DOM
// lourd sur les gros secteurs (SEO local, e-commerce) sans dépendance externe.
const VISIBLE_THRESHOLD = 100
const expandedSections = ref<Record<string, boolean>>({})

function isSectionExpanded(key: string): boolean {
  return expandedSections.value[key] ?? false
}

function toggleSectionExpanded(key: string) {
  expandedSections.value[key] = !isSectionExpanded(key)
}

function visibleItems<T>(list: T[], key: string): T[] {
  if (list.length <= VISIBLE_THRESHOLD || isSectionExpanded(key)) return list
  return list.slice(0, VISIBLE_THRESHOLD)
}

// Single watcher: article keyword change → pre-fill, pilier change → full reset
watch(
  [() => props.pilierKeyword, () => props.articleKeyword],
  ([pilierKw, articleKw], [prevPilierKw, prevArticleKw]) => {
    // Article toggled (new article selected or deselected)
    if (articleKw !== prevArticleKw) {
      const newSeed = articleKw || pilierKw
      log.debug('[Discovery] Article keyword changed', { articleKw, prevArticleKw, newSeed })
      seedInput.value = newSeed
      return
    }
    // Cocoon changed (different pilier)
    if (pilierKw !== prevPilierKw) {
      log.debug('[Discovery] Pilier keyword changed, resetting', { old: prevPilierKw, new: pilierKw })
      seedInput.value = articleKw || pilierKw
      reset()
      hasDiscovered.value = false
    }
  },
)

function handleDiscover() {
  if (!seedInput.value.trim()) return
  log.info('Discovery: lancement avec seed', { seed: seedInput.value.trim(), mode: props.mode })
  hasDiscovered.value = true
  if (props.mode === 'libre') {
    discover(seedInput.value.trim())
  } else {
    discover(
      seedInput.value.trim(),
      props.articleTitle,
      props.articleKeyword,
      props.articlePainPoint,
    )
  }
}

function handleToggleSource(source: DiscoverySource) {
  if (isAllSourceSelected(source)) {
    deselectAllInSource(source)
  } else {
    selectAllInSource(source)
  }
}

const captainTrigger = useCaptainTriggerStore()
function handleKeywordClick(keyword: string) {
  const alreadySelected = isSelected(keyword)
  toggleSelect(keyword)
  const articleId = props.articleId
  if (!articleId) return
  if (!alreadySelected) {
    captainTrigger.schedule(
      keyword,
      articleId,
      articleTypeToLevel((props.articleType as ArticleType) ?? 'Intermédiaire'),
      props.articlePainPoint || undefined,
    )
  } else {
    captainTrigger.cancel(keyword)
  }
}
// Do NOT cancelAll on unmount — the user may just be switching tabs.
// The store is global and the toast continues to show the countdown.
onBeforeUnmount(() => {})

function handleSendToRadar() {
  const keywords = getRadarKeywords()
  log.info(`Discovery: envoi de ${keywords.length} mots-clés au Radar`)
  emit('send-to-radar', keywords)
}

function handleGroupClick(word: string) {
  if (activeGroupFilter.value === word) {
    setGroupFilter(null) // toggle off
  } else {
    setGroupFilter(word)
  }
}

function formatVolume(vol: number | undefined): string {
  if (vol == null) return '—'
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`
  return vol.toString()
}

// Source sections config
interface SourceSection {
  key: DiscoverySource
  icon: string
  label: string
  list: DiscoveredKeyword[]
  loading: boolean
  showReasoning: boolean
  showKpis: boolean
}

const sections = computed<SourceSection[]>(() => [
  { key: 'suggest-alphabet', icon: '🔤', label: 'Alphabet (A-Z)', list: suggestAlphabetKw.value, loading: suggestLoading.value, showReasoning: false, showKpis: false },
  { key: 'suggest-questions', icon: '❓', label: 'Questions', list: suggestQuestionsKw.value, loading: suggestLoading.value, showReasoning: false, showKpis: false },
  { key: 'suggest-intents', icon: '🎯', label: 'Intent Modifiers', list: suggestIntentsKw.value, loading: suggestLoading.value, showReasoning: false, showKpis: false },
  { key: 'suggest-prepositions', icon: '🔗', label: 'Prepositions', list: suggestPrepositionsKw.value, loading: suggestLoading.value, showReasoning: false, showKpis: false },
  { key: 'ai', icon: '🤖', label: 'IA Claude', list: aiKeywords.value, loading: aiLoading.value, showReasoning: true, showKpis: false },
  { key: 'dataforseo', icon: '📊', label: 'DataForSEO', list: dataforseoKeywords.value, loading: dataforseoLoading.value, showReasoning: false, showKpis: true },
])

function sourceCountLabel(keyword: string): string | null {
  const sources = getKeywordSources(keyword)
  return sources.length >= 2 ? `\u00d7${sources.length}` : null
}

// --- Cache ---
function buildContext(): DiscoveryContext {
  return {
    cocoonName: props.cocoonName ?? '',
    cocoonTheme: props.cocoonTheme,
    articleTitle: props.articleTitle,
    articleKeyword: props.articleKeyword,
    articleType: props.articleType as DiscoveryContext['articleType'],
    painPoint: props.articlePainPoint,
    seedKeyword: seedInput.value.trim(),
  }
}

// Check cache when seed input changes (debounced)
let cacheCheckTimer: ReturnType<typeof setTimeout> | null = null
watch(seedInput, (val) => {
  if (cacheCheckTimer) clearTimeout(cacheCheckTimer)
  cacheCheckTimer = setTimeout(() => {
    checkCacheForSeed(val)
  }, 400)
})

// Auto-save when all loading finishes
watch(
  [suggestLoading, aiLoading, dataforseoLoading, semanticLoading],
  ([sl, al, dl, seml], [prevSl, prevAl, prevDl, prevSeml]) => {
    const wasLoading = prevSl || prevAl || prevDl || prevSeml
    const nowDone = !sl && !al && !dl && !seml
    if (wasLoading && nowDone && hasResults.value) {
      saveToCache(buildContext())
    }
  },
)

async function handleLoadFromCache() {
  const loaded = await loadFromCache(seedInput.value)
  if (loaded) {
    hasDiscovered.value = true
  }
}

async function handleClearCache() {
  await clearCacheForSeed(seedInput.value)
  reset()
  hasDiscovered.value = false
}

async function handleAnalyze() {
  await analyzeResults()
  // Re-save to persist analysis results
  if (analysisResult.value) {
    saveToCache(buildContext())
  }
}

function handleToggleAnalysisSelectAll() {
  if (isAllAnalysisSelected()) {
    deselectAllAnalysis()
  } else {
    selectAllAnalysis()
  }
}

const aiPanelState = computed<AiPanelState>(() => {
  if (error.value) return 'error'
  if (analysisLoading.value) return 'streaming'
  if (analysisResult.value) return 'success'
  return 'idle'
})

const aiCtaDisabled = computed(() =>
  !hasResults.value || semanticLoading.value || relevantCount.value === 0,
)

const aiIdleMessage = computed(() => {
  if (!hasResults.value) {
    return 'Lance d\'abord une découverte de mots-clés ci-dessus, puis l\'IA pourra analyser et te proposer une sélection stratégique.'
  }
  if (semanticLoading.value) {
    return 'Filtrage de pertinence en cours… L\'analyse IA sera disponible une fois le filtrage terminé.'
  }
  if (relevantCount.value === 0) {
    return 'Aucun mot-clé pertinent à analyser. Élargis ta recherche ou désactive le filtre de pertinence.'
  }
  return `Prêt à analyser ${relevantCount.value} mot${relevantCount.value > 1 ? 's' : ''}-clé${relevantCount.value > 1 ? 's' : ''} pertinent${relevantCount.value > 1 ? 's' : ''}.`
})

const aiCtaLabel = computed(() => {
  if (!hasResults.value || relevantCount.value === 0) return 'Analyser les résultats pertinents'
  return `Analyser les ${relevantCount.value} résultat${relevantCount.value > 1 ? 's' : ''} pertinent${relevantCount.value > 1 ? 's' : ''}`
})
</script>

<template>
  <div class="discovery-layout">
    <!-- Main content -->
    <div class="discovery-main">
      <!-- Input row -->
      <div class="discovery-input">
        <label class="discovery-input__label">Mot-clé racine</label>
        <div class="discovery-input__row">
          <input
            v-model="seedInput"
            class="discovery-input__field"
            placeholder="Ex: design émotionnel"
            @keydown.enter="handleDiscover"
          />
          <button
            class="discovery-input__btn"
            :disabled="!seedInput.trim() || isAnyLoading"
            @click="handleDiscover"
          >
            {{ isAnyLoading ? 'Recherche...' : 'Découvrir' }}
          </button>
        </div>
        <p v-if="props.articleTitle" class="discovery-input__context">
          Article : {{ props.articleTitle }}
          <span v-if="props.articlePainPoint"> · Douleur : {{ props.articlePainPoint }}</span>
        </p>

        <KeywordDiscoveryCacheBar
          :cache-status="cacheStatus"
          :has-discovered="hasDiscovered"
          :cache-loading="cacheLoading"
          @load="handleLoadFromCache"
          @clear="handleClearCache"
        />
      </div>

      <KeywordDiscoveryRelevanceToggle
        v-if="hasDiscovered"
        :relevance-filter-enabled="relevanceFilterEnabled"
        :unique-keyword-count="uniqueKeywordCount"
        :relevant-count="relevantCount"
        :irrelevant-count="irrelevantCount"
        :semantic-loading="semanticLoading"
        :scoring-progress="scoringProgress"
        @toggle="toggleRelevanceFilter"
      />

      <!-- Filtering suspect warning -->
      <div v-if="filteringSuspect && !semanticLoading" class="filtering-suspect-warning">
        <strong>Attention :</strong> le filtrage de pertinence semble ne pas avoir fonctionné
        ({{ relevantCount }}/{{ uniqueKeywordCount }} mots-clés conservés).
        Les appels API de scoring ont probablement échoué. Vérifiez votre clé API Claude ou relancez la découverte.
      </div>

      <!-- Active filter indicator -->
      <div v-if="activeGroupFilter" class="filter-indicator">
        Filtre actif : <strong>{{ activeGroupFilter }}</strong>
        <button class="filter-indicator__clear" @click="setGroupFilter(null)">Effacer</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="discovery-error">{{ error }}</p>

      <!-- U1 — Source sections : toujours affichées, même vides avec placeholder -->
      <DiscoverySourcesList
        :sections="sections"
        :filtered-list="filteredList"
        :visible-items="visibleItems"
        :is-collapsed="isCollapsed"
        :is-section-expanded="isSectionExpanded"
        :is-selected="isSelected"
        :is-multi-source="isMultiSource"
        :is-relevant="isRelevant"
        :is-all-source-selected="isAllSourceSelected"
        :source-count-label="sourceCountLabel"
        :format-volume="formatVolume"
        :has-discovered="hasDiscovered"
        :visible-threshold="VISIBLE_THRESHOLD"
        @toggle-collapsed="toggleCollapsed"
        @toggle-source="handleToggleSource"
        @keyword-click="handleKeywordClick"
        @toggle-section-expanded="toggleSectionExpanded"
      />

      <div class="discovery-sources">
        <!-- Empty state global : aucune source n'a rien trouvé après découverte -->
        <p
          v-if="hasDiscovered && !isAnyLoading && !hasResults"
          class="discovery-empty"
        >
          Aucun mot-clé trouvé. Essayez un autre mot-clé racine.
        </p>
      </div>

      <AiPanel
        variant="suggestion"
        title="Analyse IA Discovery"
        subtitle="Sélection intelligente des 20-30 mots-clés les plus stratégiques (groupes, métriques, douleur)."
        :state="aiPanelState"
        :error="error"
        :trigger-disabled="aiCtaDisabled"
        :cta-label="aiCtaLabel"
        regen-label="Relancer l'analyse"
        regen-confirm-message="Relancer l'analyse IA ? Cela consommera un appel Claude."
        data-testid="discovery-ai-panel"
        @trigger="handleAnalyze"
      >
        <DiscoveryAnalysisResults
          v-if="analysisResult"
          :analysis-result="analysisResult"
          :is-all-analysis-selected="isAllAnalysisSelected"
          :is-selected="isSelected"
          :is-multi-source="isMultiSource"
          :source-count-label="sourceCountLabel"
          @toggle-select="toggleSelect"
          @toggle-select-all="handleToggleAnalysisSelectAll"
        />
        <template #idle>
          <p class="discovery-ai-idle" data-testid="discovery-ai-idle">{{ aiIdleMessage }}</p>
        </template>
      </AiPanel>
    </div>

    <!-- Sidebar: Word Groups -->
    <DiscoveryWordGroupsSidebar
      v-if="hasDiscovered"
      :word-groups="wordGroups"
      :word-groups-loading="wordGroupsLoading"
      :has-results="hasResults"
      :active-group-filter="activeGroupFilter"
      @group-click="handleGroupClick"
    />

    <!-- Sticky bottom bar -->
    <Transition name="slide-up">
      <div v-if="selectedCount > 0" class="discovery-bar">
        <span class="discovery-bar__count">{{ selectedCount }} mot(s)-clé(s) sélectionné(s)</span>
        <button class="discovery-bar__btn" @click="handleSendToRadar">
          Envoyer au Radar →
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* --- Layout with sidebar --- */
.discovery-layout {
  display: flex;
  gap: 16px;
  padding-bottom: 72px;
  min-height: 400px;
}

.discovery-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* --- Filtering suspect warning --- */
.filtering-suspect-warning {
  padding: 8px 12px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #92400e;
  line-height: 1.5;
}

/* --- Filter indicator --- */
.filter-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-primary);
}

.filter-indicator__clear {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  text-decoration: underline;
}

.filter-indicator__clear:hover {
  color: var(--color-text);
}

/* --- Input --- */
.discovery-input__label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.discovery-input__row {
  display: flex;
  gap: 8px;
}

.discovery-input__field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--color-bg-elevated);
  color: var(--color-text);
}

.discovery-input__field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.discovery-input__btn {
  padding: 8px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.discovery-input__btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.discovery-input__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.discovery-input__context {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 6px;
}

/* --- Error --- */
.discovery-error {
  color: var(--color-error);
  font-size: 0.8125rem;
  padding: 8px 12px;
  background: var(--color-block-warning-bg);
  border-radius: 6px;
}

.discovery-sources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discovery-ai-idle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* --- Sticky bottom bar --- */
.discovery-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 24px;
  background: var(--color-bg-elevated);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.discovery-bar__count {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.discovery-bar__btn {
  padding: 10px 28px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.discovery-bar__btn:hover {
  background: var(--color-primary-hover);
}

/* --- Empty state --- */
.discovery-empty {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  padding: 24px;
}

/* --- Transition --- */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
