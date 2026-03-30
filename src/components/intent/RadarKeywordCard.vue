<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RadarCard, RadarIntentType, RadarPaaItem } from '@shared/types/intent.types.js'

const props = defineProps<{
  card: RadarCard
}>()

const expanded = ref(false)
const expandedPaa = ref<Set<number>>(new Set())   // answer toggle
const expandedParents = ref<Set<number>>(new Set()) // children toggle

function toggleAnswer(index: number) {
  const s = new Set(expandedPaa.value)
  if (s.has(index)) s.delete(index)
  else s.add(index)
  expandedPaa.value = s
}

function toggleChildren(index: number) {
  const s = new Set(expandedParents.value)
  if (s.has(index)) s.delete(index)
  else s.add(index)
  expandedParents.value = s
}

// Build parent→children tree
interface PaaTreeNode {
  paa: RadarPaaItem
  index: number
  children: PaaTreeNode[]
}

const paaTree = computed((): PaaTreeNode[] => {
  const roots: PaaTreeNode[] = []
  const childrenByParent = new Map<string, PaaTreeNode[]>()

  props.card.paaItems.forEach((paa, idx) => {
    const node: PaaTreeNode = { paa, index: idx, children: [] }
    if (paa.depth === 1 || !paa.parentQuestion) {
      roots.push(node)
    } else {
      const key = paa.parentQuestion
      if (!childrenByParent.has(key)) childrenByParent.set(key, [])
      childrenByParent.get(key)!.push(node)
    }
  })

  for (const root of roots) {
    root.children = childrenByParent.get(root.paa.question) ?? []
  }

  return roots
})

// Intent SVG icons — uniform monoline style
const intentConfig: Record<RadarIntentType, { svg: string; label: string; color: string }> = {
  informational: {
    label: 'Informationnel',
    color: '#3b82f6',
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 16v-4m0-4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  },
  commercial: {
    label: 'Commercial',
    color: '#d97706',
    svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="12" font-weight="600">€</text>',
  },
  transactional: {
    label: 'Transactionnel',
    color: '#16a34a',
    svg: '<circle cx="9" cy="21" r="1" fill="currentColor"/><circle cx="20" cy="21" r="1" fill="currentColor"/><path d="M1 1h4l2.68 13.39a1 1 0 001 .61h9.72a1 1 0 00.98-.78L23 6H6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  navigational: {
    label: 'Navigationnel',
    color: '#8b5cf6',
    svg: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  },
}

const intentBadges = computed(() =>
  props.card.kpis.intentTypes.map(t => intentConfig[t]),
)

// Score circle: red (0) → orange (50) → green (100)
const CIRCLE_RADIUS = 30
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

const scoreColor = computed(() => {
  const t = props.card.combinedScore / 100
  // red→orange→green interpolation via HSL: 0° (red) → 120° (green)
  const hue = Math.round(t * 120)
  return `hsl(${hue}, 70%, 45%)`
})

const scoreDashoffset = computed(() => {
  const t = props.card.combinedScore / 100
  return CIRCLE_CIRCUMFERENCE * (1 - t)
})

const showTooltip = ref(false)

const breakdownRows = computed(() => [
  { label: 'PAA Matches', desc: 'Points ponderes selon exact/stem/semantique', value: props.card.scoreBreakdown.paaMatchScore, weight: '30%' },
  { label: 'Resonance', desc: 'Autocomplete matches + score semantique moyen', value: props.card.scoreBreakdown.resonanceBonus, weight: '15%' },
  { label: 'Opportunite', desc: 'Volume × (1 - difficulte), potentiel de trafic', value: props.card.scoreBreakdown.opportunityScore, weight: '25%' },
  { label: 'Intent', desc: 'Valeur de l\'intention: commercial > transactionnel > info', value: props.card.scoreBreakdown.intentValueScore, weight: '15%' },
  { label: 'CPC', desc: 'Cout par clic — indique la valeur commerciale du mot-cle', value: props.card.scoreBreakdown.cpcScore, weight: '15%' },
])

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

function matchLabel(paa: RadarPaaItem): string {
  if (paa.match === 'total') return paa.matchQuality === 'exact' ? 'Exact' : paa.matchQuality === 'semantic' ? 'Semantique' : 'Match'
  if (paa.match === 'partial') return paa.matchQuality === 'exact' ? 'Partiel exact' : paa.matchQuality === 'semantic' ? 'Sem. partiel' : 'Partiel'
  return 'Hors sujet'
}

function badgeClass(paa: RadarPaaItem): string {
  if (paa.match === 'total') return 'badge--total'
  if (paa.match === 'partial') return 'badge--partial'
  return 'badge--none'
}

// EXACT badge → green border, MATCH/PARTIEL → subtle gray border, rest → no border
function itemBorderClass(paa: RadarPaaItem): string {
  if (paa.match === 'total' && paa.matchQuality === 'exact') return 'paa-item--exact'
  if (paa.match === 'total') return 'paa-item--match'
  return ''
}


</script>

<template>
  <div class="radar-card" :class="{ expanded }">
    <!-- Single-row header -->
    <div class="radar-card__header" @click="expanded = !expanded">
      <span class="radar-card__chevron" :class="{ 'chevron--open': expanded }">&#9654;</span>

      <span class="radar-card__keyword">{{ card.keyword }}</span>

      <!-- Intent badges (SVG) -->
      <div v-if="intentBadges.length > 0" class="radar-card__intents">
        <span v-for="(badge, i) in intentBadges" :key="'intent-' + i" class="intent-badge"
          :style="{ color: badge.color }" :title="badge.label"><svg viewBox="0 0 24 24" width="18" height="18"
            v-html="badge.svg" /></span>
      </div>

      <!-- KPIs -->
      <div class="radar-card__kpis">
        <span class="kpi-item">
          <span class="kpi-lbl">vol</span>
          <span class="kpi-num">{{ formatVolume(card.kpis.searchVolume) }}</span>
        </span>
        <span class="kpi-sep">·</span>
        <span class="kpi-item">
          <span class="kpi-lbl">KD</span>
          <span class="kpi-num">{{ card.kpis.difficulty }}</span>
        </span>
        <span class="kpi-sep">·</span>
        <span class="kpi-item">
          <span class="kpi-lbl">CPC</span>
          <span class="kpi-num">{{ card.kpis.cpc.toFixed(2) }}€</span>
        </span>
        <span class="kpi-sep">·</span>
        <span class="kpi-item">
          <span class="kpi-lbl">PAA</span>
          <span class="kpi-num">{{ card.kpis.paaMatchCount }}/{{ card.kpis.paaTotal }}</span>
        </span>
      </div>

      <!-- Score circle + tooltip -->
      <div class="radar-card__score-ring" @mouseenter.stop="showTooltip = true" @mouseleave.stop="showTooltip = false">
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" :r="CIRCLE_RADIUS" fill="none" :stroke="scoreColor" stroke-width="3"
            stroke-linecap="round" :stroke-dasharray="CIRCLE_CIRCUMFERENCE" :stroke-dashoffset="scoreDashoffset"
            transform="rotate(-90 34 34)" />
        </svg>
        <span class="score-ring__value" :style="{ color: scoreColor }">{{ card.combinedScore }}</span>
        <Transition name="tooltip-fade">
          <div v-if="showTooltip" class="score-tooltip" @click.stop>
            <div v-for="(row, i) in breakdownRows" :key="'tt-' + i" class="tooltip-row">
              <span class="tooltip-label">{{ row.label }} <span class="tooltip-weight">({{ row.weight }})</span></span>
              <span class="tooltip-desc">{{ row.desc }}</span>
              <span class="tooltip-val">{{ row.value }}/100</span>
            </div>
            <div class="tooltip-total">
              <span>Total</span>
              <span>{{ card.scoreBreakdown.total }}/100</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Body (collapsible) -->
    <div v-if="expanded" class="radar-card__body">
      <p v-if="card.reasoning" class="radar-card__reasoning">{{ card.reasoning }}</p>

      <!-- PAA tree: parent → children -->
      <div v-if="paaTree.length > 0" class="paa-tree">
        <div v-if="card.cachedPaa" class="paa-tree__cache-hint">PAA en cache</div>
        <div v-for="node in paaTree" :key="node.index" class="paa-node">
          <!-- Parent PAA -->
          <div class="paa-item" :class="[
            itemBorderClass(node.paa),
            { 'paa-item--clickable': !!node.paa.answer || node.children.length > 0 },
          ]">
            <span v-if="node.children.length > 0" class="paa-tree-chevron"
              :class="{ 'paa-tree-chevron--open': expandedParents.has(node.index) }"
              @click.stop="toggleChildren(node.index)">&#9654;</span>
            <span v-else class="paa-tree-chevron paa-tree-chevron--empty" />

            <span class="paa-badge" :class="badgeClass(node.paa)">{{ matchLabel(node.paa) }}</span>
            <span class="paa-question" @click.stop="node.paa.answer ? toggleAnswer(node.index) : undefined">{{
              node.paa.question }}</span>
            <span v-if="node.paa.semanticScore != null" class="paa-semantic">{{ Math.round(node.paa.semanticScore * 100)
            }}%</span>
            <span v-if="node.children.length > 0" class="paa-children-count">({{ node.children.length }})</span>
          </div>

          <!-- Answer (inline expand) -->
          <div v-if="node.paa.answer && expandedPaa.has(node.index)" class="paa-answer" @click.stop>
            {{ node.paa.answer }}
          </div>

          <!-- Children (collapsible) -->
          <div v-if="node.children.length > 0 && expandedParents.has(node.index)" class="paa-children">
            <div v-for="child in node.children" :key="child.index" class="paa-node paa-node--child">
              <div class="paa-item" :class="[
                itemBorderClass(child.paa),
                { 'paa-item--clickable': !!child.paa.answer },
              ]" @click.stop="child.paa.answer ? toggleAnswer(child.index) : undefined">
                <span v-if="child.paa.answer" class="paa-chevron"
                  :class="{ 'paa-chevron--open': expandedPaa.has(child.index) }">&#9654;</span>
                <span v-else class="paa-chevron paa-chevron--empty" />
                <span class="paa-badge" :class="badgeClass(child.paa)">{{ matchLabel(child.paa) }}</span>
                <span class="paa-question">{{ child.paa.question }}</span>
                <span v-if="child.paa.semanticScore != null" class="paa-semantic">{{ Math.round(child.paa.semanticScore
                  * 100) }}%</span>
              </div>
              <div v-if="child.paa.answer && expandedPaa.has(child.index)" class="paa-answer" @click.stop>
                {{ child.paa.answer }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="card.paaItems.length === 0" class="radar-card__no-paa">Aucune PAA trouvee</p>
    </div>
  </div>
</template>

<style scoped>
.radar-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 8px;
  background: var(--color-background);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.radar-card:hover {
  border-color: var(--color-border-hover, var(--color-primary));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.radar-card.expanded {
  border-color: var(--color-primary);
}

/* --- Header: single row --- */
.radar-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}

.radar-card__chevron {
  font-size: 10px;
  color: var(--color-text-muted);
  width: 14px;
  flex-shrink: 0;
  transition: transform 0.2s;
  display: inline-block;
}

.chevron--open {
  transform: rotate(90deg);
}

.radar-card__keyword {
  font-weight: 400;
  font-size: 1.375rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  line-height: 1.2;
}

.radar-card__kpis {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}

.kpi-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.kpi-num {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.kpi-lbl {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.kpi-sep {
  color: var(--color-border);
  font-size: 0.75rem;
}

.radar-card__intents {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.intent-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.intent-badge svg {
  display: block;
}

.radar-card__score-ring {
  position: relative;
  width: 68px;
  height: 68px;
  flex-shrink: 0;
}

.radar-card__score-ring svg {
  display: block;
}

.score-ring__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* --- Body --- */
.radar-card__body {
  padding: 0 16px 14px;
  border-top: 1px solid var(--color-border);
}

.radar-card__reasoning {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin: 12px 0 10px;
  line-height: 1.4;
}

/* --- Score Tooltip (on ring hover) --- */
.score-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  z-index: 10;
  background: var(--color-surface, white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.tooltip-row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 8px;
  align-items: baseline;
  padding: 4px 0;
  font-size: 0.75rem;
}

.tooltip-row+.tooltip-row {
  border-top: 1px solid var(--color-border);
}

.tooltip-label {
  font-weight: 600;
  color: var(--color-text);
}

.tooltip-weight {
  font-weight: 400;
  color: var(--color-text-muted);
}

.tooltip-desc {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.tooltip-val {
  font-weight: 700;
  color: var(--color-text);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tooltip-total {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 2px solid var(--color-border);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-text);
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* --- PAA tree --- */
.paa-tree {
  margin-top: 10px;
}

.paa-tree__cache-hint {
  font-size: 0.6875rem;
  color: var(--color-success, #22c55e);
  opacity: 0.6;
  margin-bottom: 6px;
}

.paa-node {
  margin-bottom: 2px;
}

.paa-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 0.8125rem;
  border-radius: 6px;
  border: 1px solid transparent;
}

.paa-item--exact {
  border-color: var(--color-success, #22c55e);
}

.paa-item--match {
  border-color: var(--color-border);
}

.paa-item--clickable {
  cursor: pointer;
}

.paa-item--clickable:hover {
  background: rgba(0, 0, 0, 0.02);
}

/* Tree chevron (parent → children toggle) */
.paa-tree-chevron {
  font-size: 8px;
  color: var(--color-text-muted);
  width: 14px;
  flex-shrink: 0;
  transition: transform 0.15s;
  display: inline-block;
  cursor: pointer;
}

.paa-tree-chevron:hover {
  color: var(--color-text);
}

.paa-tree-chevron--open {
  transform: rotate(90deg);
}

.paa-tree-chevron--empty {
  visibility: hidden;
}

/* Small answer chevron (inside children) */
.paa-chevron {
  font-size: 8px;
  color: var(--color-text-muted);
  width: 12px;
  flex-shrink: 0;
  transition: transform 0.15s;
  display: inline-block;
}

.paa-chevron--open {
  transform: rotate(90deg);
}

.paa-chevron--empty {
  visibility: hidden;
}

.paa-badge {
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge--total {
  background: var(--color-success, #22c55e);
  color: white;
}

.badge--partial {
  background: var(--color-warning, #eab308);
  color: white;
}

.badge--none {
  background: var(--color-background-mute, #e2e8f0);
  color: var(--color-text-muted);
}

.paa-question {
  flex: 1;
  line-height: 1.3;
  min-width: 0;
}

.paa-semantic {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.paa-children-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.paa-answer {
  padding: 4px 10px 6px 34px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Indented children block */
.paa-children {
  padding-left: 20px;
  border-left: 1px solid var(--color-border);
  margin-left: 6px;
  margin-top: 2px;
  margin-bottom: 4px;
}

.paa-node--child .paa-answer {
  padding-left: 30px;
}

.radar-card__no-paa {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-top: 10px;
}
</style>
