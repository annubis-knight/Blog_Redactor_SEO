<script setup lang="ts">
import { ref, nextTick } from 'vue'

defineProps<{
  isLoading: boolean
  disabled: boolean
  label: string
}>()

const emit = defineEmits<{
  (e: 'add-empty'): void
  (e: 'add-smart'): void
  (e: 'add-guided', input: string): void
}>()

const menuOpen = ref(false)
const guidedOpen = ref(false)
const guidedInput = ref('')
const btnRef = ref<HTMLElement>()
const menuStyle = ref({ top: '0px', left: '0px', width: '0px' })

function toggleMenu() {
  if (menuOpen.value) {
    closeMenu()
    return
  }
  guidedOpen.value = false
  guidedInput.value = ''
  menuOpen.value = true
  nextTick(positionMenu)
}

function positionMenu() {
  const el = btnRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

function closeMenu() {
  menuOpen.value = false
  guidedOpen.value = false
  guidedInput.value = ''
}

function openGuided() {
  menuOpen.value = false
  guidedOpen.value = true
  guidedInput.value = ''
}

function confirmGuided() {
  if (!guidedInput.value.trim()) return
  const input = guidedInput.value.trim()
  guidedOpen.value = false
  guidedInput.value = ''
  emit('add-guided', input)
}
</script>

<template>
  <div class="add-article-wrapper">
    <button
      ref="btnRef"
      class="add-article-placeholder"
      :class="{ 'is-loading': isLoading }"
      :disabled="disabled"
      @click="toggleMenu"
    >
      <span v-if="isLoading" class="add-spinner"></span>
      {{ isLoading ? 'Génération...' : label }}
    </button>
    <Teleport to="body">
      <div v-if="menuOpen" class="add-menu-overlay">
        <div class="add-menu-backdrop" @click="closeMenu"></div>
        <div class="add-menu-items" :style="menuStyle">
          <button @click="emit('add-empty'); closeMenu()">Article vide</button>
          <button @click="closeMenu(); emit('add-smart')">Article complémentaire</button>
          <button @click="openGuided()">Article guidé...</button>
        </div>
      </div>
    </Teleport>
    <div v-if="guidedOpen && !isLoading" class="add-guided-input">
      <input
        v-model="guidedInput"
        placeholder="Sujet ou contexte..."
        @keydown.enter="confirmGuided"
      />
      <button class="add-guided-btn" :disabled="!guidedInput.trim()" @click="confirmGuided">Générer</button>
      <button class="add-guided-close" @click="guidedOpen = false">&#10005;</button>
    </div>
  </div>
</template>

<style scoped>
.add-article-wrapper {
  position: relative;
}

.add-article-placeholder {
  width: 100%;
  padding: 0.5rem;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
  text-align: center;
}

.add-article-placeholder:hover:not(:disabled) {
  background: var(--color-bg-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.add-article-placeholder:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-article-placeholder.is-loading {
  border-color: var(--color-primary);
  color: var(--color-primary);
  cursor: wait;
  opacity: 0.8;
}

.add-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: add-spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 0.25rem;
}

@keyframes add-spin {
  to { transform: rotate(360deg); }
}

.add-guided-input {
  display: flex;
  gap: 0.25rem;
  margin-top: 4px;
}

.add-guided-input input {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.75rem;
  background: var(--color-bg-elevated, #fff);
  color: var(--color-text);
}

.add-guided-input input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.add-guided-btn {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.7rem;
  cursor: pointer;
  white-space: nowrap;
}

.add-guided-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-guided-close {
  padding: 0.35rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  line-height: 1;
}

.add-guided-close:hover {
  background: var(--color-bg-soft);
}
</style>

<style>
/* Global styles for teleported menu */
.add-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.add-menu-backdrop {
  position: absolute;
  inset: 0;
}

.add-menu-items {
  position: fixed;
  z-index: 10000;
  background: var(--color-bg-elevated, #fff);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
}

.add-menu-items button {
  display: block;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 0.75rem;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.add-menu-items button:hover {
  background: var(--color-bg-hover, #f1f5f9);
}
</style>
