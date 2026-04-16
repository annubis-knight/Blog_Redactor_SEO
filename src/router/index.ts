import { createRouter, createWebHistory } from 'vue-router'
import { log } from '@/utils/logger'
import DashboardView from '../views/DashboardView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/config',
      name: 'theme-config',
      component: () => import('../views/ThemeConfigView.vue'),
    },
    {
      path: '/silo/:siloId',
      name: 'silo-detail',
      component: () => import('../views/SiloDetailView.vue'),
    },
    {
      path: '/cocoon/:cocoonId',
      name: 'cocoon-landing',
      component: () => import('../views/CocoonLandingView.vue'),
    },
    {
      path: '/cocoon/:cocoonId/cerveau',
      name: 'cerveau',
      component: () => import('../views/CerveauView.vue'),
    },
    {
      path: '/cocoon/:cocoonId/moteur',
      name: 'moteur',
      component: () => import('../views/MoteurView.vue'),
    },
    {
      path: '/cocoon/:cocoonId/redaction',
      name: 'redaction',
      component: () => import('../views/RedactionView.vue'),
    },
    {
      path: '/cocoon/:cocoonId/article/:articleId',
      name: 'article',
      component: () => import('../views/ArticleWorkflowView.vue'),
    },
    {
      path: '/article/:articleId/editor',
      name: 'article-editor',
      component: () => import('../views/ArticleEditorView.vue'),
    },
    {
      path: '/article/:articleId/preview',
      name: 'article-preview',
      component: () => import('../views/ArticlePreviewView.vue'),
      meta: { hideNavbar: true },
    },
    {
      path: '/labo',
      name: 'labo',
      component: () => import('../views/LaboView.vue'),
    },
    {
      path: '/explorateur',
      name: 'explorateur',
      component: () => import('../views/ExplorateurView.vue'),
    },
    {
      path: '/linking',
      name: 'linking',
      component: () => import('../views/LinkingMatrixView.vue'),
    },
    {
      path: '/post-publication',
      name: 'post-publication',
      component: () => import('../views/PostPublicationView.vue'),
    },
    // Legacy redirects
    {
      path: '/theme/:themeId',
      redirect: to => `/cocoon/${to.params.themeId}`,
    },
    {
      path: '/theme/:themeId/article/:articleId',
      redirect: to => `/cocoon/${to.params.themeId}/article/${to.params.articleId}`,
    },
    {
      path: '/theme/:themeId/keywords',
      redirect: to => `/cocoon/${to.params.themeId}/moteur`,
    },
    {
      path: '/cocoon/:cocoonId/keywords',
      redirect: to => `/cocoon/${to.params.cocoonId}/moteur`,
    },
    // Catch-all 404 — MUST be last
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

// Validate route params — reject empty/whitespace-only values
router.beforeEach((to) => {
  const paramsToValidate = ['cocoonId', 'articleId', 'siloId', 'themeId'] as const
  for (const param of paramsToValidate) {
    const value = to.params[param] as string | undefined
    if (value !== undefined && !value.trim()) {
      return { name: 'not-found' }
    }
  }
  return true
})

router.afterEach((to, from) => {
  log.debug(`[router] ${from.name?.toString() ?? '/'} → ${to.name?.toString() ?? to.path}`, { params: to.params })
})

// Handle lazy-loading errors (e.g. chunk failures after deployment)
const CHUNK_RELOAD_KEY = 'chunk_reload_count'
router.onError((error, to) => {
  log.error('[Router Error]', { error: error.message, to: to.path })
  if (error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk')) {
    const reloadCount = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
    if (reloadCount < 2) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(reloadCount + 1))
      window.location.href = to.fullPath
    } else {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      log.error('[Router] Chunk reload limit reached, redirecting to home')
      window.location.href = '/'
    }
  }
})

export default router
