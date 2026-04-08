<script setup lang="ts">
import { ref, watch, computed, toRef } from 'vue'
import { apiPost } from '@/services/api.service'
import { useMultiSourceVerdict, type VerdictResult } from '@/composables/useMultiSourceVerdict'
import { useNlpAnalysis } from '@/composables/useNlpAnalysis'
import type { TranslatedKeyword, ValidatePainResult, PainVerdictCategory } from '@shared/types/intent.types.js'
import { log } from '@/utils/logger'
import RadarThermometer from '@/components/shared/RadarThermometer.vue'
import NlpOptinBanner from './NlpOptinBanner.vue'
import ValidationSummary from './ValidationSummary.vue'
import ValidationRow from './ValidationRow.vue'
import RowDetail from './RowDetail.vue'

const props = withDefaults(defineProps<{
  translatedKeywords: TranslatedKeyword[]
  radarHeat?: { globalScore: number; heatLevel: string } | null
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const emit = defineEmits<{
  go: [keyword: string]
  nogo: []
  back: []
}>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const apiResults = ref<ValidatePainResult[]>([])
const selectedKeyword = ref<string | null>(null)
const expandedKeyword = ref<string | null>(null)

// NLP analysis composable
const { nlpState, nlpScoresForVerdict, analyzeKeywords: nlpAnalyze, autoReactivate } = useNlpAnalysis()
const nlpScoresRef = toRef(() => nlpScoresForVerdict.value)

// Multi-source verdict composable (with optional NLP signals)
const { verdicts, averageConfidence, verdictDistribution } = useMultiSourceVerdict(apiResults, nlpScoresRef)

// Verdict priority for sorting
const verdictPriority: Record<PainVerdictCategory, number> = {
  brulante: 1,
  confirmee: 2,
  emergente: 3,
  latente: 4,
  incertaine: 5,
  froide: 6,
}

// Sorted verdicts
const sortedVerdicts = computed(() => {
  return [...verdicts.value].sort((a, b) => {
    const pa = verdictPriority[a.verdict.category]
    const pb = verdictPriority[b.verdict.category]
    if (pa !== pb) return pa - pb
    return b.verdict.confidence - a.verdict.confidence
  })
})

function getVerdict(keyword: string): VerdictResult | undefined {
  return verdicts.value.find(v => v.keyword === keyword)
}

// Sources ratio
const sourcesRatio = computed(() => {
  const first = verdicts.value[0]
  if (!first) return '0/3'
  return `${first.verdict.sourcesAvailable}/${first.verdict.sourcesTotal}`
})

// Latent detection
const latentVerdict = computed(() => {
  return verdicts.value.find(v => v.verdict.category === 'latente')
})

// Validate keywords
async function validate() {
  if (props.translatedKeywords.length === 0) return
  if (isLoading.value) return
  isLoading.value = true
  error.value = null

  try {
    log.info('Validating pain keywords', { count: props.translatedKeywords.length })
    const data = await apiPost<{ results: ValidatePainResult[] }>('/keywords/validate-pain', {
      keywords: props.translatedKeywords.map(k => k.keyword),
    })

    apiResults.value = data.results
    log.info('Pain validation complete', { results: data.results.length })

    // Auto-select best keyword after verdicts compute
    setTimeout(() => {
      const best = sortedVerdicts.value[0]
      if (best) {
        selectedKeyword.value = best.keyword
      }
    }, 0)
  } catch (err) {
    log.error('Pain validation failed', { error: (err as Error).message })
    error.value = err instanceof Error ? err.message : 'Erreur validation multi-sources'
  } finally {
    isLoading.value = false
  }
}

async function retrySource(keyword: string, source: string) {
  // Re-validate the single keyword to refresh the specific source
  try {
    log.info('Retrying source validation', { keyword, source })
    const data = await apiPost<{ results: ValidatePainResult[] }>('/keywords/validate-pain', {
      keywords: [keyword],
    })
    const firstResult = data.results[0]
    if (firstResult) {
      const idx = apiResults.value.findIndex(r => r.keyword === keyword)
      if (idx >= 0) {
        apiResults.value[idx] = firstResult
        apiResults.value = [...apiResults.value] // trigger reactivity
      }
    }
  } catch (err) {
    log.warn('Source retry failed', { keyword, source, error: (err as Error).message })
  }
}

function handleGo() {
  if (selectedKeyword.value) {
    emit('go', selectedKeyword.value)
  }
}

function handleNogo() {
  emit('nogo')
}

function toggleDetail(keyword: string) {
  expandedKeyword.value = expandedKeyword.value === keyword ? null : keyword
}

// NLP handlers
async function handleNlpActivated() {
  if (apiResults.value.length > 0) {
    await nlpAnalyze(apiResults.value.map(r => r.keyword))
  }
}

function handleNlpDeactivated() {
  // NLP signals removed, verdicts recalculate automatically via reactivity
}

watch(() => props.translatedKeywords, (newVal) => {
  if (newVal.length > 0) validate()
}, { immediate: true })

// Auto-reactivate NLP if previously enabled
autoReactivate()
</script>

<template>
  <div class="pain-validation">
    <div class="validation-header">
      <h3 class="validation-title">Validation multi-sources</h3>
      <p class="validation-desc">
        Les mots-clés sont validés par 3 sources : DataForSEO, SERP Discussions communautaires, et Google Autocomplete
      </p>
    </div>

    <!-- Radar heat context -->
    <RadarThermometer
      v-if="radarHeat"
      :compact="true"
      :global-score="radarHeat.globalScore"
      :heat-level="radarHeat.heatLevel"
    />

    <!-- NLP Opt-in Banner (only show when there are results to analyze) -->
    <NlpOptinBanner
      v-if="verdicts.length > 0 || apiResults.length > 0"
      @nlp-activated="handleNlpActivated"
      @nlp-deactivated="handleNlpDeactivated"
    />

    <!-- Loading -->
    <div v-if="isLoading && apiResults.length === 0" class="validation-loading">
      <div class="spinner" />
      <p>Interrogation des 3 sources pour {{ translatedKeywords.length }} mots-clés...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="validation-error">
      <p>{{ error }}</p>
      <button class="btn-retry" @click="validate">Réessayer</button>
    </div>

    <!-- Results -->
    <template v-else-if="verdicts.length > 0 || isLoading">
      <!-- Summary banner -->
      <ValidationSummary
        v-if="!isLoading"
        :distribution="verdictDistribution"
        :average-confidence="averageConfidence"
        :sources-ratio="sourcesRatio"
        :latent-keyword="latentVerdict?.keyword ?? null"
        :latent-explanation="latentVerdict?.explanation ?? 'Opportunité first-mover : pas encore recherché mais déjà discuté'"
      />

      <!-- Results table -->
      <div class="validation-table-wrapper">
        <table class="validation-table">
          <thead>
            <tr>
              <th class="th-select"></th>
              <th class="th-keyword">Mot-clé</th>
              <th class="th-verdict">Verdict</th>
              <th class="th-confidence">Confiance</th>
              <th class="th-score">DFS</th>
              <th class="th-score">Comm</th>
              <th class="th-score">Auto</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="kw in (sortedVerdicts.length > 0 ? sortedVerdicts.map(v => v.keyword) : translatedKeywords.map(t => t.keyword))" :key="kw">
              <ValidationRow
                :keyword="translatedKeywords.find(t => t.keyword === kw) ?? { keyword: kw, reasoning: '' }"
                :verdict="getVerdict(kw)?.verdict ?? null"
                :per-source-scores="getVerdict(kw)?.perSourceScores ?? null"
                :selected="selectedKeyword === kw"
                :long-tail="getVerdict(kw)?.longTail ?? false"
                @select="selectedKeyword = kw"
                @toggle-detail="toggleDetail(kw)"
              />
              <!-- Row Detail (Level 2-3) -->
              <tr v-if="expandedKeyword === kw && getVerdict(kw)" class="row-detail-tr">
                <td :colspan="7" class="row-detail-td">
                  <RowDetail
                    :result="apiResults.find(r => r.keyword === kw)!"
                    :verdict="getVerdict(kw)!.verdict"
                    :explanation="getVerdict(kw)!.explanation"
                    @retry-source="(source: string) => retrySource(kw, source)"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Action buttons -->
      <div class="validation-actions">
        <button class="btn-back" @click="emit('back')">
          &larr; Modifier la douleur
        </button>
        <div class="validation-actions-right">
          <button class="btn-nogo" @click="handleNogo">
            Rejeter
          </button>
          <button
            class="btn-go"
            :disabled="!selectedKeyword"
            @click="handleGo"
          >
            Valider « {{ selectedKeyword }} » &rarr;
          </button>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else class="validation-empty">
      <p>Aucun mot-clé à valider. Retournez à l'onglet Douleur pour traduire un point de douleur.</p>
      <button class="btn-back" @click="emit('back')">&larr; Retour à la Douleur</button>
    </div>
  </div>
</template>

<style scoped>
.pain-validation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.validation-header {
  margin-bottom: 0.25rem;
}

.validation-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}

.validation-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

.validation-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--color-text-muted);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.validation-loading p {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
}

.validation-error {
  padding: 1rem;
  background: var(--color-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #dc2626);
  border-radius: 8px;
  color: var(--color-error, #dc2626);
  font-size: 0.8125rem;
}

.validation-error p { margin: 0 0 0.5rem; }

.btn-retry {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-error, #dc2626);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.validation-table-wrapper {
  overflow-x: auto;
}

.validation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.validation-table th {
  text-align: left;
  padding: 0.5rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
}

.validation-table td {
  padding: 0.625rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.th-select { width: 32px; }
.th-keyword { min-width: 180px; }
.th-verdict { width: 110px; }
.th-confidence { width: 120px; }
.th-score { width: 60px; text-align: center; }

.row-detail-tr .row-detail-td {
  padding: 0;
  border-bottom: 1px solid var(--color-border);
}

.validation-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.btn-back {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-back:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.validation-actions-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-nogo {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-error, #dc2626);
  background: none;
  border: 1px solid var(--color-error, #dc2626);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-nogo:hover {
  background: var(--color-error, #dc2626);
  color: white;
}

.btn-go {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-success, #16a34a);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-go:hover:not(:disabled) {
  background: var(--color-success-hover, #15803d);
}

.btn-go:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.validation-empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.validation-empty p {
  margin: 0 0 1rem;
  font-size: 0.875rem;
}
</style>
