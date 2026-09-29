import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import { useStreaming } from '@/composables/editor/useStreaming'
import { apiPut } from '@/services/api.service'
import type { Outline, OutlineSection, BriefData, ApiUsage } from '@shared/types/index.js'
import type { ProposeLieutenantsHnNode } from '@shared/types/serp-analysis.types.js'
import { articleMainKeyword } from '@shared/utils/article-keyword.js'
import { structureToOutline } from '@shared/structure-outline.js'

/**
 * Transform HN structure from Moteur into an editable Outline. La conversion
 * vit dans `shared/structure-outline.ts` : le mode automatique l'utilise aussi.
 */
export function hnToOutline(hnNodes: ProposeLieutenantsHnNode[], articleTitle: string): Outline {
  return structureToOutline(hnNodes, articleTitle)
}

const MAX_UNDO_STACK = 20

export const useOutlineStore = defineStore('outline', () => {
  const outline = ref<Outline | null>(null)
  const streamedText = ref('')
  const isGenerating = ref(false)
  const isValidated = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const lastApiUsage = ref<ApiUsage | null>(null)

  // --- Undo / Redo ---
  const undoStack = ref<Outline[]>([])
  const redoStack = ref<Outline[]>([])
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function pushUndo() {
    if (!outline.value) return
    undoStack.value.push(JSON.parse(JSON.stringify(outline.value)))
    if (undoStack.value.length > MAX_UNDO_STACK) undoStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    if (!canUndo.value || !outline.value) return
    redoStack.value.push(JSON.parse(JSON.stringify(outline.value)))
    if (redoStack.value.length > MAX_UNDO_STACK) redoStack.value.shift()
    outline.value = undoStack.value.pop()!
  }

  function redo() {
    if (!canRedo.value || !outline.value) return
    undoStack.value.push(JSON.parse(JSON.stringify(outline.value)))
    if (undoStack.value.length > MAX_UNDO_STACK) undoStack.value.shift()
    outline.value = redoStack.value.pop()!
  }

  async function generateOutline(briefData: BriefData) {
    log.info(`Generating outline for "${briefData.article.title}"`)
    isGenerating.value = true
    isValidated.value = false
    error.value = null
    streamedText.value = ''
    outline.value = null
    lastApiUsage.value = null

    const body = {
      articleId: briefData.article.id,
      // Le capitaine de CET article, pas le mot-clé pilier du cocon (épopée qualité SEO, R3).
      keyword: articleMainKeyword(briefData.article),
      keywords: briefData.keywords.map(kw => kw.keyword),
      paa: briefData.dataForSeo?.paa ?? [],
      articleType: briefData.article.type,
      articleTitle: briefData.article.title,
      cocoonName: briefData.article.cocoonName,
      topic: briefData.article.topic,
    }

    const streaming = useStreaming<Outline>()

    await streaming.startStream('/api/generate/outline', body, {
      onChunk: (accumulated) => { streamedText.value = accumulated },
      onDone: (data) => {
        // AI-generated sections start as 'suggested'
        outline.value = {
          sections: data.sections.map(s => ({ ...s, status: s.status ?? 'suggested' })),
        }
        log.info('Outline generated', { sections: data.sections.length })
      },
      onError: (message) => {
        log.error(`Outline generation failed — ${message}`)
        error.value = message
      },
      onUsage: (u) => { lastApiUsage.value = u },
    })

    isGenerating.value = false
  }

  function addSection(afterId: string | null, level: 2 | 3) {
    if (!outline.value) return
    pushUndo()
    const newSection: OutlineSection = {
      id: `h${level}-${Date.now()}`,
      level,
      title: 'Nouvelle section',
      annotation: null,
      status: 'accepted',
    }
    if (!afterId) {
      outline.value = { sections: [...outline.value.sections, newSection] }
      return
    }
    const sections = [...outline.value.sections]
    const idx = sections.findIndex(s => s.id === afterId)
    sections.splice(idx + 1, 0, newSection)
    outline.value = { sections }
  }

  function removeSection(id: string) {
    if (!outline.value) return
    pushUndo()
    outline.value = { sections: outline.value.sections.filter(s => s.id !== id) }
  }

  function updateSection(id: string, updates: Partial<OutlineSection>) {
    if (!outline.value) return
    // No pushUndo here — updateSection is called on every keystroke (title editing).
    // Undo captures structural changes only (add, remove, reorder).
    outline.value = {
      sections: outline.value.sections.map(s =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    }
  }

  function reorderSections(fromIndex: number, toIndex: number) {
    if (!outline.value) return
    pushUndo()
    const sections = [...outline.value.sections]
    const moved = sections.splice(fromIndex, 1)[0]
    if (!moved) return
    sections.splice(toIndex, 0, moved)
    outline.value = { sections }
  }

  function setOutline(newOutline: Outline) {
    outline.value = newOutline
    isValidated.value = false
  }

  /** Hydrate store with a previously saved & validated outline */
  function loadExistingOutline(saved: Outline) {
    // Backward compat: old outlines without status default to 'accepted'
    outline.value = {
      sections: saved.sections.map(s => ({ ...s, status: s.status ?? 'accepted' })),
    }
    isValidated.value = true
  }

  /** Hydrate store from a persisted HN structure (not validated yet) */
  function loadFromHnStructure(hnNodes: ProposeLieutenantsHnNode[], articleTitle: string) {
    outline.value = hnToOutline(hnNodes, articleTitle)
    isValidated.value = false
  }

  async function validateOutline(articleId: number) {
    if (!outline.value) return
    isSaving.value = true
    error.value = null

    // Promote suggested sections to accepted
    outline.value = {
      sections: outline.value.sections.map(s => ({
        ...s,
        status: s.status === 'suggested' ? 'accepted' : s.status,
      })),
    }

    // Optimistic update
    isValidated.value = true

    try {
      await apiPut(`/articles/${articleId}`, { outline: outline.value })
      log.info(`Outline validated for article ${articleId}`)
    } catch (err) {
      // Rollback on failure
      isValidated.value = false
      log.error(`Outline validation failed — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
    } finally {
      isSaving.value = false
    }
  }

  function unvalidateOutline() {
    isValidated.value = false
  }

  function resetOutline() {
    outline.value = null
    streamedText.value = ''
    error.value = null
    isValidated.value = false
    undoStack.value = []
    redoStack.value = []
  }

  return {
    outline, streamedText, isGenerating, isValidated, isSaving, error, lastApiUsage,
    canUndo, canRedo,
    generateOutline, addSection, removeSection, updateSection, reorderSections,
    setOutline, loadExistingOutline, loadFromHnStructure, validateOutline, unvalidateOutline, resetOutline,
    undo, redo,
  }
})
