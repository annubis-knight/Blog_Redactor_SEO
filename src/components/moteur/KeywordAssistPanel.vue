<script setup lang="ts">
/**
 * KeywordAssistPanel — panneau de suggestions de keywords partagé entre
 * Capitaine / Lieutenants / Lexique.
 *
 * Refonte 2026-05-11 (chantier `radar-dbfirst-refactor`, FR-MOT-BASKET-DEPRECATED) :
 * le composant ne lit plus le `useMoteurBasketStore` (déprécié) ; il reçoit
 * désormais la liste de keywords à proposer **en prop** depuis son parent.
 * Le parent fait la lecture DB pertinente (typiquement
 * `useRadarExplorationStore.scanCards[].keyword + generatedKeywords[].keyword`)
 * et passe la liste filtrée.
 *
 * Masquage automatique quand il n'y a aucune suggestion pertinente.
 */
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  /** Onglet qui héberge le panel : détermine le libellé du bouton et la sémantique. */
  context: 'capitaine' | 'lieutenants' | 'lexique'
  /** Liste de keywords à proposer (lecture DB faite par le parent). */
  keywords?: string[]
  /** Mots-clés déjà utilisés dans l'onglet courant : ils sont filtrés de la liste. */
  excludeKeywords?: string[]
  /** Nombre max de suggestions affichées. */
  maxItems?: number
}>(), {
  keywords: () => [],
  excludeKeywords: () => [],
  maxItems: 10,
})

const emit = defineEmits<{
  /** L'utilisateur demande l'ajout d'un mot-clé à l'onglet courant. */
  (e: 'add', keyword: string): void
}>()

const isHidden = ref(false)

const titleByContext: Record<typeof props.context, string> = {
  capitaine: '💡 Suggestions pour votre Capitaine',
  lieutenants: '💡 Suggestions pour vos Lieutenants',
  lexique: '💡 Suggestions pour votre Lexique',
}

const actionLabelByContext: Record<typeof props.context, string> = {
  capitaine: 'Tester',
  lieutenants: 'Ajouter',
  lexique: 'Ajouter',
}

const exclude = computed(() => new Set(props.excludeKeywords.map(k => k.toLowerCase())))

const suggestions = computed(() => {
  return props.keywords
    .filter(k => !exclude.value.has(k.toLowerCase()))
    .slice(0, props.maxItems)
})

const visible = computed(() => !isHidden.value && suggestions.value.length > 0)

function hide() {
  isHidden.value = true
}
</script>

<template>
  <section v-if="visible" class="keyword-assist-panel" data-testid="keyword-assist-panel">
    <header class="keyword-assist-panel__header">
      <h4 class="keyword-assist-panel__title">{{ titleByContext[context] }}</h4>
      <button
        type="button"
        class="keyword-assist-panel__hide"
        aria-label="Masquer les suggestions"
        @click="hide"
      >×</button>
    </header>
    <ul class="keyword-assist-panel__list">
      <li
        v-for="kw in suggestions"
        :key="`assist-${kw}`"
        class="keyword-assist-panel__item"
      >
        <span class="keyword-assist-panel__keyword">{{ kw }}</span>
        <button
          type="button"
          class="keyword-assist-panel__action"
          @click="emit('add', kw)"
        >{{ actionLabelByContext[context] }}</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.keyword-assist-panel {
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.keyword-assist-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.keyword-assist-panel__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.keyword-assist-panel__hide {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.125rem;
  color: var(--color-text-muted, #94a3b8);
  padding: 0 0.25rem;
  line-height: 1;
}

.keyword-assist-panel__hide:hover {
  color: var(--color-text, #1e293b);
}

.keyword-assist-panel__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.keyword-assist-panel__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
}

.keyword-assist-panel__keyword {
  flex: 1;
  color: var(--color-text, #1e293b);
}

.keyword-assist-panel__action {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary, #2563eb);
  background: transparent;
  border: 1px solid var(--color-primary, #2563eb);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.keyword-assist-panel__action:hover {
  background: var(--color-primary, #2563eb);
  color: white;
}
</style>
