# Cartographie des fonctionnalités IA

Ce document liste **toutes les fonctionnalités qui utilisent l'API IA** (Claude / Gemini / OpenRouter / Mock), leurs modèles par défaut, et où les modifier.

---

## 🔧 Configuration globale

### `.env` — variables d'environnement

| Variable | Défaut | Usage |
|---|---|---|
| `AI_PROVIDER` | `claude` | Provider actif : `claude` \| `gemini` \| `openrouter` \| `mock` |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Modèle Claude **par défaut** pour les streams libres (ex. génération d'article) |
| `HAIKU_MODEL` | `claude-haiku-4-5-20251001` | Modèle Claude **rapide** pour les tools légers (radar/generate) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Modèle Gemini par défaut |
| `OPENROUTER_MODEL` | `meta-llama/llama-3.3-70b-instruct:free` | Modèle OpenRouter (suffixe `:free` obligatoire) |
| `AI_PROVIDER_NO_FALLBACK` | _vide_ | Si `=1`, désactive le fallback auto provider |

### Architecture du dispatcher

Tous les appels IA passent par [`ai-provider.service.ts`](../server/services/external/ai-provider.service.ts) qui route vers le bon provider selon `AI_PROVIDER`. Il existe **2 fonctions universelles** :

- `classifyWithTool<T>()` — réponse JSON structurée (forced tool use côté Claude, schema-hint côté Gemini/OpenRouter)
- `streamChatCompletion()` — stream SSE de texte libre

---

## 📋 Tableau : endpoints qui utilisent l'IA

Lignes grisées = `classifyWithTool` (JSON structuré). Lignes normales = `streamChatCompletion` (texte libre).

### Moteur — Discovery

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Classement pertinence keywords | `POST /keywords/relevance-score` | [keywords.routes.ts:686](../server/routes/keywords.routes.ts) | `classifyWithTool` (tool `classify_relevance`) | `CLAUDE_MODEL` env (sinon `claude-sonnet-4-6`) | `.env::CLAUDE_MODEL` ou 4e arg `classifyWithTool(..., { model: 'xxx' })` |
| Curation shortlist Discovery | `POST /keywords/analyze-discovery` | [keywords.routes.ts:814](../server/routes/keywords.routes.ts) | `classifyWithTool` (tool `curate_keywords`) | `CLAUDE_MODEL` env | idem |
| Traduction douleur → keywords | `POST /keywords/translate-pain` | [keywords.routes.ts:446](../server/routes/keywords.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Suggestion lexique LSI | `POST /keywords/lexique-suggest` | [keywords.routes.ts:411](../server/routes/keywords.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |

### Moteur — Radar

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Génération keywords radar | `POST /keywords/radar/generate` | [keyword-radar.service.ts:46](../server/services/keyword/keyword-radar.service.ts) | `classifyWithTool` (tool `generate_radar_keywords`) | **`HAIKU_MODEL` env** (sinon `claude-haiku-4-5-20251001`) | `.env::HAIKU_MODEL` OU ligne 46 du service |

### Moteur — Capitaine

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| AI Panel (analyse stratégique capitaine) | `POST /keywords/:keyword/ai-panel` | [keyword-ai-panel.routes.ts:78](../server/routes/keyword-ai-panel.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | `.env::CLAUDE_MODEL` |
| Classification intent | `POST /intent/analyze` → IA interne | [intent.service.ts:186](../server/services/intent/intent.service.ts) | `classifyWithTool` (tool `classify_intent`) | `CLAUDE_MODEL` env (+ `maxTokens: 256`) | `.env::CLAUDE_MODEL` ou arg 4 `classifyWithTool(..., { model: 'xxx', maxTokens: 256 })` |

### Moteur — Lieutenants

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Propositions lieutenants (stream structuré JSON) | `POST /keywords/:keyword/propose-lieutenants` | [keyword-ai-panel.routes.ts:279](../server/routes/keyword-ai-panel.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Structure HN (stream) | `POST /keywords/:keyword/ai-hn-structure` | [keyword-ai-panel.routes.ts:138](../server/routes/keyword-ai-panel.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |

### Moteur — Lexique

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Lexique upfront (IA recommandations) | `POST /keywords/:keyword/ai-lexique-upfront` | [keyword-ai-panel.routes.ts:472](../server/routes/keyword-ai-panel.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Lexique détaillé | `POST /keywords/:keyword/ai-lexique` | [keyword-ai-panel.routes.ts:397](../server/routes/keyword-ai-panel.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |

### Cerveau — ThemeConfig + Stratégie

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Parse texte libre → ThemeConfig | `POST /theme/config/parse` | [silos.routes.ts:111](../server/routes/silos.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | `.env::CLAUDE_MODEL` |
| Suggestion étape cocon | `POST /strategy/cocoon/:slug/suggest` | [strategy.routes.ts:223](../server/routes/strategy.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Suggestion étape article | `POST /strategy/:id/suggest` | [strategy.routes.ts:438](../server/routes/strategy.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Deepen (sous-question) | `POST /strategy/cocoon/:slug/deepen` + `/strategy/:id/deepen` | [strategy.routes.ts:485](../server/routes/strategy.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Consolidate | `POST /strategy/cocoon/:slug/consolidate` + `/strategy/:id/consolidate` | [strategy.routes.ts:529](../server/routes/strategy.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Enrich | `POST /strategy/cocoon/:slug/enrich` + `/strategy/:id/enrich` | [strategy.routes.ts:570](../server/routes/strategy.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |

### Rédaction — Génération de contenu

| Fonctionnalité | Route | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Génération outline (sommaire) | `POST /generate/outline` | [generate.routes.ts:191](../server/routes/generate.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Génération article section-by-section | `POST /generate/article` | [generate.routes.ts:538](../server/routes/generate.routes.ts) | `streamChatCompletion` (avec `WEB_SEARCH_TOOL` optionnel) | `CLAUDE_MODEL` env | idem |
| Génération meta (title + description) | `POST /generate/meta` | [generate.routes.ts:891](../server/routes/generate.routes.ts) | `streamChatCompletion` (`maxTokens: 1024`) | `CLAUDE_MODEL` env | idem |
| Réduction de section | `POST /generate/reduce-section` | [generate.routes.ts:676](../server/routes/generate.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Humanisation de section (2 passes) | `POST /generate/humanize-section` | [generate.routes.ts:773, 804](../server/routes/generate.routes.ts) | `streamChatCompletion` × 2 | `CLAUDE_MODEL` env | idem |
| Actions contextuelles (reformuler, ajouter exemple...) | `POST /generate/action` | [generate.routes.ts:994](../server/routes/generate.routes.ts) | `streamChatCompletion` (avec tools) | `CLAUDE_MODEL` env | idem |
| Suggestion micro-context | `POST /generate/micro-context-suggest` | [generate.routes.ts:1060](../server/routes/generate.routes.ts) | `streamChatCompletion` | `CLAUDE_MODEL` env | idem |
| Brief-explain (explication guidée) | `POST /generate/brief-explain` | [generate.routes.ts:1152](../server/routes/generate.routes.ts) | `streamChatCompletion` (`maxTokens: 4096`) | `CLAUDE_MODEL` env | idem |

### Services transverses

| Fonctionnalité | Route / service | Fichier:ligne | Type appel | Modèle par défaut | Où changer |
|---|---|---|---|---|---|
| Content gap analysis (competitors + themes) | `POST /content-gap/analyze` → service | [content-gap.service.ts:83](../server/services/article/content-gap.service.ts) | `classifyWithTool` (tool `analyze_content_gap`, `maxTokens: 1024`) | `CLAUDE_MODEL` env | `.env::CLAUDE_MODEL` ou arg 4 |
| Recommandation longueur article (IA avec SERP + HN) | `POST /articles/:id/recommend-word-count` → service | [target-word-count.service.ts:110](../server/services/article/target-word-count.service.ts) | `classifyWithTool` (tool `recommend_word_count`, `maxTokens: 256`) | `CLAUDE_MODEL` env | idem |

---

## 🎯 Résumé des fichiers clés à modifier

### Pour **changer le modèle Claude par défaut** (applique à tout sauf radar/generate)
```bash
# .env
CLAUDE_MODEL=claude-sonnet-4-6      # ou claude-haiku-4-5-20251001 pour plus rapide
```

### Pour **changer le modèle Haiku** (radar/generate uniquement — optimisé coût)
```bash
# .env
HAIKU_MODEL=claude-haiku-4-5-20251001
```

Ou directement dans [server/services/keyword/keyword-radar.service.ts:46](../server/services/keyword/keyword-radar.service.ts) :
```ts
const model = process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001'  // ← ici
```

### Pour **changer le fallback Claude** (si aucun modèle défini nulle part)
[server/services/external/claude.service.ts:124](../server/services/external/claude.service.ts) :
```ts
const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'  // ← ici
```

### Pour **utiliser Haiku sur un endpoint précis** (au lieu de Sonnet par défaut)
Dans le service/route concerné, passer `{ model: 'claude-haiku-4-5-20251001' }` en 4e arg de `classifyWithTool` :

```ts
// Exemple : content-gap.service.ts:83
const { result, usage } = await classifyWithTool<ContentGapPayload>(
  systemPrompt,
  userPrompt,
  { name: 'analyze_content_gap', description: '...', input_schema: {...} },
  { model: 'claude-haiku-4-5-20251001', maxTokens: 1024 },   // ← forcer Haiku ici
)
```

### Pour **changer le modèle Gemini / OpenRouter**
```bash
# .env
GEMINI_MODEL=gemini-2.0-flash         # ou gemini-2.5-pro, gemini-2.5-flash
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free   # suffixe :free obligatoire
```

---

## 📊 Coûts indicatifs (Claude)

D'après [claude.service.ts:19-21](../server/services/external/claude.service.ts) :

| Modèle | Input $/M tokens | Output $/M tokens | Usage recommandé |
|---|---|---|---|
| `claude-haiku-4-5-20251001` | $0.80 | $4.00 | Tools légers, radar/generate (1-2k tokens output) |
| `claude-sonnet-4-5-20250514` | $3.00 | $15.00 | Génération article, analyse stratégique |
| `claude-sonnet-4-6` | $3.00 | $15.00 | Défaut actuel |

**Coût typique par fonctionnalité** (observé pendant les tests) :
- `radar/generate` avec Haiku : **~$0.003** (1255 input + 584 output tokens)
- `analyze-discovery` avec Sonnet : **~$0.02-0.04**
- `generate/article` (pilier complet) avec Sonnet : **~$0.10-0.30**

---

## 🧪 Tester sans coût : `AI_PROVIDER=mock`

Pour le développement quotidien et les tests, mettre :
```bash
# .env
AI_PROVIDER=mock
```

Toutes les fonctions IA retournent alors des fixtures déterministes définies dans [mock-fixtures/](../server/services/external/mock-fixtures/). Voir [testing-guide.md §4](./testing-guide.md#4-le-mock-provider-ia-pas-dappel-réseau).

---

## 📚 Pile d'activité (cost log) — propagation du coût

Chaque requête IA doit remonter son **coût** (`usage`) à la pile d'activité affichée dans le panneau flottant coin bas-droite ([CostLogPanel.vue](../src/components/shared/CostLogPanel.vue)).

### Architecture

```
                      Route backend
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
    SSE stream                        JSON response
    (event: done)                     { data, usage }
         │                                   │
         ▼                                   ▼
   useStreaming.ts                    api.service.ts
 (onUsage → costLog)               (pushUsageIfPresent)
         │                                   │
         └───────────────┬───────────────────┘
                         ▼
                 costLogStore.addEntry(label, usage)
                         │
                         ▼
                   CostLogPanel.vue
```

### 2 flux distincts mais symétriques

**Flux 1 — Routes SSE** (stream texte envoyé en direct au navigateur)
- Serveur : émet `event: done\ndata: { ..., usage }` en fin de stream
- Client : [useStreaming.ts:112-114](../src/composables/editor/useStreaming.ts) capture `parsed.usage` → `pushCostEntry(url, usage)`
- Routes concernées : `/generate/*`, `/keywords/:kw/ai-panel`, `/keywords/:kw/propose-lieutenants`, `/keywords/:kw/ai-lexique-upfront`, etc.

**Flux 2 — Routes JSON wrappé** (serveur consomme le stream, renvoie un JSON final)
- Serveur : utilise [collectStreamWithUsage()](../server/utils/stream-usage.ts) pour extraire le sentinel `__USAGE__{...}` puis `res.json({ data: { ..., usage } })`
- Client : [api.service.ts::pushUsageIfPresent](../src/services/api.service.ts) détecte `data.usage` et le pousse automatiquement dans la pile
- Routes concernées : `/strategy/cocoon/:slug/{suggest,deepen,consolidate,enrich}`, `/strategy/:id/*`, `/theme/config/parse`, `/keywords/translate-pain`, `/keywords/lexique-suggest`, `/keywords/relevance-score`, `/keywords/analyze-discovery`, `/articles/:id/recommend-word-count`, `/keywords/radar/generate`

### Labels humains (point unique)

[src/utils/api-label.ts](../src/utils/api-label.ts) — 1 seul fichier à éditer pour ajouter/renommer les labels. Utilisé par **useStreaming** ET **api.service** → pas de duplication.

Exemple d'ajout :
```ts
const URL_LABELS: [RegExp, string][] = [
  // ... entrées existantes
  [/\/ma\/nouvelle\/route/, 'Ma nouvelle route'],
]
```

### Helper côté serveur : `collectStreamWithUsage`

Fichier : [server/utils/stream-usage.ts](../server/utils/stream-usage.ts)

À utiliser **systématiquement** dans les routes qui consomment un stream et renvoient un JSON wrappé :

```ts
// ❌ MAUVAIS — usage jeté
let content = ''
for await (const chunk of streamChatCompletion(prompt, user, 1024)) {
  if (chunk.startsWith(USAGE_SENTINEL)) break   // ← perdu
  content += chunk
}
res.json({ data: { content } })

// ✅ BON — usage remonté
import { collectStreamWithUsage } from '../utils/stream-usage.js'

const { text: content, usage } = await collectStreamWithUsage(prompt, user, 1024)
res.json({ data: { content, usage } })
```

### Vérification rapide

Pour vérifier qu'une route IA envoie bien son coût dans la pile :
1. Ouvrir l'UI avec `AI_PROVIDER=claude` dans `.env`
2. Déclencher la fonctionnalité
3. Regarder coin bas-droite : **CostLogPanel** doit afficher une entrée avec le label + coût ($0.xxxx)

Si rien ne s'affiche :
- **Route SSE** : vérifier que `event: done` inclut bien `usage` dans sa payload
- **Route JSON** : vérifier que la réponse a la forme `{ data: { ..., usage } }` et que le `usage` a au minimum `{ model, inputTokens, outputTokens }`
- **Label manquant** : ajouter une entrée dans [src/utils/api-label.ts](../src/utils/api-label.ts)

### Routes auditées (2026-04-23)

| Route | Type | Usage remonté ? |
|---|---|---|
| `/generate/outline` | SSE | ✅ |
| `/generate/article` | SSE | ✅ |
| `/generate/meta` | SSE | ✅ |
| `/generate/reduce-section` | SSE | ✅ |
| `/generate/humanize-section` | SSE | ✅ |
| `/generate/action` | SSE | ✅ |
| `/generate/micro-context-suggest` | SSE | ✅ |
| `/generate/brief-explain` | SSE | ✅ |
| `/keywords/:kw/ai-panel` | SSE | ✅ |
| `/keywords/:kw/ai-hn-structure` | SSE | ✅ |
| `/keywords/:kw/propose-lieutenants` | SSE | ✅ |
| `/keywords/:kw/ai-lexique-upfront` | SSE | ✅ |
| `/keywords/:kw/ai-lexique` | SSE | ✅ |
| `/strategy/:id/suggest` | JSON wrappé | ✅ (fix 2026-04-23) |
| `/strategy/cocoon/:slug/suggest` | JSON wrappé | ✅ (fix 2026-04-23) |
| `/strategy/:id/deepen` + cocon | JSON wrappé | ✅ (fix 2026-04-23) |
| `/strategy/:id/consolidate` + cocon | JSON wrappé | ✅ (fix 2026-04-23) |
| `/strategy/:id/enrich` + cocon | JSON wrappé | ✅ (fix 2026-04-23) |
| `/theme/config/parse` | JSON wrappé | ✅ (fix 2026-04-23) |
| `/keywords/translate-pain` | JSON wrappé | ✅ (fix 2026-04-23) |
| `/keywords/lexique-suggest` | JSON wrappé | ✅ (fix 2026-04-23) |
| `/keywords/relevance-score` | JSON wrappé | ✅ (fix 2026-04-23) |
| `/keywords/analyze-discovery` | JSON wrappé | ✅ (déjà en place) |
| `/keywords/radar/generate` | JSON wrappé | ✅ (via `_apiUsage`) |
| `/articles/:id/recommend-word-count` | JSON wrappé | ✅ (fix 2026-04-23 — service retourne `usage`, route le propage) |
| `/content-gap/analyze` | JSON wrappé | ✅ (fix 2026-04-23 — route ajoute `usage` à partir de `_apiUsage` interne) |
| `/intent/analyze` | JSON wrappé | ✅ (fix 2026-04-23 — alias `usage` + `_apiUsage` pour compatibilité) |
| `/keywords/radar/generate` | JSON wrappé | ✅ (fix 2026-04-23 — route alias `_apiUsage` → `usage`) |
| `/keywords/:kw/validate` | JSON wrappé | N/A — pas d'IA Claude, uniquement DataForSEO |

---

## 🔄 Fallback automatique en prod

Si `AI_PROVIDER=claude` et Claude échoue sur **quota/overload/credit balance too low**, le dispatcher tente automatiquement :
1. Claude (primary)
2. Gemini
3. OpenRouter

Voir [ai-provider.service.ts::getProviderChain](../server/services/external/ai-provider.service.ts) et [ai-provider.service.ts::withFallbackChain](../server/services/external/ai-provider.service.ts).

Désactiver : `AI_PROVIDER_NO_FALLBACK=1` dans `.env`.

---

**Dernière mise à jour** : 2026-04-23
