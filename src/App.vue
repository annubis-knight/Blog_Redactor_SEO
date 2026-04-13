<script setup lang="ts">
import AppNavbar from '@/components/shared/AppNavbar.vue'
import ToastContainer from '@/components/shared/ToastContainer.vue'
import CostLogPanel from '@/components/shared/CostLogPanel.vue'
</script>

<template>
  <div class="app">
    <AppNavbar />
    <main class="app-main">
      <RouterView />
    </main>
    <ToastContainer />
    <CostLogPanel />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  width: 100%;
}
</style>
