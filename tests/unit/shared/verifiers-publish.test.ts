// @vitest-environment node
/**
 * FR-RED-PUBLISH-GATE — on ne publie pas un article qu'un expert refuserait.
 *
 * Fil conducteur de l'épopée qualité SEO : le pilier 1013, tel qu'il a été
 * publié le 2026-09-24 (tests/fixtures/articles/1013-pilier.html), doit être
 * REJETÉ par la porte de publication.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { verifyPublish, countToSourceMarkers, type PublishGateInput } from '../../../shared/verifiers/publish.js'
import { evaluateGate, hashGateInput } from '../../../shared/verifiers/gate.js'

const HTML_1013 = readFileSync(join(__dirname, '..', '..', 'fixtures', 'articles', '1013-pilier.html'), 'utf8')

const pilier1013: PublishGateInput = {
  title: 'Propulser la croissance digitale des entreprises toulousaines : le guide complet 2026',
  slug: 'strategie-digitale-entreprises-toulouse',
  level: 'pilier',
  content: HTML_1013,
  metaTitle: 'Croissance Digitale PME Toulouse : Guide Complet 2026',
  metaDescription: "Propulsez la croissance digitale de votre entreprise toulousaine. Stratégie, SEO local, conversion : tout ce qu'il faut savoir pour générer des clients en...",
  capitaine: 'stratégie digitale entreprises Toulouse',
  lieutenants: ['pourquoi mon site ne génère pas de clients'],
  existingWaivers: [],
}

describe('verifyPublish — le pilier 1013 est rejeté', () => {
  const issues = verifyPublish(pilier1013)
  const byRule = (rule: string) => issues.find(i => i.rule === rule)
  const result = evaluateGate('publish', issues, [], hashGateInput(pilier1013))

  it('relève ses chiffres sans source (rejugés à la publication, FR-RED-DRAFT-SINGLE-PASS)', () => {
    const unsourced = issues.filter(i => i.rule.startsWith('unsourced-figure'))
    expect(unsourced.length).toBeGreaterThan(0)
    expect(unsourced.every(i => i.level === 'risque')).toBe(true)
  })

  it('la porte ne passe pas', () => {
    expect(result.passed).toBe(false)
  })

  it('⛔ la meta description coupée en plein vol', () => {
    expect(byRule('meta-description-truncated')?.level).toBe('technique')
  })

  it('🔴 le capitaine absent du titre et du meta title', () => {
    expect(byRule('seo-capitaine-not-in-title')?.level).toBe('risque')
    expect(byRule('seo-capitaine-not-in-meta-title')?.level).toBe('risque')
  })

  it('🔴 un pilier six fois trop long (au-delà du plafond de son type)', () => {
    const issue = byRule('article-too-long')
    expect(issue?.level).toBe('risque')
    expect(issue?.message).toMatch(/pilier/)
    // Séparateur de milliers français : espace fine insécable (U+202F).
    expect(issue?.message).toMatch(/15[\s ]601 mots/)
    expect(issue?.message).toMatch(/au plus 3[\s ]500/)
  })

  it('aucune dérogation ne peut couvrir un défaut technique', () => {
    const technique = issues.filter(i => i.level === 'technique')
    expect(technique.length).toBeGreaterThan(0)
    const waivers = technique.map(i => ({
      gateId: 'publish' as const, rule: i.rule, level: 'risque' as const,
      category: 'autre' as const, reason: 'Je veux publier malgré tout, en connaissance de cause', inputHash: hashGateInput(pilier1013),
    }))
    expect(evaluateGate('publish', technique, waivers, hashGateInput(pilier1013)).passed).toBe(false)
  })
})

describe('verifyPublish — règles propres à la publication', () => {
  const sain: PublishGateInput = {
    title: 'Isolation des combles perdus : le guide',
    slug: 'isolation-combles-perdus',
    level: 'specifique',
    content: '<h1>Isolation des combles perdus : le guide</h1>' + '<h2>Pourquoi isoler</h2><p>' + 'isolation combles perdus '.repeat(10) + 'laine soufflée et résistance thermique. '.repeat(40) + '</p>'
      + '<h2>Comment faire</h2><p>' + 'Le pare-vapeur se pose côté chauffé. '.repeat(40) + '</p><h2>Combien ça coûte</h2><p>' + 'Le prix dépend de la surface. '.repeat(30) + '</p>',
    metaTitle: 'Isolation des combles perdus : méthode et prix',
    metaDescription: 'Isolation des combles perdus : matériaux, pose du pare-vapeur et budget, expliqués simplement pour choisir la bonne solution chez vous.',
    capitaine: 'isolation combles perdus',
    lieutenants: [],
    existingWaivers: [],
  }

  it('🔴 des passages « à sourcer » restants', () => {
    const html = sain.content + '<p><mark data-a-sourcer>[à sourcer : part des combles non isolés]</mark></p>'
    expect(countToSourceMarkers(html)).toBeGreaterThan(0)
    const issue = verifyPublish({ ...sain, content: html }).find(i => i.rule === 'draft-to-source-remaining')
    expect(issue?.level).toBe('risque')
  })

  it('🟠 chaque dérogation déjà posée est réaffichée pour être reconfirmée', () => {
    const issues = verifyPublish({
      ...sain,
      existingWaivers: [{ gateId: 'captain-lock', rule: 'captain-volume-unknown', level: 'risque', category: 'longue-traine', reason: 'Demandes réelles reçues par téléphone', inputHash: 'x' }],
    })
    const reconfirm = issues.find(i => i.rule === 'waiver-reconfirm:captain-lock:captain-volume-unknown')
    expect(reconfirm?.level).toBe('attention')
    expect(reconfirm?.message).toContain('Demandes réelles reçues par téléphone')
  })

  it('un article dans sa fourchette de longueur passe cette règle', () => {
    expect(verifyPublish(sain).map(i => i.rule)).not.toContain('article-too-long')
  })

  it('chaque affirmation invérifiable a son identifiant : une dérogation n’en couvre qu’une', () => {
    const html = sain.content
      + '<p>Nous avons accompagné des artisans du Tarn pendant dix ans.</p>'
      + '<p>Plus de 300 clients nous font confiance depuis la création.</p>'
    const claims = verifyPublish({ ...sain, content: html }).filter(i => i.rule.startsWith('unverifiable-claim'))
    expect(claims).toHaveLength(2)
    expect(new Set(claims.map(c => c.rule)).size).toBe(2)
    const hash = hashGateInput({ html })
    const waiver = { gateId: 'publish' as const, rule: claims[0]!.rule, level: 'risque' as const, category: 'autre' as const, reason: 'Cas client réel, contrat signé en 2024', inputHash: hash }
    const result = evaluateGate('publish', claims, [waiver], hash)
    expect(result.blocking.map(i => i.rule)).toEqual([claims[1]!.rule])
  })

  it('le H1 dans le corps est toléré à la publication (l’export le retire)', () => {
    expect(verifyPublish(sain).map(i => i.rule)).not.toContain('hn-h1-in-body')
  })
})
