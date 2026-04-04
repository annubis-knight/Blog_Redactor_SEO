<script setup lang="ts">
import type { RadarCard } from '@shared/types/intent.types.js'
import RadarKeywordCard from './RadarKeywordCard.vue'

defineProps<{
  card: RadarCard
  checked: boolean
  disabled?: boolean
}>()

defineEmits<{
  'update:checked': [value: boolean]
}>()
</script>

<template>
  <div class="radar-card-checkable" :class="{ checked, disabled }">
    <label class="radar-card-checkable__control" @click.stop>
      <input
        type="checkbox"
        :checked="checked"
        :disabled="disabled"
        data-testid="radar-card-checkbox"
        @change="$emit('update:checked', !checked)"
      />
    </label>
    <div class="radar-card-checkable__content">
      <RadarKeywordCard :card="card" />
    </div>
  </div>
</template>

<style scoped>
.radar-card-checkable {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.375rem;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.radar-card-checkable.checked {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, #eff6ff);
}

.radar-card-checkable.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.radar-card-checkable__control {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin-top: 0.25rem;
  cursor: pointer;
}

.radar-card-checkable.disabled .radar-card-checkable__control {
  cursor: not-allowed;
}

.radar-card-checkable__control input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: inherit;
  accent-color: var(--color-primary);
}

.radar-card-checkable__content {
  flex: 1;
  min-width: 0;
}
</style>
