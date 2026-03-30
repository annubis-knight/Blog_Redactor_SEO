<script setup lang="ts">
defineProps<{
  suggestions: string[]
}>()
</script>

<template>
  <div class="autocomplete-chips">
    <span
      v-for="suggestion in suggestions"
      :key="suggestion"
      class="chip"
    >
      {{ suggestion }}
    </span>
  </div>
</template>

<style scoped>
.autocomplete-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.chip {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: var(--color-badge-blue-bg, #eff6ff);
  color: var(--color-badge-blue-text, #1e40af);
  font-size: 0.6875rem;
  font-weight: 500;
}
</style>
