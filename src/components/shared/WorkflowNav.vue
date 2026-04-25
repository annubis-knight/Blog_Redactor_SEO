<script setup lang="ts">
import { computed } from 'vue'

/**
 * Unified workflow navigation component — serves the 3 workflows:
 *  - **Moteur** : groups of tabs (Explorer: discovery/radar, Valider: capitaine/lieutenants/lexique/finalisation)
 *  - **Cerveau** : linear 6-step wizard (cible → douleur → angle → promesse → cta → articles)
 *  - **Rédaction** : linear 2-step wizard (brief-structure → article)
 *
 * Rendering strategy:
 *  - When `groups` is provided, tabs are grouped with a header per group (Moteur style).
 *  - Otherwise `steps` is used as a flat linear stepper with numbers (Cerveau/Rédaction style).
 *
 * Gates: each tab/step carries `locked?` and `done?` flags. Locked = disabled
 * (grayed, not clickable). Done = checkmark. Active = blue pill.
 *
 * Why a single component: previously each workflow had its own nav with
 * slightly different look and code duplication. We keep the rules (gates,
 * step numbers) per workflow but unify the look.
 */

export interface NavItem {
  id: string
  label: string
  /** Step number (1-based) shown as a small badge. Auto-assigned when using `groups`. */
  number?: number
  /** Gate — disables click and grays out. */
  locked?: boolean
  /** Visual state — shows a check icon if truthy. */
  done?: boolean
  /** Optional tooltip shown on hover. */
  hint?: string
}

export interface NavGroup {
  id: string
  label: string
  /** 1-based number for the phase badge (e.g. "1 Explorer", "2 Valider"). */
  number: number
  items: NavItem[]
}

const props = defineProps<{
  activeId: string
  /** Used in "groups" mode (Moteur). */
  groups?: NavGroup[]
  /** Used in "steps" mode (Cerveau, Rédaction). */
  steps?: NavItem[]
  /** Dense = slightly smaller, fits nicely into AppNavbar. */
  dense?: boolean
}>()

const emit = defineEmits<{
  navigate: [id: string]
}>()

const isGroupsMode = computed(() => Array.isArray(props.groups) && props.groups.length > 0)

/** Find which group contains the active id (for header active state in groups mode). */
const activeGroupId = computed(() => {
  if (!props.groups) return ''
  for (const g of props.groups) {
    if (g.items.some(it => it.id === props.activeId)) return g.id
  }
  return props.groups[0]?.id ?? ''
})

function clickItem(item: NavItem) {
  if (item.locked) return
  emit('navigate', item.id)
}

function clickGroup(group: NavGroup) {
  const firstOpen = group.items.find(it => !it.locked)
  if (firstOpen) emit('navigate', firstOpen.id)
}
</script>

<template>
  <nav
    class="wf-nav"
    :class="{ 'wf-nav--dense': dense }"
    :aria-label="'Navigation workflow'"
    role="tablist"
  >
    <!-- GROUPS MODE (Moteur) -->
    <template v-if="isGroupsMode">
      <div
        v-for="group in groups"
        :key="group.id"
        class="wf-group"
        :class="{ 'wf-group--active': activeGroupId === group.id }"
      >
        <button
          class="wf-group__head"
          type="button"
          @click="clickGroup(group)"
        >
          <span class="wf-group__num">{{ group.number }}</span>
          <span class="wf-group__label">{{ group.label }}</span>
        </button>
        <div class="wf-group__items">
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="wf-item"
            role="tab"
            :aria-selected="activeId === item.id"
            :disabled="item.locked"
            :title="item.hint ?? (item.locked ? 'Verrouillé' : undefined)"
            :class="{
              'wf-item--active': activeId === item.id,
              'wf-item--locked': item.locked,
              'wf-item--done': item.done,
            }"
            :data-testid="`wf-item-${item.id}`"
            @click="clickItem(item)"
          >
            <span class="wf-item__label">{{ item.label }}</span>
            <span v-if="item.locked" class="wf-item__icon wf-item__icon--lock" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7z"/></svg>
            </span>
            <span v-else-if="item.done" class="wf-item__icon wf-item__icon--done" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          </button>
        </div>
      </div>
    </template>

    <!-- STEPS MODE (Cerveau, Rédaction) — uses the same visual language as groups mode:
         no big numbered circle, no prominent green check. Just text items with
         a discrete lock icon on locked, subtle green tint on done. -->
    <template v-else-if="steps && steps.length > 0">
      <div class="wf-steps">
        <button
          v-for="step in steps"
          :key="step.id"
          type="button"
          class="wf-item"
          role="tab"
          :aria-selected="activeId === step.id"
          :disabled="step.locked"
          :title="step.hint ?? (step.locked ? 'Verrouillé' : undefined)"
          :class="{
            'wf-item--active': activeId === step.id,
            'wf-item--locked': step.locked,
            'wf-item--done': step.done,
          }"
          :data-testid="`wf-step-${step.id}`"
          @click="clickItem(step)"
        >
          <span class="wf-item__label">{{ step.label }}</span>
          <span v-if="step.locked" class="wf-item__icon wf-item__icon--lock" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7z"/></svg>
          </span>
        </button>
      </div>
    </template>
  </nav>
</template>

<style scoped>
.wf-nav {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.wf-nav--dense { gap: 0.25rem; }

/* ---------------- GROUPS MODE ---------------- */
.wf-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.375rem 0.25rem 0.5rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.4);
  transition: border-color 0.15s, background 0.15s;
}

.wf-group--active {
  border-color: rgba(59, 130, 246, 0.3);
  background: #fff;
}

.wf-group__head {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0 0.25rem;
  border: none;
  background: transparent;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #94a3b8);
  cursor: pointer;
  flex-shrink: 0;
}

.wf-group__head:hover { color: var(--color-primary, #3b82f6); }

.wf-group--active .wf-group__head { color: var(--color-primary, #3b82f6); }

.wf-group__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #64748b);
  font-size: 0.625rem;
  font-weight: 800;
}

.wf-group--active .wf-group__num {
  background: var(--color-primary, #3b82f6);
  color: #fff;
}

.wf-group__items {
  display: flex;
  gap: 2px;
}

/* ---------------- STEPS MODE ---------------- */
.wf-steps {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg-soft, #f1f5f9);
  border-radius: 8px;
  flex-wrap: wrap;
}

/* ---------------- Shared item styles (both modes) ---------------- */
.wf-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}

.wf-item:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-primary, #3b82f6);
}

.wf-item--active {
  background: var(--color-primary, #3b82f6) !important;
  color: #fff !important;
  font-weight: 600;
}

.wf-item--locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.wf-item--done {
  color: var(--color-success, #16a34a);
}

.wf-item--done.wf-item--active {
  color: #fff !important;
}

.wf-item__icon {
  display: inline-flex;
  align-items: center;
}

.wf-item__icon--lock { opacity: 0.7; }
.wf-item__icon--done { color: var(--color-success, #16a34a); }
.wf-item--active .wf-item__icon--done { color: #fff; }
</style>
