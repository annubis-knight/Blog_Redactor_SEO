/**
 * Mock fixture pour POST /api/generate/auto-intake (pipeline CLI `auto:article`).
 * Retourne un brief éditorial JSON déterministe, orienté PropulSite.
 */
import { registerStreamFixture } from '../mock.service.js'

registerStreamFixture(
  'auto-intake',
  ({ userPrompt, systemPrompt }) => /auto-intake/i.test(userPrompt) || /brief éditorial structuré/i.test(systemPrompt),
  () => JSON.stringify({
    articleTitle: 'Référencement local : rendre votre TPE visible sur Google',
    pilierKeyword: 'référencement local',
    painPoint: 'Des concurrents moins qualifiés captent les clients via Google faute de visibilité locale.',
    cible: 'Dirigeant de TPE/PME locale (5-50 salariés), impliqué mais sans expertise SEO interne.',
    douleur: 'Le site existe mais n\'apparaît pas dans les recherches locales : aucun lead entrant.',
    angle: 'Approche pédagogique et actionnable, chaque levier SEO local expliqué sans jargon.',
    promesse: 'Apparaître dans le top 3 local sur ses requêtes clés en 90 jours.',
    cta: 'Réserver un audit SEO local offert (1h, sans engagement).',
  }),
)
