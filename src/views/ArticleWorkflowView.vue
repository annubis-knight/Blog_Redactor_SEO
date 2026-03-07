<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBriefStore } from '@/stores/brief.store'
import { useOutlineStore } from '@/stores/outline.store'
import { useEditorStore } from '@/stores/editor.store'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import SeoBrief from '@/components/brief/SeoBrief.vue'
import KeywordList from '@/components/brief/KeywordList.vue'
import DataForSeoPanel from '@/components/brief/DataForSeoPanel.vue'
import ContentRecommendation from '@/components/brief/ContentRecommendation.vue'
import OutlineActions from '@/components/outline/OutlineActions.vue'
import OutlineDisplay from '@/components/outline/OutlineDisplay.vue'
import OutlineEditor from '@/components/outline/OutlineEditor.vue'
import ArticleActions from '@/components/article/ArticleActions.vue'
import ArticleStreamDisplay from '@/components/article/ArticleStreamDisplay.vue'
import ArticleMetaDisplay from '@/components/article/ArticleMetaDisplay.vue'

const route = useRoute()
const briefStore = useBriefStore()
const outlineStore = useOutlineStore()
const editorStore = useEditorStore()

const slug = route.params.slug as string

async function handleGenerateArticle() {
  await editorStore.generateArticle(briefStore.briefData!, outlineStore.outline!)
  if (editorStore.content && !editorStore.error) {
    const pilierKeyword = briefStore.briefData!.keywords.find(kw => kw.type === 'Pilier')
    const keyword = pilierKeyword?.keyword ?? briefStore.briefData!.article.title
    await editorStore.generateMeta(slug, keyword, briefStore.briefData!.article.title, editorStore.content)
    if (!editorStore.error) {
      await editorStore.saveArticle(slug)
    }
  }
}

onMounted(() => {
  briefStore.fetchBrief(slug)
})
</script>

<template>
  <div class="article-workflow-view">
    <RouterLink to="/" class="back-link">← Retour au dashboard</RouterLink>

    <LoadingSpinner v-if="briefStore.isLoading" />

    <ErrorMessage
      v-else-if="briefStore.error"
      :message="briefStore.error"
      @retry="briefStore.fetchBrief(slug)"
    />

    <template v-else-if="briefStore.briefData">
      <SeoBrief
        :article="briefStore.briefData.article"
        :pilier-keyword="briefStore.pilierKeyword?.keyword ?? null"
      />

      <KeywordList :keywords="briefStore.briefData.keywords" />

      <DataForSeoPanel
        :data="briefStore.briefData.dataForSeo"
        :is-refreshing="briefStore.isRefreshing"
        @refresh="briefStore.refreshDataForSeo()"
      />

      <ContentRecommendation
        :recommendation="briefStore.briefData.contentLengthRecommendation"
        :article-type="briefStore.briefData.article.type"
      />

      <!-- Outline section -->
      <section class="outline-section">
        <OutlineActions
          :is-generating="outlineStore.isGenerating"
          :has-outline="!!outlineStore.outline"
          :has-brief-data="!!briefStore.briefData"
          @generate="outlineStore.generateOutline(briefStore.briefData!)"
          @regenerate="outlineStore.generateOutline(briefStore.briefData!)"
        />

        <ErrorMessage
          v-if="outlineStore.error && !outlineStore.isGenerating"
          :message="outlineStore.error"
          @retry="outlineStore.generateOutline(briefStore.briefData!)"
        />

        <!-- Streaming view during generation -->
        <OutlineDisplay
          v-if="outlineStore.isGenerating || !outlineStore.outline"
          :outline="outlineStore.outline"
          :streamed-text="outlineStore.streamedText"
          :is-generating="outlineStore.isGenerating"
        />

        <!-- Interactive editor after generation -->
        <template v-else>
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

          <div class="outline-validation">
            <p v-if="outlineStore.isValidated" class="validation-msg">
              Sommaire valid&eacute; et sauvegard&eacute;.
            </p>
            <button
              v-if="!outlineStore.isValidated"
              class="btn btn-validate"
              :disabled="outlineStore.isSaving"
              @click="outlineStore.validateOutline(slug)"
            >
              {{ outlineStore.isSaving ? 'Sauvegarde en cours...' : 'Valider le sommaire' }}
            </button>
          </div>
        </template>
      </section>

      <!-- Article section -->
      <section v-if="outlineStore.isValidated" class="article-section">
        <ArticleActions
          :is-generating="editorStore.isGenerating"
          :has-content="!!editorStore.content"
          :is-outline-validated="outlineStore.isValidated"
          @generate="handleGenerateArticle()"
          @regenerate="handleGenerateArticle()"
        />

        <ErrorMessage
          v-if="editorStore.error && !editorStore.isGenerating"
          :message="editorStore.error"
          @retry="handleGenerateArticle()"
        />

        <ArticleStreamDisplay
          :streamed-text="editorStore.streamedText"
          :content="editorStore.content"
          :is-generating="editorStore.isGenerating"
        />

        <ArticleMetaDisplay
          :meta-title="editorStore.metaTitle"
          :meta-description="editorStore.metaDescription"
          :is-generating="editorStore.isGeneratingMeta"
        />

        <RouterLink
          v-if="editorStore.content && !editorStore.isGenerating"
          :to="`/article/${slug}/editor`"
          class="btn-edit-article"
        >
          Éditer l'article
        </RouterLink>
      </section>
    </template>
  </div>
</template>

<style scoped>
.article-workflow-view {
  max-width: 900px;
  padding: 2rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.back-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.outline-section {
  margin-top: 1.5rem;
}

.article-section {
  margin-top: 1.5rem;
}

.outline-validation {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
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
  background: #1d4ed8;
}

.btn-validate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-edit-article {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  transition: background 0.15s;
}

.btn-edit-article:hover {
  background: #1d4ed8;
  text-decoration: none;
}
</style>
