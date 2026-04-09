<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { log } from '@/utils/logger'

const props = withDefaults(defineProps<{
  fallbackMessage?: string
}>(), {
  fallbackMessage: 'Une erreur est survenue dans ce panneau.',
})

const hasError = ref(false)
const errorInfo = ref<string | null>(null)
const retryCount = ref(0)
const retryKey = ref(0)

const MAX_RETRIES = 3

const isDev = import.meta.env.DEV

onErrorCaptured((err, instance, info) => {
  // Reset retry counter on fresh error (different from a retry re-throw)
  if (!hasError.value) {
    retryCount.value = 0
  }
  hasError.value = true
  errorInfo.value = isDev ? (err instanceof Error ? err.message : String(err)) : null
  log.error('[ErrorBoundary]', { error: err, info })
  return false
})

function retry() {
  if (retryCount.value >= MAX_RETRIES) return
  retryCount.value++
  hasError.value = false
  errorInfo.value = null
  retryKey.value++
}
</script>

<template>
  <div v-if="!hasError" :key="retryKey">
    <slot />
  </div>
  <div v-else class="error-boundary" data-testid="error-boundary-fallback">
    <slot name="error" :error="errorInfo" :retry="retry">
      <div class="error-boundary__content">
        <span class="error-boundary__icon">!</span>
        <p class="error-boundary__message">{{ fallbackMessage }}</p>
        <p v-if="errorInfo" class="error-boundary__detail">{{ errorInfo }}</p>
        <button
          v-if="retryCount < MAX_RETRIES"
          class="error-boundary__retry"
          data-testid="error-boundary-retry"
          @click="retry"
        >
          Réessayer
        </button>
        <p v-else class="error-boundary__exhausted">
          Erreur persistante — rechargez la page.
        </p>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.error-boundary {
  border: 1px solid var(--color-danger, #ef4444);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-danger, #ef4444) 6%, transparent);
  padding: 1.25rem;
  margin: 0.5rem 0;
}

.error-boundary__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.error-boundary__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-danger, #ef4444);
  color: white;
  font-weight: 700;
  font-size: 1.125rem;
}

.error-boundary__message {
  font-size: 0.875rem;
  color: var(--color-text);
  margin: 0;
}

.error-boundary__detail {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.error-boundary__retry {
  margin-top: 0.5rem;
  padding: 0.375rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface, white);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8125rem;
}

.error-boundary__retry:hover {
  background: var(--color-bg-soft, #f5f5f5);
}

.error-boundary__exhausted {
  font-size: 0.75rem;
  color: var(--color-danger, #ef4444);
  font-weight: 600;
  margin: 0;
}
</style>
