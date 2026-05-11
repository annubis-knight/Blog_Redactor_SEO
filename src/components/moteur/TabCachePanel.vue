<script setup lang="ts">
import { computed } from 'vue'

/**
 * Each tab reports two kinds of previously-computed data:
 *  - `dbCount`    : rows in the dedicated *_explorations / article_keywords tables.
 *                   Source of truth, survives refresh. "En base".
 *  - `cacheCount` : lightweight items still in memory or in api_cache.
 *                   Ephemeral, can be purged. "En cache".
 *
 * Both are surfaced in the chip summary so the user can tell at a glance
 * whether the next click will reuse persistent data or volatile cache.
 *
 * The chip label uses a single unit name (e.g. "entrée") across tabs to keep
 * the UI coherent — the old summary had a different noun per tab ("mots-clés",
 * "exploration", "proposition", "termes", "extraction", …).
 */
export interface TabCacheEntry {
  tabId: string
  tabLabel: string
  /** Items persisted in the dedicated *_explorations table. */
  dbCount: number
  /** Items still in in-memory cache or api_cache (not yet persisted to _explorations). */
  cacheCount: number
  isCurrentTab: boolean
  /** Optional extra detail shown on hover. */
  hint?: string
}

const props = defineProps<{
  entries: TabCacheEntry[]
  activeTab: string
  /** When true, renders the "Vider cache externe" button inside the green card. */
  showClearCache?: boolean
}>()

// Chips sont des indicateurs visuels read-only (pas d'actions au clic).
// Navigation via onglets standards.
const emit = defineEmits<{
  'clear-cache': []
}>()

function hasData(e: TabCacheEntry): boolean {
  return e.dbCount > 0 || e.cacheCount > 0
}

const cacheTotal = computed(() => props.entries.reduce((n, e) => n + e.cacheCount, 0))
</script>

<template>
  <div class="tcp" data-testid="tab-cache-panel">
    <!-- Header: title + optional clear-cache button -->
    <div class="tcp__header">
      <span class="tcp__title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm1 2v14h12V5H6zm2 3h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/>
        </svg>
        R&eacute;sultats d&eacute;j&agrave; calcul&eacute;s
      </span>
      <button
        v-if="showClearCache && cacheTotal > 0"
        type="button"
        class="tcp__clear"
        title="Vide le cache externe (autocomplete, PAA, SERP, validate) pour cet article. La base de données n'est pas affectée."
        data-testid="tcp-clear-cache"
        @click="emit('clear-cache')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        </svg>
        Vider le cache
      </button>
    </div>

    <!-- Chips read-only (nav via onglets standards). -->
    <div class="tcp__chips">
      <span
        v-for="entry in entries"
        :key="entry.tabId"
        class="tcp__chip"
        :class="{
          'tcp__chip--filled': hasData(entry),
          'tcp__chip--empty': !hasData(entry),
        }"
        :title="entry.hint"
        :data-testid="`tcp-chip-${entry.tabId}`"
      >
        <span class="tcp__chip-label">{{ entry.tabLabel }}</span>
        <!-- DB + C toujours affichés, même à 0 — prouve qu'une lecture a bien été tentée. -->
        <span class="tcp__chip-nums">
          <span class="tcp__num tcp__num--db" :class="{ 'tcp__num--zero': entry.dbCount === 0 }">
            <span class="tcp__num-badge" aria-hidden="true">DB</span>
            {{ entry.dbCount }}
          </span>
          <span class="tcp__num tcp__num--cache" :class="{ 'tcp__num--zero': entry.cacheCount === 0 }">
            <span class="tcp__num-badge tcp__num-badge--cache" aria-hidden="true">C</span>
            {{ entry.cacheCount }}
          </span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tcp {
  padding: 0.625rem 0.75rem;
  background: linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, rgba(22, 163, 74, 0.04) 100%);
  border: 1px solid rgba(22, 163, 74, 0.25);
  border-radius: 10px;
  font-size: 0.8125rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tcp__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.tcp__title {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 700;
  color: #15803d;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.tcp__clear {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 3px 8px;
  background: transparent;
  border: 1px solid rgba(22, 163, 74, 0.4);
  border-radius: 6px;
  color: #15803d;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.tcp__clear:hover {
  background: #15803d;
  color: #fff;
  border-color: #15803d;
}

/* --- Chips --- */
.tcp__chips {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.tcp__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  border: 1px solid transparent;
  background: none;
  font-family: inherit;
  /* Chip read-only : pas de hover, cursor: default. */
  cursor: default;
}

.tcp__chip--filled {
  background: rgba(255, 255, 255, 0.7);
  color: #166534;
  border-color: rgba(22, 163, 74, 0.35);
}

.tcp__chip--empty {
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  border-color: var(--color-border, #e2e8f0);
  opacity: 0.6;
}

.tcp__chip-label {
  font-weight: 700;
}

.tcp__chip-nums {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.tcp__num {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-mono, monospace);
  font-size: 0.625rem;
  font-weight: 600;
}

.tcp__num-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 0.5rem;
  font-weight: 700;
  background: #dcfce7;
  color: #166534;
}

.tcp__num-badge--cache {
  background: #e0e7ff;
  color: #3730a3;
}

/* Zero state: visible but dimmed — prouve qu'on a regardé, mais rien trouvé. */
.tcp__num--zero { opacity: 0.4; }
</style>
