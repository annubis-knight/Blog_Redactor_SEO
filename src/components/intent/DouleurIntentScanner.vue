<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useKeywordRadar } from '@/composables/useResonanceScore'
import { log } from '@/utils/logger'
import RadarKeywordCard from './RadarKeywordCard.vue'
import ConfidenceBar from './ConfidenceBar.vue'
import type { RadarKeyword } from '@shared/types/intent.types'

const props = withDefaults(defineProps<{
  pilierKeyword: string
  articleTopic: string
  articleKeyword: string
  articlePainPoint?: string
  injectedKeywords?: RadarKeyword[]
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const emit = defineEmits<{
  (e: 'scanned', payload: { globalScore: number; heatLevel: string }): void
  (e: 'keywords-cleared'): void
}>()

const {
  generatedKeywords,
  scanResult,
  isGenerating,
  isScanning,
  scanProgress,
  error,
  heatColor,
  heatLabel,
  generate,
  scan,
  removeKeyword,
  reset,
} = useKeywordRadar()

// Editable fields
const broadKeyword = ref(props.pilierKeyword)
const specificTopic = ref(props.articleTopic || props.articleKeyword || props.pilierKeyword)
const painPoint = ref(props.articlePainPoint || '')
const depth = ref(1)

// Phase tracking
type Phase = 'input' | 'keywords' | 'scanning' | 'results'
const phase = computed<Phase>(() => {
  if (scanResult.value) return 'results'
  if (isScanning.value) return 'scanning'
  if (generatedKeywords.value.length > 0) return 'keywords'
  return 'input'
})

// Reset when article changes (workflow mode only — in libre mode, reset is handled by LaboView)
if (props.mode === 'workflow') {
  watch(() => [props.pilierKeyword, props.articleTopic, props.articleKeyword, props.articlePainPoint], () => {
    log.debug('[DouleurIntent] Article changed, resetting radar', {
      keyword: props.pilierKeyword,
      topic: props.articleTopic,
      articleKw: props.articleKeyword,
    })
    broadKeyword.value = props.pilierKeyword
    specificTopic.value = props.articleTopic || props.articleKeyword || props.pilierKeyword
    painPoint.value = props.articlePainPoint || ''
    reset()
  })
}

// Receive keywords injected from Discovery tab
watch(() => props.injectedKeywords, (newKeywords) => {
  if (newKeywords && newKeywords.length > 0) {
    log.info(`[DouleurIntent] Received ${newKeywords.length} keywords from Discovery tab`)
    generatedKeywords.value = [...newKeywords]
    scanResult.value = null
  }
}, { immediate: true })

// Heat icon
const heatIcon = computed(() => {
  if (!scanResult.value) return ''
  switch (scanResult.value.heatLevel) {
    case 'brulante': return '\uD83D\uDD25'
    case 'chaude': return '\uD83D\uDFE0'
    case 'tiede': return '\uD83D\uDD35'
    case 'froide': return '\u2744\uFE0F'
  }
})

// Autocomplete grouped by query
const autoGroups = computed(() => {
  if (!scanResult.value) return []
  const groups: Array<{ query: string; items: typeof scanResult.value.autocomplete.suggestions }> = []
  const map = new Map<string, typeof scanResult.value.autocomplete.suggestions>()

  for (const s of scanResult.value.autocomplete.suggestions) {
    const key = s.query || '(direct)'
    if (!map.has(key)) {
      const arr: typeof scanResult.value.autocomplete.suggestions = []
      map.set(key, arr)
      groups.push({ query: key, items: arr })
    }
    map.get(key)!.push(s)
  }
  return groups
})

async function handleGenerate() {
  if (!specificTopic.value.trim() || !broadKeyword.value.trim()) return
  log.info('[DouleurIntent] Generate clicked', { broad: broadKeyword.value, topic: specificTopic.value })
  await generate(
    specificTopic.value.trim(),
    broadKeyword.value.trim(),
    painPoint.value.trim() || specificTopic.value.trim(),
  )
}

async function handleScan() {
  if (generatedKeywords.value.length === 0) return
  log.info(`[DouleurIntent] Scan clicked: ${generatedKeywords.value.length} keywords, depth=${depth.value}`)
  await scan(broadKeyword.value.trim(), specificTopic.value.trim(), generatedKeywords.value, depth.value)
  if (scanResult.value) {
    log.info(`[DouleurIntent] Scan result: score=${scanResult.value.globalScore}`)
    emit('scanned', { globalScore: scanResult.value.globalScore, heatLevel: scanResult.value.heatLevel })
  }
}

function handleReset() {
  log.debug('[DouleurIntent] Reset')
  reset()
  emit('keywords-cleared')
}
</script>

<template>
  <div class="intent-scanner">
    <!-- Phase 1: Context & Generate -->
    <div class="scanner-inputs">
      <h3 class="scanner-title">Keyword Radar</h3>
      <p class="scanner-desc">
        L'IA genere des mots-cles courts, puis chacun est scanne dans l'ecosysteme Google
        (PAA + Autocomplete) pour mesurer la resonance avec votre article.
      </p>

      <div class="input-row">
        <div class="input-group">
          <label class="input-label">Mot-cle large (silo)</label>
          <input v-model="broadKeyword" type="text" class="input-field" placeholder="Ex: copywriting" />
        </div>
        <div class="input-group">
          <label class="input-label">Sujet precis (article)</label>
          <input v-model="specificTopic" type="text" class="input-field" placeholder="Ex: copywriting email PME" />
        </div>
        <div class="input-group">
          <label class="input-label">Douleur client</label>
          <input v-model="painPoint" type="text" class="input-field" placeholder="Ex: taux de conversion bas" />
        </div>
      </div>

      <div class="input-row input-row--actions">
        <div class="input-group input-group--depth">
          <label class="input-label">Profondeur PAA</label>
          <div class="depth-toggle">
            <button class="depth-btn" :class="{ 'depth-btn--active': depth === 1 }" @click="depth = 1">N+1</button>
            <button class="depth-btn" :class="{ 'depth-btn--active': depth === 2 }" @click="depth = 2">N+2</button>
          </div>
        </div>

        <button
          v-if="phase === 'input' || phase === 'keywords'"
          class="btn-action"
          :disabled="isGenerating || !broadKeyword.trim() || !specificTopic.trim()"
          @click="handleGenerate"
        >
          {{ isGenerating ? 'Generation...' : 'Generer les mots-cles' }}
        </button>

        <button
          v-if="phase === 'results'"
          class="btn-action btn-action--secondary"
          @click="handleReset"
        >
          Nouveau scan
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="scanner-error">
      {{ error }}
      <button class="btn-retry" @click="error = null">Fermer</button>
    </div>

    <!-- Phase 2: Keywords Preview (editable tags) -->
    <div v-if="phase === 'keywords' && !isScanning" class="keywords-preview">
      <div class="keywords-header">
        <h4>{{ generatedKeywords.length }} mots-cles generes</h4>
        <button
          class="btn-action"
          :disabled="generatedKeywords.length === 0"
          @click="handleScan"
        >
          Lancer le scan
        </button>
      </div>

      <div class="keywords-tags">
        <span
          v-for="(kw, i) in generatedKeywords"
          :key="i"
          class="keyword-tag"
          :title="kw.reasoning"
        >
          {{ kw.keyword }}
          <button class="tag-remove" @click="removeKeyword(i)">&times;</button>
        </span>
      </div>
    </div>

    <!-- Phase: Scanning with progress -->
    <div v-if="isScanning" class="scanner-loading">
      <div class="scanner-loading__top">
        <div class="spinner" />
        <p>{{ scanProgress.phase || 'Initialisation' }}...</p>
      </div>
      <div v-if="scanProgress.total > 0" class="scanner-progress">
        <div class="scanner-progress__bar">
          <div
            class="scanner-progress__fill"
            :style="{ width: Math.round((scanProgress.scanned / scanProgress.total) * 100) + '%' }"
          />
        </div>
        <span class="scanner-progress__text">
          {{ scanProgress.scanned }}/{{ scanProgress.total }} mots-cles
        </span>
      </div>
    </div>

    <!-- Phase 3: Results -->
    <template v-if="phase === 'results' && scanResult">
      <!-- Global thermometer -->
      <div class="thermometer" :style="{ borderColor: heatColor }">
        <div class="thermo-header">
          <div class="thermo-left">
            <span class="thermo-icon">{{ heatIcon }}</span>
            <span class="thermo-score" :style="{ color: heatColor }">{{ scanResult.globalScore }}/100</span>
            <span class="thermo-label" :style="{ color: heatColor }">{{ heatLabel }}</span>
          </div>
          <div class="thermo-kpis">
            <span class="kpi">
              <span class="kpi-value">{{ scanResult.cards.length }}</span>
              <span class="kpi-label">Keywords</span>
            </span>
            <span class="kpi">
              <span class="kpi-value">{{ scanResult.autocomplete.totalCount }}</span>
              <span class="kpi-label">Autocomplete</span>
            </span>
            <span class="kpi">
              <span class="kpi-value">{{ scanResult.cards.reduce((s, c) => s + c.kpis.paaTotal, 0) }}</span>
              <span class="kpi-label">PAA Total</span>
            </span>
          </div>
        </div>
        <p class="thermo-verdict">{{ scanResult.verdict }}</p>
        <ConfidenceBar :value="scanResult.globalScore / 100" />
      </div>

      <!-- Autocomplete section (full-width) -->
      <div v-if="scanResult.autocomplete.totalCount > 0" class="autocomplete-section">
        <h4 class="section-title">Autocomplete ({{ scanResult.autocomplete.totalCount }})</h4>
        <div class="auto-groups">
          <div v-for="(group, gIdx) in autoGroups" :key="'ag-' + gIdx" class="auto-group">
            <span class="auto-group-label">
              <span class="auto-query-icon">{{ group.query.startsWith('*') ? '\u2190 ' : '\u2192 ' }}</span>
              "{{ group.query }}" ({{ group.items.length }})
            </span>
            <div class="auto-group-items">
              <span v-for="(s, i) in group.items" :key="i" class="auto-tag">
                <span class="auto-tag-pos">#{{ s.position }}</span>
                {{ s.text }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Keyword cards -->
      <div class="radar-cards">
        <h4 class="section-title">Resultats par mot-cle ({{ scanResult.cards.length }})</h4>
        <RadarKeywordCard
          v-for="card in scanResult.cards"
          :key="card.keyword"
          :card="card"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.intent-scanner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* --- Inputs --- */
.scanner-inputs {
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.scanner-title {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.scanner-desc {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.input-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.input-row--actions {
  margin-top: 0.75rem;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group--depth {
  flex: 0 0 auto;
}

.input-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.input-field {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;
}

.input-field:focus {
  border-color: var(--color-primary);
}

.depth-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.depth-btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  background: var(--color-bg);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.depth-btn:first-child {
  border-right: 1px solid var(--color-border);
}

.depth-btn--active {
  background: var(--color-primary);
  color: white;
}

.btn-action {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-action:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action--secondary {
  background: var(--color-text-muted);
}

/* --- Error --- */
.scanner-error {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #dc2626);
  border-radius: 6px;
  color: var(--color-error, #dc2626);
  font-size: 0.8125rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-retry {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  background: var(--color-error, #dc2626);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* --- Keywords Preview --- */
.keywords-preview {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  animation: fadeSlideIn 0.3s ease;
}

.keywords-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.keywords-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.keywords-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: var(--color-primary-bg, #eff6ff);
  border: 1px solid var(--color-primary-light, #bfdbfe);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-primary);
  font-weight: 500;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 14px;
  cursor: pointer;
  border-radius: 50%;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.tag-remove:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

/* --- Loading --- */
.scanner-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--color-text-muted);
}

.scanner-loading__top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.scanner-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 400px;
}

.scanner-progress__bar {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.scanner-progress__fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.scanner-progress__text {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Thermometer --- */
.thermometer {
  padding: 1.25rem;
  background: var(--color-surface);
  border: 2px solid;
  border-radius: 10px;
  transition: border-color 0.4s ease;
  animation: fadeSlideIn 0.3s ease;
}

.thermo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.thermo-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thermo-icon { font-size: 1.5rem; }

.thermo-score {
  font-size: 1.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.thermo-label {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.thermo-kpis { display: flex; gap: 1rem; }

.kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.kpi-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.kpi-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.thermo-verdict {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text);
  font-style: italic;
}

/* --- Autocomplete Section --- */
.autocomplete-section {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  animation: fadeSlideIn 0.3s ease;
}

.section-title {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.auto-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.auto-group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: 0.375rem;
}

.auto-query-icon {
  font-size: 0.625rem;
  opacity: 0.6;
}

.auto-group-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.auto-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-background-mute, #f1f5f9);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--color-text);
}

.auto-tag-pos {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

/* --- Radar Cards Section --- */
.radar-cards {
  animation: fadeSlideIn 0.3s ease;
}
</style>
