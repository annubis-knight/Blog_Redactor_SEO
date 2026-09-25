<script setup lang="ts">
/**
 * EnrichmentPanel — second temps de la rédaction (FR-RED-ENRICH-PASSES,
 * FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE, FR-RED-LANG-REVIEW).
 *
 * Le premier jet est écrit d'un seul tenant ; ce panneau l'enrichit passe par
 * passe. Chaque passe propose une nouvelle version chapitre par chapitre, déjà
 * vérifiée par le serveur ; rien ne change dans l'article sans « Accepter ».
 * La relecture de la langue réutilise l'humanisation, section par section.
 */
import { computed, ref } from 'vue'
import { useEnrichmentStore, type ProposalStatus } from '@/stores/article/enrichment.store'
import { useEditorStore } from '@/stores/article/editor.store'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import { listChapters } from '@shared/chapters.js'
import type { EnrichmentPass } from '@shared/verifiers/enrichment.js'
import type { GateLevel } from '@shared/verifiers/gate.js'

const props = defineProps<{ articleId: number | null }>()

const store = useEnrichmentStore()
const editorStore = useEditorStore()
const keywordsStore = useArticleKeywordsStore()

const PASSES: Array<{ id: EnrichmentPass; label: string; hint: string; empty: string }> = [
  { id: 'sources', label: 'Sources', hint: 'Recherche web : remplace les « à sourcer » par des données liées', empty: 'Aucun passage à sourcer ni chiffre sans source : rien à chercher.' },
  { id: 'exemples', label: 'Exemples', hint: 'Un exemple en situation par chapitre', empty: 'Aucun chapitre à enrichir.' },
  { id: 'tableaux', label: 'Tableaux', hint: 'Quand un chapitre compare ou énumère', empty: 'Aucun chapitre à enrichir.' },
  { id: 'images', label: 'Images', hint: 'Où placer une image, et ce qu’elle montre', empty: 'Aucun chapitre à enrichir.' },
  { id: 'faq', label: 'FAQ', hint: 'Les questions qui restent après la lecture', empty: 'L’article a déjà sa foire aux questions.' },
]

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'en attente',
  loading: 'proposition en cours…',
  ready: 'à relire',
  error: 'échec',
  accepted: 'acceptée',
  refused: 'refusée',
  stale: 'chapitre modifié depuis',
}

const LEVEL_ICONS: Record<GateLevel, string> = { attention: '🟠', risque: '🔴', technique: '⛔' }

const keyword = computed(() => keywordsStore.keywords?.capitaine ?? '')
const keywords = computed(() => keywordsStore.keywords?.lieutenants ?? [])
const busy = computed(() => store.isRunning || editorStore.isHumanizing || editorStore.isReducing || editorStore.isGenerating)
const canRun = computed(() => !!props.articleId && !!keyword.value && !!editorStore.content && !busy.value)

const ranPass = ref<EnrichmentPass | null>(null)
const emptyMessage = computed(() => {
  if (!ranPass.value || store.isRunning || store.items.length > 0) return ''
  return PASSES.find(p => p.id === ranPass.value)?.empty ?? ''
})

function context() {
  return { articleId: props.articleId!, keyword: keyword.value, keywords: keywords.value }
}

async function run(pass: EnrichmentPass) {
  if (!canRun.value) return
  ranPass.value = pass
  await store.runPass(pass, context())
}

/** Comme après l'humanisation : ce qui est accepté est enregistré aussitôt (la vue « workflow » n'a pas d'enregistrement automatique). */
async function save() {
  if (props.articleId && editorStore.isDirty && !editorStore.isSaving) await editorStore.saveArticle(props.articleId)
}

async function accept(key: string) {
  store.accept(key)
  await save()
}

async function acceptAllClean() {
  store.acceptAllClean()
  await save()
}

async function reviewLanguage() {
  if (!canRun.value) return
  ranPass.value = null
  store.reset()
  await editorStore.humanizeArticle(props.articleId!, keyword.value, keywords.value)
  if (!editorStore.error) await save()
}

// --- Réécrire un chapitre ---
const chapters = computed(() => listChapters(editorStore.content ?? ''))
const rewriteIndex = ref<number | null>(null)
const instruction = ref('')
const canRewrite = computed(() => canRun.value && rewriteIndex.value !== null && instruction.value.trim().length >= 5)

async function rewrite() {
  if (!canRewrite.value) return
  ranPass.value = null
  await store.rewriteChapter(rewriteIndex.value!, instruction.value.trim(), context())
}
</script>

<template>
  <div class="enrichment-panel" data-testid="enrichment-panel">
    <header class="panel-header">
      <h3>Enrichir l’article</h3>
      <p class="hint">
        Chaque passe propose une nouvelle version, chapitre par chapitre. Rien ne change dans l’article tant que vous n’acceptez pas.
      </p>
    </header>

    <p v-if="!keyword" class="panel-warning">Le capitaine de l’article n’est pas verrouillé : les passes en ont besoin.</p>

    <div class="passes" role="group" aria-label="Passes d’enrichissement">
      <button
        v-for="pass in PASSES"
        :key="pass.id"
        type="button"
        class="pass-btn"
        :class="{ active: store.activePass === pass.id }"
        :data-testid="`enrich-pass-${pass.id}`"
        :disabled="!canRun"
        @click="run(pass.id)"
      >
        <span class="pass-label">{{ pass.label }}</span>
        <span class="pass-hint">{{ pass.hint }}</span>
      </button>
      <button type="button" class="pass-btn" data-testid="enrich-pass-langue" :disabled="!canRun" @click="reviewLanguage">
        <span class="pass-label">Relecture de la langue</span>
        <span class="pass-hint">Tics d’IA, anglicismes, accords : section par section</span>
      </button>
    </div>

    <div v-if="store.progress" class="progress" data-testid="enrich-progress" role="status">
      <span>Chapitre {{ store.progress.current }}/{{ store.progress.total }} — {{ store.progress.title }}</span>
      <button type="button" class="link-btn" @click="store.abort()">Arrêter</button>
    </div>
    <div v-else-if="editorStore.humanizeProgress" class="progress" role="status">
      <span>Relecture {{ editorStore.humanizeProgress.current + 1 }}/{{ editorStore.humanizeProgress.total }} — {{ editorStore.humanizeProgress.title }}</span>
      <button type="button" class="link-btn" @click="editorStore.abortHumanize()">Arrêter</button>
    </div>

    <p v-if="emptyMessage" class="empty" data-testid="enrich-empty">{{ emptyMessage }}</p>

    <div v-if="store.readyCount > 1" class="bulk">
      <button type="button" class="secondary-btn" data-testid="enrich-accept-clean" @click="acceptAllClean()">
        Accepter celles sans alerte
      </button>
    </div>

    <ul v-if="store.items.length" class="proposals">
      <li
        v-for="item in store.items"
        :key="item.key"
        class="proposal"
        :data-status="item.status"
        :data-testid="`proposal-${item.chapterIndex}`"
      >
        <div class="proposal-head">
          <strong class="proposal-title">{{ item.title }}</strong>
          <span class="status" :data-status="item.status">{{ STATUS_LABELS[item.status] }}</span>
        </div>

        <p v-if="item.error" class="error">{{ item.error }}</p>
        <p v-if="item.status === 'stale'" class="error">Le chapitre a changé depuis cette proposition : relancez la passe pour ne rien écraser.</p>

        <ul v-if="item.proposal?.issues.length" class="issues">
          <li v-for="issue in item.proposal.issues" :key="issue.rule" :data-level="issue.level" :data-rule="issue.rule">
            <span aria-hidden="true">{{ LEVEL_ICONS[issue.level] }}</span> {{ issue.message }}
            <span v-if="issue.risk" class="risk">{{ issue.risk }}</span>
          </li>
        </ul>

        <p v-if="item.proposal?.webSources.length" class="sources">
          Sources trouvées :
          <a
            v-for="source in item.proposal.webSources"
            :key="source.url"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
          >{{ source.title || source.url }}</a>
        </p>

        <details v-if="item.proposal && item.status === 'ready'" class="compare">
          <summary>Comparer avant / après</summary>
          <div class="compare-grid">
            <div>
              <p class="compare-label">Avant</p>
              <div class="compare-html" v-safe-html="item.proposal.before || '<p><em>(nouveau chapitre)</em></p>'" />
            </div>
            <div>
              <p class="compare-label">Proposé</p>
              <div class="compare-html" data-testid="proposal-after" v-safe-html="item.proposal.html" />
            </div>
          </div>
        </details>

        <div v-if="item.status === 'ready'" class="actions">
          <button
            type="button"
            class="primary-btn"
            data-testid="proposal-accept"
            :disabled="item.proposal?.blocked"
            :title="item.proposal?.blocked ? 'Un défaut ⛔ empêche d’accepter cette proposition.' : undefined"
            @click="accept(item.key)"
          >
            Accepter
          </button>
          <button type="button" class="secondary-btn" data-testid="proposal-refuse" @click="store.refuse(item.key)">Refuser</button>
        </div>
      </li>
    </ul>

    <section class="rewrite">
      <h4>Réécrire un chapitre</h4>
      <p class="hint">La réécriture voit l’article entier ; elle vous est proposée avant d’être appliquée.</p>
      <label class="field">
        <span>Chapitre</span>
        <select v-model="rewriteIndex" data-testid="rewrite-chapter">
          <option :value="null" disabled>Choisir…</option>
          <option v-for="chapter in chapters" :key="chapter.index" :value="chapter.index">{{ chapter.title }}</option>
        </select>
      </label>
      <label class="field">
        <span>Consigne</span>
        <textarea
          v-model="instruction"
          rows="3"
          data-testid="rewrite-instruction"
          placeholder="Ex. : plus concret, avec l’exemple d’un plombier ; deux fois plus court"
        />
      </label>
      <button type="button" class="primary-btn" data-testid="rewrite-submit" :disabled="!canRewrite" @click="rewrite">
        Proposer une réécriture
      </button>
    </section>
  </div>
</template>

<style scoped>
.enrichment-panel {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  font-size: 0.875rem;
}

.panel-header {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-header h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.panel-warning,
.error {
  margin: 0;
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: 0.8125rem;
}

.passes {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.pass-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-elevated);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.pass-btn:hover:not(:disabled),
.pass-btn.active {
  border-color: var(--color-primary);
  background: var(--color-bg-hover);
}

.pass-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pass-label {
  font-weight: 600;
  color: var(--color-text);
}

.pass-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.progress {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  background: var(--color-block-info-bg);
  color: var(--color-text);
}

.empty {
  margin: 0;
  color: var(--color-text-muted);
}

.proposals {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.proposal {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.proposal[data-status='accepted'] {
  border-left: 3px solid var(--color-success);
}

.proposal[data-status='refused'] {
  opacity: 0.6;
}

.proposal-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.proposal-title {
  color: var(--color-text);
}

.status {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

.status[data-status='ready'] {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.status[data-status='accepted'] {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.status[data-status='error'],
.status[data-status='stale'] {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.issues {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8125rem;
}

.risk {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sources {
  margin: 0;
  font-size: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
}

.sources a {
  color: var(--color-primary);
}

.compare summary {
  cursor: pointer;
  color: var(--color-primary);
  font-size: 0.8125rem;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.compare-label {
  margin: 0 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.compare-html {
  max-height: 16rem;
  overflow: auto;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--color-bg-soft);
  font-family: var(--font-editor);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.compare-html :deep(img) {
  max-width: 100%;
  height: auto;
}

.compare-html :deep(table) {
  border-collapse: collapse;
}

.compare-html :deep(th),
.compare-html :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.25rem 0.375rem;
}

.actions,
.bulk {
  display: flex;
  gap: 0.5rem;
}

.primary-btn,
.secondary-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-background);
}

.primary-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.secondary-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text);
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.link-btn {
  border: none;
  background: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.rewrite {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.rewrite h4 {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.field select,
.field textarea {
  font: inherit;
  font-size: 0.8125rem;
  color: var(--color-text);
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-elevated);
}
</style>
