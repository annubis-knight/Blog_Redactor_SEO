<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ThemeContext } from '@shared/types/index.js'

const props = defineProps<{
  themeName?: string
  themeDescription?: string
  siloName: string
  siloDescription?: string
  cocoonName: string
  cocoonArticles?: string[]
  articleTitle?: string
  previousAnswers?: Record<string, string>
  cocoonStrategy?: Record<string, string>
  themeConfig?: ThemeContext['themeConfig']
}>()

const isContextOpen = ref(false)
const isArticlesOpen = ref(false)

const STEP_LABELS: Record<string, string> = {
  cible: 'Cible',
  douleur: 'Douleur',
  aiguillage: 'Aiguillage',
  angle: 'Angle',
  promesse: 'Promesse',
  cta: 'CTA',
}

const TYPE_ORDER = ['Pilier', 'Intermédiaire', 'Spécialisé'] as const

interface ParsedArticle {
  title: string
  type: string
}

function parseArticle(raw: string): ParsedArticle {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (match) return { title: match[1]!, type: match[2]! }
  return { title: raw, type: 'Autre' }
}

const articlesByType = computed(() => {
  if (!props.cocoonArticles?.length) return []
  const parsed = props.cocoonArticles.map(parseArticle)
  const groups: { type: string; articles: ParsedArticle[] }[] = []
  for (const type of TYPE_ORDER) {
    const matching = parsed.filter(a => a.type === type)
    if (matching.length) groups.push({ type, articles: matching })
  }
  // Catch any types not in TYPE_ORDER
  const known = new Set(TYPE_ORDER as readonly string[])
  const other = parsed.filter(a => !known.has(a.type))
  if (other.length) groups.push({ type: 'Autre', articles: other })
  return groups
})
</script>

<template>
  <div class="context-recap-group">
    <!-- Panel 1: Contexte stratégique -->
    <div class="context-recap">
      <button class="recap-toggle" :aria-expanded="isContextOpen" @click="isContextOpen = !isContextOpen">
        <svg
          class="recap-chevron"
          :class="{ open: isContextOpen }"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="recap-toggle-label">Contexte envoy&eacute; &agrave; Claude</span>
      </button>

      <div class="recap-body" :class="{ collapsed: !isContextOpen }">
        <!-- Theme -->
        <div v-if="themeName" class="recap-section">
          <span class="recap-key">Th&egrave;me</span>
          <span class="recap-val">{{ themeName }}</span>
          <p v-if="themeDescription" class="recap-desc">{{ themeDescription }}</p>
        </div>

        <!-- ThemeConfig: Entreprise -->
        <div v-if="themeConfig && (themeConfig.mainPromise || themeConfig.services?.length || themeConfig.location)" class="recap-section recap-indent recap-perspective recap-perspective--business">
          <span class="recap-perspective-label">Entreprise</span>
          <div v-if="themeConfig.mainPromise" class="recap-line">
            <span class="recap-key-sm">Promesse</span>
            <span class="recap-val-sm">{{ themeConfig.mainPromise }}</span>
          </div>
          <div v-if="themeConfig.location" class="recap-line">
            <span class="recap-key-sm">Lieu</span>
            <span class="recap-val-sm">{{ themeConfig.location }}</span>
          </div>
          <div v-if="themeConfig.differentiators?.length" class="recap-line">
            <span class="recap-key-sm">Diff&eacute;renc.</span>
            <span class="recap-val-sm">{{ themeConfig.differentiators.join(', ') }}</span>
          </div>
          <div v-if="themeConfig.services?.length" class="recap-line">
            <span class="recap-key-sm">Services</span>
            <span class="recap-val-sm">{{ themeConfig.services.join(', ') }}</span>
          </div>
          <div v-if="themeConfig.mainCTA" class="recap-line">
            <span class="recap-key-sm">CTA</span>
            <span class="recap-val-sm">{{ themeConfig.mainCTA }}</span>
          </div>
        </div>

        <!-- ThemeConfig: Client type -->
        <div v-if="themeConfig && (themeConfig.targetAudience || themeConfig.sector || themeConfig.painPoints?.length)" class="recap-section recap-indent recap-perspective recap-perspective--client">
          <span class="recap-perspective-label">Client type</span>
          <div v-if="themeConfig.targetAudience" class="recap-line">
            <span class="recap-key-sm">Audience</span>
            <span class="recap-val-sm">{{ themeConfig.targetAudience }}</span>
          </div>
          <div v-if="themeConfig.sector" class="recap-line">
            <span class="recap-key-sm">Secteur</span>
            <span class="recap-val-sm">{{ themeConfig.sector }}</span>
          </div>
          <div v-if="themeConfig.companySize" class="recap-line">
            <span class="recap-key-sm">Taille</span>
            <span class="recap-val-sm">{{ themeConfig.companySize }}</span>
          </div>
          <div v-if="themeConfig.budget" class="recap-line">
            <span class="recap-key-sm">Budget</span>
            <span class="recap-val-sm">{{ themeConfig.budget }}</span>
          </div>
          <div v-if="themeConfig.digitalMaturity" class="recap-line">
            <span class="recap-key-sm">Maturit&eacute;</span>
            <span class="recap-val-sm">{{ themeConfig.digitalMaturity }}</span>
          </div>
          <div v-if="themeConfig.painPoints?.length" class="recap-line">
            <span class="recap-key-sm">Douleurs</span>
            <span class="recap-val-sm">{{ themeConfig.painPoints.join(', ') }}</span>
          </div>
        </div>

        <!-- ThemeConfig: Communication -->
        <div v-if="themeConfig && (themeConfig.toneStyle || themeConfig.vocabulary?.length)" class="recap-section recap-indent recap-perspective recap-perspective--communication">
          <span class="recap-perspective-label">Communication</span>
          <div v-if="themeConfig.toneStyle" class="recap-line">
            <span class="recap-key-sm">Ton</span>
            <span class="recap-val-sm">{{ themeConfig.toneStyle }}</span>
          </div>
          <div v-if="themeConfig.vocabulary?.length" class="recap-line">
            <span class="recap-key-sm">Vocable</span>
            <span class="recap-val-sm">{{ themeConfig.vocabulary.join(', ') }}</span>
          </div>
        </div>

        <!-- Silo -->
        <div class="recap-section">
          <span class="recap-key">Silo</span>
          <span class="recap-val">{{ siloName }}</span>
          <p v-if="siloDescription" class="recap-desc">{{ siloDescription }}</p>
        </div>

        <!-- Cocoon -->
        <div class="recap-section">
          <span class="recap-key">Cocon</span>
          <span class="recap-val">{{ cocoonName }}</span>
        </div>

        <!-- Cocoon strategy (article-level only) -->
        <div v-if="cocoonStrategy && Object.keys(cocoonStrategy).length" class="recap-section recap-indent">
          <span class="recap-key-sm">Strat&eacute;gie cocon valid&eacute;e</span>
          <div v-for="(answer, step) in cocoonStrategy" :key="step" class="recap-line">
            <span class="recap-key-sm">{{ STEP_LABELS[step] ?? step }}</span>
            <span class="recap-val-sm">{{ answer }}</span>
          </div>
        </div>

        <!-- Article (article-level only) -->
        <div v-if="articleTitle" class="recap-section">
          <span class="recap-key">Article</span>
          <span class="recap-val">{{ articleTitle }}</span>
        </div>

        <!-- Previous answers (cascading) -->
        <div v-if="previousAnswers && Object.keys(previousAnswers).length" class="recap-section">
          <span class="recap-key">&Eacute;tapes valid&eacute;es</span>
          <div v-for="(answer, step) in previousAnswers" :key="step" class="recap-line recap-indent">
            <span class="recap-key-sm">{{ STEP_LABELS[step] ?? step }}</span>
            <span class="recap-val-sm">{{ answer }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel 2: Articles du cocon -->
    <div v-if="cocoonArticles?.length" class="context-recap">
      <button class="recap-toggle" :aria-expanded="isArticlesOpen" @click="isArticlesOpen = !isArticlesOpen">
        <svg
          class="recap-chevron"
          :class="{ open: isArticlesOpen }"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="recap-toggle-label">Articles du cocon ({{ cocoonArticles.length }})</span>
      </button>

      <div class="recap-body" :class="{ collapsed: !isArticlesOpen }">
        <div v-for="group in articlesByType" :key="group.type" class="tree-group">
          <div class="tree-type">
            <span class="tree-type-badge" :class="'tree-type--' + group.type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')">
              {{ group.type }}
            </span>
            <span class="tree-type-count">({{ group.articles.length }})</span>
          </div>
          <div class="tree-articles">
            <div v-for="art in group.articles" :key="art.title" class="tree-article">
              <span class="tree-branch" aria-hidden="true"></span>
              <span class="tree-article-title">{{ art.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-recap-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.context-recap {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-soft);
  overflow: hidden;
}

.recap-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: left;
  transition: color 0.15s;
}

.recap-toggle:hover {
  color: var(--color-primary);
}

.recap-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: inherit;
}

.recap-chevron.open {
  transform: rotate(90deg);
}

.recap-toggle-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.recap-body {
  height: auto;
  overflow: hidden;
  transition: height 0.25s ease, opacity 0.2s ease;
  opacity: 1;
  padding: 0 0.75rem 0.625rem;
  interpolate-size: allow-keywords;
}

.recap-body.collapsed {
  height: 0;
  opacity: 0;
  padding-bottom: 0;
}

.recap-section {
  padding: 0.25rem 0;
}

.recap-section + .recap-section {
  border-top: 1px solid var(--color-border);
}

.recap-indent {
  padding-left: 0.75rem;
  border-top: none !important;
}

.recap-indent + .recap-section:not(.recap-indent) {
  border-top: 1px solid var(--color-border);
}

.recap-key {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-right: 0.375rem;
}

.recap-val {
  font-size: 0.75rem;
  color: var(--color-text);
}

.recap-desc {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin: 0.125rem 0 0;
  font-style: italic;
  line-height: 1.4;
}

.recap-line {
  display: flex;
  gap: 0.375rem;
  align-items: baseline;
  padding: 0.125rem 0;
}

.recap-key-sm {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  min-width: 4rem;
}

.recap-val-sm {
  font-size: 0.6875rem;
  color: var(--color-text);
  line-height: 1.4;
}

/* Perspective sub-sections */
.recap-perspective {
  border-left: 3px solid var(--color-border);
  padding-left: 0.625rem;
  margin-top: 0.25rem;
}

.recap-perspective--business {
  border-left-color: var(--color-primary, #4a90d9);
}

.recap-perspective--client {
  border-left-color: var(--color-warning, #e8a838);
}

.recap-perspective--communication {
  border-left-color: var(--color-success, #4caf50);
}

.recap-perspective-label {
  display: inline-block;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.125rem;
}

.recap-perspective--business .recap-perspective-label {
  color: var(--color-primary, #4a90d9);
}

.recap-perspective--client .recap-perspective-label {
  color: var(--color-warning, #e8a838);
}

.recap-perspective--communication .recap-perspective-label {
  color: var(--color-success, #4caf50);
}

/* Tree: articles grouped by type */
.tree-group {
  padding: 0.375rem 0;
}

.tree-group + .tree-group {
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

.tree-type--autre {
  background: var(--color-bg-elevated, #666);
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

.tree-article {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0;
}

.tree-branch {
  display: inline-block;
  width: 0.625rem;
  height: 1px;
  background: var(--color-border);
  flex-shrink: 0;
}

.tree-article-title {
  font-size: 0.6875rem;
  color: var(--color-text);
  line-height: 1.4;
}
</style>
