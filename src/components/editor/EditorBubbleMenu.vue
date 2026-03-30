<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/vue-3/menus'

const props = defineProps<{
  editor: Editor
}>()

const emit = defineEmits<{
  'open-actions': []
}>()

function toggleLink() {
  if (props.editor.isActive('link')) {
    props.editor.chain().focus().unsetLink().run()
  } else {
    const url = prompt('URL du lien :')
    if (url) {
      props.editor.chain().focus().setLink({ href: url }).run()
    }
  }
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ placement: 'top', offset: [0, 8] }"
    class="bubble-menu"
  >
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('bold') }"
      @click="editor.chain().focus().toggleBold().run()"
    >
      B
    </button>

    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('italic') }"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <em>I</em>
    </button>

    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('link') }"
      @click="toggleLink()"
    >
      &#128279;
    </button>

    <span class="bubble-separator" />

    <button
      class="bubble-btn bubble-btn-action"
      title="Actions IA"
      @click="emit('open-actions')"
    >
      ✦
    </button>
  </BubbleMenu>
</template>

<style scoped>
.bubble-menu {
  display: flex;
  gap: 2px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.bubble-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.bubble-btn:hover {
  background: var(--color-bg-hover);
}

.bubble-btn.active {
  background: var(--color-primary);
  color: white;
}

.bubble-separator {
  width: 1px;
  margin: 0.25rem 0.125rem;
  background: var(--color-border);
}

.bubble-btn-action {
  font-size: 0.875rem;
}
</style>
