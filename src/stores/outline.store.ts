import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useStreaming } from '@/composables/useStreaming'
import { apiPut } from '@/services/api.service'
import type { Outline, OutlineSection, BriefData } from '@shared/types/index.js'

export const useOutlineStore = defineStore('outline', () => {
  const outline = ref<Outline | null>(null)
  const streamedText = ref('')
  const isGenerating = ref(false)
  const isValidated = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  async function generateOutline(briefData: BriefData) {
    isGenerating.value = true
    isValidated.value = false
    error.value = null
    streamedText.value = ''
    outline.value = null

    const pilierKeyword = briefData.keywords.find(kw => kw.type === 'Pilier')

    const body = {
      slug: briefData.article.slug,
      keyword: pilierKeyword?.keyword ?? briefData.article.title,
      keywords: briefData.keywords.map(kw => kw.keyword),
      paa: briefData.dataForSeo?.paa ?? [],
      articleType: briefData.article.type,
      articleTitle: briefData.article.title,
      cocoonName: briefData.article.cocoonName,
      theme: briefData.article.theme,
    }

    const streaming = useStreaming<Outline>()

    await streaming.startStream('/api/generate/outline', body, {
      onChunk: (accumulated) => { streamedText.value = accumulated },
      onDone: (data) => { outline.value = data },
      onError: (message) => { error.value = message },
    })

    isGenerating.value = false
  }

  function addSection(afterId: string | null, level: 2 | 3) {
    if (!outline.value) return
    const newSection: OutlineSection = {
      id: `h${level}-${Date.now()}`,
      level,
      title: 'Nouvelle section',
      annotation: null,
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
    outline.value = { sections: outline.value.sections.filter(s => s.id !== id) }
  }

  function updateSection(id: string, updates: Partial<OutlineSection>) {
    if (!outline.value) return
    outline.value = {
      sections: outline.value.sections.map(s =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    }
  }

  function reorderSections(fromIndex: number, toIndex: number) {
    if (!outline.value) return
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

  async function validateOutline(slug: string) {
    if (!outline.value) return
    isSaving.value = true
    error.value = null
    try {
      await apiPut(`/articles/${slug}`, { outline: JSON.stringify(outline.value) })
      isValidated.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
    } finally {
      isSaving.value = false
    }
  }

  function resetOutline() {
    outline.value = null
    streamedText.value = ''
    error.value = null
    isValidated.value = false
  }

  return {
    outline, streamedText, isGenerating, isValidated, isSaving, error,
    generateOutline, addSection, removeSection, updateSection, reorderSections,
    setOutline, validateOutline, resetOutline,
  }
})
