/**
 * AUTHORITY: PostgreSQL `article_content.content` + `articles.meta_title`,
 *            `meta_description`, `seo_score`, `geo_score`.
 * READS FROM: GET /articles/:id/content (hydratation par les vues d'édition).
 * WRITES TO: PUT /articles/:id (saveArticle : contenu, méta et scores du texte
 *            enregistré ; recordScore : score calculé après coup, seul).
 * CONSUMERS: ArticleEditorView, ArticleWorkflowView, useArticleGeneration,
 *            useAutoSave, seo.store et geo.store (recordScore), SaveStatusIndicator.
 * RELATED FR: FR-RED-SEO-SCORE-PERSIST, FR-RED-META-CAPTAIN, FR-RED-GEN-SAUVEGARDE-AU-FIL
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { useStreaming, startStreamOnce, type StreamOnceResult } from '@/composables/editor/useStreaming'
import { apiPost, apiPut } from '@/services/api.service'
import {
  countWordsFromHtml,
  splitArticleByH2,
  validateHtmlStructurePreserved,
} from '@/utils/text-utils'
import { useOutlineStore } from '@/stores/article/outline.store'
import type { BriefData, Outline, ApiUsage } from '@shared/types/index.js'
import { articleMainKeyword } from '@shared/utils/article-keyword.js'
import { seoScoreKey } from '@/utils/score-key'

export type ScoreKind = 'seo' | 'geo'

/** Mutate `total` in place by summing tokens + cost from `partial`. */
function aggregateUsage(total: ApiUsage, partial: ApiUsage | null): void {
  if (!partial) return
  total.inputTokens += partial.inputTokens
  total.outputTokens += partial.outputTokens
  total.cacheReadTokens += partial.cacheReadTokens ?? 0
  total.cacheCreationTokens += partial.cacheCreationTokens ?? 0
  total.estimatedCost += partial.estimatedCost
  if (partial.model) total.model = partial.model
}

interface HumanizeSectionPayload {
  articleId: number
  sectionHtml: string
  sectionIndex: number
  sectionTitle: string
  keyword: string
  keywords: string[]
}

interface HumanizeSectionResponse {
  html: string
  usage: ApiUsage | null
  structurePreserved: boolean
  fallback: boolean
  sectionIndex: number
  diff?: unknown
  error?: string
}

interface ReduceSectionPayload {
  articleId: number
  sectionHtml: string
  sectionIndex: number
  sectionTitle: string
  targetWordCount: number
  currentWordCount: number
  keyword: string
  keywords: string[]
}

interface ReduceSectionResponse {
  html: string
  usage: ApiUsage | null
  sectionIndex: number
}

export const useEditorStore = defineStore('editor', () => {
  const content = ref<string | null>(null)
  const streamedText = ref('')
  const isGenerating = ref(false)
  const error = ref<string | null>(null)
  const metaTitle = ref<string | null>(null)
  const metaDescription = ref<string | null>(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  const lastSavedAt = ref<string | null>(null)
  const lastArticleUsage = ref<ApiUsage | null>(null)
  /** Longueur réellement visée par le dernier premier jet (renvoyée par le serveur). */
  const lastDraftTargetWordCount = ref<number | null>(null)
  const lastMetaUsage = ref<ApiUsage | null>(null)
  const sectionProgress = ref<{ current: number; total: number; title: string } | null>(null)

  // --- Reduce / Humanize pipeline state ---
  const isReducing = ref(false)
  const isHumanizing = ref(false)
  const humanizeProgress = ref<{ current: number; total: number; title: string } | null>(null)
  const lastReduceUsage = ref<ApiUsage | null>(null)
  const lastHumanizeUsage = ref<ApiUsage | null>(null)
  const lastHumanizeError = ref<string | null>(null)
  const humanizeFallbackCount = ref(0)
  let humanizeAbortController: AbortController | null = null
  const reduceProgress = ref<{ current: number; total: number; title: string } | null>(null)
  let reduceAbortController: AbortController | null = null


  // --- SSOT word count (finding G5) ---
  const wordCount = computed(() => countWordsFromHtml(content.value ?? ''))

  const wordCountDelta = (target: number | null | undefined): number | null => {
    if (!target || target <= 0) return null
    return wordCount.value - target
  }

  async function generateArticle(briefData: BriefData, outline: Outline, targetWordCount?: number, articleIdPourSauvegarde?: number) {
    log.info(`[editor] Generating article "${briefData.article.title}"`, {
      articleId: briefData.article.id,
      type: briefData.article.type,
      keywordsCount: briefData.keywords.length,
      outlineSections: outline.sections.length,
      targetWordCount: targetWordCount ?? null,
    })
    isGenerating.value = true
    error.value = null
    streamedText.value = ''
    content.value = null
    metaTitle.value = null
    metaDescription.value = null
    lastArticleUsage.value = null
    lastMetaUsage.value = null
    sectionProgress.value = null

    // Le capitaine de CET article, pas le mot-clé pilier du cocon (épopée qualité SEO, R3).
    const mainKeyword = articleMainKeyword(briefData.article)
    log.debug('[editor] mot-clé principal', { keyword: mainKeyword })

    // Premier jet en un appel, sans recherche web (FR-RED-DRAFT-SINGLE-PASS) :
    // les sources viennent à la passe d'enrichissement.
    const body = {
      articleId: briefData.article.id,
      outline,
      keyword: mainKeyword,
      keywords: briefData.keywords.map(kw => kw.keyword),
      articleType: briefData.article.type,
      articleTitle: briefData.article.title,
      cocoonName: briefData.article.cocoonName,
      ...(targetWordCount ? { targetWordCount } : {}),
    }

    const streaming = useStreaming<{ content: string; targetWordCount?: number }>()
    lastDraftTargetWordCount.value = null

    await streaming.startStream('/api/generate/article-draft', body, {
      onChunk: (accumulated) => { streamedText.value = accumulated },
      onDone: (data) => {
        content.value = data.content
        lastDraftTargetWordCount.value = data.targetWordCount ?? null
        log.info('[editor] Article generation done', { contentLength: data.content.length, contentSnippet: data.content.substring(0, 100) })
      },
      onError: (message) => {
        log.error(`[editor] Article generation failed — ${message}`)
        error.value = message
      },
      onUsage: (u) => {
        log.info('[editor] Article usage', { inputTokens: u.inputTokens, outputTokens: u.outputTokens, cost: `$${u.estimatedCost.toFixed(4)}` })
        lastArticleUsage.value = u
      },
      onSectionStart: (info) => {
        log.info(`[editor] Section ${info.index + 1}/${info.total}: "${info.title}"`)
        sectionProgress.value = { current: info.index, total: info.total, title: info.title }
      },
      onSectionDone: ({ index }) => {
        // Filet : le texte déjà écrit part en base sans attendre la fin.
        if (articleIdPourSauvegarde) {
          void saveContenuPartiel(articleIdPourSauvegarde, streamedText.value)
        }
        // Mark all sections in the completed group as 'generated'
        const outlineStore = useOutlineStore()
        if (!outlineStore.outline) return
        // Groups are H2-based: collect H2 indices (excluding H1)
        const h2Indices: number[] = []
        outlineStore.outline.sections.forEach((s, i) => {
          if (s.level === 2) h2Indices.push(i)
        })
        const h2Idx = h2Indices[index]
        if (h2Idx === undefined) return
        // Mark H2 and its following H3s
        const sections = outlineStore.outline.sections
        outlineStore.updateSection(sections[h2Idx]!.id, { status: 'generated' })
        for (let i = h2Idx + 1; i < sections.length && sections[i]!.level === 3; i++) {
          outlineStore.updateSection(sections[i]!.id, { status: 'generated' })
        }
      },
    })

    isGenerating.value = false
    sectionProgress.value = null
    log.info('[editor] Generation complete', { hasContent: !!content.value, hasError: !!error.value })
  }

  const isGeneratingMeta = ref(false)

  async function generateMeta(articleId: number, keyword: string, articleTitle: string, articleContent: string) {
    log.info(`[editor] Generating meta for "${articleTitle}"`, { articleId, keyword, contentLength: articleContent.length })
    isGeneratingMeta.value = true
    error.value = null

    try {
      const data = await apiPost<{ metaTitle: string; metaDescription: string; usage?: ApiUsage }>('/generate/meta', {
        articleId,
        keyword,
        articleTitle,
        articleContent,
      })
      metaTitle.value = data.metaTitle
      metaDescription.value = data.metaDescription
      if (data.usage) {
        lastMetaUsage.value = data.usage
        try { useCostLogStore().addEntry('Génération meta', data.usage) } catch { /* noop */ }
      }
      log.info('[editor] Meta generated', {
        metaTitle: data.metaTitle,
        metaTitleLength: data.metaTitle.length,
        metaDescription: data.metaDescription,
        metaDescLength: data.metaDescription.length,
      })
    } catch (err) {
      log.error(`[editor] Meta generation failed — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur lors de la génération des metas'
    } finally {
      isGeneratingMeta.value = false
    }
  }

  /**
   * FR-RED-GEN-SAUVEGARDE-AU-FIL — enregistre le texte déjà écrit sans attendre
   * la fin de la génération.
   *
   * Un article pilier fait couramment une vingtaine de sections, soit près de
   * vingt minutes de rédaction en conditions réelles (24 sections mesurées le
   * 2026-09-23). Rien n'était enregistré avant la toute dernière : fermer
   * l'onglet, rafraîchir ou perdre la connexion à l'avant-dernière section
   * faisait tout perdre — le texte comme l'argent dépensé à le produire.
   *
   * On n'écrit que le corps, jamais les méta (qui n'existent pas encore), et
   * sans toucher à l'état « modifié » de l'éditeur : c'est un filet, pas une
   * sauvegarde utilisateur.
   */
  async function saveContenuPartiel(articleId: number, html: string): Promise<void> {
    if (!html.trim()) return
    try {
      await apiPut(`/articles/${articleId}`, { content: html })
      lastSavedAt.value = new Date().toISOString()
      log.debug('[editor] contenu partiel enregistré', { articleId, length: html.length })
    } catch (err) {
      // Un filet qui casse ne doit pas interrompre la génération en cours.
      log.warn('[editor] sauvegarde partielle impossible', { articleId, error: (err as Error).message })
    }
  }

  // --- Scores enregistrés avec leur texte (FR-RED-SEO-SCORE-PERSIST) ---
  // Pas d'état réactif : ces empreintes ne s'affichent pas, elles décident
  // seulement de ce qui part en base.
  const scoreSnapshots: Record<ScoreKind, { value: number; key: string } | null> = { seo: null, geo: null }
  let lastSaved: { articleId: number; keys: Record<ScoreKind, string>; persisted: Record<ScoreKind, number | null> } | null = null

  function currentScoreKeys(): Record<ScoreKind, string> {
    const html = content.value ?? ''
    return { seo: seoScoreKey(html, metaTitle.value, metaDescription.value), geo: html }
  }

  function freshScore(kind: ScoreKind, keys: Record<ScoreKind, string>): number | null {
    const snapshot = scoreSnapshots[kind]
    return snapshot && snapshot.key === keys[kind] ? snapshot.value : null
  }

  /**
   * Note le score que l'éditeur vient de calculer, avec l'empreinte du texte
   * noté. Si ce texte est exactement celui enregistré en base, le score y part
   * aussitôt, seul : une sauvegarde faite avant la fin du calcul n'a pas à
   * attendre la suivante.
   */
  function recordScore(kind: ScoreKind, value: number, key: string): void {
    scoreSnapshots[kind] = { value, key }
    const saved = lastSaved
    if (!saved || saved.keys[kind] !== key || saved.persisted[kind] === value) return
    const previous = saved.persisted[kind]
    saved.persisted[kind] = value
    const field = kind === 'seo' ? 'seoScore' : 'geoScore'
    apiPut(`/articles/${saved.articleId}`, { [field]: value }).catch((err: unknown) => {
      saved.persisted[kind] = previous
      log.warn(`[editor] score ${kind} non enregistré — ${(err as Error).message}`, { articleId: saved.articleId })
    })
  }

  async function saveArticle(articleId: number) {
    log.info(`Saving article ${articleId}`)
    isSaving.value = true

    // Optimistic update: mark clean immediately
    const wasDirty = isDirty.value
    markClean()

    // FR-RED-SEO-SCORE-PERSIST — un score n'accompagne que le texte sur lequel
    // il a été calculé ; sinon la base porte « inconnu » (null), jamais un
    // chiffre d'une autre version.
    const keys = currentScoreKeys()
    const seoScore = freshScore('seo', keys)
    const geoScore = freshScore('geo', keys)

    try {
      await apiPut(`/articles/${articleId}`, {
        content: content.value,
        metaTitle: metaTitle.value,
        metaDescription: metaDescription.value,
        seoScore,
        geoScore,
      })
      lastSaved = { articleId, keys, persisted: { seo: seoScore, geo: geoScore } }
      // Un score calculé pendant l'envoi, sur ce même texte, part maintenant.
      for (const kind of ['seo', 'geo'] as const) {
        const fresh = freshScore(kind, keys)
        if (fresh !== null && fresh !== lastSaved.persisted[kind]) recordScore(kind, fresh, keys[kind])
      }
      lastSavedAt.value = new Date().toISOString()
      log.info(`Article ${articleId} saved`)
    } catch (err) {
      // Rollback on failure
      isDirty.value = wasDirty
      log.error(`Save failed for article ${articleId} — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
    } finally {
      isSaving.value = false
    }
  }

  function setContent(html: string) {
    content.value = html
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  function markDirty() {
    isDirty.value = true
  }

  /**
   * Call /generate/reduce-section for a single section.
   * Stateless — safe to call sequentially in a loop.
   */
  async function callReduceSection(
    payload: ReduceSectionPayload,
    signal: AbortSignal,
  ): Promise<StreamOnceResult<ReduceSectionResponse>> {
    return startStreamOnce<ReduceSectionResponse>('/api/generate/reduce-section', payload, {
      signal,
    })
  }

  /**
   * Reduce the article section-by-section to approach `targetWordCount`.
   * Follows the same pattern as `humanizeArticle`: split by H2, loop with
   * `startStreamOnce`, progress tracking, rollback on abort (F31).
   */
  async function reduceArticle(
    articleId: number,
    targetWordCount: number,
    keyword: string,
    keywords: string[],
  ): Promise<void> {
    if (!content.value) return
    if (isReducing.value || isHumanizing.value || isGenerating.value) return

    const originalContent = content.value
    const totalCurrentWords = countWordsFromHtml(originalContent)

    log.info('[editor] reduceArticle start', { articleId, targetWordCount, currentWordCount: totalCurrentWords })
    isReducing.value = true
    error.value = null
    lastReduceUsage.value = null
    reduceAbortController = new AbortController()
    const signal = reduceAbortController.signal

    const totalUsage: ApiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, model: '', estimatedCost: 0 }

    try {
      const { intro, sections } = splitArticleByH2(originalContent)

      interface ReduceUnit {
        index: number
        title: string
        html: string
        isIntro: boolean
      }
      const units: ReduceUnit[] = []
      if (intro.trim()) {
        units.push({ index: -1, title: 'Introduction', html: intro, isIntro: true })
      }
      for (const s of sections) {
        units.push({ index: s.index, title: s.title, html: s.html, isIntro: false })
      }

      if (units.length === 0) {
        log.warn('[editor] reduceArticle: nothing to reduce')
        return
      }

      reduceProgress.value = { current: 0, total: units.length, title: units[0]!.title }

      const reducedUnits: string[] = []
      let aborted = false

      for (let i = 0; i < units.length; i++) {
        if (signal.aborted) { aborted = true; break }
        const unit = units[i]!
        reduceProgress.value = { current: i, total: units.length, title: unit.title }

        const unitWords = countWordsFromHtml(unit.html)
        const ratio = totalCurrentWords > 0 ? unitWords / totalCurrentWords : 1 / units.length
        const unitTarget = Math.max(1, Math.round(targetWordCount * ratio))

        const result = await callReduceSection(
          {
            articleId,
            sectionHtml: unit.html,
            sectionIndex: unit.isIntro ? 0 : Math.max(0, unit.index),
            sectionTitle: unit.title,
            targetWordCount: unitTarget,
            currentWordCount: unitWords,
            keyword,
            keywords,
          },
          signal,
        )

        if (result.aborted) { aborted = true; break }

        if (result.errorMessage) {
          log.warn('[editor] reduce section error — keeping original', {
            index: unit.index,
            error: result.errorMessage,
          })
          reducedUnits.push(unit.html)
          continue
        }

        if (!result.result?.html) {
          reducedUnits.push(unit.html)
          continue
        }

        reducedUnits.push(result.result.html)
        if (result.usage) aggregateUsage(totalUsage, result.usage)
      }

      if (aborted || signal.aborted) {
        log.info('[editor] reduceArticle aborted — rolling back')
        content.value = originalContent
        return
      }

      const finalHtml = reducedUnits.join('\n')
      content.value = finalHtml
      markDirty()
      lastReduceUsage.value = totalUsage
      log.info('[editor] reduceArticle done', {
        units: units.length,
        newWordCount: countWordsFromHtml(finalHtml),
        targetWordCount,
        cost: `$${totalUsage.estimatedCost.toFixed(4)}`,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la réduction'
      content.value = originalContent
    } finally {
      isReducing.value = false
      reduceProgress.value = null
      reduceAbortController = null
    }
  }

  function abortReduce(): void {
    if (reduceAbortController) {
      log.info('[editor] abortReduce triggered')
      reduceAbortController.abort()
    }
  }

  /**
   * Call /generate/humanize-section for a single section (Task 13.2).
   * Stateless — safe to call sequentially in a loop (finding F25).
   */
  async function callHumanizeSection(
    payload: HumanizeSectionPayload,
    signal: AbortSignal,
  ): Promise<StreamOnceResult<HumanizeSectionResponse>> {
    return startStreamOnce<HumanizeSectionResponse>('/api/generate/humanize-section', payload, {
      signal,
    })
  }

  /**
   * Humanize the article section-by-section with client-side double-check
   * on structure preservation (AC 11, AC 12). Rolls back on abort/error (F31).
   */
  async function humanizeArticle(
    articleId: number,
    keyword: string,
    keywords: string[],
  ): Promise<void> {
    if (!content.value) return
    if (isHumanizing.value || isReducing.value || isGenerating.value) return

    const originalContent = content.value
    log.info('[editor] humanizeArticle start', { articleId })

    isHumanizing.value = true
    error.value = null
    lastHumanizeError.value = null
    lastHumanizeUsage.value = null
    humanizeFallbackCount.value = 0
    humanizeAbortController = new AbortController()
    const signal = humanizeAbortController.signal

    const totalUsage: ApiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, model: '', estimatedCost: 0 }

    try {
      const { intro, sections } = splitArticleByH2(originalContent)

      interface HumanizeUnit {
        index: number
        title: string
        html: string
        isIntro: boolean
      }
      const units: HumanizeUnit[] = []
      if (intro.trim()) {
        units.push({ index: -1, title: 'Introduction', html: intro, isIntro: true })
      }
      for (const s of sections) {
        units.push({ index: s.index, title: s.title, html: s.html, isIntro: false })
      }

      if (units.length === 0) {
        log.warn('[editor] humanizeArticle: nothing to humanize')
        return
      }

      humanizeProgress.value = { current: 0, total: units.length, title: units[0]!.title }

      const humanizedUnits: string[] = []
      let aborted = false

      for (let i = 0; i < units.length; i++) {
        if (signal.aborted) { aborted = true; break }
        const unit = units[i]!
        humanizeProgress.value = { current: i, total: units.length, title: unit.title }

        const result = await callHumanizeSection(
          {
            articleId,
            sectionHtml: unit.html,
            sectionIndex: unit.isIntro ? 0 : Math.max(0, unit.index),
            sectionTitle: unit.title,
            keyword,
            keywords,
          },
          signal,
        )

        if (result.aborted) { aborted = true; break }

        if (result.errorMessage) {
          lastHumanizeError.value = result.errorMessage
          humanizedUnits.push(unit.html)
          humanizeFallbackCount.value++
          continue
        }

        const payload = result.result
        if (!payload?.html) {
          humanizedUnits.push(unit.html)
          humanizeFallbackCount.value++
          continue
        }

        if (payload.fallback) {
          humanizedUnits.push(unit.html)
          humanizeFallbackCount.value++
          if (payload.usage) aggregateUsage(totalUsage, payload.usage)
          continue
        }

        // Client-side double-check (AC 11, G8)
        const v = validateHtmlStructurePreserved(unit.html, payload.html)
        if (!v.preserved) {
          log.warn('[editor] humanize client validation failed — keeping original', {
            index: unit.index,
            reason: v.diff?.reason,
          })
          humanizedUnits.push(unit.html)
          humanizeFallbackCount.value++
        } else {
          humanizedUnits.push(payload.html)
        }
        if (payload.usage) aggregateUsage(totalUsage, payload.usage)
      }

      if (aborted || signal.aborted) {
        log.info('[editor] humanizeArticle aborted — rolling back')
        content.value = originalContent
        return
      }

      const finalHtml = humanizedUnits.join('\n')

      // Final full-article structure validation (AC 12)
      const finalValidation = validateHtmlStructurePreserved(originalContent, finalHtml)
      if (!finalValidation.preserved) {
        log.error('[editor] humanizeArticle final validation failed — rolling back', {
          diff: finalValidation.diff,
        })
        error.value = 'La structure de l\'article a été altérée par l\'humanisation. Retour à la version précédente.'
        content.value = originalContent
        return
      }

      content.value = finalHtml
      markDirty()
      lastHumanizeUsage.value = totalUsage
      log.info('[editor] humanizeArticle done', {
        units: units.length,
        fallbacks: humanizeFallbackCount.value,
        cost: `$${totalUsage.estimatedCost.toFixed(4)}`,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de l\'humanisation'
      content.value = originalContent
    } finally {
      isHumanizing.value = false
      humanizeProgress.value = null
      humanizeAbortController = null
    }
  }

  function abortHumanize(): void {
    if (humanizeAbortController) {
      log.info('[editor] abortHumanize triggered')
      humanizeAbortController.abort()
    }
  }

  /** Hydrate store with previously saved article data */
  function loadExistingContent(data: {
    content: string
    metaTitle?: string | null
    metaDescription?: string | null
    /** Article chargé : un score calculé sur ce texte intact rejoint la base. */
    articleId?: number
    seoScore?: number | null
    geoScore?: number | null
  }) {
    log.info('[editor] Loading existing content', {
      contentLength: data.content.length,
      metaTitle: data.metaTitle ? `${data.metaTitle.length}ch` : 'null',
      metaDescription: data.metaDescription ? `${data.metaDescription.length}ch` : 'null',
    })
    content.value = data.content
    metaTitle.value = data.metaTitle ?? null
    metaDescription.value = data.metaDescription ?? null
    isDirty.value = false
    lastSaved = data.articleId
      ? { articleId: data.articleId, keys: currentScoreKeys(), persisted: { seo: data.seoScore ?? null, geo: data.geoScore ?? null } }
      : null
  }

  function resetEditor() {
    content.value = null
    streamedText.value = ''
    isGenerating.value = false
    isGeneratingMeta.value = false
    error.value = null
    metaTitle.value = null
    metaDescription.value = null
    isDirty.value = false
    isSaving.value = false
    lastSavedAt.value = null
    isReducing.value = false
    isHumanizing.value = false
    humanizeProgress.value = null
    reduceProgress.value = null
    lastReduceUsage.value = null
    lastHumanizeUsage.value = null
    lastHumanizeError.value = null
    humanizeFallbackCount.value = 0
    scoreSnapshots.seo = null
    scoreSnapshots.geo = null
    lastSaved = null
    if (humanizeAbortController) {
      humanizeAbortController.abort()
      humanizeAbortController = null
    }
    if (reduceAbortController) {
      reduceAbortController.abort()
      reduceAbortController = null
    }
  }

  return {
    content, streamedText, isGenerating, isGeneratingMeta, error,
    metaTitle, metaDescription, isDirty, isSaving, lastSavedAt,
    lastArticleUsage, lastMetaUsage, sectionProgress, lastDraftTargetWordCount,
    // reduce / humanize
    isReducing, isHumanizing, humanizeProgress, reduceProgress,
    lastReduceUsage, lastHumanizeUsage, lastHumanizeError, humanizeFallbackCount,
    // computed
    wordCount, wordCountDelta,
    // actions
    generateArticle, generateMeta, saveArticle, setContent, recordScore,
    loadExistingContent, markClean, markDirty, resetEditor, saveContenuPartiel,
    reduceArticle, abortReduce, humanizeArticle, abortHumanize, callHumanizeSection,
  }
})
