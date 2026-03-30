<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { OutlineSection } from '@shared/types/index.js'

defineProps<{
  section: OutlineSection
  isDragging: boolean
  isDragOver: boolean
}>()

const emit = defineEmits<{
  'update:section': [updates: Partial<OutlineSection>]
  delete: []
  'add-after': [level: 2 | 3]
  dragstart: [event: DragEvent]
  dragover: [event: DragEvent]
  drop: [event: DragEvent]
  dragend: [event: DragEvent]
}>()

const isEditing = ref(false)
const editInput = ref<HTMLInputElement | null>(null)
const editValue = ref('')

const annotationLabels: Record<string, string> = {
  'sommaire-cliquable': 'Sommaire',
  'content-valeur': 'Contenu valeur',
  'content-reminder': 'Rappel',
  'answer-capsule': 'Answer Capsule',
}

const levelIcons: Record<number, string> = {
  1: '★',
  2: '●',
  3: '·',
}

function startEdit(currentTitle: string) {
  editValue.value = currentTitle
  isEditing.value = true
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

function confirmEdit() {
  const trimmed = editValue.value.trim()
  if (trimmed) {
    emit('update:section', { title: trimmed })
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}
</script>

<template>
  <div
    class="outline-node"
    :class="[
      `level-${section.level}`,
      { 'is-dragging': isDragging, 'is-drag-over': isDragOver },
    ]"
    :draggable="section.level !== 1"
    @dragstart="emit('dragstart', $event)"
    @dragover="emit('dragover', $event)"
    @drop="emit('drop', $event)"
    @dragend="emit('dragend', $event)"
  >
    <span class="drag-handle" :class="{ disabled: section.level === 1 }">⠿</span>

    <span class="section-icon">{{ levelIcons[section.level] ?? '·' }}</span>

    <!-- Edit mode -->
    <input
      v-if="isEditing"
      ref="editInput"
      v-model="editValue"
      class="edit-input"
      type="text"
      @blur="confirmEdit"
      @keydown="onKeydown"
    />

    <!-- Display mode -->
    <span
      v-else
      class="section-title"
      @dblclick="startEdit(section.title)"
    >
      {{ section.title }}
    </span>

    <span
      v-if="section.annotation"
      class="annotation-badge"
      :class="`annotation--${section.annotation}`"
    >
      {{ annotationLabels[section.annotation] ?? section.annotation }}
    </span>

    <div class="node-actions">
      <button
        class="action-btn"
        title="Modifier le titre"
        @click="startEdit(section.title)"
      >
        ✎
      </button>
      <button
        v-if="section.level !== 1"
        class="action-btn action-btn--danger"
        title="Supprimer la section"
        @click="emit('delete')"
      >
        ✕
      </button>
      <button
        class="action-btn"
        title="Ajouter H2 après"
        @click="emit('add-after', 2)"
      >
        +H2
      </button>
      <button
        class="action-btn"
        title="Ajouter H3 après"
        @click="emit('add-after', 3)"
      >
        +H3
      </button>
    </div>
  </div>
</template>

<style scoped>
.outline-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem;
  border-radius: 6px;
  transition: background 0.15s;
  cursor: default;
}

.outline-node:hover {
  background: var(--color-surface);
}

.outline-node.is-dragging {
  opacity: 0.4;
}

.outline-node.is-drag-over {
  border-top: 2px solid var(--color-primary);
}

.drag-handle {
  cursor: grab;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  user-select: none;
  flex-shrink: 0;
}

.drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
}

.level-1 {
  padding-left: 0;
  font-weight: 700;
  font-size: 1rem;
}

.level-2 {
  padding-left: 1.25rem;
  font-weight: 500;
  font-size: 0.9375rem;
}

.level-3 {
  padding-left: 2.5rem;
  font-weight: 400;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.section-icon {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
  color: var(--color-primary);
}

.level-3 .section-icon {
  color: var(--color-text-muted);
}

.section-title {
  flex: 1;
  color: var(--color-text);
  cursor: text;
}

.level-3 .section-title {
  color: var(--color-text-muted);
}

.edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: inherit;
  font-weight: inherit;
  font-family: inherit;
  outline: none;
  color: var(--color-text);
  background: var(--color-background);
}

.annotation-badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.annotation--sommaire-cliquable {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.annotation--content-valeur {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.annotation--content-reminder {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.annotation--answer-capsule {
  background: var(--color-badge-purple-bg);
  color: var(--color-badge-purple-text);
}

.node-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.outline-node:hover .node-actions {
  opacity: 1;
}

.action-btn {
  padding: 0.125rem 0.375rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  border-radius: 4px;
  line-height: 1;
}

.action-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.action-btn--danger:hover {
  background: var(--color-bg-danger-hover);
  color: var(--color-error);
}
</style>
