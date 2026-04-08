---
title: 'Refonte intelligente des onglets Lieutenant et Lexique du Moteur'
slug: 'refonte-intelligente-lieutenants-lexique'
created: '2026-04-05'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack: [Vue 3, TypeScript, Pinia, Claude API (streaming SSE), DataForSEO, Vitest, Vue Test Utils]
files_to_modify:
  - src/components/moteur/LieutenantsSelection.vue
  - src/components/moteur/LexiqueExtraction.vue
  - server/routes/keyword-ai-panel.routes.ts
  - server/prompts/lieutenants-hn-structure.md
  - server/prompts/propose-lieutenants.md (NEW)
  - server/prompts/lexique-analysis.md (NEW or REFACTOR)
  - server/routes/keywords.routes.ts
  - shared/types/serp-analysis.types.ts
  - tests/unit/components/lieutenants-selection.test.ts
  - tests/unit/components/lexique-extraction.test.ts
code_patterns:
  - 'SSE streaming via useStreaming<T>() composable + server event: chunk/done/error'
  - 'Batch DataForSEO via fetchKeywordOverviewBatch() (700kw max) + fetchSearchIntentBatch() (1000kw max)'
  - 'RadarCard scoring via shared/scoring.ts computeCombinedScore()'
  - 'RadarCardCheckable component for checkbox + keyword card display'
  - 'CollapsableSection for togglable UI sections'
  - 'Pinia store article-keywords.store.ts for persisting capitaine/lieutenants/lexique'
  - 'Pinia store article-progress.store.ts for tracking completedChecks'
  - 'Cache 7j SERP dans data/cache/serp/, PAA dans data/cache/paa/'
  - 'Prompt templates in server/prompts/*.md with {{variable}} placeholders'
test_patterns:
  - 'Vitest + Vue Test Utils mount-based testing'
  - 'vi.mock() for apiPost, useStreaming, stores'
  - 'mockChunks/mockIsStreaming/mockStreamError refs for AI panel tests'
  - 'wrapper.vm as any for internal state access'
  - 'nextTick() for async Vue updates'
  - 'Existing: 964 lines lieutenant tests (35 describe), 530 lines lexique tests (12 describe)'
---

# Tech-Spec: Refonte intelligente des onglets Lieutenant et Lexique du Moteur

**Created:** 2026-04-05

## Overview

### Problem Statement

Les onglets Lieutenant et Lexique du workflow Moteur affichent des données SERP brutes (headings H1/H2/H3 des concurrents, termes TF-IDF) sans filtrage ni analyse de pertinence. L'onglet Lieutenant dump des centaines de headings non filtrés (souvent 1/8 = 13% de récurrence), mélangeant des titres de navigation ("Nous contacter"), des noms d'agences, des témoignages clients et des headings réellement pertinents — rendant la sélection de mots-clés secondaires pénible et inexploitable.

### Solution

Remplacer l'approche "dump brut + sélection manuelle" par une approche **IA-first** :

**Onglet Lieutenant :** Claude analyse l'ensemble des données disponibles (SERP headings avec récurrence, PAA, racines capitaine, groupes de mots découverte, niveau d'article) et **propose automatiquement** les lieutenants recommandés scorés + une structure Hn optimisée. L'utilisateur garde le contrôle total avec check/uncheck sur chaque lieutenant proposé. La section Hn bruts concurrents est conservée en collapsed caché pour référence.

**Onglet Lexique :** Même principe IA-first — Claude analyse le body text des top concurrents (via TF-IDF existant) et propose des termes lexicaux scorés par importance (obligatoire/différenciateur/optionnel) avec check/uncheck.

### Scope

**In Scope :**
- Onglet Lieutenant : appel IA auto-déclenché qui analyse SERP + PAA + racines + groupes → propose lieutenants scorés + structure Hn recommandée
- Onglet Lieutenant : section Hn bruts concurrents gardée en collapsed caché (pas le focus)
- Onglet Lieutenant : check/uncheck sur les lieutenants proposés par l'IA
- Onglet Lexique : même approche IA-first pour le body text / TF-IDF → termes lexicaux scorés
- Conservation de la mécanique de verrouillage (lock/unlock) existante

**Out of Scope :**
- Modification du scraping SERP / appels DataForSEO (les données brutes sont correctes)
- Modification de l'onglet Capitaine ou du flux de navigation entre onglets
- Ajout de nouvelles sources de données (Google Autocomplete, Semrush, etc.)
- Modification du backend TF-IDF (extraction existante conservée)

## Context for Development

### Bonnes pratiques SEO intégrées à la conception

#### 1. Rôle des Lieutenants par niveau d'article
- **Article Pilier (N2) :** Lieutenants = thématiques larges couvrant les intentions de recherche satellites. 6-12 H2 attendus (1 H2 / 200-300 mots). Les secondaires sont des "variantes thématiques" larges.
- **Article Intermédiaire (N3) :** Lieutenants = sous-thèmes ciblés du pilier. 4-8 H2.
- **Article Spécifique (N4) :** Lieutenants = précisions techniques, questions concrètes du langage client. 3-6 H2.

#### 2. Sources de lieutenants par ordre de fiabilité
1. **PAA (People Also Ask)** — la source la plus fiable car elle reflète la demande humaine réelle. Les PAA doivent être transformées directement en H2/H3. Apparaissent dans 83% des requêtes Google.
2. **Headings récurrents des concurrents** — filtrés par récurrence ≥ 30% (au moins 3/10 concurrents). Les headings à 13% (1/8) sont du bruit. Seuls les H2 récurrents comptent (les H1 sont souvent des titres de marque, les H3 sont trop granulaires).
3. **Content Gap (faille sémantique)** — identifier ce que les concurrents ont OUBLIÉ de dire, pas ce qu'ils disent tous.
4. **Groupes de mots (Découverte)** — termes issus de la phase de découverte, validés par le volume.
5. **Racines du Capitaine** — variantes sémantiques extraites de la déconstruction du mot-clé principal.

#### 3. Structure Hn optimale
- **Un H1 par page** = titre de l'article (mot-clé capitaine)
- **H2** = Lieutenants (mots-clés secondaires / questions PAA). 5-8 mots par heading. Chaque H2 doit être "searchable" comme requête Google.
- **H3** = Sous-sections des H2 quand le contenu dépasse 300 mots sous un H2. Variantes sémantiques.
- **Jamais sauter de niveau** : H2 → H3 → H4 (hiérarchie logique)
- **PAA comme H2/H3** : transformer les questions PAA directement en headings

#### 4. Scoring des candidats lieutenants (algorithme IA)
L'IA doit scorer chaque candidat selon :
- **Pertinence sémantique** (0.30) : similarité sémantique avec le mot-clé capitaine
- **Score PAA** (0.25) : présence dans les PAA = bonus fort (demande humaine réelle)
- **Récurrence SERP** (0.20) : fréquence d'apparition dans les headings concurrents (≥30%)
- **Content Gap** (0.15) : bonus si le terme comble une faille dans le contenu concurrent
- **Alignement d'intention** (0.10) : cohérence avec l'intention de recherche du capitaine

#### 5. Anti-cannibalisation
- Chaque article doit avoir son propre set unique de lieutenants
- Ne pas réutiliser les mêmes secondaires sur plusieurs articles du cocon
- L'IA doit vérifier contre les mots-clés déjà assignés à d'autres articles

#### 6. Lexique sémantique (Équipage)
- **Termes obligatoires** : apparaissent dans 8+/10 concurrents. Si absents, Google doute de l'expertise.
- **Termes différenciateurs** : apparaissent dans 2-3 concurrents seulement. Avantage compétitif.
- **Termes optionnels** : contexte supplémentaire, exemples, terminologie alternative.
- Placement : éparpillés naturellement dans le corps du texte (pas dans les headings).

### Codebase Patterns

- **SSE Streaming** : Toutes les réponses IA utilisent le composable `useStreaming<T>()` (src/composables/useStreaming.ts). Le serveur envoie `event: chunk` → `event: done` → `event: error`. Le composable expose `chunks`, `isStreaming`, `error`, `startStream()`, `abort()`.
- **RadarCard** : Famille de 3 composants — `RadarKeywordCard` (affichage), `RadarCardCheckable` (+ checkbox), `RadarCardLockable` (+ cadenas). Type `RadarCard` dans `shared/types/intent.types.ts` contient : keyword, reasoning, kpis, paaItems, combinedScore, scoreBreakdown.
- **Scoring** : `computeCombinedScore()` dans `shared/scoring.ts` calcule 5 composantes pondérées → score 0-100. **ATTENTION** : les lieutenants n'ont pas de PAA individuel (trop coûteux), or PAA pèse 30% + resonance 15% = 45% toujours à 0. Il faut une fonction `computeLieutenantScore()` dédiée avec des poids redistribués (voir Task 5).
- **Batch DataForSEO** : `fetchKeywordOverviewBatch(keywords[])` (max 700) et `fetchSearchIntentBatch(keywords[])` (max 1000) dans `server/services/dataforseo.service.ts`. Auto-chunking intégré.
- **Stores Pinia** : `article-keywords.store.ts` persiste `{ capitaine, lieutenants: string[], lexique: string[], rootKeywords? }`. `article-progress.store.ts` gère les `completedChecks` (ex: 'lieutenants_locked', 'lexique_validated').
- **CollapsableSection** : Composant réutilisable pour sections repliables avec titre et contenu.
- **Prompt Templates** : Fichiers `.md` dans `server/prompts/` avec placeholders `{{variable}}`. Chargés via `loadPrompt(name, variables)`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/moteur/LieutenantsSelection.vue` | Composant principal onglet Lieutenant — 477 lignes, 4 sources de candidats, checkbox bruts |
| `src/components/moteur/LexiqueExtraction.vue` | Composant principal onglet Lexique — 306 lignes, 3 niveaux TF-IDF, auto-check obligatoires |
| `src/components/intent/RadarCardCheckable.vue` | Wrapper checkbox autour de RadarKeywordCard — à réutiliser pour afficher les lieutenants |
| `src/components/intent/RadarKeywordCard.vue` | Affichage compact keyword + KPIs + score ring + PAA tree |
| `src/composables/useStreaming.ts` | Composable SSE pour panels IA — 112 lignes |
| `shared/scoring.ts` | `computeCombinedScore()` — scoring 5 composantes 0-100 |
| `shared/types/intent.types.ts` | Types RadarCard, RadarKeywordKpis, RadarCombinedScoreBreakdown |
| `shared/types/serp-analysis.types.ts` | Types SerpAnalysisResult, LieutenantCandidate, TfidfResult, TfidfTerm |
| `server/services/serp-analysis.service.ts` | Service SERP — scraping, extraction headings, cache 7j |
| `server/services/dataforseo.service.ts` | Batch endpoints DataForSEO — keyword overview, search intent |
| `server/services/keyword-radar.service.ts` | Construction de RadarCards — PAA matching, semantic scoring, KPI aggregation |
| `server/routes/keyword-ai-panel.routes.ts` | Routes IA streaming — `/keywords/:keyword/ai-hn-structure` (L92-142) |
| `server/routes/serp-analysis.routes.ts` | Routes SERP — `/serp/analyze` (L11-31), `/serp/tfidf` (L34-55) |
| `server/routes/keywords.routes.ts` | Routes keywords — `/keywords/validate-pain` (L348-416) batch validation |
| `server/prompts/lieutenants-hn-structure.md` | Prompt Claude pour structure Hn — à refondre |
| `src/stores/article-keywords.store.ts` | Pinia store — persiste capitaine, lieutenants[], lexique[] |
| `src/stores/article-progress.store.ts` | Pinia store — tracks completedChecks per article |
| `tests/unit/components/lieutenants-selection.test.ts` | 964 lignes, 35 describe blocks |
| `tests/unit/components/lexique-extraction.test.ts` | 530 lignes, 12 describe blocks |

### Technical Decisions

#### TD-1 : Réutiliser RadarCardCheckable pour les lieutenants (avec wrapper)
Le composant `RadarCardCheckable` affiche déjà : keyword, badges intent, KPIs compacts, score ring 0-100, PAA tree dépliable, checkbox. On remplace les lignes checkbox brutes (L412-431 de LieutenantsSelection) par des `RadarCardCheckable` en boucle. **Cependant**, `RadarCardCheckable` ne supporte pas les badges IA (aiConfidence, sources). Solution : **wraper** chaque `RadarCardCheckable` dans un conteneur flex qui ajoute les badges IA (confiance + sources) en dessous de la card. Pas de modification de `RadarCardCheckable` lui-même — les badges sont des éléments frères dans le template parent (`LieutenantsSelection.vue`).

#### TD-2 : Batch-validation DataForSEO des candidats lieutenants
Après que l'IA propose 8-15 candidats, on les batch-valide en un seul appel via `fetchKeywordOverviewBatch()` + `fetchSearchIntentBatch()`. Coût : 1 crédit DataForSEO pour le batch (pas 1 par mot-clé). On récupère volume, KD, CPC, competition, intent pour chaque lieutenant → on construit des RadarCards.

#### TD-3 : Flow IA-first en 2 étapes pour Lieutenant
1. **Étape IA (streaming)** : Claude reçoit SERP headings récurrents (≥30%), PAA, racines, groupes, niveau d'article → propose 8-15 lieutenants avec reasoning
2. **Étape KPI (batch)** : Les lieutenants proposés sont batch-validés DataForSEO → RadarCards construites avec `computeLieutenantScore()` (scoring dédié sans PAA/resonance, voir Task 5)
3. **Affichage** : RadarCardCheckable triés par score, pré-cochés (les recommandés IA), user ajuste

#### TD-4 : Simplification de l'IA Lexique
L'IA Lexique analyse TOUS les termes TF-IDF d'un coup (pas seulement les sélectionnés) et propose un scoring/recommandation par terme. Le flow inverse : IA opine d'abord → user raffine ensuite.

#### TD-5 : Prompt unique pour proposition de lieutenants
Nouveau prompt `server/prompts/propose-lieutenants.md` qui intègre les bonnes pratiques SEO (PAA = source #1, récurrence ≥30%, content gap, adaptation par niveau). Le prompt existant `lieutenants-hn-structure.md` est conservé mais refondu pour utiliser les lieutenants proposés par l'IA plutôt que les sélections manuelles.

#### TD-6 : Pas de RadarCard complète pour le Lexique
L'onglet Lexique garde son affichage actuel (terme + density + documentFrequency) enrichi d'un score IA et d'un badge recommandé/non-recommandé. Pas besoin de RadarCardCheckable ici car les termes lexicaux n'ont pas de KPIs individuels (volume, KD, etc.).

## Implementation Plan

### Tasks

#### Phase A — Backend : Types, Prompts et Routes

- [x] Task 1 : Étendre les types partagés pour les lieutenants IA
  - File : `shared/types/serp-analysis.types.ts`
  - Action : Ajouter les interfaces suivantes :
    ```typescript
    interface ProposedLieutenant {
      keyword: string           // Le mot-clé lieutenant proposé
      reasoning: string         // Explication IA de pourquoi ce lieutenant
      sources: ('paa' | 'serp' | 'group' | 'root' | 'content-gap')[]
      aiConfidence: 'fort' | 'moyen' | 'faible'  // Confiance IA
      suggestedHnLevel: 2 | 3  // H2 ou H3 recommandé
    }

    interface ProposeLieutenantsResult {
      lieutenants: ProposedLieutenant[]
      hnStructure: { level: number; text: string; children?: { level: number; text: string }[] }[]
      contentGapInsights: string   // Résumé des failles identifiées
    }

    interface LieutenantRadarCard extends RadarCard {
      aiConfidence: 'fort' | 'moyen' | 'faible'
      sources: ('paa' | 'serp' | 'group' | 'root' | 'content-gap')[]
      suggestedHnLevel: 2 | 3
    }
    ```
  - Notes : `LieutenantRadarCard` étend `RadarCard` (de `intent.types.ts`) pour ajouter les métadonnées IA. Importer `RadarCard` depuis `intent.types.ts`.

- [x] Task 2 : Créer le prompt de proposition de lieutenants
  - File : `server/prompts/propose-lieutenants.md` (NEW)
  - Action : Créer un prompt système pour Claude qui :
    - Reçoit en variables : `{{keyword}}` (capitaine), `{{level}}` (pilier/intermédiaire/spécifique), `{{paa_questions}}` (liste PAA), `{{hn_recurrence}}` (headings récurrents ≥30% uniquement), `{{word_groups}}` (groupes découverte), `{{root_keywords}}` (racines capitaine), `{{existing_lieutenants}}` (mots-clés déjà assignés à d'autres articles du cocon, pour anti-cannibalisation)
    - Intègre les bonnes pratiques SEO : PAA = source #1, adaptation au niveau d'article (pilier: 8-12 lieutenants thématiques larges, intermédiaire: 5-8 sous-thèmes, spécifique: 3-6 précisions techniques)
    - Demande un output JSON strict avec le schéma `ProposeLieutenantsResult`. **Le prompt doit inclure** : "Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après. Le JSON doit suivre exactement ce schéma : { lieutenants: [...], hnStructure: [...], contentGapInsights: "..." }"
    - Inclut les instructions de content gap : identifier ce que les concurrents n'ont PAS couvert
    - Inclut les instructions anti-cannibalisation : ne pas proposer de lieutenants déjà dans `{{existing_lieutenants}}`
  - Notes : **Pas de `response_format`** — l'API Anthropic/Claude ne supporte pas ce paramètre (c'est OpenAI). Le JSON est obtenu via prompt engineering (instruction explicite dans le prompt). Côté serveur, parser avec `JSON.parse()` encapsulé dans un try/catch + extraction regex fallback (`/\{[\s\S]*\}/`) si le JSON est enrobé de texte.

- [x] Task 3 : Refondre le prompt de structure Hn
  - File : `server/prompts/lieutenants-hn-structure.md`
  - Action : Refondre le prompt existant pour :
    - Recevoir les lieutenants déjà scorés (avec KPIs) plutôt que de simples strings
    - Intégrer les règles : 1 H1 = capitaine, H2 = lieutenants (searchable, 5-8 mots), H3 = sous-sections si >300 mots, PAA comme H2/H3
    - Adapter le nombre de H2 au niveau d'article (pilier: 6-12, intermédiaire: 4-8, spécifique: 3-6)
    - Retourner un JSON structuré avec arbre Hn au lieu de texte libre (via prompt engineering — instruction JSON explicite dans le prompt, pas de `response_format`)
  - Notes : Conserver la compatibilité SSE streaming. Le JSON final arrive dans `event: done` sous le champ `outline`. Parser avec try/catch + regex fallback.

- [x] Task 4 : Ajouter la route POST `/api/keywords/:keyword/propose-lieutenants`
  - File : `server/routes/keyword-ai-panel.routes.ts`
  - Action : Ajouter une nouvelle route SSE streaming après la route existante `ai-hn-structure` (après L142). La route :
    1. Valide le body avec Zod : `{ level: ArticleLevel, articleSlug: string, serpHeadings: HnRecurrenceItem[], paaQuestions: PaaQuestion[], wordGroups?: string[], rootKeywords?: string[] }`
    2. Appelle `getCocoonExistingLieutenants(articleSlug)` (Task 4b) pour récupérer les lieutenants déjà assignés aux articles frères du cocon
    3. Charge le prompt `propose-lieutenants.md` avec les variables (dont `{{existing_lieutenants}}` = résultat du helper)
    3. Appelle Claude en streaming (SSE) via `streamChatCompletion(systemPrompt, userPrompt, maxTokens)` — **pas de `response_format`** (inexistant dans l'API Anthropic). Le JSON est garanti par le prompt engineering (voir Task 2).
    4. Parse le JSON final et l'envoie dans `event: done` sous le champ `outline` : `{ outline: ProposeLieutenantsResult, metadata: { keyword, level }, usage }`. **CRITIQUE** : `useStreaming` extrait via `parsed.outline ?? parsed.metadata ?? parsed` (L80 de useStreaming.ts) — le résultat principal DOIT être dans `outline`, sinon il sera écrasé par `metadata`.
    5. Retourne les events : `chunk` (progression texte), `done` (résultat JSON parsé dans `outline`)
  - Notes : Suivre exactement le pattern de la route `ai-hn-structure` (L92-142) MAIS corriger la structure du `done` event. Le body contient les données pré-filtrées côté client (headings ≥30% seulement, pas les bruts).

- [x] Task 4b : Ajouter le helper serveur `getCocoonExistingLieutenants(articleSlug)`
  - File : `server/services/article.service.ts` (ou fichier existant qui lit `BDD_Articles_Blog.json`)
  - Action : Créer une fonction qui, à partir du slug d'un article :
    1. Lit `data/BDD_Articles_Blog.json` pour trouver le cocon contenant cet article (parcours silos → cocons → articles)
    2. Collecte les slugs de tous les articles frères dans le même cocon (sauf l'article courant)
    3. Pour chaque article frère, lit ses keywords assignés (via le même mécanisme que `GET /articles/{slug}/keywords`)
    4. Retourne un `string[]` flat de tous les lieutenants déjà assignés aux articles frères
  - Notes : Ce helper est appelé par la route `propose-lieutenants` (Task 4) pour remplir `{{existing_lieutenants}}` dans le prompt. Si aucun article frère n'a de lieutenants, retourner `[]` (pas bloquant). Le coût est faible : lecture JSON locale + quelques reads de keywords fichier.

- [x] Task 5 : Ajouter la route POST `/api/keywords/batch-lieutenant-cards`
  - File : `server/routes/keywords.routes.ts`
  - Action : Ajouter une route (après L416) qui construit des RadarCards pour une liste de mots-clés lieutenants :
    1. Body : `{ keywords: string[], specificTopic: string }` (keywords = lieutenants proposés, specificTopic = capitaine)
    2. Appelle `fetchKeywordOverviewBatch(keywords)` + `fetchSearchIntentBatch(keywords)` en parallèle
    3. Pour chaque keyword, assemble les KPIs et calcule `computeLieutenantScore()` (**pas** `computeCombinedScore()` — voir ci-dessous)
    4. Retourne `{ cards: RadarCard[] }` (sans PAA individuel — trop coûteux pour 8-15 mots-clés)
  - Notes :
    - **Pas de fetch PAA par lieutenant** (trop lent/coûteux). Les PAA sont déjà disponibles via l'analyse SERP du capitaine. Les RadarCards auront `paaItems: []` et `paaMatchCount: 0`, `paaWeightedScore: 0`.
    - **CRITIQUE — Scoring dédié** : `computeCombinedScore()` pondère PAA à 30% + resonance à 15% = 45% toujours à 0 sans PAA → score max 55/100. Créer `computeLieutenantScore(input: LieutenantScoreInput)` dans `shared/scoring.ts` avec poids redistribués : `opportunityScore × 0.35 + intentValueScore × 0.25 + cpcScore × 0.20 + aiConfidenceScore × 0.20` (le `aiConfidenceScore` vient de la confiance IA : fort=100, moyen=60, faible=30). Exporter le type `LieutenantScoreInput` depuis `shared/types/intent.types.ts`.

- [x] Task 6 : Refactorer la route IA lexique pour analyse upfront
  - File : `server/routes/keyword-ai-panel.routes.ts`
  - Action : Modifier ou dupliquer la route `/api/keywords/:keyword/ai-lexique` pour :
    1. Recevoir TOUS les termes TF-IDF (pas seulement les sélectionnés) : `{ level, allTerms: { obligatoire: string[], differenciateur: string[], optionnel: string[] }, cocoonSlug? }`
    2. L'IA analyse tous les termes et propose pour chacun : `{ term, aiRecommended: boolean, aiReason: string }`
    3. L'IA identifie aussi les termes manquants (content gap lexical)
    4. Retourne dans `event: done` le JSON structuré avec recommandations par terme, sous le champ `outline` : `{ outline: LexiqueAnalysisResult, metadata: { keyword }, usage }`. **CRITIQUE** : même contrainte `useStreaming` que Task 4 — le résultat DOIT être dans `outline`.
  - Notes : Créer un nouveau prompt `server/prompts/lexique-analysis-upfront.md` pour cette version. Conserver l'ancienne route si nécessaire pour rétrocompatibilité.

#### Phase B — Frontend : Onglet Lieutenant

- [x] Task 7 : Refactorer LieutenantsSelection — flow IA-first
  - File : `src/components/moteur/LieutenantsSelection.vue`
  - Action : Restructurer le composant en 3 phases séquentielles :

    **Phase 1 — Analyse SERP (existant, conservé) :**
    - Le watcher auto-trigger SERP (L251-260) reste identique
    - Le slider SERP (L311-339) reste identique
    - Le résumé des résultats (L346-357) reste identique

    **Phase 2 — Proposition IA (NOUVEAU) :**
    - Après SERP réussie, **auto-déclencher** l'appel à `/api/keywords/:keyword/propose-lieutenants`
    - Pendant le streaming : afficher un état "Analyse IA en cours..." avec pulse dot
    - À la fin du streaming : parser le `ProposeLieutenantsResult` depuis `event: done`
    - Enchaîner automatiquement avec l'appel batch `/api/keywords/batch-lieutenant-cards` pour construire les RadarCards

    **Phase 3 — Affichage RadarCards + check/uncheck :**
    - Remplacer la section "Candidats Lieutenants" (L406-434) par une boucle de `RadarCardCheckable`
    - Chaque card reçoit : `card: LieutenantRadarCard` (RadarCard + métadonnées IA). **Note** : `RadarCardCheckable` accepte `RadarCard` — `LieutenantRadarCard extends RadarCard` est compatible.
    - Les lieutenants avec `aiConfidence: 'fort'` sont pré-cochés
    - Tri par `combinedScore` décroissant (calculé via `computeLieutenantScore()`)
    - **Badges IA en éléments frères** (pas dans RadarCardCheckable — le composant n'est PAS modifié) : wraper chaque `RadarCardCheckable` dans un `<div class="lieutenant-card-wrapper">` qui contient :
      - La `RadarCardCheckable` elle-même
      - Un `<div class="lieutenant-badges">` en dessous avec : badges de source (PAA, SERP, GROUP, ROOT, CONTENT-GAP) + badge de confiance IA (fort=vert, moyen=orange, faible=gris)

    **Sections restructurées (ordre dans le template) :**
    1. Header capitaine (conservé)
    2. Soft gate (conservé)
    3. Contrôles SERP + slider (conservé)
    4. Résumé résultats (conservé)
    5. **Propositions IA** (NOUVEAU — RadarCardCheckable en boucle) — ouvert par défaut
    6. **Structure Hn recommandée** (REFACTORÉ — intégrée dans les résultats IA, pas dans un panel séparé)
    7. Structure Hn concurrents bruts (EXISTANT — `CollapsableSection` fermée par défaut)
    8. PAA associés (EXISTANT — `CollapsableSection` fermée par défaut)
    9. Groupes de mots-clés (EXISTANT — `CollapsableSection` fermée par défaut)
    10. Lock/Unlock (conservé)

  - Notes : Supprimer le computed `lieutenantCandidates` (L93-155) car les candidats viennent maintenant de l'IA. Conserver `hnRecurrence` (L57-83) car il est utilisé comme input de l'appel IA (filtré ≥30%). Ajouter un second `useStreaming` pour le flux de proposition (le premier reste pour la structure Hn si gardée séparément).

- [x] Task 8 : Gérer la sélection et le verrouillage des lieutenants RadarCard
  - File : `src/components/moteur/LieutenantsSelection.vue`
  - Action :
    - Remplacer `selectedLieutenants: Set<string>` par `selectedCards: Map<string, LieutenantRadarCard>` pour conserver les cards complètes
    - `toggleLieutenant(card: LieutenantRadarCard)` : ajouter/retirer de la Map
    - `lockLieutenants()` — **séquence complète** :
      1. `const store = useArticleKeywordsStore()` (importer le store Pinia)
      2. `store.keywords.lieutenants = Array.from(selectedCards.keys())` (écrire les mots-clés)
      3. `await store.saveKeywords()` (persister via `apiPut /articles/{slug}/keywords`)
      4. `emit('check-completed', 'lieutenants_locked')` (notifier le workflow Moteur)
      5. `emit('lieutenants-updated', Array.from(selectedCards.keys()))` (notifier les onglets)
      6. Mettre `isLocked.value = true` pour verrouiller l'UI
    - Le compteur affiche : "X lieutenant(s) sélectionné(s) sur Y proposés"
  - Notes : **CRITIQUE** : l'ancien code `lockLieutenants()` n'écrivait PAS dans le store Pinia — il faisait seulement l'emit. La séquence ci-dessus corrige ce bug. La Map permet de passer les cards complètes à l'onglet Lexique si nécessaire.

#### Phase C — Frontend : Onglet Lexique

- [x] Task 9 : Refactorer LexiqueExtraction — flow IA-first
  - File : `src/components/moteur/LexiqueExtraction.vue`
  - Action : Restructurer le flow :

    **Flow actuel :**
    1. TF-IDF fetch → termes affichés → user coche → IA analyse les cochés

    **Nouveau flow :**
    1. TF-IDF fetch (identique, auto-trigger quand lieutenants locked)
    2. **Auto-déclencher l'IA upfront** avec TOUS les termes (pas seulement les sélectionnés)
    3. L'IA retourne des recommandations par terme : `{ term, aiRecommended: boolean, aiReason: string }`
    4. Afficher les termes avec :
       - Badge "IA recommandé" (vert) ou "IA optionnel" (gris)
       - Tooltip avec `aiReason` au hover
       - Pré-cocher : tous les `obligatoire` + tous les `aiRecommended` dans differenciateur
    5. User ajuste (check/uncheck)

    **Changements template :**
    - Les 3 `CollapsableSection` (obligatoire/differenciateur/optionnel) restent
    - Chaque term-row s'enrichit de : badge IA + tooltip reason
    - Le panel IA (L257-281) change de position : avant les sections de termes (pas après)
    - Le panel IA affiche le résumé/analyse globale, pas les recommandations par terme (celles-ci sont inline)

  - Notes : Le `generateLexiqueAnalysis()` existant (L75-91) change de payload : envoie tous les termes, pas seulement les sélectionnés. Le watcher `tfidfResult` (L94-96) continue d'auto-trigger l'IA.

#### Phase D — Tests

- [x] Task 10 : Adapter les tests LieutenantsSelection
  - File : `tests/unit/components/lieutenants-selection.test.ts`
  - Action : Mettre à jour les 35 describe blocks existants :
    - **Nouveaux tests à ajouter :**
      - `describe('IA proposal')` : auto-trigger après SERP, streaming state, parse résultat JSON, fallback si erreur
      - `describe('Batch RadarCard building')` : appel après IA, construction cards, gestion erreur batch
      - `describe('RadarCardCheckable display')` : rendu des cards, pré-cochage par confiance IA, tri par score
      - `describe('IA confidence badges')` : fort=vert, moyen=orange, faible=gris
      - `describe('Structure Hn intégrée')` : affichage de la structure proposée par l'IA
    - **Tests existants à adapter :**
      - `describe('Lieutenant candidates')` : remplacer les tests d'agrégation 4-sources par des tests de rendu RadarCardCheckable
      - `describe('Checkbox selection')` : adapter pour RadarCardCheckable au lieu d'inputs checkbox
      - `describe('AI Panel')` : adapter pour le nouveau flow (proposition IA auto, pas panel manuel)
    - **Tests existants à conserver tels quels :**
      - Captain header, Soft gating, SERP slider, Analyze button, Hn recurrence, PAA section, Word groups, Article change reset, Lock/unlock, Locked state
  - Notes : Mocker `apiPost` pour les 2 nouveaux endpoints (propose-lieutenants, batch-lieutenant-cards). Mocker un second `useStreaming` pour le flux de proposition.

- [x] Task 11 : Adapter les tests LexiqueExtraction
  - File : `tests/unit/components/lexique-extraction.test.ts`
  - Action : Mettre à jour les 12 describe blocks existants :
    - **Nouveaux tests à ajouter :**
      - `describe('IA upfront analysis')` : auto-trigger avec tous les termes, parse recommandations par terme
      - `describe('IA recommendation badges')` : badge "IA recommandé" sur les termes
      - `describe('Pre-check with IA')` : obligatoire + differenciateur aiRecommended pré-cochés
    - **Tests existants à adapter :**
      - `describe('Checkbox pre-selection')` : inclure la logique IA recommended
      - `describe('AI Panel')` : adapter le payload (tous les termes, pas seulement sélectionnés)
    - **Tests existants à conserver :**
      - Header, Extract button, Results display, Selection counter, Error handling, Article change reset, Validate/Lock

### Acceptance Criteria

#### Onglet Lieutenant

- [x] AC-1 : Given le capitaine est verrouillé et la SERP analysée, when l'onglet Lieutenant s'affiche, then l'IA est auto-déclenchée et propose 8-15 lieutenants avec reasoning et confiance (fort/moyen/faible)
- [x] AC-2 : Given l'IA a proposé des lieutenants, when les résultats s'affichent, then chaque lieutenant est affiché en `RadarCardCheckable` avec score ring, KPIs (volume, KD, CPC, intent), badges de source et badge de confiance IA
- [x] AC-3 : Given les RadarCards sont affichées, when un lieutenant a `aiConfidence: 'fort'`, then il est pré-coché par défaut
- [x] AC-4 : Given les RadarCards sont affichées, when l'utilisateur clique sur un RadarCardCheckable, then le lieutenant est coché/décoché et le compteur se met à jour
- [x] AC-5 : Given les RadarCards sont affichées, when les cards sont triées, then elles apparaissent par `combinedScore` décroissant
- [x] AC-6 : Given l'IA est en cours de streaming, when l'utilisateur voit l'interface, then un indicateur "Analyse IA en cours..." avec pulse dot est visible
- [x] AC-7 : Given l'appel IA échoue, when l'erreur survient, then un message d'erreur est affiché et l'utilisateur peut relancer manuellement
- [x] AC-8 : Given la section "Structure Hn concurrents" existe, when l'onglet s'affiche, then cette section est en `CollapsableSection` fermée par défaut (pas le focus)
- [x] AC-9 : Given des lieutenants sont sélectionnés, when l'utilisateur clique "Valider les Lieutenants", then les lieutenants sont verrouillés, sauvegardés dans le store, et l'emit `check-completed` avec `'lieutenants_locked'` est envoyé
- [x] AC-10 : Given l'IA propose une structure Hn, when les résultats sont affichés, then la structure H2/H3 recommandée est visible avec le nombre de H2 adapté au niveau d'article (pilier: 6-12, intermédiaire: 4-8, spécifique: 3-6)
- [x] AC-11 : Given l'utilisateur change d'article, when le slug change, then tous les états sont réinitialisés (SERP, IA, sélection, verrouillage)

#### Onglet Lexique

- [x] AC-12 : Given les lieutenants sont verrouillés, when l'onglet Lexique s'affiche, then le TF-IDF est auto-extrait puis l'IA est auto-déclenchée avec TOUS les termes
- [x] AC-13 : Given l'IA a analysé les termes, when les résultats s'affichent, then chaque terme a un badge "IA recommandé" (vert) ou "IA optionnel" (gris) avec tooltip `aiReason` au hover
- [x] AC-14 : Given les termes sont affichés, when la pré-sélection est appliquée, then tous les termes `obligatoire` sont cochés ET les termes `differenciateur` avec `aiRecommended: true` sont cochés
- [x] AC-15 : Given l'IA échoue, when l'erreur survient, then les termes s'affichent quand même avec le fallback (pré-check obligatoire uniquement, pas de badges IA)
- [x] AC-16 : Given des termes sont sélectionnés, when l'utilisateur clique "Valider le Lexique", then les termes sont sauvegardés dans le store et l'emit `check-completed` avec `'lexique_validated'` est envoyé

#### Transversal

- [x] AC-17 : Given la SERP a déjà été analysée (cache), when l'utilisateur revient sur l'onglet Lieutenant, then les données sont restaurées depuis le cache sans appel API supplémentaire
- [x] AC-18 : Given l'appel batch DataForSEO échoue partiellement, when certains keywords n'ont pas de KPIs, then les RadarCards sont quand même affichées avec des KPIs à 0 et un score de fallback

## Additional Context

### Dependencies

- **Claude API** : Streaming SSE pour proposition de lieutenants + structure Hn + analyse lexique (existant)
- **DataForSEO** : Batch keyword overview + search intent pour validation des lieutenants (existant)
- **SERP cache** : Les données SERP (headings, PAA, textContent) doivent être en cache avant l'appel IA (flow existant)
- **RadarCardCheckable** : Composant existant, **non modifié**. Les badges IA (confiance, sources) sont rendus en éléments frères dans le template parent, pas à l'intérieur du composant.
- **computeLieutenantScore()** : Nouvelle fonction de scoring dédiée à créer dans `shared/scoring.ts` (poids redistribués sans PAA/resonance). `computeCombinedScore()` reste inchangée pour les RadarCards Capitaine.

### Testing Strategy

**Unit Tests (Vitest + Vue Test Utils) :**
- Adapter les 35 describe blocks existants pour LieutenantsSelection (~964 lignes) → ~1200 lignes estimées après ajout des tests IA
- Adapter les 12 describe blocks existants pour LexiqueExtraction (~530 lignes) → ~700 lignes estimées après ajout des tests IA
- Mocker les 2 nouveaux endpoints (`propose-lieutenants`, `batch-lieutenant-cards`) via `vi.mock()` de `apiPost`
- Mocker un second `useStreaming` pour le flux de proposition IA (en plus du streaming structure Hn existant)
- Tester les fallbacks : erreur IA → affichage dégradé, erreur batch → KPIs à 0

**Tests manuels :**
- Tester sur l'article pilier "Création de site web sur mesure à Toulouse" (mot-clé capitaine verrouillé)
- Vérifier visuellement que les RadarCardCheckable s'affichent correctement avec scores et badges
- Vérifier que la structure Hn proposée respecte les limites par niveau d'article
- Tester le flow complet : Capitaine verrouillé → SERP auto → IA auto → RadarCards → check/uncheck → Lock → Lexique auto

### Notes

- Les données brutes SERP (scraping DataForSEO + extraction HTML) sont correctes et ne changent pas.
- Le backend streaming SSE (Claude API) est déjà en place via `useStreaming` composable.
- **Risque principal** : La qualité des propositions IA dépend du prompt. Le prompt `propose-lieutenants.md` devra être itéré après les premiers tests réels. Prévoir une mécanique de "relancer l'analyse" si les résultats ne conviennent pas.
- **Coût API** : Chaque proposition de lieutenants = 1 appel Claude (streaming) + 1 batch DataForSEO. Le cache SERP (7j) évite les re-fetches.
- **Pas de PAA par lieutenant** : Trop coûteux. Les PAA du capitaine sont suffisantes comme contexte. Les RadarCards des lieutenants auront `paaItems: []`.
- **Rétrocompatibilité** : L'ancien flow (checkbox bruts) est supprimé, pas conservé en parallèle. Les tests sont adaptés, pas dupliqués.

## Review Notes
- Adversarial review completed
- Findings: 13 total, 10 fixed, 3 skipped (F8 test coverage, F12 dead E2E partially addressed via F6, F13 LieutenantCard unit tests — deferred)
- Resolution approach: auto-fix
- Fixes applied: ArticleLevel validation (F1), balanced JSON extraction (F2), nesting-aware JSON repair (F3), source badge allowlist (F4), dead type removal (F5), dead route/scoring removal (F6), runtime AI JSON validation (F7), selectedArticle guard (F9), array join for streaming (F10), negative brace count clamping (F11)
