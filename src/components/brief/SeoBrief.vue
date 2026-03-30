<script setup lang="ts">
import { computed } from 'vue'
import type { ArticleStrategy } from '@shared/types/index.js'

const props = defineProps<{
  article: {
    title: string
    type: string
    slug: string
    topic: string | null
    status: string
    cocoonName: string
  }
  pilierKeyword: string | null
  strategy?: ArticleStrategy | null
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
      <div class="meta-item" v-if="article.topic">
        <span class="meta-label">Thème</span>
        <span class="meta-value">{{ article.topic }}</span>
      </div>
    </div>

    <div v-if="strategy && strategy.completedSteps > 0" class="strategy-context">
      <h3 class="context-title">Contexte strat\u00e9gique</h3>
      <div class="context-grid">
        <div v-if="strategy.cible.validated" class="context-item">
          <span class="context-label">Cible</span>
          <span class="context-value">{{ strategy.cible.validated }}</span>
        </div>
        <div v-if="strategy.douleur.validated" class="context-item">
          <span class="context-label">Douleur</span>
          <span class="context-value">{{ strategy.douleur.validated }}</span>
        </div>
        <div v-if="strategy.angle.validated" class="context-item">
          <span class="context-label">Angle</span>
          <span class="context-value">{{ strategy.angle.validated }}</span>
        </div>
        <div v-if="strategy.promesse.validated" class="context-item">
          <span class="context-label">Promesse</span>
          <span class="context-value">{{ strategy.promesse.validated }}</span>
        </div>
        <div v-if="strategy.cta.target" class="context-item">
          <span class="context-label">CTA</span>
          <span class="context-value">{{ strategy.cta.type }} \u2014 {{ strategy.cta.target }}</span>
        </div>
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
  background: var(--color-badge-blue-bg);
  color: var(--color-primary);
}

.type--intermediaire {
  background: var(--color-badge-slate-bg);
  color: var(--color-secondary);
}

.type--specialise {
  background: var(--color-badge-green-bg);
  color: var(--color-success);
}

.keyword-pilier {
  font-weight: 600;
  color: var(--color-primary);
}

.strategy-context {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary-soft, rgba(37, 99, 235, 0.05));
}

.context-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 0.75rem;
}

.context-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.context-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.context-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.context-value {
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.4;
}
</style>
