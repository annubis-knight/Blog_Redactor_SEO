<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import LieutenantCard from '@/components/moteur/LieutenantCard.vue'
import type { ProposedLieutenant } from '@shared/types/serp-analysis.types.js'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{
  iaIsStreaming: boolean
  iaChunks: string
  iaError: string | null
  lieutenantCards: ProposedLieutenant[]
  eliminatedCards: ProposedLieutenant[]
  totalGenerated: number
  selectedCards: Map<string, ProposedLieutenant>
  isLocked: boolean
  contentGapInsights: string
}>()

defineEmits<{
  'toggle': [card: ProposedLieutenant]
  'retry': []
}>()

const showEliminated = ref(false)

function isCardSelected(keyword: string, selected: Map<string, ProposedLieutenant>): boolean {
  return selected.has(keyword)
}

// Sprint 4.3 — render contentGapInsights as markdown (same pipeline as Captain AI panel).
const parsedInsights = computed(() =>
  props.contentGapInsights ? (marked.parse(props.contentGapInsights) as string) : '',
)
</script>

<template>
  <div class="ia-proposal-section" data-testid="ia-proposal-section">
    <h3 class="section-title">
      Lieutenants proposes par l'IA
      <span v-if="iaIsStreaming" class="pulse-dot" />
    </h3>

    <div v-if="iaIsStreaming" class="ia-loading" data-testid="ia-loading">
      <span class="pulse-dot" /> Analyse IA en cours...
    </div>

    <div v-else-if="iaError" class="ia-error" data-testid="ia-error">
      <p>{{ iaError }}</p>
      <button class="btn-retry" @click="$emit('retry')">Relancer la proposition IA</button>
    </div>

    <template v-else-if="lieutenantCards.length > 0">
      <div class="lieutenant-counter" data-testid="lieutenant-counter">
        {{ selectedCards.size }} lieutenant{{ selectedCards.size > 1 ? 's' : '' }}
        selectionne{{ selectedCards.size > 1 ? 's' : '' }}
        sur {{ totalGenerated }} generes par l'IA
        <span v-if="eliminatedCards.length > 0" class="filter-info">
          ({{ lieutenantCards.length }} retenus, {{ eliminatedCards.length }} elimines)
        </span>
      </div>

      <div class="lieutenant-cards-list" data-testid="lieutenant-cards-list">
        <LieutenantCard
          v-for="lt in lieutenantCards"
          :key="lt.keyword"
          :lieutenant="lt"
          :checked="isCardSelected(lt.keyword, selectedCards)"
          :disabled="isLocked"
          @update:checked="$emit('toggle', lt)"
        />
      </div>

      <div v-if="eliminatedCards.length > 0" class="eliminated-section" data-testid="eliminated-section">
        <button class="eliminated-toggle" @click="showEliminated = !showEliminated">
          <span class="eliminated-toggle-icon">{{ showEliminated ? '\u25BC' : '\u25B6' }}</span>
          Autres candidats ({{ eliminatedCards.length }})
        </button>
        <div v-if="showEliminated" class="eliminated-cards-list" data-testid="eliminated-cards-list">
          <LieutenantCard
            v-for="lt in eliminatedCards"
            :key="lt.keyword"
            :lieutenant="lt"
            :checked="isCardSelected(lt.keyword, selectedCards)"
            :disabled="isLocked"
            class="eliminated"
            @update:checked="$emit('toggle', lt)"
          />
        </div>
      </div>

      <div v-if="contentGapInsights" class="content-gap-section">
        <strong>Failles de contenu</strong>
        <div class="content-gap-md ai-markdown" v-safe-html="parsedInsights" />
      </div>
    </template>

    <p v-else class="section-empty">L'IA proposera des lieutenants apres l'analyse SERP.</p>
  </div>
</template>

<style scoped>
.ia-proposal-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-heading);
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

.ia-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.ia-error { padding: 0.5rem; background: var(--color-block-error-bg, #fef2f2); border-radius: 6px; }
.ia-error p { margin: 0 0 0.5rem 0; font-size: 0.8125rem; color: var(--color-error, #ef4444); }

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

.btn-retry:hover { background: var(--color-primary); color: white; }

.lieutenant-counter { padding: 0.5rem 0; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-muted); }
.filter-info { font-weight: 400; color: var(--color-text-muted); font-size: 0.75rem; }

.lieutenant-cards-list { display: flex; flex-direction: column; gap: 0.5rem; }

.content-gap-section {
  margin-top: 0.5rem;
  padding: 0.75rem;
  font-size: 0.8125rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 6px;
  line-height: 1.5;
}
/* Sprint 4.3 — markdown styles for content-gap insights */
.content-gap-md { margin-top: 0.25rem; }
.content-gap-md :deep(h1),
.content-gap-md :deep(h2),
.content-gap-md :deep(h3) {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.875rem;
  font-weight: 700;
}
.content-gap-md :deep(h3) { font-size: 0.8125rem; }
.content-gap-md :deep(p) { margin: 0.25rem 0; }
.content-gap-md :deep(ul),
.content-gap-md :deep(ol) {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
}
.content-gap-md :deep(li) { margin-bottom: 0.125rem; }
.content-gap-md :deep(strong) { font-weight: 700; }

.eliminated-section { margin-top: 0.5rem; }

.eliminated-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.eliminated-toggle:hover { color: var(--color-primary); border-color: var(--color-primary); }
.eliminated-toggle-icon { font-size: 0.625rem; flex-shrink: 0; }

.eliminated-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
}

.eliminated { opacity: 0.7; }

.section-empty { margin: 0; padding: 0.5rem 0; font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; }
</style>
