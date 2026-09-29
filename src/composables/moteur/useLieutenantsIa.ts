import { ref, type Ref } from 'vue'
import { useStreaming } from '@/composables/editor/useStreaming'
import { isResponseForCurrentArticle } from '@/utils/article-scope'
import { log } from '@/utils/logger'
import { recurringHeadings } from '@shared/utils/hn-structure.js'
import { proposeLieutenantsContract } from '@shared/contracts/lieutenants.contract.js'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import type {
  FilteredProposeLieutenantsResult,
  ProposedLieutenant,
  HnRecurrenceItem,
} from '@shared/types/serp-analysis.types.js'
import type { SelectedArticle, SerpAnalysisResult, SerpCompetitor } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'

/**
 * AUTHORITY: PostgreSQL `lieutenant_explorations` (propositions) + `article_keywords`
 *            (lieutenants retenus, via useArticleKeywordsStore).
 * READS FROM: GET /articles/:id/keywords (hydratation via useArticleKeywordsStore)
 * WRITES TO: POST /keywords/:keyword/propose-lieutenants (candidats et tri)
 * CONSUMERS: LieutenantsPanel (cartes proposées / éliminées, cases à cocher)
 * RELATED FR: FR-LIE-AI-FRONTIER, FR-LIE-CHECKBOX-LOCK-IMMEDIATE,
 *             NFR-INT-DISPLAY-CONTRACTS (contrat `propose-lieutenants`)
 *
 * Vague 3 — Composable extrait de LieutenantsPanel. Encapsule la Phase 2 IA :
 * streaming propose-lieutenants, cards selected/eliminated, contentGap,
 * restoration depuis DB. La structure H1/H2/H3 n'est plus produite ici : elle
 * naît à l'onglet Structure, des lieutenants retenus (FR-HN-TAB, M7).
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
  contentGapInsights: Ref<string>
  selectedCards: Ref<Map<string, ProposedLieutenant>>
  currentStep: Ref<AnalysisStep>

  toggleLieutenant: (card: ProposedLieutenant) => void
  proposeLieutenants: () => void
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

  const lieutenantCards = ref<ProposedLieutenant[]>([])
  const eliminatedCards = ref<ProposedLieutenant[]>([])
  const totalGenerated = ref(0)
  const contentGapInsights = ref('')
  const selectedCards = ref<Map<string, ProposedLieutenant>>(new Map())
  const currentStep = ref<AnalysisStep>('idle')

  function toggleLieutenant(card: ProposedLieutenant): void {

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

    // Persist statuses on `lieutenant_explorations` (saveDecisions ne touche pas cette table).
    // Sans cela, unlock ne survit pas au reload.
    const articleId = selectedArticle.value?.id
    const captainKw = captainKeyword.value
    const richLts = articleKeywordsStore.keywords?.richLieutenants
    if (articleId && captainKw && richLts && richLts.length > 0) {
      void articleKeywordsStore.saveLieutenantExplorationEntries(
        articleId,
        richLts,
        captainKw,
      )
    }
    void articleKeywordsStore.saveDecisions(selectedArticle.value!.id)
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
        // Pas évalué par l'IA : « — », pas un faux 0.
        score: null,
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
      // Ancienne liste sans détail : score inconnu → « — ».
      score: null,
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
      ? recurringHeadings(computeHnRecurrenceFrom(captainResult.competitors))
      : recurringHeadings(hnRecurrence.value)

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
        hnRecurrence: recurringHeadings(computeHnRecurrenceFrom(result.competitors)),
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
          contentGapInsights.value = data.contentGapInsights

          // Step 3: Assign cards directly from AI data (no batch KPI)
          currentStep.value = 'filtering'
          lieutenantCards.value = data.selectedLieutenants
          eliminatedCards.value = data.eliminatedLieutenants

          // FR-LIE-CHECKBOX-LOCK-IMMEDIATE : l'IA propose, l'utilisateur valide.
          // Les cartes arrivent donc décochées. Pré-cocher afficherait des
          // Lieutenants « retenus » sans qu'aucun ne soit verrouillé en base :
          // l'écran et la base se contrediraient, et l'étape passerait au vert
          // sans décision humaine — alors que ces mots-clés deviennent les H2/H3
          // de l'article.
          selectedCards.value = new Map()
          onLieutenantsUpdated([])
          currentStep.value = 'done'
          log.info(`[useLieutenantsIa] ${data.selectedLieutenants.length} propositions à valider`)

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
              })),
              ...data.eliminatedLieutenants.map(lt => ({
                keyword: lt.keyword,
                status: 'eliminated' as const,
                reasoning: lt.reasoning,
                sources: lt.sources,
                suggestedHnLevel: lt.suggestedHnLevel,
                score: lt.score,
                kpis: null,
              })),
            ]
            articleKeywordsStore.saveLieutenantExplorationEntries(articleId, allEntries, captainKeyword.value!)
          }
        },
      },
      { contract: proposeLieutenantsContract },
    )
  }

  function resetIaState(): void {
    iaAbort()
    lieutenantCards.value = []
    eliminatedCards.value = []
    totalGenerated.value = 0
    selectedCards.value = new Map()
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
    contentGapInsights,
    selectedCards,
    currentStep,
    toggleLieutenant,
    proposeLieutenants,
    handleAssistAdd,
    restoreLockedLieutenants,
    resetIaState,
  }
}
