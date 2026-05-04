<script setup lang="ts">
import type { WordGroup } from '@shared/types/discovery-tab.types'

defineProps<{
  wordGroups: WordGroup[]
  wordGroupsLoading: boolean
  hasResults: boolean
  activeGroupFilter: string | null
}>()

defineEmits<{
  (e: 'group-click', word: string): void
}>()
</script>

<template>
  <aside class="discovery-sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">Groupes de mots</h3>
      <span v-if="wordGroupsLoading" class="spinner-small" />
    </div>

    <ul v-if="wordGroups.length > 0" class="group-list">
      <li
        v-for="group in wordGroups"
        :key="group.normalized"
        class="group-item"
        :class="{ 'group-item--active': activeGroupFilter === group.normalized }"
        @click="$emit('group-click', group.normalized)"
      >
        <span class="group-item__word">{{ group.word }}</span>
        <span class="group-item__count">{{ group.count }}</span>
      </li>
    </ul>

    <p v-else-if="!wordGroupsLoading && hasResults" class="sidebar-empty">
      Pas assez de données pour les groupes.
    </p>
  </aside>
</template>

<style scoped>
.discovery-sidebar {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--color-surface);
  align-self: flex-start;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sidebar-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: background 0.1s;
}

.group-item:hover {
  background: var(--color-bg-hover);
}

.group-item--active {
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
}

.group-item__word {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-item__count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  background: var(--color-bg-hover);
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
  margin-left: 4px;
}

.group-item--active .group-item__count {
  background: rgba(37, 99, 235, 0.15);
  color: var(--color-primary);
}

.sidebar-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
