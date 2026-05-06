<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { ProposedArticle, CompositionCheckResult } from '@shared/types/index.js'
import type { PainIntentExpected } from '@shared/types/scoring.types.js'
import { IconEdit } from '@/components/shared/icons'
import ProposedArticleSliderNav from '@/components/strategy/proposed/ProposedArticleSliderNav.vue'
import ProposedArticleCompositionTooltip from '@/components/strategy/proposed/ProposedArticleCompositionTooltip.vue'
import ProposedArticleActions from '@/components/strategy/proposed/ProposedArticleActions.vue'

const props = defineProps<{
  article: ProposedArticle
  index: number
  compositionResult?: CompositionCheckResult | null
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
  (e: 'edit-title', index: number, value: string): void
  (e: 'edit-keyword', index: number, value: string): void
  (e: 'edit-slug', index: number, value: string): void
  (e: 'update:pain-intent-expected', value: PainIntentExpected | null): void
}>()

/** Options du dropdown radio (FR-PIE-CERVEAU-OVERRIDE).
 *  L'ordre est aligné sur la fréquence d'usage SEO : informational en premier
 *  (default IA pour la majorité des articles), navigational en dernier (rare). */
const PAIN_INTENT_OPTIONS: Array<{ value: PainIntentExpected; label: string }> = [
  { value: 'informational', label: 'Informationnelle (explique, guide, éduque)' },
  { value: 'commercial', label: 'Commerciale (comparatif, sélection)' },
  { value: 'transactional', label: 'Transactionnelle (achat, conversion)' },
  { value: 'navigational', label: 'Navigationnelle (page produit/marque)' },
]

function handlePainIntentChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value
  // String vide → null (« Non défini ») ; sinon, valeur typée garantie par les options du <select>.
  emit('update:pain-intent-expected', value === '' ? null : (value as PainIntentExpected))
}

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

const keywordColorClass = computed(() => {
  switch (props.article.type) {
    case 'Pilier': return 'keyword-badge--pilier'
    case 'Intermédiaire': return 'keyword-badge--inter'
    case 'Spécialisé': return 'keyword-badge--spe'
    default: return ''
  }
})

const editingField = ref<'title' | 'keyword' | 'slug' | null>(null)
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

function startEdit(field: 'title' | 'keyword' | 'slug') {
  if (field === 'title') editValue.value = props.article.title
  else if (field === 'keyword') editValue.value = props.article.suggestedKeyword
  else if (field === 'slug') editValue.value = props.article.suggestedSlug
  editingField.value = field
  nextTick(() => editInputRef.value?.focus())
}

function commitEdit(field: 'title' | 'keyword' | 'slug') {
  if (editingField.value !== field) return
  const value = editValue.value.trim()
  if (value) {
    if (field === 'title' && value !== props.article.title) emit('edit-title', props.index, value)
    else if (field === 'keyword' && value !== props.article.suggestedKeyword) emit('edit-keyword', props.index, value)
    else if (field === 'slug' && value !== props.article.suggestedSlug) emit('edit-slug', props.index, value)
  }
  editingField.value = null
}

</script>

<template>
  <div
    class="proposal-item"
    :class="{ expanded, accepted: article.accepted }"
    @click="expanded = !expanded"
  >
    <!-- Header row -->
    <div class="proposal-header">
      <div class="proposal-title-block">
        <div v-if="expanded" class="label-with-edit">
          <span class="keyword-label">Titre</span>
          <button class="edit-icon-btn" title="Modifier le titre" @click.stop="startEdit('title')">
            <IconEdit :size="12" />
          </button>
        </div>
        <input
          v-if="expanded && editingField === 'title'"
          ref="editInputRef"
          class="inline-edit-input inline-edit-input--title"
          :value="editValue"
          @input="editValue = ($event.target as HTMLInputElement).value"
          @blur="commitEdit('title')"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          @click.stop
        />
        <span v-else class="proposal-title" :title="expanded ? undefined : article.title">
          {{ article.title || 'Sans titre' }}
        </span>
      </div>

      <!-- Composition badge (between title and slider nav) -->
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

      <ProposedArticleSliderNav
        :current-index="currentTitleIndex"
        :total="titles.length"
        @prev="emit('select-title', index, currentTitleIndex - 1)"
        @next="emit('select-title', index, currentTitleIndex + 1)"
      />

      <ProposedArticleCompositionTooltip
        :visible="tooltipVisible"
        :composition-result="compositionResult"
        :structural-warnings="structuralWarnings"
        @mouseenter="keepTooltip"
        @mouseleave="hideTooltip"
      />

      <ProposedArticleActions
        v-if="!expanded"
        position="header"
        :accepted="!!article.accepted"
        :actions-menu-open="actionsMenuOpen"
        :has-parents="!!availableParents?.length"
        @toggle-accept="emit('toggle-accept', index)"
        @remove="emit('remove', index)"
        @toggle-actions-menu="actionsMenuOpen = !actionsMenuOpen"
        @toggle-parent-menu="parentMenuOpen = !parentMenuOpen"
        @regenerate-title="emit('regenerate-title', index)"
        @regenerate-keyword="emit('regenerate-keyword', index)"
        @regenerate-slug="emit('regenerate-slug', index)"
      />
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

    <!-- Expanded details -->
    <div v-if="expanded" class="proposal-details">
      <div v-if="article.suggestedKeyword" class="keyword-slider">
        <div class="label-with-edit">
          <span class="keyword-label">Mot-clé suggéré</span>
          <button class="edit-icon-btn" title="Modifier le mot-clé" @click.stop="startEdit('keyword')">
            <IconEdit :size="12" />
          </button>
        </div>
        <div class="keyword-slider-row">
          <input
            v-if="editingField === 'keyword'"
            ref="editInputRef"
            class="inline-edit-input"
            :value="editValue"
            @input="editValue = ($event.target as HTMLInputElement).value"
            @blur="commitEdit('keyword')"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @click.stop
          />
          <span v-else class="keyword-badge" :class="keywordColorClass">{{ article.suggestedKeyword }}</span>
          <ProposedArticleSliderNav
            :current-index="currentKeywordIndex"
            :total="keywords.length"
            @prev="emit('select-keyword', index, currentKeywordIndex - 1)"
            @next="emit('select-keyword', index, currentKeywordIndex + 1)"
          />
        </div>
      </div>

      <div v-if="article.suggestedSlug" class="slug-slider">
        <div class="label-with-edit">
          <span class="keyword-label">Slug</span>
          <button class="edit-icon-btn" title="Modifier le slug" @click.stop="startEdit('slug')">
            <IconEdit :size="12" />
          </button>
        </div>
        <div class="keyword-slider-row">
          <input
            v-if="editingField === 'slug'"
            ref="editInputRef"
            class="inline-edit-input inline-edit-input--slug"
            :value="editValue"
            @input="editValue = ($event.target as HTMLInputElement).value"
            @blur="commitEdit('slug')"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @click.stop
          />
          <span v-else class="keyword-badge keyword-badge--slug" data-testid="slug-badge">{{ article.suggestedSlug }}</span>
          <ProposedArticleSliderNav
            :current-index="currentSlugIndex"
            :total="slugs.length"
            @prev="emit('select-slug', index, currentSlugIndex - 1)"
            @next="emit('select-slug', index, currentSlugIndex + 1)"
          />
        </div>
      </div>

      <div v-if="article.validatedSearchQuery" class="detail-keyword">
        <span class="keyword-label">Requête validée</span>
        <span class="keyword-badge keyword-badge--validated">{{ article.validatedSearchQuery }}</span>
      </div>

      <div v-if="article.painPoint" class="detail-pain-point">
        <span class="keyword-label">Douleur</span>
        <span class="pain-point-text">{{ article.painPoint }}</span>
      </div>

      <!-- FR-PIE-CERVEAU-OVERRIDE : dropdown radio single-select pour corriger
           l'intent éditorial généré par l'IA. La valeur alimente le 5e signal
           du Score Pertinence (FR-CAP-RELEVANCE-INTENT-SIGNAL). -->
      <div class="detail-pain-intent">
        <label :for="`pain-intent-${index}`" class="keyword-label">Intention éditoriale</label>
        <select
          :id="`pain-intent-${index}`"
          data-testid="pain-intent-select"
          class="pain-intent-select"
          :value="article.painIntentExpected ?? ''"
          @change="handlePainIntentChange"
        >
          <option value="">Non défini</option>
          <option v-for="opt in PAIN_INTENT_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <p v-if="article.rationale" class="detail-rationale">{{ article.rationale }}</p>

      <ProposedArticleActions
        position="bottom"
        :accepted="!!article.accepted"
        :actions-menu-open="actionsMenuOpen"
        :has-parents="!!availableParents?.length"
        @toggle-accept="emit('toggle-accept', index)"
        @remove="emit('remove', index)"
        @toggle-actions-menu="actionsMenuOpen = !actionsMenuOpen"
        @toggle-parent-menu="parentMenuOpen = !parentMenuOpen"
        @regenerate-title="emit('regenerate-title', index)"
        @regenerate-keyword="emit('regenerate-keyword', index)"
        @regenerate-slug="emit('regenerate-slug', index)"
      />
    </div>
  </div>
</template>

<style scoped>
.proposal-item {
  border: 1.5px solid var(--color-badge-amber-text);
  border-radius: 6px;
  background: var(--color-surface);
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}

.proposal-item.accepted {
  border-color: var(--color-badge-green-text);
}

.proposal-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* --- Header --- */
.proposal-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.625rem 0.625rem 0.5rem;
}

/* When expanded, title wraps */
.expanded .proposal-header {
  align-items: flex-start;
}

.proposal-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.proposal-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Expanded: full title, multi-line, bigger */
.expanded .proposal-title {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  line-height: 1.4;
  font-size: 0.9375rem;
  font-weight: 600;
}

/* --- Expanded details --- */
.proposal-details {
  padding: 0.25rem 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.detail-keyword {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border);
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

.keyword-badge--pilier {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.keyword-badge--inter {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.keyword-badge--spe {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

/* --- Label with edit icon --- */
.label-with-edit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.edit-icon-btn {
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
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.proposal-item:hover .edit-icon-btn {
  opacity: 0.6;
}

.edit-icon-btn:hover {
  opacity: 1 !important;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

/* --- Inline edit input --- */
.inline-edit-input {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  border: 1.5px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-background);
  outline: none;
}

.inline-edit-input--title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.inline-edit-input--slug {
  font-family: monospace;
  font-size: 0.6875rem;
}

.slug-slider {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border);
}

.detail-pain-point {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border);
}

.pain-point-text {
  font-size: 0.75rem;
  color: var(--color-text);
  line-height: 1.4;
}

.detail-pain-intent {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border);
}

.pain-intent-select {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  width: fit-content;
  min-width: 220px;
}

.pain-intent-select:hover {
  border-color: var(--color-primary, #3b82f6);
}

.pain-intent-select:focus {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 1px;
}

.detail-rationale {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-muted);
  line-height: 1.5;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border);
}

/* --- Collapsed slug --- */
.collapsed-slug {
  padding: 0 0.625rem 0.5rem;
  font-size: 0.6875rem;
  font-family: monospace;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.7;
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

</style>
