<script setup lang="ts">
import type { Keyword } from '@shared/types/index.js'

const props = defineProps<{
  keyword: Keyword
}>()

const typeClass: Record<string, string> = {
  'Pilier': 'kw--pilier',
  'Moyenne traine': 'kw--moyenne',
  'Longue traine': 'kw--longue',
}
</script>

<template>
  <span class="keyword-badge" :class="typeClass[props.keyword.type]">
    {{ props.keyword.keyword }}
  </span>
</template>

<style scoped>
.keyword-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.kw--pilier {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.kw--moyenne {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

.kw--longue {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}
</style>
