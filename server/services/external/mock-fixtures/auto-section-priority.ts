/**
 * Fixture prioritaire — rédaction d'une section d'article.
 *
 * Même motif que `auto-meta-priority.ts` : le gabarit `generate-article-section.md`
 * rassemble tout le contexte de l'article — mot-clé Capitaine, Lieutenants,
 * termes du Lexique, sommaire. Il déclenche donc les matchers de presque toutes
 * les autres fixtures (`captain-ai-panel` sur « capitaine », `ai-lexique-upfront`
 * sur « lexique »…), dont l'une répondait à sa place : l'article généré tenait
 * en dix caractères et le parcours de bout en bout ne pouvait pas aboutir.
 *
 * Importée EN PREMIER dans `index.ts`, cette fixture résout le prompt de section
 * avant toute collision, sur le seul titre de section que ce gabarit possède en
 * propre (`## Section à rédiger`, unique dans `server/prompts/`).
 */
import { registerStreamFixture } from '../mock-registry.js'

registerStreamFixture(
  'auto-section-priority',
  ({ userPrompt }) => /##\s*Section [aà] r[eé]diger/i.test(userPrompt),
  ({ userPrompt }) => {
    const titre = userPrompt.match(/H2\s*:\s*([^\n]{5,120})/i)?.[1]?.trim()
      ?? userPrompt.match(/##\s*Section [aà] r[eé]diger\s*\n+[-*\s]*\*{0,2}Titre\*{0,2}\s*:?\s*([^\n]{5,120})/i)?.[1]?.trim()
      ?? 'Section'

    return [
      `<h2>${titre}</h2>\n`,
      `<p>Pour un dirigeant de TPE, la question se pose rarement en termes techniques. `,
      `Elle se pose en termes de résultat : le site rapporte-t-il des demandes de devis, oui ou non ?</p>\n\n`,
      `<p>Prenons un cas concret. Un artisan toulousain met son site en ligne, attend six mois, `,
      `et ne reçoit rien. Le problème n'est presque jamais le design : c'est que personne ne cherche `,
      `les mots qu'il a écrits, ou que la page ne répond pas à la question posée.</p>\n\n`,
      `<h3>Ce qu'il faut vérifier en premier</h3>\n`,
      `<ul>\n`,
      `  <li>Le mot-clé principal apparaît-il dans le titre et dans les premières lignes ?</li>\n`,
      `  <li>La page répond-elle à la question que se pose vraiment le visiteur ?</li>\n`,
      `  <li>Sait-on quoi faire en arrivant au bas de la page ?</li>\n`,
      `</ul>\n\n`,
      `<p>Ces trois points se contrôlent en une dizaine de minutes, sans outil payant `,
      `et sans prestataire. C'est le meilleur rapport effort/résultat pour commencer.</p>\n`,
    ]
  },
)
