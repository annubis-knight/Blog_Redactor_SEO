<script setup lang="ts">
/**
 * Section "Suggestions longue-traine" affichee SOUS le container principal
 * de cards Radar. Optionnelle (declenchement manuel via bouton). Apparait
 * seulement si >= 2 mots-cles racines presents.
 *
 * - Bouton "Suggerer" : 1er trigger → POST /long-tail.
 * - Top 5 par preferenceScore desc pre-cochees.
 * - Toggle individuel + persistance debounce (cf. composable).
 * - Bouton "Regenerer" discret apres 1ere generation.
 * - Selection remontee au parent via emit('update:selected-keywords').
 */
import { computed, watch } from 'vue'
import { useLongTailSuggestions } from '@/composables/intent/useLongTailSuggestions'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

const props = withDefaults(defineProps<{
  articleId: number
  articleTitle: string
  articlePainPoint: string
  /** Mots-cles racines tires des cards Radar (input pour l'IA). */
  radarKeywords: { keyword: string }[]
  /** Suggestions deja persistees en DB (hydrate au mount). */
  initialSuggestions?: LongTailSuggestion[]
  /** Selection deja persistee en DB (hydrate au mount). */
  initialSelectedKeywords?: string[]
}>(), {
  initialSuggestions: () => [],
  initialSelectedKeywords: () => [],
})

const emit = defineEmits<{
  (e: 'update:selected-keywords', keywords: string[]): void
  (e: 'update:selected-suggestions', suggestions: LongTailSuggestion[]): void
}>()

const {
  status,
  suggestions,
  selectedKeywords,
  error,
  generate,
  regenerate,
  toggle,
  hydrate,
  getSelectedSuggestions,
} = useLongTailSuggestions(props.articleId)

// Hydrate au mount si la DB nous a passe des suggestions
if (props.initialSuggestions.length > 0) {
  hydrate(props.initialSuggestions, props.initialSelectedKeywords)
}

const isVisible = computed(() => props.radarKeywords.length >= 2)

const showRegenerateButton = computed(() => status.value === 'success' && suggestions.value.length > 0)

const isLoading = computed(() => status.value === 'loading')

async function handleGenerate() {
  try {
    await generate(props.radarKeywords, props.articleTitle, props.articlePainPoint)
  } catch {
    // erreur deja loggee dans le composable, status passe a 'error'
  }
}

async function handleRegenerate() {
  try {
    await regenerate(props.radarKeywords, props.articleTitle, props.articlePainPoint)
  } catch {
    // idem
  }
}

function handleToggle(keyword: string) {
  toggle(keyword)
}

// Remonte les changements de selection au parent
watch(
  () => Array.from(selectedKeywords.value),
  (arr) => {
    emit('update:selected-keywords', arr)
    emit('update:selected-suggestions', getSelectedSuggestions())
  },
  { deep: true },
)

function badgeColorForScore(score: number): string {
  if (score >= 8) return 'var(--color-success, #16a34a)'
  if (score >= 6) return 'var(--color-warning, #d97706)'
  if (score >= 4) return 'var(--color-text-muted, #6b7280)'
  return 'var(--color-text-muted, #94a3b8)'
}
</script>

<template>
  <section v-if="isVisible" class="long-tail-section" data-testid="radar-long-tail-section">
    <header class="lt-header">
      <div class="lt-header-text">
        <h4 class="lt-title">Suggestions longue-traine</h4>
        <p class="lt-desc">
          Combinaisons IA generees a partir des mots-cles Radar. Coche celles a envoyer au Capitaine.
        </p>
      </div>
      <div class="lt-header-actions">
        <button
          v-if="status === 'idle' || status === 'error'"
          class="btn-suggest"
          data-testid="btn-suggest-longtail"
          :disabled="isLoading"
          @click="handleGenerate"
        >
          {{ status === 'error' ? 'Reessayer' : '✨ Suggerer des combinaisons' }}
        </button>
        <button
          v-if="showRegenerateButton"
          class="btn-regenerate"
          data-testid="btn-regenerate-longtail"
          :disabled="isLoading"
          :title="'La regeneration ecrase les suggestions actuelles mais conserve les longues-traines cochees encore presentes dans la nouvelle liste.'"
          @click="handleRegenerate"
        >
          ⟳ Regenerer
        </button>
      </div>
    </header>

    <div v-if="isLoading" class="lt-loading" data-testid="longtail-loading">
      <div class="spinner" />
      <span>L'IA genere les suggestions…</span>
    </div>

    <div v-if="status === 'error' && error" class="lt-error">
      Erreur : {{ error }}
    </div>

    <ul v-if="status === 'success' && suggestions.length > 0" class="lt-list" data-testid="longtail-list">
      <li
        v-for="(suggestion, idx) in suggestions"
        :key="suggestion.keyword"
        class="lt-row"
      >
        <label class="lt-row-label">
          <input
            type="checkbox"
            :data-testid="`longtail-checkbox-${idx}`"
            :checked="selectedKeywords.has(suggestion.keyword)"
            :aria-label="`${suggestion.keyword} — score ${suggestion.preferenceScore} sur 10`"
            @change="handleToggle(suggestion.keyword)"
          />
          <span
            class="lt-score-badge"
            :style="{ backgroundColor: badgeColorForScore(suggestion.preferenceScore) }"
            :title="`Score de preference IA : ${suggestion.preferenceScore}/10`"
          >
            {{ suggestion.preferenceScore }}/10
          </span>
          <span class="lt-keyword">{{ suggestion.keyword }}</span>
        </label>
        <p class="lt-rationale">{{ suggestion.rationale }}</p>
        <div v-if="suggestion.derivedFromRoots.length > 0" class="lt-roots">
          <span class="lt-roots-label">Sources :</span>
          <span
            v-for="root in suggestion.derivedFromRoots"
            :key="root"
            class="lt-root-badge"
          >{{ root }}</span>
        </div>
      </li>
    </ul>

    <p v-else-if="status === 'success' && suggestions.length === 0" class="lt-empty">
      L'IA n'a propose aucune combinaison pertinente cette fois.
    </p>
  </section>
</template>

<style scoped>
.long-tail-section {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  animation: fadeSlideIn 0.3s ease;
}

.lt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.lt-title {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}

.lt-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.lt-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-suggest,
.btn-regenerate {
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
}

.btn-suggest {
  background: var(--color-primary, #3b82f6);
  color: #fff;
}

.btn-suggest:hover:not(:disabled) {
  background: var(--color-primary-hover, #2563eb);
}

.btn-suggest:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-regenerate {
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.btn-regenerate:hover:not(:disabled) {
  background: var(--color-background-mute, #f1f5f9);
  color: var(--color-text);
}

.btn-regenerate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lt-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.lt-error {
  padding: 0.625rem 0.875rem;
  background: var(--color-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #dc2626);
  border-radius: 6px;
  color: var(--color-error, #dc2626);
  font-size: 0.8125rem;
}

.lt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lt-row {
  padding: 0.625rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.lt-row-label {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
}

.lt-row-label input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.lt-score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.lt-keyword {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text);
}

.lt-rationale {
  margin: 0 0 0 calc(16px + 0.625rem + 42px + 0.625rem);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.lt-roots {
  margin-left: calc(16px + 0.625rem + 42px + 0.625rem);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.lt-roots-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.lt-root-badge {
  display: inline-flex;
  padding: 0.125rem 0.375rem;
  background: var(--color-background-mute, #f1f5f9);
  border-radius: 3px;
  font-size: 0.6875rem;
  color: var(--color-text);
}

.lt-empty {
  margin: 0;
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
