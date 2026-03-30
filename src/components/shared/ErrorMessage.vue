<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="error-message" role="alert">
    <p class="error-text">{{ message }}</p>
    <button class="retry-button" @click="emit('retry')">Réessayer</button>
  </div>
</template>

<style scoped>
.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  border: 1px solid var(--color-error);
  border-radius: 8px;
  background: var(--color-error-bg);
}

.error-text {
  color: var(--color-error);
  margin: 0;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.retry-button:hover {
  opacity: 0.9;
}
</style>
