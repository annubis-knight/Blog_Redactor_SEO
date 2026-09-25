/**
 * FR-RED-ENRICH-PASSES / FR-RED-ENRICH-SOURCES — chaque proposition d'une passe
 * d'enrichissement est vérifiée avant que l'utilisateur ne l'accepte.
 *
 * Le pilier 1013 citait des chiffres « de 2024 » avec des liens que personne ne
 * pouvait vérifier : la recherche web jetait ses URL, le modèle écrivait les
 * siennes. Ici, un lien n'est gardé que s'il figure parmi les résultats réels.
 */
import { describe, it, expect } from 'vitest'
import { verifyEnrichment, keepKnownLinks } from '../../../shared/verifiers/enrichment'

const SOURCES = [{ url: 'https://www.insee.fr/etude-tpe', title: 'Insee — TPE', pageAge: null }]
const before = '<h2>Le budget</h2><p>Beaucoup d’artisans <mark data-a-sourcer>[à sourcer : part des TPE sans site]</mark> n’ont pas de site.</p>'
const rules = (issues: Array<{ level: string; rule: string }>) => issues.map(i => `${i.level}:${i.rule.split(':')[0]}`)

describe('keepKnownLinks', () => {
  it('garde un lien trouvé par la recherche, retire (texte conservé) un lien inventé', () => {
    const html = '<p>Selon l’<a href="https://www.insee.fr/etude-tpe">Insee</a> et <a href="https://invente.example/x">un site</a>.</p>'
    const out = keepKnownLinks(html, SOURCES)
    expect(out.html).toBe('<p>Selon l’<a href="https://www.insee.fr/etude-tpe">Insee</a> et un site.</p>')
    expect(out.removed).toEqual(['https://invente.example/x'])
  })

  it('laisse les liens internes du blog tranquilles', () => {
    const html = '<p>Voir <a class="internal-link" href="/blog/audit">l’audit</a>.</p>'
    expect(keepKnownLinks(html, []).html).toBe(html)
  })
})

describe('verifyEnrichment — sources', () => {
  it('une proposition sourcée, au lien réel, passe', () => {
    const after = '<h2>Le budget</h2><p>Selon l’<a href="https://www.insee.fr/etude-tpe">Insee</a>, 30 % des TPE n’ont pas de site.</p>'
    expect(verifyEnrichment({ pass: 'sources', before, after, webSources: SOURCES })).toEqual([])
  })

  it('🔴 un lien absent des résultats de la recherche', () => {
    const after = '<h2>Le budget</h2><p>Selon <a href="https://invente.example/x">une étude</a>, 30 % des TPE n’ont pas de site.</p>'
    expect(rules(verifyEnrichment({ pass: 'sources', before, after, webSources: SOURCES }))).toContain('risque:enrich-unknown-link')
  })

  it('🟠 un marqueur « à sourcer » qui reste', () => {
    expect(rules(verifyEnrichment({ pass: 'sources', before, after: before, webSources: SOURCES }))).toContain('attention:enrich-marker-remaining')
  })
})

describe('verifyEnrichment — toutes les passes', () => {
  const base = '<h2>Le budget</h2><p>Un site se prévoit tôt.</p><h3>Les postes</h3><p>Le design et les textes.</p>'

  it('⛔ un titre H2 ou H3 modifié (une passe enrichit, elle ne restructure pas)', () => {
    const after = base.replace('Les postes', 'Les dépenses')
    expect(rules(verifyEnrichment({ pass: 'exemples', before: base, after }))).toContain('technique:enrich-headings-changed')
  })

  it('🔴 un chiffre sans source ajouté', () => {
    const after = base.replace('Un site se prévoit tôt.', 'Un site coûte 3 000 € en moyenne.')
    expect(rules(verifyEnrichment({ pass: 'exemples', before: base, after }))).toContain('risque:enrich-unsourced-figure')
  })

  it('🔴 une phrase anglaise ajoutée', () => {
    const after = base.replace('Un site se prévoit tôt.', 'Un site se prévoit tôt. This is the best way to grow your business with the right tools.')
    expect(rules(verifyEnrichment({ pass: 'exemples', before: base, after }))).toContain('risque:enrich-non-french')
  })

  it('tableaux : ⛔ un tableau sans ligne d’en-tête', () => {
    const after = base.replace('<p>Le design et les textes.</p>', '<table><tr><td>Design</td><td>40 %</td></tr></table>')
    expect(rules(verifyEnrichment({ pass: 'tableaux', before: base, after }))).toContain('technique:enrich-table-without-header')
  })

  it('images : ⛔ une image sans texte alternatif', () => {
    const after = base.replace('</h3>', '</h3><figure><img src="[image : atelier]" alt=""></figure>')
    expect(rules(verifyEnrichment({ pass: 'images', before: base, after }))).toContain('technique:enrich-image-without-alt')
  })

  it('une proposition identique au texte d’origine est signalée (rien à accepter)', () => {
    expect(rules(verifyEnrichment({ pass: 'exemples', before: base, after: base }))).toContain('attention:enrich-unchanged')
  })

  it('un lien déjà présent avant la passe n’est pas pris pour un lien inventé', () => {
    const sourced = '<h2>Le budget</h2><p>Selon l’<a href="https://www.insee.fr/etude-tpe">Insee</a>, un site se prévoit tôt.</p>'
    const after = sourced.replace('</p>', '</p><p>Prenons un menuisier qui attend le printemps pour s’y mettre.</p>')
    expect(verifyEnrichment({ pass: 'exemples', before: sourced, after })).toEqual([])
  })

  // R17 — le chapeau (chapitre -1) porte le H1 : ni une passe ni une réécriture ne le change.
  it('⛔ le H1 du chapeau modifié, par une passe comme par une réécriture', () => {
    const chapeau = '<h1>Créer un site vitrine à Toulouse</h1><p>Un chapeau.</p>'
    const after = chapeau.replace('Créer un site vitrine à Toulouse', 'Un site qui rapporte')
    expect(rules(verifyEnrichment({ pass: 'sources', before: chapeau, after }))).toContain('technique:enrich-headings-changed')
    expect(rules(verifyEnrichment({ pass: 'reecriture', before: chapeau, after }))).toContain('technique:enrich-headings-changed')
  })

  it('⛔ un bloc ou un lien posé à la main qui disparaît', () => {
    const withBlocks = '<h2>Le budget</h2><div class="content-valeur"><p>Notre promesse.</p></div><p>Voir <a class="internal-link" data-slug="audit" href="/blog/audit">l’audit</a>.</p>'
    const lostBlock = withBlocks.replace('<div class="content-valeur"><p>Notre promesse.</p></div>', '<p>Notre promesse.</p>')
    const lostLink = withBlocks.replace('<a class="internal-link" data-slug="audit" href="/blog/audit">l’audit</a>', 'l’audit')
    expect(rules(verifyEnrichment({ pass: 'exemples', before: withBlocks, after: lostBlock }))).toContain('technique:enrich-block-lost')
    expect(rules(verifyEnrichment({ pass: 'exemples', before: withBlocks, after: lostLink }))).toContain('technique:enrich-block-lost')
    // Le marqueur « à sourcer » est fait pour disparaître à la passe sources.
    expect(rules(verifyEnrichment({ pass: 'sources', before, after: before.replace(/<mark[^>]*>[^<]*<\/mark>/, 'une part notable') }))).not.toContain('technique:enrich-block-lost')
  })

  it('⛔ une proposition vide ou coupée ne s’accepte pas', () => {
    expect(rules(verifyEnrichment({ pass: 'exemples', before: base, after: '  ' }))).toEqual(['technique:enrich-empty'])
    expect(rules(verifyEnrichment({ pass: 'exemples', before: base, after: `${base}<p>Et en plus`, truncated: true }))).toContain('technique:enrich-truncated')
  })
})

describe('verifyEnrichment — FAQ', () => {
  it('une FAQ en questions passe', () => {
    const after = '<h2>Questions fréquentes</h2><h3>Combien de temps faut-il ?</h3><p>Comptez quelques semaines.</p>'
    expect(verifyEnrichment({ pass: 'faq', before: '', after })).toEqual([])
  })

  it('🔴 une question qui n’en est pas une ; ⛔ une FAQ sans titre H2', () => {
    expect(rules(verifyEnrichment({ pass: 'faq', before: '', after: '<h2>FAQ</h2><h3>Le délai</h3><p>Quelques semaines.</p>' }))).toContain('risque:enrich-faq-not-question')
    expect(rules(verifyEnrichment({ pass: 'faq', before: '', after: '<h3>Le délai ?</h3><p>Quelques semaines.</p>' }))).toContain('technique:enrich-faq-malformed')
  })
})

// C7 — FR-CER-CHILD-FROM-PILLAR-H2 : une section dont est né un enfant se
// résume en 150 à 250 mots ; le détail (ses H3) vit dans l'article enfant.
describe('verifyEnrichment — passe Résumer', () => {
  const words = (n: number) => 'mot '.repeat(n).trim()
  const LONGUE = `<h2>Isoler les combles</h2><p>${words(300)}</p><h3>La laine soufflée</h3><p>${words(200)}</p><div data-block="valeur"><p>Un bloc de valeur.</p></div>`

  it('un résumé de 200 mots qui garde le H2 et quitte ses H3 : rien de bloquant', () => {
    const issues = verifyEnrichment({ pass: 'resumes', before: LONGUE, after: `<h2>Isoler les combles</h2><p>${words(200)}</p>` })
    expect(issues.filter(i => i.level !== 'attention')).toEqual([])
  })

  it('🔴 un résumé hors de 150 à 250 mots', () => {
    expect(rules(verifyEnrichment({ pass: 'resumes', before: LONGUE, after: `<h2>Isoler les combles</h2><p>${words(400)}</p>` }))).toContain('risque:enrich-summary-length')
    expect(rules(verifyEnrichment({ pass: 'resumes', before: LONGUE, after: `<h2>Isoler les combles</h2><p>${words(60)}</p>` }))).toContain('risque:enrich-summary-length')
  })

  it('⛔ le H2 change ; un bloc retiré n’est qu’une attention (il a sa place dans l’enfant)', () => {
    expect(rules(verifyEnrichment({ pass: 'resumes', before: LONGUE, after: `<h2>Autre titre</h2><p>${words(200)}</p>` }))).toContain('technique:enrich-headings-changed')
    const perdu = verifyEnrichment({ pass: 'resumes', before: LONGUE, after: `<h2>Isoler les combles</h2><p>${words(200)}</p>` }).find(i => i.rule === 'enrich-block-lost')
    expect(perdu?.level).toBe('attention')
  })
})

