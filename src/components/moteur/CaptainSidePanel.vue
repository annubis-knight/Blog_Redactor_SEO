<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import CaptainRootsSidebar from '@/components/moteur/CaptainRootsSidebar.vue'
import AiPanel from '@/components/moteur/ai-panel/AiPanel.vue'
import AiAdviceMarkdown from '@/components/moteur/ai-panel/AiAdviceMarkdown.vue'
import { VERDICT_CONFIG } from '@/composables/ui/useVerdictColors'
import { useResizablePanel } from '@/composables/ui/useResizablePanel'
import type { AiPanelState } from '@/composables/moteur/useAiPanel'
import type { ExploredKeywordEntry } from '@/composables/keyword/useExploredKeywords'
import type { VerdictLevel, ScanResponse } from '@shared/types/index.js'
import type { RadarCard, KeywordRootVariant } from '@shared/types/intent.types.js'

const props = defineProps<{
  entry: ExploredKeywordEntry | null
  parsedMarkdown: string
  aiIsStreaming: boolean
  aiError: string | null
  verdictSummary: { level: VerdictLevel; label: string; reason?: string } | null
  rootVariants: KeywordRootVariant[]
  isLoadingRoots: boolean
  failedRoots: string[]
  activeVariantKeyword: string
  /** Présence d'un Capitaine verrouillé qui n'est PAS la carte sélectionnée
      → permet d'afficher un raccourci "aller à la carte verrouillée". */
  showGotoLocked: boolean
}>()

// Side-panel: KPIs marché en lecture seule (contexte sans polluer la jauge pertinence).
const marketKpis = computed(() => {
  const k = props.entry?.card.kpis
  if (!k) return null
  return {
    volume: k.searchVolume,
    kd: k.difficulty,
    cpc: k.cpc,
    intent: k.intentTypes && k.intentTypes.length > 0 ? k.intentTypes.join(', ') : '—',
    paaCount: k.paaTotal,
    autocompleteCount: k.autocompleteMatchCount,
  }
})

const emit = defineEmits<{
  (e: 'switch-variant', variant: { keyword: string; card: RadarCard; validation: ScanResponse }): void
  (e: 'ai-regenerate'): void
  (e: 'goto-locked'): void
  (e: 'close'): void
}>()

// Mapping props legacy → AiPanelState : error → 'error', streaming → 'streaming',
// markdown vide → 'idle', markdown rempli → 'success'.
const aiState = computed<AiPanelState>(() => {
  if (props.aiError) return 'error'
  if (props.aiIsStreaming) return 'streaming'
  if (props.parsedMarkdown && props.parsedMarkdown.trim().length > 0) return 'success'
  return 'idle'
})

const verdictConfig = computed(() =>
  props.verdictSummary ? VERDICT_CONFIG[props.verdictSummary.level] : null,
)

// Largeur redimensionnable persistée (mêmes bornes/clé localStorage que l'éditeur).
const { panelWidth, isResizing, onPointerDown } = useResizablePanel()

// Référence sur le <aside> racine pour la détection click-outside.
const panelRef = ref<HTMLElement | null>(null)

/**
 * Click-outside : ferme le panel quand l'utilisateur clique en dehors.
 * Conditions :
 *   - panel ouvert (entry non null)
 *   - cible hors du <aside>
 *   - pas pendant un resize (sinon le pointerup en dehors fermerait le panel
 *     juste après que l'utilisateur ait étiré la poignée)
 *   - pas sur un élément qui re-sélectionne une carte (radar-list-item) :
 *     dans ce cas le composant parent gère lui-même selectedIndex,
 *     pas besoin d'émettre close (qui annulerait la nouvelle sélection)
 */
useEventListener(document, 'pointerdown', (event: PointerEvent) => {
  if (!props.entry) return
  if (isResizing.value) return
  const target = event.target as Node | null
  if (!target || !panelRef.value) return
  if (panelRef.value.contains(target)) return
  // Si l'utilisateur clique sur une autre carte de la radar-list, on laisse
  // le parent gérer la nouvelle sélection — pas de close prématuré.
  const targetEl = target as HTMLElement
  if (targetEl.closest && targetEl.closest('[data-testid^="radar-list-item"]')) return
  emit('close')
})
</script>

<template>
  <!-- v-if sur entry : panel masqué tant qu'aucune carte n'est sélectionnée
       (sinon le drawer vide occupait toute la hauteur de la viewport sans
       contenu utile, parasitant le layout). -->
  <aside
    v-if="entry !== null"
    class="captain-side-panel"
    :class="{ 'is-resizing': isResizing }"
    :style="{ width: `${panelWidth}px` }"
    ref="panelRef"
    data-testid="side-panel"
    aria-live="polite"
    aria-label="D&eacute;tails du mot-cl&eacute; s&eacute;lectionn&eacute;"
  >
    <div
      class="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner le panneau"
      tabindex="0"
      @pointerdown.prevent="onPointerDown"
    />

    <div class="side-panel-inner">
      <header class="side-panel-bar">
        <span class="side-panel-bar-title">Capitaine</span>
        <button
          type="button"
          class="side-panel-close"
          data-testid="side-panel-close"
          aria-label="Fermer le panneau"
          @click="$emit('close')"
        >
          &times;
        </button>
      </header>

      <div class="side-panel-content" data-testid="side-panel-content">
        <header class="side-panel-header">
          <span class="side-panel-keyword" :title="entry.card.keyword">{{ entry.card.keyword }}</span>
          <span
            v-if="verdictSummary"
            class="side-panel-verdict-badge"
            :data-level="verdictSummary.level"
          >
            {{ verdictSummary.level }}
          </span>
        </header>

        <!-- Raccourci "Aller à la carte verrouillée" — uniquement quand
             pertinent : carte sélectionnée non-verrouillée + un autre
             Capitaine est verrouillé ailleurs dans la liste. -->
        <button
          v-if="showGotoLocked"
          type="button"
          class="side-panel-goto-locked"
          data-testid="side-panel-goto-locked"
          @click="$emit('goto-locked')"
        >
          Aller &agrave; la carte verrouill&eacute;e
        </button>

        <!-- KPIs marché — lecture seule (mode Capitaine).
             Affiche les chiffres bruts DataForSEO pour permettre à l'utilisateur
             de garder un œil sur la puissance SEO du mot-clé tout en jugeant
             la pertinence sémantique via la jauge principale. -->
        <section
          v-if="marketKpis"
          class="side-panel-kpis"
          data-testid="side-panel-market-kpis"
          aria-labelledby="side-panel-kpis-title"
        >
          <h4 id="side-panel-kpis-title" class="side-panel-kpis-title">
            KPIs march&eacute;
          </h4>
          <ul class="side-panel-kpis-list">
            <li><span class="kpi-label">Volume</span><span class="kpi-value">{{ marketKpis.volume === null ? '—' : `${marketKpis.volume.toLocaleString('fr-FR')} rech/m` }}</span></li>
            <li><span class="kpi-label">Difficult&eacute;</span><span class="kpi-value">{{ marketKpis.kd === null ? '—' : marketKpis.kd }}</span></li>
            <li><span class="kpi-label">CPC</span><span class="kpi-value">{{ marketKpis.cpc === null ? '—' : `${marketKpis.cpc.toFixed(2)} \u20AC` }}</span></li>
            <li><span class="kpi-label">Intent</span><span class="kpi-value">{{ marketKpis.intent }}</span></li>
            <li><span class="kpi-label">PAA</span><span class="kpi-value">{{ marketKpis.paaCount }} questions</span></li>
            <li><span class="kpi-label">Autocomplete</span><span class="kpi-value">{{ marketKpis.autocompleteCount }} matches</span></li>
          </ul>
          <p class="side-panel-kpis-note">
            Ces indicateurs alimentent le <em>Score KPI</em> affich&eacute; dans l'onglet Radar.
          </p>
        </section>

        <CaptainRootsSidebar
          data-testid="side-panel-roots"
          :variants="rootVariants"
          :active-keyword="activeVariantKeyword"
          :is-loading="isLoadingRoots"
          :failed-roots="failedRoots"
          @select="$emit('switch-variant', $event)"
        />

        <AiPanel
          variant="advice"
          title="Avis expert IA"
          subtitle="Analyse Capitaine basée sur les KPIs marché et la pertinence."
          :state="aiState"
          :error="aiError"
          regen-confirm-message="Régénérer l'avis expert IA ? Cela consommera un appel Claude."
          @trigger="$emit('ai-regenerate')"
        >
          <!-- Slot par défaut : state==='success'. Verdict en tête puis markdown. -->
          <div
            v-if="verdictSummary && verdictConfig"
            class="ai-panel-verdict"
            data-testid="ai-panel-verdict"
            :style="{ borderColor: verdictConfig.color, background: verdictConfig.bg }"
          >
            <span class="ai-panel-verdict__icon" :aria-hidden="true">{{ verdictConfig.icon }}</span>
            <span class="ai-panel-verdict__level" :style="{ color: verdictConfig.color }">{{ verdictSummary.level }}</span>
            <span class="ai-panel-verdict__label">{{ verdictSummary.label }}</span>
            <span v-if="verdictSummary.reason" class="ai-panel-verdict__reason">· {{ verdictSummary.reason }}</span>
          </div>
          <AiAdviceMarkdown :markdown="parsedMarkdown" />

          <!-- Slot streaming : affiche le markdown progressif au lieu du skeleton. -->
          <template #streaming>
            <div
              v-if="verdictSummary && verdictConfig"
              class="ai-panel-verdict"
              :style="{ borderColor: verdictConfig.color, background: verdictConfig.bg }"
            >
              <span class="ai-panel-verdict__icon" :aria-hidden="true">{{ verdictConfig.icon }}</span>
              <span class="ai-panel-verdict__level" :style="{ color: verdictConfig.color }">{{ verdictSummary.level }}</span>
              <span class="ai-panel-verdict__label">{{ verdictSummary.label }}</span>
            </div>
            <AiAdviceMarkdown :markdown="parsedMarkdown" :streaming="true" />
          </template>
        </AiPanel>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Drawer fixé à droite de la viewport — sort du max-width: 1280px de
   MoteurView et n'empiète plus sur la radar-list centrale. Largeur
   redimensionnable via la poignée gauche (mêmes bornes que ResizablePanel
   du workflow rédaction). */
.captain-side-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 20;
  display: flex;
  background: var(--color-background, #fff);
  border-left: 1px solid var(--color-border, #e2e8f0);
  box-shadow: -2px 0 8px rgba(15, 23, 42, 0.06);
}

.resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
}

.resize-handle:hover,
.captain-side-panel.is-resizing .resize-handle {
  background: var(--color-primary, #3b82f6);
  opacity: 0.3;
}

.resize-handle:focus-visible {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: -1px;
}

.side-panel-inner {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.side-panel-bar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface, #f8fafc);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.side-panel-bar-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.side-panel-close {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted, #64748b);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.side-panel-close:hover {
  background: var(--color-bg-hover, #f1f5f9);
  color: var(--color-text, #1e293b);
}

.side-panel-content {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.side-panel-keyword {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.side-panel-verdict-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.side-panel-verdict-badge[data-level='GO'] {
  background: var(--color-success-bg, #f0fdf4);
  color: var(--color-success, #16a34a);
  border: 1px solid var(--color-success, #22c55e);
}

.side-panel-verdict-badge[data-level='ORANGE'] {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning, #d97706);
  border: 1px solid var(--color-warning, #f59e0b);
}

.side-panel-verdict-badge[data-level='NO-GO'] {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error, #dc2626);
  border: 1px solid var(--color-error, #ef4444);
}

.side-panel-goto-locked {
  align-self: flex-start;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-success, #16a34a);
  background: var(--color-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.side-panel-goto-locked:hover {
  background: var(--color-success, #22c55e);
  color: #fff;
}

.side-panel-kpis {
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
}

.side-panel-kpis-title {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.side-panel-kpis-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
}

.side-panel-kpis-list li {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  line-height: 1.3;
  border-bottom: 1px dashed var(--color-border, #e2e8f0);
  padding: 0.125rem 0;
}

.side-panel-kpis-list li:last-child {
  border-bottom: none;
}

.side-panel-kpis .kpi-label {
  color: var(--color-text-muted, #64748b);
  font-weight: 500;
}

.side-panel-kpis .kpi-value {
  color: var(--color-text, #1e293b);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.side-panel-kpis-note {
  margin: 0.5rem 0 0;
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
  font-style: italic;
}

.ai-panel-verdict {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.8125rem;
}
.ai-panel-verdict__icon { font-size: 0.875rem; }
.ai-panel-verdict__level { font-weight: 700; letter-spacing: 0.02em; }
.ai-panel-verdict__label { color: var(--color-text, #1e293b); }
.ai-panel-verdict__reason { color: var(--color-text-muted, #64748b); font-style: italic; }
</style>
