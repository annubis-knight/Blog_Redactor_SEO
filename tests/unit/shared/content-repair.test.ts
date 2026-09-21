import { describe, it, expect } from 'vitest'
import {
  detectOrphanBlockText,
  removeSelfReviewBlocks,
  stripOrphanBlockText,
  trimTruncatedBlocks,
} from '../../../shared/content-repair'

// ============================================================================
// Texte orphelin : du texte nu hors de tout paragraphe.
// Forme exacte des fuites réelles de #455 : `…</p>Je vais rechercher…\n\n<h2>`
// ============================================================================

describe('detectOrphanBlockText', () => {
  it('repère le monologue placé entre deux blocs (cas réel #455)', () => {
    const html =
      '<p>Vous perdez des clients.</p>Je vais rechercher des informations actualisées.Maintenant je rédige la section demandée.\n\n<h2>Titre</h2>'
    expect(detectOrphanBlockText(html)).toEqual([
      'Je vais rechercher des informations actualisées.Maintenant je rédige la section demandée.',
    ])
  })

  it('repère une formulation que les motifs de phrase ne connaissent pas', () => {
    // Raison d'être de la détection structurelle : ce texte a échappé
    // à `detectAiMetaLeaks` sur l'article #456.
    const html = '<p>Fin.</p>Voici la rédaction de la section demandée :\n<h2>Suite</h2>'
    expect(detectOrphanBlockText(html)).toHaveLength(1)
  })

  it('repère l’auto-évaluation en Markdown de l’IA (cas réel #460)', () => {
    const html = '<p>Fin.</p>  ---  **Remarques de cohérence :**  ✅ **H1** : présent  <h2>Suite</h2>'
    expect(detectOrphanBlockText(html)).toEqual(['---  **Remarques de cohérence :**  ✅ **H1** : présent'])
  })

  it('repère le texte avant la première balise et après la dernière', () => {
    expect(detectOrphanBlockText('Voici la section :<h2>T</h2><p>a.</p> fin orpheline')).toEqual([
      'Voici la section :',
      'fin orpheline',
    ])
  })

  it('repère du texte nu directement dans une liste', () => {
    expect(detectOrphanBlockText('<ul><li>a</li> intrus <li>b</li></ul>')).toEqual(['intrus'])
  })

  describe('ne signale PAS le texte légitime', () => {
    const LEGIT = [
      '<p>Je vais vous montrer comment faire.</p>',
      '<p><strong>Gras</strong> et <em>italique</em> dans un paragraphe.</p>',
      '<ul><li>Un point <strong>important</strong> de la liste</li></ul>',
      '<blockquote>« Une citation directe. »</blockquote>',
      '<ul><li>Parent<ul><li>enfant</li></ul> suite du parent</li></ul>',
      '<h2>Titre</h2>\n\n<p>Texte.</p>\n',
      '',
    ]

    for (const html of LEGIT) {
      it(`« ${html.slice(0, 50) || '(vide)'} »`, () => {
        expect(detectOrphanBlockText(html)).toEqual([])
      })
    }
  })
})

describe('stripOrphanBlockText', () => {
  it('retire le texte orphelin et garde les retours à la ligne', () => {
    const { html, removed } = stripOrphanBlockText(
      '<p>a.</p>Je vais faire une recherche.\n\n<h2>T</h2>',
    )
    expect(html).toBe('<p>a.</p>\n\n<h2>T</h2>')
    expect(removed).toEqual(['Je vais faire une recherche.'])
  })

  it('laisse intact un contenu sain', () => {
    const input = '<h2>T</h2><p>Texte <strong>gras</strong>.</p>'
    expect(stripOrphanBlockText(input)).toEqual({ html: input, removed: [] })
  })
})

// ============================================================================
// Blocs tronqués : la génération s'arrêtait au plafond de tokens, en plein mot.
// ============================================================================

describe('trimTruncatedBlocks — paragraphes', () => {
  it('coupe à la dernière phrase complète (cas réel #455)', () => {
    const { html } = trimTruncatedBlocks(
      '<p>Un post coûte deux minutes à rédiger. Vo</p>',
    )
    expect(html).toBe('<p>Un post coûte deux minutes à rédiger.</p>')
  })

  it('supprime un paragraphe qui ne contient aucune phrase complète', () => {
    const { html, trimmed } = trimTruncatedBlocks(
      '<p>Complet.</p><p>Lorsque le NAP est constant, Google peut regrouper plus</p>',
    )
    expect(html).toBe('<p>Complet.</p>')
    expect(trimmed).toHaveLength(1)
  })

  it('retire aussi le fragment qui contient des balises', () => {
    const { html } = trimTruncatedBlocks(
      '<p>Comment ciblent-ils les mots-clés ? <strong>Avis et réputation</strong> — quelle est la tendance de leurs</p>',
    )
    expect(html).toBe('<p>Comment ciblent-ils les mots-clés ?</p>')
  })

  it('referme une balise laissée ouverte par la coupe', () => {
    const { html } = trimTruncatedBlocks('<p>Début <strong>fin de phrase. Suite coup</strong></p>')
    expect(html).toBe('<p>Début <strong>fin de phrase.</strong></p>')
  })

  it('ne confond pas un nombre décimal avec une fin de phrase', () => {
    const { html } = trimTruncatedBlocks('<p>Première phrase. Un ratio de 3.5 pour</p>')
    expect(html).toBe('<p>Première phrase.</p>')
  })

  describe('laisse intacts les paragraphes bien terminés', () => {
    const OK = [
      '<p>Une phrase normale.</p>',
      '<p>Une vraie question ?</p>',
      '<p>Voici la liste :</p>',
      '<p>« Une citation. »</p>',
      '<p>Selon France Num (2024).</p>',
      '<p>Un taux de 40 %</p>',
      '<p></p>',
    ]
    for (const html of OK) {
      it(`« ${html} »`, () => {
        expect(trimTruncatedBlocks(html).html).toBe(html)
      })
    }
  })
})

// ============================================================================
// Auto-évaluation de l'IA : parfois orpheline, parfois enfermée dans un <p>
// (cas réel #460, où le stripper d'orphelins ne pouvait pas l'atteindre).
// ============================================================================

describe('removeSelfReviewBlocks', () => {
  it('retire le bilan que l’IA s’adresse à elle-même (cas réel #460)', () => {
    const html =
      '<p>Vrai contenu.</p>\n<p>`\n✅ **Accroche douleur** : "Vous perdez 10-20h/semaine"\n✅ **Paragraphes courts** : maximum 2-3 phrases</p>\n<h2>Suite</h2>'
    const { html: out, removed } = removeSelfReviewBlocks(html)

    expect(out).toBe('<p>Vrai contenu.</p>\n\n<h2>Suite</h2>')
    expect(removed).toHaveLength(1)
  })

  it('garde une liste à coches destinée au lecteur (cas réel #455)', () => {
    const html = '<p>✅ Vous êtes éligible si vous avez un local ouvert au public.</p>'
    expect(removeSelfReviewBlocks(html)).toEqual({ html, removed: [] })
  })

  it('garde un paragraphe qui contient du gras Markdown sans bilan', () => {
    const html = '<p>Le **taux de conversion** est la mesure clé.</p>'
    expect(removeSelfReviewBlocks(html).removed).toEqual([])
  })

  it('repère aussi les notes de rédaction', () => {
    const html = '<p>**Notes de rédaction :** structure conforme au brief.</p>'
    expect(removeSelfReviewBlocks(html).removed).toHaveLength(1)
  })
})

describe('trimTruncatedBlocks — éléments de liste', () => {
  it('coupe la fin tronquée d’un élément de plusieurs phrases (cas réel #459)', () => {
    const { html } = trimTruncatedBlocks(
      '<ul><li>Testez au clavier. Le menu s’ouvre-t-il ? Le contenu est-il ann</li></ul>',
    )
    expect(html).toBe('<ul><li>Testez au clavier. Le menu s’ouvre-t-il ?</li></ul>')
  })

  it('laisse un libellé de liste sans point final (usage normal)', () => {
    const input = '<ul><li>Les guides et ressources téléchargeables</li></ul>'
    expect(trimTruncatedBlocks(input).html).toBe(input)
  })
})
