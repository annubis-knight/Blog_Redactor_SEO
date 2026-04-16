<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import KeywordLevelBadge from './KeywordLevelBadge.vue'

const props = defineProps<{
  articleId: number
  articleTitle: string
  cocoonName: string
  cocoonKeywords?: string[]  // available keywords from the cocoon for suggestions
}>()

const store = useArticleKeywordsStore()

const newLieutenant = ref('')
const newLexiqueTerm = ref('')

// Collapsable sub-sections
const showCapitaine = ref(true)
const showLieutenants = ref(true)
const showLexique = ref(true)

// HN level mapping for lieutenants
const hnLevelMap = computed(() => {
  const map = new Map<string, number>()
  const hn = store.keywords?.hnStructure
  if (!hn) return map
  for (const node of hn) {
    map.set(node.text.toLowerCase(), node.level)
    if (node.children) {
      for (const child of node.children) {
        map.set(child.text.toLowerCase(), child.level)
      }
    }
  }
  return map
})

function getHnLevel(lieutenant: string): number | null {
  return hnLevelMap.value.get(lieutenant.toLowerCase()) ?? null
}

function handleAddLieutenant() {
  if (newLieutenant.value.trim()) {
    store.addLieutenant(newLieutenant.value.trim())
    newLieutenant.value = ''
  }
}

function handleAddLexique() {
  if (newLexiqueTerm.value.trim()) {
    store.addLexiqueTerm(newLexiqueTerm.value.trim())
    newLexiqueTerm.value = ''
  }
}

async function handleSave() {
  await store.saveKeywords(props.articleId)
}

async function handleSuggestLexique() {
  await store.suggestLexique(props.articleId, props.articleTitle, props.cocoonName)
}

onMounted(() => {
  // Keywords already fetched by ArticleWorkflowView — just ensure init
  if (!store.keywords && !store.isLoading) {
    store.initEmpty(props.articleId)
  }
})
</script>

<template>
  <div class="article-keywords-panel">
    <div v-if="store.isLoading" class="loading">Chargement...</div>

    <template v-else-if="store.keywords">
      <!-- Capitaine -->
      <div class="kw-section">
        <button class="kw-section-header" @click="showCapitaine = !showCapitaine">
          <svg class="kw-chevron" :class="{ open: showCapitaine }" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="section-label">Capitaine</span>
        </button>
        <div v-show="showCapitaine" class="kw-section-body">
          <p class="section-hint">Le mot-cle principal cible dans le Title, H1 et URL</p>
          <div class="capitaine-input">
            <input
              :value="store.keywords.capitaine"
              class="input-capitaine"
              placeholder="Mot-cle principal..."
              @input="store.setCapitaine(($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <!-- Lieutenants -->
      <div class="kw-section">
        <button class="kw-section-header" @click="showLieutenants = !showLieutenants">
          <svg class="kw-chevron" :class="{ open: showLieutenants }" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="section-label">Lieutenants <span class="count">({{ store.keywords.lieutenants.length }})</span></span>
        </button>
        <div v-show="showLieutenants" class="kw-section-body">
          <p class="section-hint">2-5 variantes secondaires pour les H2/H3</p>
          <div class="kw-tags">
            <span v-for="lt in store.keywords.lieutenants" :key="lt" class="lieutenant-with-hn">
              <KeywordLevelBadge
                level="lieutenant"
                :label="lt"
                removable
                @remove="store.removeLieutenant(lt)"
              />
              <span v-if="getHnLevel(lt)" class="hn-badge">H{{ getHnLevel(lt) }}</span>
            </span>
          </div>
          <div class="add-input">
            <input
              v-model="newLieutenant"
              class="input-sm"
              placeholder="Ajouter un lieutenant..."
              @keyup.enter="handleAddLieutenant"
            />
            <button class="btn-add" :disabled="!newLieutenant.trim()" @click="handleAddLieutenant">+</button>
          </div>
        </div>
      </div>

      <!-- Lexique -->
      <div class="kw-section">
        <button class="kw-section-header" @click="showLexique = !showLexique">
          <svg class="kw-chevron" :class="{ open: showLexique }" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="section-label">Lexique semantique <span class="count">({{ store.keywords.lexique.length }})</span></span>
        </button>
        <div v-show="showLexique" class="kw-section-body">
          <p class="section-hint">10-15 termes LSI a inclure naturellement dans le corps de texte</p>
          <div class="kw-tags">
            <KeywordLevelBadge
              v-for="term in store.keywords.lexique"
              :key="term"
              level="lexique"
              :label="term"
              removable
              @remove="store.removeLexiqueTerm(term)"
            />
          </div>
          <div class="add-input">
            <input
              v-model="newLexiqueTerm"
              class="input-sm"
              placeholder="Ajouter un terme..."
              @keyup.enter="handleAddLexique"
            />
            <button class="btn-add" :disabled="!newLexiqueTerm.trim()" @click="handleAddLexique">+</button>
          </div>
          <button
            class="btn-suggest-lexique"
            :disabled="store.isSuggestingLexique || !store.keywords.capitaine"
            @click="handleSuggestLexique"
          >
            {{ store.isSuggestingLexique ? 'Generation...' : 'Suggerer le Lexique via Claude' }}
          </button>
        </div>
      </div>

      <!-- Save -->
      <div class="panel-actions">
        <span v-if="store.error" class="error-msg">{{ store.error }}</span>
        <button
          class="btn-save"
          :disabled="store.isSaving || !store.keywords.capitaine"
          @click="handleSave"
        >
          {{ store.isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.article-keywords-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-muted);
}

.kw-section {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.kw-section-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: var(--color-bg-soft);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.kw-section-header:hover {
  background: var(--color-bg-hover);
}

.kw-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: var(--color-text-muted);
}

.kw-chevron.open {
  transform: rotate(90deg);
}

.kw-section-body {
  padding: 0.5rem 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.section-label {
  font-size: 0.8125rem;
  font-weight: 700;
}

.section-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.count {
  font-weight: 400;
  color: var(--color-text-muted);
}

.capitaine-input {
  display: flex;
}

.input-capitaine {
  flex: 1;
  padding: 0.5rem 0.625rem;
  border: 2px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: inherit;
  background: var(--color-background);
  color: var(--color-text);
}

.input-capitaine:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.kw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.lieutenant-with-hn {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
}

.hn-badge {
  display: inline-block;
  padding: 0.0625rem 0.25rem;
  border-radius: 3px;
  font-size: 0.5625rem;
  font-weight: 700;
  background: var(--color-primary);
  color: white;
  line-height: 1.2;
}

.add-input {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.input-sm {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.8125rem;
  font-family: inherit;
  background: var(--color-background);
  color: var(--color-text);
}

.input-sm:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-add {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}

.btn-add:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-suggest-lexique {
  align-self: flex-start;
  margin-top: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}

.btn-suggest-lexique:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-suggest-lexique:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.error-msg {
  font-size: 0.75rem;
  color: var(--color-error, #ef4444);
}

.btn-save {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.btn-save:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
