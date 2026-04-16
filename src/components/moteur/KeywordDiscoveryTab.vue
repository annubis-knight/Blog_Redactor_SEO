<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useKeywordDiscoveryTab } from '@/composables/keyword/useKeywordDiscoveryTab'
import { log } from '@/utils/logger'
import type { DiscoverySource, DiscoveredKeyword } from '@shared/types/discovery-tab.types'
import type { RadarKeyword } from '@shared/types/intent.types'
import type { DiscoveryContext } from '@shared/types/discovery-cache.types'

const props = withDefaults(defineProps<{
  pilierKeyword: string
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
  getRelevanceScore,
  filteringSuspect,
  // Multi-source
  SOURCE_COLORS,
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
} = useKeywordDiscoveryTab()

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

        <!-- Cache indicator -->
        <div v-if="cacheStatus?.cached && !hasDiscovered" class="cache-indicator">
          <span class="cache-indicator__badge">
            Resultats en cache
            <span v-if="cacheStatus.cachedAt" class="cache-indicator__date">
              ({{ new Date(cacheStatus.cachedAt).toLocaleDateString('fr-FR') }})
            </span>
            <span v-if="cacheStatus.keywordCount" class="cache-indicator__kw">
              · {{ cacheStatus.keywordCount }} mots-cles
            </span>
            <span v-if="cacheStatus.hasAnalysis" class="cache-indicator__analysis">
              · analyse IA incluse
            </span>
          </span>
          <button class="cache-indicator__load" :disabled="cacheLoading" @click="handleLoadFromCache">
            {{ cacheLoading ? 'Chargement...' : 'Charger' }}
          </button>
          <button class="cache-indicator__clear" @click="handleClearCache">
            Relancer
          </button>
        </div>
      </div>

      <!-- Relevance filter toggle + counter + progress -->
      <div v-if="hasDiscovered" class="relevance-toggle">
        <label class="relevance-toggle__label">
          <input
            type="checkbox"
            :checked="relevanceFilterEnabled"
            @change="toggleRelevanceFilter"
          />
          Filtre de pertinence
        </label>
        <span v-if="uniqueKeywordCount > 0" class="relevance-toggle__total">
          {{ relevantCount }} pertinents / {{ uniqueKeywordCount }} total
        </span>
        <span v-if="semanticLoading && scoringProgress.total > 0" class="relevance-toggle__scoring">
          <span class="scoring-progress">
            <span class="scoring-progress__bar">
              <span
                class="scoring-progress__fill"
                :style="{ width: Math.round((scoringProgress.scored / scoringProgress.total) * 100) + '%' }"
              />
            </span>
            <span class="scoring-progress__text">
              Filtrage {{ scoringProgress.pass }}/2 · {{ scoringProgress.scored }}/{{ scoringProgress.total }}
            </span>
          </span>
        </span>
        <span v-else-if="semanticLoading" class="relevance-toggle__scoring">
          <span class="spinner-small" /> Analyse...
        </span>
        <span v-else-if="relevanceFilterEnabled && irrelevantCount > 0" class="relevance-toggle__count">
          {{ irrelevantCount }} hors-sujet masqués
        </span>
      </div>

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

      <!-- Source sections -->
      <div v-if="hasDiscovered" class="discovery-sources">
        <template v-for="section in sections" :key="section.key">
          <section
            v-if="section.loading || section.list.length > 0"
            class="source-section"
          >
            <div class="source-header" @click="toggleCollapsed(section.key)">
              <span class="source-header__chevron" :class="{ 'source-header__chevron--open': !isCollapsed(section.key) }">▸</span>
              <span class="source-header__icon">{{ section.icon }}</span>
              <span class="source-header__title">{{ section.label }}</span>
              <span class="source-header__count">
                <template v-if="section.loading">
                  <span class="spinner-small" />
                </template>
                <template v-else>
                  ({{ filteredList(section.list).length }}<template v-if="filteredList(section.list).length !== section.list.length">/{{ section.list.length }}</template>)
                </template>
              </span>
              <label
                v-if="filteredList(section.list).length > 0"
                class="source-header__check-all"
                @click.stop
              >
                <input
                  type="checkbox"
                  :checked="isAllSourceSelected(section.key)"
                  @change="handleToggleSource(section.key)"
                />
                Tout
              </label>
            </div>
            <ul v-if="!isCollapsed(section.key) && filteredList(section.list).length > 0" class="source-list">
              <li
                v-for="kw in filteredList(section.list)"
                :key="section.key + '-' + kw.keyword"
                class="source-item"
                :class="{
                  'source-item--selected': isSelected(kw.keyword),
                  'source-item--multi': isMultiSource(kw.keyword),
                  'source-item--irrelevant': !isRelevant(kw.keyword),
                }"
                @click="toggleSelect(kw.keyword)"
              >
                <input
                  type="checkbox"
                  :checked="isSelected(kw.keyword)"
                  @click.stop
                  @change="toggleSelect(kw.keyword)"
                />
                <span
                  class="source-item__keyword"
                  :class="{ 'source-item__keyword--multi': isMultiSource(kw.keyword) }"
                >{{ kw.keyword }}</span>
                <span v-if="sourceCountLabel(kw.keyword)" class="multi-badge">{{ sourceCountLabel(kw.keyword) }}</span>
                <small v-if="section.showReasoning && kw.reasoning" class="source-item__reasoning">{{ kw.reasoning }}</small>
                <span v-if="section.showKpis" class="source-item__kpis">
                  <span v-if="kw.searchVolume != null" class="kpi-tag">Vol: {{ formatVolume(kw.searchVolume) }}</span>
                  <span v-if="kw.difficulty != null" class="kpi-tag">KD: {{ kw.difficulty }}</span>
                  <span v-if="kw.cpc != null" class="kpi-tag">CPC: {{ kw.cpc.toFixed(2) }}€</span>
                  <span v-if="kw.intent" class="kpi-tag kpi-tag--intent">{{ kw.intent }}</span>
                </span>
              </li>
            </ul>
          </section>
        </template>

        <!-- Empty state -->
        <p
          v-if="!isAnyLoading && !hasResults"
          class="discovery-empty"
        >
          Aucun mot-clé trouvé. Essayez un autre mot-clé racine.
        </p>

        <!-- AI Analysis button -->
        <div v-if="hasResults && !isAnyLoading && !semanticLoading && relevantCount > 0" class="analysis-action">
          <button
            class="analysis-action__btn"
            :disabled="analysisLoading"
            @click="handleAnalyze"
          >
            <template v-if="analysisLoading">
              <span class="spinner-small" /> Analyse en cours...
            </template>
            <template v-else>
              🔍 Analyser les {{ relevantCount }} résultats pertinents
            </template>
          </button>
          <p class="analysis-action__hint">
            L'IA analyse vos mots-clés, les groupes thématiques et les métriques pour sélectionner les 20-30 mots-clés les plus stratégiques.
          </p>
        </div>

        <!-- AI Analysis results -->
        <section v-if="analysisResult" class="analysis-results">
          <div class="analysis-results__header">
            <h3 class="analysis-results__title">Recommandation IA</h3>
            <span class="analysis-results__count">{{ analysisResult.keywords.length }} mots-cles</span>
            <label class="analysis-results__check-all" @click.stop>
              <input
                type="checkbox"
                :checked="isAllAnalysisSelected()"
                @change="handleToggleAnalysisSelectAll"
              />
              Tout selectionner
            </label>
          </div>
          <p class="analysis-results__summary">{{ analysisResult.summary }}</p>

          <ul class="analysis-list">
            <li
              v-for="(kw, index) in analysisResult.keywords"
              :key="kw.keyword"
              class="analysis-item"
              :class="{
                'analysis-item--selected': isSelected(kw.keyword),
                'analysis-item--high': kw.priority === 'high',
                'analysis-item--medium': kw.priority === 'medium',
                'analysis-item--low': kw.priority === 'low',
              }"
              @click="toggleSelect(kw.keyword)"
            >
              <input
                type="checkbox"
                :checked="isSelected(kw.keyword)"
                @click.stop
                @change="toggleSelect(kw.keyword)"
              />
              <span class="analysis-item__rank">{{ index + 1 }}</span>
              <span class="analysis-item__priority" :class="'priority--' + kw.priority">
                {{ kw.priority === 'high' ? '🔴' : kw.priority === 'medium' ? '🟡' : '🟢' }}
              </span>
              <div class="analysis-item__content">
                <span
                  class="analysis-item__keyword"
                  :class="{ 'source-item__keyword--multi': isMultiSource(kw.keyword) }"
                >{{ kw.keyword }}</span>
                <span v-if="sourceCountLabel(kw.keyword)" class="multi-badge">{{ sourceCountLabel(kw.keyword) }}</span>
                <p class="analysis-item__reasoning">{{ kw.reasoning }}</p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- Sidebar: Word Groups -->
    <aside v-if="hasDiscovered" class="discovery-sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">Groupes de mots</h3>
        <span v-if="wordGroupsLoading" class="spinner-small" />
      </div>

      <ul v-if="wordGroups.length > 0" class="group-list">
        <li
          v-for="group in wordGroups"
          :key="group.normalized"
          class="group-item"
          :class="{ 'group-item--active': activeGroupFilter === group.normalized }"
          @click="handleGroupClick(group.normalized)"
        >
          <span class="group-item__word">{{ group.word }}</span>
          <span class="group-item__count">{{ group.count }}</span>
        </li>
      </ul>

      <p v-else-if="!wordGroupsLoading && hasResults" class="sidebar-empty">
        Pas assez de données pour les groupes.
      </p>
    </aside>

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

.discovery-sidebar {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--color-surface);
  align-self: flex-start;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

/* --- Sidebar --- */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sidebar-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: background 0.1s;
}

.group-item:hover {
  background: var(--color-bg-hover);
}

.group-item--active {
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
}

.group-item__word {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-item__count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  background: var(--color-bg-hover);
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
  margin-left: 4px;
}

.group-item--active .group-item__count {
  background: rgba(37, 99, 235, 0.15);
  color: var(--color-primary);
}

.sidebar-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
}

/* --- Relevance toggle --- */
.relevance-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
}

.relevance-toggle__label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text);
}

.relevance-toggle__count {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.relevance-toggle__scoring {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 500;
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

/* --- Source sections --- */
.discovery-sources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.source-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface);
  cursor: pointer;
  user-select: none;
}

.source-header:hover {
  background: var(--color-bg-hover);
}

.source-header__chevron {
  display: inline-block;
  font-size: 0.75rem;
  transition: transform 0.15s ease;
  color: var(--color-text-muted);
}

.source-header__chevron--open {
  transform: rotate(90deg);
}

.source-header__icon {
  font-size: 0.875rem;
}

.source-header__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.source-header__count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.source-header__check-all {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.source-header__check-all input {
  cursor: pointer;
}

/* --- Keyword list --- */
.source-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 0.8125rem;
  transition: background 0.1s;
}

.source-item:hover {
  background: var(--color-bg-hover);
}

.source-item--selected {
  background: rgba(37, 99, 235, 0.04);
}

.source-item input[type="checkbox"] {
  cursor: pointer;
  flex-shrink: 0;
}

.source-item__keyword {
  color: var(--color-text);
  font-weight: 500;
}

.source-item--irrelevant {
  opacity: 0.5;
}

.source-item--irrelevant .source-item__keyword {
  color: var(--color-text-muted);
  font-weight: 400;
}

.source-item__keyword--multi {
  color: var(--color-primary);
  font-weight: 600;
}

.source-item--irrelevant .source-item__keyword--multi {
  color: var(--color-text-muted);
  font-weight: 400;
}

.multi-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* --- Scoring progress bar --- */
.scoring-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scoring-progress__bar {
  width: 80px;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.scoring-progress__fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.scoring-progress__text {
  font-size: 0.6875rem;
  color: var(--color-primary);
  white-space: nowrap;
}

.relevance-toggle__total {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-bg-hover);
  padding: 2px 8px;
  border-radius: 4px;
}

.source-item__reasoning {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  margin-left: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.source-item__kpis {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.kpi-tag {
  font-size: 0.6875rem;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}

.kpi-tag--intent {
  background: var(--color-block-info-bg);
  border-color: var(--color-block-info-border);
  color: var(--color-primary);
}

/* --- Spinner --- */
.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

/* --- Analysis action button --- */
.analysis-action {
  text-align: center;
  padding: 16px;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.analysis-action__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.analysis-action__btn:hover:not(:disabled) {
  opacity: 0.9;
}

.analysis-action__btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.analysis-action__hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 8px;
  max-width: 500px;
  margin-inline: auto;
}

/* --- Analysis results panel --- */
.analysis-results {
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.analysis-results__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(37, 99, 235, 0.08));
  border-bottom: 1px solid var(--color-border);
}

.analysis-results__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.analysis-results__count {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.analysis-results__summary {
  padding: 10px 14px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  border-bottom: 1px solid var(--color-border);
  margin: 0;
}

.analysis-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 500px;
  overflow-y: auto;
}

.analysis-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.1s;
}

.analysis-item:last-child {
  border-bottom: none;
}

.analysis-item:hover {
  background: var(--color-bg-hover);
}

.analysis-item--selected {
  background: rgba(37, 99, 235, 0.04);
}

.analysis-item input[type="checkbox"] {
  margin-top: 3px;
  cursor: pointer;
  flex-shrink: 0;
}

.analysis-item__rank {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 18px;
  text-align: right;
  margin-top: 2px;
  flex-shrink: 0;
}

.analysis-item__priority {
  font-size: 0.75rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.analysis-item__content {
  flex: 1;
  min-width: 0;
}

.analysis-item__keyword {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.analysis-item--high .analysis-item__keyword {
  color: #dc2626;
}

.analysis-item--medium .analysis-item__keyword {
  color: var(--color-text);
}

.analysis-item--low .analysis-item__keyword {
  color: var(--color-text-muted);
}

.analysis-item__reasoning {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin: 2px 0 0;
}

/* --- Cache indicator --- */
.cache-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  background: rgba(22, 163, 74, 0.06);
  border: 1px solid rgba(22, 163, 74, 0.3);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #15803d;
}

.cache-indicator__badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.cache-indicator__date,
.cache-indicator__kw,
.cache-indicator__analysis {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.cache-indicator__load {
  margin-left: auto;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #15803d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cache-indicator__load:hover:not(:disabled) {
  background: #166534;
}

.cache-indicator__load:disabled {
  opacity: 0.6;
  cursor: wait;
}

.cache-indicator__clear {
  padding: 4px 12px;
  font-size: 0.75rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-muted);
}

.cache-indicator__clear:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

/* --- Analysis select all --- */
.analysis-results__check-all {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
  font-weight: 500;
}

.analysis-results__check-all input {
  cursor: pointer;
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
