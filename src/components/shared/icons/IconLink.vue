<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 16 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6.5 9.5l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M8.5 10.5l-1.3 1.3a2.12 2.12 0 0 1-3-3L5.5 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M7.5 5.5l1.3-1.3a2.12 2.12 0 0 1 3 3L10.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
