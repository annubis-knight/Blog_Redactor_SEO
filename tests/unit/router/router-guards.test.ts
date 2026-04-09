import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'

const Stub = defineComponent({ template: '<div>stub</div>' })

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: Stub },
      { path: '/labo', name: 'labo', component: Stub },
      { path: '/explorateur', name: 'explorateur', component: Stub },
      { path: '/cocoon/:cocoonId', name: 'cocoon-landing', component: Stub },
      { path: '/cocoon/:cocoonId/article/:slug', name: 'article', component: Stub },
      { path: '/article/:slug/editor', name: 'article-editor', component: Stub },
      {
        path: '/theme/:themeId',
        redirect: (to: any) => `/cocoon/${to.params.themeId}`,
      },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: Stub },
    ],
  })

  // Replicate the beforeEach guard
  router.beforeEach((to) => {
    const cocoonId = to.params.cocoonId as string | undefined
    const slug = to.params.slug as string | undefined

    if (cocoonId !== undefined && !cocoonId.trim()) {
      return { name: 'not-found' }
    }
    if (slug !== undefined && !slug.trim()) {
      return { name: 'not-found' }
    }

    return true
  })

  return router
}

describe('Router Guards', () => {
  let router: ReturnType<typeof createTestRouter>

  beforeEach(() => {
    router = createTestRouter()
  })

  it('laisse passer les routes valides', async () => {
    await router.push('/cocoon/mon-cocoon/article/mon-slug')
    expect(router.currentRoute.value.name).toBe('article')
  })

  it('redirige vers 404 pour les URLs inconnues', async () => {
    await router.push('/page-inexistante')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('laisse passer les routes sans params', async () => {
    await router.push('/labo')
    expect(router.currentRoute.value.name).toBe('labo')

    await router.push('/explorateur')
    expect(router.currentRoute.value.name).toBe('explorateur')
  })

  it('laisse passer les legacy redirects', async () => {
    await router.push('/theme/123')
    expect(router.currentRoute.value.name).toBe('cocoon-landing')
    expect(router.currentRoute.value.params.cocoonId).toBe('123')
  })

  it('affiche la page NotFound pour la route catch-all', async () => {
    await router.push('/route/totalement/inconnue')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
