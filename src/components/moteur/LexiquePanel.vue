<script setup lang="ts">
/**
 * AUTHORITY: PostgreSQL `article_keywords.lexique` TEXT[] (VERROUILLAGE via
 *            useLexiqueLocking) + `lexique_explorations` (LECTURE via
 *            useLexiqueExplorations) + `keyword_serp_scrapes` (pré-check via
 *            useSerpExistsCheck).
 * READS FROM: GET /articles/:id/explorations (composable LECTURE).
 *             GET /keywords/:keyword/serp/exists (composable pré-check).
 *             POST /serp/tfidf (fetchTfidf, optionnellement triggerScrapeIfMissing).
 *             useArticleProgressStore.getProgress(id).completedChecks
 *             (reconciliation au mount).
 * WRITES TO: useLexiqueLocking.toggleTerm → store + PUT /articles/:id/keywords.
 *            Emits check-completed / check-removed (MOTEUR_LEXIQUE_VALIDATED).
 * CONSUMERS: MoteurView (parent), TabCachePanel (validatedLexiqueCount).
 * RELATED FR: FR-LEX-SELECT, FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-TFIDF,
 *             FR-LEX-MULTI-KEYWORD, FR-LEX-MULTI-KEYWORD-TABS (E2),
 *             FR-LEX-PRECHECK-SERP (E1), FR-LEX-LECTURE-VS-VERROUILLAGE (E3),
 *             FR-MOT-CHECK-RECONCILIATION, FR-MOT-CACHE-PANEL-COUNT.
 */
import { ref, computed, watch, onUnmounted, toRef } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { useLexiqueIa } from '@/composables/lexique/useLexiqueIa'
import { useSerpExistsCheck } from '@/composables/lexique/useSerpExistsCheck'
import { useLexiqueExplorations } from '@/composables/lexique/useLexiqueExplorations'
import { useLexiqueLocking } from '@/composables/lexique/useLexiqueLocking'
import KeywordAssistPanel from '@/components/moteur/KeywordAssistPanel.vue'
import { useRadarExplorationStore } from '@/stores/article/radar-exploration.store'
import LexiqueAiPanel from '@/components/moteur/LexiqueAiPanel.vue'
import LexiqueTermsList from '@/components/moteur/lexique/LexiqueTermsList.vue'
import LexiqueCustomKeywordInput from '@/components/moteur/lexique/LexiqueCustomKeywordInput.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import TabBar from '@/components/shared/TabBar.vue'
import { jaccardWithPainPoint } from '@/utils/pain-point-jaccard'
import { type SortOption } from '@/composables/moteur/useSortableList'
import SortToggleBar from '@/components/moteur/SortToggleBar.vue'
import type { SelectedArticle } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { TfidfResult } from '@shared/types/serp-analysis.types.js'
import { MOTEUR_LEXIQUE_VALIDATED } from '@shared/constants/workflow-checks.constants.js'

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  captainKeyword: string | null
  articleLevel: ArticleLevel | null
  selectedLieutenants: string[]
  isCaptaineLocked: boolean
  initialLocked?: boolean
  cocoonSlug?: string
}>(), { initialLocked: false, cocoonSlug: '' })

const emit = defineEmits<{
  (e: 'check-completed', check: string): void
  (e: 'check-removed', check: string): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()
const radarStore = useRadarExplorationStore()

// FR-MOT-BASKET-DEPRECATED : keywords proposés au KeywordAssistPanel viennent
// du store Radar DB-first (union scan_result.cards + generated_keywords). Plus
// de dépendance au basket mémoire.
const assistKeywords = computed<string[]>(() => {
  const fromScan = radarStore.scanCards.map(c => c.keyword)
  const fromGenerated = radarStore.generatedKeywords.map(k => k.keyword)
  const seen = new Set<string>()
  const out: string[] = []
  for (const kw of [...fromScan, ...fromGenerated]) {
    const norm = kw.toLowerCase()
    if (!seen.has(norm)) {
      seen.add(norm)
      out.push(kw)
    }
  }
  return out
})

// --- État UI local ---
// `selectedTerms` = candidats UI (pre-check obligatoire post-fetchTfidf + basket).
// Distinct de `lockedTerms` (store.lexique persisté) ; toggle synchronise les deux.
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedTerms = ref<Set<string>>(new Set())
const customKeywordInput = ref('')
const showSerpScrapeModal = ref(false)

// --- Composables (séparation LECTURE / VERROUILLAGE — FR-LEX-LECTURE-VS-VERROUILLAGE) ---
const articleIdRef = computed(() => props.selectedArticle?.id ?? undefined)
const captainKeywordRef = toRef(props, 'captainKeyword')

const {
  pastExplorations, activeSourceKeyword, tfidfResult, iaRecommendations,
  hydrateFromDb, mergeFromDb, selectExploration, reset: resetExplorations,
} = useLexiqueExplorations({ articleId: articleIdRef, captainKeyword: captainKeywordRef })

const { isLocked, toggleTerm: persistToggle } = useLexiqueLocking({ articleId: articleIdRef })

const { exists: serpExists, isChecking: serpExistsIsChecking, refetch: refetchSerpExists }
  = useSerpExistsCheck(captainKeywordRef)

const {
  iaIsStreaming, iaError, iaResult,
  iaRecommendedCount, iaNotRecommendedCount,
  iaAbort, getRecommendation, isIaRecommended, generateLexiqueUpfront,
} = useLexiqueIa({
  tfidfResult, selectedTerms, activeSourceKeyword,
  captainKeyword: captainKeywordRef,
  articleLevel: toRef(props, 'articleLevel'),
  cocoonSlug: toRef(props, 'cocoonSlug'),
  selectedArticleId: articleIdRef,
})

// --- Tri / sélection ---
const lexiqueSortOptions = computed<SortOption[]>(() => {
  const opts: SortOption[] = [{ key: 'az', label: 'A-Z' }, { key: 'density', label: 'Densité' }]
  if (props.selectedArticle?.painPoint) opts.push({ key: 'alignment', label: 'Pertinence douleur' })
  return opts
})
const lexiqueSortState = ref<{ key: string | null; direction: 'asc' | 'desc' | 'neutral' }>({ key: null, direction: 'neutral' })

function getLexiqueValue<T extends { term: string; density?: number; documentFrequency?: number }>(t: T, key: string): string | number | null {
  if (key === 'az') return t.term
  if (key === 'density') return t.density ?? t.documentFrequency ?? null
  if (key === 'alignment') return jaccardWithPainPoint(t.term, props.selectedArticle?.painPoint ?? null)
  return null
}

function sortTermsByAlignment<T extends { term: string; density?: number; documentFrequency?: number }>(terms: T[]): T[] {
  const { key, direction } = lexiqueSortState.value
  if (!key || direction === 'neutral') return terms
  const sign = direction === 'desc' ? -1 : 1
  return [...terms].sort((a, b) => {
    const va = getLexiqueValue(a, key); const vb = getLexiqueValue(b, key)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return sign * (va - vb)
    return sign * String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' })
  })
}

const selectedCount = computed(() => selectedTerms.value.size)
const selectedByLevel = computed(() => {
  const r = tfidfResult.value
  if (!r) return { obligatoire: 0, differenciateur: 0, optionnel: 0 }
  return {
    obligatoire: (r.obligatoire ?? []).filter(t => selectedTerms.value.has(t.term)).length,
    differenciateur: (r.differenciateur ?? []).filter(t => selectedTerms.value.has(t.term)).length,
    optionnel: (r.optionnel ?? []).filter(t => selectedTerms.value.has(t.term)).length,
  }
})

const CUSTOM_TAB_ID = '__custom__'
const lexiqueTabs = computed(() => {
  const explorationTabs = pastExplorations.value.map(e => ({ id: e.sourceKeyword, label: e.sourceKeyword }))
  const customLabel = explorationTabs.length === 0 ? 'Tester un mot-clé' : '+ Tester un mot-clé'
  return [...explorationTabs, { id: CUSTOM_TAB_ID, label: customLabel }]
})
const displayedTabId = computed<string>(() =>
  activeSourceKeyword.value && pastExplorations.value.some(e => e.sourceKeyword === activeSourceKeyword.value)
    ? activeSourceKeyword.value
    : CUSTOM_TAB_ID,
)

function onSelectTab(id: string): void {
  if (id === CUSTOM_TAB_ID) {
    activeSourceKeyword.value = ''
    return
  }
  selectExploration(id) // composable LECTURE — 0 fetch, lit le cache
}

// --- Capitaine display + gating ---
// FR-MOT-DISPLAY-FROM-STORE : capitaine lu live depuis le store (et non depuis
// props, projection figée). Garde id>0 contre articles proposés (dbId=0).
const displayedCaptainKeyword = computed<string | null>(() => {
  const kw = articleKeywordsStore.keywords
  const selId = props.selectedArticle?.id ?? 0
  if (selId > 0 && kw && kw.articleId === selId) return kw.capitaine || props.captainKeyword
  return props.captainKeyword
})

// F5 : barrière isCaptaineLocked au 1er passage uniquement, puis "ever validated"
// permet d'étendre la sélection même si le capitaine est ré-ouvert.
const hasEverValidated = computed(() => (articleKeywordsStore.keywords?.lexique?.length ?? 0) > 0)
const canExtract = computed(() =>
  (props.isCaptaineLocked || hasEverValidated.value) && !!props.captainKeyword && !isLoading.value,
)

// --- Actions UI ---

function handleAssistAdd(term: string) {
  if (isLocked.value) return
  const next = new Set(selectedTerms.value); next.add(term)
  selectedTerms.value = next
}

// Toggle = sync Set local UI + délègue persistance au composable VERROUILLAGE
// (FR-LEX-LECTURE-VS-VERROUILLAGE).
function handleToggleTerm(term: string) {
  const next = new Set(selectedTerms.value)
  if (next.has(term)) next.delete(term); else next.add(term)
  selectedTerms.value = next
  persistToggle(term)
}

async function extractLexique() {
  if (!props.captainKeyword || !canExtract.value) return
  activeSourceKeyword.value = props.captainKeyword
  await fetchTfidf(props.captainKeyword)
}

async function extractCustomKeyword() {
  const kw = customKeywordInput.value.trim()
  if (!kw || isLoading.value) return
  activeSourceKeyword.value = kw
  iaRecommendations.value = new Map()
  await fetchTfidf(kw, true)
  if (tfidfResult.value) await mergeFromDb()
  customKeywordInput.value = ''
}

function openSerpScrapeModal() { showSerpScrapeModal.value = true }
async function confirmSerpScrape() {
  showSerpScrapeModal.value = false
  if (!props.captainKeyword) return
  await fetchTfidf(props.captainKeyword, true)
  await refetchSerpExists()
}
function cancelSerpScrape() { showSerpScrapeModal.value = false }

// Fetch TF-IDF (POST /serp/tfidf). Mute tfidfResult/selectedTerms (UI). Pas
// de mutation article_keywords (persistance explorations gérée côté backend).
async function fetchTfidf(keywordOverride?: string, triggerScrape: boolean = false) {
  const keyword = keywordOverride ?? activeSourceKeyword.value ?? props.captainKeyword
  if (!keyword) return
  isLoading.value = true; error.value = null
  try {
    const result = await apiPost<TfidfResult>('/serp/tfidf', {
      keyword,
      articleId: props.selectedArticle?.id ?? undefined,
      triggerScrapeIfMissing: triggerScrape,
    })
    tfidfResult.value = result
    const preChecked = new Set<string>()
    for (const term of result.obligatoire) preChecked.add(term.term)
    selectedTerms.value = preChecked
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    log.error(`[LexiquePanel] TF-IDF fetch failed`, { error: error.value })
  } finally {
    isLoading.value = false
  }
}

// --- Watchers ---

// Auto-trigger IA upfront après TF-IDF (session cache).
watch(tfidfResult, (res) => {
  if (!res || iaRecommendations.value.size > 0) return
  generateLexiqueUpfront()
})

// Watcher gating workflow + reconciliation au mount (FR-MOT-CHECK-RECONCILIATION).
// AC.LEX-SEP.4 : reste DANS le composant (propagation de check workflow,
// distinct des familles LECTURE/VERROUILLAGE — c'est l'orchestration métier
// MoteurView ↔ LexiquePanel).
let previousLockedState = false
let isFirstRun = true
watch(isLocked, (locked) => {
  if (isFirstRun) {
    isFirstRun = false
    previousLockedState = locked
    const id = props.selectedArticle?.id
    let checks: string[] = []
    try {
      checks = id ? (useArticleProgressStore().getProgress(id)?.completedChecks ?? []) : []
    } catch { checks = [] }
    const checkPresent = checks.includes(MOTEUR_LEXIQUE_VALIDATED)
    if (locked && !checkPresent) emit('check-completed', MOTEUR_LEXIQUE_VALIDATED)
    else if (!locked && checkPresent) emit('check-removed', MOTEUR_LEXIQUE_VALIDATED)
    log.info('[reconcile:lexique]', { articleId: id, isLocked: locked, checkPresent, check: MOTEUR_LEXIQUE_VALIDATED })
    return
  }
  if (locked && !previousLockedState) emit('check-completed', MOTEUR_LEXIQUE_VALIDATED)
  else if (!locked && previousLockedState) emit('check-removed', MOTEUR_LEXIQUE_VALIDATED)
  previousLockedState = locked
}, { immediate: true })

// Auto-restore TF-IDF (capitaine locked) : hydrate cache → attendre pré-check
// → si exists=false ne PAS POSTer /serp/tfidf (anti-404, FR-LEX-PRECHECK-SERP)
// → si exists=true et pas de cache, fetchTfidf live.
watch(
  [() => props.isCaptaineLocked, () => props.captainKeyword, articleIdRef, () => serpExists.value],
  async ([locked, keyword, , exists]) => {
    if (!locked || !keyword) return
    if (!activeSourceKeyword.value) activeSourceKeyword.value = keyword
    await hydrateFromDb()
    if (exists === null || exists === false) return
    if (!tfidfResult.value && !isLoading.value) await fetchTfidf(keyword)
  },
  { immediate: true },
)

// Reset article : composable LECTURE.reset() + state UI local.
watch(() => props.selectedArticle?.slug, () => {
  resetExplorations()
  selectedTerms.value = new Set(); customKeywordInput.value = ''; error.value = null
  iaAbort()
})
onUnmounted(() => { iaAbort() })

defineExpose({ hydrateFromDb, mergeFromDb })
</script>

<template>
  <div class="lexique-extraction">
    <!-- Header: Captain + Lieutenants + Level -->
    <div class="lexique-header">
      <div class="captain-badge">
        <span class="captain-icon">&#127894;</span>
        <span class="captain-keyword">{{ displayedCaptainKeyword ?? '—' }}</span>
      </div>
      <div v-if="selectedLieutenants.length > 0" class="lieutenant-badges">
        <span v-for="lt in selectedLieutenants" :key="lt" class="lt-badge">{{ lt }}</span>
      </div>
      <span v-if="articleLevel" class="level-badge">{{ articleLevel }}</span>
    </div>

    <!-- Suggestions de keywords issues du Radar DB-first, à ajouter aux termes lexique sélectionnés. -->
    <KeywordAssistPanel
      context="lexique"
      :keywords="assistKeywords"
      :exclude-keywords="Array.from(selectedTerms)"
      @add="handleAssistAdd"
    />

    <!-- Gating: show SERP scrape prompt if no scrape exists for captain keyword -->
    <div
      v-if="serpExists === false && captainKeyword"
      class="precheck-prompt"
      data-testid="precheck-missing"
    >
      <p class="precheck-message">
        Le scrape SERP n'est pas encore disponible pour ce mot-clé.
      </p>
      <button
        type="button"
        class="btn-extract btn-precheck"
        data-testid="btn-trigger-serp-scrape"
        :disabled="serpExistsIsChecking"
        @click="openSerpScrapeModal"
      >
        Lancer l'analyse SERP (~$0.003 DataForSEO)
      </button>
    </div>

    <!-- Extract button — visible quand le scrape SERP est confirmé OU quand on
         attend encore le pré-check (cas legacy / état initial avant la première
         vérif). Ne s'affiche jamais quand serpExists=false (gating anti-404). -->
    <div v-else class="extract-controls">
      <button
        class="btn-extract"
        data-testid="btn-extract"
        :disabled="!canExtract"
        @click="extractLexique"
      >
        {{ isLoading ? 'Extraction en cours...' : 'Extraire le Lexique' }}
      </button>
    </div>

    <!-- Modale de confirmation coût scrape SERP (FR-LEX-PRECHECK-SERP). -->
    <ConfirmModal
      :open="showSerpScrapeModal"
      title="Lancer l'analyse SERP DataForSEO ?"
      message="Le scrape récupère les pages Top 10 Google et leur contenu pour calculer le TF-IDF. Coût estimé : $0.003."
      confirm-label="Confirmer (~$0.003)"
      cancel-label="Annuler"
      @confirm="confirmSerpScrape"
      @cancel="cancelSerpScrape"
    />

    <!-- Multi-keyword tabs: UI-only switch reading from cache -->
    <div v-if="selectedArticle?.id" class="lexique-tabs-section">
      <TabBar
        :tabs="lexiqueTabs"
        :active-id="displayedTabId"
        aria-label="Mots-clés explorés pour le Lexique"
        @update:active-id="onSelectTab"
      />
      <LexiqueCustomKeywordInput
        v-if="displayedTabId === '__custom__'"
        :custom-keyword-input="customKeywordInput"
        :is-loading="isLoading"
        :is-locked="isLocked"
        @update:custom-keyword="(v) => customKeywordInput = v"
        @extract-custom="extractCustomKeyword"
      />
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message" data-testid="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- Results -->
    <div v-if="tfidfResult" class="lexique-results" data-testid="lexique-results">

      <!-- IA Analysis Summary (moved BEFORE term sections) -->
      <div class="ia-analysis-section" data-testid="ia-analysis-section">
        <div v-if="iaIsStreaming" class="ia-loading" data-testid="ia-loading">
          <span class="pulse-dot" /> Analyse IA en cours...
        </div>
        <div v-else-if="iaError" class="ia-error" data-testid="ia-error">
          <p>{{ iaError }}</p>
          <button class="btn-retry" @click="generateLexiqueUpfront">Relancer l'analyse IA</button>
        </div>
        <div v-else-if="iaResult" class="ia-summary" data-testid="ia-summary">
          <p>{{ iaResult.summary }}</p>
          <div v-if="iaResult.missingTerms.length > 0" class="ia-missing-terms">
            <strong>Termes manquants :</strong> {{ iaResult.missingTerms.join(', ') }}
          </div>
        </div>
      </div>

      <!-- Barre de tri unifiée. Compteur multi-niveau (O/D/Op) absorbé dans countLabel. -->
      <SortToggleBar
        :options="lexiqueSortOptions"
        :model-value="lexiqueSortState"
        :count-label="`${selectedCount} terme${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''} (${selectedByLevel.obligatoire}O / ${selectedByLevel.differenciateur}D / ${selectedByLevel.optionnel}Op)`"
        data-testid="lexique-sort-bar"
        @update:model-value="(s) => lexiqueSortState = s"
      />

      <!-- 3 sections factorisées via LexiqueTermsList -->
      <LexiqueTermsList
        :title="`Obligatoire (70%+) — ${tfidfResult.obligatoire?.length ?? 0} termes`"
        :terms="tfidfResult.obligatoire"
        :selected-terms="selectedTerms"
        :is-locked="isLocked"
        :default-open="true"
        :is-ia-recommended="isIaRecommended"
        :get-recommendation="getRecommendation"
        :sort-terms-by-alignment="sortTermsByAlignment"
        empty-label="Aucun terme obligatoire identifie."
        @toggle-term="handleToggleTerm"
      />
      <LexiqueTermsList
        :title="`Differenciateur (30-70%) — ${tfidfResult.differenciateur?.length ?? 0} termes`"
        :terms="tfidfResult.differenciateur"
        :selected-terms="selectedTerms"
        :is-locked="isLocked"
        :default-open="true"
        :is-ia-recommended="isIaRecommended"
        :get-recommendation="getRecommendation"
        :sort-terms-by-alignment="sortTermsByAlignment"
        empty-label="Aucun terme differenciateur identifie."
        @toggle-term="handleToggleTerm"
      />
      <LexiqueTermsList
        :title="`Optionnel (<30%) — ${tfidfResult.optionnel?.length ?? 0} termes`"
        :terms="tfidfResult.optionnel"
        :selected-terms="selectedTerms"
        :is-locked="isLocked"
        :default-open="false"
        :is-ia-recommended="isIaRecommended"
        :get-recommendation="getRecommendation"
        :sort-terms-by-alignment="sortTermsByAlignment"
        empty-label="Aucun terme optionnel identifie."
        @toggle-term="handleToggleTerm"
      />

    </div>

    <!-- Lock status badge: checkboxes persist immediately (no batch buttons) -->
    <div v-if="isLocked" class="lexique-lock-status" data-testid="lexique-lock-status">
      <span class="locked-badge">{{ selectedCount }} terme(s) verrouillé(s)</span>
    </div>

    <!-- Lexique AI panel: displays upfront recommendations -->
    <LexiqueAiPanel
      v-if="tfidfResult"
      :ia-is-streaming="iaIsStreaming"
      :ia-error="iaError"
      :recommendations-count="iaRecommendations.size"
      :recommended-count="iaRecommendedCount"
      :not-recommended-count="iaNotRecommendedCount"
      :can-trigger="!!tfidfResult && !iaIsStreaming"
      @trigger="generateLexiqueUpfront"
    />
  </div>
</template>

<style scoped>
.lexique-extraction {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* --- Header --- */
.lexique-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background: var(--color-block-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 8px;
}

.captain-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
}

.captain-icon {
  font-size: 1.125rem;
}

.lieutenant-badges {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.lt-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-badge-blue-bg, #dbeafe);
  border-radius: 999px;
}

.level-badge {
  margin-left: auto;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  background: var(--color-badge-blue-bg, #dbeafe);
  border-radius: 999px;
}

/* --- Controls --- */
.extract-controls {
  display: flex;
  align-items: center;
}

.precheck-prompt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 8px;
}

.precheck-message {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text, #0f172a);
}

.btn-precheck {
  background: var(--color-warning, #f59e0b);
}

.btn-precheck:hover:not(:disabled) {
  background: var(--color-warning-hover, #d97706);
}

.btn-extract {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-extract:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-extract:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Error --- */
.error-message {
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 8px;
}

.error-message p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

/* --- Results --- */
.lexique-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* --- IA Analysis Section --- */
.ia-analysis-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.ia-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success, #22c55e);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ia-error {
  padding: 0.5rem;
  background: var(--color-block-error-bg, #fef2f2);
  border-radius: 6px;
}

.ia-error p {
  margin: 0 0 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

.btn-retry {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
}

.btn-retry:hover {
  background: var(--color-primary);
  color: white;
}

.ia-summary {
  font-size: 0.8125rem;
  line-height: 1.5;
}

.ia-summary p {
  margin: 0;
}

.ia-missing-terms {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border-radius: 4px;
  font-size: 0.8125rem;
}

/* --- Lock/Unlock --- */
.lexique-lock {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lock-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-success, #22c55e);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.lock-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locked-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success, #22c55e);
}

.unlock-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
}

.unlock-btn:hover {
  border-color: var(--color-warning, #f59e0b);
  color: var(--color-warning, #f59e0b);
}

</style>
