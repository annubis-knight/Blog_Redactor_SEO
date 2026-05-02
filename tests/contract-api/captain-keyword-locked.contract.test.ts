// @vitest-environment node
/**
 * Contract API — `captain_keyword_locked` ne doit pas être écrasé par
 * saveDecisions.
 *
 * Régression historique (sprint 2026-04-27) : `saveArticleKeywords()` côté
 * serveur faisait un "mirror" automatique de `richCaptain.status` vers la
 * colonne `articles.captain_keyword_locked`. Comme le PUT /articles/:id/keywords
 * ne contient pas `richCaptain` dans son payload, le mirror voyait
 * `data.richCaptain` undefined → écrivait NULL. Résultat : verrouiller un
 * Capitaine puis n'importe quelle sauvegarde subséquente du store écrasait
 * la colonne, et le recap-toggle restait en italique "suggéré".
 *
 * Ce test verrouille le contrat : la colonne `captain_keyword_locked` est
 * gérée EXCLUSIVEMENT par la route dédiée PUT /articles/:id/captain-keyword.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPut, apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /articles/:id/captain-keyword — non-régression mirror', () => {
  it('saveDecisions (PUT /keywords) ne doit pas écraser captain_keyword_locked', async () => {
    if (requireServer().skip) return

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CaptainLockMirror')
    const article = await ctx.createArticle(cocoon.id, 'MirrorRegression')

    // 1. Lock un Capitaine via la route dédiée
    const lockRes = await apiPut(`/articles/${article.id}/captain-keyword`, { captainKeyword: 'mot-clé-test' })
    expect(lockRes.status).toBe(200)

    // 2. Vérifie que la colonne est bien posée (via GET /cocoons → article.captainKeywordLocked)
    const cocoonsRes = await apiGet<{ id: number; articles: { id: number; captainKeywordLocked: string | null }[] }[]>('/cocoons')
    const cocoonData = cocoonsRes.data?.find(c => c.id === cocoon.id)
    const articleData = cocoonData?.articles.find(a => a.id === article.id)
    expect(articleData?.captainKeywordLocked, 'captain_keyword_locked doit être présent après lock').toBe('mot-clé-test')

    // 3. Simule saveDecisions sans richCaptain dans le payload (= comportement
    //    actuel du store). C'est le moment où l'ancien mirror écrasait à NULL.
    const saveRes = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: 'mot-clé-test',
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(saveRes.status).toBe(200)

    // 4. Vérifie que captain_keyword_locked tient toujours
    const cocoonsAfter = await apiGet<{ id: number; articles: { id: number; captainKeywordLocked: string | null }[] }[]>('/cocoons')
    const cocoonAfter = cocoonsAfter.data?.find(c => c.id === cocoon.id)
    const articleAfter = cocoonAfter?.articles.find(a => a.id === article.id)
    expect(
      articleAfter?.captainKeywordLocked,
      'captain_keyword_locked ne doit pas avoir été écrasé par saveDecisions',
    ).toBe('mot-clé-test')
  })

  it('clearCaptainKeywordLockedDb explicite remet la colonne à null', async () => {
    if (requireServer().skip) return

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CaptainUnlockClear')
    const article = await ctx.createArticle(cocoon.id, 'ClearTest')

    // Lock
    await apiPut(`/articles/${article.id}/captain-keyword`, { captainKeyword: 'à-clear' })

    // Unlock explicite
    const unlockRes = await apiPut(`/articles/${article.id}/captain-keyword`, { captainKeyword: null })
    expect(unlockRes.status).toBe(200)

    // Vérification
    const cocoonsRes = await apiGet<{ id: number; articles: { id: number; captainKeywordLocked: string | null }[] }[]>('/cocoons')
    const cocoonData = cocoonsRes.data?.find(c => c.id === cocoon.id)
    const articleData = cocoonData?.articles.find(a => a.id === article.id)
    expect(articleData?.captainKeywordLocked).toBeNull()
  })
})
