import { createRouter, createWebHistory } from 'vue-router'
import { log } from '@/utils/logger'
import DashboardView from '../views/DashboardView.vue'

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
      path: '/cocoon/:cocoonId/article/:slug',
      name: 'article',
      component: () => import('../views/ArticleWorkflowView.vue'),
    },
    {
      path: '/article/:slug/editor',
      name: 'article-editor',
      component: () => import('../views/ArticleEditorView.vue'),
    },
    {
      path: '/labo',
      name: 'labo',
      component: () => import('../views/LaboView.vue'),
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
      path: '/theme/:themeId/article/:slug',
      redirect: to => `/cocoon/${to.params.themeId}/article/${to.params.slug}`,
    },
    {
      path: '/theme/:themeId/keywords',
      redirect: to => `/cocoon/${to.params.themeId}/moteur`,
    },
    {
      path: '/cocoon/:cocoonId/keywords',
      redirect: to => `/cocoon/${to.params.cocoonId}/moteur`,
    },
  ],
})

router.afterEach((to, from) => {
  log.debug(`[router] ${from.name?.toString() ?? '/'} → ${to.name?.toString() ?? to.path}`, { params: to.params })
})

export default router
