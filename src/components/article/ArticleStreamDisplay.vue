<script setup lang="ts">
import { computed } from 'vue'
import { mergeConsecutiveElements } from '@shared/html-utils'

const props = defineProps<{
  streamedText: string
  content: string | null
  isGenerating: boolean
}>()

/** Append a blinking cursor to the streamed HTML for visual feedback */
const streamedWithCursor = computed(() =>
  props.streamedText + '<span class="streaming-cursor">&#x2588;</span>',
)

/** Final content with consecutive same-tag elements merged (safety net for old articles) */
const processedContent = computed(() =>
  props.content ? mergeConsecutiveElements(props.content) : null,
)
</script>

<template>
  <!-- Streaming view: rendered HTML blocks with animated cursor -->
  <div v-if="isGenerating && streamedText" class="article-content streaming" v-html="streamedWithCursor" />

  <!-- Final rendered HTML content -->
  <div v-else-if="processedContent" class="article-content" v-html="processedContent" />
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

/* Bordure visible sur CHAQUE bloc enfant */
.article-content :deep(h2) {
  font-size: 1.375rem;
  margin: 1.5rem 0 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.article-content :deep(h3) {
  font-size: 1.125rem;
  margin: 1.25rem 0 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-primary);
  border-radius: 4px;
  color: var(--color-text);
}

.article-content :deep(p) {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  padding: 0.75rem 1rem 0.75rem 2rem;
  margin: 0.5rem 0;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.article-content :deep(blockquote) {
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  background: var(--color-bg-soft);
  border-radius: 0 4px 4px 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.article-content :deep(table) {
  margin: 0.5rem 0;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
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
