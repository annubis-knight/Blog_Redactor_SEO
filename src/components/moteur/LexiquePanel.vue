<script setup lang="ts">
/**
 * AUTHORITY: PostgreSQL `article_keywords.lexique` TEXT[] (termes verrouilles utilisateur).
 *            PostgreSQL `lexique_explorations` (cache propositions TF-IDF/IA, distinct).
 *            PostgreSQL `keyword_serp_scrapes` (lecture seule via pré-check léger).
 * READS FROM: useArticleKeywordsStore.keywords.lexique (mount/store hydrate via fetchKeywords).
 *             GET /articles/:id/explorations (hydrateFromDb / mergeFromDb pour pastExplorations).
 *             GET /keywords/:keyword/serp/exists (pré-check léger via useSerpExistsCheck).
 *             POST /serp/tfidf (extraction TF-IDF live, optionnellement avec triggerScrapeIfMissing).
 *             useArticleProgressStore.getProgress(id).completedChecks (reconciliation au mount).
 * WRITES TO: articleKeywordsStore.addLexiqueTerm / removeLexiqueTerm + saveDecisions(id)
 *            (toggle terme = mute store + PUT /articles/:id/keywords).
 *            Emits 'check-completed' / 'check-removed' (MOTEUR_LEXIQUE_VALIDATED) consommes
 *            par MoteurView qui appelle articleProgressStore.addCheck / removeCheck.
 * CONSUMERS: MoteurView (parent), TabCachePanel via tab-cache-entries.ts
 *            (validatedLexiqueCount = lexique.length).
 * RELATED FR: FR-LEX-SELECT, FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-TFIDF, FR-LEX-MULTI-KEYWORD,
 *             FR-LEX-PRECHECK-SERP (chantier 3 E1-S3 : CTA explicite si pas de scrape SERP),
 *             FR-MOT-CHECK-RECONCILIATION (cleanup check legacy au mount si lexique=[]),
 *             FR-MOT-CACHE-PANEL-COUNT (lexique.length pilote le compteur DB du TabCachePanel).
 */
import { ref, computed, watch, onUnmounted, toRef } from 'vue'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { shouldRegenerate } from '@/utils/ttl-freshness'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { useLexiqueIa } from '@/composables/lexique/useLexiqueIa'
import { useSerpExistsCheck } from '@/composables/lexique/useSerpExistsCheck'
import KeywordAssistPanel from '@/components/moteur/KeywordAssistPanel.vue'
import LexiqueAiPanel from '@/components/moteur/LexiqueAiPanel.vue'
import LexiqueTermsList from '@/components/moteur/lexique/LexiqueTermsList.vue'
import LexiqueCustomKeywordInput from '@/components/moteur/lexique/LexiqueCustomKeywordInput.vue'
import ConfirmModal from '@/components/shared/ConfirmModal.vue'
import TabBar from '@/components/shared/TabBar.vue'
import { jaccardWithPainPoint } from '@/utils/pain-point-jaccard'
import { type SortOption } from '@/composables/moteur/useSortableList'
import SortToggleBar from '@/components/moteur/SortToggleBar.vue'
import type { SelectedArticle } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { TfidfResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'
import { MOTEUR_LEXIQUE_VALIDATED } from '@shared/constants/workflow-checks.constants.js'

// Sprint 11 — Multi-keyword exploration + DB hydration
interface LexiqueExplorationEntry {
  articleId: number
  sourceKeyword: string
  tfidfTerms: TfidfResult | null
  aiRecommendations: LexiqueTermRecommendation[]
  aiMissingTerms: string[]
  aiSummary: string | null
  exploredAt: string
}

const props = withDefaults(defineProps<{
  selectedArticle: SelectedArticle | null
  captainKeyword: string | null
  articleLevel: ArticleLevel | null
  selectedLieutenants: string[]
  isCaptaineLocked: boolean
  initialLocked?: boolean
  cocoonSlug?: string
}>(), {
  initialLocked: false,
  cocoonSlug: '',
})

const emit = defineEmits<{
  (e: 'check-completed', check: string): void
  (e: 'check-removed', check: string): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()

const tfidfResult = ref<TfidfResult | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedTerms = ref<Set<string>>(new Set())
// Sprint 17 — `isLocked` dérivé du store : "lockée" = au moins 1 terme dans
// keywords.lexique. Plus de Ref locale, plus de bouton batch.
// FR-LEX-CHECKBOX-LOCK-IMMEDIATE.
const isLocked = computed(() => {
  const lex = articleKeywordsStore.keywords?.lexique
  return Array.isArray(lex) && lex.length > 0
})

// 2026-05-02 — Migration vers la barre de tri unifiée (S2 historique remplacé).
// Critères :
//   - "az"        : ordre alphabétique sur le terme
//   - "density"   : densité TF-IDF (par défaut DESC, plus dense en haut)
//   - "alignment" : similarité Jaccard term × painPoint (S2 historique)
// L'ordre TF-IDF par défaut (état neutral) est conservé.
const lexiqueSortOptions = computed<SortOption[]>(() => {
  const opts: SortOption[] = [
    { key: 'az', label: 'A-Z' },
    { key: 'density', label: 'Densité' },
  ]
  if (props.selectedArticle?.painPoint) {
    opts.push({ key: 'alignment', label: 'Pertinence douleur' })
  }
  return opts
})

const lexiqueSortState = ref<{ key: string | null; direction: 'asc' | 'desc' | 'neutral' }>({
  key: null,
  direction: 'neutral',
})

function getLexiqueValue<T extends { term: string; density?: number; documentFrequency?: number }>(t: T, key: string): string | number | null {
  if (key === 'az') return t.term
  if (key === 'density') return t.density ?? t.documentFrequency ?? null
  if (key === 'alignment') return jaccardWithPainPoint(t.term, props.selectedArticle?.painPoint ?? null)
  return null
}

function sortTermsByAlignment<T extends { term: string; density?: number; documentFrequency?: number }>(terms: T[]): T[] {
  const { key, direction } = lexiqueSortState.value
  if (!key || direction === 'neutral') return terms
  const sign = direction === 'desc' ? -1 : 1
  return [...terms].sort((a, b) => {
    const va = getLexiqueValue(a, key)
    const vb = getLexiqueValue(b, key)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return sign * (va - vb)
    return sign * String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' })
  })
}

// Sprint 11 (D4) — champ saisie libre pour lancer TF-IDF sur un keyword arbitraire.
const customKeywordInput = ref('')
// Keyword source actif pour l'extraction courante (capitaine par défaut).
const activeSourceKeyword = ref<string>('')
// DB-hydrated past explorations for this article (displayed as collapsible sections).
const pastExplorations = ref<LexiqueExplorationEntry[]>([])

// Chantier 3 E1-S3 (FR-LEX-PRECHECK-SERP) — pré-check SERP léger sur le
// captain keyword pour gater l'UX : si aucun scrape n'existe, on affiche un
// CTA explicite *« Lancer l'analyse SERP »* au lieu de tenter un POST
// /serp/tfidf qui répondrait 404 (origine de la trace rouge console).
const captainKeywordForPrecheck = computed<string | null>(() => props.captainKeyword)
const {
  exists: serpExists,
  isChecking: serpExistsIsChecking,
  refetch: refetchSerpExists,
} = useSerpExistsCheck(captainKeywordForPrecheck)
const showSerpScrapeModal = ref(false)

// Chantier 3 E2-S2 (FR-LEX-MULTI-KEYWORD-TABS) — onglets multi-keyword.
// 1 onglet par exploration enregistrée (label = sourceKeyword brut, sans
// transformation côté UI — cohérence affichage/calcul §2.0) + 1 onglet
// « + Tester un mot-clé » pour déclencher une saisie libre.
const CUSTOM_TAB_ID = '__custom__'

const lexiqueTabs = computed(() => {
  const explorationTabs = pastExplorations.value.map((entry) => ({
    id: entry.sourceKeyword,
    label: entry.sourceKeyword,
  }))
  // Quand 0 exploration, on n'affiche que l'onglet de saisie libre
  // (label simplifié sans le « + »).
  const customLabel = explorationTabs.length === 0 ? 'Tester un mot-clé' : '+ Tester un mot-clé'
  return [...explorationTabs, { id: CUSTOM_TAB_ID, label: customLabel }]
})

// L'onglet actif côté UI : soit le sourceKeyword courant, soit l'onglet libre.
const displayedTabId = computed<string>(() => {
  if (activeSourceKeyword.value && pastExplorations.value.some(e => e.sourceKeyword === activeSourceKeyword.value)) {
    return activeSourceKeyword.value
  }
  return CUSTOM_TAB_ID
})

function onSelectTab(id: string): void {
  if (id === CUSTOM_TAB_ID) {
    activeSourceKeyword.value = ''
    return
  }
  const entry = pastExplorations.value.find(e => e.sourceKeyword === id)
  if (!entry) return
  // Inline équivalent de handleSelectPast : pas de fetch, lecture du cache.
  activeSourceKeyword.value = entry.sourceKeyword
  tfidfResult.value = entry.tfidfTerms
  const m = new Map<string, LexiqueTermRecommendation>()
  for (const r of entry.aiRecommendations) m.set(r.term.toLowerCase(), r)
  iaRecommendations.value = m
}

// --- IA Upfront Analysis (Vague 5 — extracted to useLexiqueIa) ---
const captainKeywordRef = toRef(props, 'captainKeyword')
const articleLevelRef = toRef(props, 'articleLevel')
const cocoonSlugRef = toRef(props, 'cocoonSlug')
const selectedArticleIdRef = computed(() => props.selectedArticle?.id ?? undefined)

const {
  iaIsStreaming,
  iaError,
  iaResult,
  iaRecommendations,
  iaRecommendedCount,
  iaNotRecommendedCount,
  iaAbort,
  getRecommendation,
  isIaRecommended,
  generateLexiqueUpfront,
} = useLexiqueIa({
  tfidfResult,
  selectedTerms,
  activeSourceKeyword,
  captainKeyword: captainKeywordRef,
  articleLevel: articleLevelRef,
  cocoonSlug: cocoonSlugRef,
  selectedArticleId: selectedArticleIdRef,
})

// F5 — La barrière `isCaptaineLocked` ne s'applique qu'au premier passage. Dès que
// des termes lexique ont été validés une fois, l'onglet reste accessible même si
// l'utilisateur déverrouille ensuite le Capitaine.
const hasEverValidated = computed(() =>
  (articleKeywordsStore.keywords?.lexique?.length ?? 0) > 0,
)

/**
 * FR-MOT-DISPLAY-FROM-STORE — lit le Capitaine depuis le store Pinia (source
 * réactive fraîche, mutée par lockCaptain/unlockCaptain) plutôt que depuis
 * `props.captainKeyword`, qui est une projection figée fournie par MoteurView
 * et ne se rafraîchit pas live après un re-lock.
 *
 * Garde `selectedArticle.id > 0` pour éviter les collisions sur les articles
 * proposés non persistés (`dbId === 0`) où `setCapitaine()` peut seed
 * `articleId: 0` dans le store.
 */
const displayedCaptainKeyword = computed<string | null>(() => {
  const kw = articleKeywordsStore.keywords
  const selId = props.selectedArticle?.id ?? 0
  if (selId > 0 && kw && kw.articleId === selId) {
    return kw.capitaine || props.captainKeyword
  }
  return props.captainKeyword
})

// Sprint 17 — `isLocked` est désormais dérivé de keywords.lexique.length > 0
// (FR-LEX-CHECKBOX-LOCK-IMMEDIATE). Sans le retrait de `!isLocked.value`,
// l'extraction serait bloquée dès qu'un seul terme est coché — incohérent avec
// le nouveau modèle où l'utilisateur peut étendre sa sélection en relançant
// une extraction. La protection contre la double-extraction simultanée reste
// assurée par `!isLoading.value`.
const canExtract = computed(() =>
  (props.isCaptaineLocked || hasEverValidated.value) && !!props.captainKeyword && !isLoading.value,
)

// --- Debug log: state on mount ---
watch(
  () => articleKeywordsStore.keywords,
  (kw) => {
    log.debug('[LexiquePanel] store keywords snapshot', {
      articleId: props.selectedArticle?.id,
      lexiqueTerms: kw?.lexique ?? [],
      lexiqueCount: kw?.lexique?.length ?? 0,
      isCaptainLocked: props.isCaptaineLocked,
      captainKeyword: props.captainKeyword,
      isLocked: isLocked.value,
      tfidfLoaded: !!tfidfResult.value,
    })
  },
  { immediate: true },
)

/** F3 — Ajoute un terme (suggéré par le basket) à la sélection lexique courante. */
function handleAssistAdd(term: string) {
  if (isLocked.value) return
  const next = new Set(selectedTerms.value)
  next.add(term)
  selectedTerms.value = next
  log.info('[LexiquePanel] Assist add', { term, total: selectedTerms.value.size })
}

async function extractLexique() {
  if (!props.captainKeyword || !canExtract.value) return
  activeSourceKeyword.value = props.captainKeyword
  await fetchTfidf(props.captainKeyword)
}

/**
 * Sprint 11 (D4) — TF-IDF sur un keyword arbitraire (hors capitaine verrouillé).
 *
 * Chantier 3 E1-S3 : on passe `triggerScrape=true` puisque l'utilisateur
 * choisit explicitement de tester un keyword vierge. Le coût scrape est
 * acté par cette saisie libre (cohérent avec la modale du captain keyword
 * qui sert le même objectif sur le keyword principal).
 *
 * Chantier 3 E2-S2 (FR-LEX-MULTI-KEYWORD-TABS / AC.LEX-TABS.3) : après
 * succès, on appelle `mergeFromDb` pour récupérer l'entrée fraîchement
 * persistée par le backend → un nouvel onglet apparaît automatiquement et
 * `displayedTabId` (computed) bascule sur ce keyword puisque
 * `activeSourceKeyword.value === kw` désormais matche une entry du cache.
 */
async function extractCustomKeyword() {
  const kw = customKeywordInput.value.trim()
  if (!kw || isLoading.value) return
  activeSourceKeyword.value = kw
  iaRecommendations.value = new Map()
  await fetchTfidf(kw, true)
  if (tfidfResult.value) {
    await mergeFromDb()
  }
  customKeywordInput.value = ''
}

/**
 * Chantier 3 E1-S3 (FR-LEX-PRECHECK-SERP) — handler du CTA *« Lancer
 * l'analyse SERP »*. Ouvre la modale de confirmation coût DataForSEO. Sur
 * confirmation, déclenche fetchTfidf(triggerScrape=true) puis re-vérifie
 * exists pour repasser à l'UI nominale (bouton « Extraire le Lexique »).
 */
function openSerpScrapeModal() {
  showSerpScrapeModal.value = true
}

async function confirmSerpScrape() {
  showSerpScrapeModal.value = false
  if (!props.captainKeyword) return
  await fetchTfidf(props.captainKeyword, true)
  await refetchSerpExists()
}

function cancelSerpScrape() {
  showSerpScrapeModal.value = false
}

// Sprint 17 — Cocher/décocher un terme = lock/unlock immédiat en DB.
// FR-LEX-CHECKBOX-LOCK-IMMEDIATE. Plus de garde isLocked (le verrou est par
// terme, pas par container). Le check workflow MOTEUR_LEXIQUE_VALIDATED est
// dérivé d'un watcher (plus bas) sur la taille de keywords.lexique.
function toggleTerm(term: string) {
  const id = props.selectedArticle?.id
  if (!id) return
  if (!articleKeywordsStore.keywords) {
    articleKeywordsStore.initEmpty(id)
  }
  const next = new Set(selectedTerms.value)
  if (next.has(term)) {
    next.delete(term)
    articleKeywordsStore.removeLexiqueTerm(term)
  } else {
    next.add(term)
    articleKeywordsStore.addLexiqueTerm(term)
  }
  selectedTerms.value = next
  void articleKeywordsStore.saveDecisions(id)
}

// Selection counters
const selectedCount = computed(() => selectedTerms.value.size)

const selectedByLevel = computed(() => {
  const r = tfidfResult.value
  if (!r) return { obligatoire: 0, differenciateur: 0, optionnel: 0 }
  return {
    obligatoire: (r.obligatoire ?? []).filter(t => selectedTerms.value.has(t.term)).length,
    differenciateur: (r.differenciateur ?? []).filter(t => selectedTerms.value.has(t.term)).length,
    optionnel: (r.optionnel ?? []).filter(t => selectedTerms.value.has(t.term)).length,
  }
})

// (iaRecommendedCount, iaNotRecommendedCount, getRecommendation,
//  isIaRecommended, generateLexiqueUpfront moved to useLexiqueIa above)

// Auto-trigger IA upfront after TF-IDF results
// U5 — session guard : ne pas relancer si déjà en cache session (iaRecommendations peuplé)
// TODO U5 plus complet : persister les iaRecommendations en DB avec exploredAt,
// et réutiliser via shouldRegenerate(exploredAt). Pour l'instant : cache de session seulement.
watch(tfidfResult, (res) => {
  if (!res) return
  if (iaRecommendations.value.size > 0) {
    log.debug('[LexiquePanel] Skip IA upfront — session cache already populated', { count: iaRecommendations.value.size })
    return
  }
  generateLexiqueUpfront()
})

// Sprint 17 — Bouton "Verrouiller le Lexique" en bloc SUPPRIMÉ du template.
// Le toggleTerm persiste immédiatement chaque ajout/retrait dans le store.
// Les fonctions historiques validateLexique/unlockLexique sont retirées
// (FR-LEX-CHECKBOX-LOCK-IMMEDIATE).

/**
 * Watcher de gating workflow + reconciliation au mount (FR-MOT-CHECK-RECONCILIATION).
 *
 * Au mount (immediate, isFirstRun=true) :
 *  - lexique=[] mais 'moteur:lexique_validated' present en DB → emit check-removed
 *    (cas observe article 64 : check legacy non nettoye apres deverrouillage).
 *  - lexique=['t1',...] mais check absent → emit check-completed (etat coherent).
 *  - DB et store coherents → no-op.
 *
 * Apres le mount : transitions normales false↔true (utilisateur coche/decoche).
 */
let previousLockedState = false
let isFirstRun = true
watch(
  isLocked,
  (locked) => {
    if (isFirstRun) {
      isFirstRun = false
      previousLockedState = locked
      const id = props.selectedArticle?.id
      let checks: string[] = []
      try {
        const progressStore = useArticleProgressStore()
        checks = id ? (progressStore.getProgress(id)?.completedChecks ?? []) : []
      } catch {
        checks = []
      }
      const checkPresent = checks.includes(MOTEUR_LEXIQUE_VALIDATED)
      const lexiqueCount = articleKeywordsStore.keywords?.lexique?.length ?? 0
      let decision: 'add' | 'remove' | 'noop'
      if (locked && !checkPresent) {
        decision = 'add'
        emit('check-completed', MOTEUR_LEXIQUE_VALIDATED)
      } else if (!locked && checkPresent) {
        decision = 'remove'
        emit('check-removed', MOTEUR_LEXIQUE_VALIDATED)
      } else {
        decision = 'noop'
      }
      log.info('[reconcile:lexique]', {
        articleId: id,
        lexiqueCount,
        isLocked: locked,
        checkPresent,
        decision,
        check: MOTEUR_LEXIQUE_VALIDATED,
      })
      return
    }

    if (locked && !previousLockedState) {
      emit('check-completed', MOTEUR_LEXIQUE_VALIDATED)
    } else if (!locked && previousLockedState) {
      emit('check-removed', MOTEUR_LEXIQUE_VALIDATED)
    }
    previousLockedState = locked
  },
  { immediate: true },
)

/**
 * Fetch TF-IDF — keyword can be overridden (Sprint 11 D4 multi-keyword).
 *
 * Chantier 3 E1-S3 (FR-LEX-PRECHECK-SERP) : `triggerScrape` est honoré côté
 * backend par lexique-analysis.service (AC.LEX-SCRAPE.3 chantier 2). Quand
 * l'utilisateur confirme la modale de scrape, on passe `true`. Sinon
 * `false` et on retombe sur le 404 verbatim (compat C1.1/C2.2) — qui ne
 * doit plus se produire automatiquement grâce au gating watcher serpExists.
 */
async function fetchTfidf(keywordOverride?: string, triggerScrape: boolean = false) {
  const keyword = keywordOverride ?? activeSourceKeyword.value ?? props.captainKeyword
  if (!keyword) return

  isLoading.value = true
  error.value = null

  try {
    log.info(`[LexiquePanel] Fetching TF-IDF for "${keyword}" (triggerScrape=${triggerScrape})`)
    const result = await apiPost<TfidfResult>('/serp/tfidf', {
      keyword,
      articleId: props.selectedArticle?.id ?? undefined,
      triggerScrapeIfMissing: triggerScrape,
    })
    tfidfResult.value = result

    // Initial pre-check: all obligatoire (will be refined by IA upfront)
    const preChecked = new Set<string>()
    for (const term of result.obligatoire) {
      preChecked.add(term.term)
    }
    selectedTerms.value = preChecked

    log.info(`[LexiquePanel] TF-IDF loaded: ${result.obligatoire.length}O + ${result.differenciateur.length}D + ${result.optionnel.length}Op`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    log.error(`[LexiquePanel] TF-IDF fetch failed`, { error: error.value })
  } finally {
    isLoading.value = false
  }
}

/**
 * Sprint 11 — Hydrate past explorations from DB (article-scoped) before any
 * TF-IDF/AI call. When a fresh (<7d) exploration exists for the capitaine,
 * we restore tfidfResult + iaRecommendations straight from the table and skip
 * the SERP/AI roundtrips entirely.
 */
async function hydrateFromDb() {
  const id = props.selectedArticle?.id
  if (!id) return
  try {
    const payload = await apiGet<{ lexique: LexiqueExplorationEntry[] }>(`/articles/${id}/explorations`)
    pastExplorations.value = payload.lexique ?? []
    log.debug('[LexiquePanel] DB hydration', { count: pastExplorations.value.length })

    // Restore the exploration that matches the capitaine, if any.
    const active = activeSourceKeyword.value || props.captainKeyword || ''
    const match = pastExplorations.value.find(e => e.sourceKeyword.toLowerCase() === active.toLowerCase())
    if (match && match.tfidfTerms) {
      tfidfResult.value = match.tfidfTerms
      activeSourceKeyword.value = match.sourceKeyword
      const map = new Map<string, LexiqueTermRecommendation>()
      for (const rec of match.aiRecommendations) map.set(rec.term.toLowerCase(), rec)
      iaRecommendations.value = map
      log.info(`[LexiquePanel] Restored from DB for "${match.sourceKeyword}" (${shouldRegenerate(match.exploredAt) ? 'stale' : 'fresh'})`)
    }
  } catch (err) {
    log.warn(`[LexiquePanel] DB hydration failed — ${(err as Error).message}`)
  }
}

// Auto-restore TF-IDF when captain is locked — prefer DB-first.
//
// Chantier 3 E1-S3 (FR-LEX-PRECHECK-SERP) : on intègre serpExists dans les
// dépendances du watcher pour gater le fetch live. La séquence devient :
//   1. hydrateFromDb (cache article-scoped — sans appel externe).
//   2. Attendre que le pré-check soit résolu (serpExists !== null).
//   3. Si serpExists=false → ne pas tenter POST /serp/tfidf (anti-404).
//      L'utilisateur déclenchera via le CTA + modale de confirmation coût.
//   4. Si serpExists=true → fetcher TF-IDF live si rien restauré depuis le cache.
watch(
  [
    () => props.isCaptaineLocked,
    () => props.captainKeyword,
    () => props.selectedArticle?.id,
    () => serpExists.value,
  ],
  async ([locked, keyword, , exists]) => {
    if (!locked || !keyword) return
    if (!activeSourceKeyword.value) activeSourceKeyword.value = keyword
    await hydrateFromDb()
    // Pré-check pas encore résolu → on attend le prochain tick du watcher.
    if (exists === null) return
    // Pas de scrape SERP disponible → on ne lance PAS l'extraction live.
    // L'utilisateur cliquera sur le CTA pour déclencher le scrape DataForSEO.
    if (exists === false) return
    if (!tfidfResult.value && !isLoading.value) {
      await fetchTfidf(keyword)
    }
  },
  { immediate: true },
)

// Reset when article changes
watch(
  () => props.selectedArticle?.slug,
  () => {
    tfidfResult.value = null
    error.value = null
    selectedTerms.value = new Set()
    iaRecommendations.value = new Map()
    pastExplorations.value = []
    activeSourceKeyword.value = ''
    customKeywordInput.value = ''
    // Sprint 17 — `isLocked` est computed dérivé de keywords.lexique.length.
    // Reset implicite via le store quand l'article change (fetchKeywords).
    iaAbort()
  },
)

onUnmounted(() => {
  iaAbort()
})

/**
 * 2026-05-01 — Variante merge-only de hydrateFromDb. Récupère les explorations
 * Lexique persistées et fusionne SANS doublon dans `pastExplorations`. Appelé
 * par le TabLoadPrompt depuis MoteurView (via defineExpose).
 *
 * Clé d'unicité : `sourceKeyword` (lowercase trim).
 */
async function mergeFromDb() {
  const id = props.selectedArticle?.id
  if (!id) return
  try {
    const payload = await apiGet<{ lexique: LexiqueExplorationEntry[] }>(`/articles/${id}/explorations`)
    const incoming = payload.lexique ?? []
    const seen = new Set(pastExplorations.value.map(e => e.sourceKeyword.trim().toLowerCase()))
    const additions: LexiqueExplorationEntry[] = []
    for (const entry of incoming) {
      const key = entry.sourceKeyword.trim().toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        additions.push(entry)
      }
    }
    if (additions.length > 0) {
      pastExplorations.value = [...pastExplorations.value, ...additions]
    }
    log.info(`[LexiquePanel] Merged ${additions.length} explorations from DB (skipped ${incoming.length - additions.length} duplicates)`)
  } catch (err) {
    log.warn(`[LexiquePanel] DB merge failed — ${(err as Error).message}`)
  }
}

// Chantier 3 E2-S2 — `handleSelectPast` (Sprint 11 chips) supprimé : le
// switch d'onglet passe désormais par `onSelectTab` (TabBar). Cohérent
// avec FR-LEX-MULTI-KEYWORD-TABS / AC.LEX-TABS.2.

defineExpose({ hydrateFromDb, mergeFromDb })
</script>

<template>
  <div class="lexique-extraction">
    <!-- Header: Captain + Lieutenants + Level -->
    <div class="lexique-header">
      <div class="captain-badge">
        <span class="captain-icon">&#127894;</span>
        <span class="captain-keyword">{{ displayedCaptainKeyword ?? '—' }}</span>
      </div>
      <div v-if="selectedLieutenants.length > 0" class="lieutenant-badges">
        <span v-for="lt in selectedLieutenants" :key="lt" class="lt-badge">{{ lt }}</span>
      </div>
      <span v-if="articleLevel" class="level-badge">{{ articleLevel }}</span>
    </div>

    <!-- F3 — Suggestions depuis le basket, ajoutées aux termes lexique sélectionnés -->
    <KeywordAssistPanel
      context="lexique"
      :exclude-keywords="Array.from(selectedTerms)"
      @add="handleAssistAdd"
    />

    <!--
      Chantier 3 E1-S3 (FR-LEX-PRECHECK-SERP) — gating : si aucun scrape SERP
      n'existe pour le captain keyword, on n'expose pas le bouton « Extraire »
      (qui produirait un 404 console). À la place : message explicite + CTA
      *« Lancer l'analyse SERP »* qui ouvre la modale de confirmation coût.
    -->
    <div
      v-if="serpExists === false && captainKeyword"
      class="precheck-prompt"
      data-testid="precheck-missing"
    >
      <p class="precheck-message">
        Le scrape SERP n'est pas encore disponible pour ce mot-clé.
      </p>
      <button
        type="button"
        class="btn-extract btn-precheck"
        data-testid="btn-trigger-serp-scrape"
        :disabled="serpExistsIsChecking"
        @click="openSerpScrapeModal"
      >
        Lancer l'analyse SERP (~$0.003 DataForSEO)
      </button>
    </div>

    <!-- Extract button — visible quand le scrape SERP est confirmé OU quand on
         attend encore le pré-check (cas legacy / état initial avant la première
         vérif). Ne s'affiche jamais quand serpExists=false (gating anti-404). -->
    <div v-else class="extract-controls">
      <button
        class="btn-extract"
        data-testid="btn-extract"
        :disabled="!canExtract"
        @click="extractLexique"
      >
        {{ isLoading ? 'Extraction en cours...' : 'Extraire le Lexique' }}
      </button>
    </div>

    <!-- Modale de confirmation coût scrape SERP (FR-LEX-PRECHECK-SERP). -->
    <ConfirmModal
      :open="showSerpScrapeModal"
      title="Lancer l'analyse SERP DataForSEO ?"
      message="Le scrape récupère les pages Top 10 Google et leur contenu pour calculer le TF-IDF. Coût estimé : $0.003."
      confirm-label="Confirmer (~$0.003)"
      cancel-label="Annuler"
      @confirm="confirmSerpScrape"
      @cancel="cancelSerpScrape"
    />

    <!--
      Chantier 3 E2-S2 (FR-LEX-MULTI-KEYWORD-TABS) — onglets multi-keyword
      remplacent les chips collapsibles. Un onglet par sourceKeyword exploré
      (label brut, cohérence affichage/calcul §2.0) + un onglet « + Tester
      un mot-clé » qui révèle la saisie libre. Le clic onglet est un pur
      switch UI (pas de refetch DB — lecture du cache pastExplorations).
    -->
    <div v-if="selectedArticle?.id" class="lexique-tabs-section">
      <TabBar
        :tabs="lexiqueTabs"
        :active-id="displayedTabId"
        aria-label="Mots-clés explorés pour le Lexique"
        @update:active-id="onSelectTab"
      />
      <LexiqueCustomKeywordInput
        v-if="displayedTabId === '__custom__'"
        :custom-keyword-input="customKeywordInput"
        :is-loading="isLoading"
        :is-locked="isLocked"
        @update:custom-keyword="(v) => customKeywordInput = v"
        @extract-custom="extractCustomKeyword"
      />
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message" data-testid="error-message">
      <p>{{ error }}</p>
    </div>

    <!-- Results -->
    <div v-if="tfidfResult" class="lexique-results" data-testid="lexique-results">

      <!-- IA Analysis Summary (moved BEFORE term sections) -->
      <div class="ia-analysis-section" data-testid="ia-analysis-section">
        <div v-if="iaIsStreaming" class="ia-loading" data-testid="ia-loading">
          <span class="pulse-dot" /> Analyse IA en cours...
        </div>
        <div v-else-if="iaError" class="ia-error" data-testid="ia-error">
          <p>{{ iaError }}</p>
          <button class="btn-retry" @click="generateLexiqueUpfront">Relancer l'analyse IA</button>
        </div>
        <div v-else-if="iaResult" class="ia-summary" data-testid="ia-summary">
          <p>{{ iaResult.summary }}</p>
          <div v-if="iaResult.missingTerms.length > 0" class="ia-missing-terms">
            <strong>Termes manquants :</strong> {{ iaResult.missingTerms.join(', ') }}
          </div>
        </div>
      </div>

      <!-- 2026-05-02 — Barre de tri unifiée (remplace l'ancien toggle "Trier par
           alignement douleur" qui n'avait qu'un critère booléen). Cohérent avec
           Radar / Capitaine / Lieutenants. Le compteur multi-niveau (O/D/Op) est
           absorbé dans le countLabel. -->
      <SortToggleBar
        :options="lexiqueSortOptions"
        :model-value="lexiqueSortState"
        :count-label="`${selectedCount} terme${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''} (${selectedByLevel.obligatoire}O / ${selectedByLevel.differenciateur}D / ${selectedByLevel.optionnel}Op)`"
        data-testid="lexique-sort-bar"
        @update:model-value="(s) => lexiqueSortState = s"
      />

      <!-- 3 sections factorisées via LexiqueTermsList -->
      <LexiqueTermsList
        :title="`Obligatoire (70%+) — ${tfidfResult.obligatoire?.length ?? 0} termes`"
        :terms="tfidfResult.obligatoire"
        :selected-terms="selectedTerms"
        :is-locked="isLocked"
        :default-open="true"
        :is-ia-recommended="isIaRecommended"
        :get-recommendation="getRecommendation"
        :sort-terms-by-alignment="sortTermsByAlignment"
        empty-label="Aucun terme obligatoire identifie."
        @toggle-term="toggleTerm"
      />
      <LexiqueTermsList
        :title="`Differenciateur (30-70%) — ${tfidfResult.differenciateur?.length ?? 0} termes`"
        :terms="tfidfResult.differenciateur"
        :selected-terms="selectedTerms"
        :is-locked="isLocked"
        :default-open="true"
        :is-ia-recommended="isIaRecommended"
        :get-recommendation="getRecommendation"
        :sort-terms-by-alignment="sortTermsByAlignment"
        empty-label="Aucun terme differenciateur identifie."
        @toggle-term="toggleTerm"
      />
      <LexiqueTermsList
        :title="`Optionnel (<30%) — ${tfidfResult.optionnel?.length ?? 0} termes`"
        :terms="tfidfResult.optionnel"
        :selected-terms="selectedTerms"
        :is-locked="isLocked"
        :default-open="false"
        :is-ia-recommended="isIaRecommended"
        :get-recommendation="getRecommendation"
        :sort-terms-by-alignment="sortTermsByAlignment"
        empty-label="Aucun terme optionnel identifie."
        @toggle-term="toggleTerm"
      />

    </div>

    <!-- Sprint 17 — Plus de boutons batch "Verrouiller / Déverrouiller le Lexique".
         Chaque checkbox de terme TF-IDF persiste immédiatement dans keywords.lexique
         via toggleTerm. Voir FR-LEX-CHECKBOX-LOCK-IMMEDIATE. Badge d'état conservé
         pour visibilité utilisateur. -->
    <div v-if="isLocked" class="lexique-lock-status" data-testid="lexique-lock-status">
      <span class="locked-badge">{{ selectedCount }} terme(s) verrouillé(s)</span>
    </div>

    <!-- Sprint C-2 (2026-05-02) — Panel IA Lexique en bas de page. Reprend
         l'analyse upfront (recommandations IA) sous la coque commune. Les
         badges IA-recommandés restent dans le tableau TF-IDF en haut. -->
    <LexiqueAiPanel
      v-if="tfidfResult"
      :ia-is-streaming="iaIsStreaming"
      :ia-error="iaError"
      :recommendations-count="iaRecommendations.size"
      :recommended-count="iaRecommendedCount"
      :not-recommended-count="iaNotRecommendedCount"
      :can-trigger="!!tfidfResult && !iaIsStreaming"
      @trigger="generateLexiqueUpfront"
    />
  </div>
</template>

<style scoped>
.lexique-extraction {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* --- Header --- */
.lexique-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background: var(--color-block-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 8px;
}

.captain-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
}

.captain-icon {
  font-size: 1.125rem;
}

.lieutenant-badges {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.lt-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-badge-blue-bg, #dbeafe);
  border-radius: 999px;
}

.level-badge {
  margin-left: auto;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  background: var(--color-badge-blue-bg, #dbeafe);
  border-radius: 999px;
}

/* --- Controls --- */
.extract-controls {
  display: flex;
  align-items: center;
}

/* Chantier 3 E1-S3 (FR-LEX-PRECHECK-SERP) — état pré-check missing. */
.precheck-prompt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-amber-bg, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: 8px;
}

.precheck-message {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text, #0f172a);
}

.btn-precheck {
  background: var(--color-warning, #f59e0b);
}

.btn-precheck:hover:not(:disabled) {
  background: var(--color-warning-hover, #d97706);
}

.btn-extract {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-extract:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-extract:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Error --- */
.error-message {
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 8px;
}

.error-message p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

/* --- Results --- */
.lexique-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* --- IA Analysis Section --- */
.ia-analysis-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.ia-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success, #22c55e);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ia-error {
  padding: 0.5rem;
  background: var(--color-block-error-bg, #fef2f2);
  border-radius: 6px;
}

.ia-error p {
  margin: 0 0 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--color-error, #ef4444);
}

.btn-retry {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
}

.btn-retry:hover {
  background: var(--color-primary);
  color: white;
}

.ia-summary {
  font-size: 0.8125rem;
  line-height: 1.5;
}

.ia-summary p {
  margin: 0;
}

.ia-missing-terms {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border-radius: 4px;
  font-size: 0.8125rem;
}

/* --- Lock/Unlock --- */
.lexique-lock {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lock-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-success, #22c55e);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.lock-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locked-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success, #22c55e);
}

.unlock-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
}

.unlock-btn:hover {
  border-color: var(--color-warning, #f59e0b);
  color: var(--color-warning, #f59e0b);
}

</style>
