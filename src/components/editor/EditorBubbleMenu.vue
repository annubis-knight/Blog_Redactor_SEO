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
  background: var(--color-text);
  border-radius: 6px;
  padding: 0.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.bubble-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.bubble-btn.active {
  background: var(--color-primary);
}

.bubble-separator {
  width: 1px;
  margin: 0.25rem 0.125rem;
  background: rgba(255, 255, 255, 0.25);
}

.bubble-btn-action {
  font-size: 0.875rem;
}
</style>
