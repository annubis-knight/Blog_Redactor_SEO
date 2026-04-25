<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { apiPatch } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { SelectedArticle } from '@shared/types/index.js'
import RecapToggle from '@/components/shared/RecapToggle.vue'
import {
  MOTEUR_DISCOVERY_DONE,
  MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
} from '@shared/constants/workflow-checks.constants.js'

const props = defineProps<{
  article: SelectedArticle
}>()

const emit = defineEmits<{
  (e: 'title-updated', payload: { id: number; title: string }): void
}>()

const progressStore = useArticleProgressStore()

const progress = computed(() => progressStore.getProgress(props.article.id))

// --- Inline title editing ---
const editableTitle = ref(props.article.title)

watch(() => props.article.title, (t) => { editableTitle.value = t })

async function saveTitle() {
  const trimmed = editableTitle.value.trim()
  if (!trimmed || trimmed === props.article.title) {
    editableTitle.value = props.article.title
    return
  }
  try {
    await apiPatch(`/articles/${props.article.id}`, { title: trimmed })
    emit('title-updated', { id: props.article.id, title: trimmed })
    log.info('[SelectedArticlePanel] Title updated', { id: props.article.id, title: trimmed })
  } catch {
    editableTitle.value = props.article.title
  }
}

const PHASE_LABELS: Record<string, string> = {
  proposed: 'Proposé',
  moteur: 'Moteur',
  redaction: 'Rédaction',
  published: 'Publié',
}

const CHECK_LABELS: Record<string, string> = {
  [MOTEUR_DISCOVERY_DONE]: 'Discovery',
  [MOTEUR_RADAR_DONE]: 'Radar',
  [MOTEUR_CAPITAINE_LOCKED]: 'Capitaine',
  [MOTEUR_LIEUTENANTS_LOCKED]: 'Lieutenants',
  [MOTEUR_LEXIQUE_VALIDATED]: 'Lexique',
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

watch(() => props.article.id, async (id) => {
  await progressStore.fetchProgress(id)
}, { immediate: true })
</script>

<template>
  <RecapToggle panel-id="selected-article" variant="panel" class="selected-article-panel">
    <template #header>
      <input v-if="!article.locked" v-model="editableTitle"
        class="panel-title-input" @blur="saveTitle" @keydown.enter="($event.target as HTMLInputElement).blur()" />
      <span v-else class="panel-toggle-label">{{ article.title }}</span>
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
    </template>

    <template #between>
      <!-- Pain point — always visible -->
      <div v-if="article.painPoint" class="panel-pain-bar">
        <span class="pain-bar-label">Douleur</span>
        <span class="pain-bar-text">{{ article.painPoint }}</span>
      </div>
    </template>

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
  </RecapToggle>
</template>

<style scoped>
.selected-article-panel {
  margin: 0.5rem 0;
}

.panel-toggle-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-title-input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--color-border);
  color: var(--color-text);
  padding: 0;
  outline: none;
}
.panel-title-input:focus {
  border-bottom-color: var(--color-primary);
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

.panel-section {
  padding: 0.5rem 0;
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
</style>
