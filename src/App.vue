<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGateAlarmStore } from '@/stores/ui/gate-alarm.store'
import AppNavbar from '@/components/shared/AppNavbar.vue'
import ToastContainer from '@/components/shared/ToastContainer.vue'
import CostLogPanel from '@/components/shared/CostLogPanel.vue'
import CaptainTriggerToast from '@/components/shared/CaptainTriggerToast.vue'
import GateAlarm from '@/components/shared/GateAlarm.vue'

const route = useRoute()
const gateAlarm = useGateAlarmStore()

// Une alarme appartient à l'écran qui l'a ouverte : changer de page revient à
// « Revenir corriger », jamais à valider une action sur une page quittée.
watch(() => route.fullPath, () => gateAlarm.cancel())
</script>

<template>
  <div class="app">
    <AppNavbar v-if="!route.meta.hideNavbar" />
    <main class="app-main">
      <RouterView />
    </main>
    <ToastContainer />
    <CostLogPanel />
    <CaptainTriggerToast />
    <GateAlarm />
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
