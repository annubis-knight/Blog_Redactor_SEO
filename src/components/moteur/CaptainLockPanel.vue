<script setup lang="ts">
const props = withDefaults(defineProps<{
  isLocked: boolean
  canLock: boolean
  showSendToLieutenants?: boolean
  testIdPrefix?: string
}>(), {
  showSendToLieutenants: false,
  testIdPrefix: '',
})

defineEmits<{
  'lock': []
  'unlock': []
  'send-to-lieutenants': []
}>()
</script>

<template>
  <div class="captain-lock" :data-testid="`${testIdPrefix}lock`">
    <button
      v-if="!isLocked"
      class="lock-btn"
      :data-testid="`${testIdPrefix}lock-btn`"
      :disabled="!canLock"
      @click="$emit('lock')"
    >
      Valider ce Capitaine
    </button>
    <div v-else class="locked-state" :data-testid="`${testIdPrefix}locked-state`">
      <span class="locked-badge">Capitaine verrouillé</span>
      <button
        v-if="showSendToLieutenants"
        class="send-lieutenant-btn"
        :data-testid="`${testIdPrefix}send-to-lieutenants-btn`"
        @click="$emit('send-to-lieutenants')"
      >
        Envoyer aux Lieutenants &rarr;
      </button>
      <button class="unlock-btn" :data-testid="`${testIdPrefix}unlock-btn`" @click="$emit('unlock')">
        Déverrouiller
      </button>
    </div>
  </div>
</template>

<style scoped>
.captain-lock {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lock-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-success, #22c55e);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.lock-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locked-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success, #22c55e);
}

.send-lieutenant-btn {
  padding: 0.375rem 0.75rem;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.send-lieutenant-btn:hover {
  background: var(--color-primary-hover);
}

.unlock-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
}

.unlock-btn:hover {
  border-color: var(--color-warning, #f59e0b);
  color: var(--color-warning, #f59e0b);
}
</style>
