<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  selectedText: string
  keyword: string
}>()

const emit = defineEmits<{
  accept: [result: string]
  reject: []
}>()

const isGenerating = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)

async function localize() {
  isGenerating.value = true
  error.value = null
  result.value = null

  try {
    const res = await fetch('/api/generate/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'localize',
        selectedText: props.selectedText,
        keyword: props.keyword,
      }),
    })

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    if (reader) {
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) fullContent += data.content
            } catch { /* skip non-JSON lines */ }
          }
        }
      }
    }

    result.value = fullContent || null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur localisation'
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="localize-action">
    <div v-if="!result" class="localize-prompt">
      <div class="original-text">
        <span class="label">Texte sélectionné</span>
        <blockquote>{{ selectedText }}</blockquote>
      </div>
      <button class="btn btn-primary" :disabled="isGenerating" @click="localize">
        {{ isGenerating ? 'Localisation en cours...' : 'Localiser ce paragraphe' }}
      </button>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>

    <div v-else class="localize-diff">
      <div class="diff-columns">
        <div class="diff-col">
          <span class="label">Original</span>
          <div class="diff-text original">{{ selectedText }}</div>
        </div>
        <div class="diff-col">
          <span class="label">Localisé</span>
          <div class="diff-text localized">{{ result }}</div>
        </div>
      </div>
      <div class="diff-actions">
        <button class="btn btn-success" @click="emit('accept', result!)">Accepter</button>
        <button class="btn btn-secondary" @click="emit('reject')">Rejeter</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.localize-action { padding: 1rem; }
.original-text { margin-bottom: 1rem; }
.label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.25rem; }
blockquote { margin: 0; padding: 0.75rem 1rem; border-left: 3px solid var(--color-primary); background: var(--color-bg-soft); border-radius: 0 6px 6px 0; font-style: italic; font-size: 0.875rem; }
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-success { background: var(--color-success); color: white; }
.btn-secondary { background: var(--color-bg-soft); color: var(--color-text-muted); }
.error-msg { color: var(--color-danger); font-size: 0.8125rem; margin-top: 0.5rem; }
.diff-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.diff-text { padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; line-height: 1.6; }
.diff-text.original { background: #fef2f2; border: 1px solid #fecaca; }
.diff-text.localized { background: #f0fdf4; border: 1px solid #bbf7d0; }
.diff-actions { display: flex; gap: 0.5rem; }
</style>
