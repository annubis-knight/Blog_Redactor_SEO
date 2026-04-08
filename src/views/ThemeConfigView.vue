<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useThemeConfigStore } from '@/stores/theme-config.store'
import { apiPost } from '@/services/api.service'
import type { ThemeConfig } from '@shared/types/index.js'
import Breadcrumb from '@/components/shared/Breadcrumb.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import AsyncContent from '@/components/shared/AsyncContent.vue'
import { log } from '@/utils/logger'

const store = useThemeConfigStore()
const freeText = ref('')
const isParsing = ref(false)
const parseError = ref<string | null>(null)

async function parseWithAI() {
  if (!freeText.value.trim()) return
  isParsing.value = true
  parseError.value = null
  try {
    log.info('Parsing theme config with AI')
    const result = await apiPost<ThemeConfig>('/theme/config/parse', { text: freeText.value })
    store.config = result
    await store.saveConfig()
    freeText.value = ''
    log.info('AI parse complete, config saved')
  } catch (err) {
    parseError.value = (err as Error).message
    log.error('AI theme parse failed', { error: (err as Error).message })
  } finally {
    isParsing.value = false
  }
}

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Configuration' },
]

// --- Chip input helpers ---
const newDifferentiator = ref('')
const newPainPoint = ref('')
const newService = ref('')
const newVocab = ref('')

function addToList(list: string[], value: string): string {
  const val = value.trim()
  if (val && !list.includes(val)) {
    list.push(val)
  }
  return ''
}

function removeChip(list: string[], index: number) {
  list.splice(index, 1)
}

// --- Auto-save debounce ---
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    store.saveConfig()
  }, 1500)
}

onMounted(() => {
  log.info('ThemeConfigView mounted, fetching config')
  store.fetchConfig()
})
</script>

<template>
  <div class="theme-config">
    <Breadcrumb :items="breadcrumbItems" />

    <div class="config-header">
      <h2 class="config-title">Configuration du Thème</h2>
      <button
        class="btn-save"
        :disabled="store.isSaving"
        @click="store.saveConfig()"
      >
        {{ store.isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
      </button>
    </div>

    <AsyncContent :is-loading="store.isLoading" :error="store.error" @retry="store.fetchConfig()">
      <div class="config-sections">
      <!-- AI free-text parser -->
      <div class="ai-parse-section">
        <label class="form-field">
          <span class="form-label">Remplissage automatique par IA</span>
          <textarea
            v-model="freeText"
            class="form-textarea ai-textarea"
            rows="5"
            placeholder="Décrivez votre entreprise en texte libre : secteur, services, audience cible, promesse, ton de communication... Claude analysera votre texte et remplira automatiquement les champs ci-dessous."
          />
        </label>
        <div class="ai-parse-actions">
          <button
            class="btn-ai-parse"
            :disabled="isParsing || !freeText.trim()"
            @click="parseWithAI"
          >
            {{ isParsing ? 'Analyse en cours...' : 'Remplir les champs avec Claude' }}
          </button>
          <span v-if="parseError" class="parse-error">{{ parseError }}</span>
        </div>
      </div>

      <!-- ========== PERSPECTIVE 1: Votre entreprise ========== -->
      <div class="perspective-block perspective--business">
        <div class="perspective-header">
          <span class="perspective-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 21V7l9-4 9 4v14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M9 21V13h6v8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </span>
          <h3 class="perspective-title">Votre entreprise</h3>
          <span class="perspective-subtitle">Ce que vous offrez et ce qui vous diff&eacute;rencie</span>
        </div>

        <CollapsableSection title="Positionnement">
          <div class="form-stack">
            <label class="form-field">
              <span class="form-label">Promesse principale</span>
              <input
                v-model="store.config.positioning.mainPromise"
                type="text"
                class="form-input"
                placeholder="Quelle promesse faites-vous à votre audience ?"
                @input="debouncedSave"
              />
            </label>
            <label class="form-field">
              <span class="form-label">Localisation</span>
              <input
                v-model="store.config.avatar.location"
                type="text"
                class="form-input"
                placeholder="Ex: Toulouse, France"
                @input="debouncedSave"
              />
            </label>
            <div class="form-field">
              <span class="form-label">Diff&eacute;renciateurs</span>
              <div class="chip-list">
                <span v-for="(diff, i) in store.config.positioning.differentiators" :key="i" class="chip">
                  {{ diff }}
                  <button class="chip-remove" @click="removeChip(store.config.positioning.differentiators, i); debouncedSave()">&times;</button>
                </span>
              </div>
              <div class="chip-input-row">
                <input
                  v-model="newDifferentiator"
                  type="text"
                  class="form-input"
                  placeholder="Ajouter un diff&eacute;renciateur..."
                  @keydown.enter.prevent="newDifferentiator = addToList(store.config.positioning.differentiators, newDifferentiator); debouncedSave()"
                />
                <button class="btn-add" @click="newDifferentiator = addToList(store.config.positioning.differentiators, newDifferentiator); debouncedSave()">+</button>
              </div>
            </div>
          </div>
        </CollapsableSection>

        <CollapsableSection title="Offres & Services">
          <div class="form-stack">
            <div class="form-field">
              <span class="form-label">Services</span>
              <div class="chip-list">
                <span v-for="(svc, i) in store.config.offerings.services" :key="i" class="chip">
                  {{ svc }}
                  <button class="chip-remove" @click="removeChip(store.config.offerings.services, i); debouncedSave()">&times;</button>
                </span>
              </div>
              <div class="chip-input-row">
                <input
                  v-model="newService"
                  type="text"
                  class="form-input"
                  placeholder="Ajouter un service..."
                  @keydown.enter.prevent="newService = addToList(store.config.offerings.services, newService); debouncedSave()"
                />
                <button class="btn-add" @click="newService = addToList(store.config.offerings.services, newService); debouncedSave()">+</button>
              </div>
            </div>
            <label class="form-field">
              <span class="form-label">CTA principal</span>
              <input
                v-model="store.config.offerings.mainCTA"
                type="text"
                class="form-input"
                placeholder="Ex: Demander un devis, Prendre rendez-vous..."
                @input="debouncedSave"
              />
            </label>
            <label class="form-field">
              <span class="form-label">Cible du CTA</span>
              <input
                v-model="store.config.offerings.ctaTarget"
                type="text"
                class="form-input"
                placeholder="Ex: /contact, /devis, calendly.com/..."
                @input="debouncedSave"
              />
            </label>
          </div>
        </CollapsableSection>
      </div>

      <!-- ========== PERSPECTIVE 2: Votre client type ========== -->
      <div class="perspective-block perspective--client">
        <div class="perspective-header">
          <span class="perspective-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5" />
              <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <h3 class="perspective-title">Votre client type</h3>
          <span class="perspective-subtitle">Qui il est, ce qu'il vit, ses probl&egrave;mes</span>
        </div>

        <CollapsableSection title="Profil">
          <div class="form-grid">
            <label class="form-field">
              <span class="form-label">Secteur d'activit&eacute;</span>
              <input
                v-model="store.config.avatar.sector"
                type="text"
                class="form-input"
                placeholder="Ex: Commerce, Industrie, Services..."
                @input="debouncedSave"
              />
            </label>
            <label class="form-field">
              <span class="form-label">Taille de l'entreprise</span>
              <input
                v-model="store.config.avatar.companySize"
                type="text"
                class="form-input"
                placeholder="Ex: 1-10, 10-50, 50-200..."
                @input="debouncedSave"
              />
            </label>
            <label class="form-field">
              <span class="form-label">Budget SEO</span>
              <input
                v-model="store.config.avatar.budget"
                type="text"
                class="form-input"
                placeholder="Ex: 500-2000&euro;/mois"
                @input="debouncedSave"
              />
            </label>
            <label class="form-field">
              <span class="form-label">Maturit&eacute; digitale</span>
              <input
                v-model="store.config.avatar.digitalMaturity"
                type="text"
                class="form-input"
                placeholder="Ex: D&eacute;butant, Interm&eacute;diaire, Avanc&eacute;"
                @input="debouncedSave"
              />
            </label>
          </div>
        </CollapsableSection>

        <CollapsableSection title="Besoins & Douleurs">
          <div class="form-stack">
            <label class="form-field">
              <span class="form-label">Description de l'audience cible</span>
              <textarea
                v-model="store.config.positioning.targetAudience"
                class="form-textarea"
                rows="3"
                placeholder="D&eacute;crivez votre audience cible..."
                @input="debouncedSave"
              />
            </label>
            <div class="form-field">
              <span class="form-label">Points de douleur</span>
              <div class="chip-list">
                <span v-for="(pain, i) in store.config.positioning.painPoints" :key="i" class="chip">
                  {{ pain }}
                  <button class="chip-remove" @click="removeChip(store.config.positioning.painPoints, i); debouncedSave()">&times;</button>
                </span>
              </div>
              <div class="chip-input-row">
                <input
                  v-model="newPainPoint"
                  type="text"
                  class="form-input"
                  placeholder="Ajouter un point de douleur..."
                  @keydown.enter.prevent="newPainPoint = addToList(store.config.positioning.painPoints, newPainPoint); debouncedSave()"
                />
                <button class="btn-add" @click="newPainPoint = addToList(store.config.positioning.painPoints, newPainPoint); debouncedSave()">+</button>
              </div>
            </div>
          </div>
        </CollapsableSection>
      </div>

      <!-- ========== PERSPECTIVE 3: Votre communication ========== -->
      <div class="perspective-block perspective--communication">
        <div class="perspective-header">
          <span class="perspective-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </span>
          <h3 class="perspective-title">Votre communication</h3>
          <span class="perspective-subtitle">Comment vous parlez &agrave; votre audience</span>
        </div>

        <CollapsableSection title="Ton & Vocabulaire">
          <div class="form-stack">
            <label class="form-field">
              <span class="form-label">Style de communication</span>
              <input
                v-model="store.config.toneOfVoice.style"
                type="text"
                class="form-input"
                placeholder="Ex: Professionnel mais accessible, Expert et bienveillant..."
                @input="debouncedSave"
              />
            </label>
            <div class="form-field">
              <span class="form-label">Vocabulaire m&eacute;tier</span>
              <div class="chip-list">
                <span v-for="(word, i) in store.config.toneOfVoice.vocabulary" :key="i" class="chip">
                  {{ word }}
                  <button class="chip-remove" @click="removeChip(store.config.toneOfVoice.vocabulary, i); debouncedSave()">&times;</button>
                </span>
              </div>
              <div class="chip-input-row">
                <input
                  v-model="newVocab"
                  type="text"
                  class="form-input"
                  placeholder="Ajouter un terme..."
                  @keydown.enter.prevent="newVocab = addToList(store.config.toneOfVoice.vocabulary, newVocab); debouncedSave()"
                />
                <button class="btn-add" @click="newVocab = addToList(store.config.toneOfVoice.vocabulary, newVocab); debouncedSave()">+</button>
              </div>
            </div>
          </div>
        </CollapsableSection>
      </div>
      </div>
    </AsyncContent>
  </div>
</template>

<style scoped>
.theme-config {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.config-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.btn-save {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-save:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* --- Form --- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.form-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* --- Chips --- */
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-soft);
  border-radius: 9999px;
  color: var(--color-text);
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  border-radius: 50%;
}

.chip-remove:hover {
  color: var(--color-error, #dc2626);
  background: var(--color-error-soft, #fef2f2);
}

.chip-input-row {
  display: flex;
  gap: 0.5rem;
}

.chip-input-row .form-input {
  flex: 1;
}

.btn-add {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-soft, rgba(37, 99, 235, 0.1));
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
}

.btn-add:hover {
  background: var(--color-primary);
  color: white;
}

/* --- Perspectives --- */
.perspective-block {
  border-radius: 10px;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.perspective--business {
  border-left: 3px solid var(--color-primary, #4a90d9);
}

.perspective--client {
  border-left: 3px solid var(--color-warning, #e8a838);
}

.perspective--communication {
  border-left: 3px solid var(--color-success, #4caf50);
}

.perspective-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.perspective-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
}

.perspective--business .perspective-icon {
  background: color-mix(in srgb, var(--color-primary, #4a90d9) 12%, transparent);
  color: var(--color-primary, #4a90d9);
}

.perspective--client .perspective-icon {
  background: color-mix(in srgb, var(--color-warning, #e8a838) 12%, transparent);
  color: var(--color-warning, #e8a838);
}

.perspective--communication .perspective-icon {
  background: color-mix(in srgb, var(--color-success, #4caf50) 12%, transparent);
  color: var(--color-success, #4caf50);
}

.perspective-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
}

.perspective-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* --- AI Parse --- */
.ai-parse-section {
  padding: 1rem 1.25rem;
  border: 1px dashed var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary-soft, rgba(37, 99, 235, 0.04));
}

.ai-textarea {
  min-height: 5rem;
}

.ai-parse-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-ai-parse {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-ai-parse:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-ai-parse:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.parse-error {
  font-size: 0.8125rem;
  color: var(--color-error, #dc2626);
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
