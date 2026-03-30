<script setup lang="ts">
export type SourceState = 'ok' | 'loading' | 'pending' | 'error' | 'disabled'

defineProps<{
  sources: {
    autocomplete: SourceState
    dataforseo: SourceState
    discussions: SourceState
    nlp: SourceState
  }
}>()

const labels: Record<string, string> = {
  autocomplete: 'Autocomplete',
  dataforseo: 'DataForSEO',
  discussions: 'Discussions',
  nlp: 'NLP',
}

const order = ['autocomplete', 'dataforseo', 'discussions', 'nlp'] as const
</script>

<template>
  <div class="source-dots">
    <span
      v-for="key in order"
      :key="key"
      class="source-dot"
      :class="`source-dot--${sources[key]}`"
      :title="`${labels[key]} : ${sources[key]}`"
    />
  </div>
</template>

<style scoped>
.source-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.source-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* OK — green solid */
.source-dot--ok {
  background: var(--color-success, #16a34a);
}

/* Loading — orange pulse */
.source-dot--loading {
  background: var(--color-warning, #d97706);
  animation: dotPulse 1s infinite;
}

/* Pending — grey outline */
.source-dot--pending {
  background: transparent;
  border: 1.5px solid var(--color-text-muted, #94a3b8);
}

/* Error — red solid */
.source-dot--error {
  background: var(--color-error, #dc2626);
}

/* Disabled — dashed outline */
.source-dot--disabled {
  background: transparent;
  border: 1.5px dashed var(--color-text-muted, #94a3b8);
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
