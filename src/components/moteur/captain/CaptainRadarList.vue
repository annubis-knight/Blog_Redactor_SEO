<script setup lang="ts">
import SortToggleBar from '@/components/moteur/SortToggleBar.vue'
import CaptainInteractiveWords from '@/components/moteur/CaptainInteractiveWords.vue'
import type { ExploredKeywordEntry } from '@/composables/keyword/useExploredKeywords'
import type { SortOption } from '@/composables/moteur/useSortableList'
import type { ArticleLevel } from '@shared/types/index.js'
import type { RadarCard } from '@shared/types/intent.types.js'

defineProps<{
  entries: ExploredKeywordEntry[]
  sortedEntries: ExploredKeywordEntry[]
  selectedIndex: number | null
  lockedIndex: number | null
  lockedKeyword: string | null
  articleLevel: ArticleLevel
  articleId: number | null
  articlePainPoint: string | null
  sortOptions: SortOption[]
  sortState: { key: string | null; direction: 'asc' | 'desc' | 'neutral' }
  rawIndexOf: (entry: ExploredKeywordEntry) => number
}>()

defineEmits<{
  (e: 'select', index: number): void
  (e: 'lock', index: number): void
  (e: 'unlock'): void
  (e: 'word-toggle', payload: { index: number; indices: number[] }): void
  (e: 'recompute-relevance', card: RadarCard): void
  (e: 'sort-change', state: { key: string | null; direction: 'asc' | 'desc' | 'neutral' }): void
}>()
</script>

<template>
  <div class="radar-list" data-testid="radar-list">
    <SortToggleBar
      v-if="entries.length > 0"
      :options="sortOptions"
      :model-value="sortState"
      @update:model-value="(s) => $emit('sort-change', s)"
    />
    <div
      v-if="entries.length === 0"
      class="radar-list-empty"
      data-testid="radar-list-empty"
    >
      Aucun mot-cl&eacute; &agrave; valider pour cet article.
    </div>
    <div
      v-for="entry in sortedEntries"
      :key="entry.originalCard.keyword"
      class="radar-list-item"
      :class="{
        'radar-list-item--selected': selectedIndex === rawIndexOf(entry),
        'radar-list-item--locked': lockedKeyword === entry.card.keyword,
      }"
      :data-testid="`radar-list-item-${rawIndexOf(entry)}`"
      role="button"
      tabindex="0"
      :aria-pressed="selectedIndex === rawIndexOf(entry)"
      @click="$emit('select', rawIndexOf(entry))"
      @keydown.enter.space.prevent="$emit('select', rawIndexOf(entry))"
    >
      <div
        v-if="entry.isLoading"
        class="captain-loading"
        :data-testid="`radar-list-item-${rawIndexOf(entry)}-loading`"
      >
        <div class="captain-loading-spinner" />
        <p>Validation en cours...</p>
      </div>
      <div
        v-else-if="entry.error"
        class="captain-error"
        :data-testid="`radar-list-item-${rawIndexOf(entry)}-error`"
      >
        <p>Erreur : {{ entry.error }}</p>
      </div>
      <CaptainInteractiveWords
        v-else-if="entry.validation"
        :entry="entry"
        :locked-keyword="lockedKeyword"
        :article-level="articleLevel"
        :article-id="articleId"
        :article-pain-point="articlePainPoint"
        @lock="$emit('lock', rawIndexOf(entry))"
        @unlock="lockedIndex === rawIndexOf(entry) ? $emit('unlock') : null"
        @word-toggle="(indices: number[]) => $emit('word-toggle', { index: rawIndexOf(entry), indices })"
        @recompute-relevance="(card: RadarCard) => $emit('recompute-relevance', card)"
      />
    </div>
  </div>
</template>

<style scoped>
.radar-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radar-list-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-style: italic;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.radar-list-item {
  padding: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.radar-list-item:hover {
  border-color: var(--color-primary);
}

.radar-list-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.radar-list-item--selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.radar-list-item--locked {
  border-color: var(--color-success, #22c55e);
}

.captain-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--color-text-muted);
}

.captain-loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.captain-error {
  padding: 1rem;
  color: var(--color-error);
  font-size: 0.8125rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
