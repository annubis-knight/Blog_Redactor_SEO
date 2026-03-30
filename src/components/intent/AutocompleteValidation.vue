<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIntentStore } from '@/stores/intent.store'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const props = withDefaults(defineProps<{
  keyword: string
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const emit = defineEmits<{
  'explore-keyword': [keyword: string]
}>()

const intentStore = useIntentStore()

const DEFAULT_PREFIXES = [
  '{kw} pour',
  '{kw} a',
  'comment {kw}',
  '{kw} prix',
  'meilleur {kw}',
]

const showPrefixes = ref(false)
const customPrefix = ref('')

const result = computed(() => intentStore.autocompleteData)
const isLoading = computed(() => intentStore.isValidatingAutocomplete)

const statusLabel = computed(() => {
  if (isLoading.value) return 'En attente'
  if (!result.value) return 'En attente'
  return result.value.validated ? 'Valide' : 'Non trouve'
})

const statusClass = computed(() => {
  if (isLoading.value || !result.value) return 'status-pending'
  return result.value.validated ? 'status-validated' : 'status-not-found'
})

const statusIcon = computed(() => {
  if (isLoading.value || !result.value) return '\u23F3'
  return result.value.validated ? '\u2705' : '\u274C'
})

const certaintyPercent = computed(() => {
  if (!result.value) return 0
  return Math.round(result.value.certaintyIndex.total * 100)
})

const certaintyColor = computed(() => {
  if (certaintyPercent.value >= 70) return 'var(--color-success)'
  if (certaintyPercent.value >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
})

// Human-readable labels for certainty breakdown
const volumeLabel = computed(() => {
  if (!result.value) return ''
  const v = result.value.certaintyIndex.volumeNormalized
  if (v === 0) return 'Aucun'
  if (v < 0.1) return 'Faible'
  if (v < 0.5) return 'Moyen'
  return 'Fort'
})

const serpLabel = computed(() => {
  if (!result.value) return ''
  const d = result.value.certaintyIndex.serpDensity
  if (d < 0.3) return 'Faible'
  if (d < 0.6) return 'Moyenne'
  return 'Forte'
})

const suggestions = computed(() =>
  result.value?.suggestions.slice(0, 15) ?? [],
)

const resolvedPrefixes = computed(() =>
  DEFAULT_PREFIXES.map(p => p.replace('{kw}', props.keyword)),
)

function handleExpandWithPrefixes() {
  const prefixes = [...resolvedPrefixes.value]
  if (customPrefix.value.trim()) {
    prefixes.push(customPrefix.value.trim())
  }
  intentStore.validateAutocomplete(props.keyword, prefixes)
  showPrefixes.value = false
}

function handleSuggestionClick(keyword: string) {
  emit('explore-keyword', keyword)
}
</script>

<template>
  <div class="autocomplete-validation">
    <div class="validation-header">
      <h3 class="section-title">Validation Autocomplete</h3>
      <span class="status-badge" :class="statusClass">
        <span class="status-icon">{{ statusIcon }}</span>
        {{ statusLabel }}
      </span>
    </div>

    <!-- Single action: expand with variants -->
    <div class="actions-row">
      <button
        class="btn btn-sm btn-outline"
        :disabled="isLoading"
        @click="showPrefixes = !showPrefixes"
      >
        {{ showPrefixes ? 'Masquer' : 'Variantes...' }}
      </button>
    </div>

    <!-- Prefix expansion panel -->
    <div v-if="showPrefixes" class="prefix-panel">
      <span class="prefix-label">Explorer des variantes du mot-cle</span>
      <div class="prefix-chips">
        <span
          v-for="p in resolvedPrefixes"
          :key="p"
          class="prefix-chip"
        >{{ p }}</span>
      </div>
      <div class="prefix-custom-row">
        <input
          v-model="customPrefix"
          type="text"
          class="prefix-input"
          placeholder="Ajouter une variante..."
          @keydown.enter="handleExpandWithPrefixes"
        />
        <button
          class="btn btn-sm btn-primary"
          :disabled="isLoading"
          @click="handleExpandWithPrefixes"
        >
          {{ isLoading ? 'Expansion...' : 'Lancer' }}
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="isLoading" />

    <template v-if="result && !isLoading">
      <!-- Human-readable certainty indicators -->
      <div class="certainty-indicators">
        <span
          class="indicator"
          :class="result.validated ? 'indicator--success' : 'indicator--error'"
          :title="`Autocomplete: ${result.validated ? 'ce mot-cle apparait dans les suggestions Google' : 'non trouve dans les suggestions Google'}`"
        >
          {{ result.validated ? '\u2705' : '\u274C' }}
          {{ result.validated ? 'Trouve dans Google' : 'Absent de Google' }}
        </span>
        <span
          class="indicator"
          :class="{
            'indicator--success': result.certaintyIndex.volumeNormalized >= 0.5,
            'indicator--warning': result.certaintyIndex.volumeNormalized > 0 && result.certaintyIndex.volumeNormalized < 0.5,
            'indicator--muted': result.certaintyIndex.volumeNormalized === 0,
          }"
          :title="`Volume de recherche normalise: ${Math.round(result.certaintyIndex.volumeNormalized * 100)}%`"
        >
          Volume : {{ volumeLabel }}
        </span>
        <span
          class="indicator"
          :class="{
            'indicator--success': result.certaintyIndex.serpDensity >= 0.6,
            'indicator--warning': result.certaintyIndex.serpDensity >= 0.3,
            'indicator--muted': result.certaintyIndex.serpDensity < 0.3,
          }"
          :title="`Densite de resultats organiques: ${Math.round(result.certaintyIndex.serpDensity * 100)}%`"
        >
          SERP : {{ serpLabel }}
        </span>
        <span class="certainty-summary" :style="{ color: certaintyColor }">
          (certitude : {{ certaintyPercent }}%)
        </span>
      </div>

      <!-- Autocomplete suggestions (clickable) -->
      <div v-if="suggestions.length > 0" class="suggestions-list">
        <span class="suggestions-title">Suggestions — cliquez pour explorer</span>
        <div class="suggestions-tags">
          <button
            v-for="s in suggestions"
            :key="s.keyword"
            class="suggestion-tag"
            title="Cliquer pour explorer ce mot-cle"
            @click="handleSuggestionClick(s.keyword)"
          >
            {{ s.keyword }}
            <span v-if="s.searchVolume !== null" class="suggestion-vol">
              {{ s.searchVolume.toLocaleString('fr-FR') }}
            </span>
            <span class="suggestion-arrow">&rarr;</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.autocomplete-validation {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.validation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.actions-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}

/* Prefix panel */
.prefix-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.625rem;
  background: var(--color-bg-soft);
  border-radius: 6px;
}

.prefix-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.prefix-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.prefix-chip {
  padding: 0.125rem 0.5rem;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.prefix-custom-row {
  display: flex;
  gap: 0.5rem;
}

.prefix-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
}

.prefix-input:focus {
  border-color: var(--color-primary);
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-icon {
  font-size: 0.8125rem;
}

.status-validated {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.status-not-found {
  background: #fee2e2;
  color: #991b1b;
}

.status-pending {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

/* Certainty indicators */
.certainty-indicators {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-soft);
  border-radius: 6px;
}

.indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.indicator--success { color: var(--color-success); }
.indicator--warning { color: var(--color-warning); }
.indicator--error { color: var(--color-error); }
.indicator--muted { color: var(--color-text-muted); }

.certainty-summary {
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

/* Suggestions */
.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.suggestions-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.suggestions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.suggestion-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-primary-soft, #eff6ff);
  border: 1px dashed var(--color-primary);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.15s;
}

.suggestion-tag:hover {
  background: var(--color-primary);
  color: white;
  border-style: solid;
}

.suggestion-arrow {
  font-size: 0.6875rem;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.suggestion-tag:hover .suggestion-arrow {
  opacity: 1;
}

.suggestion-vol {
  font-size: 0.625rem;
  font-weight: 600;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
</style>
