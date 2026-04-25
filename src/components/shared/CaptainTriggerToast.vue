<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useCaptainTriggerStore } from '@/stores/ui/captain-trigger.store'

const store = useCaptainTriggerStore()

// Tick every 100ms to drive the circular progress animation.
const now = ref(Date.now())
const tickId = setInterval(() => { now.value = Date.now() }, 100)
onBeforeUnmount(() => clearInterval(tickId))

const TOTAL_MS = 5000
const CIRCUMFERENCE = 2 * Math.PI * 9 // radius 9 in viewBox 24x24

interface ToastItem {
  keyword: string
  remainingMs: number
  ratio: number // 0 → 1
}

const items = computed<ToastItem[]>(() => {
  return Array.from(store.pending.values()).map(p => {
    const remaining = Math.max(0, p.firesAt - now.value)
    return {
      keyword: p.keyword,
      remainingMs: remaining,
      ratio: 1 - remaining / TOTAL_MS,
    }
  })
})

function dashOffset(ratio: number): number {
  return CIRCUMFERENCE * (1 - ratio)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="items.length > 0" class="captain-toast" data-testid="captain-toast">
      <div
        v-for="item in items"
        :key="item.keyword"
        class="captain-toast__item"
      >
        <svg class="captain-toast__spinner" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <!-- Background ring -->
          <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-border, #e2e8f0)" stroke-width="2" />
          <!-- Progress arc — starts at 12 o'clock, sweeps clockwise -->
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="var(--color-primary, #3b82f6)"
            stroke-width="2"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset(item.ratio)"
            transform="rotate(-90 12 12)"
            style="transition: stroke-dashoffset 0.12s linear"
          />
        </svg>
        <div class="captain-toast__text">
          <div class="captain-toast__title">Validation Capitaine dans {{ Math.ceil(item.remainingMs / 1000) }}s</div>
          <div class="captain-toast__keyword">&laquo;{{ item.keyword }}&raquo;</div>
        </div>
        <button
          type="button"
          class="captain-toast__cancel"
          :data-testid="`captain-toast-cancel-${item.keyword}`"
          @click="store.cancel(item.keyword)"
        >
          Annuler
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.captain-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  pointer-events: none;
}

.captain-toast__item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 280px;
  max-width: 420px;
  padding: 0.625rem 0.75rem 0.625rem 0.875rem;
  background: var(--color-text, #1e293b);
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  animation: captain-toast-in 0.2s ease;
}

@keyframes captain-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.captain-toast__spinner { flex-shrink: 0; }

.captain-toast__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.captain-toast__title {
  font-size: 0.8125rem;
  font-weight: 600;
}

.captain-toast__keyword {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.captain-toast__cancel {
  flex-shrink: 0;
  padding: 0.25rem 0.625rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.captain-toast__cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}
</style>
