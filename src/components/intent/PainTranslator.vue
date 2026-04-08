<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'

const props = withDefaults(defineProps<{
  initialPainText?: string
  suggestedKeyword?: string
  mode?: 'workflow' | 'libre'
}>(), {
  initialPainText: '',
  suggestedKeyword: '',
  mode: 'workflow',
})

const emit = defineEmits<{
  explore: [keyword: string]
  translated: [keywords: { keyword: string; reasoning: string }[]]
}>()

const painText = ref(props.initialPainText)
const isLoading = ref(false)
const error = ref<string | null>(null)
const results = ref<{ keyword: string; reasoning: string; selected: boolean }[]>([])

watch(() => props.initialPainText, (newVal) => {
  painText.value = newVal
  results.value = []
  error.value = null
})

async function translatePain() {
  if (!painText.value.trim()) return
  isLoading.value = true
  error.value = null
  results.value = []

  try {
    log.info('Translating pain to keywords', { textLength: painText.value.length })
    const data = await apiPost<{ keywords: { keyword: string; reasoning: string }[] }>(
      '/keywords/translate-pain',
      { painText: painText.value },
    )
    const keywords = (data.keywords ?? []).map(k => ({ ...k, selected: false }))

    // Inject suggested keyword from article strategy if not already in results
    if (props.suggestedKeyword) {
      const alreadyPresent = keywords.some(
        k => k.keyword.toLowerCase() === props.suggestedKeyword.toLowerCase(),
      )
      if (!alreadyPresent) {
        keywords.unshift({
          keyword: props.suggestedKeyword,
          reasoning: 'Mot-clé suggéré par la stratégie du cocon',
          selected: false,
        })
      }
    }

    results.value = keywords
    log.info('Pain translation complete', { keywordCount: keywords.length })
  } catch (err) {
    log.error('Pain translation failed', { error: (err as Error).message })
    error.value = err instanceof Error ? err.message : 'Erreur traduction sémantique'
  } finally {
    isLoading.value = false
  }
}

function exploreSelected() {
  const selected = results.value.filter(r => r.selected)
  if (selected.length > 0 && selected[0]) {
    emit('explore', selected[0].keyword)
  }
}
</script>

<template>
  <div class="pain-translator">
    <div class="pain-header">
      <h3 class="pain-title">Traduction Sémantique</h3>
      <p class="pain-desc">Décrivez un problème client en langage naturel. L'IA le traduit en mots-clés SEO que Google comprend.</p>
    </div>

    <div class="pain-input-row">
      <textarea
        v-model="painText"
        class="pain-textarea"
        placeholder="Ex: Mes clients ne trouvent pas mon site sur Google quand ils cherchent un plombier à Toulouse..."
        rows="3"
      />
      <button
        class="pain-btn"
        :disabled="isLoading || !painText.trim()"
        @click="translatePain"
      >
        {{ isLoading ? 'Traduction...' : 'Traduire en mots-clés' }}
      </button>
    </div>

    <p v-if="error" class="pain-error">{{ error }}</p>

    <div v-if="results.length > 0" class="pain-results">
      <div
        v-for="(r, i) in results"
        :key="i"
        class="pain-result-row"
        :class="{ selected: r.selected }"
        @click="r.selected = !r.selected"
      >
        <input type="checkbox" :checked="r.selected" class="pain-checkbox" @click.stop="r.selected = !r.selected" />
        <div class="pain-result-content">
          <span class="pain-keyword">{{ r.keyword }}</span>
          <span class="pain-reasoning">{{ r.reasoning }}</span>
        </div>
      </div>
      <div class="pain-actions">
        <button
          class="pain-validate-btn"
          @click="emit('translated', results.map(r => ({ keyword: r.keyword, reasoning: r.reasoning })))"
        >
          Valider ces mots-clés via l'API &rarr;
        </button>
        <button
          v-if="results.some(r => r.selected)"
          class="pain-explore-btn"
          @click="exploreSelected"
        >
          Explorer directement
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pain-translator {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.pain-header {
  margin-bottom: 0.75rem;
}

.pain-title {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}

.pain-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

.pain-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.pain-textarea {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  resize: vertical;
  font-family: inherit;
  background: var(--color-background);
  color: var(--color-text);
}

.pain-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.pain-btn {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.pain-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.pain-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pain-error {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-error, #dc2626);
}

.pain-results {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.pain-result-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.pain-result-row:hover {
  border-color: var(--color-primary);
}

.pain-result-row.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.pain-checkbox {
  margin-top: 2px;
  cursor: pointer;
}

.pain-result-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.pain-keyword {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.pain-reasoning {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.pain-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.pain-validate-btn {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.pain-validate-btn:hover {
  background: var(--color-primary-hover);
}

.pain-explore-btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  background: none;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.pain-explore-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
