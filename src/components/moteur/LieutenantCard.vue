<script setup lang="ts">
import type { ProposedLieutenant } from '@shared/types/serp-analysis.types.js'

defineProps<{
  lieutenant: ProposedLieutenant
  checked: boolean
  disabled?: boolean
}>()

defineEmits<{
  'update:checked': [value: boolean]
}>()

const VALID_SOURCES = new Set(['serp', 'paa', 'group', 'root', 'content-gap'])

function sourceBadge(s: string) {
  return VALID_SOURCES.has(s) ? `lt-source--${s}` : 'lt-source--unknown'
}
</script>

<template>
  <div class="lt-card" :class="{ 'lt-card--checked': checked, 'lt-card--disabled': disabled }">
    <label class="lt-card__checkbox" @click.stop>
      <input
        type="checkbox"
        :checked="checked"
        :disabled="disabled"
        data-testid="lt-card-checkbox"
        @change="$emit('update:checked', !checked)"
      />
    </label>

    <div class="lt-card__body">
      <div class="lt-card__header">
        <span class="lt-card__keyword">{{ lieutenant.keyword }}</span>
        <span class="lt-card__score" :title="`Score IA: ${lieutenant.score}/100`">{{ lieutenant.score }}</span>
        <span class="lt-card__hn-tag">H{{ lieutenant.suggestedHnLevel }}</span>
      </div>

      <div class="lt-card__reasoning">{{ lieutenant.reasoning }}</div>

      <div class="lt-card__meta">
        <span
          v-for="s in lieutenant.sources"
          :key="s"
          class="lt-source"
          :class="sourceBadge(s)"
        >{{ s }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lt-card {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.lt-card--checked {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, #eff6ff);
}

.lt-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lt-card__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 0.125rem;
  cursor: pointer;
}

.lt-card--disabled .lt-card__checkbox {
  cursor: not-allowed;
}

.lt-card__checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: inherit;
  accent-color: var(--color-primary);
}

.lt-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lt-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lt-card__keyword {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-heading);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lt-card__score {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: white;
  background: var(--color-primary);
  border-radius: 4px;
}

.lt-card__hn-tag {
  flex-shrink: 0;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 700;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  border-radius: 4px;
}

.lt-card__reasoning {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lt-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.125rem;
}

.lt-source {
  display: inline-block;
  padding: 0.0625rem 0.3125rem;
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 3px;
}

.lt-source--serp { background: var(--color-badge-blue-bg, #dbeafe); color: var(--color-primary); }
.lt-source--paa { background: var(--color-badge-amber-bg, #fef3c7); color: #b45309; }
.lt-source--group { background: var(--color-badge-green-bg, #dcfce7); color: #15803d; }
.lt-source--root { background: var(--color-badge-purple-bg, #f3e8ff); color: #7c3aed; }
.lt-source--content-gap { background: var(--color-badge-red-bg, #fef2f2); color: #dc2626; }

</style>
