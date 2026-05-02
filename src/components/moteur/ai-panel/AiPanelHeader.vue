<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="aip-header" data-testid="ai-panel-header">
    <span class="aip-header__icon" aria-hidden="true">
      <!-- Sparkles icon (lucide MIT — inlined to avoid extra dependency) -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
        <path d="M4 17v2" />
        <path d="M5 18H3" />
      </svg>
    </span>
    <div class="aip-header__text">
      <h3 class="aip-header__title">{{ title }}</h3>
      <p v-if="subtitle" class="aip-header__subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<style scoped>
.aip-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.aip-header__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-badge-purple-text);
  border: 1px solid var(--color-badge-purple-text);
}
.aip-header__text {
  flex: 1;
  min-width: 0;
}
.aip-header__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}
.aip-header__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
