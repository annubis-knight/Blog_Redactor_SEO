<script setup lang="ts">
/**
 * Constructeur du cocon (C7, FR-CER-COCOON-PROGRESSIVE) : l'arbre réel des
 * articles, et ce qu'on peut y faire naître. Le pilier d'un cocon vide, puis un
 * article par section (H2) d'un parent rédigé, son mot-clé choisi parmi des
 * candidats mesurés. C'est lui — pas la carte indicative — qui crée les articles.
 */
import { ref, watch } from 'vue'
import CocoonCandidatesPanel from '@/components/production/brain/CocoonCandidatesPanel.vue'
import { useCocoonBuilder, childLevelOf } from '@/composables/strategy/useCocoonBuilder'
import { articleLevelToDisplayLabel } from '@shared/utils/article-level.js'
import type { ChildCandidate, CocoonTreeNode, CocoonTreeSection } from '@shared/types/cocoon-tree.types.js'

const props = defineProps<{
  cocoonId: number
  cocoonName: string
  cocoonSlug: string
}>()

const {
  tree,
  isLoadingTree,
  treeError,
  loadTree,
  nodeById,
  hasPillar,
  blocks,
  orphans,
  target,
  candidates,
  isProposing,
  proposeError,
  isCreating,
  createError,
  isTarget,
  proposeCandidates,
  closeCandidates,
  createFromCandidate,
  isAttaching,
  attachError,
  attachTargets,
  attachOrphan,
} = useCocoonBuilder({
  cocoonId: () => props.cocoonId,
  cocoonName: () => props.cocoonName,
  cocoonSlug: () => props.cocoonSlug,
})

// Chargé dès la mise en place : le premier rendu montre « chargement », jamais
// un « Créer le pilier » furtif sur un cocon qui en a déjà un.
void loadTree()

watch(() => props.cocoonId, () => {
  closeCandidates()
  void loadTree()
})

function articleLink(articleId: number): string {
  return `/cocoon/${props.cocoonId}/article/${articleId}`
}

function levelLabel(node: CocoonTreeNode): string {
  return articleLevelToDisplayLabel(node.level)
}

function isDrafted(articleId: number | null): boolean {
  return articleId !== null && nodeById.value.get(articleId)?.drafted === true
}

function hasFreeSection(node: CocoonTreeNode): boolean {
  return childLevelOf(node.level) !== null && node.sections.some(s => s.childId === null)
}

function proposePillar(): void {
  void proposeCandidates({ parentId: null, parentSection: null, level: 'pilier' })
}

function proposeForSection(node: CocoonTreeNode, section: CocoonTreeSection): void {
  const level = childLevelOf(node.level)
  if (!level || !node.drafted) return
  void proposeCandidates({ parentId: node.id, parentSection: section.title, level })
}

function retry(): void {
  if (target.value) void proposeCandidates(target.value)
}

function create(candidate: ChildCandidate, title: string): void {
  void createFromCandidate(candidate, title)
}

// --- Rattacher un article hors de l'arbre (K8) ---
const attachingId = ref<number | null>(null)
const attachChoice = ref('')

function targetKey(t: { parentId: number; section: string }): string {
  return `${t.parentId}::${t.section}`
}

function openAttach(node: CocoonTreeNode): void {
  attachingId.value = node.id
  attachChoice.value = ''
  attachError.value = null
}

async function confirmAttach(node: CocoonTreeNode): Promise<void> {
  const choice = attachTargets(node.level).find(t => targetKey(t) === attachChoice.value)
  if (!choice) return
  if (await attachOrphan(node.id, choice.parentId, choice.section)) attachingId.value = null
}

function sectionTargetLabel(node: CocoonTreeNode, section: CocoonTreeSection): string {
  const level = childLevelOf(node.level)
  const kind = level === 'specifique' ? 'l’article spécialisé' : 'l’article intermédiaire'
  return `Créer ${kind} né de la section « ${section.title} » de « ${node.title} »`
}
</script>

<template>
  <section class="cocoon-tree" data-testid="cocoon-tree" aria-labelledby="cocoon-tree-title">
    <header class="tree-header">
      <h3 id="cocoon-tree-title" class="tree-title">Construire le cocon</h3>
      <p class="tree-desc">
        Un cocon grandit depuis son pilier, l’article principal qui présente tout le sujet.
        Chaque autre article naît d’une section (un titre H2) de son parent, une fois ce parent rédigé :
        le parent résume la section et renvoie vers l’article qui la développe.
      </p>
    </header>

    <p v-if="isLoadingTree && tree.length === 0" class="tree-status" role="status">Chargement de l’arbre du cocon…</p>

    <div v-if="treeError" class="tree-error" role="alert">
      <span>{{ treeError }}</span>
      <button type="button" class="btn-link" data-testid="cocoon-tree-retry" @click="loadTree">Réessayer</button>
    </div>

    <div v-if="!isLoadingTree && !treeError && !hasPillar" class="tree-empty">
      <p class="tree-empty-text">
        Ce cocon n’a pas encore de pilier. Commencez par lui : les autres articles naîtront de ses sections.
      </p>
      <button
        type="button"
        class="btn-primary"
        data-testid="cocoon-create-pillar"
        :disabled="isProposing || isCreating"
        title="Propose des mots-clés et mesure leurs données réelles (appel payant)"
        @click="proposePillar"
      >
        Créer le pilier
      </button>
      <CocoonCandidatesPanel
        v-if="isTarget(null, null)"
        target-label="Le pilier du cocon"
        :candidates="candidates"
        :is-proposing="isProposing"
        :propose-error="proposeError"
        :is-creating="isCreating"
        :create-error="createError"
        @create="create"
        @retry="retry"
        @close="closeCandidates"
      />
    </div>

    <ol v-if="blocks.length > 0" class="tree-list">
      <li
        v-for="block in blocks"
        :key="block.node.id"
        class="tree-node"
        :class="`tree-node--depth-${block.depth}`"
        :data-testid="`tree-node-${block.node.id}`"
      >
        <div class="node-head">
          <span class="level-badge" :class="`level-badge--${block.node.level}`">{{ levelLabel(block.node) }}</span>
          <span class="node-title">{{ block.node.title }}</span>
          <span
            class="state-badge"
            :class="block.node.drafted ? 'state-badge--drafted' : 'state-badge--todo'"
            data-testid="tree-node-state"
          >{{ block.node.drafted ? 'Rédigé' : 'À rédiger' }}</span>
          <RouterLink :to="articleLink(block.node.id)" class="node-link" data-testid="tree-node-link">
            {{ block.node.drafted ? 'Ouvrir sa rédaction' : 'Le rédiger' }}
          </RouterLink>
        </div>

        <p v-if="block.node.sections.length === 0" class="node-hint">
          Pas encore de section : elles apparaissent quand sa structure est validée ou son texte rédigé.
        </p>

        <p v-else-if="!block.node.drafted && hasFreeSection(block.node)" :id="`tree-hint-${block.node.id}`" class="node-hint node-hint--blocked" data-testid="tree-node-blocked">
          Validez d'abord le premier jet de « {{ block.node.title }} » : un article ne naît que d’un parent rédigé.
        </p>

        <ul v-if="block.node.sections.length > 0" class="section-list">
          <li
            v-for="section in block.node.sections"
            :key="`${section.title}-${section.childId ?? 'libre'}`"
            class="section-item"
          >
            <div class="section-row">
              <span class="section-title">{{ section.title || 'Section retirée du parent' }}</span>
              <span v-if="section.childId !== null" class="section-child">
                <RouterLink :to="articleLink(section.childId)" class="section-child-link" data-testid="tree-section-child">
                  {{ section.childTitle }}
                </RouterLink>
                <span class="section-child-state">{{ isDrafted(section.childId) ? 'Rédigé' : 'À rédiger' }}</span>
              </span>
              <button
                v-else
                type="button"
                class="btn-secondary"
                data-testid="tree-section-create"
                :data-section="section.title"
                :disabled="!block.node.drafted || isProposing || isCreating"
                :aria-describedby="block.node.drafted ? undefined : `tree-hint-${block.node.id}`"
                :title="block.node.drafted ? 'Propose des mots-clés et mesure leurs données réelles (appel payant)' : `Validez d'abord le premier jet de « ${block.node.title} »`"
                @click="proposeForSection(block.node, section)"
              >
                Créer l'article de cette section
              </button>
            </div>
            <CocoonCandidatesPanel
              v-if="isTarget(block.node.id, section.title)"
              :target-label="sectionTargetLabel(block.node, section)"
              :candidates="candidates"
              :is-proposing="isProposing"
              :propose-error="proposeError"
              :is-creating="isCreating"
              :create-error="createError"
              @create="create"
              @retry="retry"
              @close="closeCandidates"
            />
          </li>
        </ul>
      </li>
    </ol>

    <section v-if="orphans.length > 0" class="tree-orphans" data-testid="tree-orphans" aria-labelledby="tree-orphans-title">
      <h4 id="tree-orphans-title" class="orphans-title">Articles hors de l’arbre</h4>
      <p class="orphans-desc">
        Créés avant la construction progressive, ils n’ont pas de parent dans ce cocon.
        Rattachez chacun à la section d’un parent rédigé qui annonce son sujet : il rejoint l’arbre,
        et le parent pourra le résumer et renvoyer vers lui.
      </p>
      <ul class="orphans-list">
        <li v-for="node in orphans" :key="node.id" class="orphan-item" :data-testid="`tree-orphan-${node.id}`">
          <div class="orphan-row">
            <span class="level-badge" :class="`level-badge--${node.level}`">{{ levelLabel(node) }}</span>
            <RouterLink :to="articleLink(node.id)" class="section-child-link">{{ node.title }}</RouterLink>
            <span class="section-child-state">{{ node.drafted ? 'Rédigé' : 'À rédiger' }}</span>
            <button
              v-if="node.level !== 'pilier' && attachingId !== node.id"
              type="button"
              class="btn-link"
              data-testid="tree-orphan-attach"
              :disabled="attachTargets(node.level).length === 0 || isAttaching"
              :title="attachTargets(node.level).length === 0 ? 'Aucune section libre d’un parent rédigé du bon niveau' : undefined"
              @click="openAttach(node)"
            >
              Rattacher
            </button>
          </div>
          <div v-if="attachingId === node.id" class="attach-form" data-testid="tree-orphan-attach-form">
            <label :for="`attach-${node.id}`" class="attach-label">Section qui annonce son sujet</label>
            <select :id="`attach-${node.id}`" v-model="attachChoice" class="attach-select" data-testid="tree-orphan-attach-select">
              <option value="" disabled>Choisir une section…</option>
              <option v-for="t in attachTargets(node.level)" :key="targetKey(t)" :value="targetKey(t)">
                « {{ t.section }} » — {{ t.parentTitle }}
              </option>
            </select>
            <div class="attach-actions">
              <button
                type="button"
                class="btn-primary"
                data-testid="tree-orphan-attach-confirm"
                :disabled="!attachChoice || isAttaching"
                @click="confirmAttach(node)"
              >
                {{ isAttaching ? 'Rattachement…' : 'Rattacher ici' }}
              </button>
              <button type="button" class="btn-link" @click="attachingId = null">Annuler</button>
            </div>
            <p v-if="attachError" class="tree-error" role="alert" data-testid="tree-orphan-attach-error">{{ attachError }}</p>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.cocoon-tree {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.tree-title {
  margin: 0 0 0.375rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.tree-desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.tree-status {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.tree-error {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  background: var(--color-error-bg);
  color: var(--color-error);
}

.tree-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.625rem;
}

.tree-empty > .candidates-panel {
  align-self: stretch;
}

.tree-empty-text {
  margin: 0;
  font-size: 0.875rem;
}

.tree-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tree-node {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-elevated);
}

.tree-node--depth-1 {
  margin-left: 1.5rem;
  border-left: 3px solid var(--color-badge-blue-bg);
}

.node-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.node-title {
  flex: 1 1 12rem;
  min-width: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.level-badge,
.state-badge {
  flex-shrink: 0;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.level-badge--pilier {
  background: var(--color-badge-purple-bg);
  color: var(--color-badge-purple-text);
}

.level-badge--intermediaire {
  background: var(--color-badge-blue-bg);
  color: var(--color-badge-blue-text);
}

.level-badge--specifique {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}

.state-badge--drafted {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.state-badge--todo {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.node-link,
.section-child-link {
  font-size: 0.8125rem;
  color: var(--color-primary);
}

.node-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.node-hint--blocked {
  color: var(--color-badge-amber-text);
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.section-item {
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  background: var(--color-surface);
}

.section-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.section-title {
  flex: 1 1 12rem;
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.section-child {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.375rem;
}

.section-child-state {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.tree-orphans {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border);
}

.orphans-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.orphans-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.orphans-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.orphan-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.orphan-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.attach-form {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
}
.attach-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}
.attach-select {
  max-width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--color-background);
  color: var(--color-text);
}
.attach-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.4375rem 1rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary {
  border: none;
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-secondary {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-badge-blue-bg);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-link {
  padding: 0;
  border: none;
  background: none;
  font-size: 0.8125rem;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 640px) {
  .cocoon-tree {
    padding: 1rem;
  }

  .tree-node--depth-1 {
    margin-left: 0.75rem;
  }

  .btn-secondary {
    width: 100%;
    white-space: normal;
  }
}
</style>
