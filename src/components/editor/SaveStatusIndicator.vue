<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/article/editor.store'

const editorStore = useEditorStore()

const relativeTime = computed(() => {
  if (!editorStore.lastSavedAt) return ''
  const diff = Date.now() - new Date(editorStore.lastSavedAt).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 10) return "à l'instant"
  if (seconds < 60) return `il y a ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `il y a ${minutes}min`
})
</script>

<template>
  <span v-if="editorStore.isSaving" class="save-status saving">
    <span class="spinner" aria-hidden="true"></span>
    Sauvegarde en cours...
  </span>
  <span v-else-if="!editorStore.isDirty && editorStore.lastSavedAt" class="save-status saved">
    &#10003; Sauvegardé {{ relativeTime }}
  </span>
  <span v-else-if="editorStore.isDirty" class="save-status unsaved">
    &#9888; Modifications non sauvegardées
  </span>
</template>

<style scoped>
.save-status {
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.saving {
  color: var(--color-text-muted);
}

.saved {
  color: var(--color-success);
}

.unsaved {
  color: var(--color-warning);
}

.spinner {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--color-text-muted);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
