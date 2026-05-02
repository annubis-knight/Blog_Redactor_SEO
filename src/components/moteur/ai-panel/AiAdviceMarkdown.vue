<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  /** Markdown brut (peut être streamé chunk par chunk). */
  markdown: string
  /** Affiche un curseur clignotant en fin de texte pendant le streaming. */
  streaming?: boolean
}>()

const renderedHtml = computed(() => {
  if (!props.markdown) return ''
  const html = marked.parse(props.markdown, { async: false }) as string
  return DOMPurify.sanitize(html)
})
</script>

<template>
  <div class="aip-advice" data-testid="ai-advice-markdown">
    <!-- eslint-disable-next-line vue/no-v-html — sanitized via DOMPurify above -->
    <div class="aip-advice__content" v-html="renderedHtml" />
    <span v-if="streaming" class="aip-advice__caret" aria-hidden="true">▍</span>
  </div>
</template>

<style scoped>
.aip-advice {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text);
}
.aip-advice__content :deep(h1),
.aip-advice__content :deep(h2),
.aip-advice__content :deep(h3) {
  margin: 1rem 0 0.5rem;
  color: var(--color-heading);
}
.aip-advice__content :deep(p) { margin: 0.5rem 0; }
.aip-advice__content :deep(ul),
.aip-advice__content :deep(ol) { margin: 0.5rem 0; padding-left: 1.5rem; }
.aip-advice__content :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-hover);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}
.aip-advice__caret {
  display: inline-block;
  color: var(--color-badge-purple-text);
  animation: aip-blink 1s step-end infinite;
}
@keyframes aip-blink {
  50% { opacity: 0; }
}
</style>
