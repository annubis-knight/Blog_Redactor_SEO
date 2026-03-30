<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useArticleProgressStore } from '@/stores/article-progress.store'
import type { SelectedArticle, SemanticTerm } from '@shared/types/index.js'

const props = defineProps<{
  article: SelectedArticle
}>()

const progressStore = useArticleProgressStore()
const isPanelOpen = ref(true)
const newTerm = ref('')
const newTermSource = ref<SemanticTerm['source']>('manual')

const progress = computed(() => progressStore.getProgress(props.article.slug))
const semanticField = computed(() => progressStore.getSemanticField(props.article.slug))

const PHASE_LABELS: Record<string, string> = {
  proposed: 'Proposé',
  moteur: 'Moteur',
  redaction: 'Rédaction',
  published: 'Publié',
}

const CHECK_LABELS: Record<string, string> = {
  'intent-analyzed': 'Intention analysée',
  'local-checked': 'Local vérifié',
  'competitors-analyzed': 'Concurrents analysés',
  'keywords-assigned': 'Mots-clés assignés',
  'keywords-audited': 'Mots-clés audités',
  'strategy-done': 'Stratégie terminée',
  'brief-generated': 'Brief généré',
  'outline-validated': 'Plan validé',
  'article-generated': 'Article généré',
  'seo-ok': 'SEO validé',
  'geo-ok': 'GEO validé',
}

const sortedTerms = computed(() =>
  [...semanticField.value].sort((a, b) => b.targetCount - a.targetCount),
)

watch(() => props.article.slug, async (slug) => {
  await Promise.all([
    progressStore.fetchProgress(slug),
    progressStore.fetchSemanticField(slug),
  ])
}, { immediate: true })

async function addTerm() {
  const term = newTerm.value.trim()
  if (!term || props.article.locked) return
  await progressStore.addSemanticTerms(props.article.slug, [{
    term,
    source: newTermSource.value,
    occurrences: 0,
    targetCount: 1,
  }])
  newTerm.value = ''
}

async function removeTerm(term: string) {
  if (props.article.locked) return
  const updated = semanticField.value.filter(t => t.term !== term)
  await progressStore.saveSemanticField(props.article.slug, updated)
}

async function updateTargetCount(term: string, count: number) {
  if (props.article.locked) return
  const updated = semanticField.value.map(t =>
    t.term === term ? { ...t, targetCount: Math.max(0, count) } : t,
  )
  await progressStore.saveSemanticField(props.article.slug, updated)
}

function getSourceLabel(source: SemanticTerm['source']): string {
  const labels: Record<string, string> = {
    competitor: 'Concurrent',
    dataforseo: 'DataForSEO',
    autocomplete: 'Autocomplete',
    paa: 'PAA',
    manual: 'Manuel',
  }
  return labels[source] ?? source
}
</script>

<template>
  <div class="selected-article-panel">
    <button class="panel-toggle" :aria-expanded="isPanelOpen" @click="isPanelOpen = !isPanelOpen">
      <svg class="panel-chevron" :class="{ open: isPanelOpen }" width="12" height="12" viewBox="0 0 16 16" fill="none"
        aria-hidden="true">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
      <span class="panel-toggle-label">{{ article.title }}</span>
      <span class="panel-type-badge"
        :class="'badge--' + article.type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')">
        {{ article.type }}
      </span>
      <span v-if="article.keyword" class="panel-keyword-badge">{{ article.keyword }}</span>
      <span v-if="article.locked" class="panel-locked-badge">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2" />
          <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        Lecture seule
      </span>
    </button>

    <!-- Pain point — always visible -->
    <div v-if="article.painPoint" class="panel-pain-bar">
      <span class="pain-bar-label">Douleur</span>
      <span class="pain-bar-text">{{ article.painPoint }}</span>
    </div>

    <div class="panel-body" :class="{ collapsed: !isPanelOpen }">
      <!-- Progression -->
      <div class="panel-section">
        <span class="section-label">Progression</span>
        <div class="progress-row">
          <span v-if="progress" class="phase-badge" :class="'phase--' + progress.phase">
            {{ PHASE_LABELS[progress.phase] ?? progress.phase }}
          </span>
          <span v-else class="phase-badge phase--proposed">Proposé</span>
        </div>
        <div v-if="progress?.completedChecks.length" class="checks-row">
          <span v-for="check in progress.completedChecks" :key="check" class="check-chip">
            {{ CHECK_LABELS[check] ?? check }}
          </span>
        </div>
        <p v-else class="empty-hint">Aucune étape validée</p>
      </div>

      <!-- Champ sémantique -->
      <div class="panel-section">
        <div class="section-header">
          <span class="section-label">Champ sémantique ({{ semanticField.length }})</span>
        </div>

        <div v-if="sortedTerms.length > 0" class="semantic-table">
          <div class="semantic-header-row">
            <span class="sem-col-term">Terme</span>
            <span class="sem-col-source">Source</span>
            <span class="sem-col-occ">Occ.</span>
            <span class="sem-col-target">Cible</span>
            <span v-if="!article.locked" class="sem-col-actions"></span>
          </div>
          <div v-for="term in sortedTerms" :key="term.term" class="semantic-row">
            <span class="sem-col-term">{{ term.term }}</span>
            <span class="sem-col-source sem-source-badge">{{ getSourceLabel(term.source) }}</span>
            <span class="sem-col-occ">{{ term.occurrences }}</span>
            <span class="sem-col-target">
              <template v-if="article.locked">{{ term.targetCount }}</template>
              <input v-else type="number" class="target-input" :value="term.targetCount" min="0"
                @change="updateTargetCount(term.term, Number(($event.target as HTMLInputElement).value))" />
            </span>
            <span v-if="!article.locked" class="sem-col-actions">
              <button class="btn-remove-term" @click="removeTerm(term.term)" title="Supprimer">
                &times;
              </button>
            </span>
          </div>
        </div>

        <p v-else class="empty-hint">Aucun terme — enrichissez via les onglets ou ajoutez manuellement</p>

        <!-- Add term form -->
        <div v-if="!article.locked" class="add-term-row">
          <input v-model="newTerm" type="text" class="add-term-input" placeholder="Nouveau terme..."
            @keydown.enter="addTerm" />
          <select v-model="newTermSource" class="add-term-select">
            <option value="manual">Manuel</option>
            <option value="competitor">Concurrent</option>
            <option value="dataforseo">DataForSEO</option>
            <option value="autocomplete">Autocomplete</option>
            <option value="paa">PAA</option>
          </select>
          <button class="btn-add-term" @click="addTerm">+</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selected-article-panel {
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-surface);
  overflow: hidden;
  margin: 0.5rem 0;
}

.panel-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  background: var(--color-primary-soft, rgba(74, 144, 217, 0.08));
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: left;
  transition: background 0.15s;
}

.panel-toggle:hover {
  background: var(--color-primary-soft, rgba(74, 144, 217, 0.12));
}

.panel-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.panel-chevron.open {
  transform: rotate(90deg);
}

.panel-toggle-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-type-badge {
  flex-shrink: 0;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge--pilier {
  background: var(--color-primary, #4a90d9);
  color: white;
}

.badge--intermediaire {
  background: var(--color-warning, #e8a838);
  color: white;
}

.badge--specialise {
  background: var(--color-success, #4caf50);
  color: white;
}

.panel-keyword-badge {
  flex-shrink: 0;
  font-size: 0.625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.panel-locked-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-warning, #e8a838);
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.1));
}

.panel-body {
  height: auto;
  overflow: hidden;
  transition: height 0.25s ease, opacity 0.2s ease;
  opacity: 1;
  padding: 0 0.75rem 0.75rem;
  interpolate-size: allow-keywords;
}

.panel-body.collapsed {
  height: 0;
  opacity: 0;
  padding-bottom: 0;
}

.panel-section {
  padding: 0.5rem 0;
}

.panel-section+.panel-section {
  border-top: 1px solid var(--color-border);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.section-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.375rem;
  display: block;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.phase-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.phase--proposed {
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
}

.phase--moteur {
  background: var(--color-badge-blue-bg, rgba(74, 144, 217, 0.15));
  color: var(--color-badge-blue-text, #2563eb);
}

.phase--redaction {
  background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.15));
  color: var(--color-badge-amber-text, #d97706);
}

.phase--published {
  background: var(--color-badge-green-bg, rgba(76, 175, 80, 0.15));
  color: var(--color-badge-green-text, #16a34a);
}

.checks-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.check-chip {
  display: inline-block;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  font-size: 0.5625rem;
  font-weight: 500;
  background: var(--color-badge-green-bg, rgba(76, 175, 80, 0.12));
  color: var(--color-badge-green-text, #16a34a);
}

.empty-hint {
  margin: 0;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* Pain point bar — always visible */
.panel-pain-bar {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.1));
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
}

.pain-bar-label {
  flex-shrink: 0;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-badge-amber-text, #d97706);
}

.pain-bar-text {
  color: var(--color-text);
  font-style: italic;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Semantic table */
.semantic-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-size: 0.6875rem;
}

.semantic-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.semantic-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.04));
}

.semantic-row:last-child {
  border-bottom: none;
}

.sem-col-term {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sem-col-source {
  flex-shrink: 0;
  width: 5.5rem;
  text-align: center;
}

.sem-source-badge {
  font-size: 0.5625rem;
  padding: 0.0625rem 0.25rem;
  border-radius: 3px;
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
}

.sem-col-occ {
  flex-shrink: 0;
  width: 2rem;
  text-align: center;
}

.sem-col-target {
  flex-shrink: 0;
  width: 3rem;
  text-align: center;
}

.sem-col-actions {
  flex-shrink: 0;
  width: 1.5rem;
  text-align: center;
}

.target-input {
  width: 2.5rem;
  padding: 0.125rem 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font-size: 0.6875rem;
  text-align: center;
  background: var(--color-background);
  color: var(--color-text);
}

.target-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-remove-term {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: 3px;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
}

.btn-remove-term:hover {
  background: var(--color-error-soft, #fef2f2);
  color: var(--color-error, #dc2626);
}

/* Add term form */
.add-term-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.add-term-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.6875rem;
  background: var(--color-background);
  color: var(--color-text);
}

.add-term-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.add-term-select {
  padding: 0.25rem 0.375rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.6875rem;
  background: var(--color-background);
  color: var(--color-text);
}

.btn-add-term {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-primary-soft, rgba(74, 144, 217, 0.08));
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 700;
}

.btn-add-term:hover {
  background: var(--color-primary);
  color: white;
}
</style>
