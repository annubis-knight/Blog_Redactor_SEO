<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import type { Silo } from '@shared/types/index.js'
import { useSilosStore } from '@/stores/strategy/silos.store'
import CocoonCard from './CocoonCard.vue'
import ProgressBar from '@/components/shared/ProgressBar.vue'

const props = defineProps<{
  silo: Silo
}>()

const router = useRouter()
const silosStore = useSilosStore()

// --- Slider ---
const trackRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollState() {
  const el = trackRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
}

function scroll(direction: 'left' | 'right') {
  const el = trackRef.value
  if (!el) return
  const cardWidth = 300 + 12 // card min-width + gap
  el.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
}

const showArrows = computed(() =>
  // Show arrows if total items (cocoons + add card) > what fits
  canScrollLeft.value || canScrollRight.value,
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const el = trackRef.value
  if (!el) return
  el.addEventListener('scroll', updateScrollState, { passive: true })
  resizeObserver = new ResizeObserver(updateScrollState)
  resizeObserver.observe(el)
  updateScrollState()
})

onBeforeUnmount(() => {
  trackRef.value?.removeEventListener('scroll', updateScrollState)
  resizeObserver?.disconnect()
})

// --- Add cocoon ---
const isAdding = ref(false)
const newName = ref('')
const isCreating = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

async function startAdding() {
  isAdding.value = true
  newName.value = ''
  await nextTick()
  inputRef.value?.focus()
  // Scroll to end to show the input
  await nextTick()
  const el = trackRef.value
  if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
}

function cancelAdding() {
  isAdding.value = false
  newName.value = ''
}

async function confirmAdd() {
  const name = newName.value.trim()
  if (!name || isCreating.value) return

  isCreating.value = true
  const cocoon = await silosStore.addCocoon(props.silo.nom, name)
  isCreating.value = false

  if (cocoon) {
    isAdding.value = false
    newName.value = ''
    router.push(`/cocoon/${cocoon.id}`)
  }
}

function handleBlur() {
  if (newName.value.trim()) {
    confirmAdd()
  } else {
    cancelAdding()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') confirmAdd()
  if (e.key === 'Escape') {
    newName.value = ''
    cancelAdding()
  }
}
</script>

<template>
  <section class="silo-card">
    <div class="silo-header">
      <div class="silo-name-row">
        <RouterLink :to="`/silo/${silo.id}`" class="silo-name-link">
          <h3 class="silo-name">{{ silo.nom }}</h3>
        </RouterLink>
        <RouterLink :to="`/silo/${silo.id}`" class="silo-config-btn" title="Configuration du silo">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.2" />
            <path d="M6.83 1.58l-.23 1.37a5.02 5.02 0 00-1.22.7L4.08 3.2l-1.17 2.02.93.99c-.06.26-.09.52-.09.79s.03.53.09.79l-.93.99 1.17 2.02 1.3-.45c.37.29.78.52 1.22.7l.23 1.37h2.34l.23-1.37c.44-.18.85-.41 1.22-.7l1.3.45 1.17-2.02-.93-.99c.06-.26.09-.52.09-.79s-.03-.53-.09-.79l.93-.99-1.17-2.02-1.3.45a5.02 5.02 0 00-1.22-.7L9.17 1.58H6.83z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
          </svg>
        </RouterLink>
      </div>
      <p class="silo-desc">{{ silo.description }}</p>
      <div class="silo-meta">
        <span class="silo-stat">{{ silo.cocons.length }} cocon{{ silo.cocons.length > 1 ? 's' : '' }}</span>
        <span class="silo-sep">&middot;</span>
        <span class="silo-stat">{{ silo.stats?.totalArticles ?? 0 }} articles</span>
        <span class="silo-sep">&middot;</span>
        <span class="silo-stat">{{ silo.stats?.completionPercent ?? 0 }}%</span>
      </div>
      <ProgressBar
        :percent="silo.stats?.completionPercent ?? 0"
        :color="silo.stats?.completionPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'"
      />
    </div>

    <!-- Slider wrapper -->
    <div class="slider-wrapper">
      <!-- Left arrow -->
      <button
        v-if="showArrows"
        class="slider-arrow slider-arrow--left"
        :class="{ hidden: !canScrollLeft }"
        :disabled="!canScrollLeft"
        aria-label="Défiler vers la gauche"
        @click="scroll('left')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <!-- Scrollable track -->
      <div ref="trackRef" class="slider-track">
        <CocoonCard v-for="cocoon in silo.cocons" :key="cocoon.id" :cocoon="cocoon" />

        <!-- Add cocoon: dashed card -->
        <div
          v-if="!isAdding"
          class="add-cocoon-card"
          role="button"
          tabindex="0"
          @click="startAdding"
          @keydown.enter="startAdding"
        >
          <svg class="add-cocoon-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span class="add-cocoon-label">Nouveau cocon</span>
        </div>

        <!-- Add cocoon: inline input -->
        <div v-else class="add-cocoon-card adding">
          <input
            ref="inputRef"
            v-model="newName"
            class="add-cocoon-input"
            type="text"
            placeholder="Nom du cocon..."
            :disabled="isCreating"
            @keydown="handleKeydown"
            @blur="handleBlur"
          />
          <span v-if="isCreating" class="add-cocoon-spinner" />
        </div>
      </div>

      <!-- Right arrow -->
      <button
        v-if="showArrows"
        class="slider-arrow slider-arrow--right"
        :class="{ hidden: !canScrollRight }"
        :disabled="!canScrollRight"
        aria-label="Défiler vers la droite"
        @click="scroll('right')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.silo-card {
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.silo-header {
  margin-bottom: 1.25rem;
}

.silo-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.silo-name-link {
  text-decoration: none;
  color: inherit;
}

.silo-name-link:hover .silo-name {
  color: var(--color-primary);
}

.silo-name {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
  transition: color 0.15s;
}

.silo-config-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--color-text-muted);
  transition: color 0.15s, background 0.15s;
  text-decoration: none;
}

.silo-config-btn:hover {
  color: var(--color-primary);
  background: var(--color-bg-hover);
  text-decoration: none;
}

.silo-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}

.silo-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.silo-sep {
  color: var(--color-border);
}

/* ---- Slider ---- */
.slider-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0;
}

.slider-track {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0.25rem 0;
}

.slider-track::-webkit-scrollbar {
  display: none;
}

.slider-track > * {
  flex: 0 0 300px;
  scroll-snap-align: start;
}

.slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: opacity 0.2s, background 0.15s, color 0.15s;
}

.slider-arrow:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.slider-arrow.hidden {
  opacity: 0;
  pointer-events: none;
}

.slider-arrow--left {
  left: -12px;
}

.slider-arrow--right {
  right: -12px;
}

/* ---- Add cocoon card ---- */
.add-cocoon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.add-cocoon-card:hover,
.add-cocoon-card:focus-visible {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 4%, transparent);
  outline: none;
}

.add-cocoon-icon {
  opacity: 0.5;
  transition: opacity 0.2s, transform 0.2s;
}

.add-cocoon-card:hover .add-cocoon-icon,
.add-cocoon-card:focus-visible .add-cocoon-icon {
  opacity: 1;
  transform: scale(1.15);
}

.add-cocoon-label {
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* Input state */
.add-cocoon-card.adding {
  cursor: default;
  border-color: var(--color-primary);
  background: var(--color-background);
  flex-direction: row;
  gap: 0.5rem;
}

.add-cocoon-input {
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  outline: none;
  text-align: center;
}

.add-cocoon-input::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
}

.add-cocoon-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
