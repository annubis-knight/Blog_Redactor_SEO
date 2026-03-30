<script setup lang="ts">
import type { ApiUsage } from '@shared/types/index.js'

const props = defineProps<{
  usage?: ApiUsage | null
  fromCache?: boolean | null
  label?: string
}>()

function formatCost(cost: number): string {
  if (cost < 0.01) return '< $0.01'
  return `$${cost.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
</script>

<template>
  <div v-if="usage || fromCache !== null && fromCache !== undefined" class="api-cost-badge">
    <span v-if="label" class="badge-label">{{ label }}</span>

    <span v-if="usage" class="badge-tokens" :title="`${usage.model} — ${usage.inputTokens} in / ${usage.outputTokens} out`">
      {{ formatTokens(usage.inputTokens) }} &rarr; {{ formatTokens(usage.outputTokens) }} tokens
      &middot;
      <span class="badge-cost">{{ formatCost(usage.estimatedCost) }}</span>
    </span>

    <span v-if="fromCache === true" class="badge-cache badge-cache--hit">cache</span>
    <span v-else-if="fromCache === false" class="badge-cache badge-cache--miss">API live</span>
  </div>
</template>

<style scoped>
.api-cost-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-family: monospace;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.badge-label {
  font-weight: 600;
  color: var(--color-badge-slate-text);
}

.badge-cost {
  font-weight: 600;
  color: var(--color-success);
}

.badge-cache {
  padding: 0.0625rem 0.375rem;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge-cache--hit {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.badge-cache--miss {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}
</style>
