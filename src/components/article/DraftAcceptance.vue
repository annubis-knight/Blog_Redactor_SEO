<script setup lang="ts">
/**
 * DraftAcceptance — l'étape « premier jet accepté » (FR-CER-PARENT-WRITTEN-GATE).
 *
 * Un article n'est « rédigé », et ne peut donner naissance à ses articles
 * enfants dans le cocon, qu'une fois son premier jet accepté par sa porte.
 * Après la génération, l'étape est demandée d'office ; ce bandeau permet de la
 * redemander plus tard — après une correction, ou pour déroger en expliquant
 * pourquoi. La vue parente fournit l'action (`accept`).
 */
import { computed, onMounted, watch } from 'vue'
import { useArticleProgressStore } from '@/stores/article/article-progress.store'
import { REDACTION_DRAFT_ACCEPTED } from '@shared/constants/workflow-checks.constants.js'

const props = defineProps<{
  articleId: number | null
  hasContent: boolean
  busy?: boolean
}>()

defineEmits<{ (e: 'accept'): void }>()

const progressStore = useArticleProgressStore()

const accepted = computed(() =>
  props.articleId !== null && (progressStore.getProgress(props.articleId)?.completedChecks.includes(REDACTION_DRAFT_ACCEPTED) ?? false),
)

function load(): void {
  if (props.articleId !== null) void progressStore.fetchProgress(props.articleId)
}

onMounted(load)
watch(() => props.articleId, load)
</script>

<template>
  <div v-if="articleId !== null && hasContent" class="draft-acceptance" data-testid="draft-acceptance" :data-accepted="accepted">
    <p v-if="accepted" class="status status--ok" data-testid="draft-accepted">
      ✓ Premier jet accepté : l’article peut donner naissance à ses articles enfants dans le cocon.
    </p>
    <template v-else>
      <p class="status">
        Premier jet pas encore accepté : les articles enfants de celui-ci ne peuvent pas être créés.
      </p>
      <button type="button" class="accept-btn" data-testid="draft-accept" :disabled="busy" @click="$emit('accept')">
        Valider le premier jet
      </button>
    </template>
  </div>
</template>

<style scoped>
.draft-acceptance {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.8125rem;
}

.status {
  margin: 0;
  color: var(--color-text-muted, var(--color-text));
}

.status--ok {
  color: var(--color-success, #15803d);
}

.accept-btn {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.8125rem;
  cursor: pointer;
}

.accept-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
