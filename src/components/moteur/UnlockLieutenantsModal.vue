<script setup lang="ts">
/**
 * Sprint 12 (D3) — Modal displayed when unlocking the Capitaine while
 * lieutenant_explorations rows already exist. Lets the user decide between
 * keeping them (they may still apply to the new capitaine) or archiving them
 * (status → 'archived'). "Annuler" aborts the unlock.
 */
defineProps<{
  lieutenantCount: number
  capitaineKeyword: string
}>()

const emit = defineEmits<{
  (e: 'keep'): void
  (e: 'archive'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="modal-backdrop" data-testid="unlock-lieutenants-modal" @click.self="emit('cancel')">
    <div class="modal-card" role="dialog" aria-modal="true">
      <h3 class="modal-title">Déverrouiller le Capitaine ?</h3>
      <p class="modal-desc">
        Vous avez <strong>{{ lieutenantCount }}</strong> lieutenant{{ lieutenantCount > 1 ? 's' : '' }}
        testé{{ lieutenantCount > 1 ? 's' : '' }} pour le capitaine actuel
        <em>« {{ capitaineKeyword }} »</em>.
      </p>
      <p class="modal-desc">
        Que souhaitez-vous en faire si vous changez de capitaine&nbsp;?
      </p>
      <div class="modal-actions">
        <button type="button" class="btn-primary" data-testid="unlock-keep-btn" @click="emit('keep')">
          Les garder
        </button>
        <button type="button" class="btn-secondary" data-testid="unlock-archive-btn" @click="emit('archive')">
          Les archiver
        </button>
        <button type="button" class="btn-ghost" data-testid="unlock-cancel-btn" @click="emit('cancel')">
          Annuler
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-card {
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  padding: 1.5rem 1.75rem;
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24);
}
.modal-title {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text, #1e293b);
}
.modal-desc {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text, #1e293b);
}
.modal-desc em {
  color: var(--color-primary, #2563eb);
  font-style: normal;
  font-weight: 600;
}
.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.btn-primary,
.btn-secondary,
.btn-ghost {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
}
.btn-primary {
  background: var(--color-primary, #2563eb);
  color: white;
}
.btn-primary:hover { background: var(--color-primary-hover, #1d4ed8); }
.btn-secondary {
  background: var(--color-surface, #f8fafc);
  border-color: var(--color-border, #e2e8f0);
  color: var(--color-text, #1e293b);
}
.btn-secondary:hover { border-color: var(--color-warning, #f59e0b); color: var(--color-warning, #f59e0b); }
.btn-ghost {
  background: transparent;
  color: var(--color-text-muted, #64748b);
}
.btn-ghost:hover { color: var(--color-text, #1e293b); }
</style>
