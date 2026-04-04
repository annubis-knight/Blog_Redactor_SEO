<script setup lang="ts">
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'

withDefaults(defineProps<{
  isLoading: boolean
  error: string | null
  hideRetry?: boolean
}>(), {
  hideRetry: false,
})

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="async-content">
    <LoadingSpinner v-if="isLoading" />
    <ErrorMessage v-else-if="error" :message="error" :hide-retry="hideRetry" @retry="$emit('retry')" />
    <slot v-else />
  </div>
</template>
