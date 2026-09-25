<script setup lang="ts">
/**
 * Panneau des mots-clés candidats d'un nouvel article (FR-CER-KEYWORD-REAL-DATA) :
 * chaque candidat avec ses données réelles (volume, difficulté, intention, SERP),
 * un choix, un titre modifiable, puis « Créer l'article ». Un candidat non mesuré
 * ne se choisit pas : le serveur refuserait son mot-clé.
 */
import { computed, ref, useId, watch } from 'vue'
import type { ChildCandidate } from '@shared/types/cocoon-tree.types.js'
import type { PainIntentExpected } from '@shared/types/scoring.types.js'

const props = defineProps<{
  /** Ce qu'on crée, en clair : « Le pilier du cocon », « L'article de la section « X » ». */
  targetLabel: string
  candidates: ChildCandidate[]
  isProposing: boolean
  proposeError: string | null
  isCreating: boolean
  createError: string | null
}>()

const emit = defineEmits<{
  (e: 'create', candidate: ChildCandidate, title: string): void
  (e: 'retry'): void
  (e: 'close'): void
}>()

const INTENT_LABELS: Record<PainIntentExpected, string> = {
  informational: 'Informationnelle (on cherche à comprendre)',
  commercial: 'Commerciale (on compare des prestataires)',
  transactional: 'Transactionnelle (on veut acheter ou contacter)',
  navigational: 'De navigation (on cherche un site précis)',
}

const uid = useId()
const selectedKeyword = ref<string | null>(null)
const title = ref('')

const selected = computed(() => props.candidates.find(c => c.keyword === selectedKeyword.value) ?? null)
const canCreate = computed(() => !!selected.value?.metrics && title.value.trim().length >= 3 && !props.isCreating)

// Nouvelle liste : rien n'est choisi d'office.
watch(() => props.candidates, () => {
  selectedKeyword.value = null
  title.value = ''
})

// Choisir un candidat préremplit le titre avec celui qu'il propose.
watch(selected, (candidate) => {
  if (candidate) title.value = candidate.title
})

function formatVolume(volume: number | null): string {
  return volume === null ? '—' : `${new Intl.NumberFormat('fr-FR').format(volume)} recherches par mois`
}

function formatDifficulty(difficulty: number | null): string {
  return difficulty === null ? '—' : `${difficulty}/100`
}

function formatIntent(intent: PainIntentExpected | null): string {
  return intent ? INTENT_LABELS[intent] : '—'
}

function submit(): void {
  if (!canCreate.value || !selected.value) return
  emit('create', selected.value, title.value.trim())
}
</script>

<template>
  <div class="candidates-panel" data-testid="cocoon-candidates-panel">
    <div class="panel-head">
      <p class="panel-title">{{ targetLabel }}</p>
      <button type="button" class="btn-link" data-testid="candidates-close" @click="emit('close')">Annuler</button>
    </div>

    <p v-if="isProposing" class="panel-status" role="status">
      Recherche de mots-clés candidats, puis mesure de leurs données réelles (quelques secondes)…
    </p>

    <div v-else-if="proposeError" class="panel-error" role="alert">
      <span>{{ proposeError }}</span>
      <button type="button" class="btn-link" data-testid="candidates-retry" @click="emit('retry')">Relancer la proposition</button>
    </div>

    <template v-else-if="candidates.length > 0">
      <details class="panel-help" open>
        <summary>Comment lire ces chiffres ?</summary>
        <ul>
          <li><strong>Volume</strong> : combien de fois ce mot-clé est cherché par mois sur Google. Ex. 300 = environ 10 recherches par jour.</li>
          <li><strong>Difficulté</strong> : de 0 (facile) à 100 (très dur), l’effort pour apparaître en première page de Google.</li>
          <li><strong>Intention</strong> : ce que veut la personne qui tape ce mot-clé (comprendre, comparer, acheter…). L’article doit y répondre.</li>
          <li><strong>En tête de Google</strong> : les pages que Google montre aujourd’hui en premier, celles qu’il faudra dépasser.</li>
        </ul>
      </details>

      <fieldset class="candidates">
        <legend class="candidates-legend">Choisissez le mot-clé de l’article</legend>
        <label
          v-for="candidate in candidates"
          :key="candidate.keyword"
          class="candidate"
          :class="{ 'candidate--selected': selectedKeyword === candidate.keyword, 'candidate--unmeasured': !candidate.metrics }"
          data-testid="candidate"
          :data-keyword="candidate.keyword"
        >
          <input
            v-model="selectedKeyword"
            class="candidate-radio"
            type="radio"
            :name="`${uid}-candidate`"
            :value="candidate.keyword"
            :disabled="!candidate.metrics || isCreating"
          />
          <span class="candidate-body">
            <span class="candidate-keyword">{{ candidate.keyword }}</span>
            <span v-if="!candidate.metrics" class="candidate-unmeasured" data-testid="candidate-unmeasured">
              Non mesuré : ses données n’ont pas pu être récupérées, il ne peut pas être choisi.
            </span>
            <span v-else class="candidate-metrics">
              <span><span class="metric-label">Volume</span> {{ formatVolume(candidate.metrics.searchVolume) }}</span>
              <span><span class="metric-label">Difficulté</span> {{ formatDifficulty(candidate.metrics.keywordDifficulty) }}</span>
              <span><span class="metric-label">Intention</span> {{ formatIntent(candidate.metrics.intent) }}</span>
            </span>
            <span v-if="candidate.serp.length > 0" class="candidate-serp">
              <span class="metric-label">En tête de Google</span>
              <span v-for="result in candidate.serp.slice(0, 3)" :key="result.position" class="serp-row">
                {{ result.position }}. <strong>{{ result.domain }}</strong> — {{ result.title }}
              </span>
            </span>
            <span v-if="candidate.rationale" class="candidate-rationale">{{ candidate.rationale }}</span>
          </span>
        </label>
      </fieldset>

      <div class="title-field">
        <label :for="`${uid}-title`" class="title-label">Titre de l’article</label>
        <input
          :id="`${uid}-title`"
          v-model="title"
          class="title-input"
          type="text"
          maxlength="200"
          data-testid="candidate-title-input"
          :disabled="isCreating"
          :aria-describedby="`${uid}-title-hint`"
        />
        <p :id="`${uid}-title-hint`" class="title-hint">
          Prérempli par le candidat choisi, modifiable (3 caractères minimum). L’adresse de la page est tirée de ce titre.
        </p>
      </div>

      <p v-if="createError" class="panel-error" role="alert" data-testid="candidate-create-error">{{ createError }}</p>

      <div class="panel-actions">
        <button type="button" class="btn-primary" data-testid="candidate-create" :disabled="!canCreate" @click="submit">
          {{ isCreating ? 'Création…' : "Créer l'article" }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.candidates-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.875rem;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-bg-elevated);
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-heading);
}

.panel-status {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.panel-error {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  background: var(--color-error-bg);
  color: var(--color-error);
}

.panel-help {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.panel-help summary {
  cursor: pointer;
  font-weight: 500;
}

.panel-help ul {
  margin: 0.375rem 0 0;
  padding-left: 1.125rem;
  line-height: 1.5;
}

.candidates {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: none;
}

.candidates-legend {
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.candidate {
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
}

.candidate--selected {
  border-color: var(--color-primary);
  background: var(--color-badge-blue-bg);
}

.candidate--unmeasured {
  cursor: not-allowed;
  opacity: 0.75;
}

.candidate-radio {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.candidate-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.candidate-keyword {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.candidate-unmeasured {
  font-size: 0.75rem;
  color: var(--color-badge-amber-text);
}

.candidate-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  font-size: 0.75rem;
  color: var(--color-text);
}

.metric-label {
  margin-right: 0.25rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.candidate-serp {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.75rem;
  color: var(--color-text);
}

.serp-row {
  overflow-wrap: anywhere;
}

.candidate-rationale {
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-muted);
}

.title-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.title-input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-background);
}

.title-input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.title-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-link {
  padding: 0;
  border: none;
  background: none;
  font-size: 0.8125rem;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 640px) {
  .panel-actions {
    justify-content: stretch;
  }

  .panel-actions .btn-primary {
    width: 100%;
  }
}
</style>
