<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProposedArticle, CompositionCheckResult } from '@shared/types/index.js'
import { IconArrow, IconCheck, IconClose, IconKebab, IconRefresh, IconLink } from '@/components/shared/icons'

const props = defineProps<{
  article: ProposedArticle
  index: number
  compositionResult?: CompositionCheckResult | null
  groupColor?: string
  structuralWarnings?: Array<{ type: string; message: string }>
  availableParents?: string[]
}>()

const emit = defineEmits<{
  (e: 'regenerate-title', index: number): void
  (e: 'regenerate-keyword', index: number): void
  (e: 'regenerate-slug', index: number): void
  (e: 'select-keyword', index: number, keywordIndex: number): void
  (e: 'select-title', index: number, titleIndex: number): void
  (e: 'select-slug', index: number, slugIndex: number): void
  (e: 'toggle-accept', index: number): void
  (e: 'remove', index: number): void
  (e: 'change-parent', index: number, parentTitle: string): void
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

const slugs = computed(() => props.article.suggestedSlugs?.length ? props.article.suggestedSlugs : (props.article.suggestedSlug ? [props.article.suggestedSlug] : []))
const currentSlugIndex = computed(() => {
  const idx = slugs.value.indexOf(props.article.suggestedSlug)
  return idx >= 0 ? idx : slugs.value.length - 1
})

const expanded = ref(false)
const parentMenuOpen = ref(false)
const actionsMenuOpen = ref(false)

const truncatedParentTitle = computed(() => {
  if (!props.article.parentTitle) return null
  const t = props.article.parentTitle
  return t.length > 30 ? t.slice(0, 30) + '…' : t
})

const tooltipVisible = ref(false)
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

function showTooltip() {
  if (tooltipTimer) clearTimeout(tooltipTimer)
  tooltipVisible.value = true
}
function hideTooltip() {
  tooltipTimer = setTimeout(() => { tooltipVisible.value = false }, 150)
}
function keepTooltip() {
  if (tooltipTimer) clearTimeout(tooltipTimer)
}

const totalWarningCount = computed(() => {
  const compWarnings = props.compositionResult?.warningCount ?? 0
  const structWarnings = props.structuralWarnings?.length ?? 0
  return compWarnings + structWarnings
})

const hasAnyIssue = computed(() => {
  return totalWarningCount.value > 0 || (props.compositionResult && !props.compositionResult.allPass)
})

const maturityTags = [
  { key: 'keywordValidated' as const, label: 'Mot-clé technique', labelDone: 'Mot-clé technique ✓' },
  { key: 'searchQueryValidated' as const, label: 'Requête recherche', labelDone: 'Requête recherche ✓' },
  { key: 'titleValidated' as const, label: 'Titre', labelDone: 'Titre ✓' },
] as const
</script>

<template>
  <div
    class="proposal-item"
    :class="{ expanded, accepted: article.accepted }"
    :style="groupColor ? { borderLeft: `3px solid ${groupColor}` } : undefined"
    @click="expanded = !expanded"
  >
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
      <button
        v-if="titles.length > 1 && currentTitleIndex > 0"
        class="slider-arrow"
        @click.stop="emit('select-title', index, currentTitleIndex - 1)"
      >
        <IconArrow direction="left" />
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
        <IconArrow direction="right" />
      </button>

      <!-- Composition badge with hover tooltip -->
      <span
        v-if="hasAnyIssue"
        class="composition-badge composition-badge--warn"
        data-testid="composition-badge-warn"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
      >&#9888; {{ totalWarningCount }}</span>
      <span
        v-else-if="compositionResult && compositionResult.allPass && !(structuralWarnings?.length)"
        class="composition-badge composition-badge--ok"
        data-testid="composition-badge-ok"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
      >&#10003;</span>

      <!-- Tooltip (hover on badge) -->
      <div
        v-if="tooltipVisible && (compositionResult || (structuralWarnings?.length ?? 0) > 0)"
        class="composition-tooltip"
        data-testid="composition-tooltip"
        @mouseenter="keepTooltip"
        @mouseleave="hideTooltip"
      >
        <div v-if="structuralWarnings?.length" class="tooltip-section">
          <span class="tooltip-section-title">Structure</span>
          <div
            v-for="(w, wi) in structuralWarnings"
            :key="'sw-' + wi"
            class="composition-rule composition-rule--warn"
          >
            <span class="composition-rule-icon">&#9888;</span>
            <span class="composition-rule-msg">{{ w.message }}</span>
          </div>
        </div>
        <div v-if="compositionResult" class="tooltip-section">
          <span v-if="structuralWarnings?.length" class="tooltip-section-title">Composition</span>
          <div
            v-for="rule in compositionResult.results"
            :key="rule.rule"
            class="composition-rule"
            :class="rule.pass ? 'composition-rule--pass' : 'composition-rule--warn'"
          >
            <span class="composition-rule-icon">{{ rule.pass ? '&#10003;' : '&#9888;' }}</span>
            <span class="composition-rule-msg">{{ rule.message }}</span>
          </div>
        </div>
      </div>

      <!-- Actions (header — collapsed only) -->
      <div v-if="!expanded" class="proposal-actions">
        <button
          class="proposal-action-btn proposal-action-accept"
          :class="{ 'proposal-action-accept--active': article.accepted }"
          :title="article.accepted ? 'Article validé' : 'Valider cet article'"
          @click.stop="emit('toggle-accept', index)"
        >
          <IconCheck :size="14" />
        </button>
        <button
          class="proposal-action-btn proposal-action-kebab"
          title="Plus d'actions"
          data-testid="kebab-btn"
          @click.stop="actionsMenuOpen = !actionsMenuOpen"
        >
          <IconKebab />
        </button>
        <button class="proposal-action-btn proposal-action-delete" title="Supprimer cet article" @click.stop="emit('remove', index)">
          <IconClose :size="14" />
        </button>
      </div>

      <!-- Kebab dropdown (collapsed only) -->
      <div v-if="!expanded && actionsMenuOpen" class="actions-menu" data-testid="actions-menu">
        <div class="actions-menu-backdrop" @click.stop="actionsMenuOpen = false"></div>
        <div class="actions-menu-items">
          <button class="actions-menu-item" @click.stop="emit('regenerate-title', index); actionsMenuOpen = false">
            <IconRefresh :size="14">
              <rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="0.8" fill="none" />
              <path d="M7 7.5h2M7 9h1" stroke="currentColor" stroke-width="0.7" stroke-linecap="round" />
            </IconRefresh>
            Régénérer le titre
          </button>
          <button class="actions-menu-item" @click.stop="emit('regenerate-keyword', index); actionsMenuOpen = false">
            <IconRefresh :size="14">
              <path d="M8.5 6.5a1.5 1.5 0 0 1 .35 2.96L7.5 10.8v1.2H6.5v-.8h-.5v-.8l1.65-1.65A1.5 1.5 0 0 1 8.5 6.5z" stroke="currentColor" stroke-width="0.8" fill="none" />
            </IconRefresh>
            Régénérer le mot-clé
          </button>
          <button class="actions-menu-item" @click.stop="emit('regenerate-slug', index); actionsMenuOpen = false">
            <IconRefresh :size="14">
              <path d="M5.5 8h5M5.5 8l1-1.5M5.5 8l1 1.5M10.5 8l-1-1.5M10.5 8l-1 1.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" />
            </IconRefresh>
            Régénérer le slug
          </button>
          <button
            v-if="availableParents?.length"
            class="actions-menu-item"
            data-testid="link-parent-btn"
            @click.stop="parentMenuOpen = !parentMenuOpen; actionsMenuOpen = false"
          >
            <IconLink :size="14" />
            Rattacher à un intermédiaire
          </button>
        </div>
      </div>
    </div>

    <!-- Parent selection dropdown -->
    <div v-if="parentMenuOpen && availableParents?.length" class="parent-menu" data-testid="parent-menu">
      <div class="parent-menu-backdrop" @click="parentMenuOpen = false"></div>
      <div class="parent-menu-items">
        <button
          v-for="parent in availableParents"
          :key="parent"
          class="parent-menu-item"
          :class="{ 'parent-menu-item--active': article.parentTitle === parent }"
          @click="emit('change-parent', index, parent); parentMenuOpen = false"
        >
          {{ parent }}
        </button>
      </div>
    </div>

    <!-- Slug preview (collapsed only) -->
    <div v-if="!expanded && article.suggestedSlug" class="collapsed-slug" data-testid="collapsed-slug">
      /{{ article.suggestedSlug }}
    </div>

    <!-- Parent title badge (collapsed only) -->
    <div v-if="!expanded && truncatedParentTitle" class="parent-title-badge" data-testid="parent-title-badge">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6.5 3.5h6v6M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ truncatedParentTitle }}</span>
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
            <IconArrow direction="left" />
          </button>
          <span class="keyword-badge">{{ article.suggestedKeyword }}</span>
          <button
            class="slider-arrow"
            :disabled="currentKeywordIndex >= keywords.length - 1"
            @click.stop="emit('select-keyword', index, currentKeywordIndex + 1)"
          >
            <IconArrow direction="right" />
          </button>
          <span v-if="keywords.length > 1" class="slider-counter">{{ currentKeywordIndex + 1 }} / {{ keywords.length }}</span>
        </div>
      </div>

      <div v-if="article.suggestedSlug" class="slug-slider">
        <span class="keyword-label">Slug</span>
        <div class="keyword-slider-row">
          <button
            class="slider-arrow"
            :disabled="currentSlugIndex <= 0"
            @click.stop="emit('select-slug', index, currentSlugIndex - 1)"
          >
            <IconArrow direction="left" />
          </button>
          <span class="keyword-badge keyword-badge--slug" data-testid="slug-badge">{{ article.suggestedSlug }}</span>
          <button
            class="slider-arrow"
            :disabled="currentSlugIndex >= slugs.length - 1"
            @click.stop="emit('select-slug', index, currentSlugIndex + 1)"
          >
            <IconArrow direction="right" />
          </button>
          <span v-if="slugs.length > 1" class="slider-counter">{{ currentSlugIndex + 1 }} / {{ slugs.length }}</span>
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
          <IconCheck />
          <span class="action-label">Valider</span>
        </button>
        <div class="regen-dropdown-wrapper">
          <button
            class="proposal-action-btn"
            title="Régénérer"
            data-testid="regen-dropdown-btn"
            @click.stop="actionsMenuOpen = !actionsMenuOpen"
          >
            <IconRefresh />
            <span class="action-label">Régénérer &#9662;</span>
          </button>
          <div v-if="actionsMenuOpen" class="actions-menu actions-menu--inline" data-testid="regen-menu">
            <div class="actions-menu-backdrop" @click.stop="actionsMenuOpen = false"></div>
            <div class="actions-menu-items">
              <button class="actions-menu-item" @click.stop="emit('regenerate-title', index); actionsMenuOpen = false">Titre</button>
              <button class="actions-menu-item" @click.stop="emit('regenerate-keyword', index); actionsMenuOpen = false">Mot-clé</button>
              <button class="actions-menu-item" @click.stop="emit('regenerate-slug', index); actionsMenuOpen = false">Slug</button>
            </div>
          </div>
        </div>
        <button
          v-if="availableParents?.length"
          class="proposal-action-btn"
          title="Rattacher à un intermédiaire"
          data-testid="link-parent-btn-expanded"
          @click.stop="parentMenuOpen = !parentMenuOpen"
        >
          <IconLink />
          <span class="action-label">Lien</span>
        </button>
        <button class="proposal-action-btn proposal-action-delete" title="Supprimer cet article" @click.stop="emit('remove', index)">
          <IconClose />
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
  cursor: pointer;
}

.proposal-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* --- Maturity tags (above title) --- */
.maturity-tags {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem 0;
  flex-wrap: wrap;
}

.maturity-tag {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem 0.625rem 0.5rem;
}

/* When expanded, title wraps */
.expanded .proposal-header {
  align-items: flex-start;
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

/* --- Expanded details --- */
.proposal-details {
  padding: 0.25rem 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.keyword-slider {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.keyword-slider-row {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
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
  width: 1.5rem;
  height: 1.5rem;
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
  padding: 0.25rem 0.625rem;
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

.keyword-badge--slug {
  background: var(--color-badge-slate-bg);
  color: var(--color-text-muted);
  font-family: monospace;
  font-size: 0.6875rem;
}

.slug-slider {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-pain-point {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
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

/* --- Collapsed slug --- */
.collapsed-slug {
  padding: 0 0.625rem 0.25rem;
  font-size: 0.6875rem;
  font-family: monospace;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
}

/* --- Parent title badge --- */
.parent-title-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.625rem 0.5rem 0.625rem;
  font-size: 0.6875rem;
  font-style: italic;
  color: var(--color-text-muted);
}

.parent-title-badge svg {
  flex-shrink: 0;
  opacity: 0.6;
}

/* --- Composition badges --- */
.composition-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  flex-shrink: 0;
}

.composition-badge--warn {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.composition-badge--ok {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

/* --- Composition tooltip (hover on badge) --- */
.composition-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  min-width: 240px;
  max-width: 340px;
  padding: 0.5rem 0.625rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tooltip-section {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
}

.tooltip-section-title {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding-bottom: 0.125rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.0625rem;
}

.composition-rule {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.4;
}

.composition-rule--pass {
  color: var(--color-badge-green-text);
}

.composition-rule--warn {
  color: var(--color-badge-amber-text);
}

.composition-rule-icon {
  flex-shrink: 0;
  font-size: 0.625rem;
}

.composition-rule-msg {
  font-weight: 400;
}

/* --- Parent menu (link icon dropdown) --- */
.parent-menu {
  position: relative;
}

.parent-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
}

.parent-menu-items {
  position: absolute;
  right: 0;
  z-index: 10;
  min-width: 200px;
  max-width: 340px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 0.25rem 0;
}

.parent-menu-item {
  display: block;
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  line-height: 1.4;
  word-break: break-word;
}

.parent-menu-item:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.parent-menu-item--active {
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

/* --- Actions dropdown (kebab collapsed / regen expanded) --- */
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

/* Kebab button visibility */
.proposal-action-kebab {
  opacity: 0;
}

.proposal-item:hover .proposal-action-kebab {
  opacity: 1;
}

/* Inline variant for expanded regen dropdown */
.regen-dropdown-wrapper {
  position: relative;
}

.actions-menu--inline {
  position: absolute;
  top: 100%;
  left: 0;
}
</style>
