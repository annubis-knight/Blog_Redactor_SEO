/**
 * Socle du parcours Cerveau : un cocon **vierge**, sans stratégie ni articles.
 *
 * Les autres socles (`test-fixtures.ts`, `parcours-fixtures.ts`) posent d'office
 * une stratégie complète pour que le Moteur ait des articles à piloter. Le
 * Cerveau, lui, doit être testé depuis la page blanche : c'est lui qui écrit
 * cette stratégie. D'où ce troisième socle, volontairement minimal.
 */
import { test, expect } from '@playwright/test'
import { query } from '../../../server/db/client.js'
import {
  makeTestRunId,
  getOrCreateTestSilo,
  createTestCocoon,
  cleanupTestFixtures,
} from '../../helpers/db-fixtures.js'
import { effectiveMode, setMockMode } from './runtime-mode.js'

const API = `http://localhost:${process.env.PORT ?? 3400}/api`

export interface CerveauCtx {
  runId: string
  siloName: string
  cocoonName: string
  /** Index du cocon dans `GET /api/cocoons` — celui qui va dans l'URL. */
  cocoonIndex: number
  cerveauUrl: () => string
  cocoonUrl: () => string
}

/** Résout l'index d'un cocon tel que l'attend `/cocoon/:id/...`. */
export async function resolveCocoonIndex(cocoonName: string): Promise<number> {
  const res = await fetch(`${API}/cocoons`)
  const json = await res.json().catch(() => null)
  const cocoons = (json?.data ?? []) as Array<{ id: number; name: string }>
  const found = cocoons.find(c => c.name === cocoonName)
  if (!found) throw new Error(`cocon « ${cocoonName} » absent de GET /api/cocoons`)
  return found.id
}

/**
 * Prépare un cocon vide pour un fichier de test du Cerveau.
 *
 * @param mode `'mock'` (défaut) pour des sources simulées et gratuites,
 *             `'real'` pour un vrai passage IA + DataForSEO (payant).
 */
export function useCerveau(mode: 'mock' | 'real' = 'mock'): CerveauCtx {
  const ctx = {
    runId: '',
    siloName: '',
    cocoonName: '',
    cocoonIndex: -1,
    cerveauUrl: () => `/cocoon/${ctx.cocoonIndex}/cerveau`,
    cocoonUrl: () => `/cocoon/${ctx.cocoonIndex}`,
  } as CerveauCtx

  test.beforeAll(async () => {
    ctx.runId = makeTestRunId()

    await setMockMode(mode)
    expect(await effectiveMode(), `le serveur doit être en mode ${mode}`).toBe(mode)

    const silo = await getOrCreateTestSilo(ctx.runId, 'Silo cerveau')
    ctx.siloName = silo.nom

    if (mode === 'real') {
      // Un passage réel produit du contenu qu'on garde pour l'inspecter : le
      // cocon porte donc un nom lisible, daté, sans étiquette de test.
      const jour = new Date().toISOString().slice(0, 10)
      ctx.cocoonName = `Parcours réel ${jour}`
      const res = await query<{ id: number }>(
        `INSERT INTO cocoons (nom, silo_id) VALUES ($1, $2) RETURNING id`,
        [ctx.cocoonName, silo.id],
      )
      if (!res.rows[0]) throw new Error('cocon du parcours réel non créé')
    } else {
      const cocoon = await createTestCocoon(ctx.runId, silo.id, 'Cocon cerveau')
      ctx.cocoonName = cocoon.nom
    }
    ctx.cocoonIndex = await resolveCocoonIndex(ctx.cocoonName)
  })

  test.afterAll(async () => {
    if (!ctx.runId) return
    // En mode réel on ne supprime rien : le cocon, ses articles et les mesures
    // payées restent en base pour être relus.
    if (mode !== 'real') {
      await query(`DELETE FROM keywords_seo WHERE cocoon_name = $1`, [ctx.cocoonName]).catch(() => {})
      await cleanupTestFixtures(ctx.runId)
    }
    await setMockMode(null).catch(() => {})
  })

  return ctx
}

/** Les cinq étapes de questionnement du Cerveau, dans l'ordre. */
export const ETAPES_STRATEGIE = ['cible', 'douleur', 'angle', 'promesse', 'cta'] as const

/** Réponses d'un dirigeant de TPE, pour que le contexte envoyé à l'IA tienne debout. */
export const REPONSES: Record<(typeof ETAPES_STRATEGIE)[number], string> = {
  cible: "Dirigeants de TPE et PME à Toulouse et en Haute-Garonne, 3 à 30 salariés, souvent artisans ou prestataires de services, sans compétence web interne.",
  douleur: "Leur site actuel ne leur amène aucun client. Ils ont payé une agence, n'ont jamais vu de retour, et ne savent pas si le problème vient du site, du référencement ou de leur offre.",
  angle: "Montrer concrètement ce qui sépare un site vitrine d'un site qui génère des demandes de devis, avec des exemples locaux chiffrés plutôt que du jargon technique.",
  promesse: "Comprendre en une lecture pourquoi son site ne convertit pas, et repartir avec trois actions applicables sans prestataire.",
  cta: "Demander un audit gratuit de 20 minutes en visio, sans engagement, avec un compte rendu écrit remis ensuite.",
}
