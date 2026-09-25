/**
 * AUTHORITY: aucune persistance propre — les propositions vivent en mémoire ;
 *            une proposition acceptée passe par `editorStore.setContent`, puis
 *            la sauvegarde habituelle (PUT /articles/:id → `article_content.content`).
 * READS FROM: `editorStore.content` (chapitres de l'article) ;
 *             POST /generate/enrich/:pass, POST /generate/section-rewrite
 * WRITES TO: `editorStore.content` (replaceChapter / insertChapter)
 * CONSUMERS: EnrichmentPanel (panneau « Enrichir » des vues de rédaction)
 * RELATED FR: FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE
 *
 * Second temps de la rédaction : chaque passe propose, chapitre par chapitre,
 * une version enrichie déjà vérifiée par le serveur ; l'utilisateur accepte ou
 * refuse. Accepter ne remplace qu'UN chapitre, et jamais un chapitre modifié
 * depuis la proposition.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startStreamOnce } from '@/composables/editor/useStreaming'
import { useEditorStore } from '@/stores/article/editor.store'
import { log } from '@/utils/logger'
import { listChapters, replaceChapter, insertChapter, faqInsertIndex, type Chapter } from '@shared/chapters.js'
import { countToSourceMarkers } from '@shared/verifiers/publish.js'
import { detectUnsourcedFigures } from '@shared/text-quality.js'
import type { EnrichmentPass } from '@shared/verifiers/enrichment.js'
import type { EnrichmentProposal } from '@shared/types/enrichment.types.js'

export type ProposalStatus = 'pending' | 'loading' | 'ready' | 'error' | 'accepted' | 'refused' | 'stale'

export interface EnrichmentItem {
  key: string
  pass: EnrichmentPass | 'reecriture'
  chapterIndex: number
  title: string
  status: ProposalStatus
  proposal: EnrichmentProposal | null
  error: string | null
  /**
   * FAQ : le chapitre avant lequel elle s'insère, tel qu'il était à la
   * proposition (vide pour une insertion en fin d'article). S'il a changé, on
   * n'insère pas à l'aveugle (R23).
   */
  anchor: string
}

export interface EnrichmentContext {
  articleId: number
  keyword: string
  keywords: string[]
}

const FAQ_TITLE = /questions fr[ée]quentes|\bfaq\b/i

/** Même comparaison que le vérificateur : les espaces entre balises ne comptent pas. */
const squash = (html: string): string => html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()

export const useEnrichmentStore = defineStore('enrichment', () => {
  const items = ref<EnrichmentItem[]>([])
  const activePass = ref<EnrichmentPass | 'reecriture' | null>(null)
  const isRunning = ref(false)
  const progress = ref<{ current: number; total: number; title: string } | null>(null)
  let abortController: AbortController | null = null

  const readyCount = computed(() => items.value.filter(i => i.status === 'ready').length)

  /** Chapitres qu'une passe vaut la peine de travailler. */
  function targetsFor(pass: EnrichmentPass, html: string): Chapter[] {
    const chapters = listChapters(html)
    if (pass === 'faq') {
      if (chapters.some(c => FAQ_TITLE.test(c.title))) return []
      return [{ index: faqInsertIndex(html), title: 'Questions fréquentes', html: '' }]
    }
    if (pass === 'sources') {
      return chapters.filter(c => countToSourceMarkers(c.html) > 0 || detectUnsourcedFigures(c.html).length > 0)
    }
    // Exemples, tableaux, images : le corps de l'article, sans chapeau, FAQ ni conclusion.
    const body = chapters.filter(c => c.index >= 0 && !FAQ_TITLE.test(c.title))
    return body.length > 1 ? body.slice(0, -1) : body
  }

  async function propose(item: EnrichmentItem, url: string, body: Record<string, unknown>, signal: AbortSignal): Promise<void> {
    item.status = 'loading'
    const res = await startStreamOnce<EnrichmentProposal>(url, body, { signal })
    if (res.aborted) {
      item.status = 'pending'
      return
    }
    if (res.errorMessage || !res.result) {
      item.status = 'error'
      item.error = res.errorMessage ?? 'Aucune proposition reçue.'
      log.warn(`[enrichment] ${item.pass} — chapitre ${item.chapterIndex} : ${item.error}`)
      return
    }
    item.proposal = res.result
    item.status = 'ready'
  }

  /** Lance une passe : une proposition par chapitre visé, l'une après l'autre. */
  async function runPass(pass: EnrichmentPass, ctx: EnrichmentContext): Promise<void> {
    const editorStore = useEditorStore()
    const articleHtml = editorStore.content ?? ''
    if (isRunning.value || !articleHtml.trim()) return

    const targets = targetsFor(pass, articleHtml)
    const chapters = listChapters(articleHtml)
    activePass.value = pass
    items.value = targets.map(c => ({
      key: `${pass}:${c.index}`, pass, chapterIndex: c.index, title: c.title,
      status: 'pending' as const, proposal: null, error: null,
      anchor: pass === 'faq' ? (chapters.find(ch => ch.index === c.index)?.html ?? '') : '',
    }))
    if (targets.length === 0) return

    isRunning.value = true
    abortController = new AbortController()
    const { signal } = abortController
    try {
      for (let i = 0; i < targets.length; i++) {
        if (signal.aborted) break
        const target = targets[i]!
        const item = items.value[i]!
        progress.value = { current: i + 1, total: targets.length, title: target.title }
        await propose(item, `/api/generate/enrich/${pass}`, {
          articleId: ctx.articleId, chapterIndex: target.index, chapterHtml: target.html,
          articleHtml, keyword: ctx.keyword, keywords: ctx.keywords,
        }, signal)
      }
    } finally {
      isRunning.value = false
      progress.value = null
      abortController = null
    }
  }

  /** Réécrit un chapitre selon une consigne : une proposition, rien d'appliqué. */
  async function rewriteChapter(chapterIndex: number, instruction: string, ctx: EnrichmentContext): Promise<void> {
    const editorStore = useEditorStore()
    const articleHtml = editorStore.content ?? ''
    const chapter = listChapters(articleHtml).find(c => c.index === chapterIndex)
    if (isRunning.value || !chapter) return

    activePass.value = 'reecriture'
    const item: EnrichmentItem = {
      key: `reecriture:${chapterIndex}:${Date.now()}`, pass: 'reecriture', chapterIndex, title: chapter.title,
      status: 'pending', proposal: null, error: null, anchor: '',
    }
    items.value = [item]
    isRunning.value = true
    abortController = new AbortController()
    try {
      await propose(items.value[0]!, '/api/generate/section-rewrite', {
        articleId: ctx.articleId, chapterIndex, chapterHtml: chapter.html,
        articleHtml, keyword: ctx.keyword, keywords: ctx.keywords, instruction,
      }, abortController.signal)
    } finally {
      isRunning.value = false
      abortController = null
    }
  }

  function accept(key: string): void {
    const item = items.value.find(i => i.key === key)
    const proposal = item?.proposal
    if (!item || item.status !== 'ready' || !proposal || proposal.blocked) return

    const editorStore = useEditorStore()
    const current = editorStore.content ?? ''
    if (item.pass === 'faq') {
      const anchor = listChapters(current).find(c => c.index === item.chapterIndex)?.html ?? ''
      if (squash(anchor) !== squash(item.anchor) || targetsFor('faq', current).length === 0) {
        // La conclusion a changé, ou une FAQ existe déjà : on n'insère pas à l'aveugle.
        item.status = 'stale'
        return
      }
      editorStore.setContent(insertChapter(current, item.chapterIndex, proposal.html))
    } else {
      const chapter = listChapters(current).find(c => c.index === item.chapterIndex)
      if (!chapter || squash(chapter.html) !== squash(proposal.before)) {
        // Le chapitre a changé depuis la proposition : on n'écrase pas.
        item.status = 'stale'
        return
      }
      editorStore.setContent(replaceChapter(current, item.chapterIndex, proposal.html))
    }
    item.status = 'accepted'
  }

  function refuse(key: string): void {
    const item = items.value.find(i => i.key === key)
    if (item && (item.status === 'ready' || item.status === 'error' || item.status === 'stale')) item.status = 'refused'
  }

  /** Accepte d'un coup les propositions sans aucune alerte. */
  function acceptAllClean(): void {
    for (const item of items.value) {
      if (item.status === 'ready' && item.proposal && item.proposal.issues.length === 0) accept(item.key)
    }
  }

  function abort(): void {
    abortController?.abort()
  }

  function reset(): void {
    abort()
    items.value = []
    activePass.value = null
  }

  return {
    items, activePass, isRunning, progress, readyCount,
    targetsFor, runPass, rewriteChapter, accept, refuse, acceptAllClean, abort, reset,
  }
})
