<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 16 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.5M13.5 8a5.5 5.5 0 0 1-9.68 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M12.5 1v3.5H9M3.5 15v-3.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <slot />
  </svg>
</template>
