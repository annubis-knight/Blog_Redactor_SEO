<script setup lang="ts">
import { computed } from 'vue'
import { useIntentStore } from '@/stores/keyword/intent.store'
import type { SerpModuleType } from '@shared/types/index.js'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

const props = withDefaults(defineProps<{
  keyword: string
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const intentStore = useIntentStore()

const moduleColors: Record<SerpModuleType, { bg: string; text: string }> = {
  local_pack: { bg: '#fee2e2', text: '#991b1b' },
  featured_snippet: { bg: '#dbeafe', text: '#1e40af' },
  people_also_ask: { bg: '#dcfce7', text: '#166534' },
  video: { bg: '#f3e8ff', text: '#7c3aed' },
  images: { bg: '#fef3c7', text: '#92400e' },
  shopping: { bg: '#fce7f3', text: '#9d174d' },
  knowledge_graph: { bg: '#e0e7ff', text: '#3730a3' },
  top_stories: { bg: '#ccfbf1', text: '#115e59' },
}

const moduleLabels: Record<SerpModuleType, string> = {
  local_pack: 'Local Pack',
  featured_snippet: 'Featured Snippet',
  people_also_ask: 'People Also Ask',
  video: 'Video',
  images: 'Images',
  shopping: 'Shopping',
  knowledge_graph: 'Knowledge Graph',
  top_stories: 'Top Stories',
}

const intentLabels: Record<string, string> = {
  informational: 'Informationnel',
  transactional_local: 'Transactionnel Local',
  navigational: 'Navigationnel',
  mixed: 'Mixte',
}

const presentModules = computed(() =>
  intentStore.intentData?.modules.filter(m => m.present) ?? [],
)

const topResults = computed(() =>
  intentStore.intentData?.topOrganicResults.slice(0, 5) ?? [],
)

const totalScore = computed(() => {
  if (!intentStore.intentData?.scores.length) return 0
  const scores = intentStore.intentData.scores
  const sum = scores.reduce((acc, s) => acc + s.score, 0)
  const max = scores.reduce((acc, s) => acc + s.maxScore, 0)
  return max > 0 ? Math.round((sum / max) * 100) : 0
})

const priorityColors: Record<string, string> = {
  high: 'var(--color-error)',
  medium: 'var(--color-warning)',
  low: 'var(--color-text-muted)',
}

function handleAnalyze() {
  intentStore.analyzeIntent(props.keyword)
}
</script>

<template>
  <section class="intent-step">
    <div class="step-header">
      <h2 class="step-title">Analyse d'intention SERP</h2>
      <p class="step-keyword">{{ keyword }}</p>
    </div>

    <button
      v-if="!intentStore.intentData && !intentStore.isAnalyzingIntent"
      class="btn btn-primary"
      @click="handleAnalyze"
    >
      Analyser l'intention de recherche
    </button>

    <LoadingSpinner v-if="intentStore.isAnalyzingIntent" />

    <ErrorMessage
      v-if="intentStore.intentError && !intentStore.isAnalyzingIntent"
      :message="intentStore.intentError"
      @retry="handleAnalyze"
    />

    <template v-if="intentStore.intentData && !intentStore.isAnalyzingIntent">
      <!-- SERP Modules -->
      <CollapsableSection title="Modules SERP detectes">
        <div class="modules-grid">
          <span
            v-for="mod in presentModules"
            :key="mod.type"
            class="module-badge"
            :style="{
              background: moduleColors[mod.type].bg,
              color: moduleColors[mod.type].text,
            }"
          >
            {{ moduleLabels[mod.type] }}
            <span v-if="mod.position" class="module-pos">#{{ mod.position }}</span>
          </span>
          <span v-if="presentModules.length === 0" class="no-modules">
            Aucun module SERP special detecte
          </span>
        </div>
      </CollapsableSection>

      <!-- Dominant Intent & Score -->
      <div class="intent-overview">
        <div class="intent-classification">
          <span class="classification-label">Intent dominant</span>
          <span class="classification-badge">
            {{ intentLabels[intentStore.intentData.classification.type] ?? intentStore.intentData.classification.type }}
          </span>
          <span class="confidence">
            Confiance : {{ Math.round(intentStore.intentData.classification.confidence * 100) }}%
          </span>
          <p class="reasoning">{{ intentStore.intentData.classification.reasoning }}</p>
        </div>
        <ScoreGauge :score="totalScore" label="Intent" size="md" />
      </div>

      <!-- Score Breakdown -->
      <CollapsableSection title="Detail des scores" :default-open="false">
        <div class="score-list">
          <div
            v-for="s in intentStore.intentData.scores"
            :key="s.category"
            class="score-row"
          >
            <span class="score-category">{{ s.category }}</span>
            <div class="score-bar-track">
              <div
                class="score-bar-fill"
                :style="{ width: `${s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0}%` }"
              ></div>
            </div>
            <span class="score-value">{{ s.score }}/{{ s.maxScore }}</span>
          </div>
        </div>
      </CollapsableSection>

      <!-- Recommendations -->
      <CollapsableSection title="Recommandations">
        <div class="recommendations">
          <div
            v-for="(rec, idx) in intentStore.intentData.recommendations"
            :key="idx"
            class="rec-card"
          >
            <div class="rec-header">
              <span
                class="module-badge module-badge--sm"
                :style="{
                  background: moduleColors[rec.module].bg,
                  color: moduleColors[rec.module].text,
                }"
              >
                {{ moduleLabels[rec.module] }}
              </span>
              <span class="rec-priority" :style="{ color: priorityColors[rec.priority] }">
                {{ rec.priority }}
              </span>
            </div>
            <p class="rec-action">{{ rec.action }}</p>
          </div>
        </div>
      </CollapsableSection>

      <!-- PAA Questions (Epic 18) -->
      <CollapsableSection
        v-if="intentStore.paaQuestions.length > 0"
        title="Questions People Also Ask"
      >
        <p class="paa-hint">
          Ces questions sont posees par les internautes. Utilisez-les comme H2 ou FAQ.
        </p>
        <ol class="paa-list">
          <li v-for="(q, idx) in intentStore.paaQuestions" :key="idx" class="paa-item">
            {{ q }}
          </li>
        </ol>
      </CollapsableSection>

      <!-- Top Organic Results -->
      <CollapsableSection title="Top 5 resultats organiques" :default-open="false">
        <ol class="organic-list">
          <li v-for="result in topResults" :key="result.position" class="organic-item">
            <span class="organic-pos">{{ result.position }}</span>
            <div class="organic-info">
              <a :href="result.url" target="_blank" rel="noopener" class="organic-title">
                {{ result.title }}
              </a>
              <span class="organic-domain">{{ result.domain }}</span>
              <p class="organic-desc">{{ result.description }}</p>
            </div>
          </li>
        </ol>
      </CollapsableSection>

    </template>
  </section>
</template>

<style scoped>
.intent-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-header {
  margin-bottom: 0.5rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 0.25rem;
}

.step-keyword {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

/* Buttons */
.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

/* Module badges */
.modules-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.module-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.module-badge--sm {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
}

.module-pos {
  font-weight: 400;
  opacity: 0.8;
}

.no-modules {
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-style: italic;
}

/* Intent overview */
.intent-overview {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.intent-classification {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.classification-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.classification-badge {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  width: fit-content;
}

.confidence {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.reasoning {
  font-size: 0.8125rem;
  color: var(--color-text);
  margin: 0.25rem 0 0;
  line-height: 1.5;
}

/* Score breakdown */
.score-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score-category {
  flex-shrink: 0;
  width: 140px;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.score-bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.score-value {
  flex-shrink: 0;
  width: 48px;
  text-align: right;
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

/* Recommendations */
.recommendations {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.rec-card {
  padding: 0.75rem;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.rec-priority {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rec-action {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* Organic results */
.organic-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.organic-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.15s;
}

.organic-item:hover {
  background: var(--color-bg-hover);
}

.organic-pos {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  background: var(--color-bg-soft);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.organic-info {
  flex: 1;
  min-width: 0;
}

.organic-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.organic-title:hover {
  text-decoration: underline;
}

.organic-domain {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.organic-desc {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* PAA */
.paa-hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.paa-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.paa-item {
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* Step actions */
.step-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
}
</style>
