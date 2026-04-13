<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBriefStore } from '@/stores/brief.store'
import { useOutlineStore } from '@/stores/outline.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'
import { useThemeConfigStore } from '@/stores/theme-config.store'
import { useCocoonsStore } from '@/stores/cocoons.store'
import { useSilosStore } from '@/stores/silos.store'
import { useStreaming } from '@/composables/useStreaming'
import { apiGet, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import ContextRecap from '@/components/strategy/ContextRecap.vue'
import RecapToggle from '@/components/shared/RecapToggle.vue'
import KeywordList from '@/components/brief/KeywordList.vue'
import ContentRecommendation from '@/components/brief/ContentRecommendation.vue'
import OutlineEditor from '@/components/outline/OutlineEditor.vue'
import OutlineDisplay from '@/components/outline/OutlineDisplay.vue'
import ArticleKeywordsPanel from '@/components/keywords/ArticleKeywordsPanel.vue'
import type { ArticleMicroContext } from '@shared/types/index.js'

const props = defineProps<{
  slug: string
  cocoonName: string
  siloName: string
  articleTitle: string
}>()

const emit = defineEmits<{
  (e: 'outline-validated'): void
  (e: 'brief-validated'): void
  (e: 'check-completed', check: string): void
}>()

const briefStore = useBriefStore()
const outlineStore = useOutlineStore()
const articleKeywordsStore = useArticleKeywordsStore()
const cocoonStrategyStore = useCocoonStrategyStore()
const themeConfigStore = useThemeConfigStore()
const cocoonsStore = useCocoonsStore()
const silosStore = useSilosStore()

// --- Cocoon slug derivation ---
const cocoonSlug = computed(() =>
  props.cocoonName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
)

// --- Micro-context ---
const angle = ref('')
const tone = ref('')
const directives = ref('')
const targetWordCount = ref<number | undefined>(undefined)
const isSavingMicroContext = ref(false)
const savedFeedback = ref(false)

const { isStreaming: isSuggesting, startStream: startSuggest } = useStreaming<{ angle: string; tone: string; directives: string }>()

// --- IA Suggest preview ---
const showSuggestPreview = ref(false)
const suggestPreviewData = ref<{ angle: string; tone: string; directives: string } | null>(null)

async function loadMicroContext() {
  try {
    const data = await apiGet<ArticleMicroContext | null>(`/articles/${props.slug}/micro-context`)
    if (data) {
      angle.value = data.angle ?? ''
      tone.value = data.tone ?? ''
      directives.value = data.directives ?? ''
      targetWordCount.value = data.targetWordCount ?? undefined
    }
  } catch (err) {
    log.warn('[BriefStructureStep] No micro-context found', { slug: props.slug })
  }
}

const pendingSave = ref(false)

async function saveMicroContext() {
  if (isSavingMicroContext.value) {
    pendingSave.value = true
    return
  }
  isSavingMicroContext.value = true
  try {
    await apiPut(`/articles/${props.slug}/micro-context`, {
      angle: angle.value,
      tone: tone.value,
      directives: directives.value,
      ...(targetWordCount.value != null ? { targetWordCount: targetWordCount.value } : {}),
    })
    savedFeedback.value = true
    setTimeout(() => { savedFeedback.value = false }, 2000)
    if (angle.value.trim() && (tone.value.trim() || directives.value.trim())) {
      emit('check-completed', 'brief-validated')
    }
  } catch (err) {
    log.error('[BriefStructureStep] saveMicroContext failed', { error: (err as Error).message })
  } finally {
    isSavingMicroContext.value = false
    if (pendingSave.value) {
      pendingSave.value = false
      saveMicroContext()
    }
  }
}

function suggestMicroContext() {
  startSuggest('/api/generate/micro-context-suggest', {
    slug: props.slug,
    articleTitle: props.articleTitle,
    articleType: briefStore.briefData?.article.type ?? 'Spécialisé',
    keyword: articleKeywordsStore.keywords?.capitaine ?? props.articleTitle,
    cocoonName: props.cocoonName,
    siloName: props.siloName,
    cocoonStrategy: cocoonStrategyStore.getPreviousAnswers(),
    themeConfig: themeConfigStore.config,
  }, {
    onDone: (data) => {
      const hasExisting = angle.value.trim() || tone.value.trim() || directives.value.trim()
      if (hasExisting) {
        suggestPreviewData.value = data
        showSuggestPreview.value = true
      } else {
        applySuggestion(data)
      }
    },
  })
}

function applySuggestion(data: { angle: string; tone: string; directives: string }) {
  if (data.angle) angle.value = data.angle
  if (data.tone) tone.value = data.tone
  if (data.directives) directives.value = data.directives
  showSuggestPreview.value = false
  suggestPreviewData.value = null
  saveMicroContext()
}

function cancelSuggestion() {
  showSuggestPreview.value = false
  suggestPreviewData.value = null
}

// --- Target word count ---
function handleTargetWordCountUpdate(value: number) {
  targetWordCount.value = value
  saveMicroContext()
}

// --- Outline loading priority ---
const outlineLoaded = ref(false)
const outlineWarning = ref<string | null>(null)

function loadOutlineFromKeywords() {
  const kw = articleKeywordsStore.keywords
  if (!kw) return

  const hn = kw.hnStructure
  if (hn && hn.length > 0) {
    outlineStore.loadFromHnStructure(hn, props.articleTitle)
    outlineLoaded.value = true
    outlineWarning.value = null
    log.info('[BriefStructureStep] Outline loaded from HN structure', { sections: outlineStore.outline?.sections.length })
  } else {
    outlineWarning.value = 'Aucune structure Hn disponible. Retournez au Moteur pour generer et valider les lieutenants avec leur structure Hn.'
    log.warn('[BriefStructureStep] No HN structure available for outline')
  }
}

// --- Cocoon context for ContextRecap ---
const cocoonArticles = computed(() => {
  const cocoon = cocoonsStore.cocoons.find(c => c.name === props.cocoonName)
  if (!cocoon) return []
  return cocoon.articles.map(a => `${a.title} (${a.type})`)
})

const siloDescription = computed(() => {
  const silo = silosStore.silos.find(s => s.nom === props.siloName)
  return silo?.description ?? ''
})

const flatThemeConfig = computed(() => {
  const cfg = themeConfigStore.config
  if (!(cfg.positioning.targetAudience || cfg.positioning.mainPromise || cfg.avatar.sector || cfg.toneOfVoice.style)) return undefined
  return {
    mainPromise: cfg.positioning.mainPromise || undefined,
    differentiators: cfg.positioning.differentiators.length ? cfg.positioning.differentiators : undefined,
    services: cfg.offerings.services.length ? cfg.offerings.services : undefined,
    mainCTA: cfg.offerings.mainCTA || undefined,
    location: cfg.avatar.location || undefined,
    targetAudience: cfg.positioning.targetAudience || undefined,
    sector: cfg.avatar.sector || undefined,
    companySize: cfg.avatar.companySize || undefined,
    budget: cfg.avatar.budget || undefined,
    digitalMaturity: cfg.avatar.digitalMaturity || undefined,
    painPoints: cfg.positioning.painPoints.length ? cfg.positioning.painPoints : undefined,
    toneStyle: cfg.toneOfVoice.style || undefined,
    vocabulary: cfg.toneOfVoice.vocabulary.length ? cfg.toneOfVoice.vocabulary : undefined,
  }
})

function handleOutlineValidated() {
  outlineStore.validateOutline(props.slug)
  emit('outline-validated')
}

onMounted(async () => {
  // Load micro-context
  loadMicroContext()

  // Load cocoon strategy if not already loaded
  if (!cocoonStrategyStore.strategy) {
    cocoonStrategyStore.fetchStrategy(cocoonSlug.value)
  }

  // Load theme config if not already loaded
  if (!themeConfigStore.config.avatar?.sector) {
    themeConfigStore.fetchConfig()
  }

  // Outline loading priority: (1) existing outline in store, (2) hnStructure, (3) fallback
  if (!outlineStore.outline) {
    // Wait for keywords to be loaded
    const checkHn = () => {
      if (articleKeywordsStore.keywords && !outlineLoaded.value && !outlineStore.outline) {
        loadOutlineFromKeywords()
      }
    }

    // If keywords are already loaded
    checkHn()

    // Watch for keywords to arrive
    watch(() => articleKeywordsStore.keywords, checkHn, { once: true })
  }
})
</script>

<template>
  <div class="brief-structure-step">
    <!-- Section 1: Contexte strategique + Micro-contexte -->
    <CollapsableSection title="Contexte strategique" :default-open="true">
      <ContextRecap
        :theme-name="silosStore.theme?.nom ?? themeConfigStore.config?.avatar?.sector ?? ''"
        :theme-description="silosStore.theme?.description"
        :silo-name="siloName"
        :silo-description="siloDescription"
        :cocoon-name="cocoonName"
        :cocoon-articles="cocoonArticles"
        :article-title="articleTitle"
        :cocoon-strategy="cocoonStrategyStore.getPreviousAnswers()"
        :theme-config="flatThemeConfig"
      />

      <RecapToggle panel-id="micro-context" label="Micro-contexte article" variant="panel">
        <div class="micro-context-form">
          <div class="form-group">
            <label class="form-label required">Angle differenciant</label>
            <textarea
              v-model="angle"
              class="form-textarea"
              rows="2"
              placeholder="Ce qui differencie cet article des concurrents et du reste du cocon..."
              @blur="saveMicroContext"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Ton / Style <span class="optional-tag">(optionnel)</span></label>
            <input
              v-model="tone"
              type="text"
              class="form-input"
              placeholder="Ex: pedagogique, expert, conversationnel..."
              @blur="saveMicroContext"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Consignes specifiques <span class="optional-tag">(optionnel)</span></label>
            <textarea
              v-model="directives"
              class="form-textarea"
              rows="3"
              placeholder="Points d'attention, CTA, maillage interne, exemples a inclure..."
              @blur="saveMicroContext"
            />
          </div>

          <!-- Save feedback -->
          <Transition name="fade">
            <span v-if="savedFeedback" class="save-feedback">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Sauvegarde
            </span>
          </Transition>

          <!-- IA Suggest preview -->
          <div v-if="showSuggestPreview && suggestPreviewData" class="suggest-preview">
            <p class="suggest-preview-title">Suggestion IA</p>
            <div v-if="suggestPreviewData.angle" class="suggest-preview-item">
              <span class="suggest-preview-label">Angle</span>
              <span class="suggest-preview-current" v-if="angle.trim()">{{ angle }}</span>
              <span class="suggest-preview-arrow" v-if="angle.trim()">&rarr;</span>
              <span class="suggest-preview-new">{{ suggestPreviewData.angle }}</span>
            </div>
            <div v-if="suggestPreviewData.tone" class="suggest-preview-item">
              <span class="suggest-preview-label">Ton</span>
              <span class="suggest-preview-current" v-if="tone.trim()">{{ tone }}</span>
              <span class="suggest-preview-arrow" v-if="tone.trim()">&rarr;</span>
              <span class="suggest-preview-new">{{ suggestPreviewData.tone }}</span>
            </div>
            <div v-if="suggestPreviewData.directives" class="suggest-preview-item">
              <span class="suggest-preview-label">Consignes</span>
              <span class="suggest-preview-current" v-if="directives.trim()">{{ directives }}</span>
              <span class="suggest-preview-arrow" v-if="directives.trim()">&rarr;</span>
              <span class="suggest-preview-new">{{ suggestPreviewData.directives }}</span>
            </div>
            <div class="suggest-preview-actions">
              <button class="btn btn-validate" @click="applySuggestion(suggestPreviewData!)">Appliquer</button>
              <button class="btn btn-secondary" @click="cancelSuggestion">Annuler</button>
            </div>
          </div>

          <button
            v-if="!showSuggestPreview"
            class="btn btn-suggest"
            :disabled="isSuggesting"
            @click="suggestMicroContext"
          >
            {{ isSuggesting ? 'Suggestion en cours...' : 'Suggerer par IA' }}
          </button>
        </div>
      </RecapToggle>
    </CollapsableSection>

    <!-- Section 2: Mots-cles -->
    <CollapsableSection title="Mots-cles" :default-open="false">
      <KeywordList v-if="briefStore.briefData" :keywords="briefStore.briefData.keywords" />
      <ArticleKeywordsPanel
        :slug="slug"
        :article-title="articleTitle"
        :cocoon-name="cocoonName"
      />
    </CollapsableSection>

    <!-- Section 3: Recommandation de contenu -->
    <CollapsableSection title="Recommandation de contenu" :default-open="true">
      <ContentRecommendation
        v-if="briefStore.briefData"
        :recommendation="briefStore.briefData.contentLengthRecommendation"
        :article-type="briefStore.briefData.article.type"
        :custom-target="targetWordCount"
        @update:custom-target="handleTargetWordCountUpdate"
      />
    </CollapsableSection>

    <!-- Section 4: Structure HN / Sommaire -->
    <CollapsableSection title="Structure / Sommaire" :default-open="true">
      <template v-if="outlineStore.outline">
        <div v-if="!outlineStore.isValidated" class="outline-undo-redo">
          <button
            class="btn-icon"
            title="Annuler (Undo)"
            aria-label="Annuler"
            :disabled="!outlineStore.canUndo"
            @click="outlineStore.undo()"
          >
            &#x27F2;
          </button>
          <button
            class="btn-icon"
            title="Refaire (Redo)"
            aria-label="Refaire"
            :disabled="!outlineStore.canRedo"
            @click="outlineStore.redo()"
          >
            &#x27F3;
          </button>
        </div>

        <OutlineEditor
          v-if="!outlineStore.isValidated"
          :outline="outlineStore.outline"
          @update:outline="outlineStore.setOutline($event)"
        />
        <OutlineDisplay
          v-else
          :outline="outlineStore.outline"
          :streamed-text="''"
          :is-generating="false"
        />

        <div class="outline-actions">
          <p v-if="outlineStore.error" class="outline-error">
            {{ outlineStore.error }}
          </p>
          <p v-if="outlineStore.isValidated" class="validation-msg">
            Sommaire valide et sauvegarde.
          </p>
          <button
            v-if="outlineStore.isValidated"
            class="btn btn-secondary"
            @click="outlineStore.unvalidateOutline()"
          >
            Modifier le sommaire
          </button>
          <button
            v-if="!outlineStore.isValidated"
            class="btn btn-validate"
            :disabled="outlineStore.isSaving"
            @click="handleOutlineValidated"
          >
            {{ outlineStore.isSaving ? 'Sauvegarde en cours...' : 'Valider le sommaire' }}
          </button>
        </div>
      </template>

      <template v-else>
        <div v-if="outlineWarning" class="outline-warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1L1 14h14L8 1z" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <p>{{ outlineWarning }}</p>
        </div>
        <p v-else class="outline-empty-msg">
          Chargement de la structure...
        </p>
      </template>
    </CollapsableSection>

    <!-- Navigation -->
    <div v-if="outlineStore.isValidated" class="step-navigation">
      <button class="btn btn-primary" @click="emit('outline-validated')">
        Continuer vers l'Article
      </button>
    </div>
  </div>
</template>

<style scoped>
.brief-structure-step {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.micro-context-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.form-label.required::after {
  content: ' *';
  color: var(--color-danger, #e53e3e);
}

.optional-tag {
  font-weight: 400;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.form-textarea,
.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  resize: vertical;
}

.form-textarea:focus,
.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 66, 133, 244), 0.15);
}

/* Save feedback */
.save-feedback {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-success, #16a34a);
}

.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Suggest preview */
.suggest-preview {
  padding: 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary-soft, rgba(37, 99, 235, 0.05));
}

.suggest-preview-title {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-primary);
}

.suggest-preview-item {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

.suggest-preview-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  min-width: 4rem;
  flex-shrink: 0;
}

.suggest-preview-current {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-decoration: line-through;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggest-preview-arrow {
  font-size: 0.75rem;
  color: var(--color-primary);
  flex-shrink: 0;
}

.suggest-preview-new {
  font-size: 0.75rem;
  color: var(--color-text);
  font-weight: 500;
}

.suggest-preview-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-suggest {
  align-self: flex-start;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-suggest:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.btn-suggest:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.outline-undo-redo {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.outline-error {
  color: var(--color-error, #dc2626);
  font-size: 0.8125rem;
  font-weight: 500;
  margin: 0;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-soft);
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-icon:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.outline-actions {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.validation-msg {
  color: var(--color-success);
  font-weight: 500;
  font-size: 0.875rem;
  margin: 0;
}

.btn-validate {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--color-primary);
  color: white;
  transition: background 0.15s;
}

.btn-validate:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-validate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-bg-soft);
  color: var(--color-text);
  transition: background 0.15s;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.outline-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--color-warning, #f59e0b);
  background: rgba(245, 158, 11, 0.08);
  color: var(--color-warning, #f59e0b);
}

.outline-warning svg {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.outline-warning p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.outline-empty-msg {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0;
}

.step-navigation {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.step-navigation .btn-primary {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--color-primary);
  color: white;
  transition: background 0.15s;
}

.step-navigation .btn-primary:hover {
  background: var(--color-primary-hover);
}
</style>
