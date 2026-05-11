<script setup lang="ts">
/**
 * Modale de confirmation légère réutilisable.
 *
 * Usage minimal — émet `confirm` ou `cancel` puis le parent gère la fermeture
 * via la prop `open`. Pas de portail, pas de focus-trap avancé : on reste
 * volontairement simple. Cohérent avec le style Moteur (var CSS).
 *
 * Premier consommateur : LexiquePanel.vue(
 * coût DataForSEO avant déclenchement scrape SERP).
 */
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onConfirm(): void {
  emit('confirm')
}

function onCancel(): void {
  emit('cancel')
}
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    data-testid="confirm-modal"
    @click.self="onCancel"
  >
    <div class="modal-card">
      <h3 class="modal-title">{{ title }}</h3>
      <p class="modal-message">{{ message }}</p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn-cancel"
          data-testid="confirm-modal-cancel"
          @click="onCancel"
        >
          {{ cancelLabel ?? 'Annuler' }}
        </button>
        <button
          type="button"
          class="btn btn-confirm"
          data-testid="confirm-modal-confirm"
          @click="onConfirm"
        >
          {{ confirmLabel ?? 'Confirmer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  max-width: 28rem;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.modal-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.modal-message {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text, #0f172a);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  color: var(--color-text-muted, #64748b);
  border: 1px solid var(--color-border, #e2e8f0);
}

.btn-confirm {
  background: var(--color-primary, #2563eb);
  color: #fff;
}

.btn-confirm:hover {
  background: var(--color-primary-hover, #1d4ed8);
}
</style>
