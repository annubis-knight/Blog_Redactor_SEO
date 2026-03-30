<script setup lang="ts">
import { useSeoStore } from '@/stores/seo.store'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import KeywordDensity from '@/components/panels/KeywordDensity.vue'
import SeoChecklist from '@/components/panels/SeoChecklist.vue'
import NlpTerms from '@/components/panels/NlpTerms.vue'

const seoStore = useSeoStore()
</script>

<template>
  <div class="seo-panel">
    <h3 class="panel-title">SEO</h3>

    <template v-if="seoStore.score">
      <!-- Global Score -->
      <div class="panel-section score-section">
        <ScoreGauge :score="seoStore.score.global" label="SEO" />
        <span class="word-count">{{ seoStore.score.wordCount }} mots</span>
      </div>

      <!-- Keyword Density -->
      <div class="panel-section">
        <h4 class="section-title">Densité des mots-clés</h4>
        <KeywordDensity :densities="seoStore.score.keywordDensities" />
      </div>

      <!-- Heading Validation -->
      <div class="panel-section">
        <h4 class="section-title">Hiérarchie des titres</h4>
        <div v-if="seoStore.score.headingValidation.isValid" class="validation-ok">
          &#10003; Hiérarchie valide
        </div>
        <ul v-else class="validation-errors">
          <li v-for="(err, i) in seoStore.score.headingValidation.errors" :key="i" class="validation-error">
            {{ err.message }}
          </li>
        </ul>
      </div>

      <!-- Meta Tags -->
      <div class="panel-section">
        <h4 class="section-title">Balises Meta</h4>
        <div class="meta-item">
          <span class="meta-label">Title</span>
          <span :class="seoStore.score.metaAnalysis.titleInRange ? 'meta-ok' : 'meta-warn'">
            {{ seoStore.score.metaAnalysis.titleLength }} car.
            <span class="meta-range">(50–60)</span>
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Description</span>
          <span :class="seoStore.score.metaAnalysis.descriptionInRange ? 'meta-ok' : 'meta-warn'">
            {{ seoStore.score.metaAnalysis.descriptionLength }} car.
            <span class="meta-range">(150–160)</span>
          </span>
        </div>
      </div>

      <!-- SEO Checklist -->
      <div v-if="seoStore.score.checklistItems.length > 0" class="panel-section">
        <h4 class="section-title">Checklist SEO</h4>
        <SeoChecklist :items="seoStore.score.checklistItems" />
      </div>

      <!-- NLP Terms -->
      <div v-if="seoStore.score.nlpTerms.length > 0" class="panel-section">
        <h4 class="section-title">Termes NLP</h4>
        <NlpTerms :terms="seoStore.score.nlpTerms" />
      </div>

      <!-- Score Factors Breakdown -->
      <div class="panel-section">
        <h4 class="section-title">Facteurs</h4>
        <div class="factor-list">
          <div class="factor-item">
            <span>Mot-clé pilier</span>
            <span class="factor-score">{{ seoStore.score.factors.keywordPilierScore }}</span>
          </div>
          <div class="factor-item">
            <span>Mots-clés secondaires</span>
            <span class="factor-score">{{ seoStore.score.factors.keywordSecondaryScore }}</span>
          </div>
          <div class="factor-item">
            <span>Hiérarchie Hn</span>
            <span class="factor-score">{{ seoStore.score.factors.headingScore }}</span>
          </div>
          <div class="factor-item">
            <span>Meta title</span>
            <span class="factor-score">{{ seoStore.score.factors.metaTitleScore }}</span>
          </div>
          <div class="factor-item">
            <span>Meta description</span>
            <span class="factor-score">{{ seoStore.score.factors.metaDescriptionScore }}</span>
          </div>
          <div class="factor-item">
            <span>Longueur contenu</span>
            <span class="factor-score">{{ seoStore.score.factors.contentLengthScore }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="panel-section score-section">
        <ScoreGauge :score="0" label="SEO" />
        <span class="word-count">- mots</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Densité des mots-clés</h4>
        <span class="na-text">N/A</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Hiérarchie des titres</h4>
        <span class="na-text">N/A</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Balises Meta</h4>
        <div class="meta-item">
          <span class="meta-label">Title</span>
          <span class="na-text">-</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Description</span>
          <span class="na-text">-</span>
        </div>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Facteurs</h4>
        <div class="factor-list">
          <div class="factor-item"><span>Mot-clé pilier</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Mots-clés secondaires</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Hiérarchie Hn</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Meta title</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Meta description</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Longueur contenu</span><span class="factor-score na-text">-</span></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.seo-panel {
  padding: 1rem;
  font-size: 0.8125rem;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.panel-section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.panel-section:last-child {
  border-bottom: none;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.word-count {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #6b7280);
  margin: 0 0 0.5rem;
}

.validation-ok {
  color: var(--color-success);
  font-weight: 500;
}

.validation-errors {
  list-style: none;
  padding: 0;
  margin: 0;
}

.validation-error {
  padding: 0.25rem 0;
  color: var(--color-error);
  font-size: 0.75rem;
}

.validation-error::before {
  content: '\2717 ';
}

.meta-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.meta-label {
  font-weight: 500;
}

.meta-ok {
  color: var(--color-success);
}

.meta-warn {
  color: var(--color-warning);
}

.meta-range {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.factor-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.factor-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.factor-score {
  font-weight: 600;
  min-width: 2rem;
  text-align: right;
}

.na-text {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-style: italic;
}
</style>
