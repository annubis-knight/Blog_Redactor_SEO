<script setup lang="ts">
import { watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { ContentValeur } from './tiptap/extensions/content-valeur'
import { ContentReminder } from './tiptap/extensions/content-reminder'
import { AnswerCapsule } from './tiptap/extensions/answer-capsule'
import { InternalLink } from './tiptap/extensions/internal-link'

const props = withDefaults(defineProps<{
  content: string
  editable?: boolean
}>(), {
  editable: true,
})

const emit = defineEmits<{
  'update:content': [html: string]
}>()

const editor = useEditor({
  content: props.content,
  editable: props.editable,
  extensions: [
    StarterKit,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: 'Commencez à écrire...' }),
    ContentValeur,
    ContentReminder,
    AnswerCapsule,
    InternalLink,
  ],
  onUpdate: ({ editor: ed }) => {
    emit('update:content', ed.getHTML())
  },
})

watch(() => props.content, (newContent) => {
  if (editor.value && editor.value.getHTML() !== newContent) {
    editor.value.commands.setContent(newContent, { emitUpdate: false })
  }
})

defineExpose({ editor })
</script>

<template>
  <div class="article-editor">
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
.article-editor {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
</style>
