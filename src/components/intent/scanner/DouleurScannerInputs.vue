<script setup lang="ts">
import { radarHeatIcon } from '@/composables/keyword/useResonanceScore'

interface RadarCacheStatus {
  exists: boolean
  heatLevel?: string | null
  globalScore?: number
  keywordCount?: number
}

withDefaults(defineProps<{
  broadKeyword: string
  specificTopic: string
  painPoint: string
  phase: 'input' | 'keywords' | 'scanning' | 'results'
  isGenerating: boolean
  radarCacheStatus: RadarCacheStatus | null
  isLoadingCache: boolean
  error: string | null
  showInputs?: boolean
}>(), {
  showInputs: true,
})

defineEmits<{
  (e: 'update:broad-keyword', value: string): void
  (e: 'update:specific-topic', value: string): void
  (e: 'update:pain-point', value: string): void
  (e: 'generate'): void
  (e: 'reset-scan'): void
  (e: 'load-cache'): void
  (e: 'dismiss-cache'): void
  (e: 'clear-error'): void
}>()
</script>

<template>
  <div class="scanner-inputs-section">
    <!-- Phase 1: Context & Generate -->
    <div v-if="showInputs" class="scanner-inputs">
      <h3 class="scanner-title">Keyword Radar</h3>
      <p class="scanner-desc">
        L'IA genere des mots-cles courts, puis chacun est scanne dans l'ecosysteme Google
        (PAA + Autocomplete) pour mesurer la resonance avec votre article.
      </p>

      <div class="input-row">
        <div class="input-group">
          <label class="input-label">Mot-cle large (silo)</label>
          <input
            :value="broadKeyword"
            type="text"
            class="input-field"
            placeholder="Ex: copywriting"
            @input="(e) => $emit('update:broad-keyword', (e.target as HTMLInputElement).value)"
          />
        </div>
        <div class="input-group">
          <label class="input-label">Sujet precis (article)</label>
          <input
            :value="specificTopic"
            type="text"
            class="input-field"
            placeholder="Ex: copywriting email PME"
            @input="(e) => $emit('update:specific-topic', (e.target as HTMLInputElement).value)"
          />
        </div>
        <div class="input-group">
          <label class="input-label">Douleur client</label>
          <input
            :value="painPoint"
            type="text"
            class="input-field"
            placeholder="Ex: taux de conversion bas"
            @input="(e) => $emit('update:pain-point', (e.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div class="input-row input-row--actions">
        <button
          v-if="phase === 'input' || phase === 'keywords'"
          class="btn-action"
          :disabled="isGenerating || !broadKeyword.trim() || !specificTopic.trim()"
          @click="$emit('generate')"
        >
          {{ isGenerating ? 'Generation...' : 'Generer les mots-cles' }}
        </button>

        <button
          v-if="phase === 'results'"
          class="btn-action btn-action--secondary"
          @click="$emit('reset-scan')"
        >
          Nouveau scan
        </button>
      </div>
    </div>

    <!-- Cache indicator -->
    <div
      v-if="radarCacheStatus?.exists && phase === 'input'"
      class="cache-indicator"
    >
      <div class="cache-indicator__info">
        <span class="cache-indicator__icon">{{ radarHeatIcon(radarCacheStatus.heatLevel ?? null) }}</span>
        <span class="cache-indicator__text">
          Scan precedent disponible
          <template v-if="radarCacheStatus.globalScore !== undefined">
            &middot; Score {{ radarCacheStatus.globalScore }}/100
          </template>
          <template v-if="radarCacheStatus.keywordCount">
            &middot; {{ radarCacheStatus.keywordCount }} mots-cles
          </template>
        </span>
      </div>
      <div class="cache-indicator__actions">
        <button
          class="btn-action"
          :disabled="isLoadingCache"
          @click="$emit('load-cache')"
        >
          {{ isLoadingCache ? 'Chargement...' : 'Charger depuis le cache' }}
        </button>
        <button class="btn-action btn-action--secondary" @click="$emit('dismiss-cache')">
          Ignorer
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="scanner-error">
      {{ error }}
      <button class="btn-retry" @click="$emit('clear-error')">Fermer</button>
    </div>
  </div>
</template>

<style scoped>
.scanner-inputs-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

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

.input-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.input-field {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-elevated);
  color: var(--color-text);
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-action {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-action:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action--secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-action--secondary:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.cache-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-info-bg);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
}

.cache-indicator__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cache-indicator__icon {
  font-size: 1rem;
}

.cache-indicator__text {
  color: var(--color-text);
}

.cache-indicator__actions {
  display: flex;
  gap: 0.5rem;
}

.scanner-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 6px;
  color: var(--color-error, #ef4444);
  font-size: 0.8125rem;
}

.btn-retry {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 4px;
  color: var(--color-error, #ef4444);
  cursor: pointer;
}
</style>
