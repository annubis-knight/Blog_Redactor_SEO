<script setup lang="ts">
withDefaults(defineProps<{ direction?: 'left' | 'right'; size?: number }>(), {
  direction: 'left',
  size: 10,
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path
      v-if="direction === 'right'"
      d="M3.5 1.5L7 5l-3.5 3.5"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    />
    <path
      v-else
      d="M6.5 1.5L3 5l3.5 3.5"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    />
  </svg>
</template>
