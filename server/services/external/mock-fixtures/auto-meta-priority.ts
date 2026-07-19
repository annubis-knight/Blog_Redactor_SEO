/**
 * Fixture PRIORITAIRE pour POST /api/generate/meta.
 *
 * Le prompt meta embarque le HTML complet de l'article ({{articleContent}}),
 * qui collisionne avec des matchers content-based (generate-article-section via
 * `<h2>`, captain-ai-panel via `verdict`, ai-lexique-upfront via `lexique`…).
 * Importée EN PREMIER dans mock-fixtures/index.ts, elle résout le prompt meta
 * avant toute collision, via un matcher sur le texte d'instruction unique du
 * prompt (`generate-meta.md` ligne 1).
 */
import { registerStreamFixture } from '../mock.service.js'

registerStreamFixture(
  'generate-meta-priority',
  ({ userPrompt }) => /le meta title et la meta description/i.test(userPrompt),
  ({ userPrompt }) => {
    const kwMatch = userPrompt.match(/Mot-cl[eé] pilier\*\*\s*:\s*([^\n]{2,60})/i)
    const kw = (kwMatch?.[1] ?? 'sujet').trim()
    const cap = `${kw.charAt(0).toUpperCase()}${kw.slice(1)}`
    return JSON.stringify({
      metaTitle: `${cap} : le guide concret`.slice(0, 60),
      metaDescription:
        `Réussir ${kw} : méthode claire, actions prioritaires et résultats mesurables pour votre TPE locale.`.slice(0, 160),
    })
  },
)
