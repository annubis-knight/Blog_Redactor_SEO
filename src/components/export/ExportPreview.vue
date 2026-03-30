<script setup lang="ts">
defineProps<{
  html: string
  slug: string
}>()

const emit = defineEmits<{
  'close': []
}>()

function downloadHtml(html: string, slug: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="export-preview" role="dialog" aria-label="Aperçu de l'export HTML">
    <div class="preview-header">
      <h3 class="preview-title">Aperçu HTML</h3>
      <div class="preview-actions">
        <button class="btn-download" @click="downloadHtml(html, slug)">
          Télécharger
        </button>
        <button class="btn-close" aria-label="Fermer l'aperçu" @click="emit('close')">✕</button>
      </div>
    </div>

    <div class="preview-frame">
      <iframe
        :srcdoc="html"
        class="preview-iframe"
        sandbox="allow-same-origin"
        title="Aperçu du HTML exporté"
      />
    </div>

    <div class="preview-source">
      <details>
        <summary class="source-toggle">Code source HTML</summary>
        <pre class="source-code">{{ html }}</pre>
      </details>
    </div>
  </div>
</template>

<style scoped>
.export-preview {
  background: var(--color-bg-elevated);
  border-radius: 12px;
  width: 90vw;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.preview-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-download {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-success);
  color: white;
  cursor: pointer;
}

.btn-download:hover {
  opacity: 0.9;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--color-text-muted);
  padding: 0.25rem 0.5rem;
}

.preview-frame {
  flex: 1;
  min-height: 400px;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: none;
}

.preview-source {
  border-top: 1px solid var(--color-border);
  max-height: 200px;
  overflow-y: auto;
}

.source-toggle {
  padding: 0.75rem 1.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-muted);
}

.source-code {
  padding: 0 1.5rem 1rem;
  font-size: 0.75rem;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
