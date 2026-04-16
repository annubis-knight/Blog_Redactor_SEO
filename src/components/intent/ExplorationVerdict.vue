<script setup lang="ts">
import { useIntentVerdict } from '@/composables/intent/useIntentVerdict'
import { useIntentStore } from '@/stores/keyword/intent.store'

withDefaults(defineProps<{
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const intentStore = useIntentStore()
const { verdicts, topVerdict } = useIntentVerdict()

const emit = defineEmits<{
  continue: []
  addToAudit: [keyword: string]
}>()
</script>

<template>
  <div v-if="intentStore.intentData && verdicts.length > 0" class="exploration-verdict">
    <h3 class="verdict-title">Verdict</h3>

    <!-- Top priority -->
    <div v-if="topVerdict" class="top-verdict">
      <span class="top-icon">{{ topVerdict.icon }}</span>
      <div class="top-content">
        <span class="top-label">Priorite #1 : {{ topVerdict.label }}</span>
        <p class="top-desc">{{ topVerdict.description }}</p>
      </div>
    </div>

    <!-- Other verdicts -->
    <div v-if="verdicts.length > 1" class="other-verdicts">
      <div
        v-for="(v, idx) in verdicts.slice(1)"
        :key="idx"
        class="verdict-item"
      >
        <span class="verdict-icon">{{ v.icon }}</span>
        <div class="verdict-content">
          <span class="verdict-label">{{ v.label }}</span>
          <p class="verdict-desc">{{ v.description }}</p>
        </div>
      </div>
    </div>

    <div class="verdict-actions">
      <button
        v-if="intentStore.explorationKeyword"
        class="btn btn-secondary"
        @click="emit('addToAudit', intentStore.explorationKeyword)"
      >
        + Ajouter a l'audit
      </button>
      <button class="btn btn-primary" @click="emit('continue')">
        Continuer vers l'etape suivante
      </button>
    </div>
  </div>
</template>

<style scoped>
.exploration-verdict {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
}

.verdict-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.top-verdict {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-primary-soft);
  border-radius: 6px;
}

.top-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.top-content {
  flex: 1;
}

.top-label {
  display: block;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}

.top-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.5;
}

.other-verdicts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.verdict-item {
  display: flex;
  gap: 0.625rem;
  padding: 0.5rem;
  background: var(--color-bg-soft);
  border-radius: 6px;
}

.verdict-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.verdict-content {
  flex: 1;
}

.verdict-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.verdict-desc {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.verdict-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--color-bg-soft);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-secondary:hover {
  background: var(--color-primary-soft);
}
</style>
