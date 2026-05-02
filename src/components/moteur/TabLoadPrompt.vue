<script setup lang="ts">
/**
 * 2026-05-01 — Notification "Charger depuis DB / Cache" qui s'affiche comme
 * une **extension visuelle du TabCachePanel** : même direction artistique
 * (gradient vert, border-radius, typographie). Le composant ne se positionne
 * pas tout seul — c'est le parent (MoteurView) qui le place à droite du
 * TabCachePanel via un wrapper flex sticky commun.
 *
 * Pas d'auto-dismiss : l'utilisateur clique soit "Charger DB", soit
 * "Charger Cache", soit "Fermer".
 */
import type { TabLoadPromptData } from '@/composables/moteur/useTabLoadPrompt'

defineProps<{
  prompt: TabLoadPromptData
  isLoading?: boolean
}>()

const emit = defineEmits<{
  'load-db': []
  'load-cache': []
  dismiss: []
}>()
</script>

<template>
  <div
    class="tlp"
    role="dialog"
    aria-live="polite"
    :aria-label="`Données disponibles pour ${prompt.tabLabel}`"
    data-testid="tab-load-prompt"
  >
    <div class="tlp__header">
      <span class="tlp__title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Charger {{ prompt.tabLabel }}
      </span>
      <button
        type="button"
        class="tlp__close"
        aria-label="Fermer"
        data-testid="tlp-dismiss"
        @click="emit('dismiss')"
      >&times;</button>
    </div>

    <div class="tlp__actions">
      <button
        v-if="prompt.dbCount > 0"
        type="button"
        class="tlp__btn tlp__btn--db"
        :disabled="isLoading"
        :title="`Charger ${prompt.dbCount} entrée${prompt.dbCount > 1 ? 's' : ''} depuis la base de données`"
        data-testid="tlp-load-db"
        @click="emit('load-db')"
      >
        <span class="tlp__btn-badge" aria-hidden="true">DB</span>
        {{ prompt.dbCount }}
      </button>
      <button
        v-if="prompt.cacheCount > 0"
        type="button"
        class="tlp__btn tlp__btn--cache"
        :disabled="isLoading"
        :title="`Charger ${prompt.cacheCount} entrée${prompt.cacheCount > 1 ? 's' : ''} depuis le cache volatile`"
        data-testid="tlp-load-cache"
        @click="emit('load-cache')"
      >
        <span class="tlp__btn-badge tlp__btn-badge--cache" aria-hidden="true">C</span>
        {{ prompt.cacheCount }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Même DA que TabCachePanel : gradient vert, border-radius, typographie. */
.tlp {
  padding: 0.5rem 0.625rem;
  background: linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, rgba(22, 163, 74, 0.04) 100%);
  border: 1px solid rgba(22, 163, 74, 0.25);
  border-radius: 10px;
  font-size: 0.8125rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tlp__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tlp__title {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 700;
  color: #15803d;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tlp__close {
  margin-left: auto;
  width: 18px;
  height: 18px;
  background: transparent;
  border: none;
  color: #15803d;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tlp__close:hover {
  background: rgba(22, 163, 74, 0.15);
}

.tlp__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.tlp__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(22, 163, 74, 0.35);
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #166534;
  cursor: pointer;
  transition: all 0.15s;
}
.tlp__btn:hover:not(:disabled) {
  background: #fff;
  border-color: rgba(22, 163, 74, 0.7);
  transform: translateY(-1px);
}
.tlp__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tlp__btn-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  background: #dcfce7;
  color: #166534;
  border-radius: 3px;
  font-family: var(--font-mono, monospace);
  font-size: 0.5rem;
  font-weight: 700;
}
.tlp__btn-badge--cache {
  background: #e0e7ff;
  color: #3730a3;
}
</style>
