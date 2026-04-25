<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VerdictLevel } from '@shared/types/index.js'
import { VERDICT_CONFIG } from '@/composables/ui/useVerdictColors'

const props = withDefaults(defineProps<{
  parsedHtml: string
  isStreaming: boolean
  error: string | null
  defaultOpen?: boolean
  /** Sprint 3.2 — When true, show the regenerate icon. Parent provides the handler via @regenerate. */
  canRegenerate?: boolean
  /** Étape 3F — Mini résumé verdict affiché en tête du panel (optionnel). */
  verdictSummary?: { level: VerdictLevel; label: string; reason?: string } | null
}>(), {
  defaultOpen: true,
  canRegenerate: false,
  verdictSummary: null,
})

const verdictConfig = computed(() =>
  props.verdictSummary ? VERDICT_CONFIG[props.verdictSummary.level] : null,
)

const emit = defineEmits<{
  (e: 'regenerate'): void
}>()

const panelOpen = ref(props.defaultOpen)

function handleRegenerateClick(ev: MouseEvent) {
  ev.stopPropagation()
  // Lightweight guard: confirm before burning another Claude call.
  const ok = window.confirm('Regenerer l\'avis expert IA ? Cela consommera un appel Claude.')
  if (ok) emit('regenerate')
}
</script>

<template>
  <div class="ai-panel" data-testid="ai-panel">
    <button class="ai-panel-toggle" data-testid="ai-panel-toggle" @click="panelOpen = !panelOpen">
      <span class="ai-panel-toggle-icon">{{ panelOpen ? '\u25BC' : '\u25B6' }}</span>
      Avis expert IA
      <span v-if="isStreaming" class="ai-panel-streaming-dot" />
      <!-- Sprint 3.2 — regenerate icon. Only visible when parsedHtml exists to
           avoid double-trigger during initial stream. -->
      <button
        v-if="canRegenerate && !isStreaming && parsedHtml"
        type="button"
        class="ai-panel-regen"
        title="Regenerer l'avis"
        aria-label="Regenerer l'avis"
        data-testid="ai-panel-regen"
        @click="handleRegenerateClick"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 11-3.3-6.95"/>
          <path d="M21 4v5h-5"/>
        </svg>
      </button>
    </button>
    <div v-if="panelOpen" class="ai-panel-content" data-testid="ai-panel-content">
      <!-- Étape 3F — Mini bandeau verdict en tête du panel (info, non-bloquant). -->
      <div
        v-if="verdictSummary && verdictConfig"
        class="ai-panel-verdict"
        data-testid="ai-panel-verdict"
        :style="{ borderColor: verdictConfig.color, background: verdictConfig.bg }"
      >
        <span class="ai-panel-verdict__icon" :aria-hidden="true">{{ verdictConfig.icon }}</span>
        <span class="ai-panel-verdict__level" :style="{ color: verdictConfig.color }">{{ verdictSummary.level }}</span>
        <span class="ai-panel-verdict__label">{{ verdictSummary.label }}</span>
        <span v-if="verdictSummary.reason" class="ai-panel-verdict__reason">· {{ verdictSummary.reason }}</span>
      </div>

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

.ai-panel-regen {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: all 0.15s;
}
.ai-panel-regen:hover {
  background: var(--color-primary, #3b82f6);
  color: white;
  border-color: var(--color-primary, #3b82f6);
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.ai-panel-content {
  padding: 1rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.ai-panel-verdict {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.ai-panel-verdict__icon {
  font-size: 0.875rem;
}

.ai-panel-verdict__level {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.ai-panel-verdict__label {
  color: var(--color-text, #1e293b);
}

.ai-panel-verdict__reason {
  color: var(--color-text-muted, #64748b);
  font-style: italic;
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
