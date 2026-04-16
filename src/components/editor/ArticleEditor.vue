<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { ContentValeur } from './tiptap/extensions/content-valeur'
import { ContentReminder } from './tiptap/extensions/content-reminder'
import { AnswerCapsule } from './tiptap/extensions/answer-capsule'
import { InternalLink } from './tiptap/extensions/internal-link'
import { DragHandle } from './tiptap/extensions/drag-handle'
import { DynamicBlock } from './tiptap/extensions/dynamic-block'
import { DynamicBlockDrop } from './tiptap/extensions/dynamic-block-drop'
import { mergeConsecutiveElements, removeEmptyElements, splitArticleSections } from '@shared/html-utils'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import { log } from '@/utils/logger'

const props = withDefaults(defineProps<{
  content: string
  editable?: boolean
  articleId?: number
  keyword?: string
  keywords?: string[]
}>(), {
  editable: true,
  articleId: 0,
  keyword: '',
  keywords: () => [],
})

const emit = defineEmits<{
  'update:content': [html: string]
}>()

// --- Pre-process: merge consecutive elements, clean empties, then split ---
function processAndSplit(html: string) {
  const merged = mergeConsecutiveElements(html)
  const cleaned = removeEmptyElements(merged)
  return splitArticleSections(cleaned)
}

const initialSections = processAndSplit(props.content)

// --- Shared TipTap extensions factory ---
function createExtensions(placeholder: string) {
  return [
    StarterKit,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder }),
    ContentValeur,
    ContentReminder,
    AnswerCapsule,
    InternalLink,
    DynamicBlock,
    DynamicBlockDrop.configure({
      articleId: props.articleId,
      getKeyword: () => props.keyword || undefined,
      getKeywords: () => props.keywords ?? [],
    }),
    DragHandle,
  ]
}

// --- Track active (focused) editor for toolbar/bubble menu ---
const activeEditorKey = ref<string>('body')

// --- Create 3 section editors ---
const introEditor = useEditor({
  content: initialSections.intro,
  editable: props.editable,
  extensions: createExtensions('Introduction...'),
  onUpdate: () => emitCombinedContent(),
  onFocus: () => { activeEditorKey.value = 'intro' },
})

const bodyEditor = useEditor({
  content: initialSections.body,
  editable: props.editable,
  extensions: createExtensions('Corps de l\'article...'),
  onUpdate: () => emitCombinedContent(),
  onFocus: () => { activeEditorKey.value = 'body' },
})

const conclusionEditor = useEditor({
  content: initialSections.conclusion,
  editable: props.editable,
  extensions: createExtensions('Conclusion...'),
  onUpdate: () => emitCombinedContent(),
  onFocus: () => { activeEditorKey.value = 'conclusion' },
})

const editors: Record<string, ReturnType<typeof useEditor>> = {
  intro: introEditor,
  body: bodyEditor,
  conclusion: conclusionEditor,
}

// --- Expose the active editor for toolbar and bubble menu ---
const editor = computed<Editor | undefined>(() =>
  editors[activeEditorKey.value]?.value ?? bodyEditor.value ?? undefined,
)

defineExpose({ editor })

// --- Combine all section HTML into a single article HTML ---
function getCombinedHTML(): string {
  const parts: string[] = []
  for (const ed of [introEditor, bodyEditor, conclusionEditor]) {
    if (ed.value) {
      const html = ed.value.getHTML()
      if (html && html !== '<p></p>') parts.push(html)
    }
  }
  return parts.join('\n')
}

function emitCombinedContent() {
  emit('update:content', getCombinedHTML())
}

// --- Sync from parent when content changes externally (e.g., load from API) ---
watch(() => props.content, (newContent) => {
  const currentCombined = getCombinedHTML()
  if (currentCombined === newContent) {
    log.debug('[ArticleEditor] 🔄 watcher — bail out (current === new)', {
      newContentLength: newContent.length,
      hasDynamicBlock: newContent.includes('dynamic-block'),
    })
    return
  }

  log.warn('[ArticleEditor] ⚠️ watcher — content differs, will re-set each editor', {
    currentLength: currentCombined.length,
    newLength: newContent.length,
    currentHasDynamic: currentCombined.includes('dynamic-block'),
    newHasDynamic: newContent.includes('dynamic-block'),
    currentPreviewTail: currentCombined.slice(-200),
    newPreviewTail: newContent.slice(-200),
  })

  const newSections = processAndSplit(newContent)
  const pairs: Array<[ReturnType<typeof useEditor>, string, string]> = [
    [introEditor, newSections.intro, 'intro'],
    [bodyEditor, newSections.body, 'body'],
    [conclusionEditor, newSections.conclusion, 'conclusion'],
  ]

  for (const [ed, html, key] of pairs) {
    if (ed.value && ed.value.getHTML() !== html) {
      log.warn(`[ArticleEditor] 🔥 re-setContent on "${key}"`, {
        oldHas: ed.value.getHTML().includes('dynamic-block'),
        newHas: html.includes('dynamic-block'),
      })
      ed.value.commands.setContent(html, { emitUpdate: false })
    }
  }
})

// --- Section config for template ---
const sectionConfig = [
  { key: 'intro', label: 'Introduction', editor: introEditor, defaultOpen: true, initial: initialSections.intro },
  { key: 'body', label: 'Corps de l\'article', editor: bodyEditor, defaultOpen: true, initial: initialSections.body },
  { key: 'conclusion', label: 'Conclusion', editor: conclusionEditor, defaultOpen: true, initial: initialSections.conclusion },
]
</script>

<template>
  <div class="article-editor">
    <template v-for="section in sectionConfig" :key="section.key">
      <CollapsableSection
        v-if="section.editor.value && section.initial"
        :title="section.label"
        :default-open="section.defaultOpen"
      >
        <div class="section-editor-wrapper" :class="`section-${section.key}`">
          <EditorContent :editor="section.editor.value" />
        </div>
      </CollapsableSection>
    </template>
  </div>
</template>

<style scoped>
.article-editor {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  padding: 0.5rem;
}

.section-editor-wrapper {
  margin-bottom: 0.25rem;
}

/* --- Uniform border/padding on top-level block elements --- */

.section-editor-wrapper :deep(.ProseMirror > h2),
.section-editor-wrapper :deep(.ProseMirror > h3),
.section-editor-wrapper :deep(.ProseMirror > p),
.section-editor-wrapper :deep(.ProseMirror > ul),
.section-editor-wrapper :deep(.ProseMirror > ol),
.section-editor-wrapper :deep(.ProseMirror > blockquote),
.section-editor-wrapper :deep(.ProseMirror > table),
.section-editor-wrapper :deep(.ProseMirror > div) {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.section-editor-wrapper :deep(.ProseMirror > h2) {
  font-size: 1.375rem;
  font-weight: 700;
  margin-top: 1.5rem;
}

.section-editor-wrapper :deep(.ProseMirror > h3) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1.25rem;
}

.section-editor-wrapper :deep(.ProseMirror > ul),
.section-editor-wrapper :deep(.ProseMirror > ol) {
  padding-left: 2rem;
}

.section-editor-wrapper :deep(.ProseMirror > blockquote) {
  color: var(--color-text-muted);
  font-style: italic;
}

.section-editor-wrapper :deep(.ProseMirror > table) {
  width: 100%;
  border-collapse: collapse;
}

/* --- Dynamic blocks — annule la box générique ci-dessus pour laisser la
       CSS globale (.dynamic-block + variantes) piloter le rendu. --- */
.section-editor-wrapper :deep(.ProseMirror > div.dynamic-block) {
  /* reset du padding/border uniforme appliqué plus haut */
  padding: 1rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin: 1.25rem 0;
}
</style>
