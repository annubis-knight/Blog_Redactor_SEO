<script setup lang="ts">
import AiPanelHeader from '@/components/moteur/ai-panel/AiPanelHeader.vue'

/**
 * Panel IA Lieutenants (streaming brut, CTA Régénérer, content-gap insights).
 * Main containers (cards, structure) sont au niveau LieutenantsPanel.
 * Test: tests/unit/components/lieutenants-selection-architecture.test.ts
 */

defineProps<{
  iaIsStreaming: boolean
  iaChunks: string
  iaError: string | null
  contentGapInsights: string
  totalGenerated: number
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <section class="lieutenants-ai-panel" data-testid="ai-panel-suggestion">
    <AiPanelHeader
      title="Suggestions IA Lieutenants"
      subtitle="Streaming IA brut, régénération et insights de content-gap. Les propositions sélectionnables se trouvent dans la section principale au-dessus."
    />

    <!-- Erreur IA -->
    <div v-if="iaError" class="lap__error" role="alert">
      <p>{{ iaError }}</p>
      <button type="button" class="lap__retry-btn" data-testid="ai-retry-btn" @click="emit('retry')">
        Régénérer
      </button>
    </div>

    <!-- Streaming brut (pendant que l'IA produit) -->
    <div v-else-if="iaIsStreaming" class="lap__streaming" aria-live="polite">
      <div class="lap__pulse" aria-hidden="true"></div>
      <pre class="lap__chunks">{{ iaChunks }}</pre>
    </div>

    <!-- Content-gap insights (après génération) -->
    <div v-else-if="contentGapInsights" class="lap__insights">
      <h4 class="lap__insights-title">Content-gap détecté</h4>
      <p class="lap__insights-body">{{ contentGapInsights }}</p>
    </div>

    <!-- État neutre : invitation à régénérer -->
    <div v-else class="lap__idle">
      <p class="lap__idle-hint">
        <template v-if="totalGenerated > 0">
          {{ totalGenerated }} proposition{{ totalGenerated > 1 ? 's' : '' }} générée{{ totalGenerated > 1 ? 's' : '' }} par l'IA.
        </template>
        <template v-else>
          Aucune génération IA pour ce Capitaine.
        </template>
      </p>
      <button
        type="button"
        class="lap__retry-btn"
        data-testid="ai-regen-btn"
        @click="emit('retry')"
      >
        {{ totalGenerated > 0 ? 'Régénérer les suggestions' : 'Lancer une suggestion IA' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.lieutenants-ai-panel {
  margin-top: 2rem;
  padding: 1.5rem;
  border-top: 2px solid var(--color-badge-purple-text);
  background: var(--color-badge-purple-bg);
  border-radius: 0 0 8px 8px;
}

.lap__error {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 6px;
  color: var(--color-error, #ef4444);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.lap__streaming {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lap__pulse {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--color-badge-purple-text), transparent, var(--color-badge-purple-text));
  background-size: 200% 100%;
  border-radius: 2px;
  animation: lap-pulse 1.5s linear infinite;
}

@keyframes lap-pulse {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

.lap__chunks {
  margin: 0;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted, #475569);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
}

.lap__insights {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
}

.lap__insights-title {
  margin: 0 0 0.375rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-badge-purple-text);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.lap__insights-body {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text, #1e293b);
}

.lap__idle {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
}

.lap__idle-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

.lap__retry-btn {
  padding: 0.375rem 0.875rem;
  background: var(--color-badge-purple-text);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}
.lap__retry-btn:hover { filter: brightness(0.92); }
</style>
