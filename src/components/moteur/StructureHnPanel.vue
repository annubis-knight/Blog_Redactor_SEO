<script setup lang="ts">
/**
 * StructureHnPanel — onglet « Structure » du Moteur (FR-HN-TAB, FR-HN-LOCK-GATE).
 *
 * Entre Lieutenants et Lexique : la structure H1/H2/H3 se construit à partir
 * des lieutenants RETENUS (avant C6, elle naissait avec les candidats, avant
 * tout choix — M7), de la récurrence des titres concurrents et des autres
 * articles du cocon. « Valider la structure » l'enregistre, écrit le sommaire
 * de la Rédaction et demande l'étape `moteur:hn_locked`, que la porte serveur
 * `hn-lock` accorde ou retient (alarme graduée).
 *
 * Mode `libre` : édition seule, aucune étape du parcours n'est demandée.
 */
import { computed, onMounted, ref, toRef, watch } from 'vue'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { useStructureHn } from '@/composables/moteur/useStructureHn'
import { log } from '@/utils/logger'
import LieutenantH2Structure from '@/components/moteur/LieutenantH2Structure.vue'
import { MOTEUR_HN_LOCKED } from '@shared/constants/workflow-checks.constants.js'
import type { SelectedArticle } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { ProposeLieutenantsHnNode } from '@shared/types/serp-analysis.types.js'

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  mode?: 'workflow' | 'libre'
  captainKeyword: string | null
  articleLevel: ArticleLevel | null
  cocoonSlug?: string
}>(), {
  mode: 'workflow',
  cocoonSlug: '',
})

const emit = defineEmits<{
  (e: 'check-completed', check: string): void
  (e: 'check-removed', check: string): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()

const {
  structure, dirty, lockedLieutenants,
  serpResultsByKeyword, recurrence, isLoadingCompetitors, competitorsError,
  isGenerating, generateError, isSaving, saved,
  restore, loadCompetitors, generate, save, prepareValidation,
} = useStructureHn({
  selectedArticle: toRef(props, 'selectedArticle'),
  captainKeyword: toRef(props, 'captainKeyword'),
  articleLevel: toRef(props, 'articleLevel'),
  cocoonSlug: toRef(props, 'cocoonSlug'),
  articleKeywordsStore,
  activityLog: useCostLogStore(),
})

const activeHnTab = ref('__all__')
const isValidating = ref(false)

/** Store de progression lu à la demande : les tests qui montent le panneau sans lui ne tombent pas. */
function hasStructureCheck(): boolean {
  const id = props.selectedArticle?.id
  if (!id) return false
  try {
    return useArticleProgressStore().getProgress(id)?.completedChecks.includes(MOTEUR_HN_LOCKED) ?? false
  } catch {
    return false
  }
}

const validated = computed(() => hasStructureCheck() && !dirty.value)
const canValidate = computed(() =>
  props.mode === 'workflow' && structure.value.length > 0 && !isGenerating.value && !isSaving.value && !isValidating.value,
)

async function handleSave(): Promise<void> {
  const wasValidated = hasStructureCheck()
  if (!(await save())) return
  // Données changées : l'étape validée ne vaut plus pour elles.
  if (wasValidated && props.mode === 'workflow') emit('check-removed', MOTEUR_HN_LOCKED)
}

async function handleGenerate(lockedHeadings: ProposeLieutenantsHnNode[]): Promise<void> {
  if (recurrence.value.length === 0) await loadCompetitors()
  await generate(lockedHeadings)
}

async function validate(): Promise<void> {
  if (!canValidate.value) return
  isValidating.value = true
  try {
    if (!(await prepareValidation())) {
      log.warn('[StructureHnPanel] structure non enregistrée : étape non demandée', { articleId: props.selectedArticle?.id })
      return
    }
    emit('check-completed', MOTEUR_HN_LOCKED)
  } finally {
    isValidating.value = false
  }
}

// Changement d'article : la copie de travail repart de la base.
watch(() => props.selectedArticle?.id, () => {
  activeHnTab.value = '__all__'
  restore()
  void loadCompetitors()
})

// La structure enregistrée arrive après le montage (lecture asynchrone du store).
watch(() => articleKeywordsStore.keywords?.hnStructure, (saved) => {
  if (saved?.length && structure.value.length === 0) restore()
})

onMounted(() => {
  restore()
  if (props.captainKeyword) void loadCompetitors()
})
</script>

<template>
  <div class="structure-panel" data-testid="structure-panel">
    <header class="structure-header">
      <h3>Structure de l’article</h3>
      <p class="hint">
        Le H1, les chapitres (H2) et leurs sous-parties (H3), construits à partir des lieutenants retenus.
        Validée, la structure devient le sommaire de la rédaction. L’introduction et la conclusion s’ajoutent d’elles-mêmes.
      </p>
    </header>

    <div v-if="lockedLieutenants.length === 0" class="soft-gate-message" data-testid="structure-needs-lieutenants">
      <p>Retenez d’abord au moins un lieutenant dans l’onglet Lieutenants : la structure se construit à partir d’eux.</p>
    </div>
    <ul v-else class="lieutenant-chips" aria-label="Lieutenants retenus">
      <li v-for="lt in lockedLieutenants" :key="lt" class="lieutenant-chip">{{ lt }}</li>
    </ul>

    <p v-if="validated" class="status status--ok" role="status" data-testid="structure-validated">
      ✅ Structure validée : elle sert de sommaire à la rédaction.
    </p>
    <p v-else-if="hasStructureCheck() && dirty" class="status status--warn" role="status" data-testid="structure-changed">
      La structure a changé depuis sa validation : enregistrez-la puis validez-la de nouveau.
    </p>

    <p v-if="competitorsError" class="status status--warn">{{ competitorsError }}</p>
    <p v-else-if="isLoadingCompetitors" class="hint">Lecture de la structure des concurrents…</p>

    <LieutenantH2Structure
      :hn-structure="structure"
      :active-hn-recurrence="recurrence"
      :hn-recurrence="recurrence"
      :serp-results-by-keyword="serpResultsByKeyword"
      :active-hn-tab="activeHnTab"
      :hn-saved="saved"
      :is-saving-hn="isSaving"
      :selected-cards-size="lockedLieutenants.length"
      :hn-regen-streaming="isGenerating"
      :hn-regen-error="generateError"
      @save-hn="handleSave"
      @regenerate-hn="handleGenerate"
      @update:active-hn-tab="(tab: string) => (activeHnTab = tab)"
    />

    <div v-if="mode === 'workflow'" class="structure-actions">
      <button
        type="button"
        class="btn-validate"
        data-testid="structure-validate"
        :disabled="!canValidate"
        :title="structure.length === 0 ? 'Générez d’abord une structure' : 'Enregistre la structure et en fait le sommaire de la rédaction'"
        @click="validate"
      >
        {{ isValidating ? 'Validation…' : 'Valider la structure' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.structure-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.structure-header h3 {
  margin: 0 0 0.25rem;
  font-size: 1.0625rem;
  color: var(--color-text);
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.soft-gate-message {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: var(--color-block-warning-bg);
  color: var(--color-warning);
  font-size: 0.875rem;
}

.soft-gate-message p {
  margin: 0;
}

.lieutenant-chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.lieutenant-chip {
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
  font-size: 0.8125rem;
}

.status {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.status--ok {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.status--warn {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.structure-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-validate {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--color-background);
  font-weight: 600;
  cursor: pointer;
}

.btn-validate:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-validate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
