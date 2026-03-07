<script setup lang="ts">
defineProps<{
  isGenerating: boolean
  hasOutline: boolean
  hasBriefData: boolean
}>()

defineEmits<{
  generate: []
  regenerate: []
}>()
</script>

<template>
  <div class="outline-actions">
    <h3 class="section-title">Sommaire</h3>

    <button
      v-if="!hasOutline && hasBriefData"
      class="action-btn primary"
      :disabled="isGenerating"
      @click="$emit('generate')"
    >
      <span v-if="isGenerating">Génération en cours...</span>
      <span v-else>Générer le sommaire</span>
    </button>

    <button
      v-if="hasOutline"
      class="action-btn secondary"
      :disabled="isGenerating"
      @click="$emit('regenerate')"
    >
      <span v-if="isGenerating">Régénération en cours...</span>
      <span v-else>Régénérer le sommaire</span>
    </button>
  </div>
</template>

<style scoped>
.outline-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.action-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
