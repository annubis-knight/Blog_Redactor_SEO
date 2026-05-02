// @vitest-environment node
/**
 * Contract API — stabilité des identifiants cocon.
 *
 * Régression historique : `loadArticlesDb` réécrivait l'id de chaque cocon
 * avec un compteur séquentiel (`globalCocoonIndex++`) au lieu de l'id Postgres
 * réel. Conséquence : dès qu'un cocon antérieur était supprimé, les ids
 * exposés par GET /cocoons glissaient et toute URL bookmarkée du type
 * /cocoon/:id/moteur pouvait pointer silencieusement vers un autre cocon.
 *
 * Ce test verrouille le contrat : l'id renvoyé par GET /cocoons est l'id
 * stable de la table `cocoons`, et /cocoons/:id/articles le résout par cet
 * id-là — peu importe l'ordre de chargement ou les suppressions.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /cocoons — stabilité des identifiants', () => {
  it('GET /cocoons renvoie un id qui correspond à cocoons.id en DB', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'IdStable')

    const res = await apiGet<{ id: number; name: string }[]>('/cocoons')
    expect(res.status).toBe(200)
    const found = res.data?.find(c => c.name === cocoon.nom)
    expect(found, 'cocon créé doit apparaitre dans GET /cocoons').toBeDefined()
    expect(found!.id).toBe(cocoon.id)
  })

  it('GET /cocoons/:id/articles résout par id DB et survit à la suppression d\'un cocon antérieur', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()

    // Crée un cocon "antérieur" qu'on va supprimer pour faire glisser les
    // index séquentiels (le bug ne se manifestait que quand l'index ≠ id DB).
    const olderCocoon = await ctx.createCocoon(silo.id, 'OlderToDelete')
    const targetCocoon = await ctx.createCocoon(silo.id, 'Target')
    const targetArticle = await ctx.createArticle(targetCocoon.id, 'TargetArticle')

    // Supprime le cocon antérieur — son numéro disparaît mais cocoons_id_seq
    // ne se décrémente pas, ce qui crée un trou dans la séquence.
    await query(`DELETE FROM cocoons WHERE id = $1`, [olderCocoon.id])

    // L'URL utilise l'id DB de targetCocoon. Avec l'ancien code, le serveur
    // faisait `cocoons[targetCocoon.id]` (un index dans le tableau renvoyé)
    // et tombait sur le mauvais cocon ou un 404.
    const res = await apiGet<{ id: number; titre: string }[]>(`/cocoons/${targetCocoon.id}/articles`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data)).toBe(true)
    const found = res.data?.find(a => a.id === targetArticle.id)
    expect(found, `article ${targetArticle.id} doit être résolu via cocoon ${targetCocoon.id}`).toBeDefined()
  })

  it('GET /cocoons/:id/articles renvoie 404 pour un id inexistant', async () => {
    if (requireServer().skip) return
    // Un id improbablement haut → garantit qu'il n'existe pas en DB
    const res = await apiGet(`/cocoons/2147483646/articles`)
    expect(res.status).toBe(404)
  })
})
