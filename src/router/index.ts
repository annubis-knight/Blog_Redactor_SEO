import { createRouter, createWebHistory } from 'vue-router'
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
      path: '/cocoon/:cocoonId',
      name: 'cocoon',
      component: () => import('../views/CocoonView.vue'),
    },
    {
      path: '/article/:slug',
      name: 'article',
      component: () => import('../views/ArticleWorkflowView.vue'),
    },
    {
      path: '/article/:slug/editor',
      name: 'article-editor',
      component: () => import('../views/ArticleEditorView.vue'),
    },
  ],
})

export default router
