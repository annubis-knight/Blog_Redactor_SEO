<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RadarCard, RadarIntentType, RadarPaaItem } from '@shared/types/intent.types.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { ModifierKind } from '@shared/utils/keyword-modifiers'
import { computeKpiScore } from '@shared/scoring-kpi.js'
import { formatVolume as fmtVolumeShared, formatCpc as fmtCpcShared, formatKd as fmtKdShared } from '@shared/score/index.js'
import KeywordWords from './KeywordWords.vue'
import RadarCardScoreRing from '@/components/intent/radar-card/RadarCardScoreRing.vue'
import RadarCardPaaTree from '@/components/intent/radar-card/RadarCardPaaTree.vue'

export interface InteractiveWordsProps {
  words: string[]
  activeIndices: number[]
  loading: boolean
  /** Nombre de premiers mots significatifs (non-stopwords) à sanctuariser
   *  (visuellement non-cliquables). Cf. KeywordWords.vue. */
  lockedLeftWords?: number
}

export type RadarDisplayMode = 'kpi' | 'relevance'

const props = withDefaults(defineProps<{
  card: RadarCard
  interactiveWords?: InteractiveWordsProps
  displayMode?: RadarDisplayMode
  articleLevel?: ArticleLevel
  /** Tableau aligné sur les mots du keyword pour coloration visuelle. */
  modifiers?: (ModifierKind | null)[]
  /** Si true, un clic sur un mot cycle son tag local/persona/null (au lieu du toggle actif/inactif). */
  manualTagMode?: boolean
  /** Sprint 2 (2026-05-04) — painPoint de l'article courant. Permet au tooltip
   *  Pertinence absent de différencier "painPoint manquant" vs "signaux nuls". */
  articlePainPoint?: string | null
}>(), {
  displayMode: 'kpi',
  articleLevel: 'intermediaire',
  manualTagMode: false,
  articlePainPoint: null,
})

const emit = defineEmits<{
  'word-toggle': [activeIndices: number[]]
  'modifier-untag': [index: number]
  'modifier-cycle': [payload: { index: number; next: ModifierKind | null }]
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
  // kpis === null → card sans KPIs (longue-traîne) : pas de badge intent
  // (CLAUDE.md §3.5 — pas de fallback fantôme).
  (props.card.kpis?.intentTypes ?? []).map(t => intentConfig[t]),
)

// Score circle: red (0) → orange (50) → green (100)
const CIRCLE_RADIUS = 30
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

const kpiBreakdown = computed(() =>
  // kpis === null (longue-traîne) → pas de breakdown KPI calculable.
  props.displayMode === 'kpi' && props.card.kpis
    ? computeKpiScore(props.card.kpis, props.articleLevel)
    : null,
)

/**
 * 2026-05-02 — Score affiché par mode, **strict** (plus de fallback combinedScore).
 *
 * - Mode `kpi` (Radar) : `computeKpiScore(card.kpis, articleLevel).total` —
 *   recalcul front, source de vérité pour le mode KPI. Toujours défini.
 *
 * - Mode `relevance` (Capitaine) : `card.relevanceScore.total` — strictement
 *   le score Pertinence backend. Peut être `null` si :
 *     • painPoint absent au moment du scan/validate
 *     • aucun signal d'alignement (PAA × douleur, autocomplete × douleur, etc.)
 *
 * `null` = chiffre indisponible → on affiche "—" au lieu de bricoler avec
 * combinedScore (legacy hybride qui mélange marché + pertinence et casse la
 * séparation documentée dans docs/scoring-kpi-vs-relevance.md).
 */
const displayedScore = computed<number | null>(() => {
  if (props.displayMode === 'kpi') {
    return kpiBreakdown.value?.total ?? null
  }
  // Mode 'relevance' : strict, pas de fallback combinedScore.
  return props.card.relevanceScore?.total ?? null
})

const hasScore = computed(() => displayedScore.value !== null)

/**
 * Sprint 2 (2026-05-04) — Cause détectable de l'absence de score Pertinence.
 *
 * Permet d'afficher un tooltip honnête : avant ce sprint, un message unique
 * "Définis un point de douleur" mentait quand pain_point était bien défini
 * en DB mais que les signaux SERP étaient nuls (PAA vides, embedding KO).
 *
 *   - 'no-pain'   : painPoint absent ou trop court (<10 chars).
 *   - 'long-tail' : kpis null (longue traîne, score Pertinence non applicable).
 *   - 'no-signals': painPoint OK + kpis OK, mais relevanceScore null →
 *                   les signaux dérivés (PAA × douleur, AC × douleur, etc.)
 *                   n'ont rien produit. Recalcul manuel utile.
 *   - null        : score présent (ce computed n'est lu qu'en !hasScore).
 */
const PAIN_POINT_MIN_LENGTH = 10
type RelevanceMissingReason = 'no-pain' | 'no-signals' | 'long-tail' | null
const relevanceMissingReason = computed<RelevanceMissingReason>(() => {
  if (props.displayMode !== 'relevance') return null
  if (hasScore.value) return null
  // Longue traîne : kpis: null par construction (cf. shared/types/intent.types.ts)
  if (!props.card.kpis) return 'long-tail'
  const pp = props.articlePainPoint?.trim() ?? ''
  if (pp.length < PAIN_POINT_MIN_LENGTH) return 'no-pain'
  return 'no-signals'
})

const scoreLabel = computed(() =>
  props.displayMode === 'kpi' ? 'Score KPI' : 'Score Pertinence',
)

const scoreColor = computed(() => {
  if (!hasScore.value) return 'var(--color-text-muted, #94a3b8)'
  const t = (displayedScore.value as number) / 100
  const hue = Math.round(t * 120)
  return `hsl(${hue}, 70%, 45%)`
})

const scoreDashoffset = computed(() => {
  if (!hasScore.value) return CIRCLE_CIRCUMFERENCE // arc vide
  const t = (displayedScore.value as number) / 100
  return CIRCLE_CIRCUMFERENCE * (1 - t)
})


interface BreakdownRow {
  label: string
  desc: string
  value: number
  weight: string
  rawLabel?: string
}

const breakdownRows = computed<BreakdownRow[]>(() => {
  if (props.displayMode === 'kpi' && kpiBreakdown.value) {
    const LABEL_DESC: Record<string, string> = {
      volume: 'Volume de recherche mensuel',
      kd: 'Keyword Difficulty — concurrence SEO',
      cpc: 'Coût par clic — valeur commerciale',
      intent: 'Type d\'intention (commercial > transactionnel > info)',
      paa: 'Points PAA pondérés selon exact/stem/sémantique',
      autocomplete: 'Nombre de matches autocomplete',
    }
    const pct = (w: number) => `${Math.round(w * 100)}%`
    return kpiBreakdown.value.components.map(c => ({
      label: c.label,
      desc: LABEL_DESC[c.name] ?? '',
      value: c.normalized,
      weight: pct(c.weight),
      rawLabel: c.rawLabel,
    }))
  }
  // 2026-05-02 — Mode `relevance` : breakdown depuis le vrai relevanceScore
  // (composantes pondérées par computeRelevanceScore côté backend), au lieu
  // de l'ancien scoreBreakdown legacy. Cohérent avec le total affiché.
  // Fallback sur scoreBreakdown legacy si relevanceScore absent.
  const rs = props.card.relevanceScore
  if (rs?.breakdown) {
    const RELEVANCE_LABEL_DESC: Record<string, { label: string; desc: string }> = {
      painKeyword: { label: 'Pain × Mot-clé', desc: 'Le mot-clé évoque-t-il directement la douleur ?' },
      paaPain: { label: 'PAA × Douleur', desc: 'Sur N PAA, combien parlent réellement de la douleur ?' },
      acPain: { label: 'Autocomplete × Douleur', desc: 'La SERP réelle valide-t-elle la douleur ?' },
      roots: { label: 'Racines', desc: 'Les racines sémantiques sont-elles cohérentes ?' },
      intentPain: { label: 'Intent × Douleur', desc: 'L\'intent matche-t-il le type de douleur attendu ?' },
    }
    return Object.entries(rs.breakdown).map(([key, comp]) => {
      const meta = RELEVANCE_LABEL_DESC[key] ?? { label: key, desc: '' }
      return {
        label: meta.label,
        desc: meta.desc,
        value: comp.normalized,
        weight: `${Math.round(comp.weight * 100)}%`,
      }
    })
  }
  // Fallback legacy (scoreBreakdown). Ne s'affiche que si breakdownRows est
  // appelé (donc `hasScore=true`), donc on a bien `scoreBreakdown`.
  return [
    { label: 'PAA Matches', desc: 'Points pondérés selon exact/stem/sémantique', value: props.card.scoreBreakdown.paaMatchScore, weight: '25%' },
    { label: 'Résonance', desc: 'Autocomplete matches + score sémantique moyen', value: props.card.scoreBreakdown.resonanceBonus, weight: '15%' },
    { label: 'Opportunité', desc: 'Volume × (1 - difficulté), potentiel de trafic', value: props.card.scoreBreakdown.opportunityScore, weight: '20%' },
    { label: 'Intent', desc: 'Valeur de l\'intention: commercial > transactionnel > info', value: props.card.scoreBreakdown.intentValueScore, weight: '10%' },
    { label: 'CPC', desc: 'Coût par clic — indique la valeur commerciale du mot-clé', value: props.card.scoreBreakdown.cpcScore, weight: '10%' },
    { label: 'Douleur', desc: 'Alignement sémantique entre le mot-clé et la douleur de l\'article', value: props.card.scoreBreakdown.painAlignmentScore, weight: '20%' },
  ]
})

// QW4 — Cards dont l'alignement avec la douleur est faible sont grisees mais restent actives.
// Le seuil 35 cible les keywords que "personne ne taperait en vivant cette douleur".
// kpis.painAlignmentScore est undefined si pas de painPoint => pas de grisage.
const OFF_PAIN_THRESHOLD = 35
const isOffPain = computed(() => {
  // kpis === null → pas d'évaluation off-pain possible (longue-traîne).
  const s = props.card.kpis?.painAlignmentScore
  return typeof s === 'number' && s < OFF_PAIN_THRESHOLD
})

// formatVolume / formatCpc / formatKd centralisés dans shared/score/format.ts
// (FR-INFRA-KPI-DISPLAY-DASH). Alias locaux pour préserver le call-site existant.
const formatVolume = fmtVolumeShared
const formatCpc = fmtCpcShared
const formatKd = fmtKdShared

function baseMatchLabel(paa: RadarPaaItem): string {
  if (paa.match === 'total') return paa.matchQuality === 'exact' ? 'Exact' : paa.matchQuality === 'semantic' ? 'Semantique' : 'Match'
  if (paa.match === 'partial') return paa.matchQuality === 'exact' ? 'Partiel exact' : paa.matchQuality === 'semantic' ? 'Sem. partiel' : 'Partiel'
  return 'Hors sujet'
}

function matchLabel(paa: RadarPaaItem): string {
  const base = baseMatchLabel(paa)
  if (paa.painAlignment === 'off') return `${base} · hors-douleur`
  if (paa.painAlignment === 'aligned' && paa.match === 'total') return `${base} · douleur`
  return base
}

// QW5 — Combine lexical match + painAlignment. Une PAA "total+exact" mais "off-pain"
// est downgradee visuellement a un badge partiel pour refleter la dissonance.
function badgeClass(paa: RadarPaaItem): string {
  if (paa.painAlignment === 'off' && paa.match === 'total') return 'badge--partial'
  if (paa.match === 'total') return 'badge--total'
  if (paa.match === 'partial') return 'badge--partial'
  return 'badge--none'
}

// EXACT badge → green border, MATCH/PARTIEL → subtle gray border, rest → no border
function itemBorderClass(paa: RadarPaaItem): string {
  if (paa.painAlignment === 'off' && paa.match === 'total') return 'paa-item--match'
  if (paa.match === 'total' && paa.matchQuality === 'exact') return 'paa-item--exact'
  if (paa.match === 'total') return 'paa-item--match'
  return ''
}


</script>

<template>
  <div class="radar-card" :class="{ expanded, 'radar-card--off-pain': isOffPain }">
    <!-- Single-row header -->
    <!-- Sprint 3 (2026-05-04) — `@click.stop` empêche la propagation au parent
         (radar-list-item dans CaptainValidation), qui ouvrait à tort la sidebar
         lors d'un clic sur le chevron / score-ring / keyword underliné.
         Règle : la sidebar ne s'ouvre QUE sur clic dans une zone non-cliquable
         de la card (= en dehors de ce header). -->
    <div class="radar-card__header" @click.stop="expanded = !expanded">
      <span class="radar-card__chevron" :class="{ 'chevron--open': expanded }">&#9654;</span>

      <KeywordWords v-if="interactiveWords" class="radar-card__keyword" :words="interactiveWords.words"
        :active-indices="interactiveWords.activeIndices" :loading="interactiveWords.loading" :modifiers="modifiers"
        :manual-tag-mode="manualTagMode"
        :locked-left-words="interactiveWords.lockedLeftWords ?? 0"
        @update:active-indices="emit('word-toggle', $event)"
        @modifier-untag="emit('modifier-untag', $event)" @modifier-cycle="emit('modifier-cycle', $event)" />
      <span v-else class="radar-card__keyword">
        <template v-if="modifiers">
          <span v-for="(word, i) in card.keyword.split(/\s+/)" :key="`${word}-${i}`" class="radar-card__keyword-word"
            :class="{
              'radar-card__keyword-word--modifier-local': modifiers[i] === 'local',
              'radar-card__keyword-word--modifier-persona': modifiers[i] === 'persona',
            }">{{ word }}{{ i < card.keyword.split(/\s+/).length - 1 ? ' ' : '' }}</span>
        </template>
        <template v-else>{{ card.keyword }}</template>
      </span>

      <!-- Intent badges (SVG) -->
      <div v-if="intentBadges.length > 0" class="radar-card__intents">
        <span v-for="(badge, i) in intentBadges" :key="'intent-' + i" class="intent-badge"
          :style="{ color: badge.color }" :title="badge.label"><svg viewBox="0 0 24 24" width="18" height="18"
            v-safe-svg="badge.svg" /></span>
      </div>

      <!-- KPIs : cachés si kpis === null (suggestion longue-traîne, pas de
           fallback fantôme — CLAUDE.md §3.5). -->
      <div v-if="card.kpis" class="radar-card__kpis">
        <span class="kpi-item">
          <span class="kpi-lbl">vol</span>
          <span class="kpi-num">{{ formatVolume(card.kpis.searchVolume) }}</span>
        </span>
        <span class="kpi-sep">·</span>
        <span class="kpi-item">
          <span class="kpi-lbl">KD</span>
          <span class="kpi-num">{{ formatKd(card.kpis.difficulty) }}</span>
        </span>
        <span class="kpi-sep">·</span>
        <span class="kpi-item">
          <span class="kpi-lbl">CPC</span>
          <span class="kpi-num">{{ formatCpc(card.kpis.cpc) }}</span>
        </span>
        <span class="kpi-sep">·</span>
        <span class="kpi-item">
          <span class="kpi-lbl">PAA</span>
          <span class="kpi-num">{{ card.kpis.paaWeightedScore.toFixed(1) }} pts</span>
        </span>
      </div>

      <RadarCardScoreRing
        :displayed-score="displayedScore"
        :score-color="scoreColor"
        :score-label="scoreLabel"
        :breakdown-rows="breakdownRows"
        :has-score="hasScore"
        :relevance-missing-reason="relevanceMissingReason"
        :circle-radius="CIRCLE_RADIUS"
        :circle-circumference="CIRCLE_CIRCUMFERENCE"
        :score-dashoffset="scoreDashoffset"
      />
    </div>

    <!-- Body (collapsible) -->
    <div v-if="expanded" class="radar-card__body">
      <p v-if="card.reasoning" class="radar-card__reasoning">{{ card.reasoning }}</p>

      <RadarCardPaaTree
        v-if="paaTree.length > 0"
        :paa-tree="paaTree"
        :expanded-paa="expandedPaa"
        :expanded-parents="expandedParents"
        :cached-paa="!!card.cachedPaa"
        :item-border-class="itemBorderClass"
        :badge-class="badgeClass"
        :match-label="matchLabel"
        @toggle-children="toggleChildren"
        @toggle-answer="toggleAnswer"
      />

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

/* QW4 — Carte "hors-douleur" : grisee mais entierement cliquable. */
.radar-card--off-pain {
  opacity: 0.55;
  transition: opacity 0.2s;
}

.radar-card--off-pain:hover {
  opacity: 0.85;
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

.radar-card__keyword-word--modifier-local {
  color: #0891b2;
  font-style: italic;
}

.radar-card__keyword-word--modifier-persona {
  color: #c2410c;
  font-style: italic;
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

.radar-card__no-paa {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-top: 10px;
}
</style>
