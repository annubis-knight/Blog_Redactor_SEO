/**
 * DynamicBlockDrop — extension TipTap qui intercepte les drops venant de BlocksPanel
 * avec le MIME custom `application/x-dynamic-block`.
 *
 * Au drop :
 *   1. Extrait le contexte depuis le document (dernier paragraphe + H2/H3 le plus proche,
 *      ou section H2 complète selon le mode).
 *   2. Insère un placeholder `dynamicBlock` marqué d'un `pendingId` transient à la position
 *      du drop.
 *   3. Appelle `/api/generate/action` en SSE, accumule le HTML streamé.
 *   4. À la fin du stream, parse le HTML en slice PM et remplace le placeholder par le contenu.
 *
 * Intentionnellement séparé de drag-handle.ts pour garder le drag interne (déplacement de
 * blocs) et le drop externe (génération IA) découplés.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMParser, Fragment, Node as PMNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import { log } from '@/utils/logger'

export const DYNAMIC_BLOCK_MIME = 'application/x-dynamic-block'

/**
 * Vérifie que le EditorView est toujours exploitable (pas détruit, DOM connecté).
 * À appeler APRÈS chaque `await` dans les chemins async.
 */
function isViewUsable(view: EditorView): boolean {
  try {
    return !!view.dom && view.dom.isConnected
  } catch {
    return false
  }
}

/** Map pendingId → AbortController pour annuler les fetches en cours. */
const abortControllers = new Map<string, AbortController>()

export interface DynamicBlockDropOptions {
  articleId: number
  getKeyword: () => string | undefined
  getKeywords: () => string[]
}

interface DropPayload {
  actionType: 'sources-chiffrees' | 'exemples-reels' | 'ce-quil-faut-retenir'
  contextMode: 'paragraph-title' | 'h2-section'
  label: string
}

/**
 * Trouve la position d'insertion au point (clientX, clientY) du drop.
 *
 * Stratégie identique à DragHandle.findTopLevelBlock : on itère les blocs
 * top-level, on compare leur `getBoundingClientRect()` avec le Y de la souris,
 * puis on décide avant/après selon la moitié du bloc.
 *
 * `posAtCoords` est volontairement NON utilisé ici — cette API PM est peu
 * fiable pendant les drag events (retourne souvent une profondeur 0, ce qui
 * provoquait systématiquement un fallback "fin de document").
 */
function findDropLocation(
  view: EditorView,
  _clientX: number,
  clientY: number,
): { insertPos: number; nodeType: string; nodeText: string; side: 'before' | 'after'; fallback?: 'end' } | null {
  const { doc } = view.state
  if (doc.childCount === 0) return null

  // Itère les blocs top-level, récupère leur DOM rect, trouve le plus proche du Y.
  // PAS de filtre `inBounds` — le curseur peut être dans le gap entre deux blocs
  // (margin/padding), et dans ce cas on veut quand même le bloc le plus proche.
  let bestBlock: { dom: HTMLElement; pos: number; size: number; node: PMNode; rect: DOMRect } | null = null
  let bestDistance = Infinity
  let checkedCount = 0
  let skippedCount = 0

  doc.forEach((node, offset) => {
    const dom = view.nodeDOM(offset)
    if (!(dom instanceof HTMLElement)) {
      skippedCount++
      return
    }
    checkedCount++
    const rect = dom.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const distance = Math.abs(clientY - centerY)

    if (distance < bestDistance) {
      bestDistance = distance
      bestBlock = { dom, pos: offset, size: node.nodeSize, node, rect }
    }
  })

  // Cast needed: TS can't track mutations inside forEach callback
  const best = bestBlock as { dom: HTMLElement; pos: number; size: number; node: PMNode; rect: DOMRect } | null

  log.debug('[dynamic-block-drop] 🔎 findDropLocation — scan', {
    clientY,
    docChildCount: doc.childCount,
    checkedCount,
    skippedCount,
    bestBlockFound: !!best,
    bestDistance: Math.round(bestDistance),
    bestBlockType: best?.node.type.name ?? null,
    bestBlockPos: best?.pos ?? null,
    bestBlockText: best?.node.textContent.slice(0, 40) ?? null,
    bestBlockRect: best?.rect
      ? { top: Math.round(best.rect.top), bottom: Math.round(best.rect.bottom), h: Math.round(best.rect.height) }
      : null,
  })

  if (best) {
    const b = best
    const mouseRelativeY = clientY - b.rect.top
    const isAbove = mouseRelativeY < b.rect.height / 2
    const insertPos = isAbove ? b.pos : b.pos + b.size

    log.debug('[dynamic-block-drop] 🔎 findDropLocation — decision', {
      mouseRelativeY: Math.round(mouseRelativeY),
      blockHeight: Math.round(b.rect.height),
      halfHeight: Math.round(b.rect.height / 2),
      isAbove,
      insertPos,
      side: isAbove ? 'before' : 'after',
    })

    return {
      insertPos,
      nodeType: b.node.type.name,
      nodeText: b.node.textContent.slice(0, 60),
      side: isAbove ? 'before' : 'after',
    }
  }

  // Fallback — aucun bloc trouvé (ne devrait pas arriver si doc.childCount > 0).
  const lastNode = doc.child(doc.childCount - 1)
  log.warn('[dynamic-block-drop] ⚠️ findDropLocation — fallback end-of-doc (no block matched)', { clientY })
  return {
    insertPos: doc.content.size,
    nodeType: lastNode.type.name,
    nodeText: lastNode.textContent.slice(0, 60),
    side: 'after',
    fallback: 'end',
  }
}

/**
 * Extrait le contexte pour `paragraph-title` :
 *   - dernier paragraphe avant le drop
 *   - dernier H2/H3 avant le drop
 */
function extractParagraphTitleContext(doc: PMNode, dropPos: number): { paragraph: string; heading: string } {
  log.debug('[dynamic-block-drop] 🔎 extractParagraphTitleContext — input', {
    dropPos,
    docSize: doc.content.size,
    docChildCount: doc.childCount,
  })

  let paragraph = ''
  let heading = ''

  doc.descendants((node, pos) => {
    if (pos >= dropPos) return false
    if (node.type.name === 'paragraph' && node.textContent.trim()) {
      paragraph = node.textContent.trim()
    }
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number
      if (level === 2 || level === 3) {
        heading = node.textContent.trim()
      }
    }
    return true
  })

  log.debug('[dynamic-block-drop] 🔎 extractParagraphTitleContext — result', {
    dropPos,
    paragraphChars: paragraph.length,
    paragraphPreview: paragraph.slice(0, 100),
    heading,
  })

  return { paragraph, heading }
}

/**
 * Extrait le contexte pour `h2-section` :
 *   1. Si un H2 existe avant le drop → collecte H3 + paragraphes + listes jusqu'au drop.
 *   2. Sinon (drop dans intro/conclusion, ou avant tout H2) → fallback fenêtre glissante :
 *      les 8 derniers blocs texte (headings inclus) avant le drop.
 *   3. Les H3 sont marqués avec `### ` pour conserver la structure dans le prompt IA.
 *
 * Cas couverts par le fallback :
 *  - drop dans l'éditeur intro (aucun H2)
 *  - drop dans l'éditeur conclusion (aucun H2)
 *  - drop juste après un H2 alors qu'il n'y a encore aucun contenu dans la section
 */
function extractH2SectionContext(doc: PMNode, dropPos: number): { heading: string; content: string } {
  log.debug('[dynamic-block-drop] 🔎 extractH2SectionContext — input', {
    dropPos,
    docSize: doc.content.size,
    docChildCount: doc.childCount,
  })

  // 1. Cherche le dernier H2 avant le drop
  let lastH2Pos = -1
  let heading = ''

  doc.descendants((node, pos) => {
    if (pos >= dropPos) return false
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      lastH2Pos = pos
      heading = node.textContent.trim()
    }
    return true
  })

  // 2. Si un H2 est trouvé, collecte H3 + blocs non-heading jusqu'au drop
  if (lastH2Pos !== -1) {
    const parts: string[] = []
    doc.descendants((node, pos) => {
      if (pos <= lastH2Pos) return true
      if (pos >= dropPos) return false
      if (!node.isBlock) return true
      const text = node.textContent.trim()
      if (!text) return true
      if (node.type.name === 'heading') {
        const level = node.attrs.level as number
        if (level === 3) parts.push(`### ${text}`)
        // H2 imbriqué impossible, on ignore les autres levels
      } else {
        parts.push(text)
      }
      return true
    })
    if (parts.length > 0) {
      const content = parts.join('\n\n')
      log.debug('[dynamic-block-drop] 🔎 extractH2SectionContext — result (H2 section)', {
        dropPos, heading, contentChars: content.length, partsCount: parts.length,
      })
      return { heading, content }
    }
    // Section trouvée mais vide → on tombe sur le fallback
  }

  // 3. Fallback — fenêtre glissante des 8 derniers blocs texte avant dropPos.
  //    Couvre intro, conclusion, et drop prématuré dans le body.
  const fallback: string[] = []
  doc.descendants((node, pos) => {
    if (pos >= dropPos) return false
    if (!node.isBlock) return true
    const text = node.textContent.trim()
    if (!text) return true
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number
      fallback.push(`${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${text}`)
    } else {
      fallback.push(text)
    }
    return true
  })
  const windowed = fallback.slice(-8)
  if (windowed.length === 0) {
    log.debug('[dynamic-block-drop] 🔎 extractH2SectionContext — result (empty)', { dropPos })
    return { heading: '', content: '' }
  }
  const fallbackContent = windowed.join('\n\n')
  log.debug('[dynamic-block-drop] 🔎 extractH2SectionContext — result (fallback window)', {
    dropPos, heading: heading || '(fenêtre glissante)', windowSize: windowed.length, contentChars: fallbackContent.length,
  })
  return {
    heading: heading || 'Contexte précédent (fenêtre glissante)',
    content: fallbackContent,
  }
}

/**
 * Limite max du `selectedText` envoyé au backend, pour éviter de saturer le quota
 * de 30 000 input tokens/minute de l'org Anthropic (≈ 1500 tokens × 4 chars/token).
 * Au-delà, on tronque proprement avec un marqueur `[…tronqué]`.
 */
const MAX_SELECTED_TEXT_CHARS = 6000

function truncate(text: string, max = MAX_SELECTED_TEXT_CHARS): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n\n[…tronqué pour respecter le quota de tokens]`
}

/** Construit le `selectedText` envoyé au backend à partir du contexte extrait. */
function buildSelectedText(doc: PMNode, dropPos: number, mode: DropPayload['contextMode']): string {
  log.debug('[dynamic-block-drop] 📋 buildSelectedText — input', {
    mode,
    dropPos,
    docSize: doc.content.size,
    docChildCount: doc.childCount,
  })

  if (mode === 'h2-section') {
    const { heading, content } = extractH2SectionContext(doc, dropPos)
    if (!heading && !content) return ''
    return truncate(`## ${heading}\n\n${content}`.trim())
  }
  const { paragraph, heading } = extractParagraphTitleContext(doc, dropPos)
  if (!paragraph && !heading) return ''
  const parts: string[] = []
  if (heading) parts.push(`Titre de section : ${heading}`)
  if (paragraph) parts.push(`Paragraphe : ${paragraph}`)
  return truncate(parts.join('\n\n'))
}

/** Recherche un nœud `dynamicBlock` par son `pendingId` transient. */
function findNodeByPendingId(doc: PMNode, pendingId: string): { pos: number; node: PMNode } | null {
  let found: { pos: number; node: PMNode } | null = null
  doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name === 'dynamicBlock' && node.attrs.pendingId === pendingId) {
      found = { pos, node }
      return false
    }
    return true
  })
  return found
}

/** Insère un placeholder `dynamicBlock` à la position donnée et retourne le pendingId. */
function insertPlaceholder(
  view: EditorView,
  insertPos: number,
  type: DropPayload['actionType'],
  label: string,
): string {
  const pendingId = `dyn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const { state, dispatch } = view
  const { schema } = state

  const dynamicBlockType = schema.nodes.dynamicBlock
  const paragraphType = schema.nodes.paragraph
  if (!dynamicBlockType || !paragraphType) {
    log.error('[dynamic-block-drop] ❌ schema missing dynamicBlock or paragraph node')
    return pendingId
  }

  // Placeholder avec `loading: true` — la CSS lit `data-loading="true"` pour afficher
  // le shimmer/spinner. Le pendingId sert à retrouver le nœud après le stream.
  const placeholder = dynamicBlockType.create(
    { type, pendingId, loading: true },
    paragraphType.create(null, schema.text(`Génération en cours — ${label}…`)),
  )

  const tr = state.tr.insert(insertPos, placeholder).scrollIntoView()
  dispatch(tr)

  // Post-dispatch sanity check: verify that the placeholder is actually present
  // in the new state, and check the top-level children of the editor (to detect
  // schema rejections or unexpected position issues).
  const postState = view.state
  const placeholderLoc = findNodeByPendingId(postState.doc, pendingId)
  const topLevelChildren: Array<{ type: string; preview: string }> = []
  postState.doc.forEach((child) => {
    topLevelChildren.push({
      type: child.type.name,
      preview: child.textContent.slice(0, 40),
    })
  })

  // Vérification DOM synchrone — immédiatement après dispatch, ProseMirror a mis
  // à jour le DOM. On vérifie que l'élément est bien présent et visible.
  const domNode = view.dom.querySelector<HTMLElement>(
    `div.dynamic-block[data-loading="true"]`,
  )
  const domRect = domNode?.getBoundingClientRect()

  log.debug('[dynamic-block-drop] 📌 placeholder node dispatched', {
    pendingId,
    insertPos,
    type,
    placeholderFoundInState: !!placeholderLoc,
    placeholderPos: placeholderLoc?.pos ?? null,
    topLevelChildCount: postState.doc.childCount,
    topLevelChildren,
    editorDomClass: view.dom.className,
    // DOM diagnostics (synchrone)
    domNodeFound: !!domNode,
    domNodeTag: domNode?.tagName ?? null,
    domNodeClass: domNode?.className ?? null,
    domNodeInnerHTML: domNode?.innerHTML.slice(0, 150) ?? null,
    domRect: domRect
      ? { w: Math.round(domRect.width), h: Math.round(domRect.height), top: Math.round(domRect.top) }
      : null,
    domVisible: domRect ? domRect.width > 0 && domRect.height > 0 : false,
  })
  return pendingId
}

/**
 * Remplace le *contenu interne* du placeholder (sans toucher au wrapper `dynamicBlock`)
 * par un Fragment donné, et met à jour les attrs pour sortir de l'état loading.
 *
 * On utilise `replaceWith(pos + 1, pos + nodeSize - 1, fragment)` pour cibler
 * uniquement l'intérieur du nœud, puis `setNodeMarkup` pour virer `loading`/`pendingId`.
 */
function replaceInner(view: EditorView, pendingId: string, fragment: Fragment): boolean {
  const location = findNodeByPendingId(view.state.doc, pendingId)
  if (!location) {
    log.warn('[dynamic-block-drop] ⚠️ placeholder not found at replace time', { pendingId })
    return false
  }

  const innerStart = location.pos + 1
  const innerEnd = location.pos + location.node.nodeSize - 1

  const tr = view.state.tr.replaceWith(innerStart, innerEnd, fragment)
  tr.setNodeMarkup(location.pos, null, {
    ...location.node.attrs,
    loading: false,
    pendingId: null,
  })
  tr.scrollIntoView()
  view.dispatch(tr)

  // Post-replace DOM sanity check : vérifie que le NodeView est bien rendu
  // dans le DOM (pas de display:none / height:0 / parent collapsed).
  const nodeType = location.node.attrs.type as string
  requestAnimationFrame(() => {
    if (!isViewUsable(view)) return
    const dom = view.dom.querySelector<HTMLElement>(`div.dynamic-block[data-type="${nodeType}"]`)
    const rect = dom?.getBoundingClientRect()
    log.debug('[dynamic-block-drop] 🔍 post-replace DOM check', {
      pendingId,
      nodeType,
      nodeFoundInDom: !!dom,
      hasLoadingAttr: dom?.hasAttribute('data-loading') ?? null,
      domChildCount: dom?.children.length ?? 0,
      innerHTMLPreview: dom?.innerHTML.slice(0, 150) ?? null,
      rect: rect ? { w: Math.round(rect.width), h: Math.round(rect.height), top: Math.round(rect.top) } : null,
      isVisible: rect ? rect.width > 0 && rect.height > 0 : false,
    })
  })
  return true
}

/** Remplace le contenu du placeholder par un paragraphe d'erreur, garde le wrapper. */
function replaceWithError(view: EditorView, pendingId: string, message: string) {
  const { schema } = view.state
  const paragraphType = schema.nodes.paragraph
  if (!paragraphType) return

  const errorNode = paragraphType.create(
    null,
    schema.text(`⚠️ Échec de la génération : ${message}`),
  )
  const fragment = Fragment.from(errorNode)
  replaceInner(view, pendingId, fragment)
}

/** Remplace le contenu interne du placeholder par le HTML parsé — garde le wrapper. */
function replaceWithHtml(view: EditorView, pendingId: string, html: string) {
  const { schema } = view.state

  log.debug('[dynamic-block-drop] 🔧 replaceWithHtml — input', {
    pendingId,
    htmlChars: html.length,
    htmlPreview: html.slice(0, 300),
    htmlTail: html.length > 300 ? html.slice(-100) : null,
    containsDynamicBlock: html.includes('dynamic-block'),
    containsUl: html.includes('<ul'),
    containsLi: html.includes('<li'),
  })

  // Parse le HTML en DOM puis en nœuds PM (Fragment, pas Slice — on veut juste
  // le contenu bloc interne à injecter dans le wrapper existant).
  const container = document.createElement('div')
  container.innerHTML = html.trim()

  log.debug('[dynamic-block-drop] 🔧 replaceWithHtml — DOM parsed', {
    pendingId,
    domChildCount: container.children.length,
    domFirstTag: container.firstElementChild?.tagName ?? null,
    domFirstClass: container.firstElementChild?.className ?? null,
  })

  const parser = DOMParser.fromSchema(schema)
  let fragment: Fragment
  try {
    fragment = parser.parse(container, { preserveWhitespace: 'full' }).content
  } catch (err) {
    log.error('[dynamic-block-drop] ❌ parse failed', { pendingId, error: (err as Error).message, htmlPreview: html.slice(0, 200) })
    replaceWithError(view, pendingId, 'Réponse IA invalide (parse échoué)')
    return
  }

  // Détail du fragment PM produit
  const fragmentChildren: Array<{ type: string; childCount: number; preview: string }> = []
  for (let i = 0; i < fragment.childCount; i++) {
    const child = fragment.child(i)
    fragmentChildren.push({
      type: child.type.name,
      childCount: child.childCount,
      preview: child.textContent.slice(0, 60),
    })
  }
  log.debug('[dynamic-block-drop] 🔧 replaceWithHtml — PM fragment', {
    pendingId,
    fragmentChildCount: fragment.childCount,
    fragmentSize: fragment.size,
    fragmentChildren,
  })

  // Si le parse produit zéro bloc (HTML vide ou invalide), fallback erreur.
  if (fragment.childCount === 0) {
    log.warn('[dynamic-block-drop] ⚠️ parsed fragment is empty', { pendingId, htmlPreview: html.slice(0, 200) })
    replaceWithError(view, pendingId, 'Réponse IA vide')
    return
  }

  const ok = replaceInner(view, pendingId, fragment)
  if (!ok) {
    // replaceInner a échoué (placeholder introuvable dans le doc PM) — rien d'affiché.
    // On ne peut pas écrire dans le placeholder puisqu'il n'existe plus, mais on log
    // clairement pour que le développeur sache ce qui s'est passé.
    log.error('[dynamic-block-drop] ❌ replaceInner failed — placeholder gone, content lost', {
      pendingId,
      htmlChars: html.length,
    })
    return
  }

  log.info('[dynamic-block-drop] ✅ placeholder inner replaced with generated HTML', {
    pendingId,
    htmlChars: html.length,
    fragmentChildCount: fragment.childCount,
    fragmentSize: fragment.size,
  })
}

/**
 * Registre des drops en vol — chaque pendingId a sa propre Promise indépendante.
 * Pas de sérialisation : chaque drop est un "thread" autonome qui vit sa vie.
 * Le registre sert uniquement au diagnostic (combien de drops actifs).
 */
const inflightDrops = new Set<string>()

/** Erreur spécifique pour signaler un 429 / rate limit (pour déclencher le retry). */
class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

function isRateLimit(err: unknown): boolean {
  if (err instanceof RateLimitError) return true
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit')
}

/**
 * Lance une requête unique vers `/api/generate/action` en SSE et retourne
 * le HTML accumulé. Peut lever `RateLimitError` ou une Error générique.
 */
async function doStreamOnce(
  pendingId: string,
  payload: DropPayload,
  selectedText: string,
  options: DynamicBlockDropOptions,
  signal?: AbortSignal,
): Promise<string> {
  const startMs = Date.now()
  const requestBody = {
    actionType: payload.actionType,
    selectedText,
    articleId: options.articleId,
    keyword: options.getKeyword(),
    keywords: options.getKeywords(),
  }

  log.info('[dynamic-block-drop] 📤 POST /api/generate/action', {
    pendingId,
    actionType: requestBody.actionType,
    articleId: requestBody.articleId,
    keyword: requestBody.keyword,
    keywordsCount: requestBody.keywords.length,
    selectedTextChars: selectedText.length,
    selectedTextPreview: selectedText.slice(0, 200),
  })

  const res = await fetch('/api/generate/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  })

  if (!res.ok) {
    const json = await res.json().catch(() => null) as { error?: { message?: string } } | null
    const message = json?.error?.message ?? `HTTP ${res.status}`
    if (res.status === 429) throw new RateLimitError(message)
    throw new Error(message)
  }
  if (!res.body) throw new Error('Réponse sans body streamable')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''
  let eventType = ''
  let chunkCount = 0
  let firstChunkMs: number | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (eventType === 'chunk') {
            if (firstChunkMs === null) {
              firstChunkMs = Date.now() - startMs
              log.debug('[dynamic-block-drop] 📥 first chunk received', { pendingId, ttfbMs: firstChunkMs })
            }
            chunkCount++
            accumulated += parsed.content
          } else if (eventType === 'error') {
            const errMessage = typeof parsed.message === 'string' ? parsed.message : 'Erreur IA'
            if (/429|rate[_ ]?limit/i.test(errMessage)) throw new RateLimitError(errMessage)
            throw new Error(errMessage)
          }
        } catch (err) {
          if (eventType === 'error') throw err
          // Ignore JSON malformé hors event error
        }
        eventType = ''
      }
    }
  }

  const totalMs = Date.now() - startMs
  log.info('[dynamic-block-drop] 📦 stream complete — AI output', {
    pendingId,
    actionType: payload.actionType,
    chunkCount,
    totalChars: accumulated.length,
    totalMs,
    outputPreview: accumulated.slice(0, 300),
  })
  return accumulated
}

/**
 * Wrapper avec retry exponentiel sur rate limit (jusqu'à 3 tentatives),
 * backoff : 2s → 4s → 8s.
 */
async function doStreamWithRetry(
  pendingId: string,
  payload: DropPayload,
  selectedText: string,
  options: DynamicBlockDropOptions,
  signal?: AbortSignal,
): Promise<string> {
  log.debug('[dynamic-block-drop] 🔄 doStreamWithRetry — input', {
    pendingId,
    actionType: payload.actionType,
    selectedTextChars: selectedText.length,
    articleId: options.articleId,
  })

  const maxAttempts = 3
  let lastError: unknown = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await doStreamOnce(pendingId, payload, selectedText, options, signal)
    } catch (err) {
      lastError = err
      if (!isRateLimit(err) || attempt === maxAttempts - 1) throw err
      const delayMs = 2000 * Math.pow(2, attempt)
      log.warn('[dynamic-block-drop] ⏳ rate limit, backing off', {
        pendingId,
        attempt: attempt + 1,
        delayMs,
        message: (err as Error).message,
      })
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw lastError as Error
}

/**
 * Point d'entrée fire-and-forget : chaque drop est autonome (pas de queue).
 *
 * Le placeholder est DÉJÀ inséré dans le doc avant l'appel à cette fonction.
 * On extrait le contexte ici (deferred) plutôt qu'au drop, pour éviter de
 * capturer le texte d'un autre placeholder en cours de chargement.
 *
 * Si le contexte est vide → on affiche une erreur dans le placeholder existant
 * (jamais d'abort silencieux).
 */
async function streamAndReplace(
  view: EditorView,
  pendingId: string,
  payload: DropPayload,
  options: DynamicBlockDropOptions,
) {
  const controller = new AbortController()
  abortControllers.set(pendingId, controller)
  inflightDrops.add(pendingId)
  const startMs = Date.now()

  try {
    // Guard : si l'éditeur est déjà détruit (navigation rapide après drop)
    if (!isViewUsable(view)) {
      log.warn('[dynamic-block-drop] ⚠️ view already unusable before stream', { pendingId })
      return
    }

    // Extraire le contexte depuis l'état actuel du document.
    // Le placeholder de CE drop est déjà dans le doc, on utilise sa position
    // comme limite pour ne collecter que le contenu qui le PRÉCÈDE.
    const placeholderLoc = findNodeByPendingId(view.state.doc, pendingId)
    if (!placeholderLoc) {
      log.error('[dynamic-block-drop] ❌ placeholder lost before stream', { pendingId })
      return
    }

    const selectedText = buildSelectedText(view.state.doc, placeholderLoc.pos, payload.contextMode)

    log.info('[dynamic-block-drop] 📋 context extracted (deferred)', {
      pendingId,
      actionType: payload.actionType,
      mode: payload.contextMode,
      chars: selectedText.length,
      preview: selectedText.slice(0, 300),
      activeDrops: inflightDrops.size,
    })

    if (!selectedText) {
      log.warn('[dynamic-block-drop] ⚠️ no context — showing error in placeholder', {
        pendingId,
        actionType: payload.actionType,
      })
      replaceWithError(view, pendingId, 'Pas assez de contenu autour du bloc pour générer.')
      return
    }

    const accumulated = await doStreamWithRetry(pendingId, payload, selectedText, options, controller.signal)

    // Guard post-await : l'éditeur a pu être détruit pendant le stream
    if (!isViewUsable(view)) {
      log.warn('[dynamic-block-drop] ⚠️ editor destroyed during stream, content lost', {
        pendingId,
        accumulatedChars: accumulated.length,
        ms: Date.now() - startMs,
      })
      return
    }

    replaceWithHtml(view, pendingId, accumulated)
  } catch (err) {
    // Si le stream a été annulé (navigation / destroy), pas d'erreur à afficher
    if (controller.signal.aborted) {
      log.info('[dynamic-block-drop] 🛑 stream aborted (editor destroyed or navigation)', { pendingId })
      return
    }

    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    log.error('[dynamic-block-drop] ❌ stream failed', {
      pendingId,
      actionType: payload.actionType,
      ms: Date.now() - startMs,
      error: msg,
      isRateLimit: isRateLimit(err),
    })

    // Défensif : replaceWithError peut aussi échouer si le view est mort
    try {
      if (isViewUsable(view)) {
        replaceWithError(view, pendingId, msg)
      }
    } catch (innerErr) {
      log.error('[dynamic-block-drop] ❌ replaceWithError also failed', {
        pendingId,
        innerError: (innerErr as Error).message,
      })
    }
  } finally {
    inflightDrops.delete(pendingId)
    abortControllers.delete(pendingId)
    log.debug('[dynamic-block-drop] 🏁 drop lifecycle done', {
      pendingId,
      ms: Date.now() - startMs,
      remainingDrops: inflightDrops.size,
    })
  }
}

export const DynamicBlockDrop = Extension.create<DynamicBlockDropOptions>({
  name: 'dynamicBlockDrop',

  addOptions() {
    return {
      articleId: 0,
      getKeyword: () => undefined,
      getKeywords: () => [],
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: new PluginKey('dynamicBlockDrop'),
        view() {
          return {
            destroy() {
              // Abort toutes les requêtes en vol quand l'éditeur est détruit
              // (navigation, unmount du composant). Empêche les callbacks async
              // de toucher un view mort.
              if (abortControllers.size > 0) {
                log.info('[dynamic-block-drop] 🛑 editor destroy — aborting inflight drops', {
                  count: abortControllers.size,
                  ids: [...abortControllers.keys()],
                })
                for (const [, ctrl] of abortControllers) {
                  ctrl.abort()
                }
                abortControllers.clear()
                inflightDrops.clear()
              }
            },
          }
        },
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              const data = event.dataTransfer?.getData(DYNAMIC_BLOCK_MIME)
              if (!data) return false

              let payload: DropPayload
              try {
                payload = JSON.parse(data) as DropPayload
              } catch (err) {
                log.warn('[dynamic-block-drop] ⚠️ invalid MIME payload', { error: (err as Error).message })
                return false
              }

              event.preventDefault()
              event.stopPropagation()

              // Identify which section editor received the drop (intro/body/conclusion)
              // by walking up to find the `.section-{key}` wrapper.
              let sectionKey = 'unknown'
              let walker: HTMLElement | null = view.dom as HTMLElement
              while (walker) {
                if (walker.classList && walker.className.includes('section-')) {
                  const match = /section-(intro|body|conclusion)/.exec(walker.className)
                  if (match && match[1]) { sectionKey = match[1]; break }
                }
                walker = walker.parentElement
              }

              log.info('[dynamic-block-drop] 🎯 drop detected', {
                actionType: payload.actionType,
                contextMode: payload.contextMode,
                label: payload.label,
                clientX: event.clientX,
                clientY: event.clientY,
                sectionKey,
                docSize: view.state.doc.content.size,
                docChildCount: view.state.doc.childCount,
              })

              const location = findDropLocation(view, event.clientX, event.clientY)
              if (!location) {
                log.warn('[dynamic-block-drop] ⚠️ no drop location resolved', {
                  clientX: event.clientX,
                  clientY: event.clientY,
                })
                return true
              }

              const { insertPos } = location

              log.debug('[dynamic-block-drop] 📍 drop location resolved', {
                targetNodeType: location.nodeType,
                targetNodeText: location.nodeText,
                insertPos,
                insertSide: location.side,
                fallback: location.fallback ?? null,
              })

              // 1. TOUJOURS insérer le placeholder immédiatement — c'est la priorité #1.
              //    L'utilisateur voit la div apparaître avec le shimmer de chargement.
              const pendingId = insertPlaceholder(view, insertPos, payload.actionType, payload.label)
              log.info('[dynamic-block-drop] ⏳ placeholder inserted, starting stream', {
                pendingId,
                action: payload.actionType,
                mode: payload.contextMode,
                insertPos,
              })

              // 2. Fire-and-forget : chaque drop est un thread autonome.
              //    L'extraction du contexte + le stream + le replace se font en arrière-plan.
              //    Si le contexte est vide, le placeholder affichera une erreur (pas d'abort silencieux).
              void streamAndReplace(view, pendingId, payload, options)
              return true
            },
          },
        },
      }),
    ]
  },
})
