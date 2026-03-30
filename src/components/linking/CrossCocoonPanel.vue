<script setup lang="ts">
import type { CrossCocoonOpportunity } from '@shared/types/index.js'

defineProps<{
  opportunities: CrossCocoonOpportunity[]
}>()
</script>

<template>
  <div class="cross-cocoon">
    <h3 class="panel-title">
      Opportunités cross-cocon
      <span v-if="opportunities.length > 0" class="opp-count">{{ opportunities.length }}</span>
    </h3>

    <div v-if="opportunities.length === 0" class="panel-empty">
      Aucune opportunité cross-cocon détectée.
    </div>

    <div v-else class="opp-list">
      <div v-for="(opp, i) in opportunities" :key="i" class="opp-item">
        <div class="opp-source">
          <span class="opp-cocoon">{{ opp.sourceCocoon }}</span>
          <span class="opp-article">{{ opp.sourceTitle }}</span>
        </div>
        <span class="opp-arrow">&rarr;</span>
        <div class="opp-target">
          <span class="opp-cocoon">{{ opp.targetCocoon }}</span>
          <span class="opp-article">{{ opp.targetTitle }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cross-cocoon {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.opp-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.375rem;
  border-radius: 11px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.panel-empty {
  padding: 0.75rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.opp-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.opp-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.opp-source,
.opp-target {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.opp-cocoon {
  font-size: 0.5625rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.opp-article {
  font-size: 0.75rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opp-arrow {
  color: var(--color-text-muted);
  font-size: 1rem;
  flex-shrink: 0;
}
</style>
