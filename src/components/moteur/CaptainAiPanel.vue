<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  parsedHtml: string
  isStreaming: boolean
  error: string | null
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const panelOpen = ref(props.defaultOpen)
</script>

<template>
  <div class="ai-panel" data-testid="ai-panel">
    <button class="ai-panel-toggle" data-testid="ai-panel-toggle" @click="panelOpen = !panelOpen">
      <span class="ai-panel-toggle-icon">{{ panelOpen ? '\u25BC' : '\u25B6' }}</span>
      Avis expert IA
      <span v-if="isStreaming" class="ai-panel-streaming-dot" />
    </button>
    <div v-if="panelOpen" class="ai-panel-content" data-testid="ai-panel-content">
      <div v-if="isStreaming && !parsedHtml" class="ai-panel-loading">
        Analyse en cours...
      </div>
      <div v-else-if="error" class="ai-panel-error">
        {{ error }}
      </div>
      <div
        v-else-if="parsedHtml"
        class="ai-panel-text ai-markdown"
        data-testid="ai-panel-text"
        v-safe-html="parsedHtml"
      />
      <div v-else class="ai-panel-empty">
        En attente des résultats de validation...
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  margin-top: 1.25rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.ai-panel-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-surface, #f8fafc);
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  cursor: pointer;
  text-align: left;
}

.ai-panel-toggle-icon {
  font-size: 0.625rem;
  color: var(--color-text-muted, #64748b);
}

.ai-panel-streaming-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary, #3b82f6);
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.ai-panel-content {
  padding: 1rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.ai-panel-loading,
.ai-panel-empty {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  font-style: italic;
}

.ai-panel-error {
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

.ai-markdown {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-text, #1e293b);
}

.ai-markdown :deep(h1),
.ai-markdown :deep(h2),
.ai-markdown :deep(h3) {
  margin: 0.75rem 0 0.375rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-heading, #0f172a);
}

.ai-markdown :deep(h3) {
  font-size: 0.875rem;
}

.ai-markdown :deep(p) {
  margin: 0.375rem 0;
}

.ai-markdown :deep(ul),
.ai-markdown :deep(ol) {
  margin: 0.375rem 0;
  padding-left: 1.25rem;
}

.ai-markdown :deep(li) {
  margin-bottom: 0.25rem;
}

.ai-markdown :deep(code) {
  background: var(--color-bg-hover, #f1f5f9);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-size: 0.75rem;
}

.ai-markdown :deep(strong) {
  font-weight: 700;
}
</style>
