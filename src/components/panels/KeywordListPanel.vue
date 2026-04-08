<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  keywords: string[]
  label: string
}>()

const filteredKeywords = computed(() => props.keywords.filter(k => k.trim() !== ''))
</script>

<template>
  <div class="keyword-list-panel" :aria-label="`Liste ${label}`">
    <div class="keyword-summary">
      {{ filteredKeywords.length }} terme{{ filteredKeywords.length !== 1 ? 's' : '' }}
    </div>
    <div v-if="filteredKeywords.length > 0" class="keyword-list">
      <span
        v-for="(kw, i) in filteredKeywords"
        :key="i"
        class="keyword-tag"
      >
        {{ kw }}
      </span>
    </div>
    <div v-else class="keyword-empty">
      Aucun terme défini
    </div>
  </div>
</template>

<style scoped>
.keyword-list-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.keyword-summary {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 500;
}

.keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.keyword-tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.6875rem;
  background: var(--color-badge-green-bg, #d1fae5);
  color: var(--color-badge-green-text, #065f46);
}

.keyword-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}
</style>
