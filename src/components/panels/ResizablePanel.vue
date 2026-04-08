<script setup lang="ts">
import { useResizablePanel } from '@/composables/useResizablePanel'

const { panelWidth, isResizing, onPointerDown } = useResizablePanel()
</script>

<template>
  <aside
    class="resizable-panel"
    :class="{ 'is-resizing': isResizing }"
    :style="{ width: `${panelWidth}px` }"
  >
    <div
      class="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner le panneau"
      tabindex="0"
      @pointerdown.prevent="onPointerDown"
    />
    <div class="panel-content">
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.resizable-panel {
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
  border-left: 1px solid var(--color-border);
  background: var(--color-background);
  overflow: hidden;
  display: flex;
}

.resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
}

.resize-handle:hover,
.is-resizing .resize-handle {
  background: var(--color-primary);
  opacity: 0.3;
}

.resize-handle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  position: relative;
}
</style>
