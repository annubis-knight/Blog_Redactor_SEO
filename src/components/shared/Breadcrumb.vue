<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>

<template>
  <nav class="breadcrumb" aria-label="Fil d'Ariane">
    <template v-for="(item, idx) in items" :key="idx">
      <span v-if="idx > 0" class="breadcrumb-sep">/</span>
      <RouterLink v-if="item.to && idx < items.length - 1" :to="item.to" class="breadcrumb-link">
        {{ item.label }}
      </RouterLink>
      <span v-else class="breadcrumb-current">{{ item.label }}</span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  margin-bottom: 1rem;
}

.breadcrumb-sep {
  color: var(--color-text-muted);
}

.breadcrumb-link {
  color: var(--color-text-muted);
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.breadcrumb-current {
  color: var(--color-text);
  font-weight: 600;
}
</style>
