<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  icon: string
  tooltip: string
  score?: number | null
  alertCount?: number
  isOpen?: boolean
}>(), {
  score: null,
  alertCount: 0,
  isOpen: false,
})

const emit = defineEmits<{ toggle: [] }>()

function scoreClass(score: number): string {
  if (score >= 70) return 'score-good'
  if (score >= 40) return 'score-fair'
  return 'score-poor'
}
</script>

<template>
  <div class="indicator-card" :class="{ collapsed: !isOpen }">
    <button
      class="card-header"
      :title="tooltip"
      :aria-expanded="isOpen"
      @click="emit('toggle')"
    >
      <span class="card-icon" aria-hidden="true">{{ icon }}</span>
      <span class="card-title">{{ title }}</span>
      <span
        v-if="score != null"
        class="card-score"
        :class="scoreClass(score)"
        :title="`Score : ${score}/100`"
      >
        {{ score }}
      </span>
      <span
        v-if="alertCount > 0"
        class="card-alert-badge"
        :title="`${alertCount} alerte${alertCount > 1 ? 's' : ''}`"
      >
        {{ alertCount }}
      </span>
      <span class="card-chevron" aria-hidden="true">{{ isOpen ? '▾' : '▸' }}</span>
    </button>
    <div v-if="isOpen" class="card-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.indicator-card {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface, #fff);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text, #1f2937);
  transition: background 0.15s;
}

.card-header:hover {
  background: var(--color-bg-hover, #f9fafb);
}

.card-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
  width: 1.25rem;
  text-align: center;
}

.card-title {
  flex: 1;
  text-align: left;
}

.card-score {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.0625rem 0.375rem;
  border-radius: 10px;
  flex-shrink: 0;
}

.score-good {
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-badge-green-text, #15803d);
}

.score-fair {
  background: var(--color-badge-yellow-bg, #fef9c3);
  color: var(--color-badge-yellow-text, #a16207);
}

.score-poor {
  background: var(--color-badge-red-bg, #fee2e2);
  color: var(--color-badge-red-text, #b91c1c);
}

.card-alert-badge {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.0625rem 0.3125rem;
  border-radius: 10px;
  background: var(--color-badge-red-bg, #fee2e2);
  color: var(--color-badge-red-text, #b91c1c);
  flex-shrink: 0;
}

.card-chevron {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
  flex-shrink: 0;
  width: 0.75rem;
  text-align: center;
}

.card-body {
  padding: 0.5rem 0.625rem 0.625rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  font-size: 0.75rem;
}
</style>
