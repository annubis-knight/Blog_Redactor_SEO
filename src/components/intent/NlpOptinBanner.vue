<script setup lang="ts">
import { useNlpAnalysis } from '@/composables/intent/useNlpAnalysis'

const emit = defineEmits<{
  'nlp-activated': []
  'nlp-deactivated': []
}>()

const {
  nlpState,
  downloadProgress,
  estimatedTimeLeft,
  analysisProgress,
  activate,
  deactivate,
  cancel,
} = useNlpAnalysis()

async function handleActivate() {
  await activate()
  if (nlpState.value === 'active') {
    emit('nlp-activated')
  }
}

function handleDeactivate() {
  deactivate()
  emit('nlp-deactivated')
}

function handleCancel() {
  cancel()
}

async function handleRetry() {
  await activate()
  if (nlpState.value === 'active') {
    emit('nlp-activated')
  }
}
</script>

<template>
  <div
    class="nlp-banner"
    :class="{
      'nlp-banner--disabled': nlpState === 'disabled' || nlpState === 'unsupported',
      'nlp-banner--loading': nlpState === 'loading-model' || nlpState === 'analyzing',
      'nlp-banner--active': nlpState === 'active',
      'nlp-banner--error': nlpState === 'error',
    }"
  >
    <!-- State: Disabled -->
    <template v-if="nlpState === 'disabled'">
      <div class="nlp-banner-content">
        <span class="nlp-banner-title">Améliorer la précision des verdicts</span>
        <span class="nlp-banner-desc">Analyse sémantique locale · Gratuit, hors-ligne · Premier chargement ~30s</span>
      </div>
      <button class="nlp-btn nlp-btn--activate" @click="handleActivate">
        Activer l'analyse sémantique
      </button>
    </template>

    <!-- State: Unsupported -->
    <template v-else-if="nlpState === 'unsupported'">
      <div class="nlp-banner-content">
        <span class="nlp-banner-title">Améliorer la précision des verdicts</span>
        <span class="nlp-banner-desc">Analyse sémantique indisponible sur ce navigateur</span>
      </div>
      <button class="nlp-btn nlp-btn--activate" disabled>
        Activer
      </button>
    </template>

    <!-- State: Loading model -->
    <template v-else-if="nlpState === 'loading-model'">
      <div class="nlp-banner-content">
        <span class="nlp-banner-title">Chargement du modèle NLP...</span>
        <div class="nlp-progress">
          <div class="nlp-progress-bar">
            <div class="nlp-progress-fill" :style="{ width: downloadProgress + '%' }" />
          </div>
          <span class="nlp-progress-text">
            {{ downloadProgress }}%
            <template v-if="estimatedTimeLeft !== null"> (~{{ estimatedTimeLeft }}s restantes)</template>
          </span>
        </div>
        <span class="nlp-banner-desc">mobilebert-uncased-mnli · ~25MB</span>
      </div>
      <button class="nlp-btn nlp-btn--cancel" @click="handleCancel">
        Annuler
      </button>
    </template>

    <!-- State: Analyzing -->
    <template v-else-if="nlpState === 'analyzing'">
      <div class="nlp-banner-content">
        <span class="nlp-banner-title">NLP — Analyse de {{ analysisProgress.total }} mots-clés...</span>
        <div class="nlp-dots">
          <span
            v-for="i in analysisProgress.total"
            :key="i"
            class="nlp-dot"
            :class="i <= analysisProgress.done ? 'nlp-dot--done' : 'nlp-dot--pending'"
          />
        </div>
      </div>
      <button class="nlp-btn nlp-btn--cancel" @click="handleCancel">
        Annuler
      </button>
    </template>

    <!-- State: Active -->
    <template v-else-if="nlpState === 'active'">
      <div class="nlp-banner-content">
        <span class="nlp-banner-title">Analyse sémantique active</span>
        <span class="nlp-banner-desc">Les verdicts bénéficient d'un 4e signal de confiance</span>
      </div>
      <button class="nlp-btn nlp-btn--deactivate" @click="handleDeactivate">
        Désactiver
      </button>
    </template>

    <!-- State: Error -->
    <template v-else-if="nlpState === 'error'">
      <div class="nlp-banner-content">
        <span class="nlp-banner-title">Erreur NLP</span>
        <span class="nlp-banner-desc">Le chargement du modèle a échoué</span>
      </div>
      <button class="nlp-btn nlp-btn--retry" @click="handleRetry">
        Réessayer
      </button>
    </template>
  </div>
</template>

<style scoped>
.nlp-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  transition: background 0.3s ease;
}

.nlp-banner--disabled {
  background: var(--color-bg-soft, #f8fafc);
}

.nlp-banner--loading {
  background: var(--color-badge-blue-bg, #eff6ff);
}

.nlp-banner--active {
  background: var(--color-badge-green-bg, #dcfce7);
}

.nlp-banner--error {
  background: var(--color-error-bg, #fef2f2);
}

.nlp-banner-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.nlp-banner-title {
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.nlp-banner-desc {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
}

/* Progress bar */
.nlp-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nlp-progress-bar {
  flex: 1;
  height: 6px;
  max-width: 200px;
  background: var(--color-border, #e2e8f0);
  border-radius: 3px;
  overflow: hidden;
}

.nlp-progress-fill {
  height: 100%;
  background: var(--color-primary, #2563eb);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.nlp-progress-text {
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, #64748b);
  white-space: nowrap;
}

/* Analysis dots */
.nlp-dots {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.nlp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background 0.3s;
}

.nlp-dot--done {
  background: var(--color-primary, #2563eb);
}

.nlp-dot--pending {
  background: var(--color-border, #e2e8f0);
  animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Buttons */
.nlp-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.nlp-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.nlp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nlp-btn--activate {
  background: var(--color-primary, #2563eb);
  color: white;
}

.nlp-btn--cancel {
  background: var(--color-text-muted, #64748b);
  color: white;
}

.nlp-btn--deactivate {
  background: var(--color-border, #e2e8f0);
  color: var(--color-text, #1e293b);
}

.nlp-btn--retry {
  background: var(--color-error, #dc2626);
  color: white;
}
</style>
