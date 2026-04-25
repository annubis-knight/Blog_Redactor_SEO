<script setup lang="ts">
import { onMounted } from 'vue'
import { useSilosStore } from '@/stores/strategy/silos.store'
import { useWorkflowNavStore } from '@/stores/ui/workflow-nav.store'
import WorkflowNav from '@/components/shared/WorkflowNav.vue'

const silosStore = useSilosStore()
const workflowNav = useWorkflowNavStore()

const WORKFLOW_LABELS: Record<string, string> = {
  cerveau: 'Cerveau',
  moteur: 'Moteur',
  redaction: 'R&eacute;daction',
}

onMounted(() => {
  if (silosStore.silos.length === 0) {
    silosStore.fetchSilos()
  }
})
</script>

<template>
  <header class="app-navbar">
    <RouterLink to="/" class="navbar-brand" title="Dashboard">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>
      </svg>
      <span class="navbar-brand__text">{{ silosStore.theme?.nom ?? 'Blog Redactor SEO' }}</span>
    </RouterLink>

    <!-- Contextual workflow nav (published by the active view through the store) -->
    <div v-if="workflowNav.state" class="navbar-workflow" :data-workflow="workflowNav.state.workflow">
      <span class="navbar-workflow__badge" v-html="WORKFLOW_LABELS[workflowNav.state.workflow] ?? workflowNav.state.workflow" />
      <span class="navbar-workflow__sep" aria-hidden="true">›</span>
      <WorkflowNav
        :active-id="workflowNav.state.activeId"
        :groups="workflowNav.state.groups"
        :steps="workflowNav.state.steps"
        :dense="true"
        @navigate="workflowNav.navigate"
      />
    </div>

    <RouterLink to="/config" class="navbar-config" title="Configuration du thème">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.2" />
        <path d="M6.83 1.58l-.23 1.37a5.02 5.02 0 00-1.22.7L4.08 3.2l-1.17 2.02.93.99c-.06.26-.09.52-.09.79s.03.53.09.79l-.93.99 1.17 2.02 1.3-.45c.37.29.78.52 1.22.7l.23 1.37h2.34l.23-1.37c.44-.18.85-.41 1.22-.7l1.3.45 1.17-2.02-.93-.99c.06-.26.09-.52.09-.79s-.03-.53-.09-.79l.93-.99-1.17-2.02-1.3.45a5.02 5.02 0 00-1.22-.7L9.17 1.58H6.83z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
      </svg>
    </RouterLink>
  </header>
</template>

<style scoped>
.app-navbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.navbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.navbar-brand:hover {
  text-decoration: none;
  background: var(--color-bg-hover, #f1f5f9);
  color: var(--color-primary, #3b82f6);
}

.navbar-brand__text {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.navbar-workflow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.navbar-workflow__badge {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.1);
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.navbar-workflow__sep {
  color: var(--color-border, #cbd5e1);
  font-size: 1rem;
  flex-shrink: 0;
}

.navbar-config {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
  border-radius: 6px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.navbar-config:hover {
  color: var(--color-primary);
  background: var(--color-bg-hover);
  text-decoration: none;
}
</style>
