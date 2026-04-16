<script setup lang="ts">
import { computed } from 'vue'
import { mergeConsecutiveElements, removeEmptyElements } from '@shared/html-utils'

const props = defineProps<{
  streamedText: string
  content: string | null
  isGenerating: boolean
}>()

/** Append a blinking cursor to the streamed HTML for visual feedback */
const streamedWithCursor = computed(() =>
  props.streamedText + '<span class="streaming-cursor">&#x2588;</span>',
)

/** Final content: merge consecutive tags, then strip empty elements */
const processedContent = computed(() =>
  props.content ? removeEmptyElements(mergeConsecutiveElements(props.content)) : null,
)
</script>

<template>
  <!-- Streaming view: rendered HTML blocks with animated cursor -->
  <div v-if="isGenerating && streamedText" class="article-content streaming" v-safe-html="streamedWithCursor" />

  <!-- Final rendered HTML content -->
  <div v-else-if="processedContent" class="article-content" v-safe-html="processedContent" />
</template>

<style scoped>
.article-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem 2rem;
  margin-top: 0.75rem;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.8;
  color: var(--color-text);
}

.article-content.streaming {
  border-color: var(--color-primary);
  border-style: dashed;
}

/* --- Uniform border/padding on block elements --- */

.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(p),
.article-content :deep(ul),
.article-content :deep(ol),
.article-content :deep(blockquote),
.article-content :deep(table),
.article-content :deep(div) {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.article-content :deep(h2) {
  font-size: 1.375rem;
  font-weight: 700;
  margin-top: 1.5rem;
}

.article-content :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1.25rem;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  padding-left: 2rem;
}

.article-content :deep(blockquote) {
  color: var(--color-text-muted);
  font-style: italic;
}

.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.article-content :deep(.streaming-cursor) {
  animation: blink 0.8s infinite;
  color: var(--color-primary);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
