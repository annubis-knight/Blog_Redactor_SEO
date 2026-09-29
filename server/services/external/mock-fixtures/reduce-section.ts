/**
 * Fixture prioritaire — réduire une section trop longue (FR-RED-REDUCE-SECTION).
 *
 * POST /api/generate/reduce-section envoie en message utilisateur la consigne
 * `reduce-section.md` rendue, qui embarque la section à réduire entre
 * `<user-content>` et `</user-content>`. Importée avant les réponses reconnues à
 * un mot du message (une section qui cite « lexique », « radar » ou « meta
 * description » tombait sur l'une d'elles), elle se reconnaît au titre que ce
 * gabarit possède en propre.
 *
 * Elle rend ce qu'une bonne réduction doit être, d'après les règles du prompt :
 * la même section, titres, listes, liens et attributs intacts, sans les
 * transitions creuses (« Il est important de noter que », « En effet, »…) et
 * avec la moitié des phrases de chaque paragraphe simple. L'ancienne réponse ne
 * reconnaissait pas la consigne : chaque section devenait le texte générique,
 * sans ses titres, et l'article était enregistré ainsi.
 */
import { registerStreamFixture } from '../mock-registry.js'
import { sentences } from './prompt-fields.js'

const TRANSITIONS_CREUSES = /(?:Il est important de noter que|En effet,|Par ailleurs,|De plus,)\s+(\p{L})/gu
const ADVERBES_INUTILES = /\s(?:véritablement|particulièrement|effectivement|fondamentalement)(?=[\s,.])/gu

function condenserParagraphe(contenu: string): string {
  const net = contenu
    .replace(TRANSITIONS_CREUSES, (_m, lettre: string) => lettre.toUpperCase())
    .replace(ADVERBES_INUTILES, '')
  // Un paragraphe qui porte des balises (lien, mise en valeur, marqueur « à
  // sourcer ») garde toutes ses phrases : on ne coupe jamais au milieu d'une balise.
  if (net.includes('<')) return net
  const phrases = sentences(net)
  return phrases.length < 2 ? net : phrases.slice(0, Math.ceil(phrases.length / 2)).join(' ')
}

registerStreamFixture(
  'reduce-section',
  ({ userPrompt }) => /^# Réduction de section SEO$/m.test(userPrompt),
  ({ userPrompt }) => {
    const section = /<user-content>\n([\s\S]*?)\n<\/user-content>/.exec(userPrompt)?.[1]
    // Sans section lisible, une réponse vide : l'écran garde la section telle quelle.
    if (!section) return ''
    return section.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/g, (_m, attributs: string | undefined, contenu: string) =>
      `<p${attributs ?? ''}>${condenserParagraphe(contenu)}</p>`)
  },
)
