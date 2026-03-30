<script setup lang="ts">
import type { Outline } from '@shared/types/index.js'

defineProps<{
  outline: Outline | null
  streamedText: string
  isGenerating: boolean
}>()

const levelIcons: Record<number, string> = {
  1: '★',
  2: '●',
  3: '·',
}

const annotationLabels: Record<string, string> = {
  'sommaire-cliquable': 'Sommaire',
  'content-valeur': 'Contenu valeur',
  'content-reminder': 'Rappel',
  'answer-capsule': 'Answer Capsule',
}
</script>

<template>
  <!-- Streaming view: raw text with cursor -->
  <div v-if="isGenerating" class="streaming-view">
    <pre class="streaming-text">{{ streamedText }}<span class="cursor">▊</span></pre>
  </div>

  <!-- Structured outline view -->
  <div v-else-if="outline" class="outline-display">
    <div
      v-for="section in outline.sections"
      :key="section.id"
      class="outline-section"
      :class="`level-${section.level}`"
    >
      <span class="section-icon">{{ levelIcons[section.level] ?? '·' }}</span>
      <span class="section-title">{{ section.title }}</span>
      <span
        v-if="section.annotation"
        class="annotation-badge"
        :class="`annotation--${section.annotation}`"
      >
        {{ annotationLabels[section.annotation] ?? section.annotation }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.streaming-view {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.75rem;
}

.streaming-text {
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  animation: blink 0.8s infinite;
  color: var(--color-primary);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.outline-display {
  margin-top: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.outline-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
}

.level-1 {
  padding-left: 0;
  font-weight: 700;
  font-size: 1rem;
}

.level-2 {
  padding-left: 1.25rem;
  font-weight: 500;
  font-size: 0.9375rem;
}

.level-3 {
  padding-left: 2.5rem;
  font-weight: 400;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.section-icon {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
  color: var(--color-primary);
}

.level-3 .section-icon {
  color: var(--color-text-muted);
}

.section-title {
  color: var(--color-text);
}

.level-3 .section-title {
  color: var(--color-text-muted);
}

.annotation-badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.annotation--sommaire-cliquable {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.annotation--content-valeur {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.annotation--content-reminder {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.annotation--answer-capsule {
  background: var(--color-badge-purple-bg);
  color: var(--color-badge-purple-text);
}
</style>
