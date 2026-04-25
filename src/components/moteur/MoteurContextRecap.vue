<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Article, ArticleType, SelectedArticle } from '@shared/types/index.js'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import ProgressDots from './ProgressDots.vue'
import RecapToggle from '@/components/shared/RecapToggle.vue'

const progressStore = useArticleProgressStore()

const props = withDefaults(defineProps<{
  suggestedArticles: Article[]
  publishedArticles: Article[]
  selectedSlug: string | null
  capitainesMap?: Record<string, string>
  readonly?: boolean
}>(), {
  capitainesMap: () => ({}),
  readonly: false,
})

const emit = defineEmits<{
  (e: 'select', article: SelectedArticle | null): void
}>()

const TYPE_ORDER: ArticleType[] = ['Pilier', 'Intermédiaire', 'Spécialisé']

interface GroupedArticle {
  id: number; slug: string; title: string; keyword: string
  keywordLocked: boolean; type: ArticleType; source: 'proposed' | 'published'; painPoint?: string
}

interface GroupedArticles {
  type: ArticleType
  articles: GroupedArticle[]
}

const suggestedGroups = computed<GroupedArticles[]>(() => {
  const groups: GroupedArticles[] = []
  for (const type of TYPE_ORDER) {
    const matching = props.suggestedArticles
      .filter(a => a.type === type)
      .map(a => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        keyword: a.captainKeywordLocked ?? a.suggestedKeyword ?? '',
        keywordLocked: !!a.captainKeywordLocked,
        type: a.type,
        source: 'proposed' as const,
        painPoint: a.painPoint || undefined,
      }))
    if (matching.length) groups.push({ type, articles: matching })
  }
  return groups
})

const publishedGroups = computed<GroupedArticles[]>(() => {
  const groups: GroupedArticles[] = []
  for (const type of TYPE_ORDER) {
    const matching = props.publishedArticles
      .filter(a => a.type === type)
      .map(a => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        keyword: a.captainKeywordLocked ?? a.suggestedKeyword ?? '',
        keywordLocked: !!a.captainKeywordLocked,
        type: a.type,
        source: 'published' as const,
      }))
    if (matching.length) groups.push({ type, articles: matching })
  }
  return groups
})

/**
 * Unified slug → captain-keyword map built from tree articles themselves.
 * Falls back to the legacy `capitainesMap` prop for entries still only known via
 * that older fetch path (until MoteurView's separate fetch is fully retired).
 */
const unifiedCapitainesMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const g of suggestedGroups.value) for (const a of g.articles) if (a.keyword) map[a.slug] = a.keyword
  for (const g of publishedGroups.value) for (const a of g.articles) if (a.keyword) map[a.slug] = a.keyword
  for (const [slug, kw] of Object.entries(props.capitainesMap)) if (kw && !map[slug]) map[slug] = kw
  return map
})

function isSelected(slug: string): boolean {
  return props.selectedSlug === slug
}

function getChecks(id: number): string[] {
  return progressStore.getProgress(id)?.completedChecks ?? []
}

// Fetch progress for all visible articles
watch(
  [suggestedGroups, publishedGroups],
  () => {
    const allIds = [
      ...suggestedGroups.value.flatMap(g => g.articles.map(a => a.id)),
      ...publishedGroups.value.flatMap(g => g.articles.map(a => a.id)),
    ].filter(id => id > 0)
    for (const id of allIds) {
      if (!progressStore.getProgress(id)) {
        progressStore.fetchProgress(id)
      }
    }
  },
  { immediate: true },
)

function hasCannibalization(slug: string): boolean {
  const cap = unifiedCapitainesMap.value[slug]
  if (!cap) return false
  const capLower = cap.toLowerCase()
  return Object.entries(unifiedCapitainesMap.value).some(
    ([s, c]) => s !== slug && c.toLowerCase() === capLower,
  )
}

function toggleArticle(article: GroupedArticle) {
  if (props.readonly) return
  if (isSelected(article.slug)) {
    emit('select', null)
  } else {
    emit('select', {
      id: article.id,
      slug: article.slug,
      title: article.title,
      keyword: article.keyword,
      type: article.type,
      locked: article.source === 'published',
      source: article.source,
      painPoint: article.painPoint,
    })
  }
}
</script>

<template>
  <div class="moteur-recap-group">
    <!-- Panel 1: Articles suggérés -->
    <RecapToggle v-if="suggestedArticles.length > 0" panel-id="suggested-articles" :label="`Articles suggérés (${suggestedArticles.length})`">
      <div v-for="group in suggestedGroups" :key="group.type" class="tree-group">
        <div class="tree-type">
          <span class="tree-type-badge"
            :class="'tree-type--' + group.type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')">
            {{ group.type }}
          </span>
          <span class="tree-type-count">({{ group.articles.length }})</span>
        </div>
        <div class="tree-articles">
          <button v-for="art in group.articles" :key="art.slug" class="tree-article-btn"
            :class="{ selected: !readonly && isSelected(art.slug), 'is-readonly': readonly }" @click="toggleArticle(art)">
            <span class="tree-branch" aria-hidden="true"></span>
            <span class="tree-article-title">{{ art.title }}</span>
            <svg v-if="hasCannibalization(art.slug)" class="warning-cannibal" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <title>Cannibalisation : un autre article utilise le même capitaine</title>
              <path d="M8 1.5L1 14h14L8 1.5z" stroke="#f59e0b" stroke-width="1.2" fill="#fef3c7"/>
              <path d="M8 6v4M8 11.5v.5" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <ProgressDots :completed-checks="getChecks(art.id)" />
            <span v-if="art.keyword" class="tree-article-keyword" :class="{ 'is-suggested': !art.keywordLocked }">{{ art.keyword }}</span>
          </button>
        </div>
      </div>
    </RecapToggle>

    <!-- Panel 2: Articles publiés -->
    <RecapToggle v-if="publishedGroups.length > 0" panel-id="published-articles">
      <template #header>
        <span class="recap-toggle-label">Articles publiés ({{ publishedArticles.length }})</span>
        <svg class="recap-lock-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2" />
          <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </template>

      <div v-for="group in publishedGroups" :key="group.type" class="tree-group">
        <div class="tree-type">
          <span class="tree-type-badge"
            :class="'tree-type--' + group.type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')">
            {{ group.type }}
          </span>
          <span class="tree-type-count">({{ group.articles.length }})</span>
        </div>
        <div class="tree-articles">
          <button v-for="art in group.articles" :key="art.slug" class="tree-article-btn"
            :class="{ selected: !readonly && isSelected(art.slug), locked: true, 'is-readonly': readonly }" @click="toggleArticle(art)">
            <span class="tree-branch" aria-hidden="true"></span>
            <span class="tree-article-title">{{ art.title }}</span>
            <svg v-if="hasCannibalization(art.slug)" class="warning-cannibal" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <title>Cannibalisation : un autre article utilise le même capitaine</title>
              <path d="M8 1.5L1 14h14L8 1.5z" stroke="#f59e0b" stroke-width="1.2" fill="#fef3c7"/>
              <path d="M8 6v4M8 11.5v.5" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <ProgressDots :completed-checks="getChecks(art.id)" />
            <span v-if="art.keyword" class="tree-article-keyword" :class="{ 'is-suggested': !art.keywordLocked }">{{ art.keyword }}</span>
            <svg class="tree-lock" width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2" />
              <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </RecapToggle>
  </div>
</template>

<style scoped>
.moteur-recap-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem
}

.recap-toggle-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.recap-lock-icon {
  margin-left: auto;
  opacity: 0.4;
}

/* Tree: articles grouped by type */
.tree-group {
  padding: 0.375rem 0;
}

.tree-group+.tree-group {
  border-top: 1px solid var(--color-border);
}

.tree-type {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.tree-type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tree-type--pilier {
  background: var(--color-primary, #4a90d9);
  color: white;
}

.tree-type--intermediaire {
  background: var(--color-warning, #e8a838);
  color: white;
}

.tree-type--specialise {
  background: var(--color-success, #4caf50);
  color: white;
}

.tree-type-count {
  font-size: 0.625rem;
  color: var(--color-text-muted);
}

.tree-articles {
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-border);
  margin-left: 0.5rem;
}

.tree-article-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.375rem;
  margin: 0.125rem 0;
  width: 100%;
  border: none;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  font-size: 0.6875rem;
  color: var(--color-text);
  text-align: left;
  transition: background 0.15s;
}

.tree-article-btn:hover {
  background: var(--color-bg-hover, rgba(0, 0, 0, 0.04));
}

.tree-article-btn.selected {
  background: var(--color-primary-soft, rgba(74, 144, 217, 0.1));
  outline: 1px solid var(--color-primary);
}

.tree-article-btn.locked {
  opacity: 0.8;
}

.tree-branch {
  display: inline-block;
  width: 0.625rem;
  height: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}

.tree-article-title {
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-article-keyword {
  flex-shrink: 0;
  font-size: 0.5625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-lock {
  flex-shrink: 0;
  opacity: 0.4;
}

.tree-article-btn.is-readonly {
  cursor: default;
}

.tree-article-btn.is-readonly:hover {
  background: none;
}

.warning-cannibal {
  flex-shrink: 0;
}

.tree-article-keyword.is-suggested {
  border-style: dashed;
  opacity: 0.7;
}
</style>
