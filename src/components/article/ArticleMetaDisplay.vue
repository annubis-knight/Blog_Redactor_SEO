<script setup lang="ts">
defineProps<{
  metaTitle: string | null
  metaDescription: string | null
  isGenerating: boolean
}>()
</script>

<template>
  <div v-if="metaTitle || metaDescription || isGenerating" class="meta-display">
    <h4 class="meta-heading">Meta SEO</h4>

    <div v-if="isGenerating" class="meta-loading">
      Génération des meta tags en cours...
    </div>

    <template v-else>
      <div v-if="metaTitle" class="meta-field">
        <label class="meta-label">Meta Title</label>
        <div class="meta-value">{{ metaTitle }}</div>
        <span class="meta-count" :class="{ 'meta-count--warning': metaTitle.length > 60 }">
          {{ metaTitle.length }}/60
        </span>
      </div>

      <div v-if="metaDescription" class="meta-field">
        <label class="meta-label">Meta Description</label>
        <div class="meta-value">{{ metaDescription }}</div>
        <span class="meta-count" :class="{ 'meta-count--warning': metaDescription.length > 160 }">
          {{ metaDescription.length }}/160
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.meta-display {
  margin-top: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  background: var(--color-surface);
}

.meta-heading {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--color-text);
}

.meta-loading {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.meta-field {
  margin-bottom: 0.75rem;
}

.meta-field:last-child {
  margin-bottom: 0;
}

.meta-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.25rem;
}

.meta-value {
  font-size: 0.875rem;
  color: var(--color-text);
  padding: 0.5rem;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.meta-count {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.meta-count--warning {
  color: var(--color-error);
  font-weight: 600;
}
</style>
