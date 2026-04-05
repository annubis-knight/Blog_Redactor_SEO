<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  words: string[]
  activeCount: number
  minActiveCount: number
  loading: boolean
}>()

const emit = defineEmits<{
  'update:activeCount': [count: number]
}>()

type WordState = 'core' | 'active' | 'inactive'

const wordStates = computed((): WordState[] =>
  props.words.map((_, i) => {
    if (i < props.minActiveCount) return 'core'
    if (i < props.activeCount) return 'active'
    return 'inactive'
  }),
)

function handleClick(index: number) {
  const state = wordStates.value[index]
  if (state === 'core') return
  if (state === 'active') {
    // Remove this word and all after it
    emit('update:activeCount', index)
  } else {
    // Restore up to and including this word
    emit('update:activeCount', index + 1)
  }
}
</script>

<template>
  <span class="kw-words">
    <span
      v-for="(word, i) in words"
      :key="`${word}-${i}`"
      class="kw-word"
      :class="{
        'kw-word--core': wordStates[i] === 'core',
        'kw-word--active': wordStates[i] === 'active',
        'kw-word--inactive': wordStates[i] === 'inactive',
      }"
      @click.stop="handleClick(i)"
    >{{ word }}</span>
    <span v-if="loading" class="kw-loading" />
  </span>
</template>

<style scoped>
.kw-words {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35em;
  align-items: baseline;
}

.kw-word {
  transition: color 0.15s, opacity 0.15s;
}

.kw-word--core {
  color: var(--color-text);
  cursor: default;
}

.kw-word--active {
  color: var(--color-text);
  text-decoration: underline dotted;
  cursor: pointer;
}

.kw-word--active:hover {
  color: var(--color-danger, #ef4444);
}

.kw-word--inactive {
  color: var(--color-text-muted);
  opacity: 0.4;
  text-decoration: line-through;
  cursor: pointer;
}

.kw-word--inactive:hover {
  opacity: 0.7;
}

.kw-loading {
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  border: 2px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  animation: kw-spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes kw-spin {
  to { transform: rotate(360deg); }
}
</style>
