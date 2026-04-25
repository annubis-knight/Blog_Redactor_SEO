<script setup lang="ts">
/**
 * F3 — KeywordAssistPanel
 *
 * Composant partagé entre les onglets Capitaine, Lieutenants et Lexique du Moteur.
 * Affiche une liste minimaliste de mots-clés suggérés (issus du basket Moteur) avec
 * un unique bouton d'action contextuel (Tester / Ajouter).
 *
 * Masquage automatique quand il n'y a aucune suggestion pertinente.
 */
import { computed, ref } from 'vue'
import { useMoteurBasketStore } from '@/stores/article/moteur-basket.store'

const props = withDefaults(defineProps<{
  /** Onglet qui héberge le panel : détermine le libellé du bouton et la sémantique. */
  context: 'capitaine' | 'lieutenants' | 'lexique'
  /** Mots-clés déjà utilisés dans l'onglet courant : ils sont filtrés de la liste. */
  excludeKeywords?: string[]
  /** Nombre max de suggestions affichées. */
  maxItems?: number
}>(), {
  excludeKeywords: () => [],
  maxItems: 10,
})

const emit = defineEmits<{
  /** L'utilisateur demande l'ajout d'un mot-clé à l'onglet courant. */
  (e: 'add', keyword: string): void
}>()

const basketStore = useMoteurBasketStore()
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
  return basketStore.keywords
    .filter(k => !exclude.value.has(k.keyword.toLowerCase()))
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
        :key="`assist-${kw.keyword}`"
        class="keyword-assist-panel__item"
      >
        <span class="keyword-assist-panel__keyword">{{ kw.keyword }}</span>
        <button
          type="button"
          class="keyword-assist-panel__action"
          @click="emit('add', kw.keyword)"
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
  background: var(--color-surface-subtle, rgba(100, 116, 139, 0.04));
}

.keyword-assist-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.keyword-assist-panel__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.keyword-assist-panel__hide {
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: var(--color-text-muted, #64748b);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.keyword-assist-panel__hide:hover {
  background: var(--color-bg-hover, #f1f5f9);
  color: var(--color-text, #1e293b);
}

.keyword-assist-panel__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.keyword-assist-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  transition: background 0.15s;
}

.keyword-assist-panel__item:hover {
  background: var(--color-bg-hover, #f1f5f9);
}

.keyword-assist-panel__keyword {
  font-size: 0.8125rem;
  color: var(--color-text, #1e293b);
}

.keyword-assist-panel__action {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary, #3b82f6);
  background: transparent;
  border: 1px solid var(--color-primary, #3b82f6);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.keyword-assist-panel__action:hover {
  background: var(--color-primary, #3b82f6);
  color: white;
}
</style>
