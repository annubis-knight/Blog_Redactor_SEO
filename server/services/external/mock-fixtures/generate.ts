/**
 * Mock fixtures pour le workflow Rédaction · Generate.
 *
 * Couvre :
 *   - generate/structure (pilier + intermédiaires)
 *   - generate/paa-queries (PAA enrichment)
 *   - generate/specialises (articles spécialisés ciblant PAA)
 *   - generate/article (HTML par section, stream)
 *   - generate/article-meta (meta title + description)
 *   - generate/micro-context-suggest (angle + tone + directives)
 *   - generate/humanize-section
 *   - generate/reduce-section
 */
import { registerStreamFixture, registerToolFixture } from '../mock.service.js'

// ---------------------------------------------------------------------------
// Tool fixtures (JSON structuré)
// ---------------------------------------------------------------------------

registerToolFixture('generate_article_structure', ({ userPrompt }) => {
  const themeMatch = userPrompt.match(/cocon\s*:?\s*"?([^"\n]{3,80})/i)
  const theme = themeMatch?.[1]?.trim() ?? 'thème'
  return {
    pillar: {
      title: `Guide complet : ${theme}`,
      type: 'Pilier',
      angle: 'Vue d\'ensemble pédagogique',
    },
    intermediates: [
      { title: `Comment démarrer avec ${theme}`, type: 'Intermédiaire', topic: 'getting-started' },
      { title: `Erreurs fréquentes à éviter dans ${theme}`, type: 'Intermédiaire', topic: 'pitfalls' },
      { title: `Outils recommandés pour ${theme}`, type: 'Intermédiaire', topic: 'tools' },
      { title: `Mesurer la performance de ${theme}`, type: 'Intermédiaire', topic: 'measurement' },
    ],
  }
})

registerToolFixture('generate_paa_queries', () => ({
  paaQueries: [
    'Comment commencer ?',
    'Combien ça coûte ?',
    'Quels sont les meilleurs outils ?',
    'Combien de temps pour voir des résultats ?',
    'Faut-il faire appel à un prestataire ?',
  ],
}))

registerToolFixture('generate_specialised_articles', ({ userPrompt }) => {
  const paaMatches = userPrompt.match(/[-•*]\s+([^\n?]{5,80}\?)/g) ?? []
  const paas = paaMatches.map(m => m.replace(/^[-•*]\s+/, '').trim()).slice(0, 5)
  return {
    articles: paas.map((paa, i) => ({
      title: paa,
      type: 'Spécialisé',
      topic: 'paa-targeted',
      paaTarget: paa,
      reasoning: `Article spécialisé répondant à la question fréquente n°${i + 1}.`,
    })),
  }
})

// ---------------------------------------------------------------------------
// Stream fixtures
// ---------------------------------------------------------------------------

// micro-context-suggest
registerStreamFixture(
  'micro-context-suggest',
  ({ userPrompt }) => /micro[-\s]context|angle.*diff[eé]renciant|tone.*directive/i.test(userPrompt),
  () => {
    const json = {
      angle: 'Approche pratique avec mini-cas concrets et checklist actionnable en fin d\'article.',
      tone: 'Pédagogique, direct, sans jargon. Tutoiement amical mais professionnel.',
      directives: [
        'Inclure 1 mini-cas client par grand chapitre',
        'Terminer par une checklist actionnable',
        'Pas de promesses absolues — toujours nuancer',
      ],
      targetWordCount: 1800,
    }
    return JSON.stringify(json, null, 2)
  },
)

// generate/article — section par section
registerStreamFixture(
  'generate-article-section',
  ({ userPrompt }) => /section\s*\d|<h2>|g[eé]n[eé]rer.*section/i.test(userPrompt),
  ({ userPrompt }) => {
    const titleMatch = userPrompt.match(/H2\s*:\s*([^\n]{5,120})/i)
    const title = titleMatch?.[1]?.trim() ?? 'Section'
    return [
      `<h2>${title}</h2>\n`,
      `<p>Premier paragraphe de la section "${title}". `,
      `Il pose le contexte et introduit les points-clés.</p>\n\n`,
      `<p>Deuxième paragraphe. On entre dans le détail concret avec un exemple chiffré : `,
      `selon les retours de PME locales, environ <strong>62 %</strong> améliorent leur trafic dans les 90 jours.</p>\n\n`,
      `<ul>\n  <li>Action 1 : auditer la situation actuelle</li>\n  <li>Action 2 : prioriser les chantiers</li>\n  <li>Action 3 : mesurer les progrès chaque semaine</li>\n</ul>\n`,
    ]
  },
)

// generate/article-meta
registerStreamFixture(
  'generate-article-meta',
  ({ userPrompt }) => /meta[-\s]?(title|description|tag)|seo.*meta/i.test(userPrompt),
  ({ userPrompt }) => {
    const kwMatch = userPrompt.match(/keyword\s*:?\s*"?([^"\n]{3,60})/i)
    const kw = (kwMatch?.[1] ?? 'sujet').trim()
    const json = {
      metaTitle: `${kw.charAt(0).toUpperCase()}${kw.slice(1)} : guide complet 2026`,
      metaDescription: `Découvrez comment maîtriser ${kw} en 90 jours. Méthodes éprouvées, outils gratuits et plan d'action prêt à l'emploi pour les PME locales.`,
    }
    return JSON.stringify(json, null, 2)
  },
)

// humanize-section
registerStreamFixture(
  'humanize-section',
  ({ userPrompt }) => /humanise|humanize|rendre.*plus.*humain|moins\s+robotique/i.test(userPrompt),
  ({ userPrompt }) => {
    // Récupère le HTML d'origine pour le retourner légèrement modifié
    const htmlMatch = userPrompt.match(/<h2>[\s\S]+?<\/(?:p|ul|ol)>/)
    const html = htmlMatch?.[0] ?? '<p>Contenu humanisé via mock.</p>'
    return html
      .replace(/<p>([A-Z])/, (_m, c) => `<p>Tu sais quoi ? ${c.toLowerCase()}`)
      .replace(/\.<\/p>/, '. Tu vois l\'idée ?</p>')
  },
)

// reduce-section
registerStreamFixture(
  'reduce-section',
  ({ userPrompt }) => /r[eé]duire.*section|raccourcir|trim/i.test(userPrompt),
  ({ userPrompt }) => {
    const htmlMatch = userPrompt.match(/<h2>[\s\S]+?<\/(?:p|ul|ol)>/)
    const html = htmlMatch?.[0] ?? '<p>Contenu réduit.</p>'
    // Garde le H2 + 1 seul paragraphe synthétique
    const titleMatch = html.match(/<h2>([^<]+)<\/h2>/)
    const title = titleMatch?.[1] ?? 'Section'
    return `<h2>${title}</h2>\n<p>Version condensée : on ne garde que l'essentiel. Action principale : auditer puis prioriser.</p>\n`
  },
)

// recommend_word_count — conseille longueur article basée sur SERP + sommaire HN
registerToolFixture('recommend_word_count', ({ userPrompt }) => {
  // Extrait moyenne SERP du prompt
  const serpMatch = userPrompt.match(/Moyenne SERP[^:]*:\s*(\d+)\s*mots/i)
  const serpAvg = serpMatch ? Number(serpMatch[1]) : null

  // Extrait type article et bornes
  const boundsMatch = userPrompt.match(/bornes recommandées\s*:\s*(\d+)\s*-\s*(\d+)/i)
  const min = boundsMatch ? Number(boundsMatch[1]) : 1200
  const max = boundsMatch ? Number(boundsMatch[2]) : 2500

  // Compte H2 + H3 dans le sommaire
  const h2Count = (userPrompt.match(/^H2\s*:/gm) ?? []).length
  const h3Count = (userPrompt.match(/^H3\s*:/gm) ?? []).length

  // Heuristique mock : base = mid bornes, +150/H2 +80/H3, calé entre serpAvg et bornes max
  const baseMid = Math.round((min + max) / 2)
  let recommended = baseMid + h2Count * 150 + h3Count * 80
  if (serpAvg && serpAvg > 0) {
    // Pondère vers la moyenne SERP (60%) si elle existe
    recommended = Math.round(0.6 * serpAvg + 0.4 * recommended)
  }
  recommended = Math.max(min, Math.min(max, recommended))

  const reasoning = serpAvg
    ? `${h2Count} H2 + ${h3Count} H3 alignés avec la moyenne SERP (${serpAvg} mots) → ${recommended} mots conseillés.`
    : `${h2Count} H2 + ${h3Count} H3 sur la base ${min}-${max} → ${recommended} mots conseillés.`

  return { recommendedWordCount: recommended, reasoning }
})

// lexique-suggest — route stream qui attend un JSON array de strings
registerStreamFixture(
  'lexique-suggest',
  ({ userPrompt }) => /lexique\s+LSI|lexique.*mot-cl[eé]/i.test(userPrompt),
  () => JSON.stringify([
    'intervention rapide',
    'devis gratuit',
    'artisan certifié',
    'garantie décennale',
    'dépannage 24/7',
    'tarif horaire',
    'réparation urgente',
    'installation conforme',
    'normes DTU',
    'savoir-faire local',
  ]),
)
