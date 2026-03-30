<script setup lang="ts">
defineProps<{
  keyword: string
  explanation: string
}>()
</script>

<template>
  <div class="latent-alert">
    <span class="latent-alert-icon">💡</span>
    <div class="latent-alert-content">
      <p class="latent-alert-title">1 douleur <strong>LATENTE</strong> détectée</p>
      <p class="latent-alert-keyword">« {{ keyword }} »</p>
      <p class="latent-alert-explanation">{{ explanation }}</p>
    </div>
  </div>
</template>

<style scoped>
.latent-alert {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-badge-purple-bg, #f5f3ff);
  border: 1px solid #7c3aed;
  border-radius: 8px;
}

.latent-alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.latent-alert-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.latent-alert-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-badge-purple-text, #6d28d9);
  margin: 0;
}

.latent-alert-keyword {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text, #1e293b);
  margin: 0;
}

.latent-alert-explanation {
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  margin: 0;
}
</style>
