<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  article: {
    title: string
    type: string
    slug: string
    theme: string | null
    status: string
    cocoonName: string
  }
  pilierKeyword: string | null
}>()

const typeClassMap: Record<string, string> = {
  'Pilier': 'type--pilier',
  'Intermédiaire': 'type--intermediaire',
  'Spécialisé': 'type--specialise',
}

const typeClass = computed(() => typeClassMap[props.article.type] ?? '')
</script>

<template>
  <section class="seo-brief">
    <h2 class="brief-title">{{ article.title }}</h2>

    <div class="brief-meta">
      <div class="meta-item">
        <span class="meta-label">Type</span>
        <span class="meta-value type-badge" :class="typeClass">{{ article.type }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Cocon</span>
        <span class="meta-value">{{ article.cocoonName }}</span>
      </div>
      <div class="meta-item" v-if="pilierKeyword">
        <span class="meta-label">Mot-clé pilier</span>
        <span class="meta-value keyword-pilier">{{ pilierKeyword }}</span>
      </div>
      <div class="meta-item" v-if="article.theme">
        <span class="meta-label">Thème</span>
        <span class="meta-value">{{ article.theme }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.seo-brief {
  margin-bottom: 1.5rem;
}

.brief-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--color-text);
}

.brief-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.meta-value {
  font-size: 0.9375rem;
  color: var(--color-text);
}

.type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
}

.type--pilier {
  background: #dbeafe;
  color: var(--color-primary);
}

.type--intermediaire {
  background: #f1f5f9;
  color: var(--color-secondary);
}

.type--specialise {
  background: #f0fdf4;
  color: var(--color-success);
}

.keyword-pilier {
  font-weight: 600;
  color: var(--color-primary);
}
</style>
