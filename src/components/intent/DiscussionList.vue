<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TopDiscussion } from '@shared/types/intent.types.js'

const props = defineProps<{
  discussions: TopDiscussion[]
  maxVisible?: number
}>()

const max = props.maxVisible ?? 3
const showAll = ref(false)

const visibleDiscussions = computed(() => {
  if (showAll.value) return props.discussions
  return props.discussions.slice(0, max)
})

const hiddenCount = computed(() => Math.max(0, props.discussions.length - max))

function relativeDate(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  if (isNaN(then)) return ''
  const diffMs = now - then
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (days < 1) return "aujourd'hui"
  if (days < 30) return `il y a ${days} jour${days > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months} mois`
  const years = Math.floor(months / 12)
  return `il y a ${years} an${years > 1 ? 's' : ''}`
}
</script>

<template>
  <div class="discussion-list">
    <div
      v-for="disc in visibleDiscussions"
      :key="disc.url"
      class="discussion-card"
    >
      <div class="disc-title">{{ disc.title }}</div>
      <div class="disc-meta">
        <span class="disc-domain">{{ disc.domain }}</span>
        <span class="disc-date">{{ relativeDate(disc.timestamp) }}</span>
        <span class="disc-votes">{{ disc.votesCount }} votes</span>
      </div>
    </div>

    <button
      v-if="!showAll && hiddenCount > 0"
      class="disc-show-more"
      @click="showAll = true"
    >
      Voir {{ hiddenCount }} autre{{ hiddenCount > 1 ? 's' : '' }}
    </button>
  </div>
</template>

<style scoped>
.discussion-list {
  display: flex;
  flex-direction: column;
}

.discussion-card {
  padding: 0.375rem 0;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.discussion-card:last-child {
  border-bottom: none;
}

.disc-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text, #1e293b);
}

.disc-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
  margin-top: 0.125rem;
}

.disc-domain {
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.disc-votes {
  font-variant-numeric: tabular-nums;
}

.disc-show-more {
  padding: 0.25rem 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary, #3b82f6);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.disc-show-more:hover {
  text-decoration: underline;
}
</style>
