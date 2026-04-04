<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 16 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
