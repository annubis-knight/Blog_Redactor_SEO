<script setup lang="ts">
import type { ActionType } from '@shared/types/index.js'

defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  'select-action': [actionType: ActionType]
}>()

interface ActionItem {
  type: ActionType
  label: string
  icon: string
}

interface ActionGroup {
  name: string
  actions: ActionItem[]
}

const actionGroups: ActionGroup[] = [
  {
    name: 'Réécriture',
    actions: [
      { type: 'reformulate', label: 'Reformuler', icon: '↻' },
      { type: 'simplify', label: 'Simplifier', icon: '✎' },
      { type: 'convert-list', label: 'Convertir en liste', icon: '☰' },
    ],
  },
  {
    name: 'Enrichissement',
    actions: [
      { type: 'pme-example', label: 'Exemple PME', icon: '🏢' },
      { type: 'keyword-optimize', label: 'Optimiser mot-clé', icon: '🔑' },
      { type: 'add-statistic', label: 'Statistique sourcée', icon: '📊' },
      { type: 'answer-capsule', label: 'Answer Capsule', icon: '💬' },
    ],
  },
  {
    name: 'Structure',
    actions: [
      { type: 'question-heading', label: 'Formuler en question', icon: '❓' },
      { type: 'internal-link', label: 'Lien interne', icon: '🔗' },
    ],
  },
]
</script>

<template>
  <div class="action-menu" role="menu" aria-label="Actions contextuelles">
    <div v-for="group in actionGroups" :key="group.name" class="action-group" role="group" :aria-label="group.name">
      <div class="group-label">{{ group.name }}</div>
      <button
        v-for="action in group.actions"
        :key="action.type"
        class="action-item"
        role="menuitem"
        :disabled="disabled"
        @click="emit('select-action', action.type)"
      >
        <span class="action-icon" aria-hidden="true">{{ action.icon }}</span>
        <span class="action-label">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-menu {
  min-width: 200px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
}

.action-group {
  padding: 0.25rem 0;
}

.action-group + .action-group {
  border-top: 1px solid var(--color-border);
}

.group-label {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text);
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.action-item:hover:not(:disabled) {
  background: var(--color-bg-hover, #f1f5f9);
}

.action-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  flex-shrink: 0;
  width: 1.25rem;
  text-align: center;
  font-size: 0.875rem;
}

.action-label {
  flex: 1;
}
</style>
