<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification.store'
import type { NotificationType } from '@/stores/notification.store'

const store = useNotificationStore()

const icons: Record<NotificationType, string> = {
  success: '\u2713',
  error: '\u2717',
  warning: '!',
  info: 'i',
}

const colorVars: Record<NotificationType, string> = {
  success: 'var(--color-success, #22c55e)',
  error: 'var(--color-danger, #ef4444)',
  warning: 'var(--color-warning, #f59e0b)',
  info: 'var(--color-primary, #3b82f6)',
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" data-testid="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="notif in store.notifications"
          :key="notif.id"
          class="toast"
          :style="{ '--toast-color': colorVars[notif.type] }"
          :data-testid="`toast-${notif.type}`"
        >
          <span class="toast__icon">{{ icons[notif.type] }}</span>
          <span class="toast__message">{{ notif.message }}</span>
          <button class="toast__close" aria-label="Fermer" @click="store.remove(notif.id)">&times;</button>
          <div class="toast__progress" :style="{ animationDuration: notif.duration + 'ms' }" />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  max-width: 380px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface, white);
  border: 1px solid var(--toast-color);
  border-left: 4px solid var(--toast-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--toast-color);
  color: white;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.toast__message {
  flex: 1;
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.4;
}

.toast__close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.125rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.toast__close:hover {
  color: var(--color-text);
}

.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--toast-color);
  animation: toast-progress linear forwards;
  width: 100%;
}

@keyframes toast-progress {
  from { width: 100%; }
  to { width: 0%; }
}

/* Transitions */
.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
