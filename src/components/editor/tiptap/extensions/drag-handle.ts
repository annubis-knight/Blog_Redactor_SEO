import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

// --- DEBUG ---
const DEBUG = false
let instanceCounter = 0

function makeLogger(id: string) {
  const prefix = `[DragHandle#${id}]`
  const color = 'color:#2563eb;font-weight:bold'
  return {
    log: (...args: unknown[]) => {
      if (DEBUG) console.log(`%c${prefix}`, color, ...args)
    },
    warn: (...args: unknown[]) => {
      if (DEBUG) console.warn(`%c${prefix}`, 'color:#f59e0b;font-weight:bold', ...args)
    },
    group: (label: string) => {
      if (DEBUG) console.groupCollapsed(`%c${prefix}`, color, label)
    },
    groupEnd: () => {
      if (DEBUG) console.groupEnd()
    },
  }
}

const GRIP_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <circle cx="5.5" cy="3.5" r="1.2" fill="currentColor"/>
  <circle cx="10.5" cy="3.5" r="1.2" fill="currentColor"/>
  <circle cx="5.5" cy="8" r="1.2" fill="currentColor"/>
  <circle cx="10.5" cy="8" r="1.2" fill="currentColor"/>
  <circle cx="5.5" cy="12.5" r="1.2" fill="currentColor"/>
  <circle cx="10.5" cy="12.5" r="1.2" fill="currentColor"/>
</svg>`

const TRASH_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M2.5 4h11"/>
  <path d="M6 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4"/>
  <path d="M3.5 4l.6 9a1.5 1.5 0 001.5 1.4h4.8a1.5 1.5 0 001.5-1.4l.6-9"/>
  <path d="M6.5 7v4"/>
  <path d="M9.5 7v4"/>
</svg>`

class DragHandleView {
  private instanceId: string
  private logger: ReturnType<typeof makeLogger>
  private handle: HTMLButtonElement
  private deleteBtn: HTMLButtonElement
  private dropIndicator: HTMLElement
  private container: HTMLElement
  private currentNodePos: number | null = null
  private currentNodeSize: number = 0
  private draggedPos: number | null = null
  private draggedSize: number = 0
  private mousemoveCount = 0
  private dragoverCount = 0
  private handleVisible = false

  constructor(private view: EditorView) {
    this.instanceId = String(++instanceCounter)
    this.logger = makeLogger(this.instanceId)

    this.logger.log('🟢 [INIT] Plugin initialized', {
      editorDom: view.dom,
      parent: view.dom.parentElement,
      docSize: view.state.doc.content.size,
      topLevelNodes: view.state.doc.childCount,
    })

    // Log top-level nodes structure
    const nodes: Array<{ type: string; pos: number; size: number; text?: string }> = []
    view.state.doc.forEach((node, offset) => {
      nodes.push({
        type: node.type.name,
        pos: offset,
        size: node.nodeSize,
        text: node.textContent.slice(0, 30),
      })
    })
    this.logger.log(`📋 [INIT] ${nodes.length} top-level nodes:`, nodes)

    // Use the editor's parent as container for overlay elements
    this.container = view.dom.parentElement || view.dom
    this.logger.log('📦 [INIT] Using container:', {
      tag: this.container.tagName,
      class: this.container.className,
    })

    // Make sure container is positioned
    const computedPos = getComputedStyle(this.container).position
    if (computedPos === 'static') {
      this.logger.warn('⚠️ [INIT] Container has position:static, forcing position:relative')
      this.container.style.position = 'relative'
    } else {
      this.logger.log('✅ [INIT] Container position:', computedPos)
    }

    // Create floating handle button
    this.handle = document.createElement('button')
    this.handle.className = 'drag-handle-btn'
    this.handle.type = 'button'
    this.handle.innerHTML = GRIP_SVG
    this.handle.draggable = true
    this.handle.setAttribute('contenteditable', 'false')
    this.handle.dataset.dragHandleId = this.instanceId

    // --- Handle event listeners with detailed logging ---
    this.handle.addEventListener('dragstart', this.onHandleDragStart)
    this.handle.addEventListener('dragend', this.onDragEnd) // critical: dragend doesn't bubble to view.dom
    this.handle.addEventListener('mouseleave', this.onHandleMouseLeave)
    this.handle.addEventListener('mouseenter', this.onHandleMouseEnter)
    this.handle.addEventListener('mousedown', this.onHandleMouseDown)
    this.handle.addEventListener('mouseup', this.onHandleMouseUp)
    this.handle.addEventListener('click', this.onHandleClick)

    this.logger.log('🔨 [INIT] Handle created', this.handle)

    // Create delete button (right side of block)
    this.deleteBtn = document.createElement('button')
    this.deleteBtn.className = 'delete-handle-btn'
    this.deleteBtn.type = 'button'
    this.deleteBtn.innerHTML = TRASH_SVG
    this.deleteBtn.setAttribute('contenteditable', 'false')
    this.deleteBtn.setAttribute('aria-label', 'Supprimer ce bloc')
    this.deleteBtn.dataset.deleteHandleId = this.instanceId

    this.deleteBtn.addEventListener('mousedown', this.onDeleteMouseDown)
    this.deleteBtn.addEventListener('click', this.onDeleteClick)
    this.deleteBtn.addEventListener('mouseleave', this.onDeleteMouseLeave)

    this.logger.log('🗑️ [INIT] Delete button created')

    // Create drop indicator line
    this.dropIndicator = document.createElement('div')
    this.dropIndicator.className = 'drop-indicator'
    this.dropIndicator.setAttribute('contenteditable', 'false')
    this.logger.log('📏 [INIT] Drop indicator created')

    // Append to container (parent of ProseMirror, not inside contenteditable)
    this.container.appendChild(this.handle)
    this.container.appendChild(this.deleteBtn)
    this.container.appendChild(this.dropIndicator)
    this.logger.log('✅ [INIT] Handle + delete + indicator appended to container')

    // Bind events on editor DOM
    this.view.dom.addEventListener('mousemove', this.onMouseMove)
    this.view.dom.addEventListener('mouseleave', this.onMouseLeave)
    this.view.dom.addEventListener('mouseenter', this.onViewMouseEnter)
    this.view.dom.addEventListener('dragover', this.onDragOver, true)
    this.view.dom.addEventListener('drop', this.onDrop, true)
    this.view.dom.addEventListener('dragend', this.onDragEnd)
    this.view.dom.addEventListener('dragenter', this.onViewDragEnter)
    this.view.dom.addEventListener('dragleave', this.onViewDragLeave)
    this.view.dom.addEventListener('dragstart', this.onViewDragStart, true)

    // --- SAFETY NETS: global document listeners ---
    // HTML5 dragend is unreliable (doesn't always fire, doesn't bubble from handle),
    // so we also listen on document to ALWAYS catch drag termination.
    document.addEventListener('dragend', this.onDocumentDragEnd, true)
    document.addEventListener('mouseup', this.onDocumentMouseUp, true)
    document.addEventListener('drop', this.onDocumentDrop, true)

    this.logger.log('🎧 [INIT] All event listeners attached (including document-level safety nets)')
  }

  /** Find the top-level block DOM element at a given mouse Y position */
  private findTopLevelBlock(y: number): { dom: HTMLElement; pos: number; size: number } | null {
    const { doc } = this.view.state
    let result: { dom: HTMLElement; pos: number; size: number } | null = null
    let bestDistance = Infinity

    doc.forEach((node, offset) => {
      const dom = this.view.nodeDOM(offset)
      if (!(dom instanceof HTMLElement)) return
      const rect = dom.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const distance = Math.abs(y - centerY)
      const inBounds = y >= rect.top - 4 && y <= rect.bottom + 4

      if (inBounds && distance < bestDistance) {
        bestDistance = distance
        result = { dom, pos: offset, size: node.nodeSize }
      }
    })

    return result
  }

  // ================================================================
  // ===== HANDLE VISIBILITY HELPERS ================================
  // ================================================================

  private showHandle(topPx: number, block: { dom: HTMLElement; pos: number; size: number }) {
    this.handle.style.top = `${topPx}px`
    this.handle.style.opacity = '1'
    this.handle.style.pointerEvents = 'auto'

    // Position delete button on the right side of the block
    const containerRect = this.container.getBoundingClientRect()
    const blockRect = block.dom.getBoundingClientRect()
    const deleteLeftPx = blockRect.right - containerRect.left + 4
    this.deleteBtn.style.top = `${topPx}px`
    this.deleteBtn.style.left = `${deleteLeftPx}px`
    this.deleteBtn.style.opacity = '1'
    this.deleteBtn.style.pointerEvents = 'auto'

    if (!this.handleVisible || this.currentNodePos !== block.pos) {
      this.logger.log('✨ [SHOW] Handle visible', {
        tag: block.dom.tagName,
        pos: block.pos,
        size: block.size,
        topPx: topPx.toFixed(1),
        text: block.dom.textContent?.slice(0, 40),
      })
    }

    this.handleVisible = true
    this.currentNodePos = block.pos
    this.currentNodeSize = block.size
  }

  private hideHandle(reason: string) {
    if (this.handleVisible) {
      this.logger.log(`💨 [HIDE] Handle hidden — reason: ${reason}`)
    }
    this.handle.style.opacity = '0'
    this.handle.style.pointerEvents = 'none'
    this.deleteBtn.style.opacity = '0'
    this.deleteBtn.style.pointerEvents = 'none'
    this.handleVisible = false
    this.currentNodePos = null
  }

  // ================================================================
  // ===== VIEW (EDITOR) EVENTS =====================================
  // ================================================================

  private onViewMouseEnter = () => {
    this.logger.log('🖱️ [VIEW] Mouse entered editor')
  }

  private onMouseMove = (e: MouseEvent) => {
    this.mousemoveCount++
    if (this.draggedPos !== null) return // Don't update during drag

    const block = this.findTopLevelBlock(e.clientY)
    if (!block) {
      if (this.handleVisible) this.hideHandle('no block under cursor')
      return
    }

    const containerRect = this.container.getBoundingClientRect()
    const blockRect = block.dom.getBoundingClientRect()
    const topPx = blockRect.top - containerRect.top + blockRect.height / 2 - 10

    this.showHandle(topPx, block)
  }

  private onMouseLeave = (e: MouseEvent) => {
    if (this.draggedPos !== null) return
    const target = e.relatedTarget as Node | null
    if (target && (this.handle === target || this.handle.contains(target))) {
      this.logger.log('👆 [VIEW] Mouse moved to handle, keeping visible')
      return
    }
    if (target && (this.deleteBtn === target || this.deleteBtn.contains(target))) {
      this.logger.log('👆 [VIEW] Mouse moved to delete button, keeping visible')
      return
    }
    this.hideHandle('mouse left editor')
  }

  // ================================================================
  // ===== HANDLE EVENTS ============================================
  // ================================================================

  private onHandleMouseEnter = () => {
    this.logger.log('🎯 [HANDLE] Mouse entered handle', {
      currentNodePos: this.currentNodePos,
      visible: this.handleVisible,
    })
  }

  private onHandleMouseLeave = (e: MouseEvent) => {
    if (this.draggedPos !== null) return
    const target = e.relatedTarget as Node | null
    if (target && this.view.dom.contains(target)) {
      this.logger.log('👆 [HANDLE] Mouse returned from handle to editor')
      return
    }
    this.hideHandle('mouse left handle for outside')
  }

  private onHandleMouseDown = (e: MouseEvent) => {
    this.logger.log('🖱️ [HANDLE] MouseDown', {
      button: e.button,
      currentNodePos: this.currentNodePos,
      clientXY: [e.clientX, e.clientY],
    })
    // Prevent mousedown from reaching PM (would set a text selection)
    e.stopPropagation()
  }

  private onHandleMouseUp = (e: MouseEvent) => {
    this.logger.log('🖱️ [HANDLE] MouseUp', {
      button: e.button,
      draggedPos: this.draggedPos,
    })
  }

  private onHandleClick = (e: MouseEvent) => {
    this.logger.log('🖱️ [HANDLE] Click event', {
      button: e.button,
      detail: e.detail,
    })
    e.stopPropagation()
    e.preventDefault()
  }

  // ================================================================
  // ===== DELETE BUTTON EVENTS =====================================
  // ================================================================

  private onDeleteMouseDown = (e: MouseEvent) => {
    // Prevent mousedown from reaching PM (would set a text selection / blur)
    e.stopPropagation()
    e.preventDefault()
  }

  private onDeleteMouseLeave = (e: MouseEvent) => {
    if (this.draggedPos !== null) return
    const target = e.relatedTarget as Node | null
    if (target && this.view.dom.contains(target)) {
      return
    }
    if (target && (this.handle === target || this.handle.contains(target))) {
      return
    }
    this.hideHandle('mouse left delete button for outside')
  }

  private onDeleteClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (this.currentNodePos === null) {
      this.logger.warn('❌ [DELETE] No current node to delete')
      return
    }

    const { state, dispatch } = this.view
    const pos = this.currentNodePos
    const size = this.currentNodeSize
    const node = state.doc.nodeAt(pos)
    if (!node) {
      this.logger.warn('❌ [DELETE] No node at pos', pos)
      return
    }

    this.logger.log('🗑️ [DELETE] Deleting node', {
      type: node.type.name,
      pos,
      size,
      text: node.textContent.slice(0, 40),
    })

    const tr = state.tr
    // If this is the only block in the doc, replace with an empty paragraph
    // to avoid leaving an invalid empty document.
    if (state.doc.childCount === 1) {
      const paragraph = state.schema.nodes.paragraph
      if (paragraph) {
        tr.replaceWith(pos, pos + size, paragraph.create())
        this.logger.log('   Replaced last block with empty paragraph')
      } else {
        tr.delete(pos, pos + size)
      }
    } else {
      tr.delete(pos, pos + size)
    }

    dispatch(tr)
    this.hideHandle('block deleted')
    this.view.focus()
  }

  // ================================================================
  // ===== DRAG LIFECYCLE ===========================================
  // ================================================================

  private onViewDragStart = (e: DragEvent) => {
    this.logger.log('🔒 [VIEW] dragstart captured (capture phase)', {
      target: (e.target as HTMLElement)?.tagName,
      draggedPos: this.draggedPos,
    })
    if (this.draggedPos !== null) {
      this.logger.log('🛑 [VIEW] Blocking editor dragstart (our drag is active)')
      e.stopImmediatePropagation()
    }
  }

  private onHandleDragStart = (e: DragEvent) => {
    this.logger.group('🚀 [DRAG-START] Handle dragstart')
    this.logger.log('event target:', (e.target as HTMLElement)?.tagName)
    this.logger.log('currentNodePos:', this.currentNodePos)
    this.logger.log('currentNodeSize:', this.currentNodeSize)
    this.logger.log('dataTransfer present:', !!e.dataTransfer)

    if (this.currentNodePos === null) {
      this.logger.warn('❌ Cannot drag: no current node')
      this.logger.groupEnd()
      return
    }

    this.draggedPos = this.currentNodePos
    this.draggedSize = this.currentNodeSize
    this.dragoverCount = 0

    const node = this.view.state.doc.nodeAt(this.draggedPos)
    this.logger.log('📦 Node to drag:', {
      type: node?.type.name,
      size: node?.nodeSize,
      text: node?.textContent.slice(0, 40),
    })

    // Style dragged block
    const dom = this.view.nodeDOM(this.draggedPos)
    if (dom instanceof HTMLElement) {
      dom.classList.add('is-dragging')
      this.logger.log('🎯 Added .is-dragging to', dom.tagName)
    } else {
      this.logger.warn('⚠️ nodeDOM returned non-HTMLElement:', dom)
    }

    // Required for Firefox (and some Chromium versions)
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', 'drag-handle-block')
      e.dataTransfer.effectAllowed = 'move'
      // Use the handle itself as drag image (avoid browser canceling drag)
      try {
        e.dataTransfer.setDragImage(this.handle, 10, 10)
      } catch (err) {
        this.logger.warn('setDragImage failed:', err)
      }
    }

    // ⚠️ DO NOT modify handle style here — changing the drag source element
    // during dragstart can cause the browser to abort the drag immediately.
    // The handle will stay visible but that's fine during drag.
    this.logger.log('✅ Drag initialized, dataTransfer set')
    this.logger.groupEnd()
  }

  private onDragOver = (e: DragEvent) => {
    if (this.draggedPos === null) return
    e.preventDefault()
    e.stopImmediatePropagation()
    this.dragoverCount++

    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

    const block = this.findTopLevelBlock(e.clientY)
    if (!block) {
      this.dropIndicator.style.opacity = '0'
      return
    }

    const containerRect = this.container.getBoundingClientRect()
    const blockRect = block.dom.getBoundingClientRect()
    const mouseRelativeY = e.clientY - blockRect.top
    const isAbove = mouseRelativeY < blockRect.height / 2

    const indicatorY = isAbove
      ? blockRect.top - containerRect.top - 1
      : blockRect.bottom - containerRect.top + 1

    this.dropIndicator.style.top = `${indicatorY}px`
    this.dropIndicator.style.opacity = '1'

    const targetPos = isAbove ? block.pos : block.pos + block.size
    this.dropIndicator.dataset.targetPos = String(targetPos)

    // Throttled log (every 10th dragover)
    if (this.dragoverCount % 10 === 0) {
      this.logger.log(`📍 [DRAG-OVER] #${this.dragoverCount}`, {
        hoverTag: block.dom.tagName,
        hoverPos: block.pos,
        position: isAbove ? 'above' : 'below',
        targetPos,
        indicatorY: indicatorY.toFixed(1),
      })
    }
  }

  private onDrop = (e: DragEvent) => {
    this.logger.group('💧 [DROP] Drop event fired')
    this.logger.log('draggedPos:', this.draggedPos)
    this.logger.log('dragoverCount:', this.dragoverCount)

    if (this.draggedPos === null) {
      this.logger.warn('❌ No draggedPos, aborting')
      this.logger.groupEnd()
      return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    this.logger.log('🛑 stopImmediatePropagation called (PM drop blocked)')

    const targetPosStr = this.dropIndicator.dataset.targetPos
    if (!targetPosStr) {
      this.logger.warn('❌ No target position stored in drop indicator')
      this.logger.groupEnd()
      return
    }

    let targetPos = parseInt(targetPosStr, 10)
    const { state, dispatch } = this.view
    const node = state.doc.nodeAt(this.draggedPos)
    if (!node) {
      this.logger.warn('❌ No node at draggedPos', this.draggedPos)
      this.logger.groupEnd()
      return
    }

    this.logger.log('📦 Moving node:', {
      type: node.type.name,
      nodeSize: node.nodeSize,
      from: this.draggedPos,
      to: targetPos,
      text: node.textContent.slice(0, 40),
    })

    // Don't move if dropping at the same position
    if (targetPos === this.draggedPos || targetPos === this.draggedPos + node.nodeSize) {
      this.logger.log('⏭️ Same position, skipping move')
      this.cleanup()
      this.logger.groupEnd()
      return
    }

    const tr = state.tr

    if (targetPos > this.draggedPos) {
      this.logger.log(`↓ Target is AFTER source. Delete then insert at adjusted pos`)
      tr.delete(this.draggedPos, this.draggedPos + node.nodeSize)
      targetPos -= node.nodeSize
      tr.insert(targetPos, node)
      this.logger.log(`   delete(${this.draggedPos}, ${this.draggedPos + node.nodeSize}) + insert(${targetPos}, node)`)
    } else {
      this.logger.log(`↑ Target is BEFORE source. Insert then delete at adjusted pos`)
      tr.insert(targetPos, node)
      const adjustedOldPos = this.draggedPos + node.nodeSize
      tr.delete(adjustedOldPos, adjustedOldPos + node.nodeSize)
      this.logger.log(`   insert(${targetPos}, node) + delete(${adjustedOldPos}, ${adjustedOldPos + node.nodeSize})`)
    }

    dispatch(tr)
    this.logger.log('✅ Transaction dispatched successfully')
    this.cleanup()
    this.logger.groupEnd()
  }

  private onDragEnd = (e: DragEvent) => {
    this.logger.log('🏁 [DRAG-END] (view/handle)', {
      dropEffect: e.dataTransfer?.dropEffect,
      draggedPos: this.draggedPos,
      target: (e.target as HTMLElement)?.tagName,
    })
    this.cleanup()
  }

  // ================================================================
  // ===== SAFETY NETS (document-level) =============================
  // ================================================================

  private onDocumentDragEnd = (e: DragEvent) => {
    if (this.draggedPos === null) return
    this.logger.log('🛟 [DOC] dragend safety net', {
      dropEffect: e.dataTransfer?.dropEffect,
    })
    this.cleanup()
  }

  private onDocumentDrop = (e: DragEvent) => {
    if (this.draggedPos === null) return
    // Only log — cleanup will happen via dragend safety net
    this.logger.log('🛟 [DOC] drop safety net', {
      target: (e.target as HTMLElement)?.tagName,
    })
  }

  private onDocumentMouseUp = (_e: MouseEvent) => {
    if (this.draggedPos === null) return
    this.logger.warn('🛟 [DOC] mouseup while dragging — forcing cleanup')
    this.cleanup()
  }

  private onViewDragEnter = (e: DragEvent) => {
    if (this.draggedPos === null) return
    e.preventDefault()
    this.logger.log('➡️ [VIEW] dragenter', {
      target: (e.target as HTMLElement)?.tagName,
    })
  }

  private onViewDragLeave = (e: DragEvent) => {
    if (this.draggedPos === null) return
    this.logger.log('⬅️ [VIEW] dragleave', {
      target: (e.target as HTMLElement)?.tagName,
      relatedTarget: (e.relatedTarget as HTMLElement)?.tagName,
    })
  }

  private cleanup() {
    if (this.draggedPos === null && !this.handleVisible) return
    this.logger.log('🧹 [CLEANUP] Resetting drag state', {
      draggedPos: this.draggedPos,
      handleVisible: this.handleVisible,
    })
    const draggingEls = this.view.dom.querySelectorAll('.is-dragging')
    if (draggingEls.length > 0) {
      this.logger.log(`  Removing .is-dragging from ${draggingEls.length} element(s)`)
      draggingEls.forEach((el) => el.classList.remove('is-dragging'))
    }
    this.dropIndicator.style.opacity = '0'
    this.dropIndicator.dataset.targetPos = ''
    this.draggedPos = null
    this.draggedSize = 0
    // Reset handle + delete btn to hidden state — next mousemove will re-show them
    this.handle.style.opacity = '0'
    this.handle.style.pointerEvents = 'none'
    this.deleteBtn.style.opacity = '0'
    this.deleteBtn.style.pointerEvents = 'none'
    this.handleVisible = false
    this.currentNodePos = null
  }

  destroy() {
    this.logger.log('🔴 [DESTROY] Plugin destroyed')
    this.handle.removeEventListener('dragstart', this.onHandleDragStart)
    this.handle.removeEventListener('dragend', this.onDragEnd)
    this.handle.removeEventListener('mouseleave', this.onHandleMouseLeave)
    this.handle.removeEventListener('mouseenter', this.onHandleMouseEnter)
    this.handle.removeEventListener('mousedown', this.onHandleMouseDown)
    this.handle.removeEventListener('mouseup', this.onHandleMouseUp)
    this.handle.removeEventListener('click', this.onHandleClick)
    this.deleteBtn.removeEventListener('mousedown', this.onDeleteMouseDown)
    this.deleteBtn.removeEventListener('click', this.onDeleteClick)
    this.deleteBtn.removeEventListener('mouseleave', this.onDeleteMouseLeave)
    this.view.dom.removeEventListener('mousemove', this.onMouseMove)
    this.view.dom.removeEventListener('mouseleave', this.onMouseLeave)
    this.view.dom.removeEventListener('mouseenter', this.onViewMouseEnter)
    this.view.dom.removeEventListener('dragover', this.onDragOver, true)
    this.view.dom.removeEventListener('drop', this.onDrop, true)
    this.view.dom.removeEventListener('dragend', this.onDragEnd)
    this.view.dom.removeEventListener('dragenter', this.onViewDragEnter)
    this.view.dom.removeEventListener('dragleave', this.onViewDragLeave)
    this.view.dom.removeEventListener('dragstart', this.onViewDragStart, true)
    document.removeEventListener('dragend', this.onDocumentDragEnd, true)
    document.removeEventListener('mouseup', this.onDocumentMouseUp, true)
    document.removeEventListener('drop', this.onDocumentDrop, true)
    this.handle.remove()
    this.deleteBtn.remove()
    this.dropIndicator.remove()
  }
}

export const DragHandle = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragHandle'),
        view(editorView) {
          return new DragHandleView(editorView)
        },
      }),
    ]
  },
})
