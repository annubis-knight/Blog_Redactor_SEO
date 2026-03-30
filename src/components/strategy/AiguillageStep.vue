<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AiguillageData } from '@shared/types/index.js'
import type { Cocoon } from '@shared/types/index.js'

const props = defineProps<{
  aiguillage: AiguillageData
  cocoon: Cocoon | null
  isSuggesting: boolean
}>()

const emit = defineEmits<{
  (e: 'update:aiguillage', data: AiguillageData): void
  (e: 'request-suggestion'): void
}>()

const selectedType = ref(props.aiguillage.suggestedType ?? 'Intermédiaire')

const articlesByType = computed(() => {
  if (!props.cocoon) return { pilier: [], intermediaire: [], specialise: [] }
  return {
    pilier: props.cocoon.articles.filter(a => a.type === 'Pilier'),
    intermediaire: props.cocoon.articles.filter(a => a.type === 'Intermédiaire'),
    specialise: props.cocoon.articles.filter(a => a.type === 'Spécialisé'),
  }
})

function validate() {
  emit('update:aiguillage', {
    ...props.aiguillage,
    suggestedType: selectedType.value as any,
    validated: true,
  })
}
</script>

<template>
  <div class="aiguillage-step">
    <h3 class="step-title">Aiguillage sémantique</h3>
    <p class="step-desc">Où se positionne cet article dans l'arborescence du cocon ?</p>

    <div v-if="cocoon" class="cocoon-tree">
      <div class="tree-section">
        <span class="tree-label">Pilier</span>
        <ul class="tree-list">
          <li v-for="a in articlesByType.pilier" :key="a.slug" class="tree-item pilier">{{ a.title }}</li>
          <li v-if="articlesByType.pilier.length === 0" class="tree-empty">Aucun</li>
        </ul>
      </div>
      <div class="tree-section">
        <span class="tree-label">Intermédiaire</span>
        <ul class="tree-list">
          <li v-for="a in articlesByType.intermediaire" :key="a.slug" class="tree-item inter">{{ a.title }}</li>
          <li v-if="articlesByType.intermediaire.length === 0" class="tree-empty">Aucun</li>
        </ul>
      </div>
      <div class="tree-section">
        <span class="tree-label">Spécialisé</span>
        <ul class="tree-list">
          <li v-for="a in articlesByType.specialise" :key="a.slug" class="tree-item spec">{{ a.title }}</li>
          <li v-if="articlesByType.specialise.length === 0" class="tree-empty">Aucun</li>
        </ul>
      </div>
    </div>

    <div class="type-selector">
      <label class="input-label">Type d'article suggéré</label>
      <div class="type-options">
        <button
          v-for="t in ['Pilier', 'Intermédiaire', 'Spécialisé']"
          :key="t"
          class="type-btn"
          :class="{ active: selectedType === t }"
          @click="selectedType = t as any"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <div class="step-actions">
      <button
        class="btn-suggest"
        :disabled="isSuggesting"
        @click="$emit('request-suggestion')"
      >
        {{ isSuggesting ? 'Chargement...' : 'Suggérer le positionnement' }}
      </button>
    </div>

    <div v-if="aiguillage.suggestedType" class="suggestion-box">
      <p class="suggestion-label">Suggestion :</p>
      <p class="suggestion-text">
        Type suggéré : <strong>{{ aiguillage.suggestedType }}</strong>
        <template v-if="aiguillage.suggestedParent"> — Parent : {{ aiguillage.suggestedParent }}</template>
      </p>
      <div v-if="aiguillage.suggestedChildren.length > 0">
        <p class="suggestion-text">Articles enfants : {{ aiguillage.suggestedChildren.join(', ') }}</p>
      </div>
    </div>

    <button class="btn-validate" :disabled="!selectedType" @click="validate">
      Valider le positionnement
    </button>

    <div v-if="aiguillage.validated" class="validated-badge">
      Positionnement validé : {{ aiguillage.suggestedType ?? selectedType }}
    </div>
  </div>
</template>

<style scoped>
.aiguillage-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

.cocoon-tree {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.tree-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.tree-list {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tree-item {
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-bg-soft);
}

.tree-empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.input-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.type-options {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  cursor: pointer;
  background: transparent;
  color: var(--color-text);
  transition: all 0.15s;
}

.type-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 600;
}

.type-btn:hover:not(.active) {
  background: var(--color-bg-soft);
}

.step-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-suggest {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}

.btn-suggest:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-suggest:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestion-box {
  padding: 1rem;
  border-left: 3px solid var(--color-primary);
  background: var(--color-surface);
  border-radius: 0 6px 6px 0;
}

.suggestion-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 0.5rem;
  text-transform: uppercase;
}

.suggestion-text {
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
  color: var(--color-text);
}

.btn-validate {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  align-self: flex-start;
}

.btn-validate:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-validate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.validated-badge {
  padding: 0.625rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  background: var(--color-bg-elevated, #e8f5e9);
  font-size: 0.8125rem;
  color: var(--color-success);
}
</style>
