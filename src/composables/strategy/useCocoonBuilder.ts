/**
 * AUTHORITY: PostgreSQL `articles` (arbre réel du cocon : `parent_id`, `parent_section`,
 *            étape `redaction:draft_accepted` du parent) — le serveur est seul juge
 *            de ce qui peut naître ; ce composable ne fait que le montrer et le demander.
 * READS FROM: GET /cocoons/:cocoonId/tree (arbre : articles, sections, enfant né de chacune),
 *             POST /cocoons/:cocoonId/child-candidates (mots-clés candidats mesurés, PAYANT : sur un clic).
 * WRITES TO: PUT /cocoons/:cocoonId/articles/:articleId/parent (rattacher un article hors
 *            de l'arbre, K8), POST /cocoons/:cocoonId/articles (un article à la fois, derrière la porte du
 *            premier jet du parent via useGateAlarmStore.runThroughGate), POST /keywords
 *            (pool du cocon), `cocoon_strategies.data.proposedArticles` via saveStrategy
 *            (l'article créé y est inscrit : le Moteur liste ses articles depuis la stratégie).
 * CONSUMERS: CocoonTreeBuilder / CocoonCandidatesPanel (étape Articles du Cerveau),
 *            MoteurView (buildRecapArticles lit proposedArticles), useCocoonsStore (dashboard).
 * RELATED FR: FR-CER-COCOON-PROGRESSIVE, FR-CER-CHILD-FROM-PILLAR-H2,
 *             FR-CER-PARENT-WRITTEN-GATE, FR-CER-KEYWORD-REAL-DATA, FR-CER-CREATION-HONNETE,
 *             FR-INFRA-KEYWORDS-SEO
 *
 * Le cocon se construit depuis son pilier : on crée le pilier d'un cocon vide,
 * puis chaque article depuis une section (H2) de son parent rédigé, en choisissant
 * son mot-clé parmi des candidats mesurés. Un refus du serveur est dit tel quel ;
 * aucun article n'est annoncé créé s'il ne l'est pas.
 */
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import { useGateAlarmStore } from '@/stores/ui/gate-alarm.store'
import { useNotify } from '@/composables/ui/useNotify'
import { buildEmptyArticle, normalizeTitle } from '@/composables/editor/article-proposals/builders'
import { log } from '@/utils/logger'
import { articleLevelToDisplayLabel } from '@shared/utils/article-level.js'
import type { Article, ProposedArticle } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { ChildCandidate, ChildCandidatesResult, CocoonTreeNode } from '@shared/types/cocoon-tree.types.js'

/** Là où un nouvel article va naître : le pilier (sans parent) ou une section d'un parent. */
interface CocoonBuilderTarget {
  parentId: number | null
  parentSection: string | null
  level: ArticleLevel
}

/** Un pilier ou un intermédiaire, dans l'ordre de lecture de l'arbre. */
interface CocoonTreeBlock {
  node: CocoonTreeNode
  depth: 0 | 1
}

const CHILD_LEVEL: Record<ArticleLevel, ArticleLevel | null> = {
  pilier: 'intermediaire',
  intermediaire: 'specifique',
  specifique: null,
}

/** Niveau de l'article qui naît d'une section de ce parent (`null` : un spécialisé n'a pas d'enfant). */
export function childLevelOf(level: ArticleLevel): ArticleLevel | null {
  return CHILD_LEVEL[level]
}

/**
 * Le message du serveur (déjà rédigé pour l'utilisateur), sinon une cause lisible.
 * Un refus du serveur (ApiRequestError) est reconnu à sa forme — son statut HTTP —
 * plutôt qu'à sa classe, comme `isGateBlocked` : l'erreur peut venir d'un appel simulé.
 */
function refusalOf(err: unknown): string {
  const answered = err instanceof Error && typeof (err as { status?: unknown }).status === 'number'
  if (answered && err.message) return err.message
  return 'le serveur n’a pas répondu. Vérifiez qu’il tourne, puis réessayez.'
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(v => v.trim()))]
}

export function useCocoonBuilder(params: {
  cocoonId: MaybeRefOrGetter<number>
  cocoonName: MaybeRefOrGetter<string>
  cocoonSlug: MaybeRefOrGetter<string>
}) {
  const strategyStore = useCocoonStrategyStore()
  const cocoonsStore = useCocoonsStore()
  const notify = useNotify()

  // --- L'arbre réel du cocon ---
  const tree = ref<CocoonTreeNode[]>([])
  const isLoadingTree = ref(false)
  const treeError = ref<string | null>(null)

  async function loadTree(): Promise<void> {
    const cocoonId = toValue(params.cocoonId)
    isLoadingTree.value = true
    treeError.value = null
    try {
      const data = await apiGet<CocoonTreeNode[]>(`/cocoons/${cocoonId}/tree`)
      if (!Array.isArray(data)) throw new Error('réponse inattendue du serveur')
      tree.value = data
      log.debug('[cocoon-builder] arbre chargé', { cocoonId, articles: data.length })
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err)
      treeError.value = `L’arbre du cocon n’a pas pu être chargé : ${cause}`
      log.error('[cocoon-builder] chargement de l’arbre impossible', { cocoonId, error: cause })
    } finally {
      isLoadingTree.value = false
    }
  }

  const nodeById = computed(() => new Map(tree.value.map(n => [n.id, n])))
  const hasPillar = computed(() => tree.value.some(n => n.level === 'pilier'))

  /** Chaque pilier, suivi de ses intermédiaires dans l'ordre de ses sections. */
  const blocks = computed<CocoonTreeBlock[]>(() => {
    const out: CocoonTreeBlock[] = []
    for (const pillar of tree.value.filter(n => n.level === 'pilier')) {
      out.push({ node: pillar, depth: 0 })
      const children = tree.value.filter(n => n.parentId === pillar.id && n.level === 'intermediaire')
      const bySection = pillar.sections
        .map(s => children.find(c => c.id === s.childId))
        .filter((c): c is CocoonTreeNode => !!c)
      const ordered = [...bySection, ...children.filter(c => !bySection.includes(c))]
      for (const child of ordered) out.push({ node: child, depth: 1 })
    }
    return out
  })

  /** Articles sans place dans l'arbre (créés avant la construction progressive). */
  const orphans = computed<CocoonTreeNode[]>(() => {
    const placed = new Set(blocks.value.map(b => b.node.id))
    return tree.value.filter((n) => {
      if (placed.has(n.id)) return false
      // Un spécialisé rattaché à un intermédiaire de l'arbre figure dans ses sections.
      if (n.level === 'specifique' && n.parentId !== null && placed.has(n.parentId)) return false
      return true
    })
  })

  // --- Les candidats d'un nouvel article ---
  const target = ref<CocoonBuilderTarget | null>(null)
  const candidates = ref<ChildCandidate[]>([])
  const isProposing = ref(false)
  const proposeError = ref<string | null>(null)
  const isCreating = ref(false)
  const createError = ref<string | null>(null)
  // Une réponse arrivée après un changement de cible est ignorée.
  let proposalSeq = 0

  function isTarget(parentId: number | null, parentSection: string | null): boolean {
    return target.value !== null && target.value.parentId === parentId && target.value.parentSection === parentSection
  }

  /** Action PAYANTE (IA + DataForSEO) : ne s'appelle que sur un clic de l'utilisateur. */
  async function proposeCandidates(next: CocoonBuilderTarget): Promise<void> {
    const seq = ++proposalSeq
    const cocoonId = toValue(params.cocoonId)
    target.value = next
    candidates.value = []
    proposeError.value = null
    createError.value = null
    isProposing.value = true
    try {
      const result = await apiPost<ChildCandidatesResult>(`/cocoons/${cocoonId}/child-candidates`, {
        parentId: next.parentId,
        parentSection: next.parentSection,
      })
      if (seq !== proposalSeq) return
      candidates.value = Array.isArray(result?.candidates) ? result.candidates : []
      if (candidates.value.length === 0) proposeError.value = 'Aucun mot-clé candidat n’a été proposé : relancez la proposition.'
      log.info('[cocoon-builder] candidats reçus', { cocoonId, level: next.level, parentId: next.parentId, count: candidates.value.length })
    } catch (err) {
      if (seq !== proposalSeq) return
      proposeError.value = `Aucun candidat : ${refusalOf(err)}`
      log.warn('[cocoon-builder] proposition refusée', { cocoonId, parentId: next.parentId, error: (err as Error).message })
    } finally {
      if (seq === proposalSeq) isProposing.value = false
    }
  }

  function closeCandidates(): void {
    proposalSeq++
    target.value = null
    candidates.value = []
    proposeError.value = null
    createError.value = null
    isProposing.value = false
  }

  /** Ajoute le mot-clé au pool du cocon ; un refus n'annule pas l'article, il se dit. */
  async function addToKeywordPool(keyword: string, level: ArticleLevel, title: string): Promise<void> {
    try {
      await apiPost('/keywords', {
        keyword,
        cocoonName: toValue(params.cocoonName),
        // Le pool attend un KeywordType (« Pilier »), pas le niveau canonique (K2).
        type: articleLevelToDisplayLabel(level),
      })
    } catch (err) {
      log.warn('[cocoon-builder] mot-clé refusé par le pool', { title, error: (err as Error).message })
      notify.warning(`« ${title} » est créé, mais son mot-clé n’a pas rejoint le pool du cocon : ${refusalOf(err)}`)
    }
  }

  /**
   * Inscrit l'article créé dans la carte du cocon (`proposedArticles`) : c'est d'elle
   * que le Moteur tire sa liste. Une proposition de même titre est mise à jour.
   */
  async function registerInStrategy(entry: Omit<ProposedArticle, 'id' | 'suggestedTitles' | 'suggestedKeywords' | 'suggestedSlugs' | 'validatedSearchQuery' | 'keywordValidated' | 'searchQueryValidated' | 'titleValidated'>): Promise<void> {
    const strategy = strategyStore.strategy
    if (!strategy) {
      log.warn('[cocoon-builder] stratégie absente : article créé non inscrit sur la carte', { dbId: entry.dbId })
      notify.warning(`« ${entry.title} » est créé, mais la stratégie du cocon n’est pas chargée : rechargez la page pour le voir au Moteur.`)
      return
    }
    const key = normalizeTitle(entry.title)
    let index = strategy.proposedArticles.findIndex(p => p.dbId === entry.dbId)
    // Une proposition déjà liée à un autre article n'est jamais écrasée.
    if (index < 0) index = strategy.proposedArticles.findIndex(p => !p.createdInDb && normalizeTitle(p.title) === key)
    const base = index >= 0 ? strategy.proposedArticles[index]! : buildEmptyArticle(entry.type)
    const next: ProposedArticle = {
      ...base,
      ...entry,
      suggestedTitles: unique([entry.title, ...base.suggestedTitles]),
      suggestedKeywords: unique([entry.suggestedKeyword, ...base.suggestedKeywords]),
      suggestedSlugs: unique([entry.suggestedSlug, ...base.suggestedSlugs]),
    }
    if (index >= 0) strategy.proposedArticles.splice(index, 1, next)
    else strategy.proposedArticles.push(next)
    const errorBefore = strategyStore.error
    await strategyStore.saveStrategy(toValue(params.cocoonSlug))
    if (strategyStore.error && strategyStore.error !== errorBefore) {
      notify.warning(`« ${entry.title} » est créé, mais la carte du cocon n’a pas été enregistrée (${strategyStore.error}) : il n’apparaîtra au Moteur qu’après un nouvel enregistrement.`)
    }
  }

  /**
   * Crée l'article de la cible avec le mot-clé choisi. Un enfant passe derrière la
   * porte du premier jet de son parent (l'alarme s'ouvre si elle refuse). Renvoie
   * l'article créé, ou `null` : la cause est alors dans `createError`.
   */
  async function createFromCandidate(candidate: ChildCandidate, title: string): Promise<Article | null> {
    const at = target.value
    if (!at || isCreating.value) return null
    const cleanTitle = title.trim()
    createError.value = null
    if (cleanTitle.length < 3) {
      createError.value = 'Le titre doit faire au moins 3 caractères.'
      return null
    }
    // Aucun mot-clé enregistré sans avoir été mesuré (FR-CER-KEYWORD-REAL-DATA) :
    // le serveur le refuserait, on ne l'envoie pas.
    if (!candidate.metrics) {
      createError.value = `« ${candidate.keyword} » n’a pas pu être mesuré : choisissez un candidat mesuré, ou relancez la proposition.`
      return null
    }

    const cocoonId = toValue(params.cocoonId)
    const parentTitle = at.parentId !== null ? nodeById.value.get(at.parentId)?.title ?? null : null
    // Une proposition de même titre sur la carte : son intention éditoriale et sa
    // douleur suivent l'article, pour que base et carte disent la même chose.
    const existing = strategyStore.strategy?.proposedArticles.find(p => !p.createdInDb && normalizeTitle(p.title) === normalizeTitle(cleanTitle)) ?? null
    const painPoint = candidate.painPoint?.trim() || existing?.painPoint?.trim() || null
    // L'intention pensée sur la carte l'emporte ; sinon, celle proposée avec le
    // candidat (K9) — sans elle, la porte capitaine ne jugerait pas l'écart d'intention.
    const painIntentExpected = existing?.painIntentExpected ?? candidate.painIntentExpected ?? null

    const create = () => apiPost<Article>(`/cocoons/${cocoonId}/articles`, {
      title: cleanTitle,
      type: at.level,
      parentId: at.parentId,
      parentSection: at.parentSection,
      suggestedKeyword: candidate.keyword,
      painPoint,
      painIntentExpected,
    })

    isCreating.value = true
    try {
      let outcome: { ok: true; value: Article } | { ok: false }
      try {
        // Parent pas encore rédigé : l'alarme s'ouvre sur SA porte du premier jet,
        // puis la création est rejouée si l'utilisateur assume (FR-CER-PARENT-WRITTEN-GATE).
        outcome = at.parentId !== null
          ? await useGateAlarmStore().runThroughGate(at.parentId, create)
          : { ok: true, value: await create() }
      } catch (err) {
        // FR-CER-CREATION-HONNETE : un refus (ordre du cocon, adresse prise, mot-clé
        // jamais mesuré) est dit, jamais maquillé en article créé.
        createError.value = `« ${cleanTitle} » n’a pas été créé : ${refusalOf(err)}`
        log.error('[cocoon-builder] création refusée', { cocoonId, title: cleanTitle, error: (err as Error).message })
        return null
      }
      if (!outcome.ok) {
        createError.value = `« ${cleanTitle} » n’a pas été créé : « ${parentTitle ?? 'le parent'} » doit d’abord être rédigé (son premier jet doit passer sa porte).`
        return null
      }
      // À partir d'ici l'article existe : rien de ce qui suit ne peut le dire « non créé ».
      const created = outcome.value
      log.info('[cocoon-builder] article créé', { cocoonId, articleId: created.id, level: at.level, parentId: at.parentId })

      await addToKeywordPool(candidate.keyword, at.level, cleanTitle)
      await registerInStrategy({
        title: cleanTitle,
        type: at.level,
        parentTitle,
        parentSection: at.parentSection,
        rationale: existing?.rationale || candidate.rationale,
        painPoint: painPoint ?? '',
        painIntentExpected,
        suggestedKeyword: candidate.keyword,
        suggestedSlug: created.slug,
        accepted: true,
        createdInDb: true,
        dbId: created.id,
      })
      notify.success(`« ${cleanTitle} » est créé.`)
      closeCandidates()
      await Promise.all([loadTree(), cocoonsStore.fetchCocoons()])
      return created
    } finally {
      isCreating.value = false
    }
  }

  // --- Rattacher un article hors de l'arbre (K8) ---
  const isAttaching = ref(false)
  const attachError = ref<string | null>(null)

  /** Les sections libres où un article de ce niveau peut se rattacher : parents rédigés du bon niveau. */
  function attachTargets(level: ArticleLevel): Array<{ parentId: number; parentTitle: string; section: string }> {
    const parentLevel = (Object.keys(CHILD_LEVEL) as ArticleLevel[]).find(l => CHILD_LEVEL[l] === level)
    if (!parentLevel) return []
    return tree.value
      .filter(n => n.level === parentLevel && n.drafted)
      .flatMap(n => n.sections
        .filter(s => s.childId === null && s.title)
        .map(s => ({ parentId: n.id, parentTitle: n.title, section: s.title })))
  }

  /**
   * Place un article existant dans la section d'un parent, aux mêmes règles
   * qu'une création (le serveur juge). La carte du cocon suit.
   */
  async function attachOrphan(articleId: number, parentId: number, parentSection: string): Promise<boolean> {
    if (isAttaching.value) return false
    const cocoonId = toValue(params.cocoonId)
    const parentTitle = nodeById.value.get(parentId)?.title ?? null
    isAttaching.value = true
    attachError.value = null
    try {
      let outcome: { ok: boolean }
      try {
        outcome = await useGateAlarmStore().runThroughGate(parentId, () =>
          apiPut(`/cocoons/${cocoonId}/articles/${articleId}/parent`, { parentId, parentSection }))
      } catch (err) {
        attachError.value = `L’article n’a pas été rattaché : ${refusalOf(err)}`
        log.warn('[cocoon-builder] rattachement refusé', { cocoonId, articleId, parentId, error: (err as Error).message })
        return false
      }
      if (!outcome.ok) {
        attachError.value = `L’article n’a pas été rattaché : « ${parentTitle ?? 'le parent'} » doit d’abord être rédigé.`
        return false
      }
      const proposal = strategyStore.strategy?.proposedArticles.find(p => p.dbId === articleId)
      if (proposal) {
        proposal.parentTitle = parentTitle
        proposal.parentSection = parentSection
        await strategyStore.saveStrategy(toValue(params.cocoonSlug))
      }
      log.info('[cocoon-builder] article rattaché', { cocoonId, articleId, parentId, parentSection })
      notify.success(`L’article est rattaché à la section « ${parentSection} ».`)
      await loadTree()
      return true
    } finally {
      isAttaching.value = false
    }
  }

  return {
    tree,
    isLoadingTree,
    treeError,
    loadTree,
    nodeById,
    hasPillar,
    blocks,
    orphans,
    target,
    candidates,
    isProposing,
    proposeError,
    isCreating,
    createError,
    isTarget,
    proposeCandidates,
    closeCandidates,
    createFromCandidate,
    isAttaching,
    attachError,
    attachTargets,
    attachOrphan,
  }
}
