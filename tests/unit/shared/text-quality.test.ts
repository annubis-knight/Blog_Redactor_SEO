/**
 * FR-RED-DRAFT-SINGLE-PASS / FR-RED-DRAFT-TO-SOURCE — les défauts du pilier 1013
 * que rien ne détectait : phrases en anglais (hors « let me… »), paragraphes
 * répétés d'une section à l'autre, chiffres de 2024 sans source.
 */
import { describe, it, expect } from 'vitest'
import {
  countWordsHtml,
  detectNonFrenchSentences,
  detectRepeatedParagraphs,
  detectUnsourcedFigures,
  markUnsourcedFigures,
} from '../../../shared/text-quality'

describe('countWordsHtml', () => {
  it('compte les mots du texte visible, balises retirées', () => {
    expect(countWordsHtml('<h2>Deux mots</h2><p>et  trois <strong>de plus</strong></p>')).toBe(6)
  })
})

describe('detectNonFrenchSentences', () => {
  it('repère une phrase anglaise au milieu d’un texte français', () => {
    const html = '<p>Votre site doit convertir vos visiteurs en clients. This is the best way to grow your business with the right tools.</p>'
    expect(detectNonFrenchSentences(html)).toEqual(['This is the best way to grow your business with the right tools.'])
  })

  it('laisse passer le français, anglicismes métier compris', () => {
    const html = '<p>Le taux de conversion mesure la part des visiteurs qui passent à l’action. Un bon call-to-action et un site responsive y contribuent.</p>'
    expect(detectNonFrenchSentences(html)).toEqual([])
  })

  it('ignore les phrases trop courtes pour juger', () => {
    expect(detectNonFrenchSentences('<p>Check this.</p>')).toEqual([])
  })
})

describe('detectRepeatedParagraphs', () => {
  const para = 'Un site vitrine bien construit présente vos services, rassure vos prospects et les invite à vous contacter sans attendre.'

  it('repère un paragraphe recopié dans une autre section', () => {
    const html = `<h2>A</h2><p>${para}</p><h2>B</h2><p>Autre chose de différent pour cette section précise du texte.</p><h2>C</h2><p>${para}</p>`
    expect(detectRepeatedParagraphs(html)).toHaveLength(1)
  })

  it('repère une quasi-copie (quelques mots changés)', () => {
    const presque = para.replace('rassure vos prospects', 'rassure les prospects')
    expect(detectRepeatedParagraphs(`<p>${para}</p><p>${presque}</p>`)).toHaveLength(1)
  })

  it('ne confond pas deux paragraphes qui partagent seulement le sujet', () => {
    const autre = 'Le référencement local aide les artisans à être trouvés par les clients de leur quartier au moment où ils cherchent.'
    expect(detectRepeatedParagraphs(`<p>${para}</p><p>${autre}</p>`)).toEqual([])
  })

  it('voit les paragraphes fusionnés par <br> (la rédaction fusionne les <p> consécutifs)', () => {
    expect(detectRepeatedParagraphs(`<p>${para}<br>
Une autre idée, bien différente de la première, pour ce chapitre du texte.<br>
${para}</p>`)).toHaveLength(1)
  })

  it('ignore les paragraphes courts (titres de liste, transitions)', () => {
    expect(detectRepeatedParagraphs('<p>À retenir.</p><p>À retenir.</p>')).toEqual([])
  })
})

describe('detectUnsourcedFigures', () => {
  it('repère un pourcentage, un prix, un multiplicateur sans source', () => {
    const html = '<p>76 % des internautes consultent un site avant d’appeler. Un site coûte 3 000 € en moyenne. Le trafic est multiplié par 3 fois.</p>'
    expect(detectUnsourcedFigures(html)).toHaveLength(3)
  })

  it('accepte un chiffre attribué à une source', () => {
    expect(detectUnsourcedFigures('<p>Selon l’Insee, 42 % des TPE ont un site.</p>')).toEqual([])
    expect(detectUnsourcedFigures('<p>72 % des acheteurs lisent les avis, d’après BrightLocal.</p>')).toEqual([])
  })

  it('accepte un chiffre posé dans un marqueur « à sourcer »', () => {
    expect(detectUnsourcedFigures('<p>Une part importante <mark data-a-sourcer>[à sourcer : 70 % des clients comparent les avis]</mark> des clients compare.</p>')).toEqual([])
  })

  it('accepte le texte « [à sourcer : …] » resté sans sa balise (l’éditeur peut la perdre)', () => {
    expect(detectUnsourcedFigures('<p>Beaucoup d’artisans [à sourcer : 60 % des artisans] n’ont pas de site.</p>')).toEqual([])
  })

  it('ne prend pas un nombre ordinaire pour une statistique', () => {
    expect(detectUnsourcedFigures('<p>Voici 3 étapes pour lancer votre site en 2026.</p>')).toEqual([])
  })
})

// FR-RED-DRAFT-TO-SOURCE — recette réelle C8 du 2026-09-25 : malgré la consigne,
// le premier jet affirmait « 95 % des clients… », « +20 % de visibilité… ». Le
// serveur pose désormais un marqueur « à sourcer » sur toute phrase chiffrée
// sans source : aucun chiffre inventé n'est présenté comme un fait.
describe('markUnsourcedFigures', () => {
  it('pose un marqueur sur la phrase chiffrée sans source, et seulement elle', () => {
    const html = '<p>Votre fiche compte. Cet audit peut ajouter 20 % à votre visibilité locale. Commencez aujourd’hui.</p>'
    const marked = markUnsourcedFigures(html)
    expect(marked).toBe('<p>Votre fiche compte. <mark data-a-sourcer>[à sourcer : Cet audit peut ajouter 20 % à votre visibilité locale.]</mark> Commencez aujourd’hui.</p>')
    expect(detectUnsourcedFigures(marked)).toEqual([])
  })

  it('garde les balises en ligne de la phrase, dans les listes aussi', () => {
    const marked = markUnsourcedFigures('<ul><li>Un site coûte <strong>3 000 €</strong> en moyenne.</li></ul>')
    expect(marked).toBe('<ul><li><mark data-a-sourcer>[à sourcer : Un site coûte <strong>3 000 €</strong> en moyenne.]</mark></li></ul>')
  })

  it('ne touche ni un chiffre attribué, ni un marqueur existant, ni un nombre ordinaire, ni les titres', () => {
    const html = '<h2>Les 3 erreurs à éviter</h2><p>Selon l’Insee, 42 % des TPE ont un site. <mark data-a-sourcer>[à sourcer : 70 % des clients]</mark> comparent. Voici 3 étapes.</p>'
    expect(markUnsourcedFigures(html)).toBe(html)
  })
})
