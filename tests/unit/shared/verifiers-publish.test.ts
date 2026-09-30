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
import { verifyDraft } from '../../../shared/verifiers/draft.js'
import { evaluateGate, hashGateInput, pointFingerprint, type GateWaiver } from '../../../shared/verifiers/gate.js'
import { IMAGE_TO_PROVIDE_SRC } from '../../../shared/constants/image-placeholder.js'

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

  it('🔴 des passages « à sourcer » restants, chacun compté une fois', () => {
    const html = sain.content + '<p><mark data-a-sourcer>[à sourcer : part des combles non isolés]</mark> et [à sourcer : prix moyen]</p>'
    expect(countToSourceMarkers(html)).toBe(2)
    const issue = verifyPublish({ ...sain, content: html }).find(i => i.rule === 'draft-to-source-remaining')
    expect(issue?.level).toBe('risque')
    expect(issue?.message).toMatch(/^2 passages/)
  })

  // FR-RED-ENRICH-PASSES — la passe images réserve une place ; publier la place
  // vide montrerait « Image à fournir » au lecteur.
  it('⛔ une image encore à fournir', () => {
    const html = sain.content + `<img src="${IMAGE_TO_PROVIDE_SRC}" alt="Combles isolés avec de la laine soufflée">`
    const issue = verifyPublish({ ...sain, content: html }).find(i => i.rule === 'image-to-provide')
    expect(issue?.level).toBe('technique')
  })

  it('🟠 chaque dérogation déjà posée est réaffichée pour être reconfirmée', () => {
    const issues = verifyPublish({
      ...sain,
      existingWaivers: [{
        issue: { rule: 'captain-volume-unknown', level: 'risque', message: 'Aucun volume de recherche mesuré pour « isolation combles perdus ».' },
        waiver: { gateId: 'captain-lock', rule: 'captain-volume-unknown', level: 'risque', category: 'longue-traine', reason: 'Demandes réelles reçues par téléphone.', inputHash: 'x' },
      }],
    })
    const reconfirm = issues.find(i => i.rule === 'waiver-reconfirm:captain-lock:captain-volume-unknown')
    expect(reconfirm?.level).toBe('attention')
    expect(reconfirm?.message).toContain('Demandes réelles reçues par téléphone')
    // Recette 2026-09-30 (express 10 c) : une phrase, pas l'identifiant interne ; pas de « .. ».
    expect(reconfirm?.message).toContain('Aucun volume de recherche mesuré pour « isolation combles perdus »')
    expect(reconfirm?.message).not.toContain('captain-volume-unknown')
    expect(reconfirm?.message).not.toMatch(/\.\./)
    expect(reconfirm?.fingerprint, 'empreinte posée par le vérificateur').toBeTruthy()
  })

  it('🟠 une dérogation 🟠 (simple lecture) dit qu’elle a été lue, faute de raison écrite', () => {
    const reconfirm = verifyPublish({
      ...sain,
      existingWaivers: [{
        issue: { rule: 'captain-intent-mismatch', level: 'attention', message: 'Google traite cette requête comme de navigation, alors que l’article vise une intention informationnelle.' },
        waiver: { gateId: 'captain-lock', rule: 'captain-intent-mismatch', level: 'attention', category: null, reason: null, inputHash: 'x' },
      }],
    }).find(i => i.rule.startsWith('waiver-reconfirm:captain-lock:'))
    expect(reconfirm?.message).toContain('Google traite cette requête comme de navigation')
    expect(reconfirm?.message).toMatch(/lu/)
    expect(reconfirm?.message).not.toContain('captain-intent-mismatch')
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

// Recette du 2026-09-30 (express 10 b) : les 🔴 « Paragraphe répété » dérogés au
// premier jet étaient redemandés à la publication sous une autre règle, et pas
// réaffichés. FR-INFRA-GATE-WAIVER, FR-RED-PUBLISH-GATE : même point (même
// extrait), même dérogation, réaffichée en 🟠 à relire.
describe('verifyPublish — les dérogations du premier jet valent pour le même point', () => {
  const repete = 'Un site clair rassure le client et lui donne envie de vous appeler sans attendre la semaine prochaine.'
  const texte = '<h1>Isolation des combles perdus : le guide</h1><h2>Pourquoi isoler</h2>'
    + `<p>${repete}</p><p>Le pare-vapeur se pose toujours côté chauffé de la maison.</p><h2>Comment faire</h2><p>${repete}</p>`
  const base: PublishGateInput = {
    title: 'Isolation des combles perdus : le guide', slug: 'isolation-combles-perdus', level: 'specifique', content: texte,
    metaTitle: 'Isolation des combles perdus : méthode et prix',
    metaDescription: 'Isolation des combles perdus : matériaux, pose du pare-vapeur et budget, expliqués simplement pour choisir la bonne solution chez vous.',
    capitaine: 'isolation combles perdus', lieutenants: [], existingWaivers: [],
  }
  const RAISON = 'Texte simulé (MOCK) de la recette : répétition attendue.'
  const auPremierJet = (content: string): GateWaiver[] => {
    const issue = verifyDraft({ content, captain: 'isolation combles perdus', targetWords: 60, outlineH2Count: 2 })
      .find(i => i.rule.startsWith('draft-repeated-paragraph'))!
    return [{ gateId: 'draft', rule: issue.rule, level: 'risque', category: 'autre', reason: RAISON, inputHash: pointFingerprint('draft', issue, 'empreinte-du-jet') }]
  }

  it('sans dérogation du premier jet : 🔴 Paragraphe répété', () => {
    expect(verifyPublish(base).find(i => i.rule.startsWith('repeated-paragraph'))?.level).toBe('risque')
  })

  it('dérogé au premier jet : plus de 🔴, un 🟠 « Dérogation posée au premier jet » avec la raison', () => {
    const issues = verifyPublish({ ...base, draftWaivers: auPremierJet(texte) })
    expect(issues.some(i => i.rule.startsWith('repeated-paragraph'))).toBe(false)
    const reconfirm = issues.find(i => i.rule.startsWith('waiver-reconfirm:draft:repeated-paragraph'))
    expect(reconfirm?.level).toBe('attention')
    expect(reconfirm?.message).toMatch(/^Dérogation posée au premier jet/)
    expect(reconfirm?.message).toContain('Paragraphe répété')
    expect(reconfirm?.message).toContain('répétition attendue')
    expect(reconfirm?.excerpt).toBe(repete.slice(0, 80))
  })

  it('une retouche ailleurs dans l’article ne fait pas tomber la dérogation du premier jet', () => {
    const retouche = texte.replace('toujours côté chauffé', 'côté chauffé')
    const issues = verifyPublish({ ...base, content: retouche, draftWaivers: auPremierJet(texte) })
    expect(issues.some(i => i.rule.startsWith('repeated-paragraph'))).toBe(false)
  })

  it('un autre paragraphe répété n’est pas couvert', () => {
    const autre = texte.replaceAll(repete, 'Un devis précis évite les mauvaises surprises et rassure le client dès le premier rendez-vous chez lui.')
    const issues = verifyPublish({ ...base, content: autre, draftWaivers: auPremierJet(texte) })
    expect(issues.find(i => i.rule.startsWith('repeated-paragraph'))?.level).toBe('risque')
  })
})

// C7 — FR-CER-CHILD-FROM-PILLAR-H2 : la section dont un enfant est né le résume
// (150 à 250 mots) et y renvoie. FR-RED-LINKING-MANUAL : un lien vers un article
// pas encore publié mènerait le lecteur nulle part.
describe('verifyPublish — un parent résume ses enfants', () => {
  const words = (n: number) => 'mot '.repeat(n).trim()
  const pilier = (combles: number): PublishGateInput => ({
    title: 'Rénovation énergétique : le guide',
    slug: 'renovation-energetique',
    level: 'pilier',
    content: `<h1>Rénovation énergétique : le guide</h1><h2>Isoler les combles</h2><p>${words(combles)}</p><h2>Changer les fenêtres</h2><p>${words(300)}</p>`,
    metaTitle: 'Rénovation énergétique : le guide complet',
    metaDescription: 'Rénovation énergétique : isoler, changer les fenêtres, financer les travaux. Tout ce qu’il faut savoir pour réussir sa rénovation.',
    capitaine: 'rénovation énergétique',
    lieutenants: [],
    existingWaivers: [],
    children: [{ id: 11, title: 'Isoler ses combles', section: 'Isoler les combles' }],
  })

  it('🔴 une section qui développe, au-delà de 250 mots, le sujet d’un enfant', () => {
    const issue = verifyPublish(pilier(600)).find(i => i.rule === 'child-section-too-long:11')
    expect(issue?.level).toBe('risque')
    expect(issue?.message).toContain('Isoler ses combles')
    expect(issue?.message).toMatch(/600 mots/)
  })

  it('une section de 200 mots : rien à dire ; une section sans enfant peut être longue', () => {
    const issues = verifyPublish(pilier(200)).map(i => i.rule)
    expect(issues.some(r => r.startsWith('child-section'))).toBe(false)
  })

  it('🟠 la section dont est né un enfant a disparu', () => {
    const issue = verifyPublish({ ...pilier(200), children: [{ id: 12, title: 'Le chauffage au bois', section: 'Le bois' }] })
      .find(i => i.rule === 'child-section-missing:12')
    expect(issue?.level).toBe('attention')
  })

  it('🟠 un lien vers un article pas encore publié', () => {
    const issue = verifyPublish({ ...pilier(200), unpublishedLinks: [{ id: 11, title: 'Isoler ses combles' }] })
      .find(i => i.rule === 'link-to-unpublished:11')
    expect(issue?.level).toBe('attention')
    expect(issue?.message).toContain('Isoler ses combles')
  })
})

