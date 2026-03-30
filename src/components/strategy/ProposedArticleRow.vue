<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProposedArticle } from '@shared/types/index.js'

const props = defineProps<{
  article: ProposedArticle
  index: number
}>()

const emit = defineEmits<{
  (e: 'regenerate-title', index: number): void
  (e: 'regenerate-keyword', index: number): void
  (e: 'select-keyword', index: number, keywordIndex: number): void
  (e: 'select-title', index: number, titleIndex: number): void
  (e: 'toggle-accept', index: number): void
  (e: 'remove', index: number): void
}>()

const keywords = computed(() => props.article.suggestedKeywords?.length ? props.article.suggestedKeywords : [props.article.suggestedKeyword])
const currentKeywordIndex = computed(() => {
  const idx = keywords.value.indexOf(props.article.suggestedKeyword)
  return idx >= 0 ? idx : keywords.value.length - 1
})

const titles = computed(() => props.article.suggestedTitles?.length ? props.article.suggestedTitles : [props.article.title])
const currentTitleIndex = computed(() => {
  const idx = titles.value.indexOf(props.article.title)
  return idx >= 0 ? idx : titles.value.length - 1
})

const expanded = ref(false)

const maturityTags = [
  { key: 'keywordValidated' as const, label: 'Mot-clé technique', labelDone: 'Mot-clé technique ✓' },
  { key: 'searchQueryValidated' as const, label: 'Requête recherche', labelDone: 'Requête recherche ✓' },
  { key: 'titleValidated' as const, label: 'Titre', labelDone: 'Titre ✓' },
] as const
</script>

<template>
  <div class="proposal-item" :class="{ expanded, accepted: article.accepted }">
    <!-- Maturity tags (above title) -->
    <div class="maturity-tags">
      <span
        v-for="tag in maturityTags"
        :key="tag.key"
        class="maturity-tag"
        :class="article[tag.key] ? 'maturity-tag--done' : 'maturity-tag--pending'"
      >
        {{ article[tag.key] ? tag.labelDone : tag.label }}
      </span>
    </div>

    <!-- Header row -->
    <div class="proposal-header">
      <button class="proposal-chevron" @click="expanded = !expanded">
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          :class="{ rotated: expanded }"
        >
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        v-if="titles.length > 1 && currentTitleIndex > 0"
        class="slider-arrow"
        @click.stop="emit('select-title', index, currentTitleIndex - 1)"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M6.5 1.5L3 5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="proposal-title" :title="expanded ? undefined : article.title">
        {{ article.title || 'Sans titre' }}
      </span>
      <span v-if="titles.length > 1" class="slider-counter">{{ currentTitleIndex + 1 }}/{{ titles.length }}</span>
      <button
        v-if="titles.length > 1 && currentTitleIndex < titles.length - 1"
        class="slider-arrow"
        @click.stop="emit('select-title', index, currentTitleIndex + 1)"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <!-- Actions (header — collapsed only) -->
      <div v-if="!expanded" class="proposal-actions">
        <button
          class="proposal-action-btn proposal-action-accept"
          :class="{ 'proposal-action-accept--active': article.accepted }"
          :title="article.accepted ? 'Article validé' : 'Valider cet article'"
          @click.stop="emit('toggle-accept', index)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button class="proposal-action-btn" title="Régénérer le titre" @click.stop="emit('regenerate-title', index)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.5M13.5 8a5.5 5.5 0 0 1-9.68 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M12.5 1v3.5H9M3.5 15v-3.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="0.8" fill="none" />
            <path d="M7 7.5h2M7 9h1" stroke="currentColor" stroke-width="0.7" stroke-linecap="round" />
          </svg>
        </button>
        <button class="proposal-action-btn" title="Régénérer le mot-clé" @click.stop="emit('regenerate-keyword', index)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.5M13.5 8a5.5 5.5 0 0 1-9.68 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M12.5 1v3.5H9M3.5 15v-3.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M8.5 6.5a1.5 1.5 0 0 1 .35 2.96L7.5 10.8v1.2H6.5v-.8h-.5v-.8l1.65-1.65A1.5 1.5 0 0 1 8.5 6.5z" stroke="currentColor" stroke-width="0.8" fill="none" />
          </svg>
        </button>
        <button class="proposal-action-btn proposal-action-delete" title="Supprimer cet article" @click.stop="emit('remove', index)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Expanded details -->
    <div v-if="expanded" class="proposal-details">
      <div v-if="article.suggestedKeyword" class="keyword-slider">
        <span class="keyword-label">Mot-clé suggéré</span>
        <div class="keyword-slider-row">
          <button
            class="slider-arrow"
            :disabled="currentKeywordIndex <= 0"
            @click.stop="emit('select-keyword', index, currentKeywordIndex - 1)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M6.5 1.5L3 5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <span class="keyword-badge">{{ article.suggestedKeyword }}</span>
          <button
            class="slider-arrow"
            :disabled="currentKeywordIndex >= keywords.length - 1"
            @click.stop="emit('select-keyword', index, currentKeywordIndex + 1)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <span v-if="keywords.length > 1" class="slider-counter">{{ currentKeywordIndex + 1 }} / {{ keywords.length }}</span>
        </div>
      </div>

      <div v-if="article.validatedSearchQuery" class="detail-keyword">
        <span class="keyword-label">Requête validée</span>
        <span class="keyword-badge keyword-badge--validated">{{ article.validatedSearchQuery }}</span>
      </div>

      <div v-if="article.painPoint" class="detail-pain-point">
        <span class="pain-point-label">Douleur</span>
        <span class="pain-point-text">{{ article.painPoint }}</span>
      </div>

      <p v-if="article.rationale" class="detail-rationale">{{ article.rationale }}</p>

      <!-- Actions (bottom — expanded only) -->
      <div class="proposal-actions proposal-actions--bottom">
        <button
          class="proposal-action-btn proposal-action-accept"
          :class="{ 'proposal-action-accept--active': article.accepted }"
          :title="article.accepted ? 'Article validé' : 'Valider cet article'"
          @click.stop="emit('toggle-accept', index)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="action-label">Valider</span>
        </button>
        <button class="proposal-action-btn" title="Régénérer le titre" @click.stop="emit('regenerate-title', index)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.5M13.5 8a5.5 5.5 0 0 1-9.68 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M12.5 1v3.5H9M3.5 15v-3.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="0.8" fill="none" />
            <path d="M7 7.5h2M7 9h1" stroke="currentColor" stroke-width="0.7" stroke-linecap="round" />
          </svg>
          <span class="action-label">Titre</span>
        </button>
        <button class="proposal-action-btn" title="Régénérer le mot-clé" @click.stop="emit('regenerate-keyword', index)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.5M13.5 8a5.5 5.5 0 0 1-9.68 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M12.5 1v3.5H9M3.5 15v-3.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M8.5 6.5a1.5 1.5 0 0 1 .35 2.96L7.5 10.8v1.2H6.5v-.8h-.5v-.8l1.65-1.65A1.5 1.5 0 0 1 8.5 6.5z" stroke="currentColor" stroke-width="0.8" fill="none" />
          </svg>
          <span class="action-label">Mot-clé</span>
        </button>
        <button class="proposal-action-btn proposal-action-delete" title="Supprimer cet article" @click.stop="emit('remove', index)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span class="action-label">Supprimer</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proposal-item {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.proposal-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* --- Maturity tags (above title) --- */
.maturity-tags {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem 0;
  flex-wrap: wrap;
}

.maturity-tag {
  display: inline-block;
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.5625rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.maturity-tag--pending {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

.maturity-tag--done {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

/* --- Header --- */
.proposal-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem 0.5rem 0.375rem;
}

/* When expanded, title wraps */
.expanded .proposal-header {
  align-items: flex-start;
}

.proposal-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  margin-top: 0.0625rem;
}

.proposal-chevron svg {
  transition: transform 0.15s;
}

.proposal-chevron svg.rotated {
  transform: rotate(90deg);
}

.proposal-title {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Expanded: full title, multi-line */
.expanded .proposal-title {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  line-height: 1.4;
}

/* --- Actions --- */
.proposal-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

.proposal-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  opacity: 0;
}

/* Show on item hover */
.proposal-item:hover .proposal-action-btn {
  opacity: 1;
}

.proposal-action-btn:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.proposal-action-accept {
  opacity: 1;
  color: var(--color-text-muted);
}

.proposal-action-accept--active {
  color: var(--color-badge-green-text);
  background: var(--color-badge-green-bg);
}

.proposal-action-accept:hover:not(.proposal-action-accept--active) {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.proposal-item.accepted {
  border-color: var(--color-badge-green-text);
}

.proposal-action-delete:hover {
  background: var(--color-danger-soft, #fde8e8);
  color: var(--color-danger, #e53e3e);
}

/* --- Bottom actions (expanded) --- */
.proposal-actions--bottom {
  gap: 0.5rem;
  padding-top: 0.375rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.25rem;
}

.proposal-actions--bottom .proposal-action-btn {
  opacity: 1;
  width: auto;
  height: auto;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
}

.action-label {
  font-size: 0.6875rem;
  font-weight: 500;
}

/* --- Expanded details --- */
.proposal-details {
  padding: 0 0.625rem 0.625rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.keyword-slider {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
}

.keyword-slider-row {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
}

.keyword-slider-row .keyword-badge {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  line-height: 1.4;
}

.slider-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 3px;
  padding: 0;
  flex-shrink: 0;
}

.slider-arrow:hover:not(:disabled) {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.slider-arrow:disabled {
  opacity: 0.25;
  cursor: default;
}

.slider-counter {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  margin-left: 0.125rem;
}

.detail-keyword {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.keyword-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.keyword-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.keyword-badge--validated {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.detail-pain-point {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.1));
}

.pain-point-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-badge-amber-text, #d97706);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.pain-point-text {
  font-size: 0.75rem;
  color: var(--color-text);
  line-height: 1.4;
}

.detail-rationale {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
