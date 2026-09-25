<script setup lang="ts">
/**
 * Alarme graduée (FR-INFRA-GATE-WAIVER) — montée une fois dans App.vue.
 *
 * Quand une porte de qualité refuse un passage (verrouiller le capitaine,
 * valider les lieutenants, publier…), l'alarme montre chaque point avec son
 * niveau, le risque en clair et les alternatives :
 *
 *   ⛔ technique — à corriger, aucune dérogation possible ;
 *   🔴 risque    — catégorie + raison d'au moins 20 caractères (enregistrées) ;
 *   🟠 attention — une case « J'ai lu » suffit.
 *
 * Le bouton « Je prends la responsabilité » n'est actif que lorsque chaque
 * point a sa réponse recevable. Le serveur revérifie tout.
 *
 * Accessibilité : fenêtre `alertdialog` qui ne se ferme pas au clic extérieur
 * (une raison en cours de saisie ne se perd pas), focus gardé dans la fenêtre
 * (Tab / Maj+Tab bouclent), rendu à l'élément qui l'avait ouverte, et chaque
 * champ nommé d'après l'alerte à laquelle il répond.
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGateAlarmStore } from '@/stores/ui/gate-alarm.store'
import {
  gateTitle,
  MIN_WAIVER_REASON_LENGTH,
  WAIVER_CATEGORIES,
  WAIVER_CATEGORY_LABELS,
  waiverDraftsFrom,
  worstLevel,
  type GateLevel,
  type WaiverAnswer,
} from '@shared/verifiers/gate.js'

const store = useGateAlarmStore()
const { current, refused, isSubmitting, submitError } = storeToRefs(store)

const LEVEL_ICONS: Record<GateLevel, string> = { technique: '⛔', risque: '🔴', attention: '🟠' }
const LEVEL_LABELS: Record<GateLevel, string> = {
  technique: 'À corriger',
  risque: 'Risque',
  attention: 'Attention',
}

const answers = reactive<Record<string, WaiverAnswer>>({})
const dialog = ref<HTMLElement | null>(null)
/** Élément qui avait le focus avant l'alarme : il le retrouve à la fermeture. */
let returnFocusTo: HTMLElement | null = null

const blocking = computed(() => current.value?.evaluation.blocking ?? [])
const waived = computed(() => current.value?.evaluation.waived ?? [])
const worst = computed(() => worstLevel(blocking.value))
const hasTechnique = computed(() => worst.value === 'technique')
const onlyAttention = computed(() => worst.value === 'attention')
const drafts = computed(() => waiverDraftsFrom(blocking.value, answers))
const ready = computed(() => blocking.value.length > 0 && drafts.value.missing.length === 0)

const title = computed(() => (current.value ? gateTitle(current.value.gateId) : ''))
const intro = computed(() => {
  const n = blocking.value.length
  const points = `${n} point${n > 1 ? 's' : ''} à regarder`
  if (hasTechnique.value) return `${points}. Un défaut ⛔ se corrige avant de continuer : aucune dérogation n’est possible.`
  if (onlyAttention.value) return `${points}. Lisez-les : une case cochée suffit pour continuer.`
  return `${points}. Vous pouvez passer outre, mais en expliquant pourquoi : votre raison est enregistrée.`
})
const acceptLabel = computed(() => {
  if (hasTechnique.value) return 'Correction nécessaire'
  return onlyAttention.value ? 'J’ai lu, je continue' : 'Je prends la responsabilité et je continue'
})

function answerFor(rule: string): WaiverAnswer {
  if (!answers[rule]) answers[rule] = { acknowledged: false, category: null, reason: '' }
  return answers[rule]
}

function reasonLength(rule: string): number {
  return (answers[rule]?.reason ?? '').trim().length
}

function refusalFor(rule: string): string | null {
  return refused.value.find(r => r.rule === rule)?.problem ?? null
}

// Nouvelle alarme : on repart de réponses vides, et on donne le focus à la
// fenêtre pour que le clavier (Tab, Échap) y soit tout de suite.
watch(
  () => current.value?.evaluation.inputHash ?? null,
  async (hash, previous) => {
    if (!hash) {
      // Alarme fermée : le focus retourne d'où il venait.
      returnFocusTo?.focus?.()
      returnFocusTo = null
      return
    }
    if (hash === previous) return
    if (!previous && document.activeElement instanceof HTMLElement) returnFocusTo = document.activeElement
    for (const key of Object.keys(answers)) delete answers[key]
    await nextTick()
    dialog.value?.focus()
  },
)

const FOCUSABLE = 'button:not([disabled]), select, textarea, input, [href], [tabindex]:not([tabindex="-1"])'

/** Tab et Maj+Tab restent dans la fenêtre : la page derrière est inerte. */
function trapFocus(event: KeyboardEvent): void {
  const root = dialog.value
  if (!root) return
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === root)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

async function accept(): Promise<void> {
  if (!ready.value || isSubmitting.value) return
  await store.submit(drafts.value.drafts)
}
</script>

<template>
  <div
    v-if="current"
    class="gate-backdrop"
    data-testid="gate-alarm"
    :data-gate="current.gateId"
  >
    <section
      ref="dialog"
      class="gate-card"
      :class="worst ? `gate-card--${worst}` : ''"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="gate-alarm-title"
      aria-describedby="gate-alarm-intro"
      tabindex="-1"
      @keydown.esc="store.cancel()"
      @keydown.tab="trapFocus"
    >
      <h2 id="gate-alarm-title" class="gate-title">{{ title }}</h2>
      <p id="gate-alarm-intro" class="gate-intro">{{ intro }}</p>

      <ul class="gate-issues">
        <li
          v-for="issue in blocking"
          :key="issue.rule"
          class="gate-issue"
          :class="`gate-issue--${issue.level}`"
          data-testid="gate-issue"
          :data-level="issue.level"
          :data-rule="issue.rule"
        >
          <p class="gate-issue-head">
            <span class="gate-level" aria-hidden="true">{{ LEVEL_ICONS[issue.level] }}</span>
            <span class="gate-level-label">{{ LEVEL_LABELS[issue.level] }}</span>
            <span class="gate-message">{{ issue.message }}</span>
          </p>
          <p v-if="issue.risk" class="gate-risk"><strong>Le risque :</strong> {{ issue.risk }}</p>
          <blockquote v-if="issue.excerpt" class="gate-excerpt">{{ issue.excerpt }}</blockquote>
          <div v-if="issue.alternatives?.length" class="gate-alternatives">
            <strong>À la place :</strong>
            <ul>
              <li v-for="alt in issue.alternatives" :key="alt">{{ alt }}</li>
            </ul>
          </div>

          <p v-if="issue.level === 'technique'" class="gate-fix">Ce point doit être corrigé : il ne se déroge pas.</p>

          <label v-else-if="issue.level === 'attention'" class="gate-ack">
            <input
              v-model="answerFor(issue.rule).acknowledged"
              type="checkbox"
              data-testid="gate-ack"
              :aria-label="`J’ai lu : ${issue.message}`"
            >
            J’ai lu
          </label>

          <div v-else class="gate-waiver">
            <label class="gate-field">
              <span>Pourquoi passer outre ?</span>
              <select
                v-model="answerFor(issue.rule).category"
                data-testid="gate-category"
                :aria-label="`Pourquoi passer outre : ${issue.message}`"
              >
                <option :value="null" disabled>Choisir…</option>
                <option v-for="cat in WAIVER_CATEGORIES" :key="cat" :value="cat">{{ WAIVER_CATEGORY_LABELS[cat] }}</option>
              </select>
            </label>
            <label class="gate-field">
              <span>Votre raison</span>
              <textarea
                v-model="answerFor(issue.rule).reason"
                rows="2"
                data-testid="gate-reason"
                :aria-label="`Votre raison pour : ${issue.message}`"
                :placeholder="`Au moins ${MIN_WAIVER_REASON_LENGTH} caractères : ce que vous savez et que l’outil ne voit pas.`"
              />
            </label>
            <span
              class="gate-counter"
              :class="{ 'gate-counter--ok': reasonLength(issue.rule) >= MIN_WAIVER_REASON_LENGTH }"
              data-testid="gate-reason-counter"
            >{{ reasonLength(issue.rule) }} / {{ MIN_WAIVER_REASON_LENGTH }}</span>
          </div>

          <p v-if="refusalFor(issue.rule)" class="gate-refused" role="alert" data-testid="gate-refused">
            {{ refusalFor(issue.rule) }}
          </p>
        </li>
      </ul>

      <details v-if="waived.length" class="gate-waived" data-testid="gate-waived">
        <summary>🛡 {{ waived.length }} dérogation{{ waived.length > 1 ? 's' : '' }} déjà posée{{ waived.length > 1 ? 's' : '' }}</summary>
        <ul>
          <li v-for="w in waived" :key="w.issue.rule">
            {{ w.issue.message }}
            <em v-if="w.waiver.reason"> — {{ w.waiver.reason }}</em>
          </li>
        </ul>
      </details>

      <p v-if="submitError" class="gate-refused" role="alert">{{ submitError }}</p>

      <div class="gate-actions">
        <button type="button" class="gate-btn gate-btn--cancel" data-testid="gate-cancel" @click="store.cancel()">
          Revenir corriger
        </button>
        <button
          type="button"
          class="gate-btn gate-btn--accept"
          data-testid="gate-accept"
          :disabled="!ready || isSubmitting"
          @click="accept"
        >
          {{ isSubmitting ? 'Enregistrement…' : acceptLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gate-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.5);
}

.gate-card {
  --gate-accent: var(--color-warning, #d97706);
  width: 100%;
  max-width: 40rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-top: 4px solid var(--gate-accent);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  outline: none;
}

.gate-card--risque,
.gate-card--technique {
  --gate-accent: var(--color-error, #dc2626);
}

.gate-title {
  margin: 0 0 0.375rem;
  font-size: 1.0625rem;
  color: var(--color-heading, #0f172a);
}

.gate-intro {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #64748b);
}

.gate-issues {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.gate-issue {
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-left: 3px solid var(--color-warning, #d97706);
  border-radius: 6px;
  background: var(--color-bg-soft, #f8fafc);
  font-size: 0.875rem;
}

.gate-issue--risque,
.gate-issue--technique {
  border-left-color: var(--color-error, #dc2626);
}

.gate-issue-head {
  margin: 0;
  line-height: 1.45;
}

.gate-level-label {
  margin: 0 0.375rem 0 0.25rem;
  font-weight: 700;
}

.gate-risk,
.gate-fix {
  margin: 0.375rem 0 0;
  color: var(--color-text, #0f172a);
}

.gate-fix {
  font-weight: 600;
  color: var(--color-error, #dc2626);
}

.gate-excerpt {
  margin: 0.375rem 0 0;
  padding-left: 0.625rem;
  border-left: 2px solid var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #64748b);
  font-style: italic;
}

.gate-alternatives ul {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
}

.gate-alternatives {
  margin-top: 0.375rem;
}

.gate-ack {
  display: inline-flex;
  gap: 0.375rem;
  align-items: center;
  margin-top: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.gate-waiver {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.gate-field {
  display: grid;
  gap: 0.25rem;
  font-weight: 600;
}

.gate-field select,
.gate-field textarea {
  width: 100%;
  padding: 0.375rem 0.5rem;
  font: inherit;
  font-weight: 400;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
}

.gate-counter {
  justify-self: end;
  font-size: 0.75rem;
  color: var(--color-error, #dc2626);
}

.gate-counter--ok {
  color: var(--color-success, #16a34a);
}

.gate-refused {
  margin: 0.5rem 0 0;
  color: var(--color-error, #dc2626);
  font-weight: 600;
}

.gate-waived {
  margin-bottom: 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

.gate-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.gate-btn {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
}

.gate-btn--cancel {
  border: 1px solid var(--color-border, #e2e8f0);
  background: transparent;
  color: var(--color-text, #0f172a);
}

.gate-btn--accept {
  border: none;
  background: var(--gate-accent);
  color: #fff;
}

.gate-btn--accept:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
