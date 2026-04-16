import { ref, computed, onBeforeUnmount } from 'vue'
import { apiGet, apiPost, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import type { ApiUsage } from '@shared/types/index.js'
import type {
  IntentScanResult,
  KeywordRadarGenerateResult,
  KeywordRadarScanResult,
  RadarKeyword,
} from '@shared/types/intent.types.js'

export interface RadarCacheStatus {
  cached: boolean
  cachedAt?: string
  keywordCount?: number
  globalScore?: number
  heatLevel?: string
}

interface RadarCacheData {
  seed: string
  context: { broadKeyword: string; specificTopic: string; painPoint: string; depth: number }
  generatedKeywords: RadarKeyword[]
  scanResult: KeywordRadarScanResult
  cachedAt: string
  expiresAt: string
}

export function useResonanceScore() {
  const result = ref<IntentScanResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const heatColor = computed(() => {
    if (!result.value) return 'var(--color-border)'
    switch (result.value.heatLevel) {
      case 'brulante': return 'var(--color-error, #dc2626)'
      case 'chaude': return 'var(--color-warning, #d97706)'
      case 'tiede': return 'var(--color-primary, #3b82f6)'
      case 'froide': return 'var(--color-text-muted, #94a3b8)'
    }
  })

  const heatLabel = computed(() => {
    if (!result.value) return ''
    switch (result.value.heatLevel) {
      case 'brulante': return 'Brulante'
      case 'chaude': return 'Chaude'
      case 'tiede': return 'Tiede'
      case 'froide': return 'Froide'
    }
  })

  const heatIcon = computed(() => {
    if (!result.value) return ''
    switch (result.value.heatLevel) {
      case 'brulante': return '🔥'
      case 'chaude': return '🟠'
      case 'tiede': return '🔵'
      case 'froide': return '❄️'
    }
  })

  const totalMatches = computed(() =>
    result.value?.items.filter(i => i.match === 'total').length ?? 0,
  )

  const partialMatches = computed(() =>
    result.value?.items.filter(i => i.match === 'partial').length ?? 0,
  )

  async function scan(broadKeyword: string, specificTopic: string, depth: number = 1) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      result.value = await apiPost<IntentScanResult>('/keywords/intent-scan', {
        broadKeyword,
        specificTopic,
        depth,
      })
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  function reset() {
    result.value = null
    loading.value = false
    error.value = null
  }

  return {
    result,
    loading,
    error,
    heatColor,
    heatLabel,
    heatIcon,
    totalMatches,
    partialMatches,
    scan,
    reset,
  }
}

// --- Keyword Radar composable ---

export function radarHeatIcon(level: string | null): string {
  if (!level) return ''
  switch (level) {
    case 'brulante': return '\uD83D\uDD25'
    case 'chaude': return '\uD83D\uDFE0'
    case 'tiede': return '\uD83D\uDD35'
    case 'froide': return '\u2744\uFE0F'
    default: return ''
  }
}

export function radarHeatColor(level: KeywordRadarScanResult['heatLevel'] | null) {
  if (!level) return 'var(--color-border)'
  switch (level) {
    case 'brulante': return 'var(--color-error, #dc2626)'
    case 'chaude': return 'var(--color-warning, #d97706)'
    case 'tiede': return 'var(--color-primary, #3b82f6)'
    case 'froide': return 'var(--color-text-muted, #94a3b8)'
  }
}

export function radarHeatLabel(level: KeywordRadarScanResult['heatLevel'] | null) {
  if (!level) return ''
  switch (level) {
    case 'brulante': return 'Brulante'
    case 'chaude': return 'Chaude'
    case 'tiede': return 'Tiede'
    case 'froide': return 'Froide'
  }
}

export function useKeywordRadar() {
  const generatedKeywords = ref<RadarKeyword[]>([])
  const scanResult = ref<KeywordRadarScanResult | null>(null)
  const isGenerating = ref(false)
  const isScanning = ref(false)
  const error = ref<string | null>(null)
  const scanProgress = ref({ phase: '', scanned: 0, total: 0 })
  const radarCacheStatus = ref<RadarCacheStatus | null>(null)
  let _progressTimer: ReturnType<typeof setInterval> | null = null
  let _lastScanContext: { broadKeyword: string; specificTopic: string; painPoint: string; depth: number } | null = null

  const heatColor = computed(() => radarHeatColor(scanResult.value?.heatLevel ?? null))
  const heatLabel = computed(() => radarHeatLabel(scanResult.value?.heatLevel ?? null))

  async function checkRadarCacheFn(seed: string) {
    try {
      radarCacheStatus.value = await apiGet<RadarCacheStatus>(`/radar-cache/check?seed=${encodeURIComponent(seed)}`)
      log.debug('[Radar] Cache check', { seed, cached: radarCacheStatus.value.cached })
    } catch (err) {
      log.warn(`[Radar] Cache check failed: ${(err as Error).message}`)
      radarCacheStatus.value = { cached: false }
    }
  }

  async function loadFromRadarCache(seed: string): Promise<boolean> {
    try {
      const cached = await apiGet<RadarCacheData | null>(`/radar-cache/load?seed=${encodeURIComponent(seed)}`)
      if (cached) {
        generatedKeywords.value = cached.generatedKeywords
        scanResult.value = cached.scanResult
        _lastScanContext = cached.context
        log.info(`[Radar] Loaded from cache: ${cached.generatedKeywords.length} keywords, score=${cached.scanResult.globalScore}`)
        return true
      }
      return false
    } catch (err) {
      log.warn(`[Radar] Cache load failed: ${(err as Error).message}`)
      return false
    }
  }

  async function _saveToCache(seed: string) {
    if (!scanResult.value || !_lastScanContext) return
    try {
      await apiPost('/radar-cache/save', {
        seed,
        context: _lastScanContext,
        generatedKeywords: generatedKeywords.value,
        scanResult: scanResult.value,
      })
      radarCacheStatus.value = {
        cached: true,
        keywordCount: generatedKeywords.value.length,
        globalScore: scanResult.value.globalScore,
        heatLevel: scanResult.value.heatLevel,
      }
      log.info(`[Radar] Saved to cache: "${seed}"`)
    } catch (err) {
      log.warn(`[Radar] Cache save failed: ${(err as Error).message}`)
    }
  }

  async function generate(title: string, keyword: string, painPoint: string) {
    isGenerating.value = true
    error.value = null
    // Store painPoint for later cache save
    if (_lastScanContext) {
      _lastScanContext.painPoint = painPoint
    } else {
      _lastScanContext = { broadKeyword: keyword, specificTopic: title, painPoint, depth: 1 }
    }
    log.info('[Radar] Generating keywords...', { keyword, title: title.slice(0, 50) })

    try {
      const result = await apiPost<KeywordRadarGenerateResult & { _apiUsage?: ApiUsage }>('/keywords/radar/generate', {
        title,
        keyword,
        painPoint,
      })
      if (result._apiUsage) {
        try { useCostLogStore().addEntry('Génération keywords radar', result._apiUsage) } catch { /* noop */ }
      }
      generatedKeywords.value = result.keywords
      log.info(`[Radar] Generated ${result.keywords.length} keywords`)
    } catch (err) {
      error.value = (err as Error).message
      log.error('[Radar] Generate failed', { error: error.value })
    } finally {
      isGenerating.value = false
    }
  }

  function _startProgressEstimation(keywordCount: number) {
    const total = keywordCount
    scanProgress.value = { phase: 'Autocomplete + KPIs', scanned: 0, total }
    if (_progressTimer) clearInterval(_progressTimer)

    // Phase 1: parallel fetch ~3s, then PAA ~1.5s per keyword
    const phaseOneMs = 3000
    const perKeywordMs = 1500
    const startTime = Date.now()

    _progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed < phaseOneMs) {
        scanProgress.value = { phase: 'Autocomplete + KPIs', scanned: 0, total }
      } else {
        const paaElapsed = elapsed - phaseOneMs
        const estimated = Math.min(Math.floor(paaElapsed / perKeywordMs), total)
        if (estimated >= total) {
          scanProgress.value = { phase: 'Calcul du score', scanned: total, total }
        } else {
          scanProgress.value = { phase: 'Analyse PAA', scanned: estimated, total }
        }
      }
    }, 500)
  }

  function _stopProgress() {
    if (_progressTimer) {
      clearInterval(_progressTimer)
      _progressTimer = null
    }
    scanProgress.value = { phase: '', scanned: 0, total: 0 }
  }

  async function scan(broadKeyword: string, specificTopic: string, keywords: RadarKeyword[], depth: number = 1, seed?: string) {
    isScanning.value = true
    error.value = null
    scanResult.value = null
    _lastScanContext = { broadKeyword, specificTopic, painPoint: '', depth }
    log.info(`[Radar] Scanning ${keywords.length} keywords, depth=${depth}`)

    _startProgressEstimation(keywords.length)

    try {
      scanResult.value = await apiPost<KeywordRadarScanResult>('/keywords/radar/scan', {
        broadKeyword,
        specificTopic,
        keywords,
        depth,
      })
      log.info(`[Radar] Scan complete: score=${scanResult.value.globalScore}, heat=${scanResult.value.heatLevel}`)

      // Auto-save to cache
      if (seed) {
        _saveToCache(seed)
      }
    } catch (err) {
      error.value = (err as Error).message
      log.error('[Radar] Scan failed', { error: error.value })
    } finally {
      _stopProgress()
      isScanning.value = false
    }
  }

  function removeKeyword(index: number) {
    generatedKeywords.value.splice(index, 1)
  }

  onBeforeUnmount(() => {
    _stopProgress()
  })

  function reset() {
    generatedKeywords.value = []
    scanResult.value = null
    isGenerating.value = false
    isScanning.value = false
    error.value = null
    radarCacheStatus.value = null
    _lastScanContext = null
    _stopProgress()
  }

  return {
    generatedKeywords,
    scanResult,
    isGenerating,
    isScanning,
    scanProgress,
    error,
    heatColor,
    heatLabel,
    radarCacheStatus,
    checkRadarCache: checkRadarCacheFn,
    loadFromRadarCache,
    generate,
    scan,
    removeKeyword,
    reset,
  }
}
