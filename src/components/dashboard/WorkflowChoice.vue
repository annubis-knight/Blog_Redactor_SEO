<script setup lang="ts">
import type { Cocoon } from '@shared/types/index.js'

defineProps<{
  cocoonId: number
  cocoon: Cocoon
  strategyProgress?: number
  keywordCount?: number
}>()
</script>

<template>
  <div class="workflow-choice">
    <p class="choice-intro">Choisissez une phase de travail :</p>

    <div class="choice-grid">
      <!-- Phase 1: Cerveau (Brainstorm) -->
      <RouterLink :to="`/cocoon/${cocoonId}/cerveau`" class="choice-card">
        <div class="choice-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2C8.5 2 6 4.5 6 7.5c0 1.5.5 2.8 1.5 3.8C6.5 12.5 5 14 5 16c0 2.5 2 4.5 4.5 4.5.5 0 1-.1 1.5-.3v1.3a1 1 0 001 1h0a1 1 0 001-1v-1.3c.5.2 1 .3 1.5.3 2.5 0 4.5-2 4.5-4.5 0-2-1.5-3.5-2.5-4.7 1-1 1.5-2.3 1.5-3.8C18 4.5 15.5 2 12 2z" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M9.5 10c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </div>
        <h3 class="choice-title">Cerveau</h3>
        <p class="choice-desc">
          Brainstorming strat&eacute;gique : cible, douleur, angle, promesse, CTA et aiguillage articles
        </p>
        <span class="choice-badge">
          {{ strategyProgress != null ? `${strategyProgress}%` : '6 &eacute;tapes' }}
        </span>
      </RouterLink>

      <!-- Phase 2: Moteur (Research & Keywords) -->
      <RouterLink :to="`/cocoon/${cocoonId}/moteur`" class="choice-card choice-card--primary">
        <div class="choice-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
            <path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <h3 class="choice-title">Moteur</h3>
        <p class="choice-desc">
          Exploration, intention, local, concurrents, mots-cl&eacute;s et audit DataForSEO
        </p>
        <span class="choice-badge">{{ keywordCount ?? 0 }} mots-cl&eacute;s</span>
      </RouterLink>

      <!-- Phase 3: Rédaction (Writing) -->
      <RouterLink :to="`/cocoon/${cocoonId}/redaction`" class="choice-card">
        <div class="choice-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            <path d="M15 5l4 4" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
        <h3 class="choice-title">R&eacute;daction</h3>
        <p class="choice-desc">
          Strat&eacute;gie article, brief, sommaire et r&eacute;daction pour chaque article du cocon
        </p>
        <span class="choice-badge">{{ cocoon.stats.totalArticles }} articles, {{ cocoon.stats.completionPercent }}%</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.workflow-choice {
  margin-top: 0.5rem;
}

.choice-intro {
  font-size: 0.9375rem;
  color: var(--color-text-muted);
  margin: 0 0 1rem;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.choice-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.choice-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.1);
  text-decoration: none;
}

.choice-card--primary {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.choice-card--primary:hover {
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.15);
}

.choice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
}

.choice-card--primary .choice-icon {
  background: var(--color-primary);
  color: white;
}

.choice-title {
  font-size: 1.0625rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}

.choice-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.choice-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
  margin-top: auto;
}

.choice-card--primary .choice-badge {
  background: var(--color-primary-soft, rgba(37, 99, 235, 0.1));
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
