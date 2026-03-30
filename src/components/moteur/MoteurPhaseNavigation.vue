<script setup lang="ts">
import { computed } from 'vue'

export interface PhaseTab {
  id: string
  label: string
  optional?: boolean
  locked?: boolean
}

export interface Phase {
  id: string
  label: string
  number: number
  tabs: PhaseTab[]
}

const props = defineProps<{
  phases: Phase[]
  activeTab: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:activeTab': [tabId: string]
}>()

const activePhaseId = computed(() => {
  for (const phase of props.phases) {
    if (phase.tabs.some(t => t.id === props.activeTab)) {
      return phase.id
    }
  }
  return props.phases[0]?.id ?? ''
})

function handleTabClick(tabId: string, locked?: boolean) {
  if (props.disabled || locked) return
  emit('update:activeTab', tabId)
}

function handlePhaseClick(phase: Phase) {
  if (props.disabled) return
  const firstAvailable = phase.tabs.find(t => !t.locked)
  if (firstAvailable) {
    emit('update:activeTab', firstAvailable.id)
  }
}
</script>

<template>
  <nav class="phase-nav" :class="{ 'phase-nav--disabled': disabled }" role="tablist" aria-label="Phases du moteur">
    <div
      v-for="phase in phases"
      :key="phase.id"
      class="phase-group"
      :class="{ 'phase-group--active': activePhaseId === phase.id }"
    >
      <button
        class="phase-header"
        :class="{ 'phase-header--active': activePhaseId === phase.id }"
        :disabled="disabled"
        @click="handlePhaseClick(phase)"
      >
        <span class="phase-number">{{ phase.number }}</span>
        <span class="phase-label">{{ phase.label }}</span>
      </button>

      <div class="phase-tabs">
        <button
          v-for="tab in phase.tabs"
          :key="tab.id"
          class="phase-tab"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="{
            'phase-tab--active': activeTab === tab.id,
            'phase-tab--optional': tab.optional,
            'phase-tab--locked': tab.locked,
          }"
          :disabled="disabled || tab.locked"
          :title="tab.locked ? 'Mots-clés validés — verrouillé' : undefined"
          @click="handleTabClick(tab.id, tab.locked)"
        >
          {{ tab.label }}
          <span v-if="tab.locked" class="phase-tab-lock">&#x1f512;</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.phase-nav {
  display: flex;
  gap: 2px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.phase-nav--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.phase-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-soft);
  transition: background 0.15s;
}

.phase-group--active {
  background: var(--color-background);
}

.phase-group + .phase-group {
  border-left: 1px solid var(--color-border);
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  transition: color 0.15s;
}

.phase-header--active {
  color: var(--color-primary);
}

.phase-header:hover:not(:disabled) {
  color: var(--color-primary);
}

.phase-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 800;
  background: var(--color-border);
  color: var(--color-text-muted);
}

.phase-header--active .phase-number {
  background: var(--color-primary);
  color: white;
}

.phase-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 0 0.5rem 0.5rem;
}

.phase-tab {
  padding: 0.375rem 0.625rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}

.phase-tab:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.phase-tab--active {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.phase-tab--active:hover {
  background: var(--color-primary-hover);
  color: white;
}

.phase-tab--optional {
  font-style: italic;
}

.phase-tab--locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.phase-tab-lock {
  font-size: 0.5625rem;
  margin-left: 2px;
}
</style>
