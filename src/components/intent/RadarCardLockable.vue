<script setup lang="ts">
import { ref } from 'vue'
import type { RadarCard } from '@shared/types/intent.types.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { ModifierKind } from '@shared/utils/keyword-modifiers'
import RadarKeywordCard from './RadarKeywordCard.vue'
import type { InteractiveWordsProps, RadarDisplayMode } from './RadarKeywordCard.vue'

defineProps<{
  card: RadarCard
  locked: boolean
  interactiveWords?: InteractiveWordsProps
  displayMode?: RadarDisplayMode
  articleLevel?: ArticleLevel
  modifiers?: (ModifierKind | null)[]
  validating?: boolean
}>()

defineEmits<{
  'update:locked': [value: boolean]
  'word-toggle': [activeIndices: number[]]
  'modifier-untag': [index: number]
  'modifier-cycle': [payload: { index: number; next: ModifierKind | null }]
}>()

// Mode "tag manuel" : quand actif, un clic sur un mot du keyword cycle son tag
// (null → local → persona → null) au lieu du toggle actif/inactif normal.
// Activé via le bouton tag à côté du verrou — réservé aux cas où la détection
// auto se trompe ou rate un terme.
const manualTagMode = ref(false)
function toggleManualTagMode() {
  manualTagMode.value = !manualTagMode.value
}
</script>

<template>
  <div class="radar-card-lockable" :class="{ locked, 'manual-tag-mode': manualTagMode }">
    <div class="radar-card-lockable__actions">
      <button
        class="radar-card-lockable__toggle"
        :class="{ active: locked }"
        :title="locked ? 'Déverrouiller' : 'Verrouiller'"
        :aria-pressed="locked"
        data-testid="radar-card-lock"
        @click.stop="$emit('update:locked', !locked)"
      >
        <svg v-if="locked" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm3 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M7 10V7a5 5 0 0110 0M5 10h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="16" r="1.5"/>
        </svg>
      </button>

      <!-- Bouton tag manuel : active le mode où un clic sur un mot cycle son tag (local/persona/null). -->
      <button
        class="radar-card-lockable__tag-toggle"
        :class="{ active: manualTagMode }"
        :title="manualTagMode ? 'Quitter le mode tag manuel' : 'Tagger manuellement les mots (local / persona)'"
        :aria-pressed="manualTagMode"
        data-testid="radar-card-tag-toggle"
        @click.stop="toggleManualTagMode"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <div class="radar-card-lockable__content">
      <RadarKeywordCard
        :card="card"
        :interactive-words="interactiveWords"
        :display-mode="displayMode"
        :article-level="articleLevel"
        :modifiers="modifiers"
        :manual-tag-mode="manualTagMode"
        @word-toggle="$emit('word-toggle', $event)"
        @modifier-untag="$emit('modifier-untag', $event)"
        @modifier-cycle="$emit('modifier-cycle', $event)"
      />
      <div v-if="validating" class="radar-card-lockable__overlay" role="status" aria-live="polite">
        <span class="radar-card-lockable__spinner" aria-hidden="true" />
        <span class="radar-card-lockable__overlay-label">Validation…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.radar-card-lockable {
  /* Sprint 3.3 — center the lock toggle vertically (was top-aligned, looked
     lost when the card was tall). */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.radar-card-lockable.locked {
  border-color: var(--color-success, #22c55e);
  background: var(--color-success-bg, #f0fdf4);
}

.radar-card-lockable__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.radar-card-lockable__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--color-border, #e2e8f0);
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.radar-card-lockable__toggle:hover {
  border-color: var(--color-success, #22c55e);
  color: var(--color-success, #22c55e);
}

.radar-card-lockable__toggle.active {
  border-color: var(--color-success, #22c55e);
  background: var(--color-success-bg, #f0fdf4);
  color: var(--color-success, #22c55e);
}

.radar-card-lockable__tag-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1.5px solid var(--color-border, #e2e8f0);
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.radar-card-lockable__tag-toggle:hover {
  border-color: #0891b2;
  color: #0891b2;
}

.radar-card-lockable__tag-toggle.active {
  border-color: #0891b2;
  background: rgba(8, 145, 178, 0.08);
  color: #0891b2;
}

.radar-card-lockable.manual-tag-mode {
  border-color: #0891b2;
  background: rgba(8, 145, 178, 0.04);
}

.radar-card-lockable__content {
  position: relative;
  flex: 1;
  min-width: 0;
}

.radar-card-lockable__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(1px);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--color-text-muted, #64748b);
  pointer-events: none;
  z-index: 2;
}

.radar-card-lockable__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-success, #22c55e);
  border-radius: 50%;
  animation: radar-card-lockable-spin 0.8s linear infinite;
}

.radar-card-lockable__overlay-label {
  font-weight: 500;
}

@keyframes radar-card-lockable-spin {
  to { transform: rotate(360deg); }
}
</style>
