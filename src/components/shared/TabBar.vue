<script setup lang="ts">
/**
 * Composant partagé pour systèmes d'onglets — pur UI, sans logique métier.
 *
 * Premier consommateur : `LexiquePanel.vue` —
 * FR-LEX-MULTI-KEYWORD-TABS) qui affiche un onglet par `source_keyword`
 * exploré + un onglet « + Tester un mot-clé ».
 *
 * Conçu pour être réutilisable plus tard par SeoPanel/GeoPanel/CaptainPanel
 * (alignement visuel cross-Moteur.).
 *
 * Pattern ARIA : `role="tablist"` sur le container, `role="tab"` +
 * `aria-selected` sur chaque bouton. Le parent gère le contenu du panneau
 * via `aria-controls` côté template consommateur.
 */
interface TabItem {
  id: string
  label: string
  disabled?: boolean
}

defineProps<{
  tabs: TabItem[]
  activeId: string
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:activeId', id: string): void
}>()

function onTabClick(tab: TabItem): void {
  if (tab.disabled) return
  emit('update:activeId', tab.id)
}
</script>

<template>
  <div
    class="tab-bar"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :class="['tab', { 'tab--active': tab.id === activeId, 'tab--disabled': tab.disabled }]"
      :aria-selected="tab.id === activeId ? 'true' : 'false'"
      :disabled="tab.disabled"
      :data-testid="`tab-${tab.id}`"
      @click="onTabClick(tab)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  padding: 0;
  margin: 0;
}

.tab {
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}

.tab:hover:not(.tab--disabled):not(.tab--active) {
  background: var(--color-bg-muted, #f1f5f9);
  color: var(--color-text, #0f172a);
}

.tab--active {
  background: var(--color-bg, #fff);
  border-color: var(--color-border, #e2e8f0);
  color: var(--color-primary, #2563eb);
  font-weight: 600;
}

.tab--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
