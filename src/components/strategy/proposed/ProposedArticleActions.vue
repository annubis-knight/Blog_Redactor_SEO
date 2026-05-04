<script setup lang="ts">
import { IconCheck, IconClose, IconKebab, IconRefresh, IconLink } from '@/components/shared/icons'

withDefaults(defineProps<{
  position: 'header' | 'bottom'
  accepted: boolean
  actionsMenuOpen: boolean
  hasParents?: boolean
}>(), {
  hasParents: false,
})

defineEmits<{
  (e: 'toggle-accept'): void
  (e: 'remove'): void
  (e: 'toggle-actions-menu'): void
  (e: 'toggle-parent-menu'): void
  (e: 'regenerate-title'): void
  (e: 'regenerate-keyword'): void
  (e: 'regenerate-slug'): void
}>()
</script>

<template>
  <!-- Header (collapsed only) -->
  <div v-if="position === 'header'" class="proposal-actions">
    <button
      class="proposal-action-btn proposal-action-accept"
      :class="{ 'proposal-action-accept--active': accepted }"
      :title="accepted ? 'Article validé' : 'Valider cet article'"
      @click.stop="$emit('toggle-accept')"
    >
      <IconCheck :size="14" />
    </button>
    <button
      class="proposal-action-btn proposal-action-kebab"
      title="Plus d'actions"
      data-testid="kebab-btn"
      @click.stop="$emit('toggle-actions-menu')"
    >
      <IconKebab />
    </button>
    <button
      class="proposal-action-btn proposal-action-delete"
      title="Supprimer cet article"
      @click.stop="$emit('remove')"
    >
      <IconClose :size="14" />
    </button>
  </div>

  <!-- Kebab dropdown (collapsed only) -->
  <div v-if="position === 'header' && actionsMenuOpen" class="actions-menu" data-testid="actions-menu">
    <div class="actions-menu-backdrop" @click.stop="$emit('toggle-actions-menu')"></div>
    <div class="actions-menu-items">
      <button class="actions-menu-item" @click.stop="$emit('regenerate-title'); $emit('toggle-actions-menu')">
        <IconRefresh :size="14">
          <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="0.8" fill="none" />
          <path d="M7 7.5h2M7 9h1" stroke="currentColor" stroke-width="0.7" stroke-linecap="round" />
        </IconRefresh>
        Régénérer le titre
      </button>
      <button class="actions-menu-item" @click.stop="$emit('regenerate-keyword'); $emit('toggle-actions-menu')">
        <IconRefresh :size="14">
          <path d="M8.5 6.5a1.5 1.5 0 0 1 .35 2.96L7.5 10.8v1.2H6.5v-.8h-.5v-.8l1.65-1.65A1.5 1.5 0 0 1 8.5 6.5z" stroke="currentColor" stroke-width="0.8" fill="none" />
        </IconRefresh>
        Régénérer le mot-clé
      </button>
      <button class="actions-menu-item" @click.stop="$emit('regenerate-slug'); $emit('toggle-actions-menu')">
        <IconRefresh :size="14">
          <path d="M5.5 8h5M5.5 8l1-1.5M5.5 8l1 1.5M10.5 8l-1-1.5M10.5 8l-1 1.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" />
        </IconRefresh>
        Régénérer le slug
      </button>
      <button
        v-if="hasParents"
        class="actions-menu-item"
        data-testid="link-parent-btn"
        @click.stop="$emit('toggle-parent-menu'); $emit('toggle-actions-menu')"
      >
        <IconLink :size="14" />
        Rattacher à un intermédiaire
      </button>
    </div>
  </div>

  <!-- Bottom (expanded only) -->
  <div v-if="position === 'bottom'" class="proposal-actions proposal-actions--bottom">
    <button
      class="proposal-action-btn proposal-action-accept"
      :class="{ 'proposal-action-accept--active': accepted }"
      :title="accepted ? 'Article validé' : 'Valider cet article'"
      @click.stop="$emit('toggle-accept')"
    >
      <IconCheck />
      <span class="action-label">Valider</span>
    </button>
    <div class="regen-dropdown-wrapper">
      <button
        class="proposal-action-btn"
        title="Régénérer"
        data-testid="regen-dropdown-btn"
        @click.stop="$emit('toggle-actions-menu')"
      >
        <IconRefresh />
        <span class="action-label">Régénérer &#9662;</span>
      </button>
      <div v-if="actionsMenuOpen" class="actions-menu actions-menu--inline" data-testid="regen-menu">
        <div class="actions-menu-backdrop" @click.stop="$emit('toggle-actions-menu')"></div>
        <div class="actions-menu-items">
          <button class="actions-menu-item" @click.stop="$emit('regenerate-title'); $emit('toggle-actions-menu')">Titre</button>
          <button class="actions-menu-item" @click.stop="$emit('regenerate-keyword'); $emit('toggle-actions-menu')">Mot-clé</button>
          <button class="actions-menu-item" @click.stop="$emit('regenerate-slug'); $emit('toggle-actions-menu')">Slug</button>
        </div>
      </div>
    </div>
    <button
      v-if="hasParents"
      class="proposal-action-btn"
      title="Rattacher à un intermédiaire"
      data-testid="link-parent-btn-expanded"
      @click.stop="$emit('toggle-parent-menu')"
    >
      <IconLink />
      <span class="action-label">Lien</span>
    </button>
    <button
      class="proposal-action-btn proposal-action-delete"
      title="Supprimer cet article"
      @click.stop="$emit('remove')"
    >
      <IconClose />
      <span class="action-label">Supprimer</span>
    </button>
  </div>
</template>

<style scoped>
.proposal-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.proposal-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  opacity: 0;
}

/* Show on parent item hover (passes via deep selector below) */
:deep(.proposal-item:hover) .proposal-action-btn {
  opacity: 1;
}

.proposal-action-btn:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.proposal-action-accept--active {
  color: var(--color-badge-green-text);
  background: var(--color-badge-green-bg);
}

.proposal-action-accept:hover:not(.proposal-action-accept--active) {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.proposal-action-delete:hover {
  background: var(--color-danger-soft, #fde8e8);
  color: var(--color-danger, #e53e3e);
}

.proposal-action-kebab {
  opacity: 0;
}

:deep(.proposal-item:hover) .proposal-action-kebab {
  opacity: 1;
}

.proposal-actions--bottom {
  gap: 0.625rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.375rem;
}

.proposal-actions--bottom .proposal-action-btn {
  opacity: 1;
  width: auto;
  height: auto;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.6875rem;
}

.action-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.actions-menu {
  position: relative;
}

.actions-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.actions-menu-items {
  position: absolute;
  right: 0;
  z-index: 10;
  min-width: 180px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 0.25rem 0;
}

.actions-menu-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  line-height: 1.4;
}

.actions-menu-item svg {
  flex-shrink: 0;
}

.actions-menu-item:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.regen-dropdown-wrapper {
  position: relative;
}

.actions-menu--inline {
  position: absolute;
  top: 100%;
  left: 0;
}
</style>
