<script setup lang="ts" generic="T extends { id: string }">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  items: T[]
  /** Items pré-cochés (par défaut, tous). */
  initialSelected?: string[]
  /** Label du bouton de handoff (ex: "Envoyer dans Radar"). */
  handoffLabel: string
  /** Désactive le handoff si rien n'est sélectionné. */
  disableEmpty?: boolean
}>()

const emit = defineEmits<{
  (e: 'handoff', selected: T[]): void
  (e: 'selection-changed', selected: T[]): void
}>()

const selectedIds = ref<Set<string>>(new Set(props.initialSelected ?? props.items.map(i => i.id)))

watch(() => props.items.map(i => i.id).join('|'), () => {
  // Quand la liste change, on garde uniquement les ids encore présents.
  const valid = new Set(props.items.map(i => i.id))
  selectedIds.value = new Set([...selectedIds.value].filter(id => valid.has(id)))
})

const selectedItems = computed(() => props.items.filter(i => selectedIds.value.has(i.id)))

watch(selectedItems, (val) => {
  emit('selection-changed', val)
})

function toggle(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function handoff() {
  emit('handoff', selectedItems.value)
}
</script>

<template>
  <div class="aip-list" data-testid="ai-suggestion-list">
    <ul class="aip-list__items">
      <li v-for="item in items" :key="item.id" class="aip-list__item" :class="{ 'aip-list__item--selected': selectedIds.has(item.id) }">
        <label class="aip-list__label">
          <input
            type="checkbox"
            :checked="selectedIds.has(item.id)"
            :data-testid="`ai-suggestion-checkbox-${item.id}`"
            @change="toggle(item.id)"
          />
          <span class="aip-list__content">
            <slot :item="item" />
          </span>
        </label>
      </li>
    </ul>
    <div class="aip-list__footer">
      <span class="aip-list__count">
        {{ selectedItems.length }} / {{ items.length }} sélectionné<template v-if="selectedItems.length > 1">s</template>
      </span>
      <button
        type="button"
        class="aip-list__handoff"
        :disabled="disableEmpty && selectedItems.length === 0"
        data-testid="ai-suggestion-handoff"
        @click="handoff"
      >
        {{ handoffLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.aip-list { display: flex; flex-direction: column; gap: 0.75rem; }
.aip-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 320px;
  overflow-y: auto;
}
.aip-list__item {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  transition: border-color 0.15s ease;
}
.aip-list__item--selected {
  border-color: var(--color-badge-purple-text);
  background: var(--color-badge-purple-bg);
}
.aip-list__label {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
}
.aip-list__content { flex: 1; min-width: 0; }
.aip-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}
.aip-list__count { font-size: 0.875rem; color: var(--color-text-muted); }
.aip-list__handoff {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--color-badge-purple-text);
  color: #fff;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}
.aip-list__handoff:disabled { opacity: 0.5; cursor: not-allowed; }
.aip-list__handoff:hover:not(:disabled) { background: #6d28d9; }
</style>
