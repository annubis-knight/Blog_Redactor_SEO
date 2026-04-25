<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMoteurBasketStore } from '@/stores/article/moteur-basket.store'
import type { BasketKeyword } from '@/stores/article/moteur-basket.store'

const store = useMoteurBasketStore()
const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

const SOURCE_LABELS: Record<BasketKeyword['source'], string> = {
  discovery: 'Discovery',
  radar: 'Radar',
  'pain-translator': 'Pain Translator',
  validation: 'Validation',
  exploration: 'Exploration',
  manual: 'Ajout manuel',
}

const SOURCE_ORDER: BasketKeyword['source'][] = ['radar', 'discovery', 'pain-translator', 'validation', 'exploration', 'manual']

interface Group {
  source: BasketKeyword['source']
  label: string
  items: BasketKeyword[]
}

const groupedKeywords = computed<Group[]>(() => {
  const buckets = new Map<BasketKeyword['source'], BasketKeyword[]>()
  for (const kw of store.keywords) {
    const arr = buckets.get(kw.source) ?? []
    arr.push(kw)
    buckets.set(kw.source, arr)
  }
  const groups: Group[] = []
  for (const source of SOURCE_ORDER) {
    const items = buckets.get(source)
    if (items && items.length > 0) groups.push({ source, label: SOURCE_LABELS[source], items })
  }
  return groups
})
</script>

<template>
  <Teleport to="body">
    <div class="basket-float" data-testid="basket-floating-panel">
      <!-- Collapsed pill -->
      <button
        v-if="!isOpen"
        class="basket-float__pill"
        :aria-label="`Panier : ${store.count} mots-clés`"
        @click="toggle"
      >
        <span class="basket-float__pill-icon" aria-hidden="true">&#x1F9FA;</span>
        <span class="basket-float__pill-count">{{ store.count }}</span>
      </button>

      <!-- Expanded panel -->
      <div v-else class="basket-float__panel">
        <div class="basket-float__header">
          <span class="basket-float__title">Panier</span>
          <span class="basket-float__total">{{ store.count }} mot{{ store.count > 1 ? 's' : '' }}-cl&eacute;{{ store.count > 1 ? 's' : '' }}</span>
          <button
            v-if="store.count > 0"
            class="basket-float__clear"
            @click="store.clear()"
          >Vider</button>
          <button class="basket-float__collapse" aria-label="Fermer" @click="toggle">&#x25BE;</button>
        </div>

        <div class="basket-float__list">
          <p v-if="store.isEmpty" class="basket-float__empty">
            Le panier est vide. Cochez des mots-cl&eacute;s depuis Discovery, Radar ou Pain Translator
            pour les retrouver ici.
          </p>

          <div
            v-for="group in groupedKeywords"
            :key="group.source"
            class="basket-float__group"
          >
            <span class="basket-float__group-label">{{ group.label }} &middot; {{ group.items.length }}</span>
            <ul class="basket-float__items">
              <li
                v-for="kw in group.items"
                :key="kw.source + ':' + kw.keyword"
                class="basket-float__item"
                :class="{ 'basket-float__item--validated': kw.validated }"
              >
                <span class="basket-float__item-kw">{{ kw.keyword }}</span>
                <span v-if="kw.score" class="basket-float__item-score">{{ kw.score }}</span>
                <button
                  class="basket-float__item-remove"
                  :aria-label="`Retirer ${kw.keyword}`"
                  @click="store.removeKeyword(kw.keyword)"
                >&times;</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.basket-float {
  position: fixed;
  bottom: 5.5rem;
  left: 1.5rem;
  z-index: 9997;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.basket-float__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text, #1e293b);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}
.basket-float__pill:hover {
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.15);
}
.basket-float__pill-icon {
  font-size: 1rem;
}
.basket-float__pill-count {
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: var(--color-primary, #2563eb);
  min-width: 0.75rem;
  text-align: center;
}

.basket-float__panel {
  width: 300px;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.basket-float__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-background, #ffffff);
}
.basket-float__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}
.basket-float__total {
  font-size: 0.6875rem;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #64748b);
  margin-right: auto;
}
.basket-float__clear {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
  background: none;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  padding: 0.125rem 0.375rem;
  cursor: pointer;
}
.basket-float__clear:hover {
  color: var(--color-error, #b91c1c);
  border-color: var(--color-error, #b91c1c);
}
.basket-float__collapse {
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: 0.625rem;
  padding: 0.125rem;
  line-height: 1;
}

.basket-float__list {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0.625rem;
}
.basket-float__empty {
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  line-height: 1.4;
  margin: 0;
  padding: 0.5rem;
  font-style: italic;
}

.basket-float__group {
  margin-bottom: 0.75rem;
}
.basket-float__group:last-child { margin-bottom: 0; }
.basket-float__group-label {
  display: block;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
  margin-bottom: 0.25rem;
  font-weight: 700;
}
.basket-float__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.basket-float__item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-background, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  font-size: 0.75rem;
}
.basket-float__item--validated {
  border-color: var(--color-success, #22c55e);
  background: rgba(34, 197, 94, 0.08);
}
.basket-float__item-kw {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text, #1e293b);
}
.basket-float__item-score {
  font-size: 0.625rem;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #64748b);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  background: var(--color-bg-soft, #f1f5f9);
}
.basket-float__item-remove {
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}
.basket-float__item-remove:hover {
  opacity: 1;
  color: var(--color-error, #b91c1c);
}
</style>
