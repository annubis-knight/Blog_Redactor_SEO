<script setup lang="ts">
import { computed } from 'vue'
import type { InternalLink, Cocoon } from '@shared/types/index.js'

const props = defineProps<{
  links: InternalLink[]
  cocoons: Cocoon[]
}>()

interface MatrixCell {
  sourceId: number
  targetId: number
  count: number
  anchors: string[]
}

const allArticles = computed(() => {
  const articles: { id: number; title: string; cocoonName: string; cocoonIndex: number }[] = []
  props.cocoons.forEach((cocoon, idx) => {
    cocoon.articles.forEach((article) => {
      articles.push({ id: article.id, title: article.title, cocoonName: cocoon.name, cocoonIndex: idx })
    })
  })
  return articles
})

const matrixMap = computed(() => {
  const map = new Map<string, MatrixCell>()
  for (const link of props.links) {
    const key = `${link.sourceId}→${link.targetId}`
    const existing = map.get(key)
    if (existing) {
      existing.count++
      existing.anchors.push(link.anchorText)
    } else {
      map.set(key, {
        sourceId: link.sourceId,
        targetId: link.targetId,
        count: 1,
        anchors: [link.anchorText],
      })
    }
  }
  return map
})

function getCell(sourceId: number, targetId: number): MatrixCell | undefined {
  return matrixMap.value.get(`${sourceId}→${targetId}`)
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}
</script>

<template>
  <div class="linking-matrix">
    <div v-if="allArticles.length === 0" class="matrix-empty">
      Aucun article trouvé.
    </div>

    <div v-else class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="matrix-corner">Source \ Cible</th>
            <th
              v-for="article in allArticles"
              :key="'col-' + article.id"
              class="matrix-col-header"
              :title="article.title"
            >
              <span class="col-label">{{ truncate(article.title, 12) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="source in allArticles" :key="'row-' + source.id">
            <td class="matrix-row-header" :title="source.title">
              <span class="row-cocoon">{{ source.cocoonName }}</span>
              <span class="row-title">{{ truncate(source.title, 20) }}</span>
            </td>
            <td
              v-for="target in allArticles"
              :key="source.id + '-' + target.id"
              class="matrix-cell"
              :class="{
                'self': source.id === target.id,
                'has-link': getCell(source.id, target.id),
                'same-cocoon': source.cocoonIndex === target.cocoonIndex && source.id !== target.id,
              }"
              :title="getCell(source.id, target.id)?.anchors.join(', ') || ''"
            >
              <span v-if="source.id === target.id" class="cell-self">—</span>
              <span v-else-if="getCell(source.id, target.id)" class="cell-count">
                {{ getCell(source.id, target.id)!.count }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="matrix-legend">
      <span class="legend-item"><span class="legend-swatch has-link"></span> Lien existant</span>
      <span class="legend-item"><span class="legend-swatch same-cocoon"></span> Même cocon</span>
    </div>
  </div>
</template>

<style scoped>
.linking-matrix {
  width: 100%;
}

.matrix-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
}

.matrix-scroll {
  overflow-x: auto;
  max-height: 70vh;
  overflow-y: auto;
}

.matrix-table {
  border-collapse: collapse;
  font-size: 0.6875rem;
}

.matrix-corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 2;
  background: var(--color-background);
  padding: 0.5rem;
  text-align: left;
  font-size: 0.6875rem;
  border: 1px solid var(--color-border);
}

.matrix-col-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-background);
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  max-width: 30px;
  white-space: nowrap;
}

.col-label {
  font-size: 0.625rem;
}

.matrix-row-header {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-background);
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-cocoon {
  display: block;
  font-size: 0.5625rem;
  color: var(--color-text-muted);
}

.row-title {
  font-size: 0.6875rem;
  font-weight: 500;
}

.matrix-cell {
  width: 30px;
  height: 30px;
  text-align: center;
  vertical-align: middle;
  border: 1px solid var(--color-border);
  cursor: default;
}

.matrix-cell.self {
  background: var(--color-badge-slate-bg);
}

.matrix-cell.has-link {
  background: var(--color-badge-blue-bg);
}

.matrix-cell.same-cocoon:not(.has-link):not(.self) {
  background: var(--color-badge-green-bg);
}

.cell-self {
  color: var(--color-border);
}

.cell-count {
  font-weight: 700;
  color: var(--color-badge-blue-text);
  font-size: 0.75rem;
}

.matrix-legend {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.legend-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.legend-swatch.has-link { background: var(--color-badge-blue-bg); }
.legend-swatch.same-cocoon { background: var(--color-badge-green-bg); }
</style>
