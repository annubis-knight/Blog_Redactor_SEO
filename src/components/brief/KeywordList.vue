<script setup lang="ts">
import { computed } from 'vue'
import type { Keyword } from '@shared/types/index.js'
import KeywordBadge from '@/components/shared/KeywordBadge.vue'

const props = defineProps<{
  keywords: Keyword[]
}>()

const grouped = computed(() => {
  const groups: Record<string, Keyword[]> = {
    'Pilier': [],
    'Moyenne traine': [],
    'Longue traine': [],
  }
  for (const kw of props.keywords) {
    const group = groups[kw.type]
    if (group) {
      group.push(kw)
    }
  }
  return groups
})
</script>

<template>
  <section class="keyword-list">
    <h3 class="section-title">Mots-clés associés ({{ keywords.length }})</h3>

    <div v-for="(kws, type) in grouped" :key="type" class="keyword-group">
      <template v-if="kws.length > 0">
        <h4 class="group-title">{{ type }} <span class="group-count">({{ kws.length }})</span></h4>
        <div class="keyword-badges">
          <KeywordBadge v-for="kw in kws" :key="kw.keyword" :keyword="kw" />
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.keyword-list {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--color-text);
}

.keyword-group {
  margin-bottom: 0.75rem;
}

.group-title {
  font-size: 0.8125rem;
  font-weight: 500;
  margin: 0 0 0.5rem;
  color: var(--color-text-muted);
}

.group-count {
  font-weight: 400;
}

.keyword-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
</style>
