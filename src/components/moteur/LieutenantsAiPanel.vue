<script setup lang="ts">
import { ref } from 'vue'
import AiPanelHeader from '@/components/moteur/ai-panel/AiPanelHeader.vue'
import LieutenantProposals from '@/components/moteur/LieutenantProposals.vue'
import LieutenantH2Structure from '@/components/moteur/LieutenantH2Structure.vue'
import type { ProposedLieutenant, ProposeLieutenantsHnNode, HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'
import type { SerpAnalysisResult } from '@shared/types/index.js'

/**
 * Sprint C-1 (2026-05-02) — Wrapper bas-de-page qui regroupe les deux panels
 * IA Lieutenants : propositions de mots-clés et structure Hn recommandée.
 *
 * Sous la coque visuelle commune (header + couleur purple identique aux autres
 * panels IA du Moteur). Toggle entre les deux sections (l'utilisateur voit
 * l'une à la fois pour éviter la surcharge cognitive).
 *
 * Note : on n'utilise pas <AiPanel> directement car son state machine
 * (idle/streaming/success/error) ne s'aligne pas avec le double sous-état
 * (proposals streaming + Hn streaming). On réutilise AiPanelHeader + tokens
 * CSS purple pour conserver le vocabulaire visuel commun.
 */
defineProps<{
  // Props LieutenantProposals
  iaIsStreaming: boolean
  iaChunks: string
  iaError: string | null
  lieutenantCards: ProposedLieutenant[]
  eliminatedCards: ProposedLieutenant[]
  totalGenerated: number
  selectedCards: Map<string, ProposedLieutenant>
  isLocked: boolean
  contentGapInsights: string
  // Props LieutenantH2Structure
  hnStructure: ProposeLieutenantsHnNode[]
  activeHnRecurrence: HnRecurrenceItem[]
  hnRecurrence: HnRecurrenceItem[]
  serpResultsByKeyword: Map<string, SerpAnalysisResult>
  activeHnTab: string
  hnSaved: boolean
  isSavingHn: boolean
}>()

const emit = defineEmits<{
  toggle: [card: ProposedLieutenant]
  retry: []
  'save-hn': []
  'update:activeHnTab': [value: string]
}>()

type TabKey = 'proposals' | 'hn'
const activeTab = ref<TabKey>('proposals')
</script>

<template>
  <section class="lieutenants-ai-panel" data-testid="ai-panel-suggestion">
    <AiPanelHeader
      title="Suggestions IA Lieutenants"
      subtitle="Propositions de mots-clés et structure Hn recommandée par l'IA."
    />

    <div class="lieutenants-panel-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="lieutenants-tab"
        :class="{ 'lieutenants-tab--active': activeTab === 'proposals' }"
        :aria-selected="activeTab === 'proposals'"
        data-testid="lieutenants-tab-proposals"
        @click="activeTab = 'proposals'"
      >
        Propositions ({{ lieutenantCards.length }})
      </button>
      <button
        type="button"
        role="tab"
        class="lieutenants-tab"
        :class="{ 'lieutenants-tab--active': activeTab === 'hn' }"
        :aria-selected="activeTab === 'hn'"
        data-testid="lieutenants-tab-hn"
        @click="activeTab = 'hn'"
      >
        Structure Hn ({{ hnStructure.length }})
      </button>
    </div>

    <LieutenantProposals
      v-if="activeTab === 'proposals'"
      :ia-is-streaming="iaIsStreaming"
      :ia-chunks="iaChunks"
      :ia-error="iaError"
      :lieutenant-cards="lieutenantCards"
      :eliminated-cards="eliminatedCards"
      :total-generated="totalGenerated"
      :selected-cards="selectedCards"
      :is-locked="isLocked"
      :content-gap-insights="contentGapInsights"
      @toggle="(card) => emit('toggle', card)"
      @retry="emit('retry')"
    />

    <LieutenantH2Structure
      v-else-if="activeTab === 'hn'"
      :hn-structure="hnStructure"
      :active-hn-recurrence="activeHnRecurrence"
      :hn-recurrence="hnRecurrence"
      :serp-results-by-keyword="serpResultsByKeyword"
      :active-hn-tab="activeHnTab"
      :is-locked="isLocked"
      :hn-saved="hnSaved"
      :is-saving-hn="isSavingHn"
      @save-hn="emit('save-hn')"
      @update:active-hn-tab="(value) => emit('update:activeHnTab', value)"
    />
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
.lieutenants-panel-tabs {
  display: flex;
  gap: 0.25rem;
  margin: 1rem 0;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}
.lieutenants-tab {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.lieutenants-tab:hover {
  color: var(--color-text, #1e293b);
}
.lieutenants-tab--active {
  color: var(--color-badge-purple-text);
  border-bottom-color: var(--color-badge-purple-text);
}
</style>
