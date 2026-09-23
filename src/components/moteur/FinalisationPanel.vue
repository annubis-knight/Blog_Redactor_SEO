<script setup lang="ts">
/**
 * F7 / U7 — Onglet Finalisation du workflow Moteur.
 *
 * Affichage 100% lecture seule : récap du Capitaine, des Lieutenants et du Lexique
 * validés par l'utilisateur. 3 sections repliables (collapse). Aucune interaction
 * autre que : (a) déplier/replier une section, (b) partir vers la Rédaction.
 *
 * Accessibilité : seulement si les 3 checks du Moteur sont verts.
 */
import { computed } from 'vue'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import {
  isFinalisationUnlocked,
  finalisationButtonTitle,
} from '@/composables/moteur/useFinalisationGating'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import {
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
} from '@shared/constants/workflow-checks.constants.js'
import type { SelectedArticle } from '@shared/types/index.js'

const props = defineProps<{
  selectedArticle: SelectedArticle | null
}>()

const emit = defineEmits<{
  /** U2-bis — Bouton "Aller à la Rédaction". */
  (e: 'navigate-redaction'): void
}>()

const articleKeywordsStore = useArticleKeywordsStore()

const captain = computed(() => {
  const kw = articleKeywordsStore.keywords
  return {
    // Chaîne vide = pas de Capitaine (contrat `article-keywords`) → « — ».
    keyword: kw?.richCaptain?.keyword || kw?.capitaine || '—',
    history: kw?.richCaptain?.exploredKeywords ?? [],
  }
})

const lieutenants = computed(() =>
  (articleKeywordsStore.keywords?.richLieutenants ?? [])
    .filter(l => l.status === 'locked')
    .map(l => ({ keyword: l.keyword, reasoning: l.reasoning, hnLevel: l.suggestedHnLevel })),
)

const lexique = computed(() => articleKeywordsStore.keywords?.lexique ?? [])

/**
 * FR-MOT-FINAL-CTA-GATED — L'onglet Finalisation est librement accessible
 * (FR-MOT-FREE-NAV), mais la sortie vers la Rédaction obéit à la même règle
 * que le bouton du bas de page : les 3 verrous Phase ② doivent être posés.
 *
 * Sans cela, deux portes menaient à la Rédaction pour la même action — l'une
 * gardée, l'autre non — et l'en-tête annonçait « Prêt pour la Rédaction » sur
 * un article dont les sections affichaient « Aucun lieutenant verrouillé ».
 */
const articleProgressStore = useArticleProgressStore()

const checks = computed(() => {
  const id = props.selectedArticle?.id
  const done = (id ? articleProgressStore.getProgress(id)?.completedChecks : null) ?? []
  return {
    capitaineLocked: done.includes(MOTEUR_CAPITAINE_LOCKED),
    lieutenantsLocked: done.includes(MOTEUR_LIEUTENANTS_LOCKED),
    lexiqueValidated: done.includes(MOTEUR_LEXIQUE_VALIDATED),
  }
})

const ready = computed(() => isFinalisationUnlocked(checks.value))
const ctaTitle = computed(() => finalisationButtonTitle(checks.value))

</script>

<template>
  <div class="finalisation" data-testid="finalisation-panel">
    <header class="finalisation__header">
      <h2 class="finalisation__title" data-testid="finalisation-title">
        {{ ready ? '✅ Prêt pour la Rédaction' : '⏳ Préparation en cours' }}
      </h2>
      <p class="finalisation__subtitle">
        Récapitulatif des décisions validées pour <strong>{{ selectedArticle?.title ?? 'cet article' }}</strong>.
      </p>
      <p v-if="!ready" class="finalisation__pending" data-testid="finalisation-pending">
        {{ ctaTitle }}
      </p>
    </header>

    <CollapsableSection
      :default-open="true"
      title="Capitaine"
      data-testid="finalisation-capitaine"
    >
      <div class="finalisation__block">
        <p class="finalisation__keyword">{{ captain.keyword }}</p>
      </div>
    </CollapsableSection>

    <CollapsableSection
      :default-open="true"
      :title="`Lieutenants (${lieutenants.length})`"
      data-testid="finalisation-lieutenants"
    >
      <ul v-if="lieutenants.length > 0" class="finalisation__list">
        <li v-for="lt in lieutenants" :key="`lt-${lt.keyword}`" class="finalisation__item">
          <span class="finalisation__keyword-sm">{{ lt.keyword }}</span>
          <span class="finalisation__tag">H{{ lt.hnLevel }}</span>
          <p v-if="lt.reasoning" class="finalisation__reasoning">{{ lt.reasoning }}</p>
        </li>
      </ul>
      <p v-else class="finalisation__empty">Aucun lieutenant verrouillé.</p>
    </CollapsableSection>

    <CollapsableSection
      :default-open="true"
      :title="`Lexique (${lexique.length} termes)`"
      data-testid="finalisation-lexique"
    >
      <ul v-if="lexique.length > 0" class="finalisation__chip-list">
        <li v-for="term in lexique" :key="`lx-${term}`" class="finalisation__chip">{{ term }}</li>
      </ul>
      <p v-else class="finalisation__empty">Aucun terme validé.</p>
    </CollapsableSection>

    <div class="finalisation__cta-zone">
      <button
        type="button"
        class="finalisation__cta"
        data-testid="finalisation-cta-redaction"
        :disabled="!ready"
        :title="ctaTitle"
        @click="emit('navigate-redaction')"
      >Aller à la Rédaction →</button>
    </div>
  </div>
</template>

<style scoped>
.finalisation {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;
}

.finalisation__header {
  margin-bottom: 0.5rem;
}

.finalisation__title {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-success, #22c55e);
}

.finalisation__subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #64748b);
}

.finalisation__block {
  padding: 0.5rem 0;
}

.finalisation__keyword {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.finalisation__meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
}

.finalisation__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.finalisation__item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  background: var(--color-surface-subtle, rgba(100, 116, 139, 0.04));
}

.finalisation__keyword-sm {
  font-size: 0.875rem;
  color: var(--color-text, #1e293b);
}

.finalisation__tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
  padding: 0.125rem 0.375rem;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 3px;
}

.finalisation__reasoning {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-muted, #64748b);
}

.finalisation__chip-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.finalisation__chip {
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--color-text, #1e293b);
  background: var(--color-surface-subtle, rgba(100, 116, 139, 0.06));
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
}

.finalisation__empty {
  margin: 0;
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--color-text-muted, #64748b);
}

.finalisation__cta-zone {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.finalisation__cta {
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary, #3b82f6);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.finalisation__cta:disabled {
  background: var(--color-border, #cbd5e1);
  color: var(--color-text-muted, #64748b);
  cursor: not-allowed;
}

.finalisation__pending {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

.finalisation__cta:not(:disabled):hover {
  background: var(--color-primary-hover, #2563eb);
  transform: translateY(-1px);
}

.finalisation__cta:active {
  transform: translateY(0);
}
</style>
