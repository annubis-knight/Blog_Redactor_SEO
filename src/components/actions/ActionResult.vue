<script setup lang="ts">
defineProps<{
  result: string
  isStreaming: boolean
}>()

const emit = defineEmits<{
  accept: []
  reject: []
}>()
</script>

<template>
  <div class="action-result">
    <div class="result-content">
      <div class="result-text">{{ result }}</div>
      <span v-if="isStreaming" class="streaming-indicator">●</span>
    </div>

    <div class="result-actions">
      <button
        class="btn-reject"
        @click="emit('reject')"
      >
        Rejeter
      </button>
      <button
        class="btn-accept"
        :disabled="isStreaming"
        @click="emit('accept')"
      >
        Accepter
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-result {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.75rem;
  max-width: 400px;
}

.result-content {
  position: relative;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-soft, #f8fafc);
  border-radius: 4px;
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.streaming-indicator {
  display: inline-block;
  color: var(--color-primary);
  animation: pulse 1s infinite;
  margin-left: 0.25rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-reject,
.btn-accept {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--color-border);
}

.btn-reject {
  background: transparent;
  color: var(--color-text-muted);
}

.btn-reject:hover {
  background: var(--color-bg-hover, #f1f5f9);
}

.btn-accept {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.btn-accept:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-accept:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
