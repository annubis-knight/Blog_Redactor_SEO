<script setup lang="ts">
import { onMounted } from 'vue'
import { useCocoonsStore } from '@/stores/cocoons.store'
import CocoonStats from '@/components/dashboard/CocoonStats.vue'
import CocoonList from '@/components/dashboard/CocoonList.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'

const store = useCocoonsStore()

onMounted(() => {
  store.fetchCocoons()
})
</script>

<template>
  <div class="dashboard">
    <h2 class="dashboard-title">Plan Éditorial</h2>

    <LoadingSpinner v-if="store.isLoading" />

    <ErrorMessage
      v-else-if="store.error"
      :message="store.error"
      @retry="store.fetchCocoons()"
    />

    <template v-else>
      <CocoonStats :cocoons="store.cocoons" />
      <CocoonList :cocoons="store.cocoons" />
    </template>
  </div>
</template>

<style scoped>
.dashboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
</style>
