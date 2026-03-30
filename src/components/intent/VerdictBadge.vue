<script setup lang="ts">
import type { PainVerdictCategory } from '@shared/types/intent.types.js'

const props = defineProps<{
  category: PainVerdictCategory
  provisional?: boolean
}>()

const config: Record<PainVerdictCategory, { icon: string; label: string }> = {
  brulante: { icon: '🔥', label: 'Brûlante' },
  confirmee: { icon: '✅', label: 'Confirmée' },
  emergente: { icon: '🌱', label: 'Émergente' },
  latente: { icon: '💡', label: 'Latente' },
  froide: { icon: '❄️', label: 'Froide' },
  incertaine: { icon: '❓', label: 'Incertaine' },
}
</script>

<template>
  <span
    class="verdict-badge"
    :class="[`verdict-badge--${category}`, { 'verdict-badge--provisional': provisional }]"
  >
    <span class="verdict-badge-icon">{{ config[category].icon }}</span>
    {{ config[category].label }}
  </span>
</template>

<style scoped>
.verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1.5px solid;
  transition: all 0.3s ease;
}

.verdict-badge--provisional {
  border-style: dashed;
  opacity: 0.7;
}

.verdict-badge-icon {
  font-size: 0.75rem;
}

/* Brûlante */
.verdict-badge--brulante {
  background: var(--color-error-bg, #fef2f2);
  color: var(--color-error, #dc2626);
  border-color: var(--color-error, #dc2626);
}

/* Confirmée */
.verdict-badge--confirmee {
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-badge-green-text, #166534);
  border-color: var(--color-success, #16a34a);
}

/* Émergente */
.verdict-badge--emergente {
  background: var(--color-badge-amber-bg, #fef3c7);
  color: var(--color-badge-amber-text, #92400e);
  border-color: var(--color-warning, #d97706);
}

/* Latente */
.verdict-badge--latente {
  background: var(--color-badge-purple-bg, #f5f3ff);
  color: var(--color-badge-purple-text, #6d28d9);
  border-color: #7c3aed;
}

/* Froide */
.verdict-badge--froide {
  background: var(--color-badge-blue-bg, #eff6ff);
  color: var(--color-badge-blue-text, #1e40af);
  border-color: #2563eb;
}

/* Incertaine */
.verdict-badge--incertaine {
  background: var(--color-badge-slate-bg, #f1f5f9);
  color: var(--color-badge-slate-text, #475569);
  border-color: #64748b;
}

@keyframes verdictReveal {
  from { transform: scale(0.8); opacity: 0.7; }
  to { transform: scale(1); opacity: 1; }
}

.verdict-badge:not(.verdict-badge--provisional) {
  animation: verdictReveal 0.3s ease;
}
</style>
