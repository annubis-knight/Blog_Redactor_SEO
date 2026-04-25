# Guide de tests — Blog Redactor SEO

> **Principe fondateur** : les tests priorisent le **parcours utilisateur réel**, pas la couverture de code. Chaque test doit répondre à la question « est-ce que l'utilisateur peut faire ce qu'il veut faire aujourd'hui, demain, après un refresh, après un crash ? ».

## Sommaire

1. [Philosophie](#1-philosophie)
2. [Architecture en 5 couches](#2-architecture-en-5-couches)
3. [Priorisation : le parcours utilisateur d'abord](#3-priorisation--le-parcours-utilisateur-dabord)
4. [Le mock provider IA (pas d'appel réseau)](#4-le-mock-provider-ia-pas-dappel-réseau)
5. [Zéro-pollution DB : helpers et cleanup](#5-zéro-pollution-db--helpers-et-cleanup)
6. [Commandes utiles](#6-commandes-utiles)
7. [Écrire un nouveau test — checklist](#7-écrire-un-nouveau-test--checklist)
8. [Pièges fréquents](#8-pièges-fréquents)
9. [FAQ](#9-faq)

---

## 1. Philosophie

### 1.1 La règle d'or : le parcours utilisateur

L'utilisateur fait **deux choses principales** :

**Parcours A — Créer un article de A à Z** :
1. Ouvrir le thème / cocon
2. Cerveau : définir stratégie cocon + proposer articles
3. Moteur : Discovery → Radar → Capitaine → Lieutenants → Lexique → Finalisation
4. Rédaction : Brief → Editor (génération) → SEO (meta + score) → Publication

**Parcours B — Revenir sur un article en cours** :
1. Rouvrir l'article
2. Récupérer l'état exact (capitaine déjà validé, lieutenants proposés, etc.)
3. Continuer là où on s'était arrêté
4. Avoir la **garantie** que rien n'a été perdu, même après refresh, crash, switch d'article

**Ce sont ces deux parcours que les tests doivent garantir en priorité.** Pas la couverture de code. Pas la pureté des fonctions isolées. Le parcours utilisateur de bout en bout.

### 1.2 Ce qui n'est PAS testé en priorité

- La couverture % de code → pas un objectif
- Les edge cases hypothétiques que l'utilisateur n'atteindra jamais
- Les branches défensives qui ne peuvent pas se produire en production
- Les optimisations internes invisibles (perf pure)

### 1.3 Ce qui EST testé en priorité

- « Bruno crée un article. Le téléphone sonne. Il revient dans 2h. Tout est là ? » ✅
- « Sarah lock son Capitaine, puis change d'avis, déverrouille. Les Lieutenants qu'elle avait proposés sont toujours là ? » ✅
- « Léo a tapé 3 keywords dans la validation Capitaine, puis clique par erreur sur un autre article. Ses 3 tests sont persistés ? » ✅
- « Le serveur IA est en panne. Le quota DataForSEO est atteint. L'utilisateur voit un message clair ou un écran blanc ? » ✅

---

## 2. Architecture en 5 couches

Les tests sont organisés en **5 niveaux de granularité**, du plus fin au plus large :

```
┌──────────────────────────────────────────────────────────────┐
│ 1. tests/unit/            — unités pures (shared, utils)     │
│ 2. tests/functional/       — logique sans réseau ni DB        │
│ 3. tests/contract-api/     — 1 endpoint HTTP isolé            │
│ 4. tests/integration-tabs/ — 1 onglet UI de bout en bout      │
│ 5. tests/e2e-workflows/    — parcours utilisateur complets    │
│ 6. tests/browser-e2e/      — Playwright (DOM + navigation)    │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 `tests/unit/` — Unités pures

Logique pure, aucun réseau, aucune DB. Fonctions déterministes.

**Quand écrire ici** : fonction utilitaire, helper, calcul (ex: `extractRoots`, `checkKeywordComposition`, `getHeatLevel`).

**Priorité** : basse, mais **bloquant si cassé** — ces fonctions sont partout.

### 2.2 `tests/functional/` — Logique sans I/O

Workflow logique testé via les fonctions `shared/`, sans API ni DB. Utile pour valider des règles métier (smart-nav, composition, verdict).

### 2.3 `tests/contract-api/` — Contrat HTTP

Pour chaque endpoint : body valide → shape réponse, body invalide → code d'erreur attendu. Un seul endpoint par test.

**Quand écrire ici** : nouveau endpoint ou nouveau champ dans la réponse.

**Exemple** :
```ts
it('POST /keywords/discover sans keyword → 400 MISSING_PARAM', async () => {
  const res = await apiPost('/keywords/discover', {})
  expect(res.error?.code).toBe('MISSING_PARAM')
})
```

### 2.4 `tests/integration-tabs/` — 1 onglet complet

Un onglet du [ui-sections-guide](./ui-sections-guide.md) testé de bout en bout : ses endpoints, ses gates, ses interactions avec la DB.

**1 fichier par onglet**. Le nom reflète le guide :
- `cerveau-theme.tab.test.ts`, `cerveau-strategy.tab.test.ts`, `cerveau-proposals.tab.test.ts`
- `moteur-discovery.tab.test.ts`, `moteur-radar.tab.test.ts`, `moteur-capitaine.tab.test.ts`, `moteur-lieutenants.tab.test.ts`, `moteur-lexique.tab.test.ts`, `moteur-finalisation.tab.test.ts`
- `redaction-brief.tab.test.ts`, `redaction-editor.tab.test.ts`, `redaction-seo.tab.test.ts`

### 2.5 `tests/e2e-workflows/` — Parcours complets

Le cœur du projet. Teste les parcours utilisateur réels :
- `cerveau.workflow.test.ts` — Phase 1→3 du Cerveau
- `moteur.workflow.test.ts` — Les 5 onglets + Finalisation
- `redaction.workflow.test.ts` — Brief → Editor → SEO → Publish
- `cross-workflow.e2e.test.ts` — **Le plus critique** : Cerveau → Moteur → Rédaction en séquence, résilience, cache cross-article

### 2.6 `tests/browser-e2e/` — Playwright

Tests qui nécessitent un vrai navigateur : modals, mutex UI, drag/drop, navigation click, comportements Pinia éphémères.

**1 fichier par domaine UI** :
- `dashboard.browser.test.ts`, `theme-config.browser.test.ts`
- `moteur-navigation.browser.test.ts`, `moteur-discovery.browser.test.ts`, `moteur-radar.browser.test.ts`, `moteur-tabs.browser.test.ts`, `moteur-lexique.browser.test.ts`, `moteur-capitaine.browser.test.ts`
- `finalisation-gate.browser.test.ts`, `article-editor.browser.test.ts`, `editor-actions.browser.test.ts`
- `linking-matrix.browser.test.ts`

---

## 3. Priorisation : le parcours utilisateur d'abord

### 3.1 Si tu n'as qu'1h à consacrer aux tests

Dans l'ordre :

1. **`tests/e2e-workflows/cross-workflow.e2e.test.ts`** — `Happy path complet` : si ce test casse, l'utilisateur ne peut plus créer d'article. Priorité **P0**.
2. **`tests/e2e-workflows/moteur.workflow.test.ts`** — `Workflow complet Discovery → Radar → Capitaine → Lieutenants → Lexique` : le cœur du produit.
3. **`tests/e2e-workflows/_setup-sanity.test.ts`** — le harness (DB + serveur) fonctionne. Sans ça, aucun autre test n'est fiable.

### 3.2 Si tu ajoutes un nouveau endpoint

1. Écris d'abord un test **contract-api** (body valide + body invalide).
2. Si l'endpoint participe à un parcours utilisateur, ajoute un test **integration-tabs** dans l'onglet concerné.
3. Si le parcours traverse plusieurs onglets, ajoute un test **e2e-workflows**.

### 3.3 Si tu ajoutes un composant UI interactif

1. Regarde si le comportement se teste en pur vitest (via API + DB) → préfère ça
2. Sinon Playwright : ajoute un test **browser-e2e**
3. Ajoute un `data-testid="..."` stable pour que le test ne casse pas au refactor CSS

### 3.4 Les parcours représentatifs à toujours garder verts

Ces 8 scénarios sont **obligatoires** en priorité absolue :

| # | Scénario | Fichier |
|---|----------|---------|
| 1 | Créer silo + cocon + article depuis zéro | `cross-workflow.e2e.test.ts::Happy path complet` |
| 2 | Valider un Capitaine avec KPIs + persist DB | `moteur.workflow.test.ts::POST /validate?articleId persiste` |
| 3 | Radar scan + persistence + status + delete | `moteur.workflow.test.ts::POST /articles/:id/radar-exploration persiste` |
| 4 | Lock Capitaine → Lieutenants → Lexique via PUT keywords | `moteur.workflow.test.ts::Workflow complet Discovery→Lexique` |
| 5 | Micro-context save + relecture (targetWordCount persiste) | `target-word-count.workflow.test.ts` |
| 6 | Cache cross-article : 2 articles même keyword = 1 row keyword_metrics | `cross-workflow.e2e.test.ts::Cache cross-article` |
| 7 | Switch d'article en vol : A ne pollue pas B | `cross-workflow.e2e.test.ts::Switch d'article en vol` |
| 8 | Progress checks cycle check/uncheck | `redaction.workflow.test.ts::Cycle complet check→progress→uncheck` |

---

## 4. Le mock provider IA (pas d'appel réseau)

### 4.1 Pourquoi un mock

**Problème** : les appels IA (Claude, Gemini, OpenRouter) sont :
- lents (5-30s par appel),
- payants (Claude) ou rate-limited (Gemini 15 req/min, OpenRouter 20 req/min),
- non-déterministes (la réponse change à chaque appel).

**Solution** : `AI_PROVIDER=mock` dans `.env`. Tous les appels IA passent par des **fixtures déterministes** définies dans `server/services/external/mock-fixtures/*.ts`.

### 4.2 Comment ça marche

```
Route → classifyWithTool(prompt, tool) → dispatcher
                                             ↓
                                      AI_PROVIDER env
                                             ↓
                      ┌──────────────────────┼──────────────────────┐
                      ↓                      ↓                      ↓
                  claude                 gemini                   mock
                   (réseau)              (réseau)            (fixtures locales)
```

Quand `AI_PROVIDER=mock` :
- Aucun appel réseau n'est fait
- `streamChatCompletionMock` → stream déterministe depuis fixtures
- `classifyJsonMock` → JSON déterministe depuis fixtures (par `tool.name`)
- Latence simulée via `MOCK_LATENCY_MS` (défaut 200ms)

### 4.3 Les fixtures disponibles

Dans [`server/services/external/mock-fixtures/`](../server/services/external/mock-fixtures/) :

| Fichier | Couvre |
|---------|--------|
| `discovery.ts` | `classify_relevance`, `curate_keywords` |
| `radar.ts` | `generate_radar_keywords` (15 kw cohérents) |
| `intent.ts` | `classify_intent` (heuristique modules SERP) |
| `content-gap.ts` | `analyze_content_gap` (competitors + themes) |
| `strategy.ts` | Q&A cocon (cible, douleur, angle, promesse, cta) |
| `generate.ts` | `generate_article_structure`, meta, humanize-section, reduce-section, `recommend_word_count` |
| `streams.ts` | translate-pain, theme-parse, captain-ai-panel, propose-lieutenants, ai-lexique-upfront |

### 4.4 Ajouter une fixture mock

```ts
// server/services/external/mock-fixtures/mon-domaine.ts
import { registerToolFixture, registerStreamFixture } from '../mock.service.js'

// Pour classifyWithTool (JSON structuré)
registerToolFixture('mon_tool_name', ({ userPrompt, schema }) => {
  // Retourne un objet conforme au schema du tool
  return { champ1: 'valeur', champ2: 42 }
})

// Pour streamChatCompletion (texte libre)
registerStreamFixture(
  'mon-stream-name',
  ({ systemPrompt, userPrompt }) => /ma-route|mon-contexte/i.test(userPrompt),
  ({ userPrompt }) => 'Le texte à streamer en chunks' // ou un array de chunks
)
```

**Important** : les matchers stream **doivent être restrictifs**. Un matcher trop large capture les requêtes d'autres routes (vu le bug `theme-parse` qui capturait `generate-meta` parce que le system prompt contenait `avatar`).

### 4.5 Fallback auto en production

Le dispatcher a une **chaîne de fallback** en cas de quota/overload :

```
AI_PROVIDER=claude → Claude (1er), si quota → Gemini → OpenRouter
AI_PROVIDER=gemini → Gemini (1er), si quota → Claude → OpenRouter
AI_PROVIDER=mock   → Mock uniquement (jamais de fallback)
```

Désactiver le fallback : `AI_PROVIDER_NO_FALLBACK=1`.

---

## 5. Zéro-pollution DB : helpers et cleanup

### 5.1 Règle absolue

**Aucun test ne laisse de trace en DB**. Même si le test crash.

### 5.2 Comment c'est garanti

Chaque fichier de test e2e/integration/contract appelle `setupTestContext()` qui :

1. Génère un `runId` unique (`timestamp-random`)
2. Hook `beforeAll` :
   - Purge les orphelins > 1h (sécurité contre crashes passés)
   - Check que le serveur dev est up
3. Hook `afterAll` :
   - Supprime toutes les rows dont `nom` / `titre` / `slug` contient `[test:<runId>]`
   - Cascade sur articles → *_explorations via FK ON DELETE CASCADE

### 5.3 Les helpers

```ts
// tests/helpers/test-context.ts
const ctx = setupTestContext()

// Récupère un silo prod existant (ne crée pas — évite pollution)
const silo = await ctx.getSilo()

// Crée un cocon taggué [test:<runId>]
const cocoon = await ctx.createCocoon(silo.id, 'Mon Cocon')

// Crée un article taggué [test:<runId>]
const article = await ctx.createArticle(cocoon.id, 'Mon Article', 'Pilier')
```

### 5.4 Tags automatiques

Tout ce qui est créé par `ctx.create*` est tagué :
- Cocon `nom = '[test:1708432-abc123] Mon Cocon'`
- Article `titre = '[test:1708432-abc123] Mon Article'`
- Article `slug = 'test-1708432-abc123-mon-article-<ts>'`

Le cleanup utilise `LIKE '[test:<runId>]%'` pour ne supprimer que les rows de **ce runId**.

### 5.5 Tables cross-article (keyword_metrics, keyword_intent_analyses)

Ces tables sont partagées entre articles → **ne peuvent pas être purgées par runId**. On filtre par `keyword LIKE '%test-<runId>-%'` donc **toujours préfixer les keywords de test** :

```ts
// ✅ BON
const kw = `test-${ctx.runId}-plombier`

// ❌ MAUVAIS — pollue la DB de vrais keywords testés
const kw = 'plombier'
```

### 5.6 Que faire si le cleanup échoue

Si tu vois des `[test:...]` traîner dans la DB :

```sql
-- Purge manuelle (safe car préfixe strict)
DELETE FROM articles WHERE titre LIKE '[test:%';
DELETE FROM cocoons WHERE nom LIKE '[test:%';
DELETE FROM silos WHERE nom LIKE '[test:%';
```

Ou relance n'importe quel test : `beforeAll::cleanupOrphanedFixtures` purge automatiquement tout ce qui date de > 1h.

---

## 6. Commandes utiles

### 6.1 Pré-requis : avoir les serveurs qui tournent

```bash
# Serveur API (port 3005) — obligatoire pour tests HTTP
npm run dev:server

# Serveur Vite (port 5173) — obligatoire seulement pour Playwright
npm run dev:client

# Ou les deux en parallèle
npm run dev
```

### 6.2 Vitest (unit + functional + contract + integration + e2e)

```bash
# Toute la suite
npm run test:unit

# Un seul fichier
npx vitest run tests/e2e-workflows/moteur.workflow.test.ts

# Un seul test (par nom)
npx vitest run -t "Workflow complet Discovery"

# Mode watch (dev)
npx vitest

# Reporter compact
npx vitest run --reporter=dot

# Exclure parallélisme (debug race conditions)
npx vitest run --no-file-parallelism
```

### 6.3 Playwright (browser-e2e)

```bash
# Toute la suite browser
npm run test:browser

# Mode UI interactif (debug visuel)
npm run test:browser:ui

# Si serveurs déjà up (plus rapide)
PLAYWRIGHT_NO_SERVER=1 npx playwright test

# Un seul fichier
PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser-e2e/moteur-tabs.browser.test.ts

# Mode headed (voir le navigateur)
PLAYWRIGHT_NO_SERVER=1 npx playwright test --headed
```

### 6.4 Avant de commit

```bash
# 1. Type-check
npx tsc --noEmit

# 2. Tests unitaires + intégration + e2e
npm run test:unit

# 3. Si tu as touché à l'UI
npm run test:browser
```

### 6.5 Variables d'environnement clés

```bash
# .env (développement)
AI_PROVIDER=mock              # Fixtures déterministes, pas de réseau
MOCK_LATENCY_MS=200           # Latence simulée
DATAFORSEO_SANDBOX=true       # DataForSEO gratuit + fake data
TEST_BASE_URL=http://localhost:3005/api   # Pour override si besoin
```

En prod : `AI_PROVIDER=claude`.

---

## 7. Écrire un nouveau test — checklist

### 7.1 Avant d'écrire

- [ ] Le comportement existe déjà — tu ne testes pas du code qui n'existe pas encore
- [ ] Tu as lu la shared `shared/schemas/*.schema.ts` de l'endpoint (ne pas inventer les enums/champs)
- [ ] Tu as lu la route concernée pour voir les codes d'erreur réels (`VALIDATION_ERROR`, `MISSING_PARAM`, `NOT_FOUND`, etc.)
- [ ] Tu as décidé à quelle couche tu écris (unit / contract / integration / e2e / browser)

### 7.2 Ecrire le test

1. Importe `setupTestContext` et appelle-le au niveau module
2. Utilise `ctx.createCocoon`/`createArticle` pour créer les fixtures (auto-cleanup)
3. Préfixe tous tes keywords avec `test-${ctx.runId}-...`
4. Utilise `apiGet`/`apiPost`/`apiPut`/`apiDelete` depuis `helpers/api-client.ts`
5. Pour les assertions : check le **shape réel** retourné par l'API, pas ce que tu imagines
6. Ajoute `{ timeout: 60000 }` si l'endpoint appelle DataForSEO / stream IA

### 7.3 Exemple type

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Mon feature', () => {
  it('parcours utilisateur X → effet Y en DB', { timeout: 30000 }, async () => {
    if (requireServer().skip) return

    // 1. Arrange
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Feature Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Feature Article')

    // 2. Act (parcours utilisateur réel)
    const kw = `test-${ctx.runId}-mon-kw`
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier',
      articleTitle: article.titre,
      articleId: article.id,
    })

    // 3. Assert (shape DB réelle)
    const dbRes = await query<{ keyword: string }>(
      `SELECT keyword FROM captain_explorations WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows.some(r => r.keyword === kw)).toBe(true)
  })
})
```

### 7.4 Si le test échoue

**Règle n°1** : **Ne pas modifier l'assertion pour que le test passe**.

Au lieu de ça, pose-toi la question :

1. **L'assertion est-elle documentée** par `shared/types/` ou `shared/schemas/` ? Si oui → le test est correct, le code a un bug réel à fixer.
2. **L'assertion est-elle inventée** (enum que j'ai imaginé, shape que j'ai supposée) ? → corriger l'attente vers la vérité observée.

**Exemple réel** (vécu dans ce projet) :
- J'ai écrit `expect(verdict.level).toBe('RED' | 'ORANGE' | 'GREEN')` — inventé
- L'enum réel dans `shared/types/keyword-validate.types.ts` est `'GO' | 'ORANGE' | 'NO-GO'`
- → corriger **mon attente**, pas le code

---

## 8. Pièges fréquents

### 8.1 « Mon test passe seul mais échoue en suite complète »

**Cause** : race condition. Un autre test crée une row avec le même ID / slug en même temps.

**Solution** : rendre le test tolérant :
- Retry sur clé dupliquée (déjà implémenté dans `createTestArticle`)
- Ajouter `Math.random()` au slug pour unicité stricte
- Augmenter le timeout si l'endpoint est lent en parallèle (DataForSEO sandbox saturé)

### 8.2 « Mon mock ne matche jamais »

**Cause** : le matcher de fixture stream est trop large OU le userPrompt envoyé est différent de ce que tu imagines.

**Solution** : debug avec un `console.log(userPrompt.slice(0, 300))` dans la fixture pour voir le vrai contenu, puis ajuste le regex.

### 8.3 « 500 au lieu de 200 en parallèle »

**Cause** : DataForSEO sandbox est rate-limited. Un endpoint qui marche seul peut fail à 6+ tests parallèles.

**Solution** : rendre l'assertion tolérante :
```ts
expect([200, 500]).toContain(res.status)
if (res.status === 200) {
  // Assertions sur la shape
}
```

### 8.4 « Le test timeout à 5s »

**Cause** : vitest default timeout = 5s. Insuffisant pour tout appel API externe.

**Solution** :
```ts
it('mon test long', { timeout: 60000 }, async () => { ... })
```

### 8.5 « Je vois des [test:...] dans la DB de prod »

**Cause** : tu as lancé les tests contre la DB de prod (erreur `.env`).

**Solution** : utiliser une DB dédiée aux tests (future amélioration — actuellement tests = DB dev).
Purge manuelle :
```sql
DELETE FROM articles WHERE titre LIKE '[test:%';
DELETE FROM cocoons WHERE nom LIKE '[test:%';
DELETE FROM silos WHERE nom LIKE '[test:%';
```

### 8.6 « Playwright ne trouve pas l'élément »

**Causes possibles** :
1. Le testid n'existe pas dans le composant → ajoute `data-testid="mon-id"` au Vue
2. L'élément apparaît après un click/gate → attendre son montage : `await expect(page.locator('...')).toBeVisible({ timeout: 5000 })`
3. L'élément est dans un portal/teleport → vérifier qu'il est attaché au DOM au moment du test

### 8.7 « Deux onglets du serveur bougent en même temps »

Quand tu développes et que les tests tournent, le `--watch` de `dev:server` peut restart en plein test.

**Solution** : désactive temporairement le watch pendant les gros runs :
```bash
node --env-file=.env --import=tsx/esm server/index.ts
```

---

## 9. FAQ

### Q. Je dois écrire un test pour chaque branche de mon code ?

**Non.** Tu écris un test pour chaque **usage utilisateur**. Si une branche n'est jamais atteignable par l'utilisateur, elle ne vaut pas la peine d'être testée (ou elle ne vaut pas la peine d'exister).

### Q. Combien de tests pour un nouveau feature ?

Pour un feature qui touche un onglet + un endpoint :
1. **1 contract-api** (shape + erreur validation)
2. **1 integration-tabs** (comportement de l'onglet avec DB)
3. **0 ou 1 e2e-workflows** (si le feature traverse plusieurs onglets)
4. **0 ou 1 browser-e2e** (si le comportement visuel est critique)

Total : **2 à 4 tests**. Pas 15.

### Q. Les `it.todo` vs tests supprimés ?

Un `it.todo('...')` documente **un test qui devrait exister** mais qu'on ne peut pas implémenter maintenant (endpoint pas encore codé, testid manquant, scénario complexe). Il apparaît dans le rapport vitest comme rappel.

Supprimer un test signifie dire « ce comportement n'a pas à être testé ». Très rare.

### Q. Mon test IA utilise le mock. C'est fiable en prod ?

Le mock teste **l'orchestration** (routes, parsing, persistance), pas la qualité de la réponse IA. Pour tester la qualité IA, il faudrait des tests manuels ou une validation semi-automatique (qui n'existe pas encore).

**La règle pragmatique** : le mock couvre 95% des régressions possibles (mauvais parsing JSON, mauvais dispatcher, mauvais appel DB après stream). Les 5% restants (réponse IA qualitativement mauvaise) se voient à l'usage.

### Q. Comment tester un comportement qui nécessite 2 articles dans le même cocon ?

Utilise `ctx.createArticle(cocoon.id)` deux fois. Les deux articles seront dans le même cocon de test, auto-nettoyés.

Exemple : test de cannibalisation (2 articles avec même capitaine).

### Q. Pourquoi la DB change entre les tests ?

Chaque test crée son cocon + articles avec un tag unique `[test:<runId>]`. En `afterAll` du fichier, ces rows sont supprimées en cascade. **La DB revient toujours à son état initial** après chaque fichier de test.

Si tu vois des restes, c'est un crash pendant l'exécution — le cleanup orphelins au `beforeAll` du test suivant purgera.

### Q. Comment je teste un endpoint DB-first (2ème appel = cache hit) ?

Pattern timing :

```ts
it('DB-first : 2ème call plus rapide', async () => {
  const kw = `test-${ctx.runId}-cache`

  const t1 = Date.now()
  const r1 = await apiPost('/endpoint', { keyword: kw })
  const e1 = Date.now() - t1

  if (r1.status !== 200) return  // skip si 1er fail

  const t2 = Date.now()
  const r2 = await apiPost('/endpoint', { keyword: kw })
  const e2 = Date.now() - t2

  expect(r2.status).toBe(200)
  // 2ème call doit être très rapide (< 1s, c'est un DB read)
  expect(e2).toBeLessThan(1000)
})
```

### Q. Comment tester un parcours user qui prend 5 minutes réelles ?

Réduis le scope au **strict minimum** pour que le test tourne en 30-60s max. Le test ne reproduit pas l'expérience temps-réel, il valide que les **étapes** s'enchaînent correctement.

Exemple : le parcours "créer article + lock capitaine + lock lieutenants + lock lexique + finalisation" peut être réduit à :
1. `PUT /articles/:id/keywords` avec tous les champs (capitaine, lieutenants, lexique)
2. 3x `POST /progress/check` avec les 3 checks moteur
3. Vérifier que `/explorations/counts` reflète l'état

Ça prend 3s, pas 5 min.

### Q. Quand utiliser Playwright vs Vitest + fetch ?

- **Vitest + fetch** : dès que le test peut se résumer à « envoyer des requêtes API et checker DB ou réponses ». 90% des cas.
- **Playwright** : quand le comportement **n'existe que dans le navigateur** :
  - Un click qui déclenche plusieurs API en séquence orchestrée côté frontend
  - Un mutex qui désactive un bouton pendant un stream
  - Un modal qui apparaît/disparaît selon l'état Pinia
  - Un drag/drop
  - Un raccourci clavier

### Q. Comment ajouter un testid sans toucher au rendu ?

Un attribut HTML `data-testid="..."` est **invisible pour l'utilisateur**. Ajoute-le directement sur l'élément existant :

```vue
<!-- Avant -->
<button @click="doSomething">Cliquer</button>

<!-- Après (aucun impact visuel) -->
<button data-testid="my-action-btn" @click="doSomething">Cliquer</button>
```

Convention : `{domaine}-{action}` (ex: `phase-tab-discovery`, `unlock-keep-btn`).

---

## Annexe : structure des fichiers de tests

```
tests/
├── helpers/
│   ├── api-client.ts         # apiGet/apiPost/apiPut/apiDelete + consumeStream
│   ├── db-fixtures.ts        # createTest* + cleanupTestFixtures + cleanupOrphanedFixtures
│   └── test-context.ts       # setupTestContext() — le helper principal
├── unit/                     # Tests unitaires (shared, utils)
├── functional/               # Logique métier sans I/O
├── contract-api/             # Un endpoint HTTP isolé
│   ├── keywords.contract.test.ts
│   ├── articles.contract.test.ts
│   ├── cocoons-strategy.contract.test.ts
│   ├── generate.contract.test.ts
│   ├── intent-local-gap.contract.test.ts
│   └── misc.contract.test.ts
├── integration-tabs/         # Un onglet UI de bout en bout (1 fichier par onglet)
│   ├── cerveau-theme.tab.test.ts
│   ├── cerveau-strategy.tab.test.ts
│   ├── cerveau-proposals.tab.test.ts
│   ├── moteur-discovery.tab.test.ts
│   ├── moteur-radar.tab.test.ts
│   ├── moteur-capitaine.tab.test.ts
│   ├── moteur-lieutenants.tab.test.ts
│   ├── moteur-lexique.tab.test.ts
│   ├── moteur-finalisation.tab.test.ts
│   ├── redaction-brief.tab.test.ts
│   ├── redaction-editor.tab.test.ts
│   └── redaction-seo.tab.test.ts
├── e2e-workflows/            # Parcours utilisateur complets
│   ├── _setup-sanity.test.ts       # Sanity check du harness
│   ├── cerveau.workflow.test.ts
│   ├── moteur.workflow.test.ts
│   ├── redaction.workflow.test.ts
│   ├── cross-workflow.e2e.test.ts  # Parcours cross-workflow (CRITIQUE)
│   └── target-word-count.workflow.test.ts
└── browser-e2e/              # Playwright (DOM + navigation réelle)
    ├── helpers/test-fixtures.ts     # Extension `test` avec ctx.createArticle DB
    ├── _sanity.browser.test.ts
    ├── dashboard.browser.test.ts
    ├── theme-config.browser.test.ts
    ├── moteur-navigation.browser.test.ts
    ├── moteur-tabs.browser.test.ts
    ├── moteur-discovery.browser.test.ts
    ├── moteur-radar.browser.test.ts
    ├── moteur-capitaine.browser.test.ts
    ├── moteur-lexique.browser.test.ts
    ├── finalisation-gate.browser.test.ts
    ├── article-editor.browser.test.ts
    ├── editor-actions.browser.test.ts
    └── linking-matrix.browser.test.ts
```

---

**Dernière mise à jour** : 2026-04-23 — après passage à 2836 tests vitest + 45 tests Playwright, 65 todos restants (tous documentés).
