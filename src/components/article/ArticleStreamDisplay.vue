<script setup lang="ts">
defineProps<{
  streamedText: string
  content: string | null
  isGenerating: boolean
}>()
</script>

<template>
  <!-- Streaming view: raw HTML text with animated cursor -->
  <div v-if="isGenerating" class="streaming-view">
    <pre class="streaming-text">{{ streamedText }}<span class="cursor">&#x2588;</span></pre>
  </div>

  <!-- Final rendered HTML content -->
  <div v-else-if="content" class="article-content" v-html="content" />
</template>

<style scoped>
.streaming-view {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
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

.article-content :deep(h2) {
  font-size: 1.375rem;
  margin: 1.5rem 0 0.75rem;
  color: var(--color-text);
}

.article-content :deep(h3) {
  font-size: 1.125rem;
  margin: 1.25rem 0 0.5rem;
  color: var(--color-text);
}

.article-content :deep(p) {
  margin: 0.5rem 0;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.article-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
