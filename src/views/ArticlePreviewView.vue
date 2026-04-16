<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiGet, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'

const route = useRoute()

// --- Article ID from route ---
const articleId = ref<number | null>(null)
{
  const raw = Number(route.params.articleId)
  if (!isNaN(raw) && raw > 0) {
    articleId.value = raw
  }
}

const previewHtml = ref<string | null>(null)
const articleTitle = ref('')
const isLoading = ref(true)
const error = ref<string | null>(null)
const isExporting = ref(false)

async function loadPreview() {
  if (!articleId.value) return
  isLoading.value = true
  error.value = null
  try {
    const data = await apiGet<{ html: string; id: number; title: string }>(`/preview/${articleId.value}`)
    previewHtml.value = data.html
    articleTitle.value = data.title
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement de l\'aperçu'
    log.error('Preview load failed', { articleId: articleId.value, error: (err as Error).message })
  } finally {
    isLoading.value = false
  }
}

function downloadHtml() {
  if (!previewHtml.value || !articleId.value) return
  const blob = new Blob([previewHtml.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `article-${articleId.value}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function handleExport() {
  if (!articleId.value) return
  isExporting.value = true
  try {
    downloadHtml()
    await apiPut(`/articles/${articleId.value}/status`, { status: 'publié' })
    log.info('Article exported and status set to publié', { articleId: articleId.value })
  } catch (err) {
    log.error('Export status update failed', { articleId: articleId.value, error: (err as Error).message })
  } finally {
    isExporting.value = false
  }
}

function goBack() {
  if (window.opener) {
    window.close()
  } else {
    window.location.href = `/article/${articleId.value}/editor`
  }
}

onMounted(async () => {
  if (!articleId.value) {
    error.value = `Article ID "${route.params.articleId}" invalide`
    isLoading.value = false
    return
  }
  log.info('[preview] ArticlePreviewView mounted', { articleId: articleId.value })
  loadPreview()
})
</script>

<template>
  <div class="preview-layout">
    <header class="preview-toolbar">
      <button class="toolbar-back" @click="goBack">
        &larr; Retour à l'éditeur
      </button>
      <span class="toolbar-title">{{ articleTitle }}</span>
      <div class="toolbar-actions">
        <button
          class="toolbar-export"
          :disabled="!previewHtml || isExporting"
          @click="handleExport"
        >
          {{ isExporting ? 'Export...' : 'Exporter HTML' }}
        </button>
      </div>
    </header>

    <div v-if="isLoading" class="preview-state">
      <p>Chargement de l'aperçu...</p>
    </div>

    <div v-else-if="error" class="preview-state preview-state--error">
      <p>{{ error }}</p>
      <button class="toolbar-back" @click="loadPreview">Réessayer</button>
    </div>

    <iframe
      v-else-if="previewHtml"
      :srcdoc="previewHtml"
      class="preview-iframe"
      sandbox="allow-same-origin"
      title="Aperçu de l'article"
    />
  </div>
</template>

<style scoped>
.preview-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1.25rem;
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  min-height: 48px;
}

.toolbar-back {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
}

.toolbar-back:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.toolbar-title {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.toolbar-export {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-success);
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.toolbar-export:hover:not(:disabled) {
  opacity: 0.9;
}

.toolbar-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-iframe {
  flex: 1;
  width: 100%;
  border: none;
}

.preview-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.preview-state--error {
  color: var(--color-error);
}
</style>
