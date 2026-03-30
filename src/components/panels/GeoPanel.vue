<script setup lang="ts">
import { useGeoStore } from '@/stores/geo.store'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'
import ParagraphAlerts from '@/components/panels/ParagraphAlerts.vue'
import JargonAlerts from '@/components/panels/JargonAlerts.vue'

const geoStore = useGeoStore()
</script>

<template>
  <div class="geo-panel">
    <h3 class="panel-title">GEO</h3>

    <template v-if="geoStore.score">
      <!-- Global Score -->
      <div class="panel-section score-section">
        <ScoreGauge :score="geoStore.score.global" label="GEO" />
      </div>

      <!-- Question Headings -->
      <div class="panel-section">
        <h4 class="section-title">Titres en questions</h4>
        <div class="metric-row">
          <span>{{ geoStore.score.questionHeadings.questionCount }}/{{ geoStore.score.questionHeadings.totalH2H3 }} H2/H3</span>
          <span :class="geoStore.score.questionHeadings.percentage >= 70 ? 'metric-ok' : 'metric-warn'">
            {{ geoStore.score.questionHeadings.percentage }}%
            <span class="metric-target">(cible 70%)</span>
          </span>
        </div>
      </div>

      <!-- Answer Capsules -->
      <div class="panel-section">
        <h4 class="section-title">Answer Capsules</h4>
        <div v-if="geoStore.score.answerCapsules.length === 0" class="empty-info">
          Aucun H2 d&eacute;tect&eacute;
        </div>
        <div
          v-for="(capsule, i) in geoStore.score.answerCapsules"
          :key="i"
          class="capsule-item"
          :class="{ present: capsule.hasAnswerCapsule }"
        >
          <span class="capsule-icon">{{ capsule.hasAnswerCapsule ? '&#10003;' : '&#10007;' }}</span>
          <span class="capsule-heading">{{ capsule.heading }}</span>
        </div>
      </div>

      <!-- Sourced Stats -->
      <div class="panel-section">
        <h4 class="section-title">Statistiques sourc&eacute;es</h4>
        <div class="metric-row">
          <span>{{ geoStore.score.sourcedStats.count }} d&eacute;tect&eacute;e(s)</span>
          <span :class="geoStore.score.sourcedStats.inTarget ? 'metric-ok' : 'metric-warn'">
            <span class="metric-target">(cible {{ '\u2265' }}3)</span>
          </span>
        </div>
      </div>

      <!-- Paragraph Length Alerts -->
      <div class="panel-section">
        <h4 class="section-title">Longueur des paragraphes</h4>
        <ParagraphAlerts :alerts="geoStore.score.paragraphAlerts" />
      </div>

      <!-- Jargon Detection -->
      <div class="panel-section">
        <h4 class="section-title">D&eacute;tection de jargon</h4>
        <JargonAlerts :detections="geoStore.score.jargonDetections" />
      </div>

      <!-- Factor Breakdown -->
      <div class="panel-section">
        <h4 class="section-title">Facteurs</h4>
        <div class="factor-list">
          <div class="factor-item">
            <span>Extractibilit&eacute;</span>
            <span class="factor-score">{{ geoStore.score.factors.extractibilityScore }}</span>
          </div>
          <div class="factor-item">
            <span>Questions H2/H3</span>
            <span class="factor-score">{{ geoStore.score.factors.questionHeadingsScore }}</span>
          </div>
          <div class="factor-item">
            <span>Answer Capsules</span>
            <span class="factor-score">{{ geoStore.score.factors.answerCapsulesScore }}</span>
          </div>
          <div class="factor-item">
            <span>Stats sourc&eacute;es</span>
            <span class="factor-score">{{ geoStore.score.factors.sourcedStatsScore }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="panel-section score-section">
        <ScoreGauge :score="0" label="GEO" />
      </div>
      <div class="panel-section">
        <h4 class="section-title">Titres en questions</h4>
        <div class="metric-row">
          <span class="na-text">- H2/H3</span>
          <span class="na-text">-</span>
        </div>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Answer Capsules</h4>
        <span class="na-text">N/A</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Statistiques sourc&eacute;es</h4>
        <span class="na-text">N/A</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Longueur des paragraphes</h4>
        <span class="na-text">N/A</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">D&eacute;tection de jargon</h4>
        <span class="na-text">N/A</span>
      </div>
      <div class="panel-section">
        <h4 class="section-title">Facteurs</h4>
        <div class="factor-list">
          <div class="factor-item"><span>Extractibilit&eacute;</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Questions H2/H3</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Answer Capsules</span><span class="factor-score na-text">-</span></div>
          <div class="factor-item"><span>Stats sourc&eacute;es</span><span class="factor-score na-text">-</span></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.geo-panel {
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

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #6b7280);
  margin: 0 0 0.5rem;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.metric-ok {
  color: var(--color-success);
  font-weight: 500;
}

.metric-warn {
  color: var(--color-warning);
  font-weight: 500;
}

.metric-target {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 400;
}

.empty-info {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.capsule-item {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 0.125rem 0;
  font-size: 0.75rem;
  color: var(--color-error);
}

.capsule-item.present {
  color: var(--color-success);
}

.capsule-icon {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
}

.capsule-heading {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
