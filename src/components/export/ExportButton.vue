<script setup lang="ts">
import { ref } from 'vue'
import { apiPost, apiPut } from '@/services/api.service'

const props = defineProps<{
  slug: string
}>()

const emit = defineEmits<{
  'export-ready': [html: string]
}>()

const isExporting = ref(false)
const error = ref<string | null>(null)

async function handleExport() {
  isExporting.value = true
  error.value = null

  try {
    const result = await apiPost<{ html: string; slug: string }>(`/export/${props.slug}`, {})
    // Update article status to 'publié' after successful export
    await apiPut(`/articles/${props.slug}/status`, { status: 'publié' })
    emit('export-ready', result.html)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de l\'export'
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="export-button-wrapper">
    <button
      class="btn-export"
      :disabled="isExporting"
      @click="handleExport"
    >
      {{ isExporting ? 'Export...' : 'Exporter HTML' }}
    </button>
    <span v-if="error" class="export-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.export-button-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-export {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-success);
  color: white;
  cursor: pointer;
}

.btn-export:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-error {
  font-size: 0.8125rem;
  color: var(--color-error);
}
</style>
