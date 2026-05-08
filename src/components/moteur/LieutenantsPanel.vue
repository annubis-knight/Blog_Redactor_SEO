<script setup lang="ts">
import { computed, watch, toRef } from 'vue'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { hnToOutline } from '@/stores/article/outline.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
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
const wordGroupsRef = toRef(props, 'wordGroups')
const cocoonSlugRef = toRef(props, 'cocoonSlug')

// --- Gating Lieutenants (2026-05-08 — refonte) ---
// L'ancien concept "panel locké" (`isLocked` au niveau du panel entier) est
// SUPPRIMÉ. Le verrouillage est désormais individuel par checkbox
// (FR-LIE-CHECKBOX-LOCK-IMMEDIATE depuis sprint 17). Mais la computed
// `isLocked` était restée et désactivait toutes les checkboxes dès qu'UN seul
// lieutenant était locké → cul-de-sac UX.
//
// Nouveau modèle :
// - `hasAnyLockedLieutenant` : utilitaire interne pour les watchers de
//   restauration / skip de régénération IA.
// - `lieutenantsCheckActive` : règle métier pour le check workflow
//   `MOTEUR_LIEUTENANTS_LOCKED`. Actif ssi (≥1 lieutenant locked) ET
//   (hn_structure non-vide). Reflète qu'on ne peut considérer l'étape
//   Lieutenants comme "faite" tant que la structure Hn n'a pas été générée.
const hasAnyLockedLieutenant = computed(() => {
  const kw = articleKeywordsStore.keywords
  if (!kw || kw.articleId !== props.selectedArticle?.id) return false
  return kw.richLieutenants?.some(lt => lt.status === 'locked') ?? false
})

// --- IA composable (Vague 3 — extracted to useLieutenantsIa) ---
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
  hnRegenStreaming,
  hnRegenError,
  toggleLieutenant,
  proposeLieutenants,
  regenerateHnStructure,
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
  articleKeywordsStore,
  computeHnRecurrenceFrom,
  hnRecurrence,
  onLieutenantsUpdated: (selected: string[]) => emit('lieutenants-updated', selected),
})

// `lieutenantsCheckActive` doit être déclaré APRÈS `hnStructure` (référence
// du composable IA) pour pouvoir le lire.
const lieutenantsCheckActive = computed(() => {
  return hasAnyLockedLieutenant.value && hnStructure.value.length > 0
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
      richLieutenantsCount: kw?.richLieutenants?.length ?? 0,
      flatLieutenantsCount: kw?.lieutenants?.length ?? 0,
      hnStructureCount: (kw?.hnStructure as unknown[] | undefined)?.length ?? 0,
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
 * Watcher de gating workflow (refonte 2026-05-08).
 *
 * Émet/retire le check `MOTEUR_LIEUTENANTS_LOCKED` selon `lieutenantsCheckActive` :
 *   - actif ssi (≥1 lieutenant locked) ET (hn_structure non-vide)
 *   - reflète la règle métier : l'étape Lieutenants n'est "faite" que quand
 *     l'utilisateur a ET sélectionné au moins un lieutenant ET généré la
 *     structure Hn.
 *
 * Side-effects sur transition false → true : sauvegarde hnStructure + outline
 * + recommandation wordCount (héritage sprint 17, reste pertinent).
 *
 * Au MOUNT (immediate), ne fait pas de transition false→false ni true→true (no-op),
 * MAIS si le check est present en DB alors que active=false (regle non remplie
 * mais check legacy persiste), on emit `check-removed` pour nettoyer l'etat.
 * Idem inversement : check absent mais active=true → emit `check-completed`.
 */
let previousCheckActive = false
let isFirstRun = true
watch(
  () => lieutenantsCheckActive.value,
  async (active) => {
    // Au mount : reconcilier l'etat reel avec le check workflow stocke en DB.
    if (isFirstRun) {
      isFirstRun = false
      previousCheckActive = active
      const id = props.selectedArticle?.id
      // Lazy access au store progress pour eviter erreur Pinia hors composant
      // dans les tests qui ne mockent pas ce store.
      let checks: string[] = []
      try {
        const progressStore = useArticleProgressStore()
        checks = id ? (progressStore.getProgress(id)?.completedChecks ?? []) : []
      } catch {
        checks = []
      }
      const checkPresent = checks.includes(MOTEUR_LIEUTENANTS_LOCKED)
      if (active && !checkPresent) {
        // Cas rare : la regle est remplie mais le check manque → l'ajouter.
        emit('check-completed', MOTEUR_LIEUTENANTS_LOCKED)
      } else if (!active && checkPresent) {
        // Cas observe 2026-05-08 : check legacy en DB alors que la nouvelle
        // regle (locked + hn_structure) n'est pas remplie → retirer le check.
        emit('check-removed', MOTEUR_LIEUTENANTS_LOCKED)
        log.info('[LieutenantsPanel] cleanup obsolete MOTEUR_LIEUTENANTS_LOCKED check (gating rule changed)')
      }
      return
    }

    if (active && !previousCheckActive) {
      emit('check-completed', MOTEUR_LIEUTENANTS_LOCKED)
      emit('lieutenants-updated', Array.from(selectedCards.value.keys()))
      // Side-effects : persister hnStructure + outline + reco wordCount.
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
    } else if (!active && previousCheckActive) {
      emit('check-removed', MOTEUR_LIEUTENANTS_LOCKED)
      const id = props.selectedArticle?.id
      if (id) void articleKeywordsStore.saveDecisions(id)
    }
    previousCheckActive = active
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

    // Le store sera resynchronisé par fetchKeywords() au changement d'article.
    iaAbort()

    // 2026-05-08 — Restore est maintenant inconditionnel : si la DB contient
    // une hn_structure ou des lieutenants, on les restaure. Plus de garde
    // `isLocked` au niveau panel (concept supprimé).
    if (articleKeywordsStore.keywords?.hnStructure && articleKeywordsStore.keywords.hnStructure.length > 0) {
      hnStructure.value = articleKeywordsStore.keywords.hnStructure
    }
    // Restauration via richLieutenants (chemin nominal) OU lieutenants flat
    // (fallback backward compat).
    const hasRich = (articleKeywordsStore.keywords?.richLieutenants?.length ?? 0) > 0
    const hasFlat = (articleKeywordsStore.keywords?.lieutenants?.length ?? 0) > 0
    if (hasRich || hasFlat) {
      restoreLockedLieutenants()
    }
  },
)

// --- Restore hnStructure when keywords arrive (async fetch) ---
// `immediate: true` pour couvrir le cas mount-with-data.
watch(
  () => articleKeywordsStore.keywords?.hnStructure,
  (hn) => {
    if (hn && hn.length > 0 && hnStructure.value.length === 0) {
      hnStructure.value = hn
      log.info('[LieutenantsPanel] HN structure restored from store', { nodes: hn.length })
    }
  },
  { immediate: true },
)

// --- Restore lieutenant cards when keywords arrive (async fetch) ---
// `immediate: true` pour couvrir le cas mount-with-data (article deja locké
// au moment du mount, ex. retour sur l'onglet ou test unitaire).
watch(
  () => articleKeywordsStore.keywords?.lieutenants,
  (lts) => {
    if (lts && lts.length > 0 && lieutenantCards.value.length === 0) {
      restoreLockedLieutenants()
    }
  },
  { immediate: true },
)

// 2026-05-02 — Sync `lieutenantCards` quand `richLieutenants` change (TabLoadPrompt
// déclenche `mergeRichLieutenants` qui réassigne le tableau côté store).
// Le merge ajoute de nouveaux items que la liste UI doit refléter pour que le
// tri puisse les voir. Watcher en `deep: true` pour capter aussi les push
// éventuels en place.
//
// 2026-05-08 — Bug fix : le watcher peuplait `lieutenantCards` mais oubliait
// `selectedCards` (la Map qui pilote l'état coché des checkboxes). Conséquence :
// au clic "DB N" du TabLoadPrompt, les cards apparaissaient mais aucune checkbox
// n'était cochée même pour les lieutenants `status='locked'`. Fix : on peuple
// aussi `selectedCards` avec les locked.
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
    // Sync `selectedCards` avec les lieutenants `locked` du store. Les
    // checkboxes des lieutenants verrouillés doivent apparaître cochées.
    // On préserve les sélections utilisateur déjà en mémoire et on ajoute
    // celles qui sont marquées 'locked' en DB mais absentes du Map local.
    let changed = false
    for (const lt of locked) {
      if (!selectedCards.value.has(lt.keyword)) {
        selectedCards.value.set(lt.keyword, {
          keyword: lt.keyword,
          reasoning: lt.reasoning,
          sources: lt.sources,
          suggestedHnLevel: lt.suggestedHnLevel,
          score: lt.score,
        })
        changed = true
      }
    }
    if (changed) {
      // Réassigne pour déclencher la réactivité Vue (Map mutée en place ne
      // re-render pas dans certains cas).
      selectedCards.value = new Map(selectedCards.value)
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

// --- Auto-trigger IA proposal after SERP success ---
// 2026-05-08 — la garde `isLocked` est SUPPRIMEE (concept disparu). On skip
// uniquement si on a déjà des cards en mémoire ou un stream en cours.
// U5 — règle TTL 7 jours : ne pas relancer l'IA si des propositions fraîches existent déjà en DB
watch(serpResult, (result) => {
  if (!result || iaIsStreaming.value || lieutenantCards.value.length !== 0) return
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
      :hn-regen-streaming="hnRegenStreaming"
      :hn-regen-error="hnRegenError"
      :word-groups="wordGroups"
      :selected-cards-size="selectedCards.size"
      @toggle="toggleLieutenant"
      @propose-retry="proposeLieutenants"
      @save-hn="saveHnStructure"
      @regenerate-hn="regenerateHnStructure"
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
