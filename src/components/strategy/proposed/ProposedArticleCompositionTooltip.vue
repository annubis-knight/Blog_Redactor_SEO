<script setup lang="ts">
import type { CompositionCheckResult } from '@shared/types/index.js'

defineProps<{
  visible: boolean
  compositionResult?: CompositionCheckResult | null
  structuralWarnings?: Array<{ type: string; message: string }>
}>()

defineEmits<{
  (e: 'mouseenter'): void
  (e: 'mouseleave'): void
}>()
</script>

<template>
  <div
    v-if="visible && (compositionResult || (structuralWarnings?.length ?? 0) > 0)"
    class="composition-tooltip"
    data-testid="composition-tooltip"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
  >
    <div v-if="structuralWarnings?.length" class="tooltip-section">
      <span class="tooltip-section-title">Structure</span>
      <div
        v-for="(w, wi) in structuralWarnings"
        :key="'sw-' + wi"
        class="composition-rule composition-rule--warn"
      >
        <span class="composition-rule-icon">&#9888;</span>
        <span class="composition-rule-msg">{{ w.message }}</span>
      </div>
    </div>
    <div v-if="compositionResult" class="tooltip-section">
      <span v-if="structuralWarnings?.length" class="tooltip-section-title">Composition</span>
      <div
        v-for="rule in compositionResult.results"
        :key="rule.rule"
        class="composition-rule"
        :class="rule.pass ? 'composition-rule--pass' : 'composition-rule--warn'"
      >
        <span class="composition-rule-icon">{{ rule.pass ? '&#10003;' : '&#9888;' }}</span>
        <span class="composition-rule-msg">{{ rule.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.composition-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  min-width: 240px;
  max-width: 340px;
  padding: 0.5rem 0.625rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tooltip-section {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
}

.tooltip-section-title {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding-bottom: 0.125rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.0625rem;
}

.composition-rule {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.4;
}

.composition-rule--pass {
  color: var(--color-badge-green-text);
}

.composition-rule--warn {
  color: var(--color-badge-amber-text);
}

.composition-rule-icon {
  flex-shrink: 0;
  font-size: 0.625rem;
}

.composition-rule-msg {
  font-weight: 400;
}
</style>
