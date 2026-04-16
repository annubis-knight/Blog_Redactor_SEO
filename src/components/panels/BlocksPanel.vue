<script setup lang="ts">
/**
 * BlocksPanel — palette de blocs drag & drop pour l'éditeur.
 *
 * Deux types de blocs :
 *  - Statiques : HTML inséré tel quel (paragraphe, titres, listes…). MIME `text/html`.
 *  - Dynamiques : HTML généré par l'IA au drop (sources chiffrées, exemples, résumé).
 *    MIME custom `application/x-dynamic-block` avec l'actionType du backend.
 *    Le handler de drop (dynamic-block-drop.ts) détecte ce MIME, extrait le contexte,
 *    appelle `/api/generate/action` et remplace un placeholder par le résultat streamé.
 */
import { DYNAMIC_BLOCK_MIME } from '@/components/editor/tiptap/extensions/dynamic-block-drop'
import { log } from '@/utils/logger'

interface StaticBlockItem {
  kind: 'static'
  id: string
  label: string
  description: string
  html: string
  icon: string
}

interface DynamicBlockItem {
  kind: 'dynamic'
  id: string
  label: string
  description: string
  actionType: 'sources-chiffrees' | 'exemples-reels' | 'ce-quil-faut-retenir'
  contextMode: 'paragraph-title' | 'h2-section'
  icon: string
}

type BlockItem = StaticBlockItem | DynamicBlockItem

const staticBlocks: StaticBlockItem[] = [
  {
    kind: 'static',
    id: 'paragraph',
    label: 'Paragraphe',
    description: 'Texte courant',
    html: '<p>Votre texte&hellip;</p>',
    icon: 'M4 6h16M4 12h16M4 18h10',
  },
  {
    kind: 'static',
    id: 'heading-2',
    label: 'Titre H2',
    description: 'Titre de section',
    html: '<h2>Titre de section</h2>',
    icon: 'M4 6v12M4 12h10M14 6v12M20 8l2-2v12',
  },
  {
    kind: 'static',
    id: 'heading-3',
    label: 'Titre H3',
    description: 'Sous-titre',
    html: '<h3>Sous-titre</h3>',
    icon: 'M4 6v12M4 12h10M14 6v12M18 9a2 2 0 114 0c0 1-1 2-2 2s2 1 2 2a2 2 0 11-4 0',
  },
  {
    kind: 'static',
    id: 'bullet-list',
    label: 'Liste à puces',
    description: 'Liste non ordonnée',
    html: '<ul><li>Premier élément</li><li>Deuxième élément</li></ul>',
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  },
  {
    kind: 'static',
    id: 'ordered-list',
    label: 'Liste numérotée',
    description: 'Liste ordonnée',
    html: '<ol><li>Premier élément</li><li>Deuxième élément</li></ol>',
    icon: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  },
  {
    kind: 'static',
    id: 'blockquote',
    label: 'Citation',
    description: 'Bloc de citation',
    html: '<blockquote><p>Votre citation&hellip;</p></blockquote>',
    icon: 'M7 8h3v6H7zM14 8h3v6h-3zM4 8v6M11 8v6',
  },
]

const dynamicBlocks: DynamicBlockItem[] = [
  {
    kind: 'dynamic',
    id: 'sources-chiffrees',
    label: 'Sources chiffrées',
    description: 'IA + web search',
    actionType: 'sources-chiffrees',
    contextMode: 'paragraph-title',
    icon: 'M3 3v18h18M7 14l4-4 4 4 5-5',
  },
  {
    kind: 'dynamic',
    id: 'exemples-reels',
    label: 'Exemples réels',
    description: 'IA + web search',
    actionType: 'exemples-reels',
    contextMode: 'paragraph-title',
    icon: 'M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 17l-5.5 2.5 1-6.2L3 8.9 9 8z',
  },
  {
    kind: 'dynamic',
    id: 'ce-quil-faut-retenir',
    label: 'Ce qu\'il faut retenir',
    description: 'Résumé de section',
    actionType: 'ce-quil-faut-retenir',
    contextMode: 'h2-section',
    icon: 'M9 12l2 2 4-4M12 2a10 10 0 100 20 10 10 0 000-20z',
  },
]

const blocks: BlockItem[] = [...staticBlocks, ...dynamicBlocks]

function onDragStart(e: DragEvent, block: BlockItem) {
  if (!e.dataTransfer) return
  if (block.kind === 'static') {
    // ProseMirror parse text/html → insère le bloc à la position du drop
    e.dataTransfer.setData('text/html', block.html)
    e.dataTransfer.setData('text/plain', block.label)
    log.debug('[BlocksPanel] dragstart static block', { id: block.id, label: block.label })
  } else {
    // Bloc dynamique — MIME custom intercepté par dynamic-block-drop.ts
    const payload = JSON.stringify({
      actionType: block.actionType,
      contextMode: block.contextMode,
      label: block.label,
    })
    e.dataTransfer.setData(DYNAMIC_BLOCK_MIME, payload)
    e.dataTransfer.setData('text/plain', block.label)
    log.info('[BlocksPanel] 🎯 dragstart DYNAMIC block', {
      id: block.id,
      label: block.label,
      actionType: block.actionType,
      contextMode: block.contextMode,
    })
  }
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="blocks-panel">
    <header class="panel-header">
      <h3>Blocs</h3>
      <p class="hint">Glissez un bloc dans l'éditeur</p>
    </header>

    <ul class="blocks-list">
      <li
        v-for="block in staticBlocks"
        :key="block.id"
        class="block-item"
        draggable="true"
        @dragstart="onDragStart($event, block)"
      >
        <svg class="block-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="block.icon" />
        </svg>
        <div class="block-text">
          <span class="block-label">{{ block.label }}</span>
          <span class="block-description">{{ block.description }}</span>
        </div>
        <svg class="block-drag-grip" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="5.5" cy="3.5" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="3.5" r="1.2" fill="currentColor" />
          <circle cx="5.5" cy="8" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="8" r="1.2" fill="currentColor" />
          <circle cx="5.5" cy="12.5" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="12.5" r="1.2" fill="currentColor" />
        </svg>
      </li>
    </ul>

    <header class="panel-header panel-header-secondary">
      <h3>Blocs dynamiques</h3>
      <p class="hint">Générés par l'IA au drop</p>
    </header>

    <ul class="blocks-list">
      <li
        v-for="block in dynamicBlocks"
        :key="block.id"
        class="block-item block-item-dynamic"
        draggable="true"
        @dragstart="onDragStart($event, block)"
      >
        <svg class="block-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="block.icon" />
        </svg>
        <div class="block-text">
          <span class="block-label">{{ block.label }}</span>
          <span class="block-description">{{ block.description }}</span>
        </div>
        <svg class="block-drag-grip" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="5.5" cy="3.5" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="3.5" r="1.2" fill="currentColor" />
          <circle cx="5.5" cy="8" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="8" r="1.2" fill="currentColor" />
          <circle cx="5.5" cy="12.5" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="12.5" r="1.2" fill="currentColor" />
        </svg>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.blocks-panel {
  padding: 1rem;
}

.panel-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-header-secondary {
  margin-top: 1.25rem;
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

.blocks-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.block-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-elevated);
  cursor: grab;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
}

.block-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary);
}

.block-item-dynamic {
  border-left: 3px solid var(--color-primary);
}

.block-item-dynamic:hover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-bg-elevated));
}

.block-item:active {
  cursor: grabbing;
}

.block-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.block-item:hover .block-icon {
  color: var(--color-primary);
}

.block-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.block-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.block-description {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.block-drag-grip {
  flex-shrink: 0;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.block-item:hover .block-drag-grip {
  opacity: 1;
}
</style>
