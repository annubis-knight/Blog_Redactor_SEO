// @vitest-environment node
/**
 * FR-RED-EXPORT-HTML — la page publiée d'un article (recette du 2026-09-30,
 * express 10, RED-23, PU-02) :
 *   - le fichier perdait tous les liens internes posés dans l'éditeur
 *     (`#article-<id>`), même celui de l'enfant vers son parent ;
 *   - son H1 était le titre de l'article, pas le H1 jugé par la porte ;
 *   - le gabarit contenait une image `outStr_Arrow.svg` « Image absolute ».
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ query: vi.fn(), getArticleById: vi.fn(), getArticleContent: vi.fn() }))

vi.mock('../../../server/db/client', () => ({ pool: { query: m.query }, query: vi.fn() }))
vi.mock('../../../server/services/infra/data.service', () => ({ getArticleById: m.getArticleById }))
vi.mock('../../../server/services/article/article-content.service', () => ({ getArticleContent: m.getArticleContent }))

import { buildArticlePage } from '../../../server/services/article/export.service'
import { publishedTitle } from '../../../shared/verifiers/publish'

const TEXTE = '<h1>Recette : le guide pratique &amp; complet</h1><p>Chapeau.</p>'
  + '<h2>Le budget</h2><p>Voir <a target="_blank" rel="noopener noreferrer nofollow" class="internal-link" href="#article-1336">le budget détaillé</a> et <a class="internal-link" href="#article-1341">les questions</a>.</p>'
  + '<h2>Conclusion</h2><p>Fin.</p>'

beforeEach(() => {
  vi.resetAllMocks()
  m.getArticleById.mockResolvedValue({ article: { id: 1335, title: 'Recette : le guide complet', slug: 'recette-guide' }, cocoonName: 'Recette' })
  m.getArticleContent.mockResolvedValue({ content: TEXTE, metaTitle: 'Recette : le guide', metaDescription: 'Tout savoir sur la recette.' })
  // 1336 est rédigé, 1341 ne l'est pas.
  m.query.mockResolvedValue({ rows: [{ id: 1335, slug: 'recette-guide' }, { id: 1336, slug: 'budget-a-prevoir' }] })
})

describe('buildArticlePage — le fichier publié (FR-RED-EXPORT-HTML)', () => {
  it('le H1 publié est celui que la porte juge, pas le titre de l’article', async () => {
    const page = await buildArticlePage(1335)
    expect(page.ok).toBe(true)
    if (!page.ok) return
    expect(publishedTitle(TEXTE, 'Recette : le guide complet')).toBe('Recette : le guide pratique & complet')
    const h1 = [...page.html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(x => x[1])
    expect(h1).toEqual(['Recette : le guide pratique &amp; complet'])
    expect(page.html).toContain('"headline": "Recette : le guide pratique & complet"')
    expect(page.title).toBe('Recette : le guide pratique & complet')
  })

  it('un lien interne vers un article rédigé pointe vers son adresse de blog, sans nofollow ni nouvel onglet', async () => {
    const page = await buildArticlePage(1335)
    if (!page.ok) throw new Error('page attendue')
    expect(page.html).toContain('<a href="/blog/budget-a-prevoir" class="internal-link">le budget détaillé</a>')
    expect(page.html).not.toMatch(/nofollow|target="_blank"/)
  })

  it('un lien vers un article pas encore rédigé est retiré, son texte gardé', async () => {
    const page = await buildArticlePage(1335)
    if (!page.ok) throw new Error('page attendue')
    expect(page.html).not.toContain('#article-1341')
    expect(page.html).toContain('et les questions.')
  })

  it('l’aperçu montre les mêmes liens que le fichier', async () => {
    const apercu = await buildArticlePage(1335, { embedCss: true })
    if (!apercu.ok) throw new Error('aperçu attendu')
    expect(apercu.html).toContain('<a href="/blog/budget-a-prevoir" class="internal-link">le budget détaillé</a>')
  })

  it('le gabarit ne contient plus l’image « outStr_Arrow »', async () => {
    const page = await buildArticlePage(1335)
    if (!page.ok) throw new Error('page attendue')
    expect(page.html).not.toContain('outStr_Arrow')
    expect(page.html).not.toContain('Image absolute')
  })

  it('sans texte ou sans méta : un refus en français', async () => {
    m.getArticleContent.mockResolvedValueOnce({ content: TEXTE, metaTitle: '', metaDescription: null })
    expect(await buildArticlePage(1335)).toMatchObject({ ok: false, status: 400, code: 'MISSING_META', message: expect.stringMatching(/meta title/) })
    m.getArticleById.mockResolvedValueOnce(null)
    expect(await buildArticlePage(99)).toMatchObject({ ok: false, status: 404, code: 'NOT_FOUND' })
  })
})
