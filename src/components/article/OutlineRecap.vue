<script setup lang="ts">
import { computed } from 'vue'
import type { Outline } from '@shared/types/index.js'

const props = defineProps<{
  outline: Outline | null
}>()

const tocSections = computed(() =>
  props.outline?.sections.filter(s => s.level >= 1 && s.level <= 3) ?? [],
)
</script>

<template>
  <div v-if="tocSections.length > 0" class="outline-recap-wrapper">
    <div class="outline-recap">
      <div class="toc-title">Sommaire</div>
      <ul class="toc-list">
        <li
          v-for="section in tocSections"
          :key="section.id"
          class="toc-item"
          :class="{
            'toc-h1': section.level === 1,
            'toc-h3': section.level === 3,
          }"
        >
          <span class="toc-link">{{ section.title }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.outline-recap-wrapper {
  margin-top: 0.75rem;
}

.outline-recap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.toc-title {
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 0.625rem;
  color: var(--color-text);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toc-item {
  font-size: 0.8125rem;
  line-height: 1.5;
}

.toc-link {
  color: var(--color-primary, #2563eb);
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s;
  cursor: default;
}

.toc-link:hover {
  text-decoration-color: var(--color-primary, #2563eb);
}

/* H1 item — article title, bold, no indent */
.toc-h1 {
  font-weight: 700;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

/* H3 items are indented like a nested list */
.toc-h3 {
  padding-left: 1.25rem;
  font-size: 0.75rem;
}

.toc-h3::before {
  content: '– ';
  color: var(--color-text-muted, #6b7280);
}
</style>
