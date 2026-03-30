<script setup lang="ts">
import { computed } from 'vue'

const MOTEUR_CHECKS = [
  // Phase ① Générer (2 checks)
  'discovery_done',
  'radar_done',
  // Phase ② Valider (3 checks)
  'intent_done',
  'audit_done',
  'local_done',
  // Phase ③ Assigner (2 checks)
  'captain_chosen',
  'assignment_done',
] as const

const PHASE_GROUPS = [
  { checks: ['discovery_done', 'radar_done'], label: 'Générer' },
  { checks: ['intent_done', 'audit_done', 'local_done'], label: 'Valider' },
  { checks: ['captain_chosen', 'assignment_done'], label: 'Assigner' },
] as const

const CHECK_TOOLTIPS: Record<string, string> = {
  'discovery_done': 'Discovery',
  'radar_done': 'Radar',
  'intent_done': 'Intention',
  'audit_done': 'Audit',
  'local_done': 'Local',
  'captain_chosen': 'Capitaine',
  'assignment_done': 'Assignation',
}

const props = defineProps<{
  completedChecks: string[]
}>()

const groups = computed(() =>
  PHASE_GROUPS.map(group => ({
    label: group.label,
    dots: group.checks.map(check => ({
      check,
      filled: props.completedChecks.includes(check),
      tooltip: CHECK_TOOLTIPS[check] ?? check,
    })),
  })),
)
</script>

<template>
  <span class="progress-dots" :aria-label="`Progression : ${completedChecks.length} sur ${MOTEUR_CHECKS.length}`">
    <span
      v-for="(group, gi) in groups"
      :key="gi"
      class="progress-dots-group"
      :aria-label="group.label"
    >
      <span
        v-for="dot in group.dots"
        :key="dot.check"
        class="progress-dot"
        :class="{ 'progress-dot--filled': dot.filled }"
        :title="dot.tooltip"
        :aria-label="`${dot.tooltip}: ${dot.filled ? 'fait' : 'à faire'}`"
      />
    </span>
  </span>
</template>

<style scoped>
.progress-dots {
  display: inline-flex;
  gap: 1px;
  align-items: center;
  flex-shrink: 0;
}

.progress-dots-group {
  display: inline-flex;
  gap: 1px;
}

.progress-dots-group + .progress-dots-group {
  margin-left: 3px;
}

.progress-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-border, #ddd);
  transition: background 0.15s;
}

.progress-dot--filled {
  background: var(--color-primary, #4a90d9);
}
</style>
