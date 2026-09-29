/**
 * AUTHORITY: PostgreSQL `article_keywords.hn_structure` (via `articleKeywordsStore.saveStructure`)
 *            + `article_content.outline` (sommaire de la Rédaction, écrit à la validation).
 * READS FROM: articleKeywordsStore (capitaine, lieutenants retenus, structure enregistrée) ;
 *             POST /serp/analyze (SERP du capitaine : base seulement à l'ouverture,
 *             analyse payante seulement sur « Proposer », M18) ;
 *             GET /articles/:id/content (sommaire actuel, pour ne pas écraser
 *             un sommaire retouché dans la Rédaction, M20).
 * WRITES TO: PUT /articles/:id/keywords (structure), PUT /articles/:id { outline },
 *            PUT /articles/:id/micro-context (longueur conseillée si aucune n'est choisie),
 *            POST /keywords/:keyword/ai-hn-structure (proposition de structure).
 * CONSUMERS: StructureHnPanel (onglet Structure du Moteur).
 * RELATED FR: FR-HN-TAB, FR-HN-LOCK-GATE, FR-CER-WORD-COUNT-RECOMMEND
 *
 * La structure H1/H2/H3 naît des lieutenants RETENUS, après leur verrou
 * (M7 : elle naissait avec les candidats, avant tout choix). Elle devient le
 * sommaire de la rédaction quand l'utilisateur la valide.
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { useStreaming } from '@/composables/editor/useStreaming'
import { hnToOutline } from '@/stores/article/outline.store'
import { log } from '@/utils/logger'
import { serpAnalysisContract, serpAnalysisStoredContract } from '@shared/contracts/serp.contract.js'
import { hnOutlineContract, type HnOutlineResult } from '@shared/contracts/lieutenants.contract.js'
import { computeHnRecurrence, recurringHeadings } from '@shared/utils/hn-structure.js'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import type { useCostLogStore } from '@/stores/ui/cost-log.store'
import type { SelectedArticle, SerpAnalysisResult } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { HnRecurrenceItem, ProposeLieutenantsHnNode } from '@shared/types/serp-analysis.types.js'

export interface StructureHnDeps {
  selectedArticle: Ref<SelectedArticle | null>
  captainKeyword: Ref<string | null>
  articleLevel: Ref<ArticleLevel | null>
  cocoonSlug: Ref<string>
  articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
  activityLog: ReturnType<typeof useCostLogStore>
  /**
   * Le sommaire de la Rédaction a été retouché depuis la dernière structure
   * validée : le remplacer ? (par défaut, une confirmation du navigateur).
   */
  confirmReplaceOutline?: () => boolean
}

export interface StructureHnApi {
  /** Structure en cours d'édition (copie de travail). */
  structure: Ref<ProposeLieutenantsHnNode[]>
  /** La copie de travail diffère de la structure enregistrée. */
  dirty: ComputedRef<boolean>
  /** Lieutenants retenus : la matière de la structure. */
  lockedLieutenants: ComputedRef<string[]>
  /** SERP du capitaine (une seule entrée) et récurrence de ses titres. */
  serpResultsByKeyword: Ref<Map<string, SerpAnalysisResult>>
  recurrence: Ref<HnRecurrenceItem[]>
  isLoadingCompetitors: Ref<boolean>
  competitorsError: Ref<string | null>
  /** Aucune analyse des concurrents en base : elle partira avec « Proposer ». */
  competitorsMissing: Ref<boolean>
  isGenerating: Ref<boolean>
  generateError: Ref<string | null>
  isSaving: Ref<boolean>
  /** Signal bref « enregistré ». */
  saved: Ref<boolean>
  /** Recharge la structure enregistrée dans la copie de travail. */
  restore: () => void
  /**
   * Lit la SERP du capitaine et calcule la récurrence des titres. Par défaut,
   * la base seulement ; `fetchIfMissing` autorise l'analyse payante (sur un clic).
   */
  loadCompetitors: (opts?: { fetchIfMissing?: boolean }) => Promise<void>
  /** Propose une structure à partir des lieutenants retenus ; les titres verrouillés restent. */
  generate: (lockedHeadings: ProposeLieutenantsHnNode[]) => Promise<void>
  /** Enregistre la structure (sans la valider). */
  save: () => Promise<boolean>
  /**
   * Prépare la validation : structure enregistrée, sommaire de la Rédaction
   * écrit (sauf sommaire retouché que l'utilisateur garde), longueur conseillée
   * recalculée. Faux si la structure ou le sommaire ne sont pas enregistrés.
   */
  prepareValidation: () => Promise<boolean>
}

const sameStructure = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

type OutlineLike = { sections?: Array<{ level: number; title: string }> } | null | undefined

/** Un sommaire réduit à ses titres : les identifiants changent à chaque construction. */
const outlineKey = (outline: OutlineLike): string =>
  (outline?.sections ?? []).map(s => `${s.level}:${s.title.trim()}`).join('|')

const confirmInBrowser = (): boolean =>
  window.confirm('Le sommaire de la Rédaction a été retouché depuis la dernière structure validée. Le remplacer par cette structure ?')

export function useStructureHn(deps: StructureHnDeps): StructureHnApi {
  const { selectedArticle, captainKeyword, articleLevel, cocoonSlug, articleKeywordsStore, activityLog } = deps
  const confirmReplaceOutline = deps.confirmReplaceOutline ?? confirmInBrowser

  const structure = ref<ProposeLieutenantsHnNode[]>([])
  const serpResultsByKeyword = ref<Map<string, SerpAnalysisResult>>(new Map())
  const recurrence = ref<HnRecurrenceItem[]>([])
  const isLoadingCompetitors = ref(false)
  const competitorsError = ref<string | null>(null)
  const competitorsMissing = ref(false)
  const isSaving = ref(false)
  const saved = ref(false)
  const generateError = ref<string | null>(null)
  const { isStreaming: isGenerating, startStream } = useStreaming<HnOutlineResult>()

  const savedStructure = computed(() => articleKeywordsStore.keywords?.hnStructure ?? [])
  const dirty = computed(() => !sameStructure(structure.value, savedStructure.value))

  const lockedLieutenants = computed(() => {
    const rich = articleKeywordsStore.lockedLieutenants.map(lt => lt.keyword)
    return rich.length > 0 ? rich : [...(articleKeywordsStore.keywords?.lieutenants ?? [])]
  })

  function restore(): void {
    structure.value = [...savedStructure.value]
  }

  async function loadCompetitors(opts: { fetchIfMissing?: boolean } = {}): Promise<void> {
    const captain = captainKeyword.value
    if (!captain || isLoadingCompetitors.value) return
    isLoadingCompetitors.value = true
    competitorsError.value = null
    try {
      // Sans clic, la base seulement : ouvrir l'onglet ne paie aucune analyse (M18).
      const body = {
        keyword: captain,
        topN: 10,
        articleLevel: articleLevel.value ?? 'intermediaire',
        articleId: selectedArticle.value?.id ?? undefined,
      }
      const result = opts.fetchIfMissing
        ? await apiPost<SerpAnalysisResult>('/serp/analyze', body, { contract: serpAnalysisContract })
        : await apiPost<SerpAnalysisResult | null>('/serp/analyze', { ...body, cacheOnly: true }, { contract: serpAnalysisStoredContract })
      competitorsMissing.value = result === null
      if (result === null) {
        serpResultsByKeyword.value = new Map()
        recurrence.value = []
        return
      }
      serpResultsByKeyword.value = new Map([[captain, result]])
      recurrence.value = computeHnRecurrence(result.competitors)
    } catch (err) {
      competitorsError.value = `Structure des concurrents indisponible : ${(err as Error).message}`
      log.warn('[useStructureHn] SERP du capitaine illisible', { captain, error: (err as Error).message })
    } finally {
      isLoadingCompetitors.value = false
    }
  }

  async function generate(lockedHeadings: ProposeLieutenantsHnNode[]): Promise<void> {
    const captain = captainKeyword.value
    const id = selectedArticle.value?.id
    if (!captain || !id || lockedLieutenants.value.length === 0) return
    generateError.value = null
    await startStream(
      `/api/keywords/${encodeURIComponent(captain)}/ai-hn-structure`,
      {
        lieutenants: lockedLieutenants.value,
        level: articleLevel.value ?? 'intermediaire',
        hnStructure: recurringHeadings(recurrence.value),
        lockedHeadings,
        articleId: id,
        ...(cocoonSlug.value ? { cocoonSlug: cocoonSlug.value } : {}),
      },
      {
        onDone: (data) => {
          structure.value = data.hnStructure
          log.info('[useStructureHn] structure proposée', { nodes: data.hnStructure.length })
        },
        onError: (message) => { generateError.value = message },
      },
      { contract: hnOutlineContract },
    )
  }

  async function save(): Promise<boolean> {
    const id = selectedArticle.value?.id
    if (!id || structure.value.length === 0) return false
    isSaving.value = true
    try {
      const ok = await articleKeywordsStore.saveStructure(id, structure.value)
      if (ok) {
        saved.value = true
        setTimeout(() => { saved.value = false }, 2000)
      }
      return ok
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Longueur conseillée d'après la structure validée ; écrite dans le
   * micro-contexte seulement si l'utilisateur n'en a choisi aucune.
   */
  async function recommendWordCount(id: number): Promise<void> {
    try {
      const reco = await apiPost<{ recommended: number; breakdown: { reasoning: string } }>(`/articles/${id}/recommend-word-count`, {})
      if (!reco?.recommended) return
      const existing = await apiGet<{ targetWordCount?: number; angle?: string; tone?: string; directives?: string } | null>(
        `/articles/${id}/micro-context`,
      ).catch(() => null)
      const custom = existing?.targetWordCount != null
      if (!custom) {
        await apiPut(`/articles/${id}/micro-context`, {
          angle: existing?.angle ?? 'Angle à préciser (suggéré à la validation de la structure)',
          tone: existing?.tone ?? '',
          directives: existing?.directives ?? '',
          targetWordCount: reco.recommended,
        })
      }
      activityLog.addMessage(
        'info',
        `💡 Longueur conseillée : ${reco.recommended.toLocaleString('fr-FR')} mots`,
        custom
          ? `${reco.breakdown.reasoning} · Valeur choisie conservée (${existing?.targetWordCount} mots).`
          : `${reco.breakdown.reasoning} · Modifiable dans la Rédaction.`,
      )
    } catch (err) {
      log.warn(`[useStructureHn] recommend-word-count impossible : ${(err as Error).message}`)
    }
  }

  /**
   * Le sommaire enregistré a été retouché dans la Rédaction : il n'est ni celui
   * de la structure validée précédemment, ni celui de la nouvelle.
   */
  async function outlineRetouched(id: number, title: string, previous: ProposeLieutenantsHnNode[], next: string): Promise<boolean> {
    try {
      const content = await apiGet<{ outline: OutlineLike | string }>(`/articles/${id}/content`)
      const stored = typeof content?.outline === 'string' ? JSON.parse(content.outline) as OutlineLike : content?.outline
      const current = outlineKey(stored)
      if (!current) return false
      return current !== next && (previous.length === 0 || current !== outlineKey(hnToOutline(previous, title)))
    } catch (err) {
      log.warn(`[useStructureHn] sommaire actuel illisible : ${(err as Error).message}`)
      return false
    }
  }

  async function prepareValidation(): Promise<boolean> {
    const id = selectedArticle.value?.id
    const title = selectedArticle.value?.title
    if (!id || !title || structure.value.length === 0) return false
    const previous = [...savedStructure.value]
    if (!(await save())) return false

    // La porte lit la base : le sommaire et la longueur partent AVANT l'étape.
    const outline = hnToOutline(structure.value, title)
    if (await outlineRetouched(id, title, previous, outlineKey(outline)) && !confirmReplaceOutline()) {
      // Le sommaire retouché à la main est gardé (M20) : il était écrasé sans prévenir.
      activityLog.addMessage('info', 'Sommaire de la Rédaction conservé', 'Retouché depuis la dernière structure validée : il n’a pas été remplacé.')
    } else {
      try {
        await apiPut(`/articles/${id}`, { outline })
      } catch (err) {
        // Sans sommaire, la Rédaction suivrait un autre plan que la structure validée (M20).
        log.warn(`[useStructureHn] sommaire non enregistré : ${(err as Error).message}`)
        generateError.value = 'Le sommaire de la Rédaction n’a pas pu être enregistré : la structure n’est pas validée.'
        return false
      }
    }
    await recommendWordCount(id)
    return true
  }

  return {
    structure, dirty, lockedLieutenants,
    serpResultsByKeyword, recurrence, isLoadingCompetitors, competitorsError, competitorsMissing,
    isGenerating, generateError, isSaving, saved,
    restore, loadCompetitors, generate, save, prepareValidation,
  }
}
