<script setup lang="ts">
defineProps<{
  currentKeyword: string
  currentIndex: number
  count: number
  /** Sprint 3.4 — Optional composition warnings for the currently-shown keyword. */
  compositionWarnings?: string[]
}>()

defineEmits<{
  'prev': []
  'next': []
}>()
</script>

<template>
  <div class="carousel-nav" data-testid="carousel-nav">
    <button
      type="button"
      class="carousel-nav__arrow"
      :disabled="currentIndex === 0"
      aria-label="Exploration précédente"
      data-testid="carousel-prev"
      @click.prevent="$emit('prev')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>

    <div class="carousel-nav__info">
      <span
        v-if="compositionWarnings && compositionWarnings.length > 0"
        class="carousel-nav__warning"
        :title="compositionWarnings.join('\n')"
        aria-label="Avertissement de composition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2L1 21h22L12 2zm0 6l7.53 13H4.47L12 8zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z"/>
        </svg>
      </span>
      <span class="carousel-nav__keyword" :title="currentKeyword">{{ currentKeyword }}</span>
      <span class="carousel-nav__counter">
        <span class="carousel-nav__counter-curr">{{ currentIndex + 1 }}</span>
        <span class="carousel-nav__counter-sep">/</span>
        <span class="carousel-nav__counter-total">{{ count }}</span>
      </span>
    </div>

    <button
      type="button"
      class="carousel-nav__arrow"
      :disabled="currentIndex === count - 1"
      aria-label="Exploration suivante"
      data-testid="carousel-next"
      @click.prevent="$emit('next')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.carousel-nav {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  background: linear-gradient(180deg, #fff 0%, var(--color-surface, #f8fafc) 100%);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.carousel-nav__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text, #1e293b);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.08s;
}

.carousel-nav__arrow:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}

.carousel-nav__arrow:active:not(:disabled) { transform: scale(0.94); }

.carousel-nav__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.carousel-nav__info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.carousel-nav__warning {
  display: inline-flex;
  align-items: center;
  color: var(--color-warning, #f59e0b);
  cursor: help;
  flex-shrink: 0;
}

.carousel-nav__keyword {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 420px;
}

.carousel-nav__counter {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--color-border, #e2e8f0);
  font-family: var(--font-mono, monospace);
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.carousel-nav__counter-curr {
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
}
.carousel-nav__counter-sep { color: var(--color-border, #cbd5e1); margin: 0 1px; }
.carousel-nav__counter-total { color: var(--color-text-muted, #64748b); }

</style>
