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

const slots = defineSlots<{
  default(): any
  skeleton?(): any
}>()
</script>

<template>
  <div class="async-content">
    <template v-if="isLoading">
      <slot v-if="slots.skeleton" name="skeleton" />
      <LoadingSpinner v-else />
    </template>
    <ErrorMessage v-else-if="error" :message="error" :hide-retry="hideRetry" @retry="$emit('retry')" />
    <slot v-else />
  </div>
</template>
