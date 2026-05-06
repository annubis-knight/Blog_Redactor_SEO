<script setup lang="ts">
import { ref } from 'vue'
import ProposedArticleRow from '@/components/strategy/ProposedArticleRow.vue'
import AddArticleMenu from '@/components/production/AddArticleMenu.vue'
import ArticleColumn from '@/components/production/ArticleColumn.vue'
import GenerationStepper from '@/components/production/GenerationStepper.vue'
import TopicSuggestions from '@/components/production/TopicSuggestions.vue'
import type { ProposedArticle, SuggestedTopic, CompositionCheckResult } from '@shared/types/index.js'
import type { ArticleType } from '@shared/types/article.types.js'
import type { PainIntentExpected } from '@shared/types/scoring.types.js'

export type GenerationPhase = 'idle' | 'structure' | 'paa-queries' | 'paa-fetch' | 'specialises' | 'done' | 'error'

interface ArticleColumnInfo {
  tooltip?: string
  articles: Array<ProposedArticle & { originalIndex: number }>
}

interface SpecGroup {
  parentTitle: string
  color: string
  articles: Array<ProposedArticle & { originalIndex: number }>
}

interface ArticleWarning {
  type: string
  message: string
}

defineProps<{
  articleColumns: ArticleColumnInfo[]
  groupedSpecArticles: SpecGroup[]
  compositionResults: Map<number, CompositionCheckResult>
  articleWarnings: Map<number, ArticleWarning[]>
  intermediateTitles: string[]
  globalWarnings: ArticleWarning[]
  truncationWarning: string | null
  generationWarning: string | null
  generationPhase: GenerationPhase
  addingArticleType: ArticleType | null
  topicsLoading: boolean
  topicsError: string | null
  proposedArticlesCount: number
  suggestedTopics: SuggestedTopic[]
  topicsUserContext: string
}>()

const emit = defineEmits<{
  (e: 'generate-proposals'): void
  (e: 'validate-articles'): void
  (e: 'toggle-topic', index: number): void
  (e: 'remove-topic', index: number): void
  (e: 'add-topic', topic: string): void
  (e: 'regenerate-topics'): void
  (e: 'update:user-context', ctx: string): void
  (e: 'add-empty', type: ArticleType): void
  (e: 'add-smart', type: ArticleType, hint?: string): void
  (e: 'remove-proposed', index: number): void
  (e: 'toggle-accept', index: number): void
  (e: 'regenerate-title', index: number): void
  (e: 'select-title', articleIndex: number, titleIndex: number): void
  (e: 'regenerate-keyword', index: number): void
  (e: 'select-keyword', articleIndex: number, keywordIndex: number): void
  (e: 'regenerate-slug', index: number): void
  (e: 'select-slug', articleIndex: number, slugIndex: number): void
  (e: 'change-parent', index: number, parentTitle: string): void
  (e: 'edit-title', index: number, value: string): void
  (e: 'edit-keyword', index: number, value: string): void
  (e: 'edit-slug', index: number, value: string): void
  (e: 'update-pain-intent', index: number, value: PainIntentExpected | null): void
}>()

const articleSlide = ref(0)
const columnsTrackRef = ref<HTMLElement>()

function scrollToSlide(n: number) {
  articleSlide.value = n
  const el = columnsTrackRef.value
  if (!el || typeof el.scrollTo !== 'function') return
  if (n === 0) {
    el.scrollTo({ left: 0, behavior: 'smooth' })
  } else {
    const cols = el.querySelectorAll('.article-column')
    if (cols[1]) {
      el.scrollTo({ left: (cols[1] as HTMLElement).offsetLeft, behavior: 'smooth' })
    }
  }
}

function onColumnsScroll() {
  const el = columnsTrackRef.value
  if (!el) return
  const maxScroll = el.scrollWidth - el.clientWidth
  articleSlide.value = el.scrollLeft > maxScroll * 0.3 ? 1 : 0
}

const INTERACTIVE_SELECTOR = 'a,button,input,textarea,select,[role="button"]'
const isDragging = ref(false)
let dragStartX = 0
let dragScrollLeft = 0

function onDragStart(e: MouseEvent) {
  if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
  const el = columnsTrackRef.value
  if (!el) return
  isDragging.value = true
  dragStartX = e.pageX - el.offsetLeft
  dragScrollLeft = el.scrollLeft
  el.style.scrollBehavior = 'auto'
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  const el = columnsTrackRef.value
  if (!el) return
  e.preventDefault()
  const x = e.pageX - el.offsetLeft
  el.scrollLeft = dragScrollLeft - (x - dragStartX)
}

function onDragEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  const el = columnsTrackRef.value
  if (!el) return
  el.style.scrollBehavior = 'smooth'
  const maxScroll = el.scrollWidth - el.clientWidth
  scrollToSlide(el.scrollLeft > maxScroll * 0.3 ? 1 : 0)
}

function isProcessing(phase: GenerationPhase): boolean {
  return phase !== 'idle' && phase !== 'done' && phase !== 'error'
}
</script>

<template>
  <div class="article-proposal-wrapper">
    <div class="brain-step-content article-proposal">
      <div class="step-header-row">
        <div class="step-header-text">
          <h3 class="step-title">Proposition d'articles</h3>
          <p class="step-desc">
            En se basant sur vos réponses stratégiques, Claude peut proposer une liste
            d'articles pour ce cocon avec leur type (Pilier, Intermédiaire, Spécialisé).
          </p>
        </div>
        <div class="step-header-actions">
          <button class="btn-generate"
            :disabled="isProcessing(generationPhase)"
            @click="emit('generate-proposals')">
            {{ isProcessing(generationPhase) ? 'Génération...' : 'Générer avec Claude' }}
          </button>
          <div class="swiper-nav">
            <button class="swiper-arrow" :disabled="articleSlide === 0" @click="scrollToSlide(0)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="swiper-arrow" :disabled="articleSlide === 1" @click="scrollToSlide(1)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <TopicSuggestions
        :topics="suggestedTopics"
        :user-context="topicsUserContext"
        :loading="topicsLoading"
        :error="topicsError"
        :initially-collapsed="true"
        @toggle="(index: number) => emit('toggle-topic', index)"
        @remove="(index: number) => emit('remove-topic', index)"
        @add="(topic: string) => emit('add-topic', topic)"
        @regenerate="emit('regenerate-topics')"
        @update:user-context="(ctx: string) => emit('update:user-context', ctx)"
      />

      <GenerationStepper :phase="generationPhase" />

      <div v-if="generationPhase === 'error'" class="truncation-warning">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2" />
          <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        Erreur lors de la génération des articles. Réessayez.
      </div>

      <div v-if="generationWarning" class="truncation-warning">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        {{ generationWarning }}
      </div>

      <div v-if="truncationWarning" class="truncation-warning">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        {{ truncationWarning }}
      </div>

      <div v-if="globalWarnings.length > 0" class="structural-warnings" data-testid="structural-warnings">
        <div v-for="(w, wi) in globalWarnings" :key="wi" class="structural-warning-item">
          <span class="structural-warning-icon">&#9888;</span>
          <span>{{ w.message }}</span>
        </div>
      </div>

      <div class="article-columns">
        <div ref="columnsTrackRef" class="article-columns-track" :class="{ 'is-dragging': isDragging }"
          @scroll="onColumnsScroll" @mousedown="onDragStart" @mousemove="onDragMove"
          @mouseup="onDragEnd" @mouseleave="onDragEnd">
          <ArticleColumn
            label="Pilier"
            header-class="col-pilier"
            :tooltip="articleColumns[0]?.tooltip"
            :count="articleColumns[0]?.articles.length ?? 0"
            :peek="articleSlide === 1"
            @click-peek="scrollToSlide(0)"
          >
            <ProposedArticleRow v-for="article in articleColumns[0]?.articles ?? []" :key="article.originalIndex"
              :article="article" :index="article.originalIndex"
              :composition-result="compositionResults.get(article.originalIndex) ?? null"
              :structural-warnings="articleWarnings.get(article.originalIndex) ?? []"
              @regenerate-title="(i: number) => emit('regenerate-title', i)"
              @regenerate-keyword="(i: number) => emit('regenerate-keyword', i)"
              @regenerate-slug="(i: number) => emit('regenerate-slug', i)"
              @select-keyword="(i: number, kIdx: number) => emit('select-keyword', i, kIdx)"
              @select-title="(i: number, tIdx: number) => emit('select-title', i, tIdx)"
              @select-slug="(i: number, sIdx: number) => emit('select-slug', i, sIdx)"
              @toggle-accept="(i: number) => emit('toggle-accept', i)"
              @remove="(i: number) => emit('remove-proposed', i)"
              @edit-title="(i: number, v: string) => emit('edit-title', i, v)"
              @edit-keyword="(i: number, v: string) => emit('edit-keyword', i, v)"
              @edit-slug="(i: number, v: string) => emit('edit-slug', i, v)"
              @update:pain-intent-expected="(v: PainIntentExpected | null) => emit('update-pain-intent', article.originalIndex, v)" />
            <AddArticleMenu
              :is-loading="addingArticleType === 'Pilier'"
              :disabled="addingArticleType !== null"
              label="+ Ajouter un pilier"
              @add-empty="emit('add-empty', 'Pilier')"
              @add-smart="emit('add-smart', 'Pilier')"
              @add-guided="(hint: string) => emit('add-smart', 'Pilier', hint)"
            />
          </ArticleColumn>

          <ArticleColumn
            label="Intermédiaire"
            header-class="col-inter"
            :tooltip="articleColumns[1]?.tooltip"
            :count="articleColumns[1]?.articles.length ?? 0"
          >
            <ProposedArticleRow v-for="article in articleColumns[1]?.articles ?? []" :key="article.originalIndex"
              :article="article" :index="article.originalIndex"
              :composition-result="compositionResults.get(article.originalIndex) ?? null"
              :structural-warnings="articleWarnings.get(article.originalIndex) ?? []"
              @regenerate-title="(i: number) => emit('regenerate-title', i)"
              @regenerate-keyword="(i: number) => emit('regenerate-keyword', i)"
              @regenerate-slug="(i: number) => emit('regenerate-slug', i)"
              @select-keyword="(i: number, kIdx: number) => emit('select-keyword', i, kIdx)"
              @select-title="(i: number, tIdx: number) => emit('select-title', i, tIdx)"
              @select-slug="(i: number, sIdx: number) => emit('select-slug', i, sIdx)"
              @toggle-accept="(i: number) => emit('toggle-accept', i)"
              @remove="(i: number) => emit('remove-proposed', i)"
              @edit-title="(i: number, v: string) => emit('edit-title', i, v)"
              @edit-keyword="(i: number, v: string) => emit('edit-keyword', i, v)"
              @edit-slug="(i: number, v: string) => emit('edit-slug', i, v)"
              @update:pain-intent-expected="(v: PainIntentExpected | null) => emit('update-pain-intent', article.originalIndex, v)" />
            <AddArticleMenu
              :is-loading="addingArticleType === 'Intermédiaire'"
              :disabled="addingArticleType !== null"
              label="+ Ajouter un intermédiaire"
              @add-empty="emit('add-empty', 'Intermédiaire')"
              @add-smart="emit('add-smart', 'Intermédiaire')"
              @add-guided="(hint: string) => emit('add-smart', 'Intermédiaire', hint)"
            />
          </ArticleColumn>

          <ArticleColumn
            label="Spécialisé"
            header-class="col-spec"
            :tooltip="articleColumns[2]?.tooltip"
            :count="articleColumns[2]?.articles.length ?? 0"
            :peek="articleSlide === 0"
            @click-peek="scrollToSlide(1)"
          >
            <div v-for="group in groupedSpecArticles" :key="group.parentTitle" class="spec-group"
              :class="{ 'spec-group--orphan': group.parentTitle === 'Non rattachés' }">
              <div class="spec-group-header">
                <span class="spec-group-dot" :style="{ background: group.color }"></span>
                <span class="spec-group-label">{{ group.parentTitle.length > 40 ? group.parentTitle.slice(0, 40) + '…' : group.parentTitle }}</span>
              </div>
              <ProposedArticleRow v-for="article in group.articles" :key="article.originalIndex" :article="article"
                :index="article.originalIndex"
                :composition-result="compositionResults.get(article.originalIndex) ?? null"
                :structural-warnings="articleWarnings.get(article.originalIndex) ?? []"
                :available-parents="intermediateTitles"
                @regenerate-title="(i: number) => emit('regenerate-title', i)"
                @regenerate-keyword="(i: number) => emit('regenerate-keyword', i)"
                @regenerate-slug="(i: number) => emit('regenerate-slug', i)"
                @select-keyword="(i: number, kIdx: number) => emit('select-keyword', i, kIdx)"
                @select-title="(i: number, tIdx: number) => emit('select-title', i, tIdx)"
                @select-slug="(i: number, sIdx: number) => emit('select-slug', i, sIdx)"
                @toggle-accept="(i: number) => emit('toggle-accept', i)"
                @remove="(i: number) => emit('remove-proposed', i)"
                @change-parent="(i: number, p: string) => emit('change-parent', i, p)"
                @edit-title="(i: number, v: string) => emit('edit-title', i, v)"
                @edit-keyword="(i: number, v: string) => emit('edit-keyword', i, v)"
                @edit-slug="(i: number, v: string) => emit('edit-slug', i, v)"
                @update:pain-intent-expected="(v: PainIntentExpected | null) => emit('update-pain-intent', article.originalIndex, v)" />
            </div>
            <AddArticleMenu
              :is-loading="addingArticleType === 'Spécialisé'"
              :disabled="addingArticleType !== null"
              label="+ Ajouter un spécialisé"
              @add-empty="emit('add-empty', 'Spécialisé')"
              @add-smart="emit('add-smart', 'Spécialisé')"
              @add-guided="(hint: string) => emit('add-smart', 'Spécialisé', hint)"
            />
          </ArticleColumn>
        </div>
      </div>

      <div v-if="proposedArticlesCount > 0" class="article-actions">
        <button class="btn btn-primary" @click="emit('validate-articles')">
          Tout valider
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brain-step-content {
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.truncation-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.step-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.step-header-text {
  flex: 1;
  min-width: 0;
}

.step-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.375rem;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.btn-generate {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.btn-generate:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.article-columns {
  position: relative;
  margin-bottom: 1rem;
}

.article-columns-track {
  display: flex;
  gap: 1.25rem;
  align-items: start;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.article-columns-track::-webkit-scrollbar {
  display: none;
}

.article-columns-track::after {
  content: '';
  flex: 0 0 calc(50% - 2rem);
}

.structural-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
  font-size: 0.8125rem;
}

.structural-warning-item {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.structural-warning-icon {
  flex-shrink: 0;
  font-size: 0.75rem;
}

.spec-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spec-group+.spec-group {
  margin-top: 0.75rem;
}

.spec-group--orphan .spec-group-header {
  border-style: dashed;
}

.spec-group-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
}

.spec-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.spec-group-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.article-columns-track.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
  user-select: none;
}

.article-columns-track:not(.is-dragging) {
  cursor: grab;
}

.article-proposal-wrapper {
  display: flex;
  flex-direction: column;
}

.swiper-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.swiper-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
}

.swiper-arrow:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.swiper-arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

@media (max-width: 900px) {
  .step-header-row {
    flex-direction: column;
  }

  .step-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .article-columns-track {
    flex-direction: column;
    overflow-x: visible;
    scroll-snap-type: none;
  }

  .article-columns-track::after {
    display: none;
  }

  .swiper-nav {
    display: none;
  }
}
</style>
