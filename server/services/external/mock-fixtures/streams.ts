/**
 * Mock stream fixtures.
 *
 * Simule les réponses des streams (theme-parse,
 * captain AI panel, propose-lieutenants, ai-lexique-upfront, etc.). Chaque
 * fixture a un matcher qui identifie le contexte et un builder qui retourne
 * soit une chaîne complète, soit des chunks pré-découpés.
 */
import { registerStreamFixture } from '../mock-registry.js'

// ---------------------------------------------------------------------------
// theme-parse — parse libre d'une description d'entreprise vers ThemeConfig
// ---------------------------------------------------------------------------
registerStreamFixture(
  'theme-parse',
  // Matcher restrictif : on cherche dans le userPrompt (qui contient le texte
  // libre fourni par l'utilisateur pour le parsing) — pas dans le systemPrompt
  // (qui peut contenir "avatar"/"positioning" pour d'autres routes).
  ({ userPrompt, systemPrompt }) =>
    /parse.*theme|theme.*config|extrait.*avatar|extrait.*positioning/i.test(userPrompt) ||
    /parse.*texte.*libre.*ThemeConfig/i.test(systemPrompt),
  () => {
    const config = {
      avatar: {
        sector: 'Services à la personne',
        targetCompanySize: 'TPE/PME',
        location: 'Toulouse',
      },
      positioning: {
        usp: 'Expertise locale + réactivité 24/7',
        targetAudience: 'Particuliers et professionnels toulousains',
      },
      offerings: {
        services: ['Dépannage urgence', 'Installation', 'Rénovation'],
        products: [],
      },
      brandVoice: {
        tone: 'Professionnel et rassurant',
        doNotSay: ['pas cher', 'gratuit'],
      },
    }
    return JSON.stringify(config, null, 2)
  },
)

// ---------------------------------------------------------------------------
// captain AI panel — réponse markdown riche pour l'analyse du capitaine
// ---------------------------------------------------------------------------
registerStreamFixture(
  'captain-ai-panel',
  // Calé sur le prompt système : le prompt utilisateur d'une rédaction de
  // section contient lui aussi le mot « capitaine » (le mot-clé de l'article y
  // est injecté), ce qui détournait toutes les générations d'article vers cette
  // fixture — l'article obtenu tenait alors en dix caractères.
  ({ userPrompt }) =>
    /capitaine|panel.*analyse|6 KPI|verdict/i.test(userPrompt)
    // Le gabarit de rédaction d'une section contient lui aussi le mot
    // « capitaine » (le mot-clé de l'article y est injecté) et arrivait ici en
    // premier : l'article généré tenait alors en dix caractères.
    && !/Section [aà] r[eé]diger|Sommaire complet de l'article/i.test(userPrompt),
  ({ userPrompt }) => {
    const kwMatch = userPrompt.match(/["«]([^"»]{3,60})["»]/)
    const kw = kwMatch?.[1] ?? 'mot-clé'
    return `## Analyse du Capitaine : **${kw}**

### Verdict
✅ **Bon choix de pilier** — volume solide, compétition modérée, intention claire.

### 6 KPIs interprétés
- **Volume (6 600/mois)** : forte demande récurrente.
- **Difficulté (10/100)** : accessible pour un site neuf.
- **CPC (6,91 €)** : marché rémunérateur, les concurrents investissent.
- **Compétition (0,57)** : concurrentiel sans être saturé.
- **Intention** : commerciale dominante (0,95) — idéal pour conversions.
- **PAA disponibles** : 8 questions — opportunité de structurer un article FAQ.

### Angle éditorial recommandé
Aborder en pilier informationnel (*guide complet*) puis décliner en sous-articles transactionnels.

### Risque
Aucune alerte. Le terrain est sain.`
  },
)

// ---------------------------------------------------------------------------
// lieutenants-hn-structure — JSON { hnStructure: [...], justification }
// IMPORTANT : enregistré AVANT 'propose-lieutenants' pour priorité de match.
// Le user prompt commence par "Recommande une structure Hn".
// ---------------------------------------------------------------------------
registerStreamFixture(
  'lieutenants-hn-structure',
  ({ userPrompt }) => /Recommande une structure Hn/i.test(userPrompt),
  ({ userPrompt }) => {
    // Extrait les lieutenants pour les inclure naturellement dans la HN.
    const ltMatch = userPrompt.match(/Lieutenants?:\s*(.+?)$/im)
    const lieutenants = ltMatch
      ? ltMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      : ['lieutenant exemple 1', 'lieutenant exemple 2']

    const kwMatch = userPrompt.match(/article "([^"]+)"/i)
    const captain = kwMatch?.[1] ?? 'sujet principal'

    const json = {
      hnStructure: [
        { level: 1, text: `${captain} : guide complet (mock)` },
        ...lieutenants.slice(0, 6).map((lt, i) => ({
          level: 2,
          text: `${lt.charAt(0).toUpperCase()}${lt.slice(1)}`,
          children: i === 0
            ? [{ level: 3, text: `${lt} — détails et bonnes pratiques` }]
            : undefined,
        })),
        { level: 2, text: 'Foire aux questions (FAQ)' },
      ],
      justification: 'Structure générée par le provider mock — chaque lieutenant fourni a été placé en H2, le premier dispose d\'un sous-H3 d\'illustration. À remplacer par un appel réel pour de la production.',
    }
    return JSON.stringify(json, null, 2)
  },
)

// ---------------------------------------------------------------------------
// propose-lieutenants — JSON d'une liste de lieutenants recommandés
// Matcher resserré sur "Propose les meilleurs lieutenants" (user prompt
// exact dans la route) pour éviter les collisions avec d'autres fixtures
// qui mentionnent le mot "lieutenants" (ex: lieutenants-hn-structure).
// ---------------------------------------------------------------------------
registerStreamFixture(
  'propose-lieutenants',
  ({ userPrompt }) => /Propose les meilleurs lieutenants|propose.*mots-clés.*support/i.test(userPrompt),
  ({ userPrompt }) => {
    // Les lieutenants dérivent du capitaine demandé (T4, épopée qualité SEO) :
    // une proposition figée « plombier » rendait les parcours incohérents et
    // aveugles aux portes (cannibalisation, lieutenant = capitaine).
    const captain = (userPrompt.match(/"([^"]+)"/)?.[1] ?? 'mot-clé principal').trim().toLowerCase()
    const json = {
      lieutenants: [
        {
          keyword: `prix ${captain}`,
          level: 'intermediaire',
          hnTitle: `Combien coûte ${captain} ?`,
          score: 85,
          reasoning: 'Question de budget posée avant tout achat : forte intention.',
          priority: 'high',
        },
        {
          keyword: `${captain} avis`,
          level: 'intermediaire',
          hnTitle: `Ce qu'en disent les clients`,
          score: 78,
          reasoning: 'Recherche de réassurance, présente dans les questions « Autres questions ».',
          priority: 'high',
        },
        {
          keyword: `comment choisir ${captain}`,
          level: 'specifique',
          hnTitle: 'Les critères pour bien choisir',
          score: 72,
          reasoning: 'Longue traîne de décision, titres récurrents chez les concurrents.',
          priority: 'medium',
        },
      ],
      eliminated: [
        {
          keyword: `${captain} gratuit`,
          reason: 'Intention sans valeur commerciale pour ce site.',
        },
      ],
    }
    return JSON.stringify(json, null, 2)
  },
)

// ---------------------------------------------------------------------------
// ai-lexique-upfront — recommandations de termes lexicaux
// ---------------------------------------------------------------------------
registerStreamFixture(
  'ai-lexique-upfront',
  ({ userPrompt }) =>
    /lexique|termes.*obligatoires|TF-?IDF/i.test(userPrompt)
    // `lexique-suggest` attend un tableau de termes, pas des recommandations :
    // il a sa propre fixture (`lexique-suggest-array`).
    && !/g[eé]n[eè]re le lexique LSI/i.test(userPrompt),
  () => {
    const json = {
      recommendations: [
        { term: 'intervention', category: 'obligatoire', reasoning: 'Mot-pivot du secteur service.' },
        { term: 'urgence', category: 'obligatoire', reasoning: 'Intent driver principal.' },
        { term: 'devis gratuit', category: 'différenciateur', reasoning: 'Angle conversion.' },
        { term: 'artisan certifié', category: 'différenciateur', reasoning: 'Signal trust.' },
        { term: '24/7', category: 'optionnel', reasoning: 'Attendu mais banal.' },
      ],
      missing: ['garantie décennale', 'assurance responsabilité'],
      summary: 'Le lexique actuel est complet sur l\'intention mais manque les termes de réassurance (garanties, certifications).',
    }
    return JSON.stringify(json, null, 2)
  },
)

// ---------------------------------------------------------------------------
// intent-keywords (Radar generate prompt fallback, si passait en stream)
// ---------------------------------------------------------------------------
registerStreamFixture(
  'intent-keywords-fallback',
  ({ userPrompt }) => /radar|résonance|short-?tail.*20/i.test(userPrompt),
  () => {
    const json = {
      keywords: Array.from({ length: 10 }, (_, i) => ({
        keyword: `mot-clé résonance ${i + 1}`,
        reasoning: `Angle ${i + 1} : simulation mock provider.`,
      })),
    }
    return JSON.stringify(json, null, 2)
  },
)


/**
 * `POST /keywords/lexique-suggest` — la route fait `JSON.parse(...) as string[]`
 * et son prompt réclame explicitement `["terme1", "terme2", …]`. La fixture des
 * recommandations de Lexique captait ce prompt et rendait un objet : le contrat
 * de l'endpoint n'était jamais respecté en mode simulé.
 */
registerStreamFixture(
  'lexique-suggest-array',
  ({ userPrompt }) => /g[eé]n[eè]re le lexique LSI/i.test(userPrompt),
  () => JSON.stringify([
    'intervention rapide',
    'devis gratuit',
    'artisan certifié',
    'dépannage urgence',
    'tarif transparent',
    'garantie décennale',
    'déplacement offert',
    'intervention 24h',
    'diagnostic gratuit',
    'entreprise locale',
  ]),
)
