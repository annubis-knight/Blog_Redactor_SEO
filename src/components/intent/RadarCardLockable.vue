<script setup lang="ts">
import type { RadarCard } from '@shared/types/intent.types.js'
import RadarKeywordCard from './RadarKeywordCard.vue'
import type { InteractiveWordsProps } from './RadarKeywordCard.vue'

defineProps<{
  card: RadarCard
  locked: boolean
  interactiveWords?: InteractiveWordsProps
}>()

defineEmits<{
  'update:locked': [value: boolean]
  'word-toggle': [activeCount: number]
}>()
</script>

<template>
  <div class="radar-card-lockable" :class="{ locked }">
    <button
      class="radar-card-lockable__toggle"
      :class="{ active: locked }"
      :title="locked ? 'Déverrouiller' : 'Verrouiller'"
      :aria-pressed="locked"
      data-testid="radar-card-lock"
      @click.stop="$emit('update:locked', !locked)"
    >
      <svg v-if="locked" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm3 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M7 10V7a5 5 0 0110 0M5 10h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="16" r="1.5"/>
      </svg>
    </button>
    <div class="radar-card-lockable__content">
      <RadarKeywordCard :card="card" :interactive-words="interactiveWords" @word-toggle="$emit('word-toggle', $event)" />
    </div>
  </div>
</template>

<style scoped>
.radar-card-lockable {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.375rem;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.radar-card-lockable.locked {
  border-color: var(--color-success, #22c55e);
  background: var(--color-success-bg, #f0fdf4);
}

.radar-card-lockable__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin-top: 0.25rem;
  border: 1.5px solid var(--color-border, #e2e8f0);
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.radar-card-lockable__toggle:hover {
  border-color: var(--color-success, #22c55e);
  color: var(--color-success, #22c55e);
}

.radar-card-lockable__toggle.active {
  border-color: var(--color-success, #22c55e);
  background: var(--color-success-bg, #f0fdf4);
  color: var(--color-success, #22c55e);
}

.radar-card-lockable__content {
  flex: 1;
  min-width: 0;
}
</style>
