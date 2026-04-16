<script setup lang="ts">
import { ref } from 'vue'
import type { Outline, OutlineSection } from '@shared/types/index.js'
import OutlineNode from './OutlineNode.vue'

const props = defineProps<{
  outline: Outline
}>()

const emit = defineEmits<{
  'update:outline': [outline: Outline]
}>()

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function onDrop(toIndex: number) {
  const fromIndex = dragIndex.value
  dragOverIndex.value = null
  if (fromIndex === null || fromIndex === toIndex) {
    dragIndex.value = null
    return
  }
  const sections = [...props.outline.sections]
  const moved = sections.splice(fromIndex, 1)[0]
  if (!moved) return
  sections.splice(toIndex, 0, moved)
  emit('update:outline', { sections })
  dragIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

function updateSection(id: string, updates: Partial<OutlineSection>) {
  const sections = props.outline.sections.map(s =>
    s.id === id ? { ...s, ...updates } : s,
  )
  emit('update:outline', { sections })
}

function deleteSection(id: string) {
  const sections = props.outline.sections.filter(s => s.id !== id)
  emit('update:outline', { sections })
}

function addSection(afterIndex: number, level: 2 | 3) {
  const sections = [...props.outline.sections]
  const newSection: OutlineSection = {
    id: `h${level}-${Date.now()}`,
    level,
    title: 'Nouvelle section',
    annotation: null,
    status: 'accepted',
  }
  sections.splice(afterIndex + 1, 0, newSection)
  emit('update:outline', { sections })
}
</script>

<template>
  <div class="outline-editor">
    <div class="editor-header">
      <h3 class="editor-title">Sommaire</h3>
      <div class="editor-actions">
        <button
          class="btn btn-add"
          @click="addSection(outline.sections.length - 1, 2)"
        >
          + Ajouter H2
        </button>
        <button
          class="btn btn-add"
          @click="addSection(outline.sections.length - 1, 3)"
        >
          + Ajouter H3
        </button>
      </div>
    </div>

    <div class="sections-list">
      <OutlineNode
        v-for="(section, index) in outline.sections"
        :key="section.id"
        :section="section"
        :is-dragging="dragIndex === index"
        :is-drag-over="dragOverIndex === index && dragIndex !== index"
        @update:section="updateSection(section.id, $event)"
        @delete="deleteSection(section.id)"
        @add-after="addSection(index, $event)"
        @dragstart="onDragStart(index)"
        @dragover="onDragOver(index, $event)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      />
    </div>
  </div>
</template>

<style scoped>
.outline-editor {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.75rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.editor-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  transition: background 0.15s, border-color 0.15s;
}

.btn:hover {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
