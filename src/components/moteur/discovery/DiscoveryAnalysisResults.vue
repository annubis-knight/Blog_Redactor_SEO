<script setup lang="ts">
import type { AnalysisResult } from '@shared/types/discovery-tab.types'

defineProps<{
  analysisResult: AnalysisResult | null
  isAllAnalysisSelected: () => boolean
  isSelected: (keyword: string) => boolean
  isMultiSource: (keyword: string) => boolean
  sourceCountLabel: (keyword: string) => string | null
}>()

defineEmits<{
  (e: 'toggle-select', keyword: string): void
  (e: 'toggle-select-all'): void
}>()
</script>

<template>
  <section v-if="analysisResult" class="analysis-results">
    <div class="analysis-results__header">
      <h3 class="analysis-results__title">Recommandation IA</h3>
      <span class="analysis-results__count">{{ analysisResult.keywords.length }} mots-cles</span>
      <label class="analysis-results__check-all" @click.stop>
        <input
          type="checkbox"
          :checked="isAllAnalysisSelected()"
          @change="$emit('toggle-select-all')"
        />
        Tout selectionner
      </label>
    </div>
    <p class="analysis-results__summary">{{ analysisResult.summary }}</p>

    <ul class="analysis-list">
      <li
        v-for="(kw, index) in analysisResult.keywords"
        :key="kw.keyword"
        class="analysis-item"
        :class="{
          'analysis-item--selected': isSelected(kw.keyword),
          'analysis-item--high': kw.priority === 'high',
          'analysis-item--medium': kw.priority === 'medium',
          'analysis-item--low': kw.priority === 'low',
        }"
        @click="$emit('toggle-select', kw.keyword)"
      >
        <input
          type="checkbox"
          :checked="isSelected(kw.keyword)"
          @click.stop
          @change="$emit('toggle-select', kw.keyword)"
        />
        <span class="analysis-item__rank">{{ index + 1 }}</span>
        <span class="analysis-item__priority" :class="'priority--' + kw.priority">
          {{ kw.priority === 'high' ? '🔴' : kw.priority === 'medium' ? '🟡' : '🟢' }}
        </span>
        <div class="analysis-item__content">
          <span
            class="analysis-item__keyword"
            :class="{ 'source-item__keyword--multi': isMultiSource(kw.keyword) }"
          >{{ kw.keyword }}</span>
          <span v-if="sourceCountLabel(kw.keyword)" class="multi-badge">{{ sourceCountLabel(kw.keyword) }}</span>
          <p class="analysis-item__reasoning">{{ kw.reasoning }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.analysis-results {
  border: 1px solid rgba(37, 99, 235, 0.3);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface);
}

.analysis-results__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(37, 99, 235, 0.08));
  border-bottom: 1px solid var(--color-border);
}

.analysis-results__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.analysis-results__count {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.analysis-results__summary {
  padding: 10px 14px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  border-bottom: 1px solid var(--color-border);
  margin: 0;
}

.analysis-results__check-all {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  cursor: pointer;
  font-weight: 500;
}

.analysis-results__check-all input {
  cursor: pointer;
}

.analysis-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 500px;
  overflow-y: auto;
}

.analysis-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.1s;
}

.analysis-item:last-child {
  border-bottom: none;
}

.analysis-item:hover {
  background: var(--color-bg-hover);
}

.analysis-item--selected {
  background: rgba(37, 99, 235, 0.04);
}

.analysis-item input[type="checkbox"] {
  margin-top: 3px;
  cursor: pointer;
  flex-shrink: 0;
}

.analysis-item__rank {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 18px;
  text-align: right;
  margin-top: 2px;
  flex-shrink: 0;
}

.analysis-item__priority {
  font-size: 0.75rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.analysis-item__content {
  flex: 1;
  min-width: 0;
}

.analysis-item__keyword {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.analysis-item--high .analysis-item__keyword {
  color: #dc2626;
}

.analysis-item--medium .analysis-item__keyword {
  color: var(--color-text);
}

.analysis-item--low .analysis-item__keyword {
  color: var(--color-text-muted);
}

.analysis-item__reasoning {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin: 2px 0 0;
}

.source-item__keyword--multi {
  color: var(--color-primary);
  font-weight: 600;
}

.multi-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>
