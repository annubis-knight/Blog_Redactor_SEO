<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { useGateAlarmStore } from '@/stores/ui/gate-alarm.store'
import { extractRoots } from '@/composables/keyword/useCapitaineScan'
import { useLieutenantsSerp } from '@/composables/moteur/useLieutenantsSerp'
import { useLieutenantsIa } from '@/composables/moteur/useLieutenantsIa'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { MOTEUR_HN_LOCKED, MOTEUR_LIEUTENANTS_LOCKED } from '@shared/constants/workflow-checks.constants.js'
import LieutenantSerpAnalysis from '@/components/moteur/LieutenantSerpAnalysis.vue'
import KeywordAssistPanel from '@/components/moteur/KeywordAssistPanel.vue'
import { useRadarExplorationStore } from '@/stores/article/radar-exploration.store'
// LieutenantsResultsLayout formalise FR-LIE-AI-FRONTIER (containers principaux
// ne sont JAMAIS descendants du panel IA).
import LieutenantsResultsLayout from '@/components/moteur/lieutenants/LieutenantsResultsLayout.vue'
import type { SelectedArticle, SerpAnalysisResult } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'
import type { GateEvaluation } from '@shared/verifiers/gate.js'
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
const radarStore = useRadarExplorationStore()

// FR-MOT-BASKET-DEPRECATED : keywords proposés au KeywordAssistPanel viennent
// du store Radar DB-first (union scan_result.cards + generated_keywords). Plus
// de dépendance au basket mémoire.
const assistKeywords = computed<string[]>(() => {
  const fromScan = radarStore.scanCards.map(c => c.keyword)
  const fromGenerated = radarStore.generatedKeywords.map(k => k.keyword)
  const seen = new Set<string>()
  const out: string[] = []
  for (const kw of [...fromScan, ...fromGenerated]) {
    const norm = kw.toLowerCase()
    if (!seen.has(norm)) {
      seen.add(norm)
      out.push(kw)
    }
  }
  return out
})

// Direct exploration saves — each event persists to its dedicated table

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

// --- Gating Lieutenants ---
// Verrouillage individuel par checkbox (FR-LIE-CHECKBOX-LOCK-IMMEDIATE).
// `hasAnyLockedLieutenant` : utilitaire pour watchers restauration/skip regen.
// - `lieutenantsCheckActive` : règle métier pour le check workflow
//   `MOTEUR_LIEUTENANTS_LOCKED`. Actif ssi ≥1 lieutenant verrouillé. La
//   structure H1/H2/H3 n'en fait plus partie : elle a son onglet et son étape
//   (`moteur:hn_locked`, FR-HN-TAB). Avant C6, l'étape exigeait une structure
//   produite avant même le choix des lieutenants (M7).
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
  articleKeywordsStore,
  computeHnRecurrenceFrom,
  hnRecurrence,
  onLieutenantsUpdated: (selected: string[]) => emit('lieutenants-updated', selected),
})

const lieutenantsCheckActive = computed(() => hasAnyLockedLieutenant.value)

// --- Debug log: state on mount ---
watch(
  () => articleKeywordsStore.keywords,
  (kw) => {
    log.debug('[LieutenantsPanel] store keywords snapshot', {
      articleId: props.selectedArticle?.id,
      richLieutenantsCount: kw?.richLieutenants?.length ?? 0,
      flatLieutenantsCount: kw?.lieutenants?.length ?? 0,
      isCaptainLocked: props.isCaptaineLocked,
      captainKeyword: props.captainKeyword,
    })
  },
  { immediate: true },
)

// du template. La checkbox de chaque LieutenantCard appelle directement
// `articleKeywordsStore.lockLieutenant` via toggleLieutenant du composable
// useLieutenantsIa. Voir FR-LIE-CHECKBOX-LOCK-IMMEDIATE.
// La fonction historique `lockLieutenants` (batch) a été retirée. L'enregistrement
// des décisions est déclenché par le watcher dérivé sur isLocked (transition
// false → true). Sommaire et longueur conseillée partent désormais à la
// validation de la structure (onglet Structure, FR-HN-TAB).

// du template. Le déverrouillage individuel passe par toggleLieutenant
// (FR-LIE-CHECKBOX-LOCK-IMMEDIATE).

// --- Porte « valider les lieutenants » (FR-LIE-LOCK-GATE) ---
// L'étape n'est validée que si la porte passe (nombre de lieutenants selon le
// type d'article, cannibalisation dans le cocon). Vérification SILENCIEUSE :
// pas d'alarme à chaque case cochée ; tant que la porte retient l'étape, un
// bandeau le dit, et l'alarme ne s'ouvre qu'à la demande de l'utilisateur.
// Store lu à la demande, comme le store de progression : les tests qui montent
// ce panneau sans Pinia ne doivent pas tomber au montage.
const lieutenantsGateBlocked = ref<GateEvaluation | null>(null)
let gateSyncRunning: Promise<void> | null = null
/** Étape demandée par ce panneau, pas encore reflétée par le store de progression. */
let checkRequested = false
/**
 * Aucune vérification de la porte n'est en cours pour cet article : un
 * changement de lieutenant peut en lancer une. Pendant une vérification, c'est
 * elle qui reprend les changements survenus entre-temps.
 */
let transitionSettled = false

function hasLieutenantsCheck(id: number): boolean {
  try {
    return checkRequested || (useArticleProgressStore().getProgress(id)?.completedChecks.includes(MOTEUR_LIEUTENANTS_LOCKED) ?? false)
  } catch {
    return checkRequested
  }
}

// Autre article : ce que ce panneau savait de l'étape ne vaut plus.
watch(() => props.selectedArticle?.id ?? null, (id, previous) => {
  if (id === previous) return
  checkRequested = false
  transitionSettled = false
  lieutenantsGateBlocked.value = null
})

function requestCheck(): void {
  checkRequested = true
  emit('check-completed', MOTEUR_LIEUTENANTS_LOCKED)
}

function withdrawCheck(): void {
  checkRequested = false
  emit('check-removed', MOTEUR_LIEUTENANTS_LOCKED)
}

/** Demande le verdict du serveur et accorde (ou retire) l'étape en conséquence. */
async function syncLieutenantsGate(): Promise<void> {
  const id = props.selectedArticle?.id
  if (!id || props.mode === 'libre') return
  let evaluation: GateEvaluation
  try {
    evaluation = await useGateAlarmStore().evaluate(id, 'lieutenants-lock')
  } catch (err) {
    log.warn('[LieutenantsPanel] vérification de la porte impossible', { articleId: id, error: (err as Error).message })
    return
  }
  if (props.selectedArticle?.id !== id || !lieutenantsCheckActive.value) return
  const present = hasLieutenantsCheck(id)
  if (evaluation.passed) {
    lieutenantsGateBlocked.value = null
    if (!present) requestCheck()
  } else {
    lieutenantsGateBlocked.value = evaluation
    if (present) withdrawCheck()
  }
}

/** Une vérification à la fois : deux cases cochées vite ne doublent pas l'étape. */
function requestLieutenantsGate(): Promise<void> {
  gateSyncRunning = (gateSyncRunning ?? Promise.resolve()).then(syncLieutenantsGate)
  return gateSyncRunning
}

/** Bouton du bandeau : ouvre l'alarme sur un verdict frais. */
async function reviewLieutenantsGate(): Promise<void> {
  const id = props.selectedArticle?.id
  if (!id) return
  let passed = false
  try {
    passed = await useGateAlarmStore().ensure(id, 'lieutenants-lock')
  } catch (err) {
    log.warn('[LieutenantsPanel] alarme indisponible', { articleId: id, error: (err as Error).message })
    return
  }
  if (passed) {
    lieutenantsGateBlocked.value = null
    if (!hasLieutenantsCheck(id)) requestCheck()
  }
}

const gateBannerText = computed(() => {
  const blocking = lieutenantsGateBlocked.value?.blocking ?? []
  const first = blocking[0]
  if (!first) return ''
  const more = blocking.length > 1 ? ` (+${blocking.length - 1} autre${blocking.length > 2 ? 's' : ''})` : ''
  return `${first.message}${more}`
})

// Les lieutenants verrouillés, en une clé : un ajout ou un retrait la change.
const lockedLieutenantsSignature = computed(() =>
  (articleKeywordsStore.lockedLieutenants ?? []).map(lt => lt.keyword.toLowerCase()).sort().join('|'),
)

/**
 * Vérifie la porte pour les lieutenants verrouillés À CET INSTANT, puis
 * recommence tant qu'ils ont changé pendant la vérification. Une case cochée
 * pendant la vérification précédente était perdue : un intermédiaire restait
 * retenu à « trop peu de lieutenants » avec deux cases cochées (l'étape
 * s'active dès la première, M7). Une seule vérification à la fois : l'étape
 * n'est jamais demandée deux fois.
 */
async function verifyLockedLieutenants(saveFirst: boolean): Promise<void> {
  transitionSettled = false
  let structureInvalidated = false
  try {
    let signature = lockedLieutenantsSignature.value
    let save = saveFirst
    for (;;) {
      const id = props.selectedArticle?.id
      if (!id || !lieutenantsCheckActive.value) return
      // Les décisions partent AVANT l'étape : la porte lit la base, pas l'écran.
      if (save && articleKeywordsStore.keywords && (await articleKeywordsStore.saveDecisions(id)) === false) {
        log.warn('[LieutenantsPanel] lieutenants non enregistrés : étape non demandée', { articleId: id })
        return
      }
      if (save && !structureInvalidated) structureInvalidated = invalidateValidatedStructure(id)
      await requestLieutenantsGate()
      if (lockedLieutenantsSignature.value === signature) return
      signature = lockedLieutenantsSignature.value
      save = true
    }
  } finally {
    transitionSettled = true
  }
}

/**
 * Les lieutenants retenus ont changé : la structure validée a été construite
 * sans eux, son étape est retirée et se revalide dans l'onglet Structure (M19).
 * Vrai si l'étape a été retirée.
 */
function invalidateValidatedStructure(id: number): boolean {
  if (props.mode === 'libre') return false
  let validated = false
  try {
    validated = useArticleProgressStore().getProgress(id)?.completedChecks.includes(MOTEUR_HN_LOCKED) ?? false
  } catch {
    // Hors contexte Pinia (panneau monté seul) : aucune étape connue.
  }
  if (!validated) return false
  log.info('[LieutenantsPanel] lieutenants changés : la structure est à revalider', { articleId: id })
  emit('check-removed', MOTEUR_HN_LOCKED)
  return true
}

/**
 * Gating workflow : émet/retire check `MOTEUR_LIEUTENANTS_LOCKED`.
 * Actif ssi ≥1 lieutenant verrouillé.
 * Enregistre les décisions sur transition false→true, puis la porte décide.
 * Au mount, réconcilie état réel vs check en DB.
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
      const lockedCount = articleKeywordsStore.lockedLieutenants?.length ?? 0
      let decision: 'add' | 'remove' | 'noop'
      if (active && !checkPresent) {
        // Cas rare : la regle est remplie mais le check manque → la porte décide.
        decision = 'add'
        void verifyLockedLieutenants(false)
      } else if (!active && checkPresent) {
        // Check en base mais plus aucun lieutenant verrouillé → retirer.
        decision = 'remove'
        withdrawCheck()
      } else {
        decision = 'noop'
        // Règle déjà remplie au montage : un ajout ou un retrait ultérieur
        // relancera la porte (sans quoi l'étape restait accordée avec trop peu
        // de lieutenants).
        if (active) transitionSettled = true
      }
      log.info('[reconcile:lieutenants]', {
        articleId: id,
        lockedCount,
        active,
        checkPresent,
        decision,
        check: MOTEUR_LIEUTENANTS_LOCKED,
      })
      return
    }

    if (active && !previousCheckActive) {
      previousCheckActive = active
      emit('lieutenants-updated', Array.from(selectedCards.value.keys()))
      await verifyLockedLieutenants(true)
      return
    } else if (!active && previousCheckActive) {
      lieutenantsGateBlocked.value = null
      transitionSettled = false
      withdrawCheck()
      const id = props.selectedArticle?.id
      if (id) void articleKeywordsStore.saveDecisions(id)
    }
    previousCheckActive = active
  },
  { immediate: true },
)

// Un lieutenant ajouté ou retiré alors que l'étape est déjà active : la porte
// est revérifiée sur les décisions enregistrées (FR-LIE-LOCK-GATE). La
// transition false → true est traitée par le watcher ci-dessus ; pendant une
// vérification, c'est elle qui reprend le changement.
watch(lockedLieutenantsSignature, async (signature, previous) => {
  if (signature === previous || !transitionSettled || !lieutenantsCheckActive.value) return
  if (!props.selectedArticle?.id || props.mode === 'libre') return
  await verifyLockedLieutenants(true)
})

// (currentStep + AnalysisStep moved to useLieutenantsIa above)

// --- Auto-set active tabs when SERP results arrive ---
watch(serpResultsByKeyword, (map) => {
  if (map.size > 0 && !map.has(activeSerpTab.value)) {
    activeSerpTab.value = map.keys().next().value!
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
    currentStep.value = 'idle'
    selectedCards.value = new Map()
    lieutenantCards.value = []
    eliminatedCards.value = []
    totalGenerated.value = 0
    contentGapInsights.value = ''

    // Le store sera resynchronisé par fetchKeywords() au changement d'article.
    iaAbort()

    // Restore inconditionnel : si la base contient des lieutenants, les restaurer.
    // Restauration via richLieutenants (chemin nominal) OU lieutenants flat
    // (fallback backward compat).
    const hasRich = (articleKeywordsStore.keywords?.richLieutenants?.length ?? 0) > 0
    const hasFlat = (articleKeywordsStore.keywords?.lieutenants?.length ?? 0) > 0
    if (hasRich || hasFlat) {
      restoreLockedLieutenants()
    }
  },
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

// Sync `lieutenantCards` quand `richLieutenants` change (mergeRichLieutenants).
// Peuple aussi `selectedCards` avec locked (pour checkboxes état coché).
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
// Skip si cards en mémoire ou stream en cours. TTL 7 jours : pas regen si proposals fraîches en DB.
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
    <!-- legacy `lieutenants-header` supprimé. Badge "level article" migre dans LieutenantProposals. -->

    <!-- F5 — Soft gate uniquement au premier passage (avant toute analyse IA) -->
    <div v-if="!isCaptaineLocked && !hasEverAnalyzed" class="soft-gate-message">
      <p>Verrouillez votre Capitaine dans l'onglet precedent pour analyser la SERP.</p>
    </div>

    <!-- Suggestions de keywords issues du Radar DB-first, à ajouter comme lieutenants candidats. -->
    <KeywordAssistPanel
      context="lieutenants"
      :keywords="assistKeywords"
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
    <div v-if="error" class="error-message" data-testid="serp-error">
      <p>{{ error }}</p>
    </div>

    <!-- FR-LIE-LOCK-GATE — la porte retient l'étape : on le dit, l'alarme s'ouvre à la demande. -->
    <div v-if="lieutenantsGateBlocked" class="gate-banner" role="status" data-testid="lieutenants-gate-banner">
      <p class="gate-banner-text">
        <strong>Étape non validée.</strong> {{ gateBannerText }}
      </p>
      <button type="button" class="gate-banner-btn" data-testid="lieutenants-gate-review" @click="reviewLieutenantsGate">
        Voir pourquoi / décider
      </button>
    </div>

    <!-- LieutenantsResultsLayout encapsule ensemble + formalise FR-LIE-AI-FRONTIER (PRD §8.7). -->
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
      :word-groups="wordGroups"
      @toggle="toggleLieutenant"
      @propose-retry="proposeLieutenants"
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

/* Legacy styles supprimés (.lieutenants-header, .captain-badge, .captain-icon, .level-badge). */

/* --- Porte Lieutenants --- */
.gate-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-block-warning-border, #f59e0b);
  border-radius: 6px;
  background: var(--color-block-warning-bg, #fffbeb);
  font-size: 0.8125rem;
}

.gate-banner-text {
  margin: 0;
}

.gate-banner-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

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
