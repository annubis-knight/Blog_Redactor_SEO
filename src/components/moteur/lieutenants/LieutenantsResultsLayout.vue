<script setup lang="ts">
/**
 * Vague 3 — Sous-composant Vue extrait de LieutenantsPanel.
 *
 * Référence FR PRD : FR-LIE-AI-FRONTIER (PRD §8.7).
 *
 * ⚠️ ARCHITECTURE — Sprint 1 (2026-05-04) restauré dans la Vague 3 :
 * Les containers PRINCIPAUX (LieutenantProposals + LieutenantH2Structure)
 * sont DESCENDANTS DIRECTS de ce composant, PAS de LieutenantsAiPanel.
 *
 * Sprint C-1 (commit 890b285) avait wrappé ces deux composants dans la coque
 * "Suggestions IA Lieutenants" — régression UX (l'utilisateur voyait ses
 * propres données sous l'étiquette "Suggestions IA"). Cette frontière est
 * formalisée dans FR-LIE-AI-FRONTIER et verrouillée par les tests
 * `lieutenants-selection-architecture.test.ts` et
 * `lieutenants-results-layout-architecture.test.ts`.
 *
 * NE JAMAIS re-wrapper LieutenantProposals ou LieutenantH2Structure dans
 * LieutenantsAiPanel.
 */
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import LieutenantsAiPanel from '@/components/moteur/LieutenantsAiPanel.vue'
import LieutenantProposals from '@/components/moteur/LieutenantProposals.vue'
import LieutenantH2Structure from '@/components/moteur/LieutenantH2Structure.vue'
import type { ProposedLieutenant, ProposeLieutenantsHnNode, HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'
import type { SerpAnalysisResult } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { WordGroup } from '@shared/types/discovery-tab.types.js'

defineProps<{
  // Visibility gate
  serpResult: SerpAnalysisResult | null
  lieutenantCards: ProposedLieutenant[]

  // LieutenantProposals props
  iaIsStreaming: boolean
  iaChunks: string
  iaError: string | null
  eliminatedCards: ProposedLieutenant[]
  totalGenerated: number
  selectedCards: Map<string, ProposedLieutenant>
  contentGapInsights: string
  articleLevel: ArticleLevel | null

  // LieutenantH2Structure props
  hnStructure: ProposeLieutenantsHnNode[]
  activeHnRecurrence: HnRecurrenceItem[]
  hnRecurrence: HnRecurrenceItem[]
  serpResultsByKeyword: Map<string, SerpAnalysisResult>
  activeHnTab: string
  hnSaved: boolean
  isSavingHn: boolean
  /** HN regen-only stream (différent de iaIsStreaming des lieutenants). */
  hnRegenStreaming: boolean
  hnRegenError: string | null

  // Word groups (Discovery clusters)
  wordGroups: WordGroup[]

  selectedCardsSize: number
}>()

defineEmits<{
  (e: 'toggle', card: ProposedLieutenant): void
  (e: 'propose-retry'): void
  (e: 'save-hn'): void
  (e: 'regenerate-hn', lockedHeadings: ProposeLieutenantsHnNode[]): void
  (e: 'update:active-hn-tab', tab: string): void
  // Sprint 17 — `lock-lieutenants` / `unlock-lieutenants` supprimés (boutons batch enlevés).
  // La checkbox de chaque LieutenantCard fait le lock immédiat via toggleLieutenant.
}>()
</script>

<template>
  <div v-if="serpResult || lieutenantCards.length > 0" class="serp-results">
    <!-- Container principal #1 : Propositions Lieutenants (cards + éliminés) -->
    <LieutenantProposals
      :ia-is-streaming="iaIsStreaming"
      :ia-chunks="iaChunks"
      :ia-error="iaError"
      :lieutenant-cards="lieutenantCards"
      :eliminated-cards="eliminatedCards"
      :total-generated="totalGenerated"
      :selected-cards="selectedCards"
      :content-gap-insights="contentGapInsights"
      :article-level="articleLevel"
      @toggle="(card: ProposedLieutenant) => $emit('toggle', card)"
      @retry="$emit('propose-retry')"
    />

    <!-- Container principal #2 : Structure Hn (IA + concurrents intégrés) -->
    <LieutenantH2Structure
      :hn-structure="hnStructure"
      :active-hn-recurrence="activeHnRecurrence"
      :hn-recurrence="hnRecurrence"
      :serp-results-by-keyword="serpResultsByKeyword"
      :active-hn-tab="activeHnTab"
      :hn-saved="hnSaved"
      :is-saving-hn="isSavingHn"
      :selected-cards-size="selectedCardsSize"
      :hn-regen-streaming="hnRegenStreaming"
      :hn-regen-error="hnRegenError"
      @save-hn="$emit('save-hn')"
      @regenerate-hn="(headings: ProposeLieutenantsHnNode[]) => $emit('regenerate-hn', headings)"
      @update:active-hn-tab="(tab: string) => $emit('update:active-hn-tab', tab)"
    />

    <!-- Sprint 4.6 — PAA section relabeled -->
    <CollapsableSection v-if="serpResult" title="Sources IA : questions Google (PAA)" :default-open="false">
      <p class="section-hint">Questions "People Also Ask" scrapees depuis Google pour tes mots-cles. Elles ont deja ete prises en compte par l'IA pour proposer les lieutenants ci-dessus — affichees ici pour transparence.</p>
      <ul v-if="serpResult.paaQuestions.length > 0" class="paa-list">
        <li v-for="paa in serpResult.paaQuestions" :key="paa.question" class="paa-item">
          <div class="paa-question">{{ paa.question }}</div>
          <div v-if="paa.answer" class="paa-answer">{{ paa.answer }}</div>
        </li>
      </ul>
      <p v-else class="section-empty">Google n'a renvoye aucune question PAA pour ces mots-cles — c'est normal sur des requetes techniques ou de niche.</p>
    </CollapsableSection>

    <!-- Word groups -->
    <CollapsableSection v-if="serpResult" title="Sources IA : clusters Discovery" :default-open="false">
      <p class="section-hint">Regroupements thematiques (par racine commune) calcules a partir des mots-cles trouves dans l'onglet Discovery. Utilises par l'IA pour reperer les sous-themes a traiter.</p>
      <ul v-if="wordGroups.length > 0" class="group-list">
        <li v-for="g in wordGroups" :key="g.normalized" class="group-item">
          <span class="group-word">{{ g.word }}</span>
          <span class="group-count">{{ g.count }} termes</span>
        </li>
      </ul>
      <p v-else class="section-empty">Aucun cluster disponible. Lance un scan Discovery pour ce cocon, puis reviens ici.</p>
    </CollapsableSection>

    <!-- 2026-05-08 — Le badge "Lieutenants verrouillés" + le concept de
         "panel locké" sont SUPPRIMÉS. Le verrouillage est par checkbox
         (FR-LIE-CHECKBOX-LOCK-IMMEDIATE). L'utilisateur sait qu'un lieutenant
         est verrouillé directement par l'état coché de sa case. -->

    <!-- Section IA pure — coque purple commune avec les autres onglets.
         NE contient PAS de cards Lieutenants ni de structure Hn (FR-LIE-AI-FRONTIER). -->
    <LieutenantsAiPanel
      :ia-is-streaming="iaIsStreaming"
      :ia-chunks="iaChunks"
      :ia-error="iaError"
      :content-gap-insights="contentGapInsights"
      :total-generated="totalGenerated"
      @retry="$emit('propose-retry')"
    />
  </div>
</template>

<style scoped>
.serp-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-hint {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  line-height: 1.4;
}

.paa-list,
.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.paa-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.paa-item:last-child {
  border-bottom: none;
}

.paa-question {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.paa-answer {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.section-empty {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border);
}

.group-item:last-child {
  border-bottom: none;
}

.group-word {
  font-weight: 500;
  color: var(--color-text);
}

.group-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

/* 2026-05-08 — CSS du badge/boutons batch lock SUPPRIMÉ
   (.lieutenant-lock, .lock-btn, .locked-state, .locked-badge, .unlock-btn) :
   plus de mode "panel locké", verrouillage par checkbox uniquement. */
</style>
