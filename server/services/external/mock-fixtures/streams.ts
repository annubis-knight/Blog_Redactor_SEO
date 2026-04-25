/**
 * Mock stream fixtures.
 *
 * Simule les réponses des streams (POST /keywords/translate-pain, theme-parse,
 * captain AI panel, propose-lieutenants, ai-lexique-upfront, etc.). Chaque
 * fixture a un matcher qui identifie le contexte et un builder qui retourne
 * soit une chaîne complète, soit des chunks pré-découpés.
 */
import { registerStreamFixture } from '../mock.service.js'

// ---------------------------------------------------------------------------
// translate-pain — retourne un JSON { keywords: [{keyword, reasoning}] }
// ---------------------------------------------------------------------------
registerStreamFixture(
  'translate-pain',
  ({ userPrompt }) => /traduis cette douleur/i.test(userPrompt) || /douleur client en mots-clés/i.test(userPrompt),
  ({ userPrompt }) => {
    const painMatch = userPrompt.match(/"([^"]+)"/)
    const pain = (painMatch?.[1] ?? 'problème client').slice(0, 80)

    const json = {
      keywords: [
        { keyword: `résoudre ${pain}`, reasoning: 'Verbe d\'action direct, intention résolution' },
        { keyword: `solution ${pain}`, reasoning: 'Terme générique à fort volume' },
        { keyword: `${pain} que faire`, reasoning: 'Question naturelle, longue-traîne' },
        { keyword: `éviter ${pain}`, reasoning: 'Prévention, angle éditorial' },
        { keyword: `${pain} urgent`, reasoning: 'Variante transactionnelle' },
      ],
    }
    return JSON.stringify(json, null, 2)
  },
)

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
  ({ userPrompt }) => /capitaine|panel.*analyse|6 KPI|verdict/i.test(userPrompt),
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
// propose-lieutenants — JSON d'une liste de lieutenants recommandés
// ---------------------------------------------------------------------------
registerStreamFixture(
  'propose-lieutenants',
  ({ userPrompt }) => /lieutenants|propose.*mots-clés.*support/i.test(userPrompt),
  () => {
    const json = {
      lieutenants: [
        {
          keyword: 'plombier urgence toulouse',
          level: 'intermediaire',
          hnTitle: 'Intervention urgente à Toulouse',
          score: 85,
          reasoning: 'Forte intention transactionnelle locale, volume 320/mois.',
          priority: 'high',
        },
        {
          keyword: 'plombier chauffagiste toulouse',
          level: 'intermediaire',
          hnTitle: 'Plombier chauffagiste : double expertise',
          score: 78,
          reasoning: 'Élargit la surface sémantique sur le chauffage.',
          priority: 'high',
        },
        {
          keyword: 'dépannage fuite eau toulouse',
          level: 'specifique',
          hnTitle: 'Fuite d\'eau : réaction en 30 min',
          score: 72,
          reasoning: 'Longue-traîne niche, forte conversion.',
          priority: 'medium',
        },
      ],
      eliminated: [
        {
          keyword: 'plombier paris',
          reason: 'Hors zone géographique — cannibalisation impossible.',
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
  ({ userPrompt }) => /lexique|termes.*obligatoires|TF-?IDF/i.test(userPrompt),
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
