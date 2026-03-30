<script setup lang="ts">
defineProps<{
  message: string
  actionLabel: string
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
  (e: 'dismiss'): void
}>()
</script>

<template>
  <div class="phase-transition-banner" role="status">
    <p class="phase-transition-message">{{ message }}</p>
    <div class="phase-transition-actions">
      <button class="phase-transition-btn" @click="emit('navigate')">
        {{ actionLabel }} &rarr;
      </button>
      <button
        class="phase-transition-dismiss"
        aria-label="Fermer"
        @click="emit('dismiss')"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<style scoped>
.phase-transition-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-info-bg);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
}

.phase-transition-message {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.phase-transition-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.phase-transition-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.phase-transition-btn:hover {
  background: var(--color-primary-hover);
}

.phase-transition-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.phase-transition-dismiss:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
</style>
