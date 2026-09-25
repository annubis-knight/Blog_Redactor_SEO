// @vitest-environment node
/**
 * Contrat des portes de qualité (FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER,
 * FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-RED-PUBLISH-GATE).
 *
 * Chaque porte a son test NÉGATIF (NFR-TEST-BEHAVIORAL) : l'action interdite
 * est refusée en 422 `GATE_BLOCKED`, une raison trop courte est refusée, et
 * une dérogation tombe quand les données vérifiées changent.
 *
 * Sans serveur, ces tests apparaissent IGNORÉS (`skip()`), pas verts.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet, apiPost, apiPut } from '../helpers/api-client.js'

const ctx = setupTestContext()

interface Evaluation {
  gateId: string
  passed: boolean
  inputHash: string
  issues: Array<{ rule: string; level: string }>
  blocking: Array<{ rule: string; level: string }>
  waived: unknown[]
}

const RAISON = 'Longue traîne assumée : demandes réelles reçues par téléphone'

async function nouvelArticle(type: 'Pilier' | 'Intermédiaire' | 'Spécialisé' = 'Pilier') {
  const silo = await ctx.getSilo()
  const cocoon = await ctx.createCocoon(silo.id, 'Portes')
  return ctx.createArticle(cocoon.id, 'Porte', type)
}

describe('Porte « verrouiller le capitaine »', () => {
  it('⛔ sans capitaine, l’étape est refusée en 422 avec l’évaluation complète', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    const check = await apiPost<unknown>(`/articles/${article.id}/progress/check`, { check: 'moteur:capitaine_locked' })
    expect(check.status).toBe(422)
    expect(check.error?.code).toBe('GATE_BLOCKED')
    const details = (check.raw as { error: { details: Evaluation } }).error.details
    expect(details.blocking.map(i => i.rule)).toContain('captain-missing')
  })

  it('🔴 un capitaine jamais mesuré : raison trop courte refusée, vraie raison acceptée, puis l’étape passe', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    const capitaine = `mot-cle-jamais-mesure-${ctx.runId}`
    expect((await apiPut(`/articles/${article.id}/keywords`, { capitaine, lieutenants: [], lexique: [] })).status).toBe(200)

    const evaluation = await apiGet<Evaluation>(`/articles/${article.id}/gates/captain-lock`)
    expect(evaluation.status).toBe(200)
    expect(evaluation.data!.passed).toBe(false)
    const risque = evaluation.data!.blocking.find(i => i.rule === 'captain-volume-unknown')
    expect(risque?.level).toBe('risque')

    const tropCourte = await apiPost<{ refused: Array<{ rule: string; problem: string }>; evaluation: Evaluation }>(
      `/articles/${article.id}/gates/captain-lock/waivers`,
      { waivers: [{ rule: 'captain-volume-unknown', category: 'longue-traine', reason: 'trop court' }] },
    )
    expect(tropCourte.data!.refused.map(r => r.rule)).toContain('captain-volume-unknown')
    expect(tropCourte.data!.evaluation.passed).toBe(false)

    const drafts = evaluation.data!.blocking.map(i => (
      i.level === 'risque' ? { rule: i.rule, category: 'longue-traine', reason: RAISON } : { rule: i.rule }
    ))
    const acceptee = await apiPost<{ refused: unknown[]; evaluation: Evaluation }>(
      `/articles/${article.id}/gates/captain-lock/waivers`, { waivers: drafts },
    )
    expect(acceptee.data!.refused).toEqual([])
    expect(acceptee.data!.evaluation.passed).toBe(true)

    const check = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:capitaine_locked' })
    expect(check.status).toBe(200)
  })

  it('une dérogation tombe quand le capitaine change', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `premier-${ctx.runId}`, lieutenants: [], lexique: [] })
    const avant = await apiGet<Evaluation>(`/articles/${article.id}/gates/captain-lock`)
    const drafts = avant.data!.blocking.map(i => (i.level === 'risque' ? { rule: i.rule, category: 'autre', reason: RAISON } : { rule: i.rule }))
    const pose = await apiPost<{ evaluation: Evaluation }>(`/articles/${article.id}/gates/captain-lock/waivers`, { waivers: drafts })
    expect(pose.data!.evaluation.passed).toBe(true)

    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `second-${ctx.runId}`, lieutenants: [], lexique: [] })
    const apres = await apiGet<Evaluation>(`/articles/${article.id}/gates/captain-lock`)
    expect(apres.data!.inputHash).not.toBe(avant.data!.inputHash)
    expect(apres.data!.passed).toBe(false)
    const check = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:capitaine_locked' })
    expect(check.status).toBe(422)
  })
})

describe('Porte « verrouiller les lieutenants »', () => {
  it('🔴 un pilier avec un seul lieutenant', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle('Pilier')
    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `capitaine-${ctx.runId}`, lieutenants: ['un seul lieutenant'], lexique: [] })
    const evaluation = await apiGet<Evaluation>(`/articles/${article.id}/gates/lieutenants-lock`)
    expect(evaluation.data!.blocking.map(i => i.rule)).toContain('lieutenants-too-few')
    const check = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lieutenants_locked' })
    expect(check.status).toBe(422)
  })
})

describe('Porte « valider les lieutenants » — minimum par type', () => {
  it('🔴 un intermédiaire avec un seul lieutenant (minimum 2) ; un spécialisé passe avec un seul', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const inter = await nouvelArticle('Intermédiaire')
    await apiPut(`/articles/${inter.id}/keywords`, { capitaine: `inter-${ctx.runId}`, lieutenants: ['un seul lieutenant inter'], lexique: [] })
    const evalInter = await apiGet<Evaluation>(`/articles/${inter.id}/gates/lieutenants-lock`)
    expect(evalInter.data!.blocking.map(i => i.rule)).toContain('lieutenants-too-few')

    const spec = await nouvelArticle('Spécialisé')
    await apiPut(`/articles/${spec.id}/keywords`, { capitaine: `spec-${ctx.runId}`, lieutenants: ['un seul lieutenant spec'], lexique: [] })
    const evalSpec = await apiGet<Evaluation>(`/articles/${spec.id}/gates/lieutenants-lock`)
    expect(evalSpec.data!.issues.map(i => i.rule)).not.toContain('lieutenants-too-few')
  })
})

describe('Porte « valider le lexique » (FR-LEX-METIER-ONLY)', () => {
  it('🔴 un mot vide dans le lexique retient l’étape ; un lexique de métier passe', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `lexique-${ctx.runId}`, lieutenants: [], lexique: ['être', 'pare-vapeur'] })
    const refus = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lexique_validated' })
    expect(refus.status).toBe(422)
    const details = (refus.raw as { error: { details: Evaluation } }).error.details
    expect(details.blocking.map(i => i.rule)).toEqual(['lexique-generic-term:etre'])

    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `lexique-${ctx.runId}`, lieutenants: [], lexique: ['pare-vapeur', 'laine soufflée'] })
    const ok = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lexique_validated' })
    expect(ok.status).toBe(200)
  })

  it('🔴 un lexique vide retient l’étape, mais s’assume avec une raison', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    const evaluation = await apiGet<Evaluation>(`/articles/${article.id}/gates/lexique-lock`)
    expect(evaluation.data!.blocking.find(i => i.rule === 'lexique-empty')?.level).toBe('risque')
  })
})

describe('Porte « accepter le premier jet » (FR-RED-DRAFT-SINGLE-PASS)', () => {
  const outline = { sections: [
    { id: 'h1', level: 1, title: 'Titre', annotation: null, status: 'accepted' },
    { id: 'a', level: 2, title: 'Premier chapitre', annotation: null, status: 'accepted' },
    { id: 'b', level: 2, title: 'Second chapitre', annotation: null, status: 'accepted' },
  ] }

  it('⛔ un premier jet sans H1 ; 🔴 un chiffre sans source — jugés sur le texte enregistré', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle('Spécialisé')
    const capitaine = `premier jet ${ctx.runId}`
    await apiPut(`/articles/${article.id}/keywords`, { capitaine, lieutenants: [], lexique: [] })

    await apiPut(`/articles/${article.id}`, { outline, content: `<p>Texte sur ${capitaine}.</p><h2>Premier chapitre</h2><p>Un paragraphe.</p><h2>Second chapitre</h2><p>Un autre.</p>` })
    const sansH1 = await apiGet<Evaluation>(`/articles/${article.id}/gates/draft`)
    expect(sansH1.data?.passed).toBe(false)
    expect(sansH1.data?.blocking.map(i => `${i.level}:${i.rule}`)).toContain('technique:draft-h1-missing')

    await apiPut(`/articles/${article.id}`, { outline, content: `<h1>Guide ${capitaine}</h1><p>Tout sur ${capitaine}.</p><h2>Premier chapitre</h2><p>Un site coûte 3 000 € en moyenne.</p><h2>Second chapitre</h2><p>Un autre paragraphe.</p>` })
    const chiffre = await apiGet<Evaluation>(`/articles/${article.id}/gates/draft`)
    expect(chiffre.data?.blocking.map(i => `${i.level}:${i.rule}`)).toContain('risque:draft-unsourced-figure')
    expect(chiffre.data?.blocking.map(i => i.rule)).not.toContain('draft-h1-missing')
  })
})

describe('Porte « publier »', () => {
  it('⛔ un article sans contenu ne se publie pas, même avec une raison', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    const publication = await apiPut(`/articles/${article.id}/status`, { status: 'publié' })
    expect(publication.status).toBe(422)
    const details = (publication.raw as { error: { details: Evaluation } }).error.details
    expect(details.blocking.find(i => i.rule === 'content-empty')?.level).toBe('technique')

    const tentative = await apiPost<{ refused: Array<{ rule: string }> }>(
      `/articles/${article.id}/gates/publish/waivers`,
      { waivers: [{ rule: 'content-empty', category: 'autre', reason: RAISON }] },
    )
    expect(tentative.data!.refused.map(r => r.rule)).toContain('content-empty')
  })

  it('à la publication, une dérogation tombée n’est pas réaffichée : l’alerte revient à la place', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `ancien-${ctx.runId}`, lieutenants: [], lexique: [] })
    const avant = await apiGet<Evaluation>(`/articles/${article.id}/gates/captain-lock`)
    const drafts = avant.data!.blocking.map(i => (i.level === 'risque' ? { rule: i.rule, category: 'autre', reason: RAISON } : { rule: i.rule }))
    await apiPost(`/articles/${article.id}/gates/captain-lock/waivers`, { waivers: drafts })

    const pendant = await apiGet<Evaluation>(`/articles/${article.id}/gates/publish`)
    expect(pendant.data!.issues.some(i => i.rule.startsWith('waiver-reconfirm:captain-lock:')), 'dérogation debout : réaffichée').toBe(true)

    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `nouveau-${ctx.runId}`, lieutenants: [], lexique: [] })
    const apres = await apiGet<Evaluation>(`/articles/${article.id}/gates/publish`)
    expect(apres.data!.issues.some(i => i.rule.startsWith('waiver-reconfirm:')), 'dérogation tombée : absente').toBe(false)
    const revenue = apres.data!.blocking.find(i => i.rule === 'captain-lock:captain-volume-unknown')
    expect(revenue?.level, 'l’alerte du nouveau capitaine bloque la publication, à son niveau d’origine').toBe('risque')
  })

  it('une cannibalisation apparue après coup remonte à la publication ; un voisin sans rapport ne fait pas tomber la dérogation', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Cannibalisation tardive')
    const pilier = await ctx.createArticle(cocoon.id, 'Pilier tardif', 'Pilier')
    const lieutenant = `prix isolation ${ctx.runId}`
    await apiPut(`/articles/${pilier.id}/keywords`, { capitaine: `isolation ${ctx.runId}`, lieutenants: [lieutenant], lexique: [] })
    const lt = await apiGet<Evaluation>(`/articles/${pilier.id}/gates/lieutenants-lock`)
    await apiPost(`/articles/${pilier.id}/gates/lieutenants-lock/waivers`, {
      waivers: lt.data!.blocking.map(i => (i.level === 'risque' ? { rule: i.rule, category: 'autre', reason: RAISON } : { rule: i.rule })),
    })

    // Un voisin sans rapport : la dérogation tient toujours.
    const voisin = await ctx.createArticle(cocoon.id, 'Voisin', 'Spécialisé')
    await apiPut(`/articles/${voisin.id}/keywords`, { capitaine: `sans rapport ${ctx.runId}`, lieutenants: [], lexique: [] })
    const tient = await apiGet<Evaluation>(`/articles/${pilier.id}/gates/lieutenants-lock`)
    expect(tient.data!.passed, 'un voisin sans rapport ne fait pas tomber la dérogation').toBe(true)

    // Un enfant prend pour capitaine le lieutenant du pilier : la publication le voit.
    const enfant = await ctx.createArticle(cocoon.id, 'Enfant', 'Intermédiaire')
    await apiPut(`/articles/${enfant.id}/keywords`, { capitaine: lieutenant, lieutenants: [], lexique: [] })
    const publication = await apiGet<Evaluation>(`/articles/${pilier.id}/gates/publish`)
    const cannibale = publication.data!.blocking.find(i => i.rule.startsWith('lieutenants-lock:lieutenant-cannibalization:'))
    expect(cannibale?.level).toBe('risque')
  })

  it('un changement de statut autre que la publication n’est pas gardé', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    expect((await apiPut(`/articles/${article.id}/status`, { status: 'brouillon' })).status).toBe(200)
  })
})

describe('Aucun contournement des portes', () => {
  it('PUT /progress ne peut pas inscrire une étape gardée que la porte refuse', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    const res = await apiPut(`/articles/${article.id}/progress`, {
      phase: 'moteur', completedChecks: ['moteur:capitaine_locked'], checkTimestamps: {},
    })
    expect(res.status).toBe(422)
    expect(res.error?.code).toBe('GATE_BLOCKED')
  })

  it('une étape pour un article inexistant répond 404, pas 500', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const res = await apiPost('/articles/987654321/progress/check', { check: 'moteur:capitaine_locked' })
    expect(res.status).toBe(404)
  })
})

describe('Validation des entrées', () => {
  it('porte inconnue → 400', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    expect((await apiGet(`/articles/${article.id}/gates/porte-inconnue`)).status).toBe(400)
  })

  it('les dérogations posées se relisent', async ({ skip }) => {
    if (!ctx.serverOk) skip()
    const article = await nouvelArticle()
    await apiPut(`/articles/${article.id}/keywords`, { capitaine: `relu-${ctx.runId}`, lieutenants: [], lexique: [] })
    const evaluation = await apiGet<Evaluation>(`/articles/${article.id}/gates/captain-lock`)
    const drafts = evaluation.data!.blocking.map(i => (i.level === 'risque' ? { rule: i.rule, category: 'autre', reason: RAISON } : { rule: i.rule }))
    await apiPost(`/articles/${article.id}/gates/captain-lock/waivers`, { waivers: drafts })
    const liste = await apiGet<Array<{ gateId: string; rule: string; reason: string | null }>>(`/articles/${article.id}/waivers`)
    expect(liste.data!.some(w => w.gateId === 'captain-lock' && w.reason === RAISON)).toBe(true)
  })
})
