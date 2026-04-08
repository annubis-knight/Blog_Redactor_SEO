<script setup lang="ts">
import { ref, computed } from 'vue'
import { log } from '@/utils/logger'
import type { KeywordAuditResult, RedundancyPair, StrategyContextData } from '../../../shared/types/index.js'
import { useKeywordScoring } from '@/composables/useKeywordScoring'
import { usePainVerdict } from '@/composables/usePainVerdict'
import { computeAlignmentScore, type AlignmentResult } from '@/composables/useAlignmentScore'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'
import { useIntentStore } from '@/stores/intent.store'
import KeywordAlertBadge from './KeywordAlertBadge.vue'

const props = defineProps<{
  results: KeywordAuditResult[]
  redundancies: RedundancyPair[]
  strategicContext?: StrategyContextData | null
}>()

const emit = defineEmits<{
  compare: [keyword: string]
  delete: []
  statusChange: []
  addVariant: [keyword: string]
}>()

const { getSuggestionsForKeyword, getScoreColor } = useKeywordScoring()
const { getVerdictInfo, getVerdictSummary } = usePainVerdict()
const auditStore = useKeywordAuditStore()
const intentStore = useIntentStore()

// Verdict summary for header
const verdictSummary = computed(() => getVerdictSummary(props.results))

// Keyword switcher: check if local variant is available in intent store cache
function hasLocalData(keyword: string): boolean {
  return intentStore.localComparisons.has(keyword) || intentStore.localComparisons.has(keyword + ' Toulouse')
}

function getLocalVariant(keyword: string): { keyword: string; kd: number; volume: number; delta: number } | null {
  const localKey = keyword + ' Toulouse'
  const comp = intentStore.localComparisons.get(keyword) ?? intentStore.localComparisons.get(localKey)
  if (!comp) return null
  return {
    keyword: localKey,
    kd: comp.local?.keywordDifficulty ?? 0,
    volume: comp.local?.searchVolume ?? 0,
    delta: (comp.national?.keywordDifficulty ?? 0) - (comp.local?.keywordDifficulty ?? 0),
  }
}

// Switcher popover state
const switcherKeyword = ref<string | null>(null)

function toggleSwitcher(keyword: string) {
  switcherKeyword.value = switcherKeyword.value === keyword ? null : keyword
}

async function addLocalVariant(keyword: string) {
  const variant = getLocalVariant(keyword)
  if (!variant) return
  try {
    log.info('Adding local variant', { keyword: variant.keyword })
    await auditStore.addKeyword(variant.keyword, auditStore.currentCocoon, 'Longue traine')
    emit('addVariant', variant.keyword)
    switcherKeyword.value = null
  } catch (err) {
    log.error('Failed to add local variant', { keyword: variant.keyword, error: (err as Error).message })
    alert(err instanceof Error ? err.message : 'Erreur ajout variante locale')
  }
}

async function handleStatusChange(keyword: string, status: 'validated' | 'rejected' | 'suggested') {
  try {
    await auditStore.updateKeywordStatus(keyword, status)
    log.info('Keyword status changed', { keyword, status })
    emit('statusChange')
  } catch (err) {
    log.error('Status change failed', { keyword, status, error: (err as Error).message })
    alert(err instanceof Error ? err.message : 'Erreur lors du changement de statut')
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'validated': return 'Validé'
    case 'rejected': return 'Rejeté'
    default: return 'Suggéré'
  }
}

// Alignment score cache (recomputed when results or context change)
const alignmentMap = computed<Map<string, AlignmentResult>>(() => {
  const map = new Map<string, AlignmentResult>()
  if (!props.strategicContext) return map
  for (const kw of props.results) {
    map.set(kw.keyword, computeAlignmentScore(kw.keyword, props.strategicContext))
  }
  return map
})

function getAlignment(keyword: string): AlignmentResult {
  return alignmentMap.value.get(keyword) ?? { score: 0, level: 'aucun', matchedTerms: [] }
}

type SortKey = 'keyword' | 'type' | 'searchVolume' | 'difficulty' | 'cpc' | 'competition' | 'score' | 'verdict' | 'alignment'
const sortKey = ref<SortKey>('score')
const sortAsc = ref(false)

const sortedResults = computed(() => {
  const sorted = [...props.results]
  sorted.sort((a, b) => {
    let va: string | number, vb: string | number
    switch (sortKey.value) {
      case 'keyword': va = a.keyword; vb = b.keyword; break
      case 'type': va = a.type; vb = b.type; break
      case 'searchVolume': va = a.searchVolume; vb = b.searchVolume; break
      case 'difficulty': va = a.difficulty; vb = b.difficulty; break
      case 'cpc': va = a.cpc; vb = b.cpc; break
      case 'competition': va = a.competition; vb = b.competition; break
      case 'score': va = a.compositeScore.total; vb = b.compositeScore.total; break
      case 'verdict': {
        const order = { brulante: 3, emergente: 2, neutre: 1, froide: 0 }
        va = order[getVerdictInfo(a).verdict]; vb = order[getVerdictInfo(b).verdict]; break
      }
      case 'alignment': va = getAlignment(a.keyword).score; vb = getAlignment(b.keyword).score; break
      default: va = 0; vb = 0
    }
    if (typeof va === 'string') return sortAsc.value ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
    return sortAsc.value ? va - (vb as number) : (vb as number) - va
  })
  return sorted
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = false
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return ''
  return sortAsc.value ? ' ↑' : ' ↓'
}

async function handleDelete(keyword: string) {
  if (!confirm(`Supprimer le mot-clé "${keyword}" ?`)) return
  try {
    await auditStore.deleteKeywordAction(keyword)
    log.info('Keyword deleted', { keyword })
    emit('delete')
  } catch (err) {
    log.error('Keyword deletion failed', { keyword, error: (err as Error).message })
    alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
  }
}
</script>

<template>
  <div class="audit-table-container">
    <!-- Verdict summary banner -->
    <div v-if="results.length > 0" class="verdict-summary">
      <span v-if="verdictSummary.brulante > 0" class="verdict-chip verdict-brulante">{{ verdictSummary.brulante }} Brûlante{{ verdictSummary.brulante > 1 ? 's' : '' }}</span>
      <span v-if="verdictSummary.emergente > 0" class="verdict-chip verdict-emergente">{{ verdictSummary.emergente }} Émergente{{ verdictSummary.emergente > 1 ? 's' : '' }}</span>
      <span v-if="verdictSummary.froide > 0" class="verdict-chip verdict-froide">{{ verdictSummary.froide }} Froide{{ verdictSummary.froide > 1 ? 's' : '' }}</span>
      <span v-if="verdictSummary.neutre > 0" class="verdict-chip verdict-neutre">{{ verdictSummary.neutre }} Neutre{{ verdictSummary.neutre > 1 ? 's' : '' }}</span>
    </div>

    <table class="audit-table">
      <thead>
        <tr>
          <th>Statut</th>
          <th class="sortable" @click="toggleSort('verdict')">Verdict{{ sortIcon('verdict') }}</th>
          <th v-if="props.strategicContext" class="sortable num" @click="toggleSort('alignment')">Alignement{{ sortIcon('alignment') }}</th>
          <th class="sortable" @click="toggleSort('keyword')">Mot-clé{{ sortIcon('keyword') }}</th>
          <th class="sortable" @click="toggleSort('type')">Type{{ sortIcon('type') }}</th>
          <th class="sortable num" @click="toggleSort('searchVolume')">Volume{{ sortIcon('searchVolume') }}</th>
          <th class="sortable num" @click="toggleSort('difficulty')">Difficulté{{ sortIcon('difficulty') }}</th>
          <th class="sortable num" @click="toggleSort('cpc')">CPC{{ sortIcon('cpc') }}</th>
          <th class="sortable num" @click="toggleSort('competition')">Compétition{{ sortIcon('competition') }}</th>
          <th class="sortable num" @click="toggleSort('score')">Score{{ sortIcon('score') }}</th>
          <th>Alertes</th>
          <th>Suggestions</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="kw in sortedResults"
          :key="kw.keyword"
          :class="{ 'row-danger': kw.alerts.some(a => a.level === 'danger'), 'row-warning': kw.alerts.some(a => a.level === 'warning') && !kw.alerts.some(a => a.level === 'danger') }"
        >
          <td class="cell-status-actions">
            <span class="status-badge" :class="'status-' + (kw.status ?? 'suggested')">
              {{ statusLabel(kw.status ?? 'suggested') }}
            </span>
            <div class="status-btns">
              <button
                v-if="(kw.status ?? 'suggested') !== 'validated'"
                class="btn-status btn-validate"
                title="Valider ce mot-clé"
                @click="handleStatusChange(kw.keyword, 'validated')"
              >&#10003;</button>
              <button
                v-if="(kw.status ?? 'suggested') !== 'rejected'"
                class="btn-status btn-reject"
                title="Rejeter ce mot-clé"
                @click="handleStatusChange(kw.keyword, 'rejected')"
              >&#10007;</button>
              <button
                v-if="(kw.status ?? 'suggested') !== 'suggested'"
                class="btn-status btn-reset-status"
                title="Remettre en suggestion"
                @click="handleStatusChange(kw.keyword, 'suggested')"
              >&#8635;</button>
            </div>
          </td>
          <td>
            <span
              class="verdict-badge"
              :style="{ color: getVerdictInfo(kw).color, background: getVerdictInfo(kw).bgColor }"
            >
              {{ getVerdictInfo(kw).label }}
            </span>
          </td>
          <td v-if="props.strategicContext" class="num">
            <span
              class="alignment-badge"
              :class="`alignment-${getAlignment(kw.keyword).level}`"
              :title="getAlignment(kw.keyword).matchedTerms.length > 0
                ? `Termes : ${getAlignment(kw.keyword).matchedTerms.join(', ')}`
                : 'Aucun terme commun'"
            >
              {{ getAlignment(kw.keyword).score }}%
            </span>
          </td>
          <td class="cell-keyword">
            {{ kw.keyword }}
            <button
              v-if="kw.difficulty > 50"
              class="btn-switcher"
              :class="{ active: switcherKeyword === kw.keyword }"
              title="Voir variante locale moins compétitive"
              @click.stop="toggleSwitcher(kw.keyword)"
            >&#8645;</button>
            <!-- Switcher popover -->
            <div v-if="switcherKeyword === kw.keyword" class="switcher-popover">
              <template v-if="hasLocalData(kw.keyword)">
                <div class="switcher-info">
                  <strong>{{ getLocalVariant(kw.keyword)?.keyword }}</strong>
                  <span>KD: {{ getLocalVariant(kw.keyword)?.kd }}/100</span>
                  <span>Vol: {{ getLocalVariant(kw.keyword)?.volume }}</span>
                  <span class="switcher-delta">-{{ getLocalVariant(kw.keyword)?.delta }} KD</span>
                </div>
                <button class="btn-add-local" @click="addLocalVariant(kw.keyword)">
                  + Ajouter la variante locale
                </button>
              </template>
              <p v-else class="switcher-hint">
                Passez par l'onglet Local/National pour charger les données locales de ce mot-clé.
              </p>
            </div>
          </td>
          <td><span class="type-badge" :class="'type-' + kw.type.replace(/\s/g, '-').toLowerCase()">{{ kw.type }}</span></td>
          <td class="num">{{ kw.searchVolume.toLocaleString() }}</td>
          <td class="num">{{ kw.difficulty }}/100</td>
          <td class="num">{{ kw.cpc.toFixed(2) }}€</td>
          <td class="num">{{ (kw.competition * 100).toFixed(0) }}%</td>
          <td class="num">
            <span class="score-cell" :style="{ color: getScoreColor(kw.compositeScore.total) }">
              {{ kw.compositeScore.total }}/100
            </span>
          </td>
          <td>
            <KeywordAlertBadge v-for="(alert, i) in kw.alerts" :key="i" :alert="alert" />
          </td>
          <td class="num">
            {{ getSuggestionsForKeyword(kw.keyword).length > 0 ? getSuggestionsForKeyword(kw.keyword).length : '—' }}
          </td>
          <td class="cell-actions">
            <button
              v-if="getSuggestionsForKeyword(kw.keyword).length > 0"
              class="btn-action"
              title="Comparer avec les alternatives"
              @click="emit('compare', kw.keyword)"
            >
              Comparer
            </button>
            <button
              class="btn-action btn-action-danger"
              title="Supprimer ce mot-clé"
              @click="handleDelete(kw.keyword)"
            >
              ×
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Redundancy pairs summary -->
    <div v-if="redundancies.length > 0" class="redundancy-summary">
      <h4 class="redundancy-title">Paires redondantes détectées ({{ redundancies.length }})</h4>
      <div v-for="pair in redundancies" :key="`${pair.keyword1}-${pair.keyword2}`" class="redundancy-pair">
        <span class="redundancy-keywords">
          <strong>{{ pair.keyword1 }}</strong> &harr; <strong>{{ pair.keyword2 }}</strong>
        </span>
        <span class="redundancy-overlap">{{ pair.overlapPercent }}% chevauchement</span>
        <span v-if="pair.sharedRelatedKeywords.length > 0" class="redundancy-shared">
          ({{ pair.sharedRelatedKeywords.slice(0, 5).join(', ') }}{{ pair.sharedRelatedKeywords.length > 5 ? '...' : '' }})
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-table-container {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.audit-table th {
  background: var(--color-surface);
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.audit-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.audit-table th.sortable:hover {
  color: var(--color-primary);
}

.audit-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.audit-table th.num,
.audit-table td.num {
  text-align: right;
}

.row-danger {
  background: rgba(239, 68, 68, 0.05);
}

.row-warning {
  background: rgba(245, 158, 11, 0.05);
}

.cell-keyword {
  position: relative;
  font-weight: 500;
  max-width: 250px;
  overflow: visible;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.type-pilier {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.type-moyenne-traine {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.type-longue-traine {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.score-cell {
  font-weight: 700;
}

/* Alignment badge */
.alignment-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
}

.alignment-fort {
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-badge-green-text, #166534);
}

.alignment-moyen {
  background: #fef9c3;
  color: #854d0e;
}

.alignment-faible {
  background: var(--color-badge-slate-bg, #f1f5f9);
  color: var(--color-badge-slate-text, #475569);
}

.alignment-aucun {
  background: var(--color-badge-slate-bg, #f1f5f9);
  color: var(--color-text-muted, #9ca3af);
}

/* Status */
.cell-status-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.status-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-suggested {
  background: var(--color-badge-slate-bg, #f1f5f9);
  color: var(--color-badge-slate-text, #475569);
}

.status-validated {
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-badge-green-text, #166534);
}

.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-btns {
  display: flex;
  gap: 2px;
}

.btn-status {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  transition: all 0.15s;
}

.btn-validate {
  color: var(--color-success, #16a34a);
  border-color: var(--color-success, #16a34a);
}

.btn-validate:hover {
  background: var(--color-success, #16a34a);
  color: white;
}

.btn-reject {
  color: var(--color-danger, #ef4444);
  border-color: var(--color-danger, #ef4444);
}

.btn-reject:hover {
  background: var(--color-danger, #ef4444);
  color: white;
}

.btn-reset-status {
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.btn-reset-status:hover {
  background: var(--color-bg-hover);
}

.cell-actions {
  display: flex;
  gap: 0.25rem;
  white-space: nowrap;
}

.btn-action {
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  cursor: pointer;
}

.btn-action:hover {
  background: var(--color-primary);
  color: white;
}

.btn-action-danger {
  color: var(--color-danger, #ef4444);
  border-color: var(--color-danger, #ef4444);
}

.btn-action-danger:hover {
  background: var(--color-danger, #ef4444);
  color: white;
}

.redundancy-summary {
  padding: 1rem 1.25rem;
  border-top: 2px solid var(--color-warning, #f59e0b);
  background: rgba(245, 158, 11, 0.04);
}

.redundancy-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-warning, #d97706);
  margin: 0 0 0.5rem;
}

.redundancy-pair {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border);
}

.redundancy-pair:last-child {
  border-bottom: none;
}

.redundancy-overlap {
  font-weight: 600;
  color: var(--color-warning, #d97706);
  white-space: nowrap;
}

.redundancy-shared {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Verdict summary banner */
.verdict-summary {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.verdict-chip {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
}

.verdict-brulante { background: #fef2f2; color: #dc2626; }
.verdict-emergente { background: #fffbeb; color: #d97706; }
.verdict-froide { background: #eff6ff; color: #2563eb; }
.verdict-neutre { background: #f9fafb; color: #6b7280; }

/* Verdict badge in table */
.verdict-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
}

/* Keyword switcher */
.btn-switcher {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 0.25rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-muted);
  vertical-align: middle;
}

.btn-switcher:hover,
.btn-switcher.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.switcher-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 260px;
  padding: 0.625rem;
  background: var(--color-background);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
}

.switcher-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
}

.switcher-delta {
  font-weight: 700;
  color: var(--color-success, #16a34a);
}

.btn-add-local {
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-success, #16a34a);
  border: 1px solid var(--color-success, #16a34a);
  border-radius: 6px;
  cursor: pointer;
}

.btn-add-local:hover {
  background: var(--color-success, #16a34a);
  color: white;
}

.switcher-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
