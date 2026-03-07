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
  font-size: 0.6875rem;
  font-weight: 500;
  white-space: nowrap;
}

.kw--pilier {
  background: #dbeafe;
  color: var(--color-primary);
}

.kw--moyenne {
  background: #f1f5f9;
  color: var(--color-secondary);
}

.kw--longue {
  background: #f8fafc;
  color: #94a3b8;
}
</style>
