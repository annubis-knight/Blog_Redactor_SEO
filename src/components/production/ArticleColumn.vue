<script setup lang="ts">
import IconInfo from '@/components/shared/icons/IconInfo.vue'

const INTERACTIVE = 'a,button,input,textarea,select,[role="button"]'

defineProps<{
  label: string
  headerClass: string
  tooltip?: string
  count: number
  peek?: boolean
}>()

const emit = defineEmits<{
  (e: 'click-peek'): void
}>()

function onColumnClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest(INTERACTIVE)) return
  emit('click-peek')
}
</script>

<template>
  <div
    class="article-column"
    :class="{ 'article-column--peek': peek }"
    @click="peek && onColumnClick($event)"
  >
    <div class="column-header" :class="headerClass">
      <span class="column-label">{{ label }}</span>
      <span v-if="tooltip" class="column-info-wrapper">
        <IconInfo class="column-info-icon" :size="14" />
        <div class="column-tooltip">{{ tooltip }}</div>
      </span>
      <span class="column-count">{{ count }}</span>
    </div>
    <div class="column-cards">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.article-column {
  flex: 0 0 auto;
  width: calc(50% - 2rem);
  max-width: 600px;
  min-width: 0;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: opacity 0.35s ease;
}

.article-column:last-child {
  scroll-snap-align: none;
}

.article-column--peek {
  opacity: 0.4;
  cursor: pointer;
}

.article-column--peek:hover {
  opacity: 0.6;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.column-label {
  letter-spacing: 0.025em;
}

.column-info-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  margin-right: 0.375rem;
}

.column-info-icon {
  opacity: 0.5;
  cursor: help;
  transition: opacity 0.15s;
}

.column-info-wrapper:hover .column-info-icon {
  opacity: 1;
}

.column-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  padding: 0.625rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.5;
  white-space: pre-line;
  background: var(--color-text, #1a1a2e);
  color: var(--color-background, #fff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.column-info-wrapper:hover .column-tooltip {
  display: block;
}

.column-count {
  font-weight: 700;
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Color variants — applied via headerClass prop */
.col-pilier {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.col-inter {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.col-spec {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.column-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (max-width: 900px) {
  .article-column {
    flex: 0 0 auto;
    width: 100%;
    max-width: none;
    scroll-snap-align: none;
  }

  .article-column--peek {
    opacity: 1;
    cursor: default;
  }
}
</style>
