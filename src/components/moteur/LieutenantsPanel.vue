<script setup lang="ts">
import { computed, watch, toRef } from 'vue'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { hnToOutline } from '@/stores/article/outline.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { extractRoots } from '@/composables/keyword/useCapitaineScan'
import { useLieutenantsSerp } from '@/composables/moteur/useLieutenantsSerp'
import { useLieutenantsIa } from '@/composables/moteur/useLieutenantsIa'
import { useLieutenantsHn } from '@/composables/moteur/useLieutenantsHn'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { MOTEUR_LIEUTENANTS_LOCKED } from '@shared/constants/workflow-checks.constants.js'
import LieutenantSerpAnalysis from '@/components/moteur/LieutenantSerpAnalysis.vue'
import KeywordAssistPanel from '@/components/moteur/KeywordAssistPanel.vue'
// Vague 3 (2026-05-04) — sous-composant Vue qui formalise FR-LIE-AI-FRONTIER.
// Encapsule LieutenantProposals + LieutenantH2Structure + sources IA + lock
// + LieutenantsAiPanel. Par construction, les containers principaux ne sont
// JAMAIS descendants du panel IA.
import LieutenantsResultsLayout from '@/components/moteur/lieutenants/LieutenantsResultsLayout.vue'
import type { SelectedArticle, SerpAnalysisResult } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'
export type { HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  mode?: 'workflow' | 'libre'
  captainKeyword: string | null
  articleLevel: ArticleLevel | null
  isCaptaineLocked: boolean
  wordGroups?: WordGroup[]
  rootKeywords?: string[]
  initialLocked?: boolean
  cocoonSlug?: string
}>(), {
  mode: 'workflow',
  wordGroups: () => [],
  rootKeywords: () => [],
  initialLocked: false,
  cocoonSlug: '',
})

const emit = defineEmits<{
  (e: 'serp-loaded', result: SerpAnalysisResult): void
  (e: 'lieutenants-updated', selected: string[]): void
  (e: 'check-completed', check: string): void
  (e: 'check-removed', check: string): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()
const activityLog = useCostLogStore()

// Direct exploration saves — each event persists to its dedicated table

// (activeHnTab + activeHnRecurrence moved to useLieutenantsHn — déclaré
// après useLieutenantsIa pour avoir hnStructure dispo.)

// --- SERP State (Vague 3 — extracted to useLieutenantsSerp) ---
// canAnalyze + resolvedRootKeywords sont définis plus bas (dépendent de
// hasEverAnalyzed et du captainKeyword props) → on les passe en Ref via toRef
// quand le composable est appelé après leurs définitions. Pour éviter le
// chicken-and-egg, on passe des refs `computed` qui se résolvent à l'usage.
const canAnalyzeRef = computed(() => canAnalyze.value)
const resolvedRootKeywordsRef = computed(() => resolvedRootKeywords.value)
const captainKeywordRef = toRef(props, 'captainKeyword')
const articleLevelRef = toRef(props, 'articleLevel')
const selectedArticleIdRef = computed(() => props.selectedArticle?.id ?? undefined)

const {
  sliderValue,
  isLoading,
  error,
  serpResult,
  serpResultsByKeyword,
  serpDoneCount,
  serpTotalCount,
  serpPendingKeywords,
  serpCurrentKeyword,
  activeSerpTab,
  activeSerpTabResult,
  displayedCompetitors,
  hnRecurrence,
  analyzeSERP,
  computeHnRecurrenceFrom,
} = useLieutenantsSerp({
  captainKeyword: captainKeywordRef,
  articleLevel: articleLevelRef,
  selectedArticleId: selectedArticleIdRef,
  canAnalyze: canAnalyzeRef,
  resolvedRootKeywords: resolvedRootKeywordsRef,
  activityLog,
})

// (activeHnRecurrence moved to useLieutenantsHn below)

// F5 — La barrière `isCaptaineLocked` ne s'applique qu'au premier passage. Dès que
// l'IA a généré des propositions pour cet article, l'onglet reste accessible même
// si l'utilisateur déverrouille ensuite le Capitaine.
const hasEverAnalyzed = computed(() =>
  (articleKeywordsStore.keywords?.richLieutenants?.length ?? 0) > 0,
)

const canAnalyze = computed(() =>
  (props.isCaptaineLocked || hasEverAnalyzed.value) && !!props.captainKeyword && !isLoading.value,
)

/** Root keywords: use props if available, else generate from captain keyword */
const resolvedRootKeywords = computed(() => {
  if (props.rootKeywords.length > 0) return props.rootKeywords
  if (!props.captainKeyword) return []
  return extractRoots(props.captainKeyword).slice(0, 5)
})

// --- IA Proposal State (Vague 3 — extracted to useLieutenantsIa) ---
// `isLocked` est défini plus bas (ligne ~199). On déclare le composable APRÈS
// pour respecter l'ordre lexical, mais Vue 3 capture les Refs par référence
// donc l'ordre d'usage est ce qui compte.
const wordGroupsRef = toRef(props, 'wordGroups')
const cocoonSlugRef = toRef(props, 'cocoonSlug')

// --- Lock/unlock Lieutenants ---
// Sprint 13 — `isLocked` est désormais DÉRIVÉ du store (source unique).
// Vrai si au moins un lieutenant a status='locked' pour l'article courant.
// La prop `initialLocked` est conservée pour compat tests.
const isLocked = computed(() => {
  const kw = articleKeywordsStore.keywords
  if (!kw) return props.initialLocked
  if (kw.articleId !== props.selectedArticle?.id) return props.initialLocked
  return kw.richLieutenants?.some(lt => lt.status === 'locked') ?? false
})

// --- IA composable (Vague 3 — extracted to useLieutenantsIa) ---
// Doit être déclaré après isLocked + serpResult/serpResultsByKeyword/hnRecurrence
// (du composable SERP) pour matcher leurs références.
const selectedArticleRef = toRef(props, 'selectedArticle')
const {
  iaIsStreaming,
  iaChunks,
  iaError,
  iaAbort,
  lieutenantCards,
  eliminatedCards,
  totalGenerated,
  hnStructure,
  contentGapInsights,
  selectedCards,
  currentStep,
  toggleLieutenant,
  proposeLieutenants,
  handleAssistAdd,
  restoreLockedLieutenants,
} = useLieutenantsIa({
  captainKeyword: captainKeywordRef,
  articleLevel: articleLevelRef,
  selectedArticle: selectedArticleRef,
  serpResult,
  serpResultsByKeyword,
  resolvedRootKeywords: resolvedRootKeywordsRef,
  wordGroups: wordGroupsRef,
  cocoonSlug: cocoonSlugRef,
  isLocked,
  articleKeywordsStore,
  computeHnRecurrenceFrom,
  hnRecurrence,
  onLieutenantsUpdated: (selected: string[]) => emit('lieutenants-updated', selected),
})

// --- HN Structure (Vague 3 — extracted to useLieutenantsHn) ---
// Placé après IA car dépend de hnStructure (mutable, set par proposeLieutenants).
const {
  activeHnTab,
  activeHnRecurrence,
  isSavingHn,
  hnSaved,
  saveHnStructure,
} = useLieutenantsHn({
  selectedArticle: selectedArticleRef,
  serpResultsByKeyword,
  hnRecurrence,
  hnStructure,
  articleKeywordsStore,
  computeHnRecurrenceFrom,
})

// --- Debug log: state on mount ---
watch(
  () => articleKeywordsStore.keywords,
  (kw) => {
    log.debug('[LieutenantsPanel] store keywords snapshot', {
      articleId: props.selectedArticle?.id,
      richLieutenants: kw?.richLieutenants?.map(lt => ({
        keyword: lt.keyword,
        status: lt.status,
      })) ?? [],
      flatLieutenants: kw?.lieutenants ?? [],
      hnStructure: kw?.hnStructure ? `${(kw.hnStructure as unknown[]).length} nodes` : 'none',
      isCaptainLocked: props.isCaptaineLocked,
      captainKeyword: props.captainKeyword,
    })
  },
  { immediate: true },
)

// Sprint 17 — Le bouton "Verrouiller les Lieutenants" en bloc est SUPPRIMÉ
// du template. La checkbox de chaque LieutenantCard appelle directement
// `articleKeywordsStore.lockLieutenant` via toggleLieutenant du composable
// useLieutenantsIa. Voir FR-LIE-CHECKBOX-LOCK-IMMEDIATE.
// La fonction historique `lockLieutenants` (batch) a été retirée. Les side-effects
// (saveDecisions, save outline H2, recommendWordCount) sont déclenchés par le
// watcher dérivé sur isLocked (transition false → true).

/**
 * Appelle l'endpoint de recommandation targetWordCount et, si l'utilisateur n'a
 * pas encore défini sa valeur manuellement, écrit la reco dans article_micro_contexts.
 * Un toast info est poussé dans l'activity log avec la valeur conseillée.
 */
async function recommendAndPropagateWordCount(articleId: number): Promise<void> {
  try {
    const reco = await apiPost<{ recommended: number; breakdown: { competitorsAvg: number | null; aiSuggestion: number | null; reasoning: string } }>(
      `/articles/${articleId}/recommend-word-count`,
      {},
    )
    if (!reco?.recommended) return

    // Lit le micro-context actuel pour ne pas écraser une valeur manuelle
    const existing = await apiGet<{ targetWordCount?: number; angle?: string; tone?: string; directives?: string } | null>(
      `/articles/${articleId}/micro-context`,
    ).catch(() => null)

    const alreadyHasCustomValue = existing?.targetWordCount != null
    if (!alreadyHasCustomValue) {
      // On écrit la reco dans le brief. Le PUT exige un `angle` → on met un placeholder
      // qui sera remplaçable par l'utilisateur.
      await apiPut(`/articles/${articleId}/micro-context`, {
        angle: existing?.angle ?? 'Angle à préciser (suggéré lors du lock Lieutenants)',
        tone: existing?.tone ?? '',
        directives: existing?.directives ?? '',
        targetWordCount: reco.recommended,
      })
    }

    const detail = reco.breakdown.reasoning
    activityLog.addMessage(
      'info',
      `💡 Longueur conseillée : ${reco.recommended.toLocaleString('fr-FR')} mots`,
      alreadyHasCustomValue
        ? `${detail} · Valeur manuelle conservée (${existing?.targetWordCount} mots).`
        : `${detail} · Modifiable dans la Rédaction.`,
    )
  } catch (err) {
    log.warn(`[LieutenantsPanel] recommend-word-count failed: ${(err as Error).message}`)
  }
}

// Sprint 17 — Le bouton "Déverrouiller les Lieutenants" en bloc est SUPPRIMÉ
// du template. Le déverrouillage individuel passe par toggleLieutenant
// (FR-LIE-CHECKBOX-LOCK-IMMEDIATE).

/**
 * Sprint 17 — Watcher dérivé : émet/retire le check workflow
 * MOTEUR_LIEUTENANTS_LOCKED + déclenche les side-effects (save outline,
 * recommendWordCount) sur transition 0 → ≥1 locked. C'est le SEUL endroit qui
 * émet ce check désormais (avant Sprint 17, l'émission se faisait dans
 * lockLieutenants() en réponse au bouton batch supprimé).
 */
let previousLockedState = false
watch(
  () => isLocked.value,
  async (locked) => {
    if (locked && !previousLockedState) {
      emit('check-completed', MOTEUR_LIEUTENANTS_LOCKED)
      emit('lieutenants-updated', Array.from(selectedCards.value.keys()))
      // Side-effects post-lock : persister hnStructure + outline + reco wordCount.
      const id = props.selectedArticle?.id
      const title = props.selectedArticle?.title
      if (id && title && articleKeywordsStore.keywords) {
        articleKeywordsStore.keywords.hnStructure = hnStructure.value
        await articleKeywordsStore.saveDecisions(id)
        if (hnStructure.value.length > 0) {
          const outline = hnToOutline(hnStructure.value, title)
          await apiPut(`/articles/${id}`, { outline }).catch((err) => {
            log.warn(`[LieutenantsPanel] outline save failed: ${(err as Error).message}`)
          })
        }
        void recommendAndPropagateWordCount(id)
      }
    } else if (!locked && previousLockedState) {
      emit('check-removed', MOTEUR_LIEUTENANTS_LOCKED)
      const id = props.selectedArticle?.id
      if (id) void articleKeywordsStore.saveDecisions(id)
    }
    previousLockedState = locked
  },
  { immediate: true },
)

// (currentStep + AnalysisStep moved to useLieutenantsIa above)

// --- Auto-set active tabs when SERP results arrive ---
watch(serpResultsByKeyword, (map) => {
  if (map.size > 0 && !map.has(activeSerpTab.value)) {
    activeSerpTab.value = map.keys().next().value!
    activeHnTab.value = '__all__'
  }
})

// --- Reset when article changes ---
watch(
  () => props.selectedArticle?.id,
  () => {
    serpResult.value = null
    serpResultsByKeyword.value = new Map()
    error.value = null
    sliderValue.value = 10
    serpDoneCount.value = 0
    serpTotalCount.value = 0
    activeSerpTab.value = ''
    activeHnTab.value = '__all__'
    currentStep.value = 'idle'
    selectedCards.value = new Map()
    lieutenantCards.value = []
    eliminatedCards.value = []
    totalGenerated.value = 0
    hnStructure.value = []
    contentGapInsights.value = ''

    // Sprint 13 — `isLocked` est computed, plus besoin de reset. Le store
    // sera resynchronisé par fetchKeywords() au changement d'article.
    iaAbort()

    // Restore saved data if article was previously locked
    if (props.initialLocked) {
      if (articleKeywordsStore.keywords?.hnStructure && articleKeywordsStore.keywords.hnStructure.length > 0) {
        hnStructure.value = articleKeywordsStore.keywords.hnStructure
      }
      restoreLockedLieutenants()
    }
  },
)

// --- Restore hnStructure when keywords arrive (async fetch) ---
watch(
  () => articleKeywordsStore.keywords?.hnStructure,
  (hn) => {
    if (isLocked.value && hn && hn.length > 0 && hnStructure.value.length === 0) {
      hnStructure.value = hn
      log.info('[LieutenantsPanel] HN structure restored from store', { nodes: hn.length })
    }
  },
)

// --- Restore lieutenant cards when keywords arrive (async fetch) ---
watch(
  () => articleKeywordsStore.keywords?.lieutenants,
  (lts) => {
    if (isLocked.value && lts && lts.length > 0 && lieutenantCards.value.length === 0) {
      restoreLockedLieutenants()
    }
  },
)

// 2026-05-02 — Sync `lieutenantCards` quand `richLieutenants` change (TabLoadPrompt
// déclenche `mergeRichLieutenants` qui réassigne le tableau côté store).
// Le merge ajoute de nouveaux items que la liste UI doit refléter pour que le
// tri puisse les voir. Watcher en `deep: true` pour capter aussi les push
// éventuels en place.
watch(
  () => articleKeywordsStore.keywords?.richLieutenants,
  (richLts) => {
    if (!richLts || richLts.length === 0) return
    // Recalcule la liste courante depuis le store. Idempotent : si rien n'a
    // changé visuellement, le rendu Vue ne re-render pas.
    const locked = richLts.filter(lt => lt.status === 'locked')
    const suggested = richLts.filter(lt => lt.status === 'suggested')
    const eliminated = richLts.filter(lt => lt.status === 'eliminated')
    const nextActive = [...locked, ...suggested].map(lt => ({
      keyword: lt.keyword,
      reasoning: lt.reasoning,
      sources: lt.sources,
      suggestedHnLevel: lt.suggestedHnLevel,
      score: lt.score,
    }))
    // N'écrase que si la liste mémoire est plus petite (merge ajoute, ne retire jamais).
    if (nextActive.length > lieutenantCards.value.length) {
      lieutenantCards.value = nextActive
      eliminatedCards.value = eliminated.map(lt => ({
        keyword: lt.keyword,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
      }))
    }
  },
  { deep: true },
)

// Bloc 6 — Auto-trigger SERP supprimé. Le SERP était relancé silencieusement
// à chaque changement de captainKeyword, ce qui (a) gâchait des crédits API
// en dehors du contrôle utilisateur et (b) provoquait une pollution
// cross-keyword si le user changeait de Capitaine pendant qu'un SERP en vol
// finissait. L'utilisateur déclenche désormais le SERP manuellement via le
// bouton "Analyser SERP" du sous-composant (@analyze="analyzeSERP" plus bas).
// Les Lieutenants déjà verrouillés survivent à tout changement de Capitaine
// (cf. mergeRichLieutenants dans article-keywords.store.ts:156-181).

// --- Auto-trigger IA proposal after SERP success (skip if lieutenants already locked) ---
// U5 — règle TTL 7 jours : ne pas relancer l'IA si des propositions fraîches existent déjà en DB
watch(serpResult, (result) => {
  if (!result || iaIsStreaming.value || lieutenantCards.value.length !== 0 || isLocked.value) return
  const richLts = articleKeywordsStore.keywords?.richLieutenants ?? []
  const hasFreshProposals = richLts.length > 0 && richLts.every(lt => !shouldRegenerate(lt.exploredAt))
  if (hasFreshProposals) {
    log.info('[LieutenantsPanel] Skip IA proposal — DB has fresh proposals', { count: richLts.length })
    restoreLockedLieutenants()
    return
  }
  log.info('[LieutenantsPanel] Auto-triggering IA proposal after SERP')
  proposeLieutenants()
})

function refreshSERP() {
  // Reset SERP state via composable + IA state au parent (toujours ici car
  // useLieutenantsIa pas encore extrait — sera Bloc J.B).
  serpResult.value = null
  error.value = null
  currentStep.value = 'idle'
  selectedCards.value = new Map()
  lieutenantCards.value = []
  eliminatedCards.value = []
  totalGenerated.value = 0
  hnStructure.value = []
  contentGapInsights.value = ''
  emit('lieutenants-updated', [])
  void analyzeSERPWithStep()
}

// (analyzeSERP + mergeSerpResults moved to useLieutenantsSerp composable above)
//
// Wrapper local : positionne `currentStep='serp'` puis délègue au composable.
// L'émission `serp-loaded` reste au parent car elle dépend du contrat avec
// MoteurView (event).
async function analyzeSERPWithStep(): Promise<void> {
  currentStep.value = 'serp'
  await analyzeSERP()
  if (serpResult.value) {
    emit('serp-loaded', serpResult.value)
  } else if (error.value) {
    currentStep.value = 'idle'
  }
}

// (restoreLockedLieutenants, handleAssistAdd, proposeLieutenants moved
//  to useLieutenantsIa above)

</script>

<template>
  <div class="lieutenants-selection">
    <!-- Sprint 1 (2026-05-04) — `lieutenants-header` legacy supprimé.
         Le rappel Capitaine était redondant avec MoteurContextRecap.
         Le badge "level article" migre dans le header de LieutenantProposals
         (= container principal n°1) pour rester visible. -->

    <!-- F5 — Soft gate uniquement au premier passage (avant toute analyse IA) -->
    <div v-if="!isCaptaineLocked && !hasEverAnalyzed" class="soft-gate-message">
      <p>Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP.</p>
    </div>

    <!-- F3 — Suggestions depuis le basket, ajoutées comme lieutenants candidats -->
    <KeywordAssistPanel
      context="lieutenants"
      :exclude-keywords="lieutenantCards.map(c => c.keyword)"
      @add="handleAssistAdd"
    />

    <!-- SERP Analysis: controls, progress, results summary, per-keyword tabs -->
    <LieutenantSerpAnalysis
      :serp-results-by-keyword="serpResultsByKeyword"
      :active-serp-tab="activeSerpTab"
      :active-serp-tab-result="activeSerpTabResult"
      :displayed-competitors="displayedCompetitors"
      :serp-result="serpResult"
      :slider-value="sliderValue"
      :is-loading="isLoading"
      :can-analyze="canAnalyze"
      :is-locked="isLocked"
      :ia-is-streaming="iaIsStreaming"
      :serp-done-count="serpDoneCount"
      :serp-total-count="serpTotalCount"
      :serp-pending-keywords="serpPendingKeywords"
      :serp-current-keyword="serpCurrentKeyword"
      :ia-chunks="iaChunks"
      :current-step="currentStep"
      @analyze="analyzeSERPWithStep"
      @refresh="refreshSERP"
      @update:slider-value="sliderValue = $event"
      @update:active-serp-tab="activeSerpTab = $event"
    />

    <!-- Error -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- Sprint 1 (2026-05-04) — condition élargie : on monte aussi la section
         si l'utilisateur a déjà ajouté des cards depuis le basket
         (`lieutenantCards.length > 0`). Avant, la section n'apparaissait que
         si SERP ou lock — bloquant l'observation des cards "assist-add". -->
    <!-- Vague 3 (2026-05-04) : LieutenantsResultsLayout encapsule l'ensemble
         containers principaux + sources IA + lock + panel IA, en formalisant
         FR-LIE-AI-FRONTIER (cf. PRD §8.7). -->
    <LieutenantsResultsLayout
      :serp-result="serpResult"
      :is-locked="isLocked"
      :lieutenant-cards="lieutenantCards"
      :ia-is-streaming="iaIsStreaming"
      :ia-chunks="iaChunks"
      :ia-error="iaError"
      :eliminated-cards="eliminatedCards"
      :total-generated="totalGenerated"
      :selected-cards="selectedCards"
      :content-gap-insights="contentGapInsights"
      :article-level="articleLevel"
      :hn-structure="hnStructure"
      :active-hn-recurrence="activeHnRecurrence"
      :hn-recurrence="hnRecurrence"
      :serp-results-by-keyword="serpResultsByKeyword"
      :active-hn-tab="activeHnTab"
      :hn-saved="hnSaved"
      :is-saving-hn="isSavingHn"
      :word-groups="wordGroups"
      :selected-cards-size="selectedCards.size"
      @toggle="toggleLieutenant"
      @propose-retry="proposeLieutenants"
      @save-hn="saveHnStructure"
      @update:active-hn-tab="(tab: string) => activeHnTab = tab"
    />
  </div>
</template>

<style scoped>
.lieutenants-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.serp-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Sprint 1 (2026-05-04) — styles legacy `.lieutenants-header`, `.captain-badge`,
   `.captain-icon`, `.level-badge` supprimés. Le bloc DOM correspondant a été
   supprimé du template. Le badge level migré dans LieutenantProposals.vue. */

/* --- Soft gate --- */
.soft-gate-message {
  padding: 0.75rem 1rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 8px;
}

.soft-gate-message p { margin: 0; font-size: 0.8125rem; color: var(--color-text); }

/* --- Error --- */
.error-message {
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 8px;
}

.error-message p { margin: 0; font-size: 0.8125rem; color: var(--color-error, #ef4444); }

/* --- PAA --- */
.paa-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.paa-item {
  padding: 0.5rem 0.625rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.paa-question { font-size: 0.8125rem; font-weight: 600; color: var(--color-heading); }
.paa-answer { margin-top: 0.25rem; font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.4; }

/* --- Groups --- */
.group-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.group-word { font-weight: 600; }
.group-count { font-size: 0.6875rem; color: var(--color-text-muted); }

/* --- Lock/unlock --- */
.lieutenant-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
}

.lock-btn {
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-success, #22c55e);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.lock-btn:hover:not(:disabled) { background: #16a34a; }
.lock-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.locked-state { display: flex; align-items: center; gap: 1rem; }

.locked-badge {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-success, #22c55e);
  border-radius: 6px;
}

.unlock-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.unlock-btn:hover { border-color: var(--color-error, #ef4444); color: var(--color-error, #ef4444); }

/* --- Empty section --- */
.section-empty { margin: 0; padding: 0.5rem 0; font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; }
.section-hint { margin: 0 0 0.5rem; padding: 0.375rem 0.625rem; font-size: 0.75rem; color: var(--color-text-muted); background: var(--color-bg-secondary, #f8fafc); border-left: 2px solid var(--color-border, #e2e8f0); border-radius: 3px; }
</style>
