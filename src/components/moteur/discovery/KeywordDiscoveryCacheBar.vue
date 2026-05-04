<script setup lang="ts">
/**
 * Vague 5 — Sous-composant Vue extrait de KeywordDiscoveryTab.
 *
 * Cache indicator (Sprint 15.6 — DB-first keyword_discoveries, TTL 30j applicatif).
 * Affiche un badge "Dernière analyse" + boutons Charger / Rafraîchir, visible
 * tant que `cached === true` et que l'utilisateur n'a pas encore lancé une
 * nouvelle découverte (`hasDiscovered === false`).
 */
import type { DiscoveryCacheStatus } from '@shared/types/discovery-cache.types.js'

defineProps<{
  cacheStatus: DiscoveryCacheStatus | null
  hasDiscovered: boolean
  cacheLoading: boolean
}>()

defineEmits<{
  (e: 'load'): void
  (e: 'clear'): void
}>()
</script>

<template>
  <div v-if="cacheStatus?.cached && !hasDiscovered" class="cache-indicator">
    <span class="cache-indicator__badge">
      Derniere analyse
      <span v-if="cacheStatus.cachedAt" class="cache-indicator__date">
        du {{ new Date(cacheStatus.cachedAt).toLocaleDateString('fr-FR') }}
      </span>
      <span v-if="cacheStatus.keywordCount" class="cache-indicator__kw">
        · {{ cacheStatus.keywordCount }} mots-cles
      </span>
      <span v-if="cacheStatus.hasAnalysis" class="cache-indicator__analysis">
        · analyse IA incluse
      </span>
    </span>
    <button class="cache-indicator__load" :disabled="cacheLoading" @click="$emit('load')">
      {{ cacheLoading ? 'Chargement...' : 'Charger' }}
    </button>
    <button class="cache-indicator__clear" @click="$emit('clear')">
      Rafraichir
    </button>
  </div>
</template>

<style scoped>
.cache-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  background: rgba(22, 163, 74, 0.06);
  border: 1px solid rgba(22, 163, 74, 0.3);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #15803d;
}

.cache-indicator__badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.cache-indicator__date,
.cache-indicator__kw,
.cache-indicator__analysis {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.cache-indicator__load {
  margin-left: auto;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #15803d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cache-indicator__load:hover:not(:disabled) {
  background: #166534;
}

.cache-indicator__load:disabled {
  opacity: 0.6;
  cursor: wait;
}

.cache-indicator__clear {
  padding: 4px 12px;
  font-size: 0.75rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-muted);
}

.cache-indicator__clear:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}
</style>
