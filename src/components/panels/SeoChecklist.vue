<script setup lang="ts">
import type { ChecklistItem } from '@shared/types/seo.types.js'

defineProps<{
  items: ChecklistItem[]
}>()
</script>

<template>
  <div class="seo-checklist">
    <div
      v-for="(item, i) in items"
      :key="i"
      class="checklist-item"
      :class="{ present: item.isPresent }"
    >
      <span class="checklist-icon">{{ item.isPresent ? '&#10003;' : '&#10007;' }}</span>
      <span class="checklist-label">{{ item.label }}</span>
    </div>
    <div v-if="items.length === 0" class="checklist-empty">
      Aucun mot-cl&eacute; pilier d&eacute;fini
    </div>
  </div>
</template>

<style scoped>
.seo-checklist {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-score-poor);
}

.checklist-item.present {
  color: var(--color-score-good);
}

.checklist-icon {
  font-size: 0.6875rem;
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.checklist-label {
  flex: 1;
}

.checklist-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}
</style>
