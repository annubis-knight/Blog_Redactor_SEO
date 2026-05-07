import { ref, type Ref } from 'vue'
import { useStreaming } from '@/composables/editor/useStreaming'
import { isResponseForCurrentArticle } from '@/utils/article-scope'
import { log } from '@/utils/logger'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import type {
  FilteredProposeLieutenantsResult,
  ProposedLieutenant,
  ProposeLieutenantsHnNode,
  HnRecurrenceItem,
} from '@shared/types/serp-analysis.types.js'
import type { SelectedArticle, SerpAnalysisResult, SerpCompetitor } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'

/**
 * AUTHORITY: PostgreSQL `article_keywords.hn_structure` JSONB (ProposeLieutenantsHnNode[])
 * READS FROM: GET /articles/:id/keywords (hydratation via useArticleKeywordsStore)
 * WRITES TO: POST /keywords/:keyword/propose-lieutenants (full regen, lieutenants + HN)
 *           POST /keywords/:keyword/ai-hn-structure (HN-only regen avec lockedHeadings)
 * CONSUMERS: LieutenantH2Structure (affichage + lock par titre + bouton Régénérer),
 *            useLieutenantsHn (saveHnStructure → PUT /articles/:id outline + keywords)
 * RELATED FR: FR-LIE-AI-FRONTIER, FR-MOT-HN-EMPTY-VISIBLE (2026-05-07),
 *             FR-MOT-HN-REGEN-LOCKED (2026-05-07)
 *
 * Vague 3 — Composable extrait de LieutenantsPanel. Encapsule la Phase 2 IA :
 * streaming propose-lieutenants, cards selected/eliminated, structure Hn,
 * contentGap, restoration depuis DB, et régénération HN seule avec headings
 * verrouillés.
 *
 * NOTE : `hnStructure` est exposé en Ref mutable car le composable
 * `useLieutenantsHn` le lit pour le `saveHnStructure`. Le composable IA le set
 * dans `proposeLieutenants.onDone` ET `regenerateHnStructure.onDone`.
 */
export type AnalysisStep = 'idle' | 'serp' | 'ia-proposal' | 'filtering' | 'done'

export interface LieutenantsIaDeps {
  captainKeyword: Ref<string | null>
  articleLevel: Ref<ArticleLevel | null>
  selectedArticle: Ref<SelectedArticle | null>
  serpResult: Ref<SerpAnalysisResult | null>
  serpResultsByKeyword: Ref<Map<string, SerpAnalysisResult>>
  resolvedRootKeywords: Ref<string[]>
  wordGroups: Ref<WordGroup[]>
  cocoonSlug: Ref<string>
  isLocked: Ref<boolean>
  articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
  /** Helper du composable SERP (réutilisé pour `proposeLieutenants` HN). */
  computeHnRecurrenceFrom: (comps: SerpCompetitor[]) => HnRecurrenceItem[]
  /** Hn recurrence agrégé du composable SERP (fallback dans `proposeLieutenants`). */
  hnRecurrence: Ref<HnRecurrenceItem[]>
  /**
   * Callback émis depuis le composable lorsque la sélection courante change.
   * Le parent l'utilise pour `emit('lieutenants-updated', selected)`.
   */
  onLieutenantsUpdated: (keywords: string[]) => void
}

export interface LieutenantsIaApi {
  iaIsStreaming: Ref<boolean>
  iaChunks: Ref<string>
  iaError: Ref<string | null>
  iaAbort: () => void
  lieutenantCards: Ref<ProposedLieutenant[]>
  eliminatedCards: Ref<ProposedLieutenant[]>
  totalGenerated: Ref<number>
  hnStructure: Ref<ProposeLieutenantsHnNode[]>
  contentGapInsights: Ref<string>
  selectedCards: Ref<Map<string, ProposedLieutenant>>
  currentStep: Ref<AnalysisStep>
  /** True pendant la régénération HN seule (différent de iaIsStreaming pour l'UI). */
  hnRegenStreaming: Ref<boolean>
  hnRegenError: Ref<string | null>

  toggleLieutenant: (card: ProposedLieutenant) => void
  proposeLieutenants: () => void
  /**
   * Régénère UNIQUEMENT la structure Hn via /ai-hn-structure, sans toucher
   * aux lieutenantCards/selectedCards. Utilise les lieutenants actuellement
   * cochés et les headings verrouillés par l'utilisateur.
   */
  regenerateHnStructure: (lockedHeadings: ProposeLieutenantsHnNode[]) => void
  handleAssistAdd: (keyword: string) => void
  restoreLockedLieutenants: () => void
  /** Reset complet de l'état IA — utilisé par parent dans refreshSERP / reset cycle. */
  resetIaState: () => void
}

export function useLieutenantsIa(deps: LieutenantsIaDeps): LieutenantsIaApi {
  const {
    captainKeyword, articleLevel, selectedArticle,
    serpResult, serpResultsByKeyword, resolvedRootKeywords,
    wordGroups, cocoonSlug,
    // Sprint 17 — `isLocked` n'est plus utilisé dans le composable depuis
    // FR-LIE-CHECKBOX-LOCK-IMMEDIATE (toggleLieutenant fonctionne toujours,
    // pas de garde). Conservé dans LieutenantsIaDeps pour compat tests existants.
    articleKeywordsStore,
    computeHnRecurrenceFrom, hnRecurrence,
    onLieutenantsUpdated,
  } = deps

  const {
    chunks: iaChunks,
    isStreaming: iaIsStreaming,
    error: iaError,
    startStream: iaStartStream,
    abort: iaAbort,
  } = useStreaming<FilteredProposeLieutenantsResult>()

  // Stream HN-only (régénération de structure sans toucher aux cards).
  const {
    isStreaming: hnRegenStreaming,
    error: hnRegenError,
    startStream: hnRegenStartStream,
  } = useStreaming<{ hnStructure: ProposeLieutenantsHnNode[]; justification?: string }>()

  const lieutenantCards = ref<ProposedLieutenant[]>([])
  const eliminatedCards = ref<ProposedLieutenant[]>([])
  const totalGenerated = ref(0)
  const hnStructure = ref<ProposeLieutenantsHnNode[]>([])
  const contentGapInsights = ref('')
  const selectedCards = ref<Map<string, ProposedLieutenant>>(new Map())
  const currentStep = ref<AnalysisStep>('idle')

  function toggleLieutenant(card: ProposedLieutenant): void {
    // Sprint 17 — Plus de garde isLocked : le verrouillage est désormais
    // par mot-clé (FR-LIE-CHECKBOX-LOCK-IMMEDIATE), pas par container.
    // Cocher = lock immédiat en DB. Décocher = unlock immédiat en DB.
    const next = new Map(selectedCards.value)
    if (next.has(card.keyword)) {
      next.delete(card.keyword)
      articleKeywordsStore.unlockLieutenant(card.keyword)
    } else {
      next.set(card.keyword, card)
      articleKeywordsStore.lockLieutenant({
        keyword: card.keyword,
        reasoning: card.reasoning,
        sources: card.sources,
        suggestedHnLevel: card.suggestedHnLevel,
        score: card.score,
      })
    }
    selectedCards.value = next
    onLieutenantsUpdated(Array.from(next.keys()))
  }

  /** F3 — Ajoute un mot-clé (suggéré par le basket) à la liste des propositions
   *  lieutenants sans lancer de SERP/IA. */
  function handleAssistAdd(keyword: string): void {
    if (lieutenantCards.value.some(c => c.keyword.toLowerCase() === keyword.toLowerCase())) return
    lieutenantCards.value = [
      ...lieutenantCards.value,
      {
        keyword,
        reasoning: 'Proposé depuis votre panier',
        sources: [],
        suggestedHnLevel: 2 as const,
        score: 0,
      },
    ]
    log.info('[useLieutenantsIa] Assist add', { keyword, total: lieutenantCards.value.length })
  }

  /** Restore lieutenant cards from saved data when in locked state */
  function restoreLockedLieutenants(): void {
    if (lieutenantCards.value.length > 0) return // already restored

    // Prefer rich data if available
    const richLts = articleKeywordsStore.keywords?.richLieutenants
    if (richLts && richLts.length > 0) {
      const locked = richLts.filter(lt => lt.status === 'locked')
      const suggested = richLts.filter(lt => lt.status === 'suggested')
      const eliminated = richLts.filter(lt => lt.status === 'eliminated')
      // Affichage = locked + suggested
      lieutenantCards.value = [...locked, ...suggested].map(lt => ({
        keyword: lt.keyword,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
      }))
      eliminatedCards.value = eliminated.map(lt => ({
        keyword: lt.keyword,
        reasoning: lt.reasoning,
        sources: lt.sources,
        suggestedHnLevel: lt.suggestedHnLevel,
        score: lt.score,
      }))
      // Pré-cocher uniquement les 'locked'
      const selected = new Map<string, ProposedLieutenant>()
      for (const lt of locked) {
        selected.set(lt.keyword, {
          keyword: lt.keyword,
          reasoning: lt.reasoning,
          sources: lt.sources,
          suggestedHnLevel: lt.suggestedHnLevel,
          score: lt.score,
        })
      }
      selectedCards.value = selected
      onLieutenantsUpdated(Array.from(selected.keys()))
      log.info('[useLieutenantsIa] Lieutenants restored from rich data', {
        locked: locked.length, suggested: suggested.length, eliminated: eliminated.length,
      })
      return
    }

    // Fallback: flat lieutenants[] (backward compat)
    const lieutenants = articleKeywordsStore.keywords?.lieutenants
    if (!lieutenants || lieutenants.length === 0) return

    const cards: ProposedLieutenant[] = lieutenants.map(kw => ({
      keyword: kw,
      reasoning: '',
      sources: [],
      suggestedHnLevel: 2 as const,
      score: 0,
    }))
    lieutenantCards.value = cards
    const selected = new Map<string, ProposedLieutenant>()
    for (const card of cards) {
      selected.set(card.keyword, card)
    }
    selectedCards.value = selected
    onLieutenantsUpdated(Array.from(selected.keys()))
    log.info('[useLieutenantsIa] Lieutenants restored from flat data', { count: lieutenants.length })
  }

  function proposeLieutenants(): void {
    if (!captainKeyword.value || !serpResult.value || !selectedArticle.value) return
    iaAbort()
    lieutenantCards.value = []
    eliminatedCards.value = []
    totalGenerated.value = 0
    selectedCards.value = new Map()
    currentStep.value = 'ia-proposal'

    // Captain-only SERP data (high weight)
    const captainResult = serpResultsByKeyword.value.get(captainKeyword.value)
    const captainHn = captainResult
      ? computeHnRecurrenceFrom(captainResult.competitors)
          .filter(h => h.percent >= 10)
          .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))
      : hnRecurrence.value
          .filter(h => h.percent >= 10)
          .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))

    const captainCompetitors = captainResult
      ? captainResult.competitors.filter(c => !c.fetchError).map(c => ({ domain: c.domain, title: c.title, position: c.position }))
      : serpResult.value.competitors.filter(c => !c.fetchError).map(c => ({ domain: c.domain, title: c.title, position: c.position }))

    const captainPaa = captainResult
      ? captainResult.paaQuestions.map(q => ({ question: q.question, answer: q.answer }))
      : serpResult.value.paaQuestions.map(q => ({ question: q.question, answer: q.answer }))

    // Root keywords SERP data (lower weight — different search intent)
    const rootKeywordsSerpData: Array<{
      keyword: string
      competitors: { domain: string; title: string; position: number }[]
      hnRecurrence: { level: number; text: string; count: number; percent: number }[]
      paaQuestions: { question: string; answer?: string }[]
    }> = []

    for (const [kw, result] of serpResultsByKeyword.value) {
      if (kw === captainKeyword.value) continue
      rootKeywordsSerpData.push({
        keyword: kw,
        competitors: result.competitors.filter(c => !c.fetchError).map(c => ({ domain: c.domain, title: c.title, position: c.position })),
        hnRecurrence: computeHnRecurrenceFrom(result.competitors)
          .filter(h => h.percent >= 10)
          .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent })),
        paaQuestions: result.paaQuestions.map(q => ({ question: q.question, answer: q.answer ?? undefined })),
      })
    }

    iaStartStream(
      `/api/keywords/${encodeURIComponent(captainKeyword.value)}/propose-lieutenants`,
      {
        level: articleLevel.value ?? 'intermediaire',
        articleId: selectedArticle.value?.id ?? 0,
        serpHeadings: captainHn,
        paaQuestions: captainPaa,
        wordGroups: wordGroups.value.map(g => g.word),
        rootKeywords: resolvedRootKeywords.value,
        serpCompetitors: captainCompetitors,
        rootKeywordsSerpData,
        ...(cocoonSlug.value ? { cocoonSlug: cocoonSlug.value } : {}),
      },
      {
        onDone: (data) => {
          log.info(`[useLieutenantsIa] IA generated ${data.totalGenerated} lieutenants, selected ${data.selectedLieutenants.length}, eliminated ${data.eliminatedLieutenants.length}`)
          totalGenerated.value = data.totalGenerated
          hnStructure.value = data.hnStructure ?? []
          contentGapInsights.value = data.contentGapInsights ?? ''

          // Step 3: Assign cards directly from AI data (no batch KPI)
          currentStep.value = 'filtering'
          lieutenantCards.value = data.selectedLieutenants
          eliminatedCards.value = data.eliminatedLieutenants

          // Pre-select all filtered-in lieutenants
          const preSelected = new Map<string, ProposedLieutenant>()
          for (const lt of data.selectedLieutenants) {
            preSelected.set(lt.keyword, lt)
          }
          selectedCards.value = preSelected
          onLieutenantsUpdated(Array.from(preSelected.keys()))
          currentStep.value = 'done'
          log.info(`[useLieutenantsIa] Selection complete: ${preSelected.size} pre-selected`)

          // Auto-save lieutenant explorations directly to lieutenant_explorations table.
          const articleId = selectedArticle.value?.id
          if (articleId && isResponseForCurrentArticle(articleKeywordsStore.keywords?.articleId, articleId)) {
            articleKeywordsStore.saveRichLieutenantProposals(data.selectedLieutenants, data.eliminatedLieutenants)
            const allEntries = [
              ...data.selectedLieutenants.map(lt => ({
                keyword: lt.keyword,
                status: 'suggested' as const,
                reasoning: lt.reasoning,
                sources: lt.sources,
                suggestedHnLevel: lt.suggestedHnLevel,
                score: lt.score,
                kpis: null,
                lockedAt: null,
              })),
              ...data.eliminatedLieutenants.map(lt => ({
                keyword: lt.keyword,
                status: 'eliminated' as const,
                reasoning: lt.reasoning,
                sources: lt.sources,
                suggestedHnLevel: lt.suggestedHnLevel,
                score: lt.score,
                kpis: null,
                lockedAt: null,
              })),
            ]
            articleKeywordsStore.saveLieutenantExplorationEntries(articleId, allEntries, captainKeyword.value!)
          }
        },
      },
    )
  }

  /**
   * Régénère uniquement la structure Hn à partir des lieutenants actuellement
   * cochés (selectedCards) + un éventuel set de headings verrouillés que l'IA
   * doit conserver tels quels. Aucune mutation de lieutenantCards/selectedCards.
   *
   * Précondition : au moins un lieutenant coché (sinon early return silencieux).
   */
  function regenerateHnStructure(lockedHeadings: ProposeLieutenantsHnNode[]): void {
    if (!captainKeyword.value || !selectedArticle.value) return
    const lieutenants = Array.from(selectedCards.value.keys())
    if (lieutenants.length === 0) {
      log.warn('[useLieutenantsIa] regenerateHnStructure called with no selected lieutenants — abort')
      return
    }

    // Hn recurrence concurrent : préfère le SERP du Capitaine, fallback agrégé.
    const captainResult = serpResult.value
      ? serpResultsByKeyword.value.get(captainKeyword.value)
      : null
    const concurrentHn = captainResult
      ? computeHnRecurrenceFrom(captainResult.competitors)
          .filter(h => h.percent >= 10)
          .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))
      : hnRecurrence.value
          .filter(h => h.percent >= 10)
          .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))

    log.info('[useLieutenantsIa] HN regenerate', {
      keyword: captainKeyword.value,
      lieutenants: lieutenants.length,
      lockedHeadings: lockedHeadings.length,
      concurrentHn: concurrentHn.length,
    })

    hnRegenStartStream(
      `/api/keywords/${encodeURIComponent(captainKeyword.value)}/ai-hn-structure`,
      {
        lieutenants,
        level: articleLevel.value ?? 'intermediaire',
        hnStructure: concurrentHn,
        lockedHeadings,
        articleId: selectedArticle.value?.id ?? 0,
        ...(cocoonSlug.value ? { cocoonSlug: cocoonSlug.value } : {}),
      },
      {
        onDone: (data) => {
          if (!Array.isArray(data?.hnStructure)) {
            log.warn('[useLieutenantsIa] HN regenerate: missing hnStructure in response')
            return
          }
          hnStructure.value = data.hnStructure
          log.info(`[useLieutenantsIa] HN regenerate done: ${data.hnStructure.length} top-level nodes`)
        },
      },
    )
  }

  function resetIaState(): void {
    iaAbort()
    lieutenantCards.value = []
    eliminatedCards.value = []
    totalGenerated.value = 0
    selectedCards.value = new Map()
    hnStructure.value = []
    contentGapInsights.value = ''
    currentStep.value = 'idle'
  }

  return {
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
    resetIaState,
  }
}
