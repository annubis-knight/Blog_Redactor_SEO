<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import { useStreaming } from '@/composables/editor/useStreaming'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import KeywordAssistPanel from '@/components/moteur/KeywordAssistPanel.vue'
import type { SelectedArticle } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { TfidfResult, LexiqueAnalysisResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'
import { MOTEUR_LEXIQUE_VALIDATED } from '@shared/constants/workflow-checks.constants.js'

// Sprint 11 — Multi-keyword exploration + DB hydration
interface LexiqueExplorationEntry {
  articleId: number
  sourceKeyword: string
  tfidfTerms: TfidfResult | null
  aiRecommendations: LexiqueTermRecommendation[]
  aiMissingTerms: string[]
  aiSummary: string | null
  exploredAt: string
}

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  captainKeyword: string | null
  articleLevel: ArticleLevel | null
  selectedLieutenants: string[]
  isCaptaineLocked: boolean
  initialLocked?: boolean
  cocoonSlug?: string
}>(), {
  initialLocked: false,
  cocoonSlug: '',
})

const emit = defineEmits<{
  (e: 'check-completed', check: string): void
  (e: 'check-removed', check: string): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()

const tfidfResult = ref<TfidfResult | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedTerms = ref<Set<string>>(new Set())
const isLocked = ref(props.initialLocked)

// Sprint 11 (D4) — champ saisie libre pour lancer TF-IDF sur un keyword arbitraire.
const customKeywordInput = ref('')
// Keyword source actif pour l'extraction courante (capitaine par défaut).
const activeSourceKeyword = ref<string>('')
// DB-hydrated past explorations for this article (displayed as collapsible sections).
const pastExplorations = ref<LexiqueExplorationEntry[]>([])

// --- IA Upfront Analysis (NOUVEAU) ---
const { chunks: iaChunks, isStreaming: iaIsStreaming, error: iaError, result: iaRawResult, startStream: iaStartStream, abort: iaAbort } = useStreaming<LexiqueAnalysisResult>()
const iaResult = computed(() => iaRawResult.value)
const iaRecommendations = ref<Map<string, LexiqueTermRecommendation>>(new Map())

// F5 — La barrière `isCaptaineLocked` ne s'applique qu'au premier passage. Dès que
// des termes lexique ont été validés une fois, l'onglet reste accessible même si
// l'utilisateur déverrouille ensuite le Capitaine.
const hasEverValidated = computed(() =>
  (articleKeywordsStore.keywords?.lexique?.length ?? 0) > 0,
)

const canExtract = computed(() =>
  (props.isCaptaineLocked || hasEverValidated.value) && !!props.captainKeyword && !isLoading.value && !isLocked.value,
)

// --- Debug log: state on mount ---
watch(
  () => articleKeywordsStore.keywords,
  (kw) => {
    log.debug('[LexiqueExtraction] store keywords snapshot', {
      articleId: props.selectedArticle?.id,
      lexiqueTerms: kw?.lexique ?? [],
      lexiqueCount: kw?.lexique?.length ?? 0,
      isCaptainLocked: props.isCaptaineLocked,
      captainKeyword: props.captainKeyword,
      isLocked: isLocked.value,
      tfidfLoaded: !!tfidfResult.value,
    })
  },
  { immediate: true },
)

/** F3 — Ajoute un terme (suggéré par le basket) à la sélection lexique courante. */
function handleAssistAdd(term: string) {
  if (isLocked.value) return
  const next = new Set(selectedTerms.value)
  next.add(term)
  selectedTerms.value = next
  log.info('[LexiqueExtraction] Assist add', { term, total: selectedTerms.value.size })
}

async function extractLexique() {
  if (!props.captainKeyword || !canExtract.value) return
  activeSourceKeyword.value = props.captainKeyword
  await fetchTfidf(props.captainKeyword)
}

/** Sprint 11 (D4) — TF-IDF sur un keyword arbitraire (hors capitaine verrouillé). */
async function extractCustomKeyword() {
  const kw = customKeywordInput.value.trim()
  if (!kw || isLoading.value) return
  activeSourceKeyword.value = kw
  iaRecommendations.value = new Map()
  await fetchTfidf(kw)
  customKeywordInput.value = ''
}

function toggleTerm(term: string) {
  if (isLocked.value) return
  const next = new Set(selectedTerms.value)
  if (next.has(term)) {
    next.delete(term)
  } else {
    next.add(term)
  }
  selectedTerms.value = next
}

// Selection counters
const selectedCount = computed(() => selectedTerms.value.size)

const selectedByLevel = computed(() => {
  if (!tfidfResult.value) return { obligatoire: 0, differenciateur: 0, optionnel: 0 }
  return {
    obligatoire: tfidfResult.value.obligatoire.filter(t => selectedTerms.value.has(t.term)).length,
    differenciateur: tfidfResult.value.differenciateur.filter(t => selectedTerms.value.has(t.term)).length,
    optionnel: tfidfResult.value.optionnel.filter(t => selectedTerms.value.has(t.term)).length,
  }
})

// IA recommendation helpers
function getRecommendation(term: string): LexiqueTermRecommendation | undefined {
  return iaRecommendations.value.get(term.toLowerCase())
}

function isIaRecommended(term: string): boolean | null {
  const rec = getRecommendation(term)
  return rec ? rec.aiRecommended : null
}

// --- IA Upfront Lexique Analysis ---
function generateLexiqueUpfront() {
  const keyword = activeSourceKeyword.value || props.captainKeyword
  if (!keyword || !tfidfResult.value) return
  const data = tfidfResult.value
  iaAbort()
  iaRecommendations.value = new Map()

  iaStartStream(
    `/api/keywords/${encodeURIComponent(keyword)}/ai-lexique-upfront`,
    {
      level: props.articleLevel,
      allTerms: {
        obligatoire: data.obligatoire.map(t => t.term),
        differenciateur: data.differenciateur.map(t => t.term),
        optionnel: data.optionnel.map(t => t.term),
      },
      cocoonSlug: props.cocoonSlug || undefined,
      articleId: props.selectedArticle?.id ?? undefined,
    },
    {
      onDone: (result) => {
        log.info(`[LexiqueExtraction] IA upfront: ${result.recommendations.length} recommendations`)
        // Build lookup map
        const map = new Map<string, LexiqueTermRecommendation>()
        for (const rec of result.recommendations) {
          map.set(rec.term.toLowerCase(), rec)
        }
        iaRecommendations.value = map

        // Pre-check: all obligatoire + differenciateur where aiRecommended
        if (tfidfResult.value) {
          const preChecked = new Set<string>()
          for (const term of tfidfResult.value.obligatoire) {
            preChecked.add(term.term)
          }
          for (const term of tfidfResult.value.differenciateur) {
            const rec = map.get(term.term.toLowerCase())
            if (rec?.aiRecommended) {
              preChecked.add(term.term)
            }
          }
          selectedTerms.value = preChecked
        }
      },
    },
  )
}

// Auto-trigger IA upfront after TF-IDF results
// U5 — session guard : ne pas relancer si déjà en cache session (iaRecommendations peuplé)
// TODO U5 plus complet : persister les iaRecommendations en DB avec exploredAt,
// et réutiliser via shouldRegenerate(exploredAt). Pour l'instant : cache de session seulement.
watch(tfidfResult, (res) => {
  if (!res) return
  if (iaRecommendations.value.size > 0) {
    log.debug('[LexiqueExtraction] Skip IA upfront — session cache already populated', { count: iaRecommendations.value.size })
    return
  }
  generateLexiqueUpfront()
})

// --- Validate / Lock ---
async function validateLexique() {
  const id = props.selectedArticle?.id
  if (!id || selectedTerms.value.size === 0) return

  const terms = [...selectedTerms.value]
  if (!articleKeywordsStore.keywords) {
    articleKeywordsStore.initEmpty(id)
  }
  articleKeywordsStore.keywords!.lexique = terms
  await articleKeywordsStore.saveDecisions(id)

  isLocked.value = true
  emit('check-completed', MOTEUR_LEXIQUE_VALIDATED)
  log.info(`[LexiqueExtraction] Lexique validated with ${terms.length} terms`)
}

function unlockLexique() {
  isLocked.value = false
  emit('check-removed', MOTEUR_LEXIQUE_VALIDATED)
}

// Fetch TF-IDF — keyword can be overridden (Sprint 11 D4 multi-keyword)
async function fetchTfidf(keywordOverride?: string) {
  const keyword = keywordOverride ?? activeSourceKeyword.value ?? props.captainKeyword
  if (!keyword) return

  isLoading.value = true
  error.value = null

  try {
    log.info(`[LexiqueExtraction] Fetching TF-IDF for "${keyword}"`)
    const result = await apiPost<TfidfResult>('/serp/tfidf', {
      keyword,
      articleId: props.selectedArticle?.id ?? undefined,
    })
    tfidfResult.value = result

    // Initial pre-check: all obligatoire (will be refined by IA upfront)
    const preChecked = new Set<string>()
    for (const term of result.obligatoire) {
      preChecked.add(term.term)
    }
    selectedTerms.value = preChecked

    log.info(`[LexiqueExtraction] TF-IDF loaded: ${result.obligatoire.length}O + ${result.differenciateur.length}D + ${result.optionnel.length}Op`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    log.error(`[LexiqueExtraction] TF-IDF fetch failed`, { error: error.value })
  } finally {
    isLoading.value = false
  }
}

/**
 * Sprint 11 — Hydrate past explorations from DB (article-scoped) before any
 * TF-IDF/AI call. When a fresh (<7d) exploration exists for the capitaine,
 * we restore tfidfResult + iaRecommendations straight from the table and skip
 * the SERP/AI roundtrips entirely.
 */
async function hydrateFromDb() {
  const id = props.selectedArticle?.id
  if (!id) return
  try {
    const payload = await apiGet<{ lexique: LexiqueExplorationEntry[] }>(`/articles/${id}/explorations`)
    pastExplorations.value = payload.lexique ?? []
    log.debug('[LexiqueExtraction] DB hydration', { count: pastExplorations.value.length })

    // Restore the exploration that matches the capitaine, if any.
    const active = activeSourceKeyword.value || props.captainKeyword || ''
    const match = pastExplorations.value.find(e => e.sourceKeyword.toLowerCase() === active.toLowerCase())
    if (match && match.tfidfTerms) {
      tfidfResult.value = match.tfidfTerms
      activeSourceKeyword.value = match.sourceKeyword
      const map = new Map<string, LexiqueTermRecommendation>()
      for (const rec of match.aiRecommendations) map.set(rec.term.toLowerCase(), rec)
      iaRecommendations.value = map
      log.info(`[LexiqueExtraction] Restored from DB for "${match.sourceKeyword}" (${shouldRegenerate(match.exploredAt) ? 'stale' : 'fresh'})`)
    }
  } catch (err) {
    log.warn(`[LexiqueExtraction] DB hydration failed — ${(err as Error).message}`)
  }
}

// Auto-restore TF-IDF when captain is locked — prefer DB-first.
watch(
  [() => props.isCaptaineLocked, () => props.captainKeyword, () => props.selectedArticle?.id],
  async ([locked, keyword]) => {
    if (!locked || !keyword) return
    if (!activeSourceKeyword.value) activeSourceKeyword.value = keyword
    await hydrateFromDb()
    if (!tfidfResult.value && !isLoading.value) {
      await fetchTfidf(keyword)
    }
  },
  { immediate: true },
)

// Reset when article changes
watch(
  () => props.selectedArticle?.slug,
  () => {
    tfidfResult.value = null
    error.value = null
    selectedTerms.value = new Set()
    iaRecommendations.value = new Map()
    pastExplorations.value = []
    activeSourceKeyword.value = ''
    customKeywordInput.value = ''
    isLocked.value = props.initialLocked
    iaAbort()
  },
)

onUnmounted(() => {
  iaAbort()
})
</script>

<template>
  <div class="lexique-extraction">
    <!-- Header: Captain + Lieutenants + Level -->
    <div class="lexique-header">
      <div class="captain-badge">
        <span class="captain-icon">&#127894;</span>
        <span class="captain-keyword">{{ captainKeyword ?? '—' }}</span>
      </div>
      <div v-if="selectedLieutenants.length > 0" class="lieutenant-badges">
        <span v-for="lt in selectedLieutenants" :key="lt" class="lt-badge">{{ lt }}</span>
      </div>
      <span v-if="articleLevel" class="level-badge">{{ articleLevel }}</span>
    </div>

    <!-- F3 — Suggestions depuis le basket, ajoutées aux termes lexique sélectionnés -->
    <KeywordAssistPanel
      context="lexique"
      :exclude-keywords="Array.from(selectedTerms)"
      @add="handleAssistAdd"
    />

    <!-- Extract button -->
    <div class="extract-controls">
      <button
        class="btn-extract"
        data-testid="btn-extract"
        :disabled="!canExtract"
        @click="extractLexique"
      >
        {{ isLoading ? 'Extraction en cours...' : 'Extraire le Lexique' }}
      </button>
    </div>

    <!-- Sprint 11 (D4) — Multi-keyword exploration + past explorations recap -->
    <div v-if="selectedArticle?.id" class="multi-keyword-section">
      <label class="multi-keyword-label">Extraire pour un autre mot-clé</label>
      <div class="multi-keyword-row">
        <input
          v-model="customKeywordInput"
          type="text"
          class="multi-keyword-input"
          :disabled="isLoading || isLocked"
          placeholder="Ex: coach sportif Paris"
          @keydown.enter="extractCustomKeyword"
        />
        <button
          type="button"
          class="btn-secondary"
          :disabled="!customKeywordInput.trim() || isLoading || isLocked"
          @click="extractCustomKeyword"
        >Extraire</button>
      </div>
      <div v-if="pastExplorations.length > 0" class="past-explorations">
        <span class="past-label">Explorations enregistrées ({{ pastExplorations.length }}) —</span>
        <button
          v-for="entry in pastExplorations"
          :key="entry.sourceKeyword"
          type="button"
          class="past-chip"
          :class="{ 'past-chip--active': activeSourceKeyword === entry.sourceKeyword }"
          :title="`Exploré le ${new Date(entry.exploredAt).toLocaleDateString('fr-FR')}`"
          @click="() => { activeSourceKeyword = entry.sourceKeyword; tfidfResult = entry.tfidfTerms; const m = new Map(); for (const r of entry.aiRecommendations) m.set(r.term.toLowerCase(), r); iaRecommendations = m }"
        >{{ entry.sourceKeyword }}</button>
      </div>
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

      <!-- Selection counter -->
      <div class="selection-counter" data-testid="selection-counter">
        {{ selectedCount }} terme{{ selectedCount > 1 ? 's' : '' }} selectionne{{ selectedCount > 1 ? 's' : '' }}
        <span class="counter-detail">
          ({{ selectedByLevel.obligatoire }}O / {{ selectedByLevel.differenciateur }}D / {{ selectedByLevel.optionnel }}Op)
        </span>
      </div>

      <!-- Obligatoire (70%+) -->
      <CollapsableSection :title="`Obligatoire (70%+) — ${tfidfResult.obligatoire.length} termes`" :default-open="true">
        <div v-if="tfidfResult.obligatoire.length > 0" class="term-list">
          <div v-for="term in tfidfResult.obligatoire" :key="term.term" class="term-row" :class="{ selected: selectedTerms.has(term.term) }">
            <input type="checkbox" :checked="selectedTerms.has(term.term)" :disabled="isLocked" class="term-checkbox" @change="toggleTerm(term.term)" />
            <span class="term-text">{{ term.term }}</span>
            <span v-if="isIaRecommended(term.term) !== null" :class="isIaRecommended(term.term) ? 'badge-ia badge-ia-recommended' : 'badge-ia badge-ia-optional'" :title="getRecommendation(term.term)?.aiReason">
              {{ isIaRecommended(term.term) ? 'IA recommandé' : 'IA optionnel' }}
            </span>
            <span class="term-density">&times;{{ term.density }}/page</span>
            <span class="term-percent">{{ Math.round(term.documentFrequency * 100) }}%</span>
          </div>
        </div>
        <p v-else class="section-empty">Aucun terme obligatoire identifie.</p>
      </CollapsableSection>

      <!-- Differenciateur (30-70%) -->
      <CollapsableSection :title="`Differenciateur (30-70%) — ${tfidfResult.differenciateur.length} termes`" :default-open="true">
        <div v-if="tfidfResult.differenciateur.length > 0" class="term-list">
          <div v-for="term in tfidfResult.differenciateur" :key="term.term" class="term-row" :class="{ selected: selectedTerms.has(term.term) }">
            <input type="checkbox" :checked="selectedTerms.has(term.term)" :disabled="isLocked" class="term-checkbox" @change="toggleTerm(term.term)" />
            <span class="term-text">{{ term.term }}</span>
            <span v-if="isIaRecommended(term.term) !== null" :class="isIaRecommended(term.term) ? 'badge-ia badge-ia-recommended' : 'badge-ia badge-ia-optional'" :title="getRecommendation(term.term)?.aiReason">
              {{ isIaRecommended(term.term) ? 'IA recommandé' : 'IA optionnel' }}
            </span>
            <span class="term-density">&times;{{ term.density }}/page</span>
            <span class="term-percent">{{ Math.round(term.documentFrequency * 100) }}%</span>
          </div>
        </div>
        <p v-else class="section-empty">Aucun terme differenciateur identifie.</p>
      </CollapsableSection>

      <!-- Optionnel (<30%) -->
      <CollapsableSection :title="`Optionnel (<30%) — ${tfidfResult.optionnel.length} termes`" :default-open="false">
        <div v-if="tfidfResult.optionnel.length > 0" class="term-list">
          <div v-for="term in tfidfResult.optionnel" :key="term.term" class="term-row" :class="{ selected: selectedTerms.has(term.term) }">
            <input type="checkbox" :checked="selectedTerms.has(term.term)" :disabled="isLocked" class="term-checkbox" @change="toggleTerm(term.term)" />
            <span class="term-text">{{ term.term }}</span>
            <span v-if="isIaRecommended(term.term) !== null" :class="isIaRecommended(term.term) ? 'badge-ia badge-ia-recommended' : 'badge-ia badge-ia-optional'" :title="getRecommendation(term.term)?.aiReason">
              {{ isIaRecommended(term.term) ? 'IA recommandé' : 'IA optionnel' }}
            </span>
            <span class="term-density">&times;{{ term.density }}/page</span>
            <span class="term-percent">{{ Math.round(term.documentFrequency * 100) }}%</span>
          </div>
        </div>
        <p v-else class="section-empty">Aucun terme optionnel identifie.</p>
      </CollapsableSection>

      <!-- Validate / Lock (inside results) -->
      <div v-if="!isLocked" class="lexique-lock" data-testid="lexique-lock">
        <button
          class="lock-btn"
          data-testid="lock-btn"
          :disabled="selectedCount === 0"
          @click="validateLexique"
        >
          Valider le Lexique
        </button>
      </div>
    </div>

    <!-- Lock state (always visible when locked, even without results) -->
    <div v-if="isLocked" class="lexique-lock" data-testid="lexique-lock">
      <div class="locked-state" data-testid="locked-state">
        <span class="locked-badge">Lexique verrouillé</span>
        <button class="unlock-btn" data-testid="unlock-btn" @click="unlockLexique">
          Déverrouiller
        </button>
      </div>
    </div>
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

/* --- Selection counter --- */
.selection-counter {
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.counter-detail {
  font-weight: 400;
  font-size: 0.75rem;
}

/* --- Term list --- */
.term-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.term-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: border-color 0.15s, background 0.15s;
}

.term-row.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, #eff6ff);
}

.term-checkbox {
  cursor: pointer;
  flex-shrink: 0;
}

.term-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.term-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-ia {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
  cursor: help;
}

.badge-ia-recommended {
  background: var(--color-badge-green-bg, #dcfce7);
  color: #15803d;
}

.badge-ia-optional {
  background: var(--color-border);
  color: var(--color-text-muted);
}

.term-density {
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.term-percent {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

/* --- Empty section --- */
.section-empty {
  margin: 0;
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
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

/* Sprint 11 (D4) — Multi-keyword exploration */
.multi-keyword-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-subtle, rgba(100, 116, 139, 0.04));
  border: 1px dashed var(--color-border, #e2e8f0);
  border-radius: 8px;
}
.multi-keyword-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.multi-keyword-row {
  display: flex;
  gap: 0.5rem;
}
.multi-keyword-input {
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.8125rem;
  background: var(--color-background, #ffffff);
  color: var(--color-text, #1e293b);
}
.multi-keyword-input:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
}
.btn-secondary {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  color: var(--color-text, #1e293b);
  cursor: pointer;
}
.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.past-explorations {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
  font-size: 0.75rem;
}
.past-label {
  color: var(--color-text-muted, #64748b);
  font-weight: 600;
}
.past-chip {
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 999px;
  background: var(--color-background, #ffffff);
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--color-text, #1e293b);
  transition: all 0.15s;
}
.past-chip:hover {
  border-color: var(--color-primary, #3b82f6);
}
.past-chip--active {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-primary, #3b82f6);
  color: white;
  font-weight: 600;
}
</style>
