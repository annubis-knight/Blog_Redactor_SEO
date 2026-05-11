<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SerpAnalysisResult } from '@shared/types/index.js'
import type { ProposeLieutenantsHnNode, HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

const props = defineProps<{
  hnStructure: ProposeLieutenantsHnNode[]
  activeHnRecurrence: HnRecurrenceItem[]
  hnRecurrence: HnRecurrenceItem[]
  serpResultsByKeyword: Map<string, SerpAnalysisResult>
  activeHnTab: string
  hnSaved: boolean
  isSavingHn: boolean
  /** Nb de lieutenants cochés — précondition pour générer/régénérer. */
  selectedCardsSize: number
  /** Stream en cours pour régénération HN (différent du stream lieutenants). */
  hnRegenStreaming: boolean
  hnRegenError: string | null
}>()

const emit = defineEmits<{
  'save-hn': []
  /** Régénère la HN avec les headings verrouillés actuels. */
  'regenerate-hn': [lockedHeadings: ProposeLieutenantsHnNode[]]
  'update:activeHnTab': [value: string]
}>()

/**
 * Set des headings verrouillés par l'utilisateur — clé = `${level}::${text}`.
 * Permet de track H2 et H3 indépendamment, même si deux H3 ont le même texte
 * sous deux H2 différents (rare mais possible).
 */
const lockedKeys = ref<Set<string>>(new Set())

function headingKey(level: number, text: string): string {
  return `${level}::${text}`
}

function isHeadingLocked(level: number, text: string): boolean {
  return lockedKeys.value.has(headingKey(level, text))
}

function toggleHeadingLock(level: number, text: string): void {
  const key = headingKey(level, text)
  const next = new Set(lockedKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  lockedKeys.value = next
}

/** Reconstruit l'arbre des headings verrouillés à passer au backend. */
const lockedHeadings = computed<ProposeLieutenantsHnNode[]>(() => {
  const result: ProposeLieutenantsHnNode[] = []
  for (const node of props.hnStructure) {
    const nodeLocked = isHeadingLocked(node.level, node.text)
    const lockedChildren = (node.children ?? []).filter(c => isHeadingLocked(c.level, c.text))
    if (nodeLocked) {
      result.push({
        level: node.level,
        text: node.text,
        children: lockedChildren.length > 0 ? lockedChildren : undefined,
      })
    } else if (lockedChildren.length > 0) {
      // Parent non-locked mais enfant locked : on hisse l'enfant en top-level
      // pour que l'IA le préserve même si le H2 parent change.
      for (const child of lockedChildren) {
        result.push({ level: child.level, text: child.text })
      }
    }
  }
  return result
})

/** Précondition pour activer le bouton Générer/Régénérer. */
const canRegenerate = computed(() => props.selectedCardsSize > 0 && !props.hnRegenStreaming)

/** Quand la structure change (nouvelle génération), purge les locks périmés. */
watch(() => props.hnStructure, (newStructure) => {
  if (lockedKeys.value.size === 0) return
  const validKeys = new Set<string>()
  for (const node of newStructure) {
    validKeys.add(headingKey(node.level, node.text))
    for (const child of node.children ?? []) {
      validKeys.add(headingKey(child.level, child.text))
    }
  }
  const next = new Set<string>()
  for (const key of lockedKeys.value) {
    if (validKeys.has(key)) next.add(key)
  }
  if (next.size !== lockedKeys.value.size) {
    lockedKeys.value = next
  }
}, { deep: true })

function onRegenerate(): void {
  if (!canRegenerate.value) return
  emit('regenerate-hn', lockedHeadings.value)
}
</script>

<template>
  <div>
    <!-- HN Structure from IA -->
    <CollapsableSection
      title="Structure Hn recommandee (IA)"
      :default-open="true"
      data-testid="hn-structure-section"
    >
      <template v-if="hnStructure.length > 0">
        <div class="hn-toolbar">
          <p class="hn-toolbar-hint">
            Verrouille les titres a conserver puis regenere — l'IA construira la nouvelle structure autour de tes titres verrouilles et integrera les nouveaux lieutenants coches.
          </p>
          <button
            class="btn-regen-hn"
            :disabled="!canRegenerate"
            :title="selectedCardsSize === 0 ? 'Coche au moins un lieutenant pour pouvoir regenerer' : ''"
            data-testid="hn-regenerate-btn"
            @click="onRegenerate"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M14 8a6 6 0 1 1-2-4.47" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M14 2v3.5h-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ hnRegenStreaming ? 'Regeneration...' : 'Regenerer la structure' }}
          </button>
        </div>
        <p v-if="hnRegenError" class="hn-error" role="alert">
          {{ hnRegenError }}
        </p>
        <ul class="hn-structure-list">
          <li v-for="(node, idx) in hnStructure" :key="idx" class="hn-structure-item">
            <div class="hn-row">
              <button
                    type="button"
                class="hn-lock-btn"
                :class="{ 'is-locked': isHeadingLocked(node.level, node.text) }"
                :title="isHeadingLocked(node.level, node.text) ? 'Deverrouiller — l\'IA pourra modifier ce titre' : 'Verrouiller — l\'IA conservera ce titre tel quel'"
                :aria-pressed="isHeadingLocked(node.level, node.text)"
                @click="toggleHeadingLock(node.level, node.text)"
              >
                <svg v-if="isHeadingLocked(node.level, node.text)" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5" />
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" />
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5" />
                  <path d="M5 7V5a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" />
                </svg>
              </button>
              <span class="hn-level-tag">H{{ node.level }}</span>
              <span class="hn-text">{{ node.text }}</span>
            </div>
            <ul v-if="node.children && node.children.length > 0" class="hn-structure-children">
              <li v-for="(child, cidx) in node.children" :key="cidx" class="hn-structure-child">
                <button
                        type="button"
                  class="hn-lock-btn"
                  :class="{ 'is-locked': isHeadingLocked(child.level, child.text) }"
                  :title="isHeadingLocked(child.level, child.text) ? 'Deverrouiller' : 'Verrouiller'"
                  :aria-pressed="isHeadingLocked(child.level, child.text)"
                  @click="toggleHeadingLock(child.level, child.text)"
                >
                  <svg v-if="isHeadingLocked(child.level, child.text)" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5" />
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" />
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5" />
                    <path d="M5 7V5a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" />
                  </svg>
                </button>
                <span class="hn-level-tag">H{{ child.level }}</span>
                <span class="hn-text">{{ child.text }}</span>
              </li>
            </ul>
          </li>
        </ul>
        <div class="hn-structure-actions">
          <button class="btn-save-hn" :disabled="isSavingHn" @click="$emit('save-hn')">
            {{ isSavingHn ? 'Sauvegarde...' : 'Sauvegarder la structure' }}
          </button>
          <Transition name="fade">
            <span v-if="hnSaved" class="hn-saved-badge">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Sauvegardee
            </span>
          </Transition>
          <!-- Badge "Validée avec les lieutenants" supprimé. Statut porté par .hn-saved-badge. -->

        </div>
      </template>
      <div v-else class="hn-empty" data-testid="hn-structure-empty">
        <p class="section-empty">
          Aucune structure Hn generee pour cet article.
          {{ selectedCardsSize > 0
            ? 'Lance la generation IA pour obtenir une proposition basee sur tes lieutenants coches.'
            : 'Coche au moins un lieutenant ci-dessus, puis lance la generation IA.' }}
        </p>
        <button
          class="btn-regen-hn"
          :disabled="!canRegenerate"
          :title="selectedCardsSize === 0 ? 'Coche au moins un lieutenant pour pouvoir generer' : ''"
          data-testid="hn-generate-btn"
          @click="onRegenerate"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ hnRegenStreaming ? 'Generation...' : 'Generer la structure Hn' }}
        </button>
        <p v-if="hnRegenError" class="hn-error" role="alert">
          {{ hnRegenError }}
        </p>
      </div>
    </CollapsableSection>

    <!-- HN Concurrents -->
    <CollapsableSection title="Structure Hn concurrents" :default-open="false" data-testid="hn-concurrents-section">
      <div v-if="serpResultsByKeyword.size > 1" class="kw-tab-headers">
        <button class="kw-tab-btn" :class="{ active: activeHnTab === '__all__' }" @click="$emit('update:activeHnTab', '__all__')">
          Tous ({{ hnRecurrence.length }})
        </button>
        <button
          v-for="[kw] in serpResultsByKeyword"
          :key="kw"
          class="kw-tab-btn"
          :class="{ active: activeHnTab === kw }"
          @click="$emit('update:activeHnTab', kw)"
        >
          {{ kw }}
        </button>
      </div>
      <ul v-if="activeHnRecurrence.length > 0" class="hn-recurrence-list">
        <li v-for="item in activeHnRecurrence" :key="`${item.level}:${item.text}`" class="hn-recurrence-item">
          <span class="hn-level-tag">H{{ item.level }}</span>
          <span class="hn-text">{{ item.text }}</span>
          <span class="hn-freq">{{ item.count }}/{{ item.total }}</span>
          <span class="hn-percent">({{ item.percent }}%)</span>
          <div class="hn-bar" :style="{ width: item.percent + '%' }" />
        </li>
      </ul>
      <p v-else class="section-empty">Aucun heading extrait des concurrents.</p>
    </CollapsableSection>
  </div>
</template>

<style scoped>
.hn-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--color-border);
}

.hn-toolbar-hint {
  flex: 1;
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.hn-empty {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.btn-regen-hn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: white;
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-regen-hn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.btn-regen-hn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hn-error {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-block-error-bg, #fef2f2);
  border: 1px solid var(--color-error, #ef4444);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-error, #ef4444);
}

.hn-structure-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hn-structure-item {
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.hn-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hn-structure-children {
  list-style: none;
  padding: 0 0 0 1.5rem;
  margin: 0.25rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hn-structure-child { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; }

.hn-lock-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.hn-lock-btn:hover {
  background: var(--color-bg-secondary, #f9fafb);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.hn-lock-btn.is-locked {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.hn-lock-btn.is-locked:hover {
  background: var(--color-primary-hover, var(--color-primary));
}

.hn-structure-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.btn-save-hn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save-hn:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-save-hn:disabled { opacity: 0.6; cursor: not-allowed; }

.hn-saved-badge {
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

.kw-tab-headers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.kw-tab-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kw-tab-btn:hover { color: var(--color-primary); background: var(--color-bg-secondary, #f9fafb); }

.kw-tab-btn.active {
  color: var(--color-primary);
  font-weight: 600;
  border-color: var(--color-border);
  border-bottom-color: var(--color-primary);
  background: var(--color-bg-secondary, #f9fafb);
}

.hn-recurrence-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.hn-recurrence-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.hn-level-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.hn-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hn-freq { font-weight: 600; font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap; flex-shrink: 0; }
.hn-percent { font-size: 0.6875rem; color: var(--color-text-muted); white-space: nowrap; flex-shrink: 0; }
.hn-bar { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--color-primary); transition: width 0.2s ease; }

.section-empty { margin: 0; padding: 0.5rem 0; font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; }
</style>
