<script setup lang="ts">
export interface TabCacheEntry {
  tabId: string
  tabLabel: string
  hasCachedData: boolean
  summary?: string
  isCurrentTab: boolean
}

const props = defineProps<{
  entries: TabCacheEntry[]
  activeTab: string
}>()

const emit = defineEmits<{
  navigate: [tabId: string]
}>()

const cachedCount = computed(() => props.entries.filter(e => e.hasCachedData).length)

import { computed } from 'vue'
</script>

<template>
  <div class="tab-cache-panel">
    <span class="tcp-label">
      Résultats disponibles ({{ cachedCount }}/{{ entries.length }})
    </span>
    <div class="tcp-chips">
      <button
        v-for="entry in entries"
        :key="entry.tabId"
        class="tcp-chip"
        :class="{
          'tcp-chip--cached': entry.hasCachedData,
          'tcp-chip--empty': !entry.hasCachedData,
          'tcp-chip--current': entry.isCurrentTab,
        }"
        @click="entry.hasCachedData ? emit('navigate', entry.tabId) : undefined"
      >
        <span v-if="entry.hasCachedData" class="tcp-chip-icon">✓</span>
        <span class="tcp-chip-label">{{ entry.tabLabel }}</span>
        <span v-if="entry.hasCachedData && entry.summary" class="tcp-chip-summary">
          {{ entry.summary }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-cache-panel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(22, 163, 74, 0.06);
  border: 1px solid rgba(22, 163, 74, 0.2);
  border-radius: 8px;
  font-size: 0.8125rem;
}

.tcp-label {
  font-weight: 600;
  color: #15803d;
  white-space: nowrap;
  flex-shrink: 0;
}

.tcp-chips {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.tcp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: default;
  transition: all 0.15s;
  background: none;
}

.tcp-chip--cached {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
  border-color: rgba(22, 163, 74, 0.3);
  cursor: pointer;
}

.tcp-chip--cached:hover {
  background: rgba(22, 163, 74, 0.18);
  border-color: rgba(22, 163, 74, 0.5);
}

.tcp-chip--empty {
  background: var(--color-bg-soft, #f1f5f9);
  color: var(--color-text-muted, #94a3b8);
  border-color: var(--color-border, #e2e8f0);
}

.tcp-chip--current {
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 1px var(--color-primary, #2563eb);
}

.tcp-chip-icon {
  font-size: 0.625rem;
  font-weight: 700;
}

.tcp-chip-label {
  font-weight: 600;
}

.tcp-chip-summary {
  font-weight: 400;
  opacity: 0.75;
  font-size: 0.625rem;
}
</style>
