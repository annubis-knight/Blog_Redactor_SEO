import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { NlpResult, NlpState } from '../../shared/types/intent.types.js'
import { log } from '@/utils/logger'

// --- Constants ---

const STORAGE_KEY = 'nlp-enabled'
const MODEL_ID = 'Xenova/mobilebert-uncased-mnli'

const MAX_NLP_RESULTS = 200

const PAIN_LABELS = [
  'problème technique',
  'besoin financier',
  'question santé',
  'recherche produit',
  'demande service',
  'information générale',
]

// --- Singleton state ---

const nlpState = ref<NlpState>('disabled')
const downloadProgress = ref(0)
const estimatedTimeLeft = ref<number | null>(null)
const analysisProgress = ref({ done: 0, total: 0 })
const results = ref<Map<string, NlpResult>>(new Map())
const isEnabled = ref(false)

let classifier: unknown = null
let abortController: AbortController | null = null
let downloadStartTime = 0
let downloadedBytes = 0

// --- Helpers ---

function checkSupport(): boolean {
  if (typeof WebAssembly !== 'object') {
    nlpState.value = 'unsupported'
    return false
  }
  return true
}

async function activate(): Promise<void> {
  if (nlpState.value === 'unsupported') return

  nlpState.value = 'loading-model'
  downloadProgress.value = 0
  estimatedTimeLeft.value = null
  downloadStartTime = Date.now()
  downloadedBytes = 0
  abortController = new AbortController()

  try {
    const { pipeline } = await import('@huggingface/transformers')

    classifier = await pipeline('zero-shot-classification', MODEL_ID, {
      progress_callback: (data: { status: string; progress?: number; loaded?: number; total?: number }) => {
        if (abortController?.signal.aborted) return

        if (data.status === 'progress' && data.progress !== undefined) {
          downloadProgress.value = Math.round(data.progress)

          if (data.loaded && data.total) {
            downloadedBytes = data.loaded
            const elapsed = (Date.now() - downloadStartTime) / 1000
            if (elapsed > 0.5 && downloadedBytes > 0) {
              const speed = downloadedBytes / elapsed
              const remaining = data.total - downloadedBytes
              estimatedTimeLeft.value = Math.round(remaining / speed)
            }
          }
        }
      },
    })

    if (abortController.signal.aborted) {
      classifier = null
      nlpState.value = 'disabled'
      return
    }

    nlpState.value = 'active'
    isEnabled.value = true
    localStorage.setItem(STORAGE_KEY, 'true')
    log.info('NLP model loaded successfully')
  } catch (err) {
    if (abortController?.signal.aborted) {
      nlpState.value = 'disabled'
    } else {
      nlpState.value = 'error'
      log.error('NLP model loading failed', { error: (err as Error).message })
    }
  } finally {
    abortController = null
    estimatedTimeLeft.value = null
  }
}

function deactivate(): void {
  nlpState.value = 'disabled'
  isEnabled.value = false
  classifier = null
  results.value = new Map()
  localStorage.setItem(STORAGE_KEY, 'false')
}

function cancel(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  nlpState.value = 'disabled'
  downloadProgress.value = 0
  estimatedTimeLeft.value = null
}

async function analyzeKeywords(keywords: string[]): Promise<void> {
  if (!classifier || nlpState.value === 'unsupported') return

  nlpState.value = 'analyzing'
  analysisProgress.value = { done: 0, total: keywords.length }
  log.debug('NLP analysis started', { count: keywords.length })

  const newResults = new Map<string, NlpResult>()

  for (const kw of keywords) {
    try {
      const output = await (classifier as CallableFunction)(kw, PAIN_LABELS, {
        multi_label: false,
      })

      const allScores: Array<{ label: string; score: number }> = []
      if (output && Array.isArray(output.labels) && Array.isArray(output.scores)) {
        for (let i = 0; i < output.labels.length; i++) {
          allScores.push({
            label: output.labels[i] as string,
            score: Math.round((output.scores[i] as number) * 1000) / 1000,
          })
        }
      }

      newResults.set(kw, {
        label: allScores[0]?.label ?? 'information générale',
        confidence: allScores[0]?.score ?? 0,
        allScores,
      })
    } catch {
      newResults.set(kw, {
        label: 'information générale',
        confidence: 0,
        allScores: [],
      })
    }

    analysisProgress.value = {
      done: analysisProgress.value.done + 1,
      total: keywords.length,
    }
  }

  // Bound results map size
  if (newResults.size > MAX_NLP_RESULTS) {
    const entries = [...newResults.entries()]
    results.value = new Map(entries.slice(entries.length - MAX_NLP_RESULTS))
  } else {
    results.value = newResults
  }
  nlpState.value = 'active'
  log.info('NLP analysis complete', { analyzed: newResults.size })
}

function getNlpSignal(keyword: string): { score: number; label: string; confidence: number } | null {
  const result = results.value.get(keyword)
  if (!result) return null
  return {
    score: result.confidence,
    label: result.label,
    confidence: result.confidence,
  }
}

function resetResults(): void {
  results.value = new Map()
}

function autoReactivate(): void {
  if (!checkSupport()) return

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'true') {
    activate()
  }
}

// --- Composable ---

export function useNlpAnalysis() {
  onMounted(() => {
    if (nlpState.value === 'disabled') {
      checkSupport()
    }
  })

  onBeforeUnmount(() => {
    // Only cancel in-progress download — don't destroy singleton model state
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  })

  const nlpScoresForVerdict = computed<Record<string, number> | null>(() => {
    if (results.value.size === 0) return null
    const map: Record<string, number> = {}
    for (const [kw, r] of results.value) {
      map[kw] = r.confidence
    }
    return map
  })

  return {
    nlpState,
    downloadProgress,
    estimatedTimeLeft,
    analysisProgress,
    results,
    isEnabled,
    nlpScoresForVerdict,
    checkSupport,
    activate,
    deactivate,
    cancel,
    analyzeKeywords,
    getNlpSignal,
    resetResults,
    autoReactivate,
  }
}
