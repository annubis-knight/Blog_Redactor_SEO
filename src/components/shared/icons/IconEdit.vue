<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 16 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9.5 4.5l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
