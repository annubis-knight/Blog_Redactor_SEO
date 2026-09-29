<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { IMAGE_TO_PROVIDE_SRC } from '@shared/constants/image-placeholder.js'

const props = defineProps<{
  editor: Editor | undefined
}>()

/** Adresse d'image admise : un fichier du site (`/…`) ou une adresse web. */
const IMAGE_URL = /^(https?:\/\/|\/(?!\/))\S+$/i

/** Pourquoi la dernière image n'a pas été posée (vide = rien à dire). */
const imageNotice = ref<string | null>(null)

/**
 * Remplace l'image sélectionnée (la place « à fournir » posée par la passe
 * images, que la publication refuse) ou insère une image avec son texte
 * alternatif (R20). Le texte alternatif se relit et se corrige au remplacement ;
 * une adresse refusée ou un texte alternatif vide sont dits, pas ignorés.
 */
function setImage() {
  if (!props.editor) return
  imageNotice.value = null
  const selected = props.editor.isActive('image') ? (props.editor.getAttributes('image') as { src?: string; alt?: string }) : null
  const current = selected?.src && selected.src !== IMAGE_TO_PROVIDE_SRC ? selected.src : ''
  const answer = prompt('Adresse de l’image (https://… ou /images/…) :', current)
  if (answer === null) return
  const src = answer.trim()
  if (!IMAGE_URL.test(src)) {
    imageNotice.value = 'Adresse refusée : elle doit commencer par https:// ou par / (un fichier du site).'
    return
  }
  const alt = prompt('Texte alternatif — ce que montre l’image :', selected?.alt ?? '')?.trim()
  if (!alt) {
    imageNotice.value = 'Sans texte alternatif, l’image n’est pas posée : décrivez ce qu’elle montre.'
    return
  }
  if (selected) props.editor.chain().focus().updateAttributes('image', { src, alt }).run()
  else props.editor.chain().focus().setImage({ src, alt }).run()
}

function toggleLink() {
  if (!props.editor) return
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
  <div v-if="editor" class="editor-toolbar">
    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('bold') }"
      title="Gras"
      @click="editor.chain().focus().toggleBold().run()"
    >
      B
    </button>

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('italic') }"
      title="Italique"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <em>I</em>
    </button>

    <span class="toolbar-divider" />

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('heading', { level: 2 }) }"
      title="Titre H2"
      @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
    >
      H2
    </button>

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('heading', { level: 3 }) }"
      title="Titre H3"
      @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
    >
      H3
    </button>

    <span class="toolbar-divider" />

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('bulletList') }"
      title="Liste à puces"
      @click="editor.chain().focus().toggleBulletList().run()"
    >
      &#8226;
    </button>

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('orderedList') }"
      title="Liste numérotée"
      @click="editor.chain().focus().toggleOrderedList().run()"
    >
      1.
    </button>

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('blockquote') }"
      title="Citation"
      @click="editor.chain().focus().toggleBlockquote().run()"
    >
      &#8220;
    </button>

    <button
      class="toolbar-btn"
      :class="{ active: editor.isActive('link') }"
      title="Lien"
      @click="toggleLink()"
    >
      &#128279;
    </button>

    <button
      class="toolbar-btn"
      data-testid="toolbar-image"
      :class="{ active: editor.isActive('image') }"
      :title="editor.isActive('image') ? 'Remplacer l’image' : 'Insérer une image'"
      @click="setImage()"
    >
      &#128247;
    </button>
    <span v-if="imageNotice" class="toolbar-notice" data-testid="toolbar-image-notice" role="status">{{ imageNotice }}</span>

    <span class="toolbar-divider" />

    <button
      class="toolbar-btn"
      title="Annuler"
      :disabled="!editor.can().undo()"
      @click="editor.chain().focus().undo().run()"
    >
      &#8617;
    </button>

    <button
      class="toolbar-btn"
      title="Rétablir"
      :disabled="!editor.can().redo()"
      @click="editor.chain().focus().redo().run()"
    >
      &#8618;
    </button>
  </div>
</template>

<style scoped>
.toolbar-notice {
  align-self: center;
  margin-left: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-warning, #b45309);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--color-border);
}

.toolbar-btn.active {
  background: var(--color-primary);
  color: white;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 1px;
  height: 1.25rem;
  background: var(--color-border);
  margin: 0 0.25rem;
}
</style>
