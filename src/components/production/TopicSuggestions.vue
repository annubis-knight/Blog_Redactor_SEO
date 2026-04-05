<script setup lang="ts">
import { ref } from 'vue'
import type { SuggestedTopic } from '@shared/types/index.js'

const props = withDefaults(defineProps<{
  topics: SuggestedTopic[]
  userContext: string
  loading: boolean
  error: string | null
  initiallyCollapsed?: boolean
}>(), {
  initiallyCollapsed: false,
})

const emit = defineEmits<{
  toggle: [index: number]
  remove: [index: number]
  add: [topic: string]
  regenerate: []
  'update:user-context': [text: string]
}>()

const newTopic = ref('')
const collapsed = ref(props.initiallyCollapsed)

function handleAdd() {
  if (!newTopic.value.trim()) return
  emit('add', newTopic.value.trim())
  newTopic.value = ''
}
</script>

<template>
  <div class="topic-suggestions">
    <button class="topic-header" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
      <svg
        class="topic-chevron"
        :class="{ 'topic-chevron--open': !collapsed }"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <h4 class="topic-title">Sujets suggérés</h4>
      <span v-if="collapsed && topics.length > 0" class="topic-badge">{{ topics.filter(t => t.checked).length }}/{{ topics.length }}</span>
      <span
        role="button"
        tabindex="0"
        class="topic-regen-btn"
        :class="{ 'topic-regen-btn--disabled': loading }"
        title="Régénérer les sujets"
        @click.stop="!loading && emit('regenerate')"
        @keydown.enter.stop="!loading && emit('regenerate')"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M13.65 2.35A7.96 7.96 0 008 0a8 8 0 108 8h-2a6 6 0 11-1.76-4.24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M8 0v4l3.5-2L8 0z" fill="currentColor" />
        </svg>
      </span>
    </button>

    <div class="topic-body" :class="{ 'topic-body--collapsed': collapsed }">
      <!-- Loading -->
      <div v-if="loading" class="topic-loading">
        <span class="topic-loading-dot" />
        <span class="topic-loading-dot" />
        <span class="topic-loading-dot" />
        <span class="topic-loading-text">Génération des sujets…</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="topic-error">
        <span>{{ error }}</span>
        <button class="topic-retry-btn" @click="emit('regenerate')">Réessayer</button>
      </div>

      <!-- Topic list -->
      <template v-else>
        <ul v-if="topics.length > 0" class="topic-list">
          <li v-for="(t, i) in topics" :key="t.id" class="topic-item">
            <label class="topic-label">
              <input
                type="checkbox"
                :checked="t.checked"
                class="topic-checkbox"
                @change="emit('toggle', i)"
              />
              <span :class="['topic-text', { 'topic-text--unchecked': !t.checked }]">{{ t.topic }}</span>
            </label>
            <button class="topic-remove-btn" title="Supprimer" @click="emit('remove', i)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
              </svg>
            </button>
          </li>
        </ul>

        <!-- Add topic -->
        <div class="topic-add">
          <input
            v-model="newTopic"
            type="text"
            class="topic-add-input"
            placeholder="Ajouter un sujet…"
            @keydown.enter="handleAdd"
          />
          <button class="topic-add-btn" :disabled="!newTopic.trim()" @click="handleAdd">+</button>
        </div>
      </template>

      <!-- User context textarea -->
      <textarea
        class="topic-context"
        placeholder="Contexte additionnel (optionnel) — ajoutez ici des précisions pour orienter la génération d'articles…"
        :value="userContext"
        rows="2"
        @input="emit('update:user-context', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>

<style scoped>
.topic-suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-soft);
  margin-bottom: 0.75rem;
}

.topic-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  text-align: left;
}

.topic-header:hover {
  color: var(--color-primary);
}

.topic-chevron {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
}

.topic-chevron--open {
  transform: rotate(90deg);
}

.topic-title {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 600;
  color: inherit;
  margin: 0;
}

.topic-badge {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  background: var(--color-surface);
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  white-space: nowrap;
}

.topic-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
  height: auto;
  opacity: 1;
  transition: height 0.25s ease, opacity 0.2s ease;
  interpolate-size: allow-keywords;
}

.topic-body--collapsed {
  height: 0;
  opacity: 0;
}

.topic-regen-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.topic-regen-btn:hover:not(.topic-regen-btn--disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.topic-regen-btn--disabled {
  opacity: 0.3;
  cursor: default;
}

/* Loading */
.topic-loading {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0;
}

.topic-loading-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-text-muted);
  animation: topicPulse 1.2s infinite ease-in-out;
}

.topic-loading-dot:nth-child(2) { animation-delay: 0.2s; }
.topic-loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes topicPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.topic-loading-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: 0.25rem;
}

/* Error */
.topic-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-danger, #ef4444);
}

.topic-retry-btn {
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--color-danger, #ef4444);
  border-radius: 4px;
  background: transparent;
  color: var(--color-danger, #ef4444);
  font-size: 0.6875rem;
  cursor: pointer;
}

.topic-retry-btn:hover {
  background: var(--color-danger, #ef4444);
  color: white;
}

/* Topic list */
.topic-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.topic-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  padding: 0.25rem 0.375rem;
  border-radius: 4px;
  transition: background 0.1s;
}

.topic-item:hover {
  background: var(--color-surface);
}

.topic-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.topic-checkbox {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.topic-text {
  font-size: 0.8125rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-text--unchecked {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.topic-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}

.topic-item:hover .topic-remove-btn {
  opacity: 1;
}

.topic-remove-btn:hover {
  background: var(--color-danger, #ef4444);
  color: white;
}

/* Add topic */
.topic-add {
  display: flex;
  gap: 0.25rem;
}

.topic-add-input {
  flex: 1;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
}

.topic-add-input:focus {
  border-color: var(--color-primary);
}

.topic-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.topic-add-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.topic-add-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Context textarea */
.topic-context {
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  outline: none;
  min-height: 2rem;
}

.topic-context:focus {
  border-color: var(--color-primary);
}

.topic-context::placeholder {
  color: var(--color-text-muted);
}
</style>
