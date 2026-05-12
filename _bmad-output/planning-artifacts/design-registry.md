---
purpose: 'Registre de conception — détails d''implémentation des exigences PRD'
companion: '_bmad-output/planning-artifacts/prd.md'
lastUpdated: '2026-05-12T00:00:00Z'
updateReason: 'Création initiale — extraction des détails techniques hors PRD (chantier docs/prd-split-spec-design). Premier lot : §8.2 Dashboard. Lot §8.9 Finalisation (3 entrées DESIGN-FIN-RECAP / DESIGN-FIN-LINK-REDACTION / DESIGN-FIN-CHECK). Tranché au passage : le check `moteur:finalisation_completed` mentionné en suspens dans le PRD n''existe pas dans le code — l''onglet Finalisation est read-only, le Moteur reste à 5 checks (Discovery, Radar, Capitaine, Lieutenants, Lexique). Lot §8.15 Composants UI partagés (DESIGN-UI-RADAR-CARD / DESIGN-UI-AI-PANELS-PATTERN / DESIGN-UI-ARTICLE-SHARED / DESIGN-UI-MOTEUR-SHARED) — 4 entrées formalisant les invariants de cohérence cross-contextes. Constats : `BasketStrip.vue` listé dans le PRD a été supprimé 2026-05-11 (cf. DRIFT-011), `LaboView` et `KeywordRadarTab` mentionnés dans le PRD historique n''existent pas dans le code (cf. DRIFT-012), `ArticleWordCountBar` réellement consommé par `ArticleWorkflowView` et non `ArticleEditorView` (cf. DRIFT-013). Lot §8.4 Moteur — Discovery (6 entrées DESIGN-DIS-SOURCES / DESIGN-DIS-RELEVANCE-FILTER / DESIGN-DIS-AI-ANALYSIS / DESIGN-DIS-CACHE / DESIGN-DIS-SEND-TO-RADAR / DESIGN-DIS-CHECK). Recadrages au passage : (1) PRD initial citait `FR-DIS-INTENT-SCAN` sur Discovery alors que `/api/keywords/intent-scan` est exclusivement consommé par Radar via `useResonanceScore` (DRIFT-008) ; (2) Discovery utilise 7 sources parallèles (4 angles Google Suggest + IA Claude + DataForSEO + courte-traîne IA), filtre relevance 2-passes conditionnel `STRICT_PASS_TRIGGER_RATIO = 0.10` cap LRU 500, cache DB-first 30 j sur `keyword_discoveries(seed, lang)` avec auto-save au repos, envoi au Radar via UPSERT direct `radar_explorations.generated_keywords` (basket mémoire supprimé 2026-05-11), check `MOTEUR_DISCOVERY_DONE` émis exclusivement depuis `useMoteurCrossTabState.handleSendToRadar` (pas depuis `DiscoveryPanel.vue`) ; (3) refonte 2026-05-11 a aussi supprimé `DiscoveryAiPanel.vue` + `useDiscoveryRanking.ts` au profit d''un usage direct de `<AiPanel>` + curation backend. Lot §8.3 Moteur règles transversales (24 entrées DESIGN-MOT-* couvrant les phases, gating souple, sélection article, recap publié, mode bimodal, checks, transitions, KPIs bruts, cache cascade, injection painPoint/strategy, cross-tab payload, cannibalisation, compteurs DB, réconciliation, cache externe, basket déprécié, NFR découplage Lieutenants/Lexique, NFR décomposition keyword_metrics). Tranchés au passage : (a) `DELETE /progress/check` n''existe pas — c''est `POST /articles/:id/progress/uncheck` (cf. DRIFT-008) ; (b) `getOrFetch` n''est pas un helper centralisé exporté par `cache-helpers.ts` mais un pattern réimplémenté localement par service (cf. DRIFT-009) ; (c) migration `020_normalize_completed_checks.sql` est dans `migrations/_archive/`, donc historique appliqué, pas source de vérité courante (cf. DRIFT-010). Lot §8.10 Rédaction (13 entrées DESIGN-RED-* couvrant brief IA, outline, génération article section-by-section, méta, éditeur TipTap, scoring SEO live, 12 actions contextuelles, internal linking, reduce-section, humanize-section, word count target, progress, checks, panels layout, IA Brief). Stores Pinia vérifiés : `useEditorStore`, `useOutlineStore`, `useSeoStore`, `useGeoStore`, `useBriefStore`, `useLinkingStore`, `useArticleProgressStore` — tous présents et conformes (cf. exports `defineStore` dans `src/stores/article/`). Constat : `useInternalLinking` consomme `useLinkingStore` (kebab-case dans `src/stores/keyword/linking.store.ts`), pas un store dédié article — cohérent avec la matrice cocon globale. Surprise consignée DRIFT-015 (référence ProseMirror position dans `internal_links.position` flottante après remaniement lourd, problème connu mais non bloquant). Lot §8.13 Intégrations externes (12 entrées DESIGN-EXT-* : DATAFORSEO, DATAFORSEO-COSTGUARD, DATAFORSEO-SANDBOX, GSC-OAUTH, GSC-PERFORMANCE, GSC-KEYWORD-GAP, AI-MULTI-PROVIDER, AI-FALLBACK, CLAUDE, GEMINI, EMBEDDINGS, AUTOCOMPLETE-GOOGLE). Stores Pinia vérifiés via grep `export const use` sur `src/stores/external/` et `src/stores/ui/` : `useGscStore`, `useLocalStore`, `useCaptainTriggerStore`, `useCostLogStore`, `useNotificationStore`, `useRuntimeModeStore`, `useWorkflowNavStore` — tous présents et conformes. Constats : (1) toggle navbar mock/real unique pilote à la fois DataForSEO sandbox ET provider IA (cohérence UX assumée) ; (2) GSC token persisté en fichier JSON `data/gsc-token.json`, pas en DB — décision historique outil solo ; (3) embedding multilingue local Xenova/multilingual-e5-small, dégradation gracieuse si non chargeable (60s lazy-load au premier usage) ; (4) `autocomplete.service.ts` localisé dans `services/keyword/`, pas `services/external/` — drift historique consigné DRIFT-016. Lot §8.14 Infrastructure transversale (28 entrées DESIGN-INFRA-* couvrant caches courts/permanents `external_api_cache`/`keyword_metrics`/`paa-cache`/`keyword_discoveries`, wrapper API `apiGet/Post/Put/Patch/Delete/Stream`, validation Zod, prompt loader + escape hardening, constantes workflow `MOTEUR_*`/`CERVEAU_*`/`REDACTION_*`, module score unifié + ESLint no-fallback + KPI nullable/display-dash/consistency/scoring-nullsafe, check:health + dependency-cruiser, runtime-mode toggle mock/réel, scrape-corpus neutre, logger structuré, error handler central, health-check + DB connection check, cost-log store, tables persistées `paa_explorations`/`intent_explorations` legacy/`keywords_seo`/`local_entities`/`lieutenant_explorations`/`keyword_discoveries`/`article_strategies`/`cocoon_strategies`/`article_micro_contexts`). Stores Pinia vérifiés : `useCostLogStore`, `useRuntimeModeStore`, `useArticleKeywordsStore`, `useRadarExplorationStore`, `useKeywordDiscoveryStore`, `useArticleStrategyStore` — tous présents conformes. Surprises consignées : DRIFT-017 (`shared/schemas/` contient 13 fichiers, pas 41 comme annoncé PRD pré-migration), DRIFT-018 (`paa-cache.service.ts` lit/écrit `keyword_metrics.paa_questions` avec freshness 1j, pas une table `paa_cache` dédiée 90j comme annoncé PRD), DRIFT-019 (règle ESLint `no-restricted-syntax` couvre uniquement `Score`, pas `Density/Volume/Difficulty/Cpc/Competition` annoncés PRD), DRIFT-020 (`lieutenant_explorations.locked_at` mentionné PRD pré-migration mais absent du schéma snapshot courant).'
synced_with:
  - '_bmad-output/planning-artifacts/prd.md'
  - 'server/db/schema.sql'
  - 'docs/ARCHITECTURE_FLOWS.md'
---

# Design Registry — Blog Redactor SEO

> **Rôle de ce document.** Le [PRD](./prd.md) décrit **ce que** fait l'outil et **pourquoi**, dans un langage compréhensible sans avoir touché le code. Ce registre décrit **comment** chaque exigence est réalisée : références fichiers, schéma DB, endpoints, critères d'acceptation techniques, historique de migration, choix d'architecture.
>
> **Règle d'or.** Le PRD est la source de vérité pour le besoin. Ce registre est la source de vérité pour la conception. **Ce qui touche au choix d'implémentation va ici, pas dans le PRD.** En cas de divergence avec le code, le code reste l'autorité finale (cf. CLAUDE.md §1).

---

## Convention de référence

Chaque entrée de ce registre porte un identifiant **`DESIGN-<DOMAINE>-<CAPACITY>`** qui mire l'identifiant **`FR-<DOMAINE>-<CAPACITY>`** correspondant dans le PRD.

Exemple :

| PRD | Design Registry |
|---|---|
| `FR-DASH-NAV` | `DESIGN-DASH-NAV` |
| `FR-CER-MICRO-CONTEXT` | `DESIGN-CER-MICRO-CONTEXT` |
| `NFR-PERF-CACHE-HIT-RATE` | `DESIGN-PERF-CACHE-HIT-RATE` |

Le lien est **bidirectionnel** :
- chaque FR du PRD se termine par `→ Conception : [DESIGN-...](./design-registry.md#design-...)`
- chaque entrée du registre commence par `**Réf PRD :** [FR-...](./prd.md#fr-...)`

Un `grep "FR-DASH-NAV"` retombe sur les deux fichiers + les tests + les commits. Traçabilité gratuite.

---

## Structure d'une entrée

Chaque entrée du registre suit le canevas suivant. Toutes les sections sont **optionnelles** sauf la référence PRD et au moins un bloc de contenu — un détail d'implémentation trivial peut tenir en 3 lignes.

```markdown
### DESIGN-<ID>

**Réf PRD :** [FR-<ID>](./prd.md#fr-<id-lower>)

**Refs code**
- chemin/vers/fichier.ext (rôle)

**Endpoints**
- METHOD /api/...

**Flux DB**
*Lecture* : déclencheur → endpoint → SQL → consommateur.
*Écriture* : déclencheur UI → endpoint → SQL → effet observable.

**Stores Pinia**
- store concerné — rôle dans le flux (hydrate, mute, expose).

**Watchers & réactivité**
- watcher → cible observée → effet.

**Décisions d'architecture**
…

**Critères d'acceptation techniques**
…

**Historique**
…

**Voir aussi**
…
```

### À propos du bloc « Flux DB »

Ce bloc trace **l'aller-retour entre la base de données et l'UI**. Il répond à 3 questions :

1. *Quand* l'app lit-elle cette donnée ? (mount du composant, switch d'article, polling, refresh manuel, watcher...)
2. *Qu'est-ce qu'elle lit / écrit exactement* ? (table, colonnes, opération SQL : `SELECT`, `INSERT`, `UPSERT`, `DELETE`, `UPDATE`)
3. *Comment la valeur arrive jusqu'à l'utilisateur* ? (endpoint → service → store Pinia → composable → composant)

**Format recommandé** — séparer **Lecture** et **Écriture**, numéroter les étapes du flux. Pour les flux complexes (cache à plusieurs niveaux, cascade entre tables, SSE), un mini diagramme Mermaid `sequenceDiagram` est bienvenu.

**Tables citées** : utiliser le nom exact tel qu'il apparaît dans [server/db/schema.sql](../../server/db/schema.sql). Les colonnes mentionnées doivent exister à la date de mise à jour de l'entrée.

### À propos du bloc « Stores Pinia »

Liste les stores qui interviennent dans le cycle de vie de la donnée : ceux qui l'**hydratent** (fetch initial), ceux qui la **mutent** (actions utilisateur), ceux qui l'**exposent** (computeds lus par les composants). Cite le rôle de chaque store en une ligne — pas besoin de détailler son API complète.

Un store cité ici doit porter un header `AUTHORITY:` à jour (cf. CLAUDE.md §3.2) — la cohérence entre ce que dit le registry et ce que dit le header `AUTHORITY:` est un invariant.

### À propos du bloc « Watchers & réactivité »

Documente **comment la donnée se propage en réaction à un événement**, sans recharger la page. Trois types courants :

1. **Watchers Vue** explicites (`watch(...)` ou `watchEffect`) — quelle ref est observée, quel effet est déclenché.
2. **Computeds réactifs** — quelle dérivation chaîne la donnée depuis la source jusqu'à l'UI.
3. **Mécaniques cross-tab / cross-onglet** — si une action sur un onglet doit refléter sur un autre dans la même session.

Ce bloc est important parce que c'est typiquement là que se cachent les bugs de cohérence (« le tri n'utilise pas la valeur affichée », « le dot ne se met pas à jour au reload »). Documenter les watchers force à expliciter la chaîne de dépendance et à détecter les fallbacks divergents.

---

## Table des matières

> Les sections du registre suivent la numérotation du PRD pour faciliter la navigation cross-document. Les sections non encore migrées (chantier `docs/prd-split-spec-design` en cours) sont marquées **TODO**.

- [§8.1 — Cerveau (DESIGN-CER)](#81--cerveau-design-cer)
- [§8.2 — Dashboard / Cocoon Landing (DESIGN-DASH)](#82--dashboard--cocoon-landing-design-dash)
- [§8.3 — Moteur — règles transversales (DESIGN-MOT)](#83--moteur--règles-transversales-design-mot)
- [§8.4 — Moteur — Discovery (DESIGN-DIS)](#84--moteur--discovery-design-dis)
- [§8.5 — Moteur — Radar (DESIGN-RAD)](#85--moteur--radar-design-rad)
- [§8.6 — Moteur — Capitaine (DESIGN-CAP)](#86--moteur--capitaine-design-cap)
- [§8.7 — Moteur — Lieutenants (DESIGN-LIE)](#87--moteur--lieutenants-design-lie)
- [§8.8 — Moteur — Lexique (DESIGN-LEX)](#88--moteur--lexique-design-lex)
- [§8.9 — Moteur — Finalisation (DESIGN-FIN)](#89--moteur--finalisation-design-fin)
- [§8.10 — Rédaction (DESIGN-RED)](#810--rédaction-design-red)
- [§8.13 — Intégrations externes (DESIGN-EXT)](#813--intégrations-externes-design-ext)
- [§8.14 — Infrastructure transversale (DESIGN-INFRA)](#814--infrastructure-transversale-design-infra)
- [§8.15 — Composants UI partagés (DESIGN-UI)](#815--composants-ui-partagés-design-ui)
- [§9 — Non-Functional Requirements (DESIGN-NFR-*)](#9--non-functional-requirements-design-nfr-*) — §9.1 à §9.6 + §9.9 migrées ; §9.7 (versions) et §9.8 (env vars) sorties vers `architecture.md` / `.env.example`

---

## §8.1 — Cerveau (DESIGN-CER)

### DESIGN-CER-STEPS-ARTICLE

**Réf PRD :** [FR-CER-STEPS-ARTICLE](./prd.md#fr-cer-steps-article)

**Refs code**
- [server/routes/strategy.routes.ts](../../server/routes/strategy.routes.ts) — endpoints `suggest` / `deepen` / `consolidate` / `enrich` / `save` (un par étape du cycle).
- [src/stores/strategy/strategy.store.ts](../../src/stores/strategy/strategy.store.ts) — store Pinia qui orchestre l'avancement des 6 étapes côté front.
- [server/prompts/strategy-suggest.md](../../server/prompts/strategy-suggest.md), [strategy-deepen.md](../../server/prompts/strategy-deepen.md), [strategy-consolidate.md](../../server/prompts/strategy-consolidate.md) — prompts IA d'aide à la stratégie.

**Persistance**
- Table `article_strategies(article_id PK, data JSONB, completed_steps TEXT[], updated_at)` — cf. `DESIGN-INFRA-ARTICLE-STRATEGIES`.
- Le champ `data` stocke les 6 réponses validées ; `completed_steps` trace l'avancement (utilisé pour reprise).

**Flux DB**

*Lecture* : à l'ouverture de l'écran stratégie d'un article, fetch de la ligne `article_strategies` correspondante. Le compteur `completed_steps` permet de **reprendre exactement à l'étape suivante** plutôt que de tout rejouer.

*Écriture* : chaque validation d'étape (cible → douleur → aiguillage → angle → promesse → CTA) déclenche un upsert qui met à jour le `data` JSONB et incrémente `completed_steps`. Les actions IA intermédiaires (`suggest`, `deepen`, `consolidate`, `enrich`) ne persistent rien : elles renvoient des suggestions au store, qui ne sauvegarde qu'à la validation utilisateur.

**Stores Pinia**
- `useStrategyStore` — hydrate `strategy` au mount, expose `currentStep` (dérivé de `completedSteps`), pilote les actions IA et la sauvegarde finale via `saveStrategy(articleId)`.

**Watchers & réactivité**
- `currentStepName` (computed) chaîne `steps[currentStep.value]` pour synchroniser l'écran avec l'étape en cours sans logique impérative.
- Pas de watcher cross-onglet : une stratégie article est éditée dans un seul onglet à la fois (single-user local). Reload manuel pour synchroniser si seconde session.

**Voir aussi**
- `DESIGN-CER-CONTEXT-FOR-MOTEUR` — lecture downstream par le Moteur.
- `DESIGN-INFRA-PROMPT-LOADER` — mécanique d'injection `{{strategy_context}}`.

---

### DESIGN-CER-STEPS-COCOON

**Réf PRD :** [FR-CER-STEPS-COCOON](./prd.md#fr-cer-steps-cocoon)

**Refs code**
- [server/routes/strategy.routes.ts](../../server/routes/strategy.routes.ts) — endpoints cocoon-scope (préfixe `/cocoons/:id/strategy/*`).
- [server/prompts/cocoon-brainstorm.md](../../server/prompts/cocoon-brainstorm.md), [cocoon-articles.md](../../server/prompts/cocoon-articles.md), [cocoon-articles-topics.md](../../server/prompts/cocoon-articles-topics.md), [cocoon-paa-queries.md](../../server/prompts/cocoon-paa-queries.md), [cocoon-articles-spe.md](../../server/prompts/cocoon-articles-spe.md) — 5 prompts pour les 6 + 4 étapes.

**Persistance**
- Table `cocoon_strategies(cocoon_id PK, data JSONB, generated_at)` — cf. `DESIGN-INFRA-COCOON-STRATEGIES`.

**Flux DB**

*Lecture* : à l'ouverture du Cerveau cocon, fetch de la ligne `cocoon_strategies` du cocon courant. Le payload `data` contient les 6 étapes stratégiques + les `proposedArticles` (panneau Articles, étape 6) + les `suggestedTopics` (sujets éditoriaux). Tout est packé dans un seul JSONB pour limiter les allers-retours.

*Écriture* : chaque action utilisateur (validation d'étape, ajout/modification d'un article proposé, toggle d'un topic) appelle `saveStrategy` qui réécrit le JSONB complet. Stratégie « optimistic save » : le store mute localement puis pousse vers la DB sans bloquer l'UI.

**Stores Pinia**
- `useCocoonStrategyStore` — hydrate la stratégie cocon, mute les 6 étapes + les `proposedArticles` + les `suggestedTopics`, pilote `saveStrategy(cocoonSlug)`.
- `useCocoonsStore` — fournit le mapping `title → article.id` utilisé par `useArticleProposals` pour réconcilier les `proposedArticles` non encore persistés avec les articles déjà créés en DB.

**Watchers & réactivité**
- Watcher sur `store.strategy?.proposedArticles` dans `useArticleProposals` (`{ immediate: true }`) : à chaque hydratation, complète les articles manquant un `id`/`suggestedSlug`/`dbId` et déclenche un `saveStrategy` si une migration a été appliquée. C'est le watcher load-bearing du Cerveau cocon — il garantit l'idempotence de la structure entre les sessions.

**Voir aussi**
- `DESIGN-CER-BATCH-CREATE` (production des articles à partir de la structure cocon).

---

### DESIGN-CER-AIGUILLAGE

**Réf PRD :** [FR-CER-AIGUILLAGE](./prd.md#fr-cer-aiguillage)

**Refs code**
- [shared/types/strategy.types.ts](../../shared/types/strategy.types.ts) — type `ArticleLevel = 'pilier' | 'intermediaire' | 'specifique'`.
- [server/prompts/cocoon-articles.md](../../server/prompts/cocoon-articles.md) — règles de hiérarchisation utilisées par l'IA d'aiguillage.

**Modèle de hiérarchie**
- **Pilier** : `parent_slug = null` — racine du cocon.
- **Intermédiaire** : `parent_slug = <slug du Pilier>`.
- **Spécifique** : `parent_slug = <slug d'un Intermédiaire>`.
- La hiérarchie est utilisée par `DESIGN-RED-INTERNAL-LINKING` (suggestions de maillage interne) et par le scoring contextuel du Moteur (seuils par niveau, cf. `DESIGN-CAP-VALIDATE`).

**Flux DB**

*Lecture* : le niveau (`Pilier` / `Intermédiaire` / `Spécialisé`) est lu depuis `articles.type` à chaque chargement d'article. La hiérarchie parent/enfant est dérivée du champ `articles.parent_slug` joint à `articles.slug`.

*Écriture* : assignée à la création de l'article (cf. `DESIGN-CER-BATCH-CREATE`). Modifiable post-création via `PATCH /api/articles/:id` (action « changer le parent » dans le panneau Articles du Cerveau cocon) — propage immédiatement au mapping parent/enfant.

**Stores Pinia**
- `useCocoonStrategyStore` — porte la hiérarchie en mémoire (via `proposedArticles[i].parentTitle` et `proposedArticles[i].type`) tant que les articles ne sont pas persistés. Une fois en DB, c'est `useCocoonsStore` qui est l'autorité (jointure `cocoons.articles[]`).
- `useArticlesStore` / `useCocoonsStore` — exposent le `type` et le `parent_slug` aux consommateurs (Moteur, Rédaction, scoring).

**Watchers & réactivité**
- Aucun watcher actif — le niveau est attribué à la création puis figé jusqu'à modification explicite par l'utilisateur. Pas de propagation réactive nécessaire.

**Voir aussi**
- `DESIGN-CER-WORD-COUNT-RECOMMEND` (le niveau drive la fourchette de base).

---

### DESIGN-CER-BATCH-CREATE

**Réf PRD :** [FR-CER-BATCH-CREATE](./prd.md#fr-cer-batch-create)

**Refs code**
- [server/routes/articles.routes.ts](../../server/routes/articles.routes.ts) — handler `POST /api/articles/batch-create`.

**Contrat API**
```
POST /api/articles/batch-create
Body : { cocoonName, articles: [{ suggestedKeyword, suggestedSlug, title, type, painPoint?, level? }] }
Response : { created: Article[], failed: { index, error }[] }
```

**Décision d'architecture**
- L'insertion est faite en une seule transaction par lot pour garantir la cohérence (tous les articles ou aucun, sauf en mode best-effort).
- Le payload IA produit par `DESIGN-CER-STEPS-COCOON` est mappé tel quel — pas de transformation côté front.

**Flux DB**

*Lecture* : aucune côté lot — la production des propositions reste en JSONB sur `cocoon_strategies.data.proposedArticles`. Au moment de l'acceptation par l'utilisateur, le composable `useArticleProposals` lit ce tableau et déclenche les écritures DB.

*Écriture* : `POST /api/articles/batch-create` insère N lignes dans `articles` (titre, type, slug, suggestedKeyword, painPoint, painIntentExpected) en une seule transaction. Effet secondaire : pour chaque article avec un mot-clé suggéré, un appel `POST /api/keywords` enregistre la racine du mot-clé dans `keyword_metrics` afin d'alimenter le cache cross-article. Le `dbId` renvoyé est backfillé sur le `ProposedArticle` correspondant pour le réconcilier au reload.

**Stores Pinia**
- `useCocoonStrategyStore` — porte le tableau `proposedArticles` (état de travail tant que rien n'est validé) ; la sauvegarde via `saveStrategy` persiste l'intention dans `cocoon_strategies.data` avant tout écriture dans `articles`.
- `useCocoonsStore` — refetch déclenché après chaque insertion réussie pour resynchroniser la liste d'articles affichée au dashboard et dans la landing cocon.

**Watchers & réactivité**
- Le watcher décrit dans `DESIGN-CER-STEPS-COCOON` (sur `proposedArticles`) backfille les `dbId` manquants au reload en croisant avec le mapping `title → article.id` de `useCocoonsStore`. C'est lui qui rend la création « idempotente perçue » : si un article a déjà été créé en DB lors d'une session précédente, il est reconnu plutôt que recréé.

**Voir aussi**
- `DESIGN-DASH-NAV` — les articles créés apparaissent immédiatement au dashboard.

---

### DESIGN-CER-MICRO-CONTEXT

**Réf PRD :** [FR-CER-MICRO-CONTEXT](./prd.md#fr-cer-micro-context)

**Refs code**
- [server/routes/articles.routes.ts](../../server/routes/articles.routes.ts) — endpoints `GET / PUT /api/articles/:id/micro-context`.
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — helper `buildMicroContextBlock()` qui injecte le micro-contexte dans les prompts via `{{microContext}}`.

**Persistance**
- Table `article_micro_contexts(article_id PK FK articles, angle, tone, directives, target_word_count)` — cf. `DESIGN-INFRA-MICRO-CONTEXTS`.
- 1 ligne par article, optionnelle.

**Consommateurs des prompts**
- Rédaction : `generate-outline.md`, `generate-article-section.md`, `generate-meta.md`.

**Flux DB**

*Lecture* : à l'ouverture du panneau « Brief & Structure » de la Rédaction, fetch direct de la ligne `article_micro_contexts` correspondante. La valeur est aussi relue côté backend lors de chaque appel de prompt IA via `loadPrompt()` — `buildMicroContextBlock()` la substitue à `{{microContext}}` au moment du run.

*Écriture* : chaque champ (angle / tone / directives / targetWordCount) est sauvegardé au `@blur` via `PUT /api/articles/:id/micro-context` — un upsert qui crée la ligne si absente. Le `LieutenantsPanel` du Moteur peut aussi écrire la `directive` quand l'IA propose une consigne contextuelle.

**Stores Pinia**
- Pas de store dédié : le composant `BriefStructureStep.vue` appelle directement `apiGet` / `apiPut` (cas rare, justifié par la portée locale du formulaire — la valeur n'est consommée que côté backend par les prompts).
- *Décision d'architecture implicite* : ne pas centraliser dans un store évite un canal d'écriture concurrent. Le serveur reste la source de vérité, le composant fait simplement de l'I/O.

**Watchers & réactivité**
- Aucun watcher Vue actif côté front — le formulaire pousse au blur, ne réagit pas à des événements externes.
- *Effet réactif côté backend* : à chaque appel de prompt qui inclut `{{microContext}}`, `buildMicroContextBlock()` relit la table — la dernière valeur sauvegardée est donc utilisée sans cache front, garantissant que toute modification est prise en compte au prochain run IA.

**Voir aussi**
- `DESIGN-CER-WORD-COUNT-RECOMMEND` (alimente le champ `targetWordCount`).
- `DESIGN-INFRA-PROMPT-LOADER`.

---

### DESIGN-CER-WORD-COUNT-RECOMMEND

**Réf PRD :** [FR-CER-WORD-COUNT-RECOMMEND](./prd.md#fr-cer-word-count-recommend)

**Refs code**
- [server/routes/articles.routes.ts](../../server/routes/articles.routes.ts) — endpoint `POST /api/articles/:id/recommend-word-count`.
- [server/services/article/target-word-count.service.ts](../../server/services/article/target-word-count.service.ts) — combinaison des 3 signaux (type base + concurrents avg + IA).

**Fourchettes par niveau (statu quo)**
- Pilier : **1800–3500** mots.
- Intermédiaire : **1200–2500** mots.
- Spécifique : **800–1500** mots.

**Format de réponse**
```
{
  recommended: number,
  breakdown: { typeBase, competitorsAvg, aiSuggestion, finalRecommendation, reasoning }
}
```

**Flux DB**

*Lecture* : la recommandation n'est pas stockée comme telle — elle est **calculée à la demande** en combinant 3 signaux : le type d'article (lu sur `articles.type`), la moyenne des concurrents (lue sur le cache DataForSEO via `external_api_cache`), et une suggestion IA (générée à chaque appel). Le résultat est renvoyé à la volée, le client choisit éventuellement de le persister sur `article_micro_contexts.target_word_count`.

*Écriture* : aucune par l'endpoint lui-même. Si l'utilisateur accepte la recommandation, l'écriture passe par le flux micro-context (`PUT /api/articles/:id/micro-context`).

**Stores Pinia**
- `useBriefStore` — fetch initial avec une recommandation heuristique synchrone (calcul local basé sur le type, pour éviter le flicker), puis appel IA non-bloquant qui remplace la valeur dans `briefData.contentLengthRecommendation` quand la réponse arrive. Garantit qu'un brief s'affiche toujours, même si l'endpoint IA échoue ou tarde.

**Watchers & réactivité**
- Pas de watcher Vue explicite — le pattern « heuristique synchrone + remplacement asynchrone par IA » exploite la réactivité naturelle de `briefData` : tout composant qui lit `contentLengthRecommendation` se re-rend automatiquement quand la promesse IA résout.
- Annulation cross-article : `briefStore.fetchBrief` utilise un `AbortController` interne pour annuler le calcul en vol si l'utilisateur change d'article avant la fin de la requête — évite que l'ancienne reco écrase la nouvelle au race.

**Voir aussi**
- `DESIGN-CER-AIGUILLAGE` (niveau utilisé pour la fourchette).
- `DESIGN-RED-ARTICLE` (la longueur drive `computeSectionBudget`).

---

### DESIGN-CER-THEME-CONFIG

**Réf PRD :** [FR-CER-THEME-CONFIG](./prd.md#fr-cer-theme-config)

**Refs code**
- [server/routes/strategy.routes.ts](../../server/routes/strategy.routes.ts) — endpoints `GET / PUT /api/theme-config`.
- [src/stores/strategy/theme-config.store.ts](../../src/stores/strategy/theme-config.store.ts) — store Pinia singleton.
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — helper `buildThemeContextBlock()` qui produit `{{themeContext}}`.

**Persistance**
- Table `theme_config(id PK = 1, data JSONB)` — singleton applicatif (1 seule ligne, ID forcé à 1).

**Forme du payload `data`**
- `avatar` : { secteur, taille, localisation, budget, maturiteDigitale }
- `positioning` : { audience, promesse, differenciateurs, douleurs }
- `offerings` : { services, ctaPrincipal, cibleCTA }
- `toneOfVoice` : { style, vocabulaire }

**Flux DB**

*Lecture* : `GET /api/theme/config` lit la ligne unique de `theme_config` (id=1). Côté front, le store hydrate une fois au mount du composant configuration. Côté backend, `buildThemeContextBlock()` relit la table à chaque appel de prompt IA pour produire `{{themeContext}}` — pas de cache, la dernière valeur sauvegardée est toujours utilisée.

*Écriture* : `PUT /api/theme/config` réécrit le `data` JSONB complet (le payload est mutable bloc par bloc côté front, mais persisté en une seule transaction). Pas de versionnage : la dernière sauvegarde écrase la précédente.

**Stores Pinia**
- `useThemeConfigStore` — singleton applicatif. Hydrate `config` via `fetchConfig()`, mute via les bindings v-model des formulaires, persiste via `saveConfig()`. Charge avec un `DEFAULT_CONFIG` neutre pour éviter les écrans vides au premier lancement.

**Watchers & réactivité**
- Aucun watcher actif — le store est statique entre deux interactions utilisateur. La réactivité du `config` Vue suffit pour propager les modifications aux formulaires.
- *Effet réactif côté backend* : comme pour le micro-contexte, chaque prompt IA qui inclut `{{themeContext}}` relit la DB. Toute modification de la config par l'utilisateur est donc immédiatement visible au prochain run IA, sans invalidation de cache manuelle.

**Voir aussi**
- `DESIGN-INFRA-PROMPT-LOADER` (mécanique d'injection).

---

### DESIGN-CER-CHECKS

**Réf PRD :** [FR-CER-CHECKS](./prd.md#fr-cer-checks)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — constantes `CERVEAU_*` : `cerveau:strategy_defined`, `cerveau:hierarchy_built`, `cerveau:articles_proposed`.

**Émission**
- `cerveau:strategy_defined` : émis à la consolidation de l'étape 6 (CTA) côté article ou cocon.
- `cerveau:hierarchy_built` : émis à la validation de la structure cocon (Pilier + ≥1 Intermédiaire).
- `cerveau:articles_proposed` : émis après `DESIGN-CER-BATCH-CREATE` (succès du lot).

**Persistance**
- Stockés dans `articles.completed_checks` TEXT[] (cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`).

**Flux DB**

*Lecture* : les checks `cerveau:*` arrivent piggy-back sur `articles.completed_checks` lors du fetch global des articles d'un cocon (`useArticlesStore` / `useArticleProgressStore`). Pas de fetch dédié — partagent le même canal que les checks `moteur:*` et `redaction:*`.

*Écriture* : append d'un check au tableau via `POST /api/articles/:id/progress/check` (cf. `DESIGN-DASH-PROGRESS`). À la date de mise à jour de cette entrée, **aucun émetteur front n'appelle encore ces constantes** : la stack technique est prête (constantes définies, endpoint disponible, migration `_archive/020_normalize_completed_checks.sql` ayant aligné les valeurs historiques) mais aucun composant Cerveau ne dispatche `addCheck(CERVEAU_*)` aujourd'hui. C'est un trou d'implémentation à combler — les dots Cerveau du dashboard restent éteints.

**Stores Pinia**
- `useArticleProgressStore` — destination des checks `cerveau:*` une fois qu'un émetteur sera branché. Même flux que les checks Moteur (cf. `DESIGN-DASH-PROGRESS`).

**Watchers & réactivité**
- Pas de watcher actif tant que les checks ne sont pas émis. Quand un émetteur sera branché : `progressMap[articleId]` mutera et les composants qui en dépendent (cartes article du dashboard, bannières de transition) se rerenderont automatiquement. Le pattern réactif est déjà éprouvé côté Moteur (cf. `DESIGN-DASH-PROGRESS`).

**Voir aussi**
- `DESIGN-DASH-PROGRESS` (les dots remontent ces checks).

---

### DESIGN-CER-CONTEXT-FOR-MOTEUR

**Réf PRD :** [FR-CER-CONTEXT-FOR-MOTEUR](./prd.md#fr-cer-context-for-moteur)

**Refs code**
- [server/routes/cocoons.routes.ts](../../server/routes/cocoons.routes.ts) — endpoint `GET /api/cocoons/:id/strategy/context`.
- [src/composables/moteur/useMoteurBridge.ts](../../src/composables/moteur/useMoteurBridge.ts) — composable côté front.
- [src/components/moteur/MoteurStrategyContext.vue](../../src/components/moteur/MoteurStrategyContext.vue) — composant d'affichage en lecture seule.

**Contrat de réponse**
```
{ cocoonName, siloName, cible, douleur, angle, promesse, cta }
```
Seules les valeurs **validated** sont incluses. Les valeurs non-validées ou vides sont **omises** (pas de string vide).

**Mécanique de fallback**
- Si la stratégie cocon est entièrement vide, l'endpoint répond `{ cocoonName, siloName }` seulement.
- Les prompts Moteur qui reçoivent `{{strategy_context}}` substituent par une **chaîne vide** si la variable manque — aucun crash, dégradation silencieuse.

**Flux DB**

*Lecture* : au mount du Moteur ou de la Rédaction, l'endpoint joint `cocoons` (pour le nom), `silos` (pour le silo parent) et `cocoon_strategies` (pour les 6 valeurs validated). Seules les valeurs effectivement renseignées par l'utilisateur lors des étapes Cerveau sont retournées — les `null`/strings vides sont filtrés côté serveur pour éviter de polluer les prompts Moteur.

*Écriture* : aucune — endpoint purement lecture. La source `cocoon_strategies.data` est écrite par le Cerveau (cf. `DESIGN-CER-STEPS-COCOON`).

**Stores Pinia**
- `useCocoonStrategyStore` — c'est ce store (et non un store dédié) qui porte `strategicContext`. La méthode `fetchContext(cocoonId)` est appelée directement depuis `MoteurView.vue` et `RedactionView.vue` au mount. Le `MoteurStrategyContext.vue` lit ensuite `strategyStore.strategicContext.*` en propriétés. *Note : la référence à `src/composables/moteur/useMoteurBridge.ts` dans les Refs code est obsolète — pas de composable bridge dédié, l'intégration est directe view → store.*

**Watchers & réactivité**
- Aucun watcher actif — le contexte est figé au mount de l'écran Moteur/Rédaction. Si l'utilisateur retourne au Cerveau, modifie la stratégie cocon, puis revient au Moteur, le contexte ne sera **pas** rafraîchi automatiquement : un remount de l'écran est nécessaire (navigation Vue Router) pour redéclencher `fetchContext`.
- *Conséquence* : les prompts Moteur qui injectent `{{strategy_context}}` consomment toujours la valeur la plus à jour côté serveur (relue à chaque appel), mais le bandeau d'affichage côté UI peut rester en retard d'un load.

**Voir aussi**
- `DESIGN-INFRA-PROMPT-LOADER`.
- `DESIGN-MOT-STRATEGY-INJECTION`.

---

### DESIGN-PIE-AI-GENERATION

**Réf PRD :** [FR-PIE-AI-GENERATION](./prd.md#fr-pie-ai-generation--génération-automatique-de-lintention-éditoriale-par-lia-cerveau-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [server/prompts/cocoon-articles.md](../../server/prompts/cocoon-articles.md), [cocoon-articles-spe.md](../../server/prompts/cocoon-articles-spe.md), [cocoon-add-article.md](../../server/prompts/cocoon-add-article.md) — prompts qui produisent `painIntentExpected`.
- [shared/schemas/](../../shared/schemas/) — `painIntentExpectedSchema` (4 valeurs énum + nullable).

**Tables consommées** : `articles.pain_intent_expected TEXT NULL`.

**Flux DB** : à l'`addArticlesToCocoon`, le champ est persisté dans `articles.pain_intent_expected`. Migration `014_articles_pain_intent_expected.sql`.

**Décisions d'architecture**
- Pas d'appel IA supplémentaire — inclus dans la même réponse que les autres métadonnées article.
- Rétro-compat : si l'IA omet le champ, persistance `NULL` (pas d'erreur 500).

**Voir aussi** : `DESIGN-PIE-CERVEAU-OVERRIDE`, `DESIGN-CAP-RELEVANCE-INTENT-SIGNAL`.

---

### DESIGN-PIE-CERVEAU-OVERRIDE

**Réf PRD :** [FR-PIE-CERVEAU-OVERRIDE](./prd.md#fr-pie-cerveau-override--correction-manuelle-de-lintention-éditoriale-par-lutilisateur-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [src/components/production/ProposedArticleRow.vue](../../src/components/production/ProposedArticleRow.vue) — sélecteur radio.

**Endpoints** : `PUT /api/articles/:id` (payload `{ painIntentExpected }`).

**Tables consommées** : `articles.pain_intent_expected`.

**Décisions d'architecture**
- Persistance immédiate au changement (pas de bouton Enregistrer).
- Notification toast confirme.

**Voir aussi** : `DESIGN-PIE-AI-GENERATION`.

---

## §8.2 — Dashboard / Cocoon Landing (DESIGN-DASH)

### DESIGN-DASH-NAV

**Réf PRD :** [FR-DASH-NAV](./prd.md#fr-dash-nav)

**Refs code**
- [src/views/DashboardView.vue](../../src/views/DashboardView.vue) — page racine, charge silos / cocons / articles.
- [src/components/dashboard/SiloCard.vue](../../src/components/dashboard/SiloCard.vue) — carte silo (titre + compteur d'articles).
- [src/components/dashboard/CocoonCard.vue](../../src/components/dashboard/CocoonCard.vue) — carte cocon (titre + compteur d'articles + état d'avancement).
- [src/components/dashboard/ArticleCard.vue](../../src/components/dashboard/ArticleCard.vue) — carte article (titre + dots de progression, cf. `DESIGN-DASH-PROGRESS`).

**Endpoints**
- `GET /api/silos` (avec compteurs agrégés).
- `GET /api/cocoons?siloId=…`.
- `GET /api/articles?cocoonId=…`.

**Tables consommées** : `silos`, `cocoons`, `articles`. Authority : schéma initial — pas de FR-INFRA dédiée car ces 3 tables sont fondatrices.

**Flux DB**

*Lecture* : au mount du dashboard, fetch agrégé des silos avec compteurs d'articles, puis lazy fetch des cocons et articles à la demande lors du drill-down.

*Écriture* : aucune — la navigation est en lecture seule.

**Stores Pinia**
- `useSilosStore` — hydrate la liste des silos au mount du dashboard.
- `useCocoonsStore` — hydrate les cocons d'un silo à la demande.
- `useArticlesStore` — hydrate la liste d'articles d'un cocon (fetch déclenché par la landing cocon).

**Watchers & réactivité**
- Aucun watcher actif : navigation en lecture pure au mount.
- Les compteurs agrégés (`article_count` par silo) sont figés au fetch — pas de live refresh si un article est créé/supprimé dans une autre session. Un reload est nécessaire pour resynchroniser. *(Acceptable en single-user local.)*

**Voir aussi**
- `DESIGN-DASH-PROGRESS` (dots affichés sur chaque carte article — couche réactive sur `articles.completed_checks`).
- `DESIGN-DASH-WORKFLOW-CHOICE` (cible du clic sur un cocon).

---

### DESIGN-DASH-PROGRESS

**Réf PRD :** [FR-DASH-PROGRESS](./prd.md#fr-dash-progress)

**Refs code**
- [src/components/dashboard/ArticleCard.vue](../../src/components/dashboard/ArticleCard.vue) — rendu des dots ●/○.
- [src/components/dashboard/ProgressDots.vue](../../src/components/dashboard/ProgressDots.vue) — composant atomique réutilisable (consommé aussi par le tree Moteur, cf. `FR-MOT-DISPLAY-FROM-STORE`).
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — store Pinia qui hydrate `articles.completed_checks` et expose `progressMap`.

**Tables consommées** : `articles` (colonne `completed_checks` TEXT[] — SSOT progression, cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`).

**Flux DB**

*Lecture* : `completed_checks` est hydraté avec la liste des articles d'un cocon, dans la même requête qui peuple `useArticlesStore`. Pas de fetch dédié — la colonne arrive piggy-back avec le reste de l'article.

*Écriture* : depuis le Moteur, toute action utilisateur (verrouiller Capitaine, valider Lexique...) envoie au backend une mutation ciblée qui appende ou retire un check au tableau. Réponse réactive optimistic update côté front, dot mis à jour sans reload.

**Stores Pinia**
- `useArticleProgressStore` (`AUTHORITY:` sur `articles.completed_checks`) — hydrate les checks par article, expose `progressMap` indexé par `articleId`, fournit les actions `addCheck` / `removeCheck`.
- `useArticlesStore` — fournit l'identité et le titre des articles ; la jointure visuelle (titre + dots) se fait au composant.

**Watchers & réactivité**
- `progressMap` est un **computed indexé** observable : tout `addCheck` côté Moteur déclenche un re-rendu des dots affichés sur le dashboard à l'arrière-plan (même session navigateur).
- Pattern « lire depuis le store, pas depuis les props » — `ArticleCard.vue` lit `progressMap[id]` plutôt qu'une prop figée passée par le parent (cf. `DESIGN-MOT-DISPLAY-FROM-STORE`).

**Voir aussi**
- `DESIGN-MOT-CHECKS` (émetteurs des checks).
- `DESIGN-MOT-DISPLAY-FROM-STORE` (pattern lecture store vs props).
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` (constantes des check strings).

---

### DESIGN-DASH-WORKFLOW-CHOICE

**Réf PRD :** [FR-DASH-WORKFLOW-CHOICE](./prd.md#fr-dash-workflow-choice)

**Refs code**
- [src/views/CocoonLandingView.vue](../../src/views/CocoonLandingView.vue) — page d'atterrissage d'un cocon.
- [src/components/dashboard/WorkflowChoice.vue](../../src/components/dashboard/WorkflowChoice.vue) — composant qui rend les 3 portes (Cerveau / Moteur / Rédaction).

**Routes Vue Router**
- Porte Cerveau → `/cocoon/:cocoonId/brain`.
- Porte Moteur → `/cocoon/:cocoonId/article/:articleId/moteur` (ou écran de sélection d'article si aucun sélectionné).
- Porte Rédaction → `/cocoon/:cocoonId/article/:articleId/redaction` (ou écran de sélection).

**Flux DB**

*Lecture* : au mount de la landing, lecture combinée du cocon (titre, silo parent), de sa stratégie cocon (preview pour annoter la porte Cerveau si renseignée), et de sa liste d'articles (pour annoter les portes Moteur/Rédaction avec un état d'avancement agrégé).

*Écriture* : aucune — c'est uniquement de la navigation.

**Stores Pinia**
- `useCocoonsStore` — fournit le cocon courant + son silo.
- `useCocoonStrategyStore` (alias du store stratégie cocon) — fournit la preview stratégie pour annoter la porte Cerveau.
- `useArticlesStore` + `useArticleProgressStore` — fournissent la liste d'articles + leurs checks pour l'agrégat « Moteur en cours / Rédaction démarrée ».

**Watchers & réactivité**
- Aucun watcher actif — la landing est une page de transit. Le clic sur une porte navigue, ne modifie rien.

**Décision d'architecture — libre arbitre**
Aucune porte n'est désactivée par l'absence d'étapes précédentes. C'est un choix produit délibéré : le workflow Cerveau → Moteur → Rédaction est suggéré (par les dots du dashboard, par les bannières `PhaseTransitionBanner` côté Moteur), pas imposé. L'utilisateur expert peut entrer directement en Rédaction et revenir au Cerveau plus tard. Cf. `DESIGN-MOT-FREE-NAV`, `DESIGN-UX-STABLE-SKELETON`.

**Voir aussi**
- `DESIGN-MOT-FREE-NAV` (même principe côté Moteur).
- `DESIGN-CER-STEPS-COCOON` (contenu de la porte Cerveau).

---

## §8.3 — Moteur — règles transversales (DESIGN-MOT)

### DESIGN-MOT-PHASES

**Réf PRD :** [FR-MOT-PHASES](./prd.md#fr-mot-phases--trois-phases-visuelles-explorer--valider--finaliser)

**Refs code**
- [src/composables/moteur/useMoteurTabs.ts](../../src/composables/moteur/useMoteurTabs.ts) — composable qui définit les 3 `Phase` (Générer / Valider / Finaliser), expose `phases`, `activeTab`, `navGroups`, `computeSmartTab(articleId)`.
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — vue qui consomme `useMoteurTabs` et publie `navGroups` dans la `WorkflowNav` du slot navbar.
- [src/components/shared/WorkflowNav.vue](../../src/components/shared/WorkflowNav.vue) — rendu visuel des groupes de phases avec leur numéro.

**Constantes**
- `TAB_IDS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique', 'finalisation']` (ordre canonique).
- Phase `generer` (n°1) = `discovery`, `radar`. Phase `valider` (n°2) = `capitaine`, `lieutenants`, `lexique`. Phase `finaliser` (n°3) = `finalisation`.

**Flux DB**

*Lecture* : aucune lecture DB côté composable phases — la définition est purement structurelle. La progression utilisateur (qui colore éventuellement les pastilles de phase) est dérivée de `articles.completed_checks` via `useArticleProgressStore`.

*Écriture* : aucune. Changer d'onglet ne déclenche aucune mutation DB (cf. `DESIGN-MOT-NO-AUTO-ACTION`).

**Stores Pinia**
- `useWorkflowNavStore` — pont entre la vue Moteur et la navbar globale. `MoteurView` publie ses `navGroups` au mount, `clearWorkflowNav` au unmount.
- `useArticleProgressStore` — fournit `completedChecks` lus par `computeSmartTab` pour choisir l'onglet de départ pertinent.

**Watchers & réactivité**
- `watch([navGroups, activeTab], ...)` dans `useMoteurTabs` republie l'état nav vers le store à chaque mutation — la navbar globale reflète immédiatement le changement d'onglet ou de gating.
- `onBeforeUnmount` appelle `workflowNavStore.clearWorkflowNav()` — la navbar reprend son état neutre quand on quitte la vue Moteur.

**Voir aussi**
- `DESIGN-MOT-FREE-NAV` (l'utilisateur peut cliquer dans n'importe quelle phase).
- `DESIGN-MOT-SOFT-GATING` (verrouillage doux par phase).
- `DESIGN-MOT-PHASE-TRANSITION` (bandeau d'invitation au passage de phase).

---

### DESIGN-MOT-FREE-NAV

**Réf PRD :** [FR-MOT-FREE-NAV](./prd.md#fr-mot-free-nav--navigation-libre-entre-tous-les-onglets)

**Refs code**
- [src/composables/moteur/useMoteurTabs.ts](../../src/composables/moteur/useMoteurTabs.ts) — `setActiveTab(tabId)` accepte n'importe quel `TAB_IDS`, sans préalable autre que sa validité.
- [src/composables/moteur/useMoteurSoftGating.ts](../../src/composables/moteur/useMoteurSoftGating.ts) — porte le verrouillage souple : ce qui est conditionné, c'est l'**écriture** dans l'onglet, pas son **ouverture**.
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — handler `setActiveTab` exposé sans condition (sauf article sélectionné, cf. `DESIGN-MOT-ARTICLE-SELECTION`).

**Décisions d'architecture**
- **Pas de blocage dur cross-phases.** Le PRD assume un utilisateur expert qui peut vouloir consulter une étape future pour comprendre, sans encore l'avoir préparée. Une porte fermée = friction inutile.
- **Le `locked` visuel** (cf. `navGroups[].items[].locked`) n'est posé que dans 2 cas : article non sélectionné, ou Discovery/Radar gelés car validation cocon faite (cf. `DESIGN-MOT-SOFT-GATING` règle 2).

**Voir aussi**
- `DESIGN-MOT-SOFT-GATING` (ce qui est conditionné côté écriture).
- `DESIGN-DASH-WORKFLOW-CHOICE` (même principe Cerveau / Moteur / Rédaction au niveau dashboard).

---

### DESIGN-MOT-SOFT-GATING

**Réf PRD :** [FR-MOT-SOFT-GATING](./prd.md#fr-mot-soft-gating--verrouillage-doux-des-écritures-phase--)

**Refs code**
- [src/composables/moteur/useMoteurSoftGating.ts](../../src/composables/moteur/useMoteurSoftGating.ts) — composable extrait de `MoteurView` (Vague 3) qui dérive les booléens `isCaptaineLocked`, `isLieutenantsLocked`, `isLexiqueValidated`, `finalisationUnlocked`, `finalisationButtonTitle`, `isDiscoveryAllowed`.
- [src/composables/moteur/useFinalisationGating.ts](../../src/composables/moteur/useFinalisationGating.ts) — logique pure testable : `isFinalisationUnlocked(checks)` + `finalisationButtonTitle(checks)`.
- [tests/unit/composables/moteur/useMoteurSoftGating.test.ts](../../tests/unit/composables/moteur/useMoteurSoftGating.test.ts) — tests unitaires.

**Tables consommées** : `articles.completed_checks` TEXT[] (lecture via `useArticleProgressStore`).

**Flux DB**

*Lecture* : `completed_checks` est hydraté par `useArticleProgressStore.fetchProgress(id)` au switch d'article (cf. `DESIGN-MOT-ARTICLE-SELECTION`). Les 3 booléens sont des `computed` qui appellent `articleProgressStore.getProgress(id)?.completedChecks?.includes(MOTEUR_*_LOCKED)`.

*Écriture* : aucune écriture côté composable — il ne fait que dériver. Les écritures viennent des onglets Capitaine / Lieutenants / Lexique qui posent leur check au moment du verrouillage utilisateur.

**Stores Pinia**
- `useArticleProgressStore` — source des `completedChecks`.
- `useKeywordsStore` — source pour `isDiscoveryAllowed` : si le keyword article a un `status` autre que `'suggested'`, Discovery/Radar sont gelés.

**Watchers & réactivité**
- Tous les booléens sont des `computed` chaînés sur le store. Toute action `addCheck(MOTEUR_CAPITAINE_LOCKED)` côté Capitaine déclenche instantanément la bascule de `finalisationUnlocked` si c'était le dernier verrou manquant, et donc l'activation du bouton « Continuer vers la Rédaction » dans la même tick (cf. `DESIGN-FIN-LINK-REDACTION`).

**Décisions d'architecture**
- **Composable séparé de la logique pure (`useFinalisationGating`)** : la formule `capitaineLocked && lieutenantsLocked && lexiqueValidated` est extraite dans un module testable sans monter Vue. `useMoteurSoftGating` glue le store + composants ; `useFinalisationGating` reste pure.
- **`isDiscoveryAllowed` côté composable, pas côté store** : c'est une **dérivation** de l'état keyword article, pas un état stocké. Le store keywords ne porte pas de notion de « phase ② ».

**Voir aussi**
- `DESIGN-MOT-CHECKS` (producteurs des 3 verrous).
- `DESIGN-FIN-LINK-REDACTION` (consommateur direct de `finalisationUnlocked`).

---

### DESIGN-MOT-ARTICLE-SELECTION

**Réf PRD :** [FR-MOT-ARTICLE-SELECTION](./prd.md#fr-mot-article-selection--sélection-préalable-dun-article-pour-agir)

**Refs code**
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — `selectedArticle` ref locale, `handleSelectArticle(article)` qui met à jour la ref, déclenche les fetchs liés et reset l'état cross-tab.
- [src/components/moteur/MoteurContextRecap.vue](../../src/components/moteur/MoteurContextRecap.vue) — composant qui présente les listes Articles suggérés / publiés et émet la sélection.
- [src/composables/moteur/useMoteurTabs.ts](../../src/composables/moteur/useMoteurTabs.ts) — `navGroups` rend chaque item `locked: true` quand `!selectedArticle.value`, avec hint « Sélectionnez un article ci-dessus ».

**Flux DB**

*Lecture* : à la sélection d'un article, plusieurs fetchs parallèles sont déclenchés via les stores : `articleProgressStore.fetchProgress(id)`, `articleKeywordsStore.fetchKeywordsMerge(id)`, `radarExplorationStore.setArticle(id)`, `refreshExplorationCounts()`. Chacun lit sa table dédiée (`articles`, `article_keywords`, `radar_explorations`, etc.).

*Écriture* : aucune écriture liée au seul fait de sélectionner — la session de travail démarre, mais rien n'est encore figé.

**Stores Pinia**
- `useArticleProgressStore`, `useArticleKeywordsStore`, `useRadarExplorationStore` — hydratent leur slice respective pour l'article sélectionné.

**Watchers & réactivité**
- `watch(() => selectedArticle.value?.id ?? null, (newId) => radarExplorationStore.setArticle(newId), { immediate: true })` — synchronise le store radar dès qu'un id valide est setté, peu importe le chemin (clic, restauration au mount, deep-link).
- `useMoteurArticleSync` porte un watch défensif identique sur les `explorationCounts`.

**Voir aussi**
- `DESIGN-MOT-RECAP-PUBLISHED` (source des listes d'articles).
- `DESIGN-MOT-EXPLORATION-COUNTS` (counts rafraîchis au switch).

---

### DESIGN-MOT-RECAP-PUBLISHED

**Réf PRD :** [FR-MOT-RECAP-PUBLISHED](./prd.md#fr-mot-recap-published--séparation-stricte--articles-suggérés--vs--articles-publiés-)

**Refs code**
- [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) — `loadArticlesDb()` ligne 145-150 dérive `publishedArticles` côté backend en filtrant `phase IN ('redaction', 'published')`.
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — `publishedArticles = cocoon.value?.publishedArticles ?? []` : lit le champ déjà filtré, pas de filtre Vue.
- [src/components/moteur/MoteurContextRecap.vue](../../src/components/moteur/MoteurContextRecap.vue) — composant des 2 sections repliables.

**Tables consommées** : `articles` (colonne `phase` parmi `'proposed' | 'moteur' | 'redaction' | 'published'`).

**Flux DB**

*Lecture* : `loadArticlesDb()` charge tous les articles de chaque cocon (full list dans `cocoon.articles`), puis dérive en O(n) en mémoire un sous-ensemble `cocoon.publishedArticles` contenant uniquement les phases `redaction` et `published`. Pas de seconde requête SQL — la dérivation est gratuite sur le set déjà hydraté.

*Écriture* : aucune côté Moteur. La promotion en phase `redaction` ou `published` se fait depuis la Rédaction (cf. domaine FR-RED).

**Décisions d'architecture**
- **Dérivation backend, pas frontend.** Garantit un contrat API unique — `LinkingMatrix`, `BriefStructureStep`, `useArticleProposals` (autres consommateurs Vue) ne peuvent pas dupliquer ce filtre par méprise.
- **Type non-optionnel** : `Cocoon.publishedArticles: Article[]` toujours présent (vide si rien), évite les `?? []` partout côté front.
- **Pourquoi pas un WHERE en SQL** : la liste complète `cocoon.articles` reste nécessaire pour la sélection principale et les autres consommateurs ; ajouter un WHERE filtrerait trop tôt.

**Critères d'acceptation techniques**
- Contract-api : un cocon avec 3 `proposed` + 2 `moteur` + 2 `redaction` + 1 `published` renvoie `cocoon.articles.length === 8` et `cocoon.publishedArticles.length === 3`.
- Type : `Cocoon.publishedArticles` typé non-optionnel.

**Voir aussi**
- `DESIGN-MOT-ARTICLE-SELECTION` (qui consomme ces deux listes).
- `DESIGN-CER-STEPS-ARTICLE` (phase `proposed` posée par défaut à la création d'article via Cerveau).

---

### DESIGN-MOT-MODE-BIMODAL

**Réf PRD :** [FR-MOT-MODE-BIMODAL](./prd.md#fr-mot-mode-bimodal--composants-moteur-réutilisables-en-mode-workflow-ou-libre)

**Refs code**
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — prop `mode: "workflow" | "libre"`, `v-if="mode === 'workflow'"` sur les boutons et watchers de check.
- [src/components/moteur/LieutenantsPanel.vue](../../src/components/moteur/LieutenantsPanel.vue) — même contrat.
- [src/components/moteur/LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — même contrat.

**Décisions d'architecture**
- **Un composant, deux contextes** : l'écran Moteur monte en mode `workflow` (article sélectionné), un futur écran d'exploration libre peut monter le même composant en mode `libre` avec article virtuel id=0.
- **Les checks de progression sont conditionnés par `mode === 'workflow'`** : en mode libre, aucun `addCheck` n'est émis.
- **Les seuils contextuels (Pilier / Intermédiaire / Spécialisé)** sont passés en prop en mode workflow ; en mode libre, ce sont des valeurs par défaut modifiables.

**Voir aussi**
- `DESIGN-MOT-CHECKS` (les emits conditionnés par `mode === 'workflow'`).
- `DESIGN-UI-MOTEUR-SHARED` (cohérence visuelle cross-contextes).

---

### DESIGN-MOT-CHECKS

**Réf PRD :** [FR-MOT-CHECKS](./prd.md#fr-mot-checks--cinq-étapes-moteur-tracées-dans-la-progression-de-larticle)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — déclare les 5 constantes `MOTEUR_DISCOVERY_DONE`, `MOTEUR_RADAR_DONE`, `MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED` (lignes 15-19).
- [src/composables/moteur/useMoteurCrossTabState.ts](../../src/composables/moteur/useMoteurCrossTabState.ts) — émet `MOTEUR_DISCOVERY_DONE` (handleSendToRadar) et `MOTEUR_RADAR_DONE` (handleRadarScanned).
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — émet `MOTEUR_CAPITAINE_LOCKED` (verrouillage utilisateur).
- [src/components/moteur/LieutenantsPanel.vue](../../src/components/moteur/LieutenantsPanel.vue) — émet `MOTEUR_LIEUTENANTS_LOCKED`.
- [src/components/moteur/LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — émet `MOTEUR_LEXIQUE_VALIDATED`.
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — `addCheck(id, check)` et `removeCheck(id, check)`.

**Endpoints**
- `POST /api/articles/:id/progress/check` — ajout d'un check (validation Zod via `addCheckSchema`).
- `POST /api/articles/:id/progress/uncheck` — retrait d'un check. *(Note : pas un `DELETE` malgré la description historique du PRD — cf. DRIFT-008.)*

**Tables consommées** : `articles.completed_checks` TEXT[] (SSOT progression — cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`).

**Flux DB**

*Lecture* : `completedChecks` est hydraté avec la liste des articles d'un cocon via `useArticleProgressStore.fetchProgress(id)` au switch d'article.

*Écriture* : un emit `check-completed` côté composant remonte à `MoteurView` qui appelle `useMoteurArticleSync.emitCheckCompleted(check)` → `articleProgressStore.addCheck(id, check)` → `POST /articles/:id/progress/check` → mise à jour du tableau côté DB. Optimistic update côté store : la réponse remplace l'entrée locale dans le même tick.

**Stores Pinia**
- `useArticleProgressStore` (`AUTHORITY:` sur `articles.completed_checks`) — actions `addCheck` / `removeCheck`.

**Watchers & réactivité**
- Le `progressMap` est observable : tout `addCheck` met à jour les dots du dashboard à l'arrière-plan dans la même session (cf. `DESIGN-DASH-PROGRESS`) et la barre de gating souple (cf. `DESIGN-MOT-SOFT-GATING`).

**Décisions d'architecture**
- **5 checks Moteur, pas 6** : pas de `MOTEUR_FINALISATION_*` — l'onglet Finalisation est read-only (cf. `DESIGN-FIN-CHECK`).
- **Émission strictement via constantes** (cf. `DESIGN-MOT-CHECKS-CONSTANTS`).

**Voir aussi**
- `DESIGN-MOT-CHECKS-CONSTANTS` (validation regex + test garde anti-régression).
- `DESIGN-MOT-CHECK-RECONCILIATION` (réconciliation défensive au mount).
- `DESIGN-DASH-PROGRESS` (consommateur visuel).

---

### DESIGN-MOT-CHECKS-CONSTANTS

**Réf PRD :** [FR-MOT-CHECKS-CONSTANTS](./prd.md#fr-mot-checks-constants--catalogue-strict-des-étapes-de-progression)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — catalogue unique des 13 checks (5 Moteur + 3 Cerveau + 5 Rédaction).
- [shared/schemas/article-progress.schema.ts](../../shared/schemas/article-progress.schema.ts) — `addCheckSchema = z.object({ check: z.string().regex(workflowCheckRegex, ...) })` — validation backend.
- [tests/unit/coherence/completed-checks.test.ts](../../tests/unit/coherence/completed-checks.test.ts) — test garde-fou qui scanne tous les `.ts` / `.vue` de `src/` et échoue si un littéral check legacy y apparaît.

**Tables consommées** : `articles.completed_checks` TEXT[].

**Flux DB**

*Lecture* : tous les lecteurs de checks (gating, dots, recap) lisent via les constantes — aucune string en dur.

*Écriture* : `addCheckSchema.safeParse({ check })` rejette tout format non-conforme avec un 400 avant insertion. La regex impose `<prefix>:<snake_case_action>` avec préfixe ∈ {`moteur`, `cerveau`, `redaction`}.

**Décisions d'architecture**
- **Préfixe par workflow** : permet la cohabitation des checks Moteur / Cerveau / Rédaction dans la même colonne flat `TEXT[]` sans collision (un `capitaine_locked` Moteur et un hypothétique `capitaine_locked` Cerveau ne se confondent jamais).
- **Validation backend, pas frontend** : la regex Zod côté backend est la garde finale. Un client malveillant ou un bug front qui tente d'écrire un check arbitraire est rejeté.
- **Test garde-fou anti-régression** : `tests/unit/coherence/completed-checks.test.ts` empêche un nouveau code de réintroduire un littéral legacy (typiquement `'capitaine_locked'` sans préfixe).

**Historique**
- **2026-05-08** : migration `020_normalize_completed_checks.sql` (archivée dans `server/db/migrations/_archive/`) — convertit tous les checks legacy en base au format préfixé, élimine les doublons. Le snapshot `server/db/schema.sql` actuel reflète l'état post-migration. *(cf. DRIFT-010.)*
- Sites corrigés en parallèle : `CaptainPanel.vue` (4 emits), `BriefStructureStep.vue` (1 emit), `useMoteurSoftGating.ts` (3 lectures), `useMoteurTabs.ts` (2 lectures), `useMoteurCrossTabState.ts` (2 emits).

**Voir aussi**
- `DESIGN-MOT-CHECKS` (consommateurs).
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` (catalogue exhaustif des 13 checks).

---

### DESIGN-MOT-PHASE-TRANSITION

**Réf PRD :** [FR-MOT-PHASE-TRANSITION](./prd.md#fr-mot-phase-transition--bandeau-dinvitation-au-passage-de-phase)

**Refs code**
- [src/components/moteur/PhaseTransitionBanner.vue](../../src/components/moteur/PhaseTransitionBanner.vue) — composant du bandeau.
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — orchestre l'apparition du bandeau en fonction de `nextTab` (computé par `useMoteurTabs`) et de l'état des checks.
- [tests/unit/components/phase-transition-banner.test.ts](../../tests/unit/components/phase-transition-banner.test.ts) — tests du composant.

**Décisions d'architecture**
- **Suggestion, pas redirection** : le bandeau propose, ne navigue pas tout seul. Click utilisateur → `setActiveTab(nextTab)`. Cohérent avec `DESIGN-MOT-NO-AUTO-ACTION`.
- **Reste affiché** : tant que la phase n'est pas franchie ou que le bandeau n'est pas fermé manuellement, il reste — pas de hide-on-scroll surprise.

**Voir aussi**
- `DESIGN-MOT-NO-AUTO-ACTION` (même philosophie : pas d'auto-nav).

---

### DESIGN-MOT-NO-AUTO-ACTION

**Réf PRD :** [FR-MOT-NO-AUTO-ACTION](./prd.md#fr-mot-no-auto-action--aucune-action-automatique-au-changement-donglet)

**Refs code**
- [src/composables/moteur/useMoteurTabs.ts](../../src/composables/moteur/useMoteurTabs.ts) — `setActiveTab` ne déclenche **que** la bascule de tab + le tracking `visitedTabs` ; aucun appel réseau.
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — chaque action coûteuse est derrière un bouton dédié (`@click="lancerScan"`, `@click="extraireLexique"`, etc.).

**Décisions d'architecture**
- **Coût explicite** : l'utilisateur doit cliquer un bouton libellé pour qu'un appel externe (DataForSEO, Anthropic, scraping) parte. Naviguer entre onglets ne coûte rien.
- **Exception : lectures DB locales** : afficher des données déjà persistées (counts, explorations passées) est gratuit et peut se déclencher au mount ou au switch — c'est de la lecture, pas une action coûteuse.

**Voir aussi**
- `DESIGN-MOT-CACHE-CASCADE` (qui réduit encore le coût des appels payants).
- `DESIGN-MOT-PHASE-TRANSITION` (cohérence : pas d'auto-nav).

---

### DESIGN-MOT-RAW-KPIS

**Réf PRD :** [FR-MOT-RAW-KPIS](./prd.md#fr-mot-raw-kpis--métriques-marché-toujours-visibles-jamais--0--par-défaut)

**Refs code**
- [src/utils/score.ts](../../src/utils/score.ts) — helpers `formatVolume`, `formatCpc`, `formatKd`, `formatPercent` qui retournent `—` quand l'entrée est `null` / `undefined`.
- Composants cards Radar / Capitaine — affichent `{{ formatVolume(kpis.searchVolume) }}` (jamais `kpis.searchVolume ?? 0`).

**Décisions d'architecture**
- **Types nullables de bout en bout** (cf. `FR-INFRA-KPI-NULLABLE`) — `searchVolume`, `keywordDifficulty`, `cpc`, `competition` sont `number | null` à tous les étages (DB → service → store → composant).
- **Pas de fallback silencieux `?? 0`** — règle ESLint dédiée (cf. `FR-INFRA-NO-SCORE-FALLBACK`).

**Voir aussi**
- `DESIGN-INFRA-KPI-NULLABLE` (le contrat type).
- `DESIGN-INFRA-KPI-DISPLAY-DASH` (l'affichage `—`).

---

### DESIGN-MOT-CACHE-CASCADE

**Réf PRD :** [FR-MOT-CACHE-CASCADE](./prd.md#fr-mot-cache-cascade--cache-consulté-avant-tout-appel-externe-payant)

**Refs code**
- [server/db/cache-helpers.ts](../../server/db/cache-helpers.ts) — `getCached(cacheType, cacheKey)`, `setCached(cacheType, cacheKey, data, ttlMs)`, `deleteCached(...)` — primitives atomiques sur `external_api_cache`.
- [server/services/keyword/keyword-metrics.service.ts](../../server/services/keyword/keyword-metrics.service.ts) — utilisations du cache cross-article permanent (table `keyword_metrics`).
- [server/services/intent/community-discussions.service.ts](../../server/services/intent/community-discussions.service.ts), [server/services/keyword/keyword-discovery.service.ts](../../server/services/keyword/keyword-discovery.service.ts) — implémentent localement un `getOrFetch<T>(cacheType, key, ttlMs, fetcher)` qui chaîne `getCached` → fetcher → `setCached`.

**Tables consommées**
- `keyword_metrics` (cache cross-article permanent : 1 ligne par keyword × lang × country, jamais expirée).
- `external_api_cache` (cache à TTL : `cache_type` + `cache_key`, expire après `expires_at`).

**Flux DB**

*Lecture (cascade)* :
1. Service appelle `getCached(type, key)` → SELECT sur `external_api_cache WHERE expires_at > NOW()`.
2. Si miss et la donnée est cross-article par nature, lecture `keyword_metrics` via les services dédiés.
3. Si miss complet : appel externe (DataForSEO, Anthropic…) → résultat stocké via `setCached` (TTL) et/ou UPSERT `keyword_metrics` (permanent).

*Écriture* : `setCached` fait un UPSERT `(cache_type, cache_key)` avec nouveau `expires_at = NOW() + ttlMs`.

**Décisions d'architecture**
- **Pattern, pas helper** : `getOrFetch` est dupliqué dans chaque service qui en a besoin plutôt que centralisé dans `cache-helpers.ts`. *(cf. DRIFT-009 — opportunité de factorisation future.)*
- **Deux niveaux de cache** : cross-article (permanent, métier) pour ce qui ne change que rarement ; TTL (volatile, transactionnel) pour ce qui peut bouger.

**Voir aussi**
- `DESIGN-MOT-EXTERNAL-CACHE-CLEAR` (le bouton qui purge le niveau TTL).
- `DESIGN-INFRA-CACHE` (vue d'ensemble du cache).

---

### DESIGN-MOT-PAINPOINT-INJECTION

**Réf PRD :** [FR-MOT-PAINPOINT-INJECTION](./prd.md#fr-mot-painpoint-injection--douleur-de-larticle-injectée-dans-tous-les-prompts-ia-moteur)

**Refs code**
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — `loadPrompt(name, variables)` injecte `{{painPoint}}` parmi les variables.
- Prompts concernés : [server/prompts/capitaine-ai-panel.md](../../server/prompts/capitaine-ai-panel.md), [propose-lieutenants.md](../../server/prompts/propose-lieutenants.md), [lieutenants-hn-structure.md](../../server/prompts/lieutenants-hn-structure.md), [lexique-suggest.md](../../server/prompts/lexique-suggest.md), [lexique-analysis-upfront.md](../../server/prompts/lexique-analysis-upfront.md), [lexique-ai-panel.md](../../server/prompts/lexique-ai-panel.md).

**Tables consommées** : `articles.pain_point` (TEXT, nullable).

**Flux DB**

*Lecture* : chaque service Moteur qui déclenche un appel IA charge l'article via `getArticleById(id)` et passe `article.painPoint || '(non défini)'` au pré-processeur de prompt.

*Écriture* : aucune côté Moteur. Le `pain_point` est posé via le Cerveau (cf. `FR-CER-CHECKS`).

**Décisions d'architecture**
- **Pré-traitement, pas modification du prompt** : on ne touche jamais au `.md` pour y inscrire le contexte. Toute interpolation se fait dans `loadPrompt()`.
- **Fallback explicite `(non défini)`** : différencie clairement absence vs valeur réelle pour l'IA.

**Voir aussi**
- `DESIGN-MOT-STRATEGY-INJECTION` (même pattern, contexte stratégique).
- `DESIGN-CER-CONTEXT-FOR-MOTEUR` (producteur du pain_point).

---

### DESIGN-MOT-STRATEGY-INJECTION

**Réf PRD :** [FR-MOT-STRATEGY-INJECTION](./prd.md#fr-mot-strategy-injection--contexte-stratégique-du-cocon-injecté-dans-tous-les-prompts-ia-moteur)

**Refs code**
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — `buildCocoonStrategyBlock(strategy)` formate le bloc texte, injecté via `{{strategy_context}}`. Si stratégie absente, le bloc est vide et l'éventuel placeholder est remplacé par chaîne vide.

**Tables consommées** : `cocoon_strategies` (JSONB).

**Flux DB**

*Lecture* : le service appelle `loadCocoonStrategy(cocoonId)` qui SELECT sur `cocoon_strategies WHERE cocoon_id = $1` ; passe le JSONB à `loadPrompt()` qui transforme en bloc texte via `buildCocoonStrategyBlock`.

*Écriture* : aucune côté Moteur. Posée via le Cerveau.

**Décisions d'architecture**
- **Pré-traitement uniforme** : même mécanique que le painPoint, pour cohérence.
- **Fallback chaîne vide** : pas de pollution si stratégie absente, le prompt fonctionne en mode générique.

**Voir aussi**
- `DESIGN-MOT-PAINPOINT-INJECTION` (pattern jumeau).
- `DESIGN-CER-CONTEXT-FOR-MOTEUR` (producteur de la stratégie).

---

### DESIGN-MOT-CROSS-TAB-PAYLOAD

**Réf PRD :** [FR-MOT-CROSS-TAB-PAYLOAD](./prd.md#fr-mot-cross-tab-payload--continuité-des-données-entre-onglets)

**Refs code**
- [src/composables/moteur/useMoteurCrossTabState.ts](../../src/composables/moteur/useMoteurCrossTabState.ts) — composable extrait de `MoteurView` (Vague 5) qui porte les 5 handlers : `handleSendToRadar`, `handleCardsSelected`, `handleSendToLieutenants`, `handleLieutenantsUpdated`, `handleRadarScanned` + `resetCrossTabState`.
- [tests/unit/composables/moteur/useMoteurCrossTabState.test.ts](../../tests/unit/composables/moteur/useMoteurCrossTabState.test.ts) — 8 ACs unitaires.

**Stores Pinia**
- `useRadarExplorationStore` — `handleSendToRadar` y UPSERT les keywords envoyés (cf. `DESIGN-RAD-DB-FIRST`). Plus de basket mémoire intermédiaire.
- `useArticleKeywordsStore` — `handleSendToLieutenants` lit `rootKeywords` du store, écrit la sélection effective via `effectiveRootKeywords` computed.

**Watchers & réactivité**
- `effectiveRootKeywords` computed : si l'utilisateur a explicitement envoyé un payload depuis Capitaine, l'utilise ; sinon fallback sur le store article-keywords. Pattern « explicit > store » pour la session courante.
- `selectedLieutenantsForLexique` computed jumeau : sélection locale > store.
- `resetCrossTabState()` est appelé par `handleSelectArticle` au switch d'article pour éviter la fuite cross-articles.

**Décisions d'architecture**
- **Pas d'auto-nav** : chaque handler met à jour son state local puis appelle `setActiveTab(...)` *explicite* — déclenché par un click utilisateur sur un bouton « Envoyer au … ».
- **DB-first sur Discovery → Radar** : la transition n'utilise plus le basket mémoire, elle écrit directement dans `radar_explorations.generated_keywords` (cf. `DESIGN-MOT-BASKET-DEPRECATED`).
- **Dédup défensive 2ᵉ niveau** dans `handleCardsSelected` : si le payload contient des doublons (régression upstream), une `Map<keyword.toLowerCase(), card>` les écrase, la card avec `kpis !== null` (racine) prime sur `kpis === null` (longue-traîne).
- **Émission des checks** : `MOTEUR_DISCOVERY_DONE` posé dans `handleSendToRadar` (pas dans le composant Discovery — point qui surprend, cf. DRIFT-008 du registry Discovery). `MOTEUR_RADAR_DONE` posé dans `handleRadarScanned`.

**Voir aussi**
- `DESIGN-MOT-NO-AUTO-ACTION` (cohérence : chaque transition est un click).
- `DESIGN-RAD-DB-FIRST` (radar_explorations comme source de vérité).
- `DESIGN-MOT-BASKET-DEPRECATED` (suppression du basket mémoire).

---

### DESIGN-MOT-CANNIBALIZATION

**Réf PRD :** [FR-MOT-CANNIBALIZATION](./prd.md#fr-mot-cannibalization--alerte-cannibalisation-capitaine-au-sein-dun-même-cocon)

**Refs code**
- [src/composables/moteur/useMoteurArticleSync.ts](../../src/composables/moteur/useMoteurArticleSync.ts) — `capitainesMap` ref + `refreshCapitainesMap()` qui fetche `GET /cocoons/:name/capitaines`.
- [src/composables/moteur/useCannibalizationDetection.ts](../../src/composables/moteur/useCannibalizationDetection.ts) — logique pure `hasCannibalization(articleId, map)` extraite pour test unitaire.
- [server/routes/cocoons.routes.ts](../../server/routes/cocoons.routes.ts) — endpoint `GET /api/cocoons/:cocoonName/capitaines` qui renvoie une map `articleId (number) → captain keyword`.

**Endpoints**
- `GET /api/cocoons/:cocoonName/capitaines` → `Record<number, string>` (articleId → captain keyword).

**Tables consommées** : `articles.captain_keyword_locked` (TEXT, nullable) — colonne mise à jour par l'onglet Capitaine au verrouillage.

**Flux DB**

*Lecture* : `refreshCapitainesMap()` SELECT `id, captain_keyword_locked FROM articles WHERE cocoon_id = $1 AND captain_keyword_locked IS NOT NULL`. Appelé au mount du Moteur et après chaque check `MOTEUR_CAPITAINE_LOCKED` (add ou remove).

*Écriture* : aucune côté détection — c'est purement de la lecture cross-articles.

**Stores Pinia**
- Pas de store dédié — la `capitainesMap` est portée par le composable, scope MoteurView.

**Watchers & réactivité**
- Dans `emitCheckCompleted`, si le check est `MOTEUR_CAPITAINE_LOCKED`, on rafraîchit la map.
- Dans `handleCheckRemoved`, idem.

**Décisions d'architecture**
- **Map indexée par `articleId` (number), pas par `slug`** : cohérent avec le contrat backend qui renvoie `Record<number, string>`. L'indexation historique par slug produisait des faux positifs (clés suggested/published ne se croisaient pas). cf. commentaire ligne 6-7 de `useCannibalizationDetection.ts`.
- **Comparaison insensible à la casse** : `cap.toLowerCase()` pour matcher les variantes de saisie.

**Voir aussi**
- `DESIGN-CAP-LOCK` (producteur de `captain_keyword_locked`).
- `DESIGN-RAD-CARD` (consommateur visuel du badge).

---

### DESIGN-MOT-EXPLORATION-COUNTS

**Réf PRD :** [FR-MOT-EXPLORATION-COUNTS](./prd.md#fr-mot-exploration-counts--compteurs-db-par-onglet-pour-mémoire-de-session)

**Refs code**
- [src/composables/moteur/useMoteurArticleSync.ts](../../src/composables/moteur/useMoteurArticleSync.ts) — `explorationCounts` ref + `refreshExplorationCounts()` qui fetche `GET /articles/:id/explorations/counts`.
- [src/components/moteur/TabCachePanel.vue](../../src/components/moteur/TabCachePanel.vue) — composant sticky qui affiche les chips par onglet.
- [server/routes/article-explorations.routes.ts](../../server/routes/article-explorations.routes.ts) — endpoint `GET /articles/:id/explorations/counts`.

**Endpoints**
- `GET /api/articles/:id/explorations/counts` → `{ radar?: number, captain?: number, lieutenants?: number, lexique?: number }`.

**Tables consommées** : `radar_explorations`, `captain_explorations`, `lieutenant_explorations`, `lexique_explorations` (toutes article-scoped).

**Flux DB**

*Lecture* : un endpoint unique agrège les 4 counts en un seul aller-retour. Pour chaque table, le SQL compte les entrées persistées pour cet article (cf. `DESIGN-MOT-CACHE-PANEL-COUNT` pour la sémantique exacte par onglet).

*Écriture* : aucune écriture via cet endpoint. Le refresh est passif (lecture après mutation côté autre route).

**Stores Pinia**
- `useRadarExplorationStore` (déjà cité) — invalide indirectement la map de counts (le watcher `refreshExplorationCounts` re-fetche).

**Watchers & réactivité**
- `watch(() => selectedArticle.value?.id ?? null, () => refreshExplorationCounts(), { immediate: true })` — défensif : couvre le switch d'article et le mount initial.
- Dans `emitCheckCompleted` / `handleCheckRemoved`, on re-fetche les counts (la mutation DB précédente peut avoir bougé un compteur).

**Voir aussi**
- `DESIGN-MOT-CACHE-PANEL-COUNT` (sémantique du compteur).
- `DESIGN-MOT-EXPLORATIONS-HYDRATATION` (compteur cohérent même sans verrou).

---

### DESIGN-MOT-CACHE-PANEL-COUNT

**Réf PRD :** [FR-MOT-CACHE-PANEL-COUNT](./prd.md#fr-mot-cache-panel-count--le-compteur-db-représente-le-total-exploré-pas-le-total-verrouillé)

**Refs code**
- [server/routes/article-explorations.routes.ts](../../server/routes/article-explorations.routes.ts) — le SQL qui agrège les 4 counts.
- [src/components/moteur/TabCachePanel.vue](../../src/components/moteur/TabCachePanel.vue) — rendu des chips + infobulle de survol détaillant le statut.

**Tables consommées (sémantique par onglet)**
- **Radar** : `radar_explorations` — somme `jsonb_array_length(generated_keywords) + jsonb_array_length(scan_result -> 'cards')` (les deux listes sont disjointes : un keyword scanné quitte `generated_keywords` pour rejoindre `scan_result.cards`).
- **Capitaine** : `captain_explorations` — `COUNT(*)` brut, tous statuts confondus (verrouillé ou non).
- **Lieutenants** : `lieutenant_explorations` — `COUNT(*)` brut.
- **Lexique** : `lexique_explorations` — `COUNT(*)` brut.

**Décisions d'architecture**
- **Sémantique « total DB », pas « total verrouillé »** : l'utilisateur veut savoir ce qui est *sauvegardé*, pas ce qui est *décidé*. Le statut décidé reste lisible via les dots de progression workflow (cf. `DESIGN-DASH-PROGRESS`) et le contenu effectif des onglets.
- **Pivot 2026-05-12** : sémantique précédente (« verrouillés ») trompeuse — 31 testés / 0 verrouillé affichait `DB 0` (perte apparente de données). Nouveau compteur : ce qui est en base, point.
- **Bouton « Recharger DB »** : filet de sécurité si hydratation au mount a échoué. Idempotent : appelle `refreshExplorationCounts(articleId)`.

**Critères d'acceptation techniques**
- Capitaine : `captain_explorations` à 31 rows + `article_keywords.capitaine = null` → chip affiche **31**, pas 0.
- Radar : `generated_keywords.length === 12` + `scan_result.cards.length === 45` → chip affiche **57**.
- Radar : `radar_explorations` row absente → chip affiche **0**.
- Le hint au survol détaille (« 31 testés · 0 verrouillé », « 45 scannés · 12 en attente »).

**Historique**
- **2026-05-08** : créée avec sémantique « verrouillés ».
- **2026-05-12** : pivotée à « total DB » suite au bug perçu (chantier `feat/explorations-db-first`).

**Voir aussi**
- `DESIGN-MOT-EXPLORATION-COUNTS` (endpoint).
- `DESIGN-MOT-EXPLORATIONS-HYDRATATION` (hydratation indépendante du verrou).

---

### DESIGN-MOT-EXPLORATIONS-HYDRATATION

**Réf PRD :** [FR-MOT-EXPLORATIONS-HYDRATATION](./prd.md#fr-mot-explorations-hydratation--les-explorations-sont-visibles-dès-quelles-sont-en-base-même-sans-verrou)

**Refs code**
- [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) — `getArticleKeywords(id)` (handler de `GET /articles/:id/keywords`) hydrate `richCaptain.exploredKeywords` et `richLieutenants` depuis les tables `captain_explorations` / `lieutenant_explorations` même si la ligne `article_keywords` est absente.

**Endpoints**
- `GET /api/articles/:id/keywords` → `ArticleKeywords | null` (null uniquement si toutes les tables sont vides pour cet article).

**Tables consommées** : `article_keywords`, `captain_explorations`, `lieutenant_explorations`.

**Flux DB**

*Lecture (3 cas)* :
1. Article avec ligne `article_keywords` → comportement classique : la ligne pilote, les explorations sont attachées en plus.
2. Article **sans** ligne `article_keywords` mais avec `captain_explorations` ou `lieutenant_explorations` non-vides → renvoie un `ArticleKeywords` synthétique : `capitaine = ''`, `lieutenants = []`, `lexique = []`, `richCaptain = { keyword: '', status: 'suggested', exploredKeywords: [...] }`, `richLieutenants` hydraté.
3. Article totalement vide (aucune des 3 tables n'a de row) → renvoie `null`.

*Écriture* : aucune côté hydratation.

**Bug historique**
Avant la correction du 12 mai 2026, un early-return `if (res.rows.length === 0) return { data: null, dbOps }` placé avant l'hydratation des explorations rendait invisibles tous les `captain_explorations` tant que l'utilisateur n'avait rien verrouillé. Le commentaire en ligne 561-566 documentait l'intention inverse — le early-return court-circuitait. Devenu visible avec l'évolution du workflow Radar DB-first (envoi vers Capitaine sans verrouillage immédiat).

**Décisions d'architecture**
- **`richCaptain.status = 'suggested'`** (jamais `'locked'`) dans le cas synthétique — sinon le gating Phase ② basculerait à tort.
- **Le contrat `null` reste préservé** pour les vrais articles fantômes — la couche au-dessus distingue toujours « article inexistant » de « article exploré sans verrou ».

**Voir aussi**
- `DESIGN-CAP-PERSIST` (table `captain_explorations`).
- `DESIGN-LIE-PERSIST` (table `lieutenant_explorations`).
- `DESIGN-RAD-DB-FIRST` (autre face du même principe DB-first).

---

### DESIGN-MOT-CHECK-RECONCILIATION

**Réf PRD :** [FR-MOT-CHECK-RECONCILIATION](./prd.md#fr-mot-check-reconciliation--réconciliation-défensive-des-étapes-au-chargement-dun-onglet)

**Refs code**
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue), [LieutenantsPanel.vue](../../src/components/moteur/LieutenantsPanel.vue), [LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — chacun porte un `onMounted` ou watcher first-run qui compare l'état des données vs l'état du check, et corrige si divergence.
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — actions `addCheck` / `removeCheck` utilisées pour la réconciliation.

**Endpoints utilisés**
- `POST /articles/:id/progress/check` (ajout).
- `POST /articles/:id/progress/uncheck` (retrait — pas un `DELETE`, cf. DRIFT-008).

**Tables consommées** : `articles.completed_checks`, `article_keywords`.

**Flux DB**

*Lecture* : au mount du panel, on lit l'état réel des données (`article_keywords.capitaine`, `lieutenants`, `lexique`) et le check correspondant (`completedChecks.includes(MOTEUR_*_LOCKED|VALIDATED)`).

*Écriture (4 cas)* :
- Donnée vide + check présent → `removeCheck` (retirer le « dot vert mensonger »).
- Donnée non-vide + check absent → `addCheck` (réparer le « dot manquant »).
- Donnée vide + check absent → no-op.
- Donnée non-vide + check présent → no-op (état cohérent).

**Décisions d'architecture**
- **Routes existantes uniquement** — pas de SQL direct côté front. Garantit que le serveur reste l'autorité.
- **No-op silencieux** quand DB et store sont déjà cohérents — pas de bruit réseau gratuit.
- **Mount/first-run, pas reactive watcher** — la réconciliation s'exécute une fois au chargement, pas à chaque mutation. Le watcher principal d'écriture utilisateur (toggle lock) reste responsable du temps réel.

**Voir aussi**
- `DESIGN-MOT-CHECKS` (émetteurs des checks).
- `DESIGN-MOT-CHECKS-CONSTANTS` (catalogue strict).

---

### DESIGN-MOT-EXTERNAL-CACHE-CLEAR

**Réf PRD :** [FR-MOT-EXTERNAL-CACHE-CLEAR](./prd.md#fr-mot-external-cache-clear--bouton--vider-le-cache-externe--au-niveau-de-larticle)

**Refs code**
- [src/composables/moteur/useMoteurArticleSync.ts](../../src/composables/moteur/useMoteurArticleSync.ts) — `clearExternalCacheForArticle()` qui appelle `DELETE /articles/:id/external-cache`.
- [src/components/moteur/TabCachePanel.vue](../../src/components/moteur/TabCachePanel.vue) — bouton « Vider le cache externe ».
- [server/routes/article-explorations.routes.ts](../../server/routes/article-explorations.routes.ts) — endpoint `DELETE /articles/:id/external-cache`.

**Endpoints**
- `DELETE /api/articles/:id/external-cache` → `{ cleared: number }`.

**Tables consommées** : `external_api_cache` (uniquement).

**Flux DB**

*Lecture* : aucune lecture déclenchée par l'action — l'effet est destructif.

*Écriture (purge ciblée)* : DELETE FROM `external_api_cache` WHERE `cache_key` LIKE pattern lié au keyword Capitaine de l'article courant. **Ne touche pas** aux tables `*_explorations` (données métier utilisateur).

**Décisions d'architecture**
- **Scope ciblé** : on ne purge que le cache externe lié au Capitaine de l'article, pas l'intégralité du cache (qui pourrait servir à d'autres articles via `keyword_metrics`).
- **Distinction métier vs cache** : explicite dans le libellé (« externe ») pour rassurer l'utilisateur sur la non-perte de ses verrouillages.

**Voir aussi**
- `DESIGN-MOT-CACHE-CASCADE` (qui rend cette purge utile).

---

### DESIGN-MOT-BASKET-DEPRECATED

**Réf PRD :** [FR-MOT-BASKET-DEPRECATED](./prd.md#fr-mot-basket-deprecated--le--panier--mémoire-est-supprimé-au-profit-du-db-first)

**Refs code (suppressions effectives)**
- `src/stores/article/moteur-basket.store.ts` — **supprimé**.
- `src/components/moteur/BasketStrip.vue` — **supprimé**.
- `src/components/shared/BasketFloatingPanel.vue` — **supprimé**.

**Refs code (refactorisations)**
- [src/components/moteur/KeywordAssistPanel.vue](../../src/components/moteur/KeywordAssistPanel.vue) — refondé pour recevoir une prop `keywords: string[]` depuis le parent. Le parent fait la lecture DB et passe la liste filtrée.
- [src/stores/article/radar-exploration.store.ts](../../src/stores/article/radar-exploration.store.ts) — porte un header `AUTHORITY:` qui pointe `radar_explorations` et note explicitement « remplace `useMoteurBasketStore` pour les keywords Radar ».

**Décisions d'architecture**
- **DB-first cohérent partout** : Capitaine / Lieutenants / Lexique persistaient déjà directement en base. Le basket était l'**exception** mémoire dans un projet déjà DB-first.
- **Audit producteurs 2026-05-11** : sur 6 sources typées historiques (`discovery | radar | pain-translator | validation | exploration | manual`), seule `discovery` était réellement alimentée. Les 5 autres = code mort de conception.
- **Pas de régression utilisateur** : tout ce qui passait par le basket passe maintenant par les tables d'exploration (`radar_explorations.generated_keywords`, `radar_explorations.scan_result.cards`).

**Voir aussi**
- `DESIGN-RAD-DB-FIRST` (la table qui prend le relais).
- `DESIGN-MOT-CROSS-TAB-PAYLOAD` (transitions cross-onglets sans basket).

---

### DESIGN-MOT-LEXIQUE-DECOUPLAGE

**Réf PRD :** [NFR-MOT-LEXIQUE-DECOUPLAGE](./prd.md#nfr-mot-lexique-decouplage--lexique-et-lieutenants-fonctionnent-indépendamment)

**Refs code**
- [server/services/external/serp-analysis.service.ts](../../server/services/external/serp-analysis.service.ts) — orchestrateur du scrape SERP (refondu pour servir les deux usages indépendamment).
- [tests/unit/architecture/decouplage-lieutenants-lexique.test.ts](../../tests/unit/architecture/decouplage-lieutenants-lexique.test.ts) — test architectural permanent : aucun import croisé.
- [tests/integration/decouplage-lieutenants-lexique.test.ts](../../tests/integration/decouplage-lieutenants-lexique.test.ts) — test d'intégration permanent : cache mémoire partagé.

**Tables consommées** : socle neutre dans `keyword_serp_results` (URLs) + `keyword_serp_scrapes` (HTML scrapé). Cf. `DESIGN-MOT-SCHEMA-KEYWORD-DECOMPOSITION`.

**Décisions d'architecture**
- **Cache mémoire process-scoped 1 h** : si un scrape HTML d'une URL est déjà fait pour un usage pendant la session Node.js courante, l'autre usage le réutilise. Hors scope multi-process — un déploiement multi-worker nécessiterait une couche partagée (Redis, IPC).
- **Garde-fous tests permanents** : tests architecturaux empêchent l'introduction future d'un import croisé entre `lexique-analysis.service.ts` et `lieutenants-analysis.service.ts`.

**Critères d'acceptation techniques**
- Démarrer Lexique sur un keyword vierge → réussit sans erreur, sans appel au service Lieutenants.
- Démarrer Lieutenants sur un keyword vierge → réussit sans appel au service Lexique.
- Cache mémoire vérifié par mock count des appels HTTP.

**Voir aussi**
- `DESIGN-MOT-SCHEMA-KEYWORD-DECOMPOSITION` (le socle de données neutre qui rend ce découplage propre).
- `DESIGN-LEX-SCRAPE-DEDIE`, `DESIGN-LIE-SCRAPE-DEDIE` (à produire dans les sections respectives).

---

### DESIGN-MOT-SCHEMA-KEYWORD-DECOMPOSITION

**Réf PRD :** [NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION](./prd.md#nfr-mot-schema-keyword-decomposition--schéma-de-cache-mot-clé-décomposé-en-tables-spécialisées)

**Tables créées**
- `keyword_metrics` (slim) — métriques numériques + intent (volume, KD, CPC, competition, intent_raw, intent_label).
- `keyword_serp_results` — URLs Google (10 par keyword), position, title, domain.
- `keyword_serp_scrapes` — HTML scrapé (`headings[]` + `text_content` + `is_blog`).
- `keyword_paa_questions` — questions People Also Ask.
- `keyword_autocomplete` — suggestions autocomplete.

**Refs code**
- Schéma : [server/db/schema.sql](../../server/db/schema.sql) lignes 144-241 (les 5 tables décomposées).
- Services : `keyword-metrics.service.ts`, `keyword-serp.service.ts`, `keyword-paa.service.ts`, etc. (lecture finement scopée par usage).

**Décisions d'architecture**
- **Responsabilité unique par table** : Lieutenants n'a besoin que de `headings[]`, Lexique a besoin de `text_content`, le brief Capitaine a besoin de KPIs + URLs. Avant la décomposition, chacun chargeait la même god-row de 500 ko.
- **Préfixe `keyword_*`** : signale le scope cross-article (vs `*_explorations` qui est article-scoped).
- **Pas de collision** : `keyword_paa_questions` ne collisionne pas avec `paa_explorations` (article-scoped, autre rôle). `keyword_autocomplete` ne collisionne pas avec `keyword_intent_analyses` (autre rôle existant).
- **AC.SCHEMA.5 différé** : drop final de la colonne `serp_raw_json` reportée à Epic E1 (≥ 14 j après stabilisation) — pour absorber tout retour en arrière.

**Bench**
- Réduction payload brief Capitaine **97,5 %** sur top-5 keywords (cf. `docs/perf-bench-keyword-metrics-decomposition.md`).

**Voir aussi**
- `DESIGN-MOT-LEXIQUE-DECOUPLAGE` (l'usage que le découpage rend possible).
- `DESIGN-INFRA-KEYWORDS-SEO`, `DESIGN-INFRA-LOCAL-ENTITIES` (autres tables `keyword_*`).

---

### DESIGN-MOT-PAIN-IMMUTABLE-AFTER-CEREVEAU

**Réf PRD :** [FR-PAIN-IMMUTABLE-AFTER-CEREVEAU](./prd.md#fr-pain-immutable-after-cereveau--le-point-de-douleur-dun-article-ne-se-modifie-quau-cerveau-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- Tests architecturaux : grep `pain_point\s*=` dans `src/components/moteur/`, `src/components/redaction/`, `src/components/workflow/` doit retourner 0 mutation.
- Unique chemin de mutation : `src/components/strategy/`, `src/components/production/`.

**Décisions d'architecture**
- `painPoint` = input central du pipeline éditorial (cf. `docs/pain-point-editorial-backbone.md`).
- Le watcher Sprint 8 historique qui détectait un changement painPoint live a été supprimé — voir `DESIGN-CAP-NO-PAINPOINT-WATCHER`.

---

### DESIGN-MOT-API-VOCABULAIRE-SCAN

**Réf PRD :** [FR-API-VOCABULAIRE-SCAN](./prd.md#fr-api-vocabulaire-scan--le-vocabulaire-backend-distingue-scan-et-validate-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [server/routes/keyword-scan.routes.ts](../../server/routes/keyword-scan.routes.ts) — renommée de `keyword-validate.routes.ts` (Sprint 14).
- [server/services/keyword/keyword-scan.service.ts](../../server/services/keyword/keyword-scan.service.ts).
- [src/composables/keyword/useCapitaineScan.ts](../../src/composables/keyword/useCapitaineScan.ts).

**Décisions d'architecture**
- Renommages : `ValidateResponse → ScanResponse`, `ValidateVerdict → ScanVerdict`, `validateKeyword() → scanKeyword()`.
- `/keywords/validate-pain` (Cerveau) reste inchangé — c'est le seul `validate` qui survit.

---

### DESIGN-MOT-WORKFLOW-GATING-DUAL

**Réf PRD :** [FR-MOT-WORKFLOW-GATING-DUAL](./prd.md#fr-mot-workflow-gating-dual--règle-de-gating-à-double-condition-pour-capitaine-et-lieutenants-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — computed `lieutenantsCheckActive`.
- Watcher avec garde « first run » qui réconcilie l'état réel avec le check stocké en DB au mount.

**Tables consommées** : `lieutenant_explorations.status`, `article_keywords.hn_structure`, `articles.completed_checks`.

**Décisions d'architecture**
- Règle Lieutenants : check actif ssi (≥ 1 Lieutenant `locked`) ET (`hn_structure` non vide).
- Règle Capitaine : check actif ssi `article_keywords.capitaine` non-vide (extension possible selon évolution métier).
- Réconciliation défensive : cleanup état hérité au mount (cf. `DESIGN-MOT-CHECK-RECONCILIATION`).

**Voir aussi** : `DESIGN-MOT-CHECK-RECONCILIATION`.

---

### DESIGN-MOT-LOCK-DERIVED

**Réf PRD :** [FR-MOT-LOCK-DERIVED](./prd.md#fr-mot-lock-derived--létat-verrouillé-dun-onglet-est-dérivé-de-la-base-pas-dupliqué-en-mémoire-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- Capitaine : `isLocked = computed(() => articleKeywordsStore.keywords?.richCaptain?.status === 'locked')`.
- Lieutenants : `isLocked = computed(() => articleKeywordsStore.keywords?.richLieutenants?.some(l => l.status === 'locked'))`.
- Lexique : Ref locale conservée (sémantique de lock côté DB pas encore clarifiée — sprint dédié futur).

**Décisions d'architecture**
- Store = source unique de vérité.
- Nouvelles méthodes exposées par le store : `unlockCaptain()`, `unlockLieutenants()` (manquantes avant Sprint 13).

**Voir aussi** : `DESIGN-MOT-DISPLAY-FROM-STORE`.

---

### DESIGN-MOT-DISPLAY-FROM-STORE

**Réf PRD :** [FR-MOT-DISPLAY-FROM-STORE](./prd.md#fr-mot-display-from-store--les-composants-ui-live-lisent-depuis-le-store-pas-depuis-des-props-figées-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [src/components/moteur/MoteurContextRecap.vue](../../src/components/moteur/MoteurContextRecap.vue) — helper `getDisplayedKeyword(art)`, index réactif `checksByArticleId`.
- [src/components/moteur/LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — computed `displayedCaptainKeyword`.

**Stores Pinia** : `useArticleKeywordsStore`, `useArticleProgressStore` (sources réactives fraîches).

**Décisions d'architecture**
- Props acceptables pour données figées (titre, type, mot-clé suggéré initial).
- Limitation connue : cohérence cross-article garantie uniquement pour l'article actuellement sélectionné — autres articles lisent `props.capitainesMap` (rafraîchi par `useMoteurArticleSync`).

**Voir aussi** : `DESIGN-DASH-PROGRESS`, `DESIGN-MOT-LOCK-DERIVED`.

---

### DESIGN-UI-VOCABULAIRE-VERROUILLER

**Réf PRD :** [FR-UI-VOCABULAIRE-VERROUILLER](./prd.md#fr-ui-vocabulaire-verrouiller--les-boutons-daction-de-figeage-utilisent-verrouiller-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- Tests UI : `grep "Valider ce Capitaine|Valider les Lieutenants|Valider le Lexique"` dans `src/components/` doit retourner 0 occurrence.

**Décisions d'architecture**
- Vocabulaire UI distinct du vocabulaire backend (`scan` côté API, cf. `DESIGN-MOT-API-VOCABULAIRE-SCAN`).
- « Verrouiller » > « Valider » côté UX — l'utilisateur **fige** une décision, ne **valide** pas une étape technique.

---

## §8.4 — Moteur — Discovery (DESIGN-DIS)

### DESIGN-DIS-SOURCES

**Réf PRD :** [FR-DIS-SOURCES](./prd.md#fr-dis-sources)

**Refs code**
- [src/components/moteur/DiscoveryPanel.vue](../../src/components/moteur/DiscoveryPanel.vue) — composant racine de l'onglet : champ seed, bouton « Lancer la découverte », assemblage des sept sections, bouton « Envoyer au Radar » sticky.
- [src/components/moteur/discovery/DiscoverySourcesList.vue](../../src/components/moteur/discovery/DiscoverySourcesList.vue) — rendu des sept sections (compteur toujours visible y compris à 0, bouton `actionLabel` inline pour les sections vides).
- [src/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue](../../src/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue) — sidebar de filtres par mots-pivots calculés sur le corpus.
- [src/composables/keyword/useDiscoveryPanel.ts](../../src/composables/keyword/useDiscoveryPanel.ts) — orchestre les sept fetchs parallèles, état module-singleton (refs persistées entre switches d'onglets dans la même session), expose les helpers `filteredList`, `getKeywordSources`, `isMultiSource`, `setGroupFilter`.
- [src/composables/keyword/useDiscoverySelection.ts](../../src/composables/keyword/useDiscoverySelection.ts) — Set des keywords sélectionnés + helpers `toggleSelect`, `selectAllInSource`, `getRadarKeywords()` (consommé par `FR-DIS-SEND-TO-RADAR`).
- [server/services/keyword/suggest.service.ts](../../server/services/keyword/suggest.service.ts), [keyword-discovery.service.ts](../../server/services/keyword/keyword-discovery.service.ts), [keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts), [word-groups.service.ts](../../server/services/keyword/word-groups.service.ts) — implémentations backend des sources et du regroupement par pivots.

**Endpoints**
- `POST /api/keywords/suggest-all` — quatre angles Google Suggest (alphabet, questions, intents, prepositions) en un appel.
- `POST /api/keywords/discover` — fetch DataForSEO `Keyword Suggestions` (cache `external_api_cache`).
- `POST /api/keywords/radar/generate` — génération IA Haiku (consommée à la fois en tant que source IA principale et en tant que source courte-traîne ; cf. `DESIGN-RAD-GENERATE`).
- `POST /api/keywords/word-groups` — calcul des groupes de mots-pivots sur le pool fusionné (≥ 5 keywords requis).

**Tables consommées** : `keyword_metrics` (KPI DataForSEO via le cache permanent cross-article — cf. `DESIGN-INFRA-KEYWORD-METRICS`), `external_api_cache` (cache TTL court côté DataForSEO/Suggest). Pas d'écriture directe par cette FR : la persistance se fait au moment du `FR-DIS-CACHE` (sauvegarde de la découverte complète) ou du `FR-DIS-SEND-TO-RADAR` (écriture en `radar_explorations`).

**Flux DB**

*Lecture* : aucune lecture initiale. Le composant `DiscoveryPanel.vue` monte avec ses sept sections vides et un champ seed pré-rempli. Au clic sur « Lancer la découverte », les sept appels HTTP partent en parallèle ; chaque réponse alimente une ref dédiée (`suggestAlphabetKw`, `aiKeywords`, etc.). Les KPI DataForSEO (volume, KD, CPC, intent) sont lus depuis `keyword_metrics` côté backend dans `keyword-discovery.service.ts`.

*Écriture* : aucune écriture déclenchée par cette FR isolément. Les KPI manquants peuvent provoquer un INSERT dans `keyword_metrics` côté backend (effet de bord du fetch DataForSEO, hors scope FR-DIS-SOURCES).

**Stores Pinia**
- Aucun store Pinia consommé directement par `DiscoveryPanel.vue` pour les sources. L'état est porté par les refs **module-singleton** de `useDiscoveryPanel` (refs déclarées au niveau module, persistées tant que le module reste chargé). Choix délibéré : permet de retrouver les résultats au switch d'onglet sans réhydrater, sans pour autant créer un store Pinia dédié.
- `useCaptainTriggerStore` — store annexe : un clic sur un mot-clé en mode workflow planifie une analyse Capitaine en arrière-plan (toast de countdown, cf. `DESIGN-CAP-AUTO-TRIGGER`).
- `useCostLogStore` — pile d'activité enrichie à chaque appel renvoyant un `_apiUsage`.

**Watchers & réactivité**
- Watcher `[pilierKeyword, articleKeyword]` dans `DiscoveryPanel.vue` : changement d'article → pré-remplit seed ; changement de cocon (pilier différent) → reset complet du panneau.
- Computed `crossSourceMap` dans `useDiscoveryPanel` : indexe pour chaque keyword l'ensemble des sources où il apparaît → utilisé par `isMultiSource` (badge `×N`) et par le tri qui remonte les multi-sources en tête de la liste filtrée.
- Re-scoring relevance déclenché à l'arrivée différée de chaque source (cf. `DESIGN-DIS-RELEVANCE-FILTER`).

**Décisions d'architecture**
- **Sept fetchs parallèles plutôt qu'une orchestration backend** : chaque source a sa propre latence (Google Suggest = ~200 ms × 4 stratégies, Claude = 3-6 s, DataForSEO = 1-3 s). Le front observe l'arrivée progressive et déclenche le scoring de pertinence sur chaque arrivée. Une orchestration backend ferait attendre toutes les sources avant le premier rendu, dégradant la perception perf.
- **Compteur `(0)` toujours visible** *(rule ajout 2026-05-11)* : la condition `v-else-if="section.list.length > 0"` historique est devenue `v-else` → la section vide est rendue avec son header + compteur `(0)`, garantissant la découvrabilité.
- **Bouton `actionLabel` inline** : pour les sections qui supportent une regen indépendante (`longtail-ai`), un bouton est rendu directement dans le header de la section vide → permet de relancer une source sans relancer toute la découverte.
- **Pagination visuelle** : seuil `VISIBLE_THRESHOLD = 100` items affichés par défaut, le reste demande un clic « Tout afficher » (perf DOM sur les gros secteurs SEO local / e-commerce).

**Voir aussi**
- `DESIGN-DIS-RELEVANCE-FILTER` — filtre amont qui masque/grise les keywords hors-sujet dans chaque section.
- `DESIGN-DIS-AI-ANALYSIS` — pipeline aval qui curate les 20-30 keywords stratégiques sur la base de ces sources.
- `DESIGN-RAD-GENERATE` — même route backend, autre caller (legacy Radar) qui ne devrait plus être appelée depuis Radar.

---

### DESIGN-DIS-RELEVANCE-FILTER

**Réf PRD :** [FR-DIS-RELEVANCE-FILTER](./prd.md#fr-dis-relevance-filter)

**Refs code**
- [src/components/moteur/discovery/KeywordDiscoveryRelevanceToggle.vue](../../src/components/moteur/discovery/KeywordDiscoveryRelevanceToggle.vue) — toggle + compteurs « X pertinents / N total » + barre de progression « Filtrage P/2 · scored/total » + bannière warning.
- [src/composables/keyword/useRelevanceScoring.ts](../../src/composables/keyword/useRelevanceScoring.ts) — pipeline 2-passes complet, locks anti-concurrence, sanity check, cap LRU.
- [server/routes/keywords.routes.ts](../../server/routes/keywords.routes.ts) — endpoint `POST /api/keywords/relevance-score` (lignes ~643-755), construction des prompts strict/non-strict + injection contexte business + règle douleur éliminatoire.
- [server/services/external/ai-provider.service.ts](../../server/services/external/ai-provider.service.ts) — `classifyWithTool` (Claude Haiku, tool use) consommé par la route.
- [server/services/strategy/theme-config.service.ts](../../server/services/strategy/theme-config.service.ts) — fournit secteur / audience / services injectés dans le prompt.

**Endpoints**
- `POST /api/keywords/relevance-score` — body `{ seed, keywords[], strict?: boolean, articleContext?: { title?, painPoint? } }`. Response `{ scores: Record<keyword, 0|1>, fallback: boolean }`. Le flag `fallback` (true si la classification IA a échoué et renvoyé tout-pertinent) déclenche la bannière côté front.

**Tables consommées** : aucune. Le scoring est calculé en live à chaque batch, jamais persisté côté backend. Côté front, les scores sont stockés en mémoire dans une `Map<string, number>` (cap LRU `MAX_RELEVANCE_SCORES = 500`).

**Flux DB**

*Lecture* : aucune. Le filtre n'utilise pas de cache DB cross-article ; seul le cache complet de la découverte (`keyword_discoveries.sources_json.relevanceScores`) ré-injecte les scores au chargement depuis cache (cf. `DESIGN-DIS-CACHE`).

*Écriture* : aucune écriture DB directe. Les scores sont persistés **uniquement** via le cache de découverte au moment du `saveCache`.

**Stores Pinia**
- Aucun store Pinia. L'état (`relevanceScores`, `relevanceFilterEnabled`, `semanticLoading`, `scoringProgress`, `filteringSuspect`) vit dans les refs module-singleton de `useRelevanceScoring`, injectées dans `useDiscoveryPanel`.

**Watchers & réactivité**
- Pas de watcher Vue explicite côté composable : le scoring est déclenché impérativement par `discover()`, par les `then` des fetchs sources (chaque source qui arrive appelle `relevance.fetchRelevanceScores()`), et par `loadFromCache`.
- Lock `_scoringInProgress` + queue `_scoreQueuePending` : si une demande de scoring arrive pendant qu'un autre tourne, elle est mise en file ; le scoring courant en relance un nouveau passage à sa fin sur les **keywords non encore scorés uniquement** (`unscored = allKeywordsFlat.filter(kw => !relevanceScores.has(kw))`).
- Computed `relevantCount` / `irrelevantCount` dans `useRelevanceScoring` : recalculés à chaque mutation de `relevanceScores` ou du toggle `relevanceFilterEnabled`.
- Toggle réactivité : `relevanceFilterEnabled.value` bascule sans relancer le scoring — la fonction `matchesRelevance` lit le flag à chaque appel, le re-render Vue masque/affiche.

**Décisions d'architecture**
- **2-passes conditionnelles** : `STRICT_PASS_TRIGGER_RATIO = 0.10` — la passe stricte n'est lancée que si la passe permissive a rejeté ≥ 10 % du corpus. Justification : sur un topic cohérent, la passe stricte rejette ≈ 0 keyword supplémentaire mais double le coût Claude.
- **Sanity check ≥ 90 % passants** : déclenche `filteringSuspect = true` + bannière warning. Cause typique : route relevance qui renvoie `fallback: true` (timeout Claude, parsing tool-use raté) → tous les scores forcés à 1.0 silencieusement côté backend (cf. `DESIGN-INFRA-KPI-CONSISTENCY` pour la philosophie « pas de fallback silencieux »).
- **Pain point ≥ 10 caractères** : seuil minimum pour considérer la douleur comme exploitable dans la classification IA (évite les stubs très courts qui dégradent le prompt).
- **Cap LRU 500** : protège contre une accumulation infinie de scores quand l'utilisateur enchaîne plusieurs découvertes dans la même session sans recharger la page.

**Voir aussi**
- `DESIGN-DIS-SOURCES` — sept producteurs de keywords scorés en aval.
- `DESIGN-DIS-AI-ANALYSIS` — consommateur du résultat filtré (l'analyse ne reçoit que les keywords pertinents).
- `DESIGN-DIS-CACHE` — persistance des scores avec la découverte.
- `DESIGN-INFRA-KPI-CONSISTENCY` — règle « pas de fallback silencieux » qui motive la bannière sanity check.

---

### DESIGN-DIS-AI-ANALYSIS

**Réf PRD :** [FR-DIS-AI-ANALYSIS](./prd.md#fr-dis-ai-analysis)

**Refs code**
- [src/components/moteur/DiscoveryPanel.vue](../../src/components/moteur/DiscoveryPanel.vue) — intégration : `<AiPanel variant="suggestion">` rendu en permanence ; computeds `aiPanelState`, `aiCtaDisabled`, `aiIdleMessage`, `aiCtaLabel` qui pilotent les états visuels.
- [src/components/moteur/discovery/DiscoveryAnalysisResults.vue](../../src/components/moteur/discovery/DiscoveryAnalysisResults.vue) — rendu des keywords curés (raisonnement + priorité + checkbox + select-all).
- [src/components/moteur/ai-panel/AiPanel.vue](../../src/components/moteur/ai-panel/AiPanel.vue) — coque générique du pattern AI-panel Moteur (slot `#idle`, états `idle/streaming/success/error`, `triggerDisabled`).
- [src/composables/keyword/useDiscoveryPanel.ts](../../src/composables/keyword/useDiscoveryPanel.ts) — fonction `analyzeResults` (lignes ~371-428) : construit le pool dédupliqué pertinent, POST, gère les états `analysisLoading` / `analysisResult` / `error`.
- [server/routes/keywords.routes.ts](../../server/routes/keywords.routes.ts) — endpoint `POST /api/keywords/analyze-discovery` (lignes ~758-892) : prompt système long (méthodologie SEO : comprendre douleur → évaluer groupes → critères de sélection), tool-use `curate_keywords`, modèle `claude-haiku-4-5-20251001` (8 192 tokens).

**Endpoints**
- `POST /api/keywords/analyze-discovery` — body `{ seed, keywords: Array<{ keyword, sources[], searchVolume?, difficulty?, cpc?, intent? }>, wordGroups: Array<{ word, count }>, articleContext?: { title?, painPoint? } }`. Response `{ keywords: Array<{ keyword, reasoning, priority: 'high'|'medium'|'low' }>, summary: string, usage: ApiUsage }`.

**Tables consommées** : aucune lecture directe. L'analyse n'a pas de cache cross-article — elle est persistée uniquement via le cache de découverte (`DESIGN-DIS-CACHE`) sous forme de `analysisResult` dans le JSONB.

**Flux DB**

*Lecture* : le service `theme-config.service.ts` lit le contexte business (`theme.avatar.sector`, `theme.positioning.targetAudience`, `theme.offerings.services`, `theme.positioning.mainPromise`) depuis le store théorique unique (file-system YAML — cf. `DESIGN-CER-THEME-CONFIG`).

*Écriture* : aucune écriture directe.

**Stores Pinia**
- `useCostLogStore` — l'usage Claude (tokens entrants/sortants, coût) est appendé à la pile d'activité quand `result.usage` revient avec la réponse.

**Watchers & réactivité**
- Pas de watcher dédié. L'état `analysisLoading` / `analysisResult` / `error` est piloté impérativement par `analyzeResults()`.
- Computed `aiPanelState` dans `DiscoveryPanel.vue` : `error → 'error'`, `analysisLoading → 'streaming'`, `analysisResult → 'success'`, sinon `'idle'`. C'est cette computed qui pilote la coque `<AiPanel>` — la coque ne disparaît jamais, seul son état change (invariant `NFR-UX-STABLE-SKELETON`).
- Computed `aiCtaDisabled` : `!hasResults || semanticLoading || relevantCount === 0` — désactive le bouton dans les trois cas de pré-condition non remplie.
- Computed `aiIdleMessage` : sélectionne dynamiquement l'un des trois messages d'invitation selon l'état métier (pas de résultats / scoring en cours / 0 pertinent).

**Décisions d'architecture**
- **Coque toujours rendue** : pattern `FR-UI-AI-PANELS-PATTERN` / `NFR-UX-STABLE-SKELETON`. Le DOM est stable, seuls les slots / classes changent — évite les CLS et la confusion utilisateur (« où est passé le bouton ? »).
- **Sources et KPI fournis au modèle dans le pool d'analyse** : permet au modèle de hiérarchiser sur volume / KD / CPC / intent / multi-source — pas seulement sur la sémantique. Compromis : payload plus lourd (≈ 312 keywords × ~120 chars), mais l'IA est plus utile.
- **Wordgroups limités à 30** dans le prompt : signal d'orientation (sous-thèmes) sans inonder ; le prompt précise au modèle que beaucoup sont du bruit et qu'il doit évaluer la pertinence avant d'utiliser.
- **Tool use plutôt que JSON parsing** : évite les bricolages de format ; le schéma JSON est validé côté Claude SDK avant retour.
- **Pas de cache cross-article séparé** : l'analyse est persistée dans le cache de découverte (`keyword_discoveries.sources_json.analysisResult`) — cohérent avec le découpage « 1 découverte = 1 ligne `keyword_discoveries` ».
- **Refonte 2026-05-11 — suppression de `DiscoveryAiPanel.vue` + `useDiscoveryRanking.ts`** : pré-refonte, une coque dédiée + un composable de tri local Jaccard existaient mais n'étaient jamais déclenchés dans le workflow utilisateur réel. Remplacés par usage direct de `<AiPanel>` depuis `DiscoveryPanel.vue` + tri sémantique côté backend (Claude). Trace : `npm run check:dead` valide l'absence des fichiers.

**Critères d'acceptation techniques**
- Au mount de `DiscoveryPanel`, `<AiPanel data-testid="ai-panel-suggestion">` est dans le DOM même si `hasResults === false`.
- `analysisResult !== null` → `DiscoveryAnalysisResults` enfant DOM de la coque (vérifie le rattachement, pas un rendu hors coque).
- `error` actif → état `'error'` rendu, pas de zone vide silencieuse.

**Voir aussi**
- `DESIGN-DIS-RELEVANCE-FILTER` — fournit le pool pré-filtré (l'analyse ne reçoit que les keywords pertinents).
- `DESIGN-DIS-CACHE` — persiste `analysisResult` avec la découverte.
- `DESIGN-UI-AI-PANELS-PATTERN` — pattern transversal de la coque `<AiPanel>`.
- `DESIGN-CER-THEME-CONFIG` — source du contexte business injecté dans le prompt.

---

### DESIGN-DIS-CACHE

**Réf PRD :** [FR-DIS-CACHE](./prd.md#fr-dis-cache)

**Refs code**
- [src/components/moteur/discovery/KeywordDiscoveryCacheBar.vue](../../src/components/moteur/discovery/KeywordDiscoveryCacheBar.vue) — bandeau « Dernière analyse du DD/MM/YYYY · N mots-clés · analyse IA incluse » + boutons Charger / Rafraîchir.
- [src/composables/keyword/useDiscoveryCache.ts](../../src/composables/keyword/useDiscoveryCache.ts) — wrappers front : `checkCacheForSeed` (GET status), `loadFromCache` (GET full entry), `saveToCache` (POST), `clearCacheForSeed` (DELETE).
- [src/composables/keyword/useDiscoveryPanel.ts](../../src/composables/keyword/useDiscoveryPanel.ts) — `loadFromCacheAndHydrate` (réinjecte les refs sources, wordGroups, relevanceScores, analysisResult) et `saveToCacheFromState` (collecte l'état module pour POST), `watch(seedInput)` debounced 400 ms qui appelle `checkCacheForSeed` à la saisie, `watch([suggestLoading, …, semanticLoading])` auto-save quand tout est terminé.
- [server/routes/discovery-cache.routes.ts](../../server/routes/discovery-cache.routes.ts) — quatre endpoints REST.
- [server/services/infra/discovery-cache.service.ts](../../server/services/infra/discovery-cache.service.ts) — logique applicative : `checkCache`, `loadCache`, `saveCache` (TTL 30 j calculé applicatif), `clearCache`. Comptage keywords dédupliqué sur les six sources principales.
- [server/services/keyword/keyword-discovery-db.service.ts](../../server/services/keyword/keyword-discovery-db.service.ts) — accès brut DB : `getKeywordDiscovery`, `saveKeywordDiscoverySources` (UPSERT sur `(seed, lang)`), `deleteKeywordDiscovery`, helper `isKeywordDiscoveryFresh(fetchedAt, ttlDays = 30)`.

**Endpoints**
- `GET /api/discovery-cache/check?seed=…` → `{ cached, cachedAt?, keywordCount?, hasAnalysis? }`.
- `GET /api/discovery-cache/load?seed=…` → `DiscoveryCacheEntry | null`.
- `POST /api/discovery-cache/save` — body validé par `saveDiscoveryCacheSchema` (Zod, `shared/schemas/discovery-cache.schema.ts`).
- `DELETE /api/discovery-cache?seed=…`.

**Tables consommées** : `keyword_discoveries (seed, lang, sources_json JSONB, ai_analysis_json JSONB, fetched_at TIMESTAMPTZ, PK (seed, lang))` — cf. `DESIGN-INFRA-KEYWORD-DISCOVERIES`.

**Flux DB**

*Lecture* (check) : `GET /api/discovery-cache/check?seed=…` → `SELECT seed, lang, sources_json, ai_analysis_json, fetched_at FROM keyword_discoveries WHERE seed=$1 AND lang=$2` (lang par défaut `'fr'`). Le service décode le JSONB pour calculer `keywordCount` (déduplication insensible à la casse sur les six listes sources) et `hasAnalysis` (présence de `analysisResult`). Renvoyé au front qui affiche le bandeau.

*Lecture* (load) : même SELECT, mais renvoie l'entrée complète. Le composable `loadFromCacheAndHydrate` réinjecte alors dans les refs module : sources (6 + longtail), wordGroups, relevanceScores (sérialisés en `Record<string, number>` côté JSONB, reconstruits en `Map` côté composable), analysisResult, lastSeed, lastFetchKey, lastArticleContext. Aucun appel à `/keywords/*` ni `/discovery-cache/save` n'est émis pendant la réhydratation.

*Écriture* : `POST /api/discovery-cache/save` → `INSERT INTO keyword_discoveries (seed, lang, sources_json, fetched_at) VALUES (…, NOW()) ON CONFLICT (seed, lang) DO UPDATE SET sources_json = EXCLUDED.sources_json, fetched_at = NOW()`. L'UPSERT garantit qu'une seconde sauvegarde du même seed met à jour `fetched_at` (reset du TTL). La sauvegarde est déclenchée automatiquement par le watcher front quand le dernier chargement de source termine (`prevSl || prevAl || prevDl || prevSeml` puis tous `false`) **et** que `hasResults === true`.

*Suppression* : `DELETE /api/discovery-cache?seed=…` → `DELETE FROM keyword_discoveries WHERE seed=$1 AND lang=$2`. Côté front, `handleClearCache` enchaîne `clearCacheForSeed` puis `reset()` (vide les refs sources, désactive `hasDiscovered`).

**Stores Pinia**
- Aucun. L'état du cache (`cacheStatus`, `cacheLoading`) vit dans les refs locales de `useDiscoveryCache`. La cohérence avec les refs sources de `useDiscoveryPanel` est garantie par les wrappers `loadFromCacheAndHydrate` / `saveToCacheFromState` du composable parent.

**Watchers & réactivité**
- Watcher `seedInput` debouncé 400 ms dans `DiscoveryPanel.vue` → appelle `checkCacheForSeed(val)` → met à jour `cacheStatus` → le bandeau apparaît/disparaît selon le seed saisi.
- Watcher `[suggestLoading, aiLoading, dataforseoLoading, semanticLoading]` : détecte la transition `wasLoading && nowDone && hasResults` et déclenche `saveToCache(buildContext())`. Auto-save zéro effort utilisateur.
- Re-save après analyse IA : `handleAnalyze` enchaîne `analyzeResults()` puis `saveToCache(buildContext())` pour persister `analysisResult` dans la même entrée DB.

**Décisions d'architecture**
- **TTL applicatif 30 jours, pas DB** : contrôlé via `isKeywordDiscoveryFresh(fetchedAt, 30)` côté service. Pas de tâche cron de purge — les entrées périmées restent en base mais ne sont plus proposées au reload. Compromis simple en single-user local.
- **Clé `(seed, lang)` pure, pas `(seed, cocoonName, articleType, painPoint)`** : choix de granularité — une même découverte est partageable entre tous les articles d'un cocon (même seed = même pool de candidats). L'analyse IA, elle, est articleContext-aware mais persistée dans la même entrée — le dernier `saveToCache` écrase la précédente. Limite assumée : si deux articles du même cocon refont l'analyse avec des contextes très différents (ex: pain points opposés), la dernière analyse gagne. Le bandeau ne distingue pas → l'utilisateur peut « Rafraîchir » si besoin.
- **Sérialisation `relevanceScores` en `Record<string, number>` JSONB** : la `Map<string, number>` du runtime est convertie via `Object.fromEntries` au save et reconstruite via `new Map(Object.entries(...))` au load. Évite de stocker une structure non-JSON-serializable.
- **Pas de versioning de schéma** : le `DiscoveryCacheEntry` est un type partagé strict ; toute évolution casse les entrées existantes. Acceptable en single-user, à durcir si exposé publiquement.

**Voir aussi**
- `DESIGN-INFRA-KEYWORD-DISCOVERIES` — schéma DB de la table.
- `DESIGN-DIS-SOURCES`, `DESIGN-DIS-RELEVANCE-FILTER`, `DESIGN-DIS-AI-ANALYSIS` — productions persistées par ce cache.
- `DESIGN-INFRA-API-CACHE` — cache court TTL côté `external_api_cache` (différent : ce cache-ci est le cache **applicatif** des découvertes, pas le cache des appels DataForSEO).

---

### DESIGN-DIS-SEND-TO-RADAR

**Réf PRD :** [FR-DIS-SEND-TO-RADAR](./prd.md#fr-dis-send-to-radar)

**Refs code**
- [src/components/moteur/DiscoveryPanel.vue](../../src/components/moteur/DiscoveryPanel.vue) — bouton sticky « Envoyer au Radar (N) », `handleSendToRadar` qui collecte la sélection via `getRadarKeywords()` et émet `send-to-radar`.
- [src/composables/keyword/useDiscoveryPanel.ts](../../src/composables/keyword/useDiscoveryPanel.ts) — `getRadarKeywords()` (lignes ~345-368) : déduplique la sélection sur six sources principales + ajoute les keywords cochés dans `analysisResult` non encore présents, retourne `RadarKeyword[]`.
- [src/composables/keyword/useDiscoverySelection.ts](../../src/composables/keyword/useDiscoverySelection.ts) — Set `selected` partagé entre sections sources et résultats d'analyse IA.
- [src/composables/moteur/useMoteurCrossTabState.ts](../../src/composables/moteur/useMoteurCrossTabState.ts) — handler `handleSendToRadar` (lignes ~115-128) : appelle `radarStore.addKeywordsBatch(...)`, navigue `setActiveTab('radar')`, émet `MOTEUR_DISCOVERY_DONE` (cf. `DESIGN-DIS-CHECK`).
- [src/stores/article/radar-exploration.store.ts](../../src/stores/article/radar-exploration.store.ts) — store Pinia DB-first du Radar : `addKeywordsBatch` POST `/articles/:id/radar-exploration/keywords` (batch UPSERT), puis re-hydrate.

**Endpoints**
- `POST /api/articles/:id/radar-exploration/keywords` — batch UPSERT côté `radar_explorations.generated_keywords`. Cf. `DESIGN-RAD-DB-FIRST`.

**Tables consommées** : `radar_explorations` (PK `article_id`, colonne `generated_keywords` JSONB). Spécifique : `DESIGN-RAD-DB-FIRST`.

**Flux DB**

*Lecture* : aucune lecture dans ce flux. Le store Radar est déjà hydraté côté `RadarPanel` (au mount), ce flux n'a qu'à écrire.

*Écriture* :
1. Front : `handleSendToRadar()` → `getRadarKeywords()` produit `RadarKeyword[]`.
2. Émission `send-to-radar` au parent (`MoteurView.vue`).
3. Parent : `useMoteurCrossTabState.handleSendToRadar(keywords)` → `radarStore.addKeywordsBatch(keywords.map(k => ({ keyword: k.keyword, reasoning: k.reasoning })))`.
4. Store : `POST /api/articles/:articleId/radar-exploration/keywords` (batch) → backend UPSERT dans `radar_explorations.generated_keywords` (idempotent sur la forme normalisée du keyword).
5. Réponse 200 → re-hydratation du store via `GET /articles/:articleId/radar-exploration`.
6. Navigation : `setActiveTab('radar')` — le `RadarPanel` lit le store déjà à jour.
7. Émission check : `emitCheckCompleted(MOTEUR_DISCOVERY_DONE)` (cf. `DESIGN-DIS-CHECK`).

**Stores Pinia**
- `useRadarExplorationStore` — store DB-first du Radar (`AUTHORITY: PostgreSQL radar_explorations`). Hydrate au mount du Radar, mute via `addKeywordsBatch`/`removeKeyword`/`scanAll` qui POSTent en DB puis re-hydratent.
- `useArticleProgressStore` — mute via `addCheck(MOTEUR_DISCOVERY_DONE)` une fois la navigation effectuée.

**Watchers & réactivité**
- Pas de watcher load-bearing côté Discovery. Le bouton sticky est rendu conditionnellement sur `selectedCount > 0` (computed sur la taille du Set `selected`).
- Côté Radar, le store réagit à `radarStore.addKeywordsBatch` → le `RadarPanel` re-rendre la liste des chips automatiquement.

**Décisions d'architecture**
- **Écriture DB AVANT navigation** : garantit que l'utilisateur n'arrive pas sur un Radar vide (race condition supprimée). Si l'écriture échoue, l'utilisateur reste sur Discovery avec un message d'erreur (pas de navigation aveugle).
- **Idempotence par UPSERT** : `radar_explorations.generated_keywords` est un JSONB UPSERTé sur la forme normalisée du keyword côté backend. Renvoyer deux fois la même sélection ne crée pas de doublons. Cf. `DESIGN-RAD-DB-FIRST`.
- **Émission du check par le parent, pas par Discovery** : `useMoteurCrossTabState` centralise les checks Moteur (cohérence avec `MOTEUR_RADAR_DONE` émis aussi depuis ce composable). Le composant Discovery ne connaît pas la constante `MOTEUR_DISCOVERY_DONE`.
- **Suppression du basket mémoire** *(2026-05-11, cf. `FR-MOT-BASKET-DEPRECATED`)* : pré-refonte, un store basket accumulait les sélections en RAM avant de les pusher au Radar. Audit a montré que ce niveau d'indirection n'apportait rien. La sélection vit dans le Set `selected` de Discovery, puis est écrite directement en DB côté Radar.

**Voir aussi**
- `DESIGN-DIS-CHECK` — émission du check `moteur:discovery_done` à la fin de ce flux.
- `DESIGN-RAD-DB-FIRST` — destination DB des keywords envoyés.
- `DESIGN-RAD-GENERATE` — autre producteur de `generated_keywords` (caller historique côté Radar, maintenant marginal).

---

### DESIGN-DIS-CHECK

**Réf PRD :** [FR-DIS-CHECK](./prd.md#fr-dis-check)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — `MOTEUR_DISCOVERY_DONE = 'moteur:discovery_done'` (export uniquement, pas hardcodé ailleurs — cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`).
- [src/composables/moteur/useMoteurCrossTabState.ts](../../src/composables/moteur/useMoteurCrossTabState.ts) — unique site qui émet `MOTEUR_DISCOVERY_DONE`, exclusivement dans `handleSendToRadar` (ligne 119, après `setActiveTab('radar')`).
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — store qui persiste l'état via `addCheck(constant)` (POST `/api/progress/check`).
- [tests/functional/workflow-generer.test.ts](../../tests/functional/workflow-generer.test.ts) — atteste que `PHASE_CHECKS.generer = ['moteur:discovery_done', 'moteur:radar_done']` (Phase ① Explorer).

**Endpoints**
- `POST /api/progress/check` — body `{ articleId, check, action: 'add' }` validé par `addCheckSchema` (Zod, format strict `<prefix>:<snake_case>`).

**Tables consommées** : `articles.completed_checks` TEXT[]. Cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` pour la SSOT progression workflow.

**Flux DB**

*Lecture* : aucune dans ce flux. La présence du check est lue côté Dashboard pour le rendu des dots (cf. `DESIGN-DASH-PROGRESS`) et côté Moteur pour les gating soft (cf. `DESIGN-MOT-SOFT-GATING`).

*Écriture* : un seul site producteur — `useMoteurCrossTabState.handleSendToRadar` appelle `emitCheckCompleted(MOTEUR_DISCOVERY_DONE)` qui propage l'event au parent `MoteurView`, lequel appelle `articleProgressStore.addCheck('moteur:discovery_done')` → `POST /api/progress/check` → UPDATE de `articles.completed_checks` (append idempotent).

**Stores Pinia**
- `useArticleProgressStore` (`AUTHORITY: PostgreSQL articles.completed_checks`) — mute via `addCheck`, expose `progressMap` lu par les dots.

**Watchers & réactivité**
- Pas de watcher dédié à ce check. Sa pose se fait dans une fonction impérative déclenchée par `handleSendToRadar`. La réactivité aval (dot rempli sur la liste d'articles, déverrouillage éventuel de la Phase ②) est portée par `progressMap` côté store.

**Décisions d'architecture**
- **Le check est posé par l'envoi, pas par la découverte** : choix produit délibéré. Lancer une découverte est exploratoire ; envoyer au Radar est un engagement. La discrétisation évite que des tâtonnements sans validation comptent comme étape franchie sur le dashboard.
- **Émis depuis `useMoteurCrossTabState`, pas depuis `DiscoveryPanel.vue`** : centralisation des émissions de checks Phase ① (Discovery et Radar). Le composant Discovery n'importe pas la constante — il émet `send-to-radar`, le composable parent route. Cohérence avec `FR-MOT-CHECKS-CONSTANTS` (aucune string en dur).
- **Idempotence du POST** : `POST /api/progress/check` UPSERT côté DB (le check n'est pas dupliqué si déjà présent). Un renvoi vers le Radar après une sélection modifiée ne re-pose pas le check ; il était déjà là.
- **Pas de TTL ni de décochage automatique** : une fois posé, le check reste tant qu'aucun `removeCheck` explicite n'est appelé. Le décochage manuel est possible côté UI (cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`).

**Voir aussi**
- `DESIGN-DIS-SEND-TO-RADAR` — déclencheur amont du check.
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` — catalogue + règle « jamais de string en dur ».
- `DESIGN-DASH-PROGRESS` — affichage du dot 1/5 Moteur sur le dashboard.
- `DESIGN-MOT-SOFT-GATING` — lecture aval du check pour les gating.
- `DESIGN-MOT-CHECKS` — émetteurs des 5 checks Moteur (vue d'ensemble).

---

## §8.5 — Moteur — Radar (DESIGN-RAD)

### DESIGN-RAD-GENERATE

**Réf PRD :** [FR-RAD-GENERATE](./prd.md#fr-rad-generate)

**Refs code**
- [server/routes/keywords.routes.ts](../../server/routes/keywords.routes.ts) — endpoint `POST /api/keywords/radar/generate`.
- [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) — orchestration appel Haiku + dédup + validation Zod.

**Flux DB** : aucune écriture directe — génération éphémère. L'appelant (Discovery) écrit éventuellement le résultat dans `radar_explorations.generated_keywords`.

**Stores Pinia** : `useRadarExplorationStore` côté caller.

**Watchers & réactivité** : aucun — appel à la demande utilisateur.

**Décisions d'architecture**
- Modèle Haiku 4.5 (rapide, peu coûteux).
- Tool use Anthropic + Zod pour garantir la forme de sortie.

**Voir aussi** : `DESIGN-DIS-LONGTAIL-GENERATION` (consommateur côté Discovery).

---

### DESIGN-RAD-DB-FIRST

**Réf PRD :** [FR-RAD-DB-FIRST](./prd.md#fr-rad-db-first)

**Refs code**
- [src/stores/article/radar-exploration.store.ts](../../src/stores/article/radar-exploration.store.ts) — store réactif, hydrate depuis l'API.
- [src/components/moteur/RadarPanel.vue](../../src/components/moteur/RadarPanel.vue) — consommateur principal.
- [src/composables/moteur/useMoteurArticleSync.ts](../../src/composables/moteur/useMoteurArticleSync.ts) — synchronise au changement d'article.

**Endpoints**
- `GET /api/articles/:id/radar-exploration` — payload complet.
- `GET /api/articles/:id/radar-exploration/status` — métadonnées légères.

**Tables consommées** : `radar_explorations(article_id PK, scan_result JSONB, generated_keywords JSONB)`.

**Flux DB**

*Lecture* : au mount du Radar ou switch d'article (via watcher `selectedArticle.id`), `useRadarExplorationStore.setArticle(id)` déclenche le GET. Le store hydrate `generated_keywords` + `scan_result.cards`.

*Écriture* : aucune écriture directe — toutes les mutations passent par les FRs spécialisées qui POST puis re-hydratent.

**Stores Pinia**
- `useRadarExplorationStore` (`AUTHORITY:` sur `radar_explorations`) — cache réactif, jamais source de vérité indépendante.

**Watchers & réactivité**
- Watcher `selectedArticle.id` immediate dans `MoteurView.vue` → `radarExplorationStore.setArticle(id)`.
- Garde-fou anti-flash : `radarGeneratedKeywordsCount` exposé seulement si `storeArticleId === selectedArticle.id && !isLoading`.

**Décisions d'architecture**
- Suppression de tout état mémoire indépendant — bascule unique sur la DB.

**Voir aussi** : `DESIGN-RAD-PERSIST`, `DESIGN-MOT-BASKET-DEPRECATED`.

---

### DESIGN-RAD-MANUAL-ADD

**Réf PRD :** [FR-RAD-MANUAL-ADD](./prd.md#fr-rad-manual-add)

**Refs code**
- [src/components/moteur/RadarPanel.vue](../../src/components/moteur/RadarPanel.vue) — input « + Ajouter ».
- Pattern visuel inspiré de [src/components/moteur/CaptainInput.vue](../../src/components/moteur/CaptainInput.vue).

**Endpoints** : `POST /api/articles/:id/radar-exploration/keyword` (idempotent).

**Flux DB** : POST → UPSERT dans `radar_explorations.generated_keywords` (dédup côté serveur) → re-hydratation store → chip apparaît.

**Stores Pinia** : `useRadarExplorationStore`.

**Voir aussi** : `DESIGN-RAD-DB-FIRST`.

---

### DESIGN-RAD-AUTOCOMPLETE-PER-KEYWORD

**Réf PRD :** [FR-RAD-AUTOCOMPLETE-PER-KEYWORD](./prd.md#fr-rad-autocomplete-per-keyword)

**Refs code**
- [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) — orchestration scan.
- [server/services/keyword/autocomplete.service.ts](../../server/services/keyword/autocomplete.service.ts) — fetch unitaire Google Suggest.

**Tables consommées** : `keyword_autocomplete(keyword, lang, country, position, ...)` — cache cross-article TTL 90 j.

**Flux DB**

*Lecture* : pour chaque mot-clé scanné, lecture `keyword_autocomplete` avec freshness 90 j. Hit → court-circuit appel externe.

*Écriture* : miss → fetch DataForSEO → UPSERT idempotent.

**Décisions d'architecture**
- Avant 2026-05-11 : 1 appel autocomplete global sur le sujet article (signal trompeur). Refonte : 1 appel par mot-clé + cache long terme.
- Concurrence 3 requêtes parallèles.

**Voir aussi** : `DESIGN-RAD-SCAN-2PASS`.

---

### DESIGN-RAD-SCAN-2PASS

**Réf PRD :** [FR-RAD-SCAN-2PASS](./prd.md#fr-rad-scan-2pass)

**Refs code**
- [server/routes/intent-scan.routes.ts](../../server/routes/intent-scan.routes.ts) — endpoint `POST /api/keywords/radar/scan`.
- [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) — pipeline scan.
- [server/services/intent/intent-scan.service.ts](../../server/services/intent/intent-scan.service.ts) — résonance + matching stem.

**Tables consommées** : `keyword_metrics`, `paa_explorations`, `external_api_cache`, `keyword_paa_questions`.

**Flux DB**

*Lecture* : cascade cache `keyword_metrics` → `external_api_cache` → fetch DataForSEO en miss.

*Écriture* : résultats UPSERT dans `keyword_metrics` (cross-article) + `paa_explorations` (article-scoped) + `radar_explorations.scan_result.cards`.

**Stores Pinia** : `useRadarExplorationStore` mis à jour après scan.

**Décisions d'architecture**
- Pass 1 = signaux SEO bruts ; Pass 2 = résonance sémantique.
- Profondeur 1 ou 2 — choix utilisateur (impact coût SERP).
- Concurrence 3 SERP en parallèle.

**Voir aussi** : `DESIGN-RAD-RESONANCE`, `DESIGN-RAD-AUTOCOMPLETE-PER-KEYWORD`.

---

### DESIGN-RAD-SCORING-BIMODAL

**Réf PRD :** [FR-RAD-SCORING-BIMODAL](./prd.md#fr-rad-scoring-bimodal)

**Refs code**
- [shared/scoring-kpi.ts](../../shared/scoring-kpi.ts) — `computeMarketScore`.
- [shared/scoring.ts](../../shared/scoring.ts) — `computeRelevanceScore`.
- [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — toggle d'affichage.

**Flux DB** : Score Marché recalculé live front (cf. `DESIGN-RAD-MARKET-COMPUTED-LIVE`). Score Pertinence calculé live backend lors de l'hydratation Capitaine. Aucune persistance des scores.

**Stores Pinia** : aucun cache score.

**Décisions d'architecture**
- Deux questions distinctes → deux scores indépendants.
- Pas de persistance — cohérence formule ↔ valeur garantie.

**Voir aussi** : `DESIGN-RAD-MARKET-COMPUTED-LIVE`, `DESIGN-CAP-RELEVANCE-COMPUTED-LIVE`, `DESIGN-INFRA-KPI-NULLABLE`.

---

### DESIGN-RAD-RESONANCE

**Réf PRD :** [FR-RAD-RESONANCE](./prd.md#fr-rad-resonance)

**Refs code**
- [server/services/intent/intent-scan.service.ts](../../server/services/intent/intent-scan.service.ts) — stemmer français + matching bidirectionnel.
- [src/composables/keyword/useResonanceScore.ts](../../src/composables/keyword/useResonanceScore.ts) — composable front.

**Endpoints** : `POST /api/keywords/intent-scan` — consommé exclusivement par Radar (cf. DRIFT-014).

**Flux DB** : appel synchrone, retour direct. Pas de persistance dédiée.

**Décisions d'architecture**
- Stemmer maison (~38 suffixes français).
- Stop-words français (~36) filtrés.
- Trois niveaux `total / partial / none` via ratio bidirectionnel.

**Historique** : la FR `FR-DIS-INTENT-SCAN` historiquement placée dans Discovery alimente en réalité Radar uniquement (DRIFT-014).

**Voir aussi** : `DESIGN-RAD-SCAN-2PASS`, `DESIGN-RAD-SCORING-BIMODAL`.

---

### DESIGN-RAD-SCORE-RING-TOOLTIP

**Réf PRD :** [FR-RAD-SCORE-RING-TOOLTIP](./prd.md#fr-rad-score-ring-tooltip)

**Refs code**
- [src/components/intent/radar-card/RadarCardScoreRing.vue](../../src/components/intent/radar-card/RadarCardScoreRing.vue) — SVG circulaire + tooltip.

**Flux DB** : aucun — affichage pur à partir des KPIs reçus.

**Watchers & réactivité**
- Clic sur l'anneau intercepté (`@click.stop`) — empêche propagation au parent (sinon ouverture intempestive du side panel Capitaine).

**Décisions d'architecture**
- 4 messages contextuels pour `—` : `no-pain`, `no-signals`, `long-tail`, fallback.
- Décomposition pondérée 5-6 lignes au survol.

**Voir aussi** : `DESIGN-RAD-CARD-CHEVRON-TOGGLE`.

---

### DESIGN-RAD-PAA-TREE

**Réf PRD :** [FR-RAD-PAA-TREE](./prd.md#fr-rad-paa-tree)

**Refs code**
- [src/components/intent/radar-card/RadarCardPaaTree.vue](../../src/components/intent/radar-card/RadarCardPaaTree.vue) — arbre récursif parent → children.

**Tables consommées** : `paa_explorations` (article-scoped) + `keyword_paa_questions` (cache 90 j).

**Flux DB** : payload PAA reçu dans `radar_explorations.scan_result.cards[].paa`. Indicateur « PAA en cache » si hit cache 90 j.

**Décisions d'architecture**
- Arbre 2 niveaux max.
- Chaque nœud : badge match, score sémantique %, compte enfants.

**Voir aussi** : `DESIGN-RAD-RESONANCE`, `DESIGN-INFRA-PAA-CACHE`.

---

### DESIGN-RAD-LONGTAIL-GENERATE

**Réf PRD :** [FR-RAD-LONGTAIL-GENERATE](./prd.md#fr-rad-longtail-generate)

**Refs code**
- [server/services/keyword/long-tail-combinator.service.ts](../../server/services/keyword/long-tail-combinator.service.ts) — combinator déterministe.
- [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) — orchestration combinator → cache → IA → persist.

**Tables consommées** : `external_api_cache` (TTL 7 j, clé SHA256 inputs), `radar_explorations.scan_result.longTailSuggestions`.

**Flux DB**

*Lecture* : cache check par signature → hit retourne suggestions ; miss → pipeline (combinator → IA Haiku → Zod → UPSERT cache).

*Écriture* : résultat persisté dans `radar_explorations.scan_result.longTailSuggestions`.

**Stores Pinia** : `useRadarExplorationStore`.

**Décisions d'architecture**
- 4 étapes : combinator local → cache → IA Haiku → Zod.
- Cache idempotent : régénérer avec mêmes entrées = pas de nouvel appel IA.

**Voir aussi** : `DESIGN-RAD-LONGTAIL-UI`, `DESIGN-RAD-LONGTAIL-REGENERATE`.

---

### DESIGN-RAD-LONGTAIL-UI

**Réf PRD :** [FR-RAD-LONGTAIL-UI](./prd.md#fr-rad-longtail-ui)

**Refs code**
- [src/components/moteur/RadarPanel.vue](../../src/components/moteur/RadarPanel.vue) — section « Suggestions longue traîne ».

**Flux DB** : état coché persisté dans `radar_explorations.scan_result.longTailSelectedKeywords[]` à chaque changement.

**Stores Pinia** : `useRadarExplorationStore`.

**Décisions d'architecture**
- Top 5 pré-cochées au premier rendu (heuristique).
- Persistance immédiate de chaque cochage (pas de bouton Sauvegarder).

**Voir aussi** : `DESIGN-RAD-LONGTAIL-GENERATE`, `DESIGN-RAD-SEND-CAPTAIN`.

---

### DESIGN-RAD-LONGTAIL-REGENERATE

**Réf PRD :** [FR-RAD-LONGTAIL-REGENERATE](./prd.md#fr-rad-longtail-regenerate)

**Refs code** : voir `DESIGN-RAD-LONGTAIL-GENERATE`.

**Flux DB** : au reload, lecture `radar_explorations.scan_result.longTailSuggestions` + `longTailSelectedKeywords` restaure l'état. Bouton bascule « Suggérer » → « Régénérer ».

**Décisions d'architecture**
- Cache d'idempotence TTL 7 j, clé SHA256 inputs sorted — « Régénérer » sans changement = cache hit.

**Voir aussi** : `DESIGN-RAD-LONGTAIL-GENERATE`.

---

### DESIGN-RAD-SEND-CAPTAIN

**Réf PRD :** [FR-RAD-SEND-CAPTAIN](./prd.md#fr-rad-send-captain)

**Refs code**
- [src/components/moteur/RadarPanel.vue](../../src/components/moteur/RadarPanel.vue) — bouton « Envoyer au Capitaine ».
- [src/composables/moteur/useMoteurCrossTabState.ts](../../src/composables/moteur/useMoteurCrossTabState.ts) — handler `handleCardsSelected`.

**Tables consommées** : `captain_explorations` (colonne `source` trace `radar`/`longtail`/`manual`).

**Flux DB** : POST batch → INSERT idempotent dans `captain_explorations` → navigation onglet Capitaine.

**Stores Pinia** : `useRadarExplorationStore` (lecture sélection) + `useArticleKeywordsStore` (target).

**Décisions d'architecture**
- Dédoublonnage cards racines ∪ longues traînes — la racine prime sur sa longue traîne dérivée.
- Provenance tracée pour analytics produit.

**Voir aussi** : `DESIGN-CAP-PERSIST`, `DESIGN-MOT-CROSS-TAB-PAYLOAD`.

---

### DESIGN-RAD-PERSIST

**Réf PRD :** [FR-RAD-PERSIST](./prd.md#fr-rad-persist)

**Refs code**
- [server/routes/radar-exploration.routes.ts](../../server/routes/radar-exploration.routes.ts) — CRUD complet.
- [server/services/infra/radar-exploration.service.ts](../../server/services/infra/radar-exploration.service.ts) — logique service.

**Endpoints**
- `GET /api/articles/:id/radar-exploration` (full).
- `GET /api/articles/:id/radar-exploration/status` (lightweight).
- `POST /api/articles/:id/radar-exploration` (upsert complet).
- `DELETE /api/articles/:id/radar-exploration` (clear).
- `POST /api/articles/:id/radar-exploration/keyword` (add unitaire).
- `DELETE /api/articles/:id/radar-exploration/keyword?keyword=…` (remove unitaire).
- `POST /api/articles/:id/radar-exploration/keywords` (batch add).

**Tables consommées** : `radar_explorations(article_id PK, scan_result JSONB, generated_keywords JSONB)` — 1 ligne par article.

**Flux DB** : tous les ajouts/retraits/scans/cochages écrivent immédiatement. Lecture = 1 seul fetch full.

**Stores Pinia** : `useRadarExplorationStore`.

**Historique** : ancien cache cross-article par seed (`/radar-cache/check?seed=…`) supprimé 2026-05-11 — remplacé par `DESIGN-MOT-CACHE-PANEL-COUNT` (scope par article).

**Voir aussi** : `DESIGN-RAD-DB-FIRST`, `DESIGN-MOT-CACHE-PANEL-COUNT`.

---

### DESIGN-RAD-CHECK

**Réf PRD :** [FR-RAD-CHECK](./prd.md#fr-rad-check)

**Refs code**
- [src/components/moteur/RadarPanel.vue](../../src/components/moteur/RadarPanel.vue) — émission après scan réussi.
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — constante `MOTEUR_RADAR_DONE`.

**Flux DB** : POST `/api/articles/:id/progress/check` avec `moteur:radar_done` → `array_append` conditionnel sur `articles.completed_checks`.

**Stores Pinia** : `useArticleProgressStore`.

**Décisions d'architecture**
- Idempotent — `array_append` conditionnel évite les doublons.

**Voir aussi** : `DESIGN-MOT-CHECKS`, `DESIGN-DASH-PROGRESS`.

---

### DESIGN-RAD-MARKET-COMPUTED-LIVE

**Réf PRD :** [FR-RAD-MARKET-COMPUTED-LIVE](./prd.md#fr-rad-market-computed-live)

**Refs code**
- [shared/scoring-kpi.ts](../../shared/scoring-kpi.ts) — `computeKpiScore`.
- [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — appel inline au rendu.

**Flux DB** : aucun — pas de persistance.

**Stores Pinia** : aucun cache score.

**Décisions d'architecture**
- Recalcul live à chaque rendu — cohérence formule ↔ affichage.
- Si `kpis === null` (longue traîne) → affichage `—`.

**Voir aussi** : `DESIGN-RAD-NO-RELEVANCE-IN-SCAN`, `DESIGN-INFRA-KPI-NULLABLE`.

---

### DESIGN-RAD-NO-RELEVANCE-IN-SCAN

**Réf PRD :** [FR-RAD-NO-RELEVANCE-IN-SCAN](./prd.md#fr-rad-no-relevance-in-scan)

**Refs code**
- [server/services/keyword/keyword-radar.service.ts](../../server/services/keyword/keyword-radar.service.ts) — pipeline scan.

**Flux DB**

*Écriture* : le snapshot `radar_explorations.scan_result.cards[]` ne contient pas de `relevanceScore`. Les anciennes lignes (avant 2026-05-05) qui en contenaient sont **ignorées à la lecture**.

**Décisions d'architecture**
- Modification du painPoint ne nécessite jamais de re-scanner — le Score Pertinence sera recalculé live à l'hydratation Capitaine.

**Voir aussi** : `DESIGN-CAP-RELEVANCE-COMPUTED-LIVE`.

---

### DESIGN-RAD-CARD-CHEVRON-TOGGLE

**Réf PRD :** [FR-RAD-CARD-CHEVRON-TOGGLE](./prd.md#fr-rad-card-chevron-toggle)

**Refs code**
- [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — gestion des `@click.stop` ciblés.

**Flux DB** : aucun — pure interaction UI.

**Watchers & réactivité**
- Plusieurs zones interceptent leur clic (`@click.stop`) : chevron PAA, score-ring, cadenas, mots interactifs. Les autres propagent au parent (ouverture side panel Capitaine).

**Décisions d'architecture**
- Discrétisation par zone — évite que l'utilisateur déclenche PAA en voulant ouvrir le panel.

**Voir aussi** : `DESIGN-RAD-SCORE-RING-TOOLTIP`, `DESIGN-RAD-PAA-TREE`.

---

## §8.6 — Moteur — Capitaine (DESIGN-CAP)

### DESIGN-CAP-INPUT

**Réf PRD :** [FR-CAP-INPUT](./prd.md#fr-cap-input)

**Refs code**
- [src/components/moteur/CaptainInput.vue](../../src/components/moteur/CaptainInput.vue) — champ texte + suggestion.

**Flux DB** : la saisie déclenche en aval `FR-CAP-SCAN` (lecture/écriture cache + persistance entry).

**Stores Pinia** : `useArticleKeywordsStore`.

**Décisions d'architecture** : validation syntaxe légère côté front (longueur min 2 chars), validation Zod côté backend.

---

### DESIGN-CAP-SCAN

**Réf PRD :** [FR-CAP-SCAN](./prd.md#fr-cap-scan)

**Refs code**
- [server/routes/keyword-scan.routes.ts](../../server/routes/keyword-scan.routes.ts) — endpoint `POST /api/keywords/:keyword/scan` (renommée de `validate`, cf. note historique §8.3).
- [server/services/keyword/keyword-scan.service.ts](../../server/services/keyword/keyword-scan.service.ts) — pipeline scan.

**Tables consommées** : `keyword_metrics` (cache cross-article, freshness 7 j), `keyword_serp_results`, `keyword_paa_questions`, `keyword_autocomplete`, `external_api_cache`.

**Flux DB**

*Lecture* : cache check `keyword_metrics` → hit retourne payload complet.

*Écriture* : miss → fetch parallèle Overview + Autocomplete + SERP + Intent + PAA → UPSERT dans `keyword_metrics` et tables associées.

**Stores Pinia** : `useArticleKeywordsStore`.

**Décisions d'architecture**
- Cache freshness 7 jours — équilibre fraîcheur / coût API.
- Appels DataForSEO parallélisés (Overview + Autocomplete + SERP + Intent + PAA) pour minimiser la latence.

**Voir aussi** : `DESIGN-INFRA-KEYWORD-METRICS`, `DESIGN-EXT-DATAFORSEO`, `DESIGN-EXT-DATAFORSEO-COSTGUARD`.

---

### DESIGN-CAP-LIST-SIDEPANEL

**Réf PRD :** [FR-CAP-LIST-SIDEPANEL](./prd.md#fr-cap-list-sidepanel)

**Refs code**
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — orchestration liste + side-panel.
- [src/components/moteur/CaptainSidePanel.vue](../../src/components/moteur/CaptainSidePanel.vue) — panneau latéral sticky.
- [src/components/moteur/CaptainRadarList.vue](../../src/components/moteur/CaptainRadarList.vue) — liste verticale.

**Décisions d'architecture**
- Sticky CSS (pas de listener JS scroll) — performance.
- Sélection au clic, pas au survol — évite les changements involontaires de panneau.
- Réinitialisation `selectedIndex` à 3 points : changement d'article, vidage des entries, suppression manuelle.

**Voir aussi** : `DESIGN-CAP-KPIS-READONLY` (contenu du panneau), `DESIGN-CAP-AI-PANEL` (panel IA dans le side-panel).

---

### DESIGN-CAP-KPIS-READONLY

**Réf PRD :** [FR-CAP-KPIS-READONLY](./prd.md#fr-cap-kpis-readonly)

**Refs code**
- [src/components/moteur/CaptainSidePanel.vue](../../src/components/moteur/CaptainSidePanel.vue) — affichage lecture seule.

**Décisions d'architecture** : mode workflow → lecture seule ; mode libre (deprecated avec retrait Labo) avait des seuils interactifs.

---

### DESIGN-CAP-SCORING-BIMODAL

**Réf PRD :** [FR-CAP-SCORING-BIMODAL](./prd.md#fr-cap-scoring-bimodal)

**Refs code**
- [shared/scoring-kpi.ts](../../shared/scoring-kpi.ts) — `computeMarketScore` (mutualisé Radar/Capitaine).
- [shared/scoring.ts](../../shared/scoring.ts) — `computeRelevanceScore`.

**Flux DB** : Score Marché live front (cf. `DESIGN-RAD-MARKET-COMPUTED-LIVE`), Score Pertinence live backend (cf. `DESIGN-CAP-RELEVANCE-LIVE`).

**Voir aussi** : `DESIGN-RAD-SCORING-BIMODAL` (mêmes formules), `DESIGN-INFRA-KPI-NULLABLE`.

---

### DESIGN-CAP-AI-PANEL

**Réf PRD :** [FR-CAP-AI-PANEL](./prd.md#fr-cap-ai-panel)

**Refs code**
- [src/components/moteur/ai-panel/AiPanel.vue](../../src/components/moteur/ai-panel/AiPanel.vue) + [AiAdviceMarkdown.vue](../../src/components/moteur/ai-panel/AiAdviceMarkdown.vue) — coque + rendu markdown.
- [server/routes/keyword-ai-panel.routes.ts](../../server/routes/keyword-ai-panel.routes.ts) — endpoint SSE `POST /keywords/:keyword/ai-panel`.
- [server/prompts/capitaine-ai-panel.md](../../server/prompts/capitaine-ai-panel.md) — prompt 3 sections.

**Flux DB** : aucune écriture — analyse éphémère, re-déclenchable à la demande.

**Décisions d'architecture**
- Variables injectées : `{{keyword}}`, `{{level}}`, `{{painPoint}}`, `{{marketScore}}`, `{{relevanceScore}}`, `{{strategy_context}}`.
- Modèle Claude Sonnet pour la qualité du raisonnement (vs Haiku pour les générations courtes).
- Streaming SSE pour UX.

**Voir aussi** : `DESIGN-UI-AI-PANELS-PATTERN`, `DESIGN-CER-CONTEXT-FOR-MOTEUR` (injection `strategy_context`).

---

### DESIGN-CAP-ROOTS

**Réf PRD :** [FR-CAP-ROOTS](./prd.md#fr-cap-roots)

**Refs code**
- [src/composables/keyword/useCapitaineScan.ts](../../src/composables/keyword/useCapitaineScan.ts) (ex-`useCapitaineValidation`) — `extractRoots()`.
- Côté serveur, fonction `extractRoots()` partagée (`shared/` ou `server/utils/`) — alimente le calcul Pertinence backend.

**Décisions d'architecture**
- Algorithme **linéaire** (troncature progressive depuis la fin) — pas d'IA, pas de parsing sémantique.
- Maximum 5 racines, minimum 2 mots significatifs hors stopwords.
- Filtre stop-words français.

**Voir aussi** : `DESIGN-CAP-RELEVANCE-INPUTS` (utilisation des racines dans le scoring).

---

### DESIGN-CAP-LOCK-RADIO

**Réf PRD :** [FR-CAP-LOCK-RADIO](./prd.md#fr-cap-lock-radio)

**Refs code**
- [src/stores/article/article-keywords.store.ts](../../src/stores/article/article-keywords.store.ts) — méthode `lockCaptain(keyword, aiMarkdown?, articleId?)`.

**Tables consommées** : `article_keywords` (colonne `capitaine` TEXT — slot unique par article).

**Flux DB**

*Écriture* : `lockCaptain` UPSERT dans `article_keywords.capitaine` — remplace l'ancien si présent.

**Stores Pinia** : `useArticleKeywordsStore`.

**Watchers & réactivité**
- Séquence d'émission pour relay map : `check-removed` → `nextTick()` → `check-completed` → mutation store (évite états transitoires incohérents).

---

### DESIGN-CAP-VERDICT-INFORMATIVE

**Réf PRD :** [FR-CAP-VERDICT-INFORMATIVE](./prd.md#fr-cap-verdict-informative)

**Refs code**
- [shared/kpi-scoring.ts](../../shared/kpi-scoring.ts) — `computeVerdict()` (GO / ORANGE / NO-GO / GRAY).
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — bouton « Verrouiller » toujours actif.

**Décisions d'architecture**
- Suppression du gating `canLock` historique (2026-04-28) — verdict informatif, lock toujours actif. Cf. `DESIGN-CAP-VERDICT-GATING` (deprecated).
- Tooltip détaille le décompte vert/orange/rouge sans jargon.

**Voir aussi** : `DESIGN-CAP-AUTO-NOGO`, `DESIGN-CAP-VERDICT-GATING`.

---

### DESIGN-CAP-VERDICT-GATING — *(deprecated)*

**Réf PRD :** [FR-CAP-VERDICT-GATING](./prd.md#fr-cap-verdict-gating)

**Statut** : deprecated 2026-04-28. Remplacée par `DESIGN-CAP-VERDICT-INFORMATIVE`. Historiquement, le bouton « Valider Capitaine » était disabled tant que le verdict n'était pas GO. Logique supprimée pour rendre le verdict purement informatif.

---

### DESIGN-CAP-AUTO-NOGO

**Réf PRD :** [FR-CAP-AUTO-NOGO](./prd.md#fr-cap-auto-nogo)

**Refs code**
- [shared/kpi-scoring.ts](../../shared/kpi-scoring.ts) — `computeVerdict()` détecte `greenCount === 0` sur les 6 KPI.

**Décisions d'architecture** : forcer NO-GO + raison textuelle « aucun signal détecté » plutôt que verdict neutre — l'absence de signal est un signal.

---

### DESIGN-CAP-PAINPOINT-FALLBACK

**Réf PRD :** [FR-CAP-PAINPOINT-FALLBACK](./prd.md#fr-cap-painpoint-fallback)

**Refs code**
- [server/services/queries/article-pain-point.service.ts](../../server/services/queries/article-pain-point.service.ts) — `getArticlePainPoint()` fallback `"(non défini)"`.

**Décisions d'architecture**
- Score Pertinence forcé à `null` quand painPoint absent ou < 10 chars — cohérence avec `DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON` (raison `'no-pain'`).
- Score Marché reste calculable (indépendant du painPoint).

**Voir aussi** : `DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON`.

---

### DESIGN-CAP-PERSIST

**Réf PRD :** [FR-CAP-PERSIST](./prd.md#fr-cap-persist)

**Refs code**
- [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) — `saveCaptainExploration()`, `getCaptainExplorations()`.
- [server/routes/article-explorations.routes.ts](../../server/routes/article-explorations.routes.ts) — endpoints CRUD.

**Tables consommées** : `captain_explorations(article_id, keyword, source TEXT, root_keywords TEXT[], paa_judgment JSONB?, explored_at)` — UNIQUE `(article_id, keyword)`.

**Flux DB**

*Lecture* : au mount Capitaine, `getCaptainExplorations(articleId)` retourne la liste persistée.

*Écriture* : à chaque ajout (envoi Radar, saisie manuelle, longue traîne IA acceptée), UPSERT dans `captain_explorations`.

**Stores Pinia** : `useArticleKeywordsStore`.

**Voir aussi** : `DESIGN-INFRA-LIEUTENANT-EXPLORATIONS` (table sœur), `DESIGN-RAD-SEND-CAPTAIN` (porte d'entrée principale).

---

### DESIGN-CAP-CHECK

**Réf PRD :** [FR-CAP-CHECK](./prd.md#fr-cap-check)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — constante `MOTEUR_CAPITAINE_LOCKED`.
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — émission au lock.

**Flux DB** : POST `/articles/:id/progress/check` (ou `/uncheck`) → mise à jour `articles.completed_checks`.

**Watchers & réactivité** : réconciliation défensive au mount (cf. `DESIGN-MOT-CHECK-RECONCILIATION`).

---

### DESIGN-CAP-RELEVANCE-LIVE

**Réf PRD :** [FR-CAP-RELEVANCE-LIVE](./prd.md#fr-cap-relevance-live)

**Refs code**
- [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) — calcul live à chaque hydratation.
- Pas de store front dédié — l'ancien `captain-relevance.store.ts` a été supprimé (cf. drift-code-vs-doc).

**Flux DB**

*Lecture* : à l'hydratation de l'onglet Capitaine, le serveur exécute le calcul depuis `painPoint` + `keyword_metrics` + `captain_explorations.root_keywords`.

*Écriture* : aucune — pas de persistance du score, pas de cache TTL.

**Décisions d'architecture**
- Pas de cache TTL serveur, pas de localStorage/sessionStorage front, pas de colonne SQL `relevance_score`.
- F5 navigateur vide complètement le score côté front.
- Toute évolution de formule se reflète au prochain mount, sans migration.

**Voir aussi** : `DESIGN-CAP-RELEVANCE-INPUTS`, `DESIGN-CAP-RELEVANCE-MEMOIZATION`, `DESIGN-RAD-NO-RELEVANCE-IN-SCAN`.

---

### DESIGN-CAP-RELEVANCE-INPUTS

**Réf PRD :** [FR-CAP-RELEVANCE-INPUTS](./prd.md#fr-cap-relevance-inputs)

**Refs code**
- [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) — `saveCaptainExploration` calcule + persiste `root_keywords` à l'entrée.
- [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) — lit `root_keywords` depuis DB au calcul ; fallback `extractRoots()` mémoire si absent.

**Tables consommées** : `captain_explorations.root_keywords TEXT[]`.

**Flux DB**

*Écriture* : à l'entrée d'un mot-clé dans `captain_explorations`, calcul + persistance des racines (immutables après).

*Lecture* : au calcul Pertinence, lecture depuis la colonne — pas de recalcul.

**Décisions d'architecture**
- Racines calculées **une seule fois** à l'entrée — verrouiller un mot-clé existant ne déclenche aucun UPDATE sur les racines.
- Algorithme linéaire verrouillé (cf. `DESIGN-CAP-ROOTS`).

**Voir aussi** : `DESIGN-CAP-ROOTS`, `DESIGN-CAP-RELEVANCE-LIVE`.

---

### DESIGN-CAP-RELEVANCE-MEMOIZATION

**Réf PRD :** [FR-CAP-RELEVANCE-MEMOIZATION](./prd.md#fr-cap-relevance-memoization)

**Refs code**
- [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) — Map locale créée à l'entrée de la fonction de calcul.

**Décisions d'architecture**
- Mémoïsation **éphémère** (durée 1 requête HTTP) — Map libérée à la sortie de la fonction.
- Aucune persistance hors scope (localStorage, sessionStorage, cache TTL).

**Voir aussi** : `DESIGN-CAP-RELEVANCE-LIVE`.

---

### DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON

**Réf PRD :** [FR-CAP-RELEVANCE-UNAVAILABLE-REASON](./prd.md#fr-cap-relevance-unavailable-reason)

**Refs code**
- [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) — retourne `unavailableReason` typé.
- [src/components/intent/radar-card/RadarCardScoreRing.vue](../../src/components/intent/radar-card/RadarCardScoreRing.vue) — affichage tooltip côté front.

**Type** : `'no-pain' | 'long-tail' | 'missing-paa' | 'missing-autocomplete' | 'haiku-unavailable' | null`.

**Mapping**
- `no-pain` : painPoint absent ou < 10 chars.
- `long-tail` : `kpis === null` (longue traîne sans appel DataForSEO).
- `missing-paa` : pas de questions PAA scrapées en DB.
- `missing-autocomplete` : pas de suggestions autocomplete en DB.
- `haiku-unavailable` : appel Haiku au signal 2 (PAA × douleur) échoué (timeout, rate limit, schéma malformé). **Le score reste calculable** via fallback lexical historique côté signal 2 — dégradation gracieuse, pas un blocage. Le tooltip signale l'état dégradé sans masquer le score.

**Décisions d'architecture**
- Message vient du backend — pas de devinette côté front.
- Backend logge la cause à chaque retour `null` (observabilité).
- Cas `haiku-unavailable` : signalé dans le tooltip même quand le score reste calculé — l'utilisateur sait qu'il regarde un signal 2 lexical et non IA.

**Historique**
- 2026-05-12 : ajout de `'haiku-unavailable'` lors de l'intégration de `FR-CAP-PAA-JUDGE-HAIKU` (source `tech-spec-captain-paa-pertinence-unify`).

**Voir aussi** : `DESIGN-RAD-SCORE-RING-TOOLTIP`, `DESIGN-CAP-PAINPOINT-FALLBACK`, `DESIGN-CAP-PAA-JUDGE-HAIKU`.

---

### DESIGN-CAP-RELEVANCE-INTENT-SIGNAL

**Réf PRD :** [FR-CAP-RELEVANCE-INTENT-SIGNAL](./prd.md#fr-cap-relevance-intent-signal)

**Refs code**
- [shared/scoring.ts](../../shared/scoring.ts) — `computeIntentPainAlignment` (matrice 4×4) + constante `INTENT_MISMATCH_MALUS`.
- [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) — croise `keyword_metrics.intent_raw` avec `articles.pain_intent_expected`.

**Tables consommées** : `keyword_metrics.intent_raw` (intent SERP DataForSEO), `articles.pain_intent_expected` (intent éditorial attendu, défini Cerveau).

**Décisions d'architecture**
- `pain_intent_expected = NULL` → signal neutralisé à 50/100 (dégradation gracieuse).
- Match → bonus. Mismatch → malus appliqué à la composante `intentPain.normalized`.
- Migration `014_articles_pain_intent_expected.sql` ajoute la colonne.

**Voir aussi** : `DESIGN-CER-CHECKS` (génération de l'intent par l'IA Cerveau).

---

### DESIGN-CAP-PAA-JUDGE-HAIKU

**Réf PRD :** [FR-CAP-PAA-JUDGE-HAIKU](./prd.md#fr-cap-paa-judge-haiku--lia-juge-directement-la-pertinence-des-questions-paa-par-rapport-à-la-douleur)

**Refs code**
- [server/services/keyword/captain-paa-judge.service.ts](../../server/services/keyword/captain-paa-judge.service.ts) — orchestration de l'appel Haiku + parsing tool_use + fallback lexical.
- [server/prompts/captain-paa-judge.md](../../server/prompts/captain-paa-judge.md) — prompt système avec injection `{{articleTitle}}`, `{{painPoint}}`, `{{paaItems}}`.
- [server/services/keyword/captain-relevance.service.ts](../../server/services/keyword/captain-relevance.service.ts) — intégration : utilise `paaPainAlignmentOverride` du jugement Haiku en priorité sur le calcul lexical (`avgLexicalPainAlignment`).
- Tests : [tests/unit/services/captain-paa-judge.service.test.ts](../../tests/unit/services/captain-paa-judge.service.test.ts), [tests/unit/services/captain-relevance-haiku-override.service.test.ts](../../tests/unit/services/captain-relevance-haiku-override.service.test.ts).

**Tables consommées (lecture)** : `paa_explorations`, `keyword_paa_questions`, `articles.pain_point`, `articles.title`.

**Flux DB** : **aucune écriture en base** — le jugement est éphémère, vit en mémoire JS (cf. `DESIGN-CAP-PAA-JUDGE-CACHE-SESSION`).

**Décisions d'architecture**
- **Modèle** : Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — léger et rapide, suffisant pour un jugement structuré sur 4-16 PAA.
- **Tool use forcé** sur `submit_paa_judgments` avec schéma strict (cf. tech-spec) — garantit une sortie parsable, pas de prose libre.
- **`temperature: 0`** pour réduire la variabilité — un même mot-clé donne la même structure de jugement à chaque appel.
- **Appel par mot-clé** (pas par question) — économise des tokens et offre un raisonnement contextuel global sur l'ensemble des PAA d'un mot-clé.
- **Fallback lexical silencieux** : en cas d'échec Haiku (timeout, rate limit, schéma malformé, `HaikuJudgmentError`), le calcul lexical historique (`avgLexicalPainAlignment`) prend le relais — le score reste calculé, signalé via `'haiku-unavailable'` dans `DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON`.
- **Poids signal 2 conservé à 25 %** dans le Score Pertinence — pas de rééquilibrage de la formule globale.
- **Mode mock** : la fixture `submit_paa_judgments` retourne un schéma valide déterministe en `AI_PROVIDER=mock`.

**Voir aussi** : `DESIGN-CAP-RELEVANCE-LIVE`, `DESIGN-CAP-PAA-BADGE-SINGLE`, `DESIGN-CAP-PAA-JUDGE-CACHE-SESSION`, `DESIGN-CAP-RELEVANCE-UNAVAILABLE-REASON`.

---

### DESIGN-CAP-PAA-BADGE-SINGLE

**Réf PRD :** [FR-CAP-PAA-BADGE-SINGLE](./prd.md#fr-cap-paa-badge-single--un-seul-chip-par-question-paa-sur-le-capitaine-valeur-issue-de-lia)

**Refs code**
- [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — prop bimodale `cardContext: 'radar' | 'capitaine'` (default `'radar'`).
- [src/components/intent/radar-card/RadarCardPaaTree.vue](../../src/components/intent/radar-card/RadarCardPaaTree.vue) — rendu de l'arbre PAA avec un seul chip par feuille (mode Capitaine).
- Tests : [tests/unit/components/radar-keyword-card-paa-badge-capitaine.test.ts](../../tests/unit/components/radar-keyword-card-paa-badge-capitaine.test.ts).

**Décisions d'architecture**
- **Composant bimodal** via prop `cardContext` (cf. CLAUDE.md §3.8 « composants Moteur bimodaux ») — pas de duplication entre Radar et Capitaine.
- **Mapping couleur** : `pertinent` → palette `--color-badge-green-*` ; `partiel` → palette `--color-badge-amber-*` ; `hors-sujet` → palette `--color-bg-soft` / `--color-text-muted`.
- **Tooltip** : affiche `reasonShort` (justification ≤ 10 mots issue du jugement Haiku).
- **Header « PAA pts »** :
  - Mode `capitaine` + jugement disponible → `<overallPaaScore>/100`.
  - Mode `capitaine` + chargement → `'...'`.
  - Mode `radar` (ou capitaine fallback) → `<paaWeightedScore.toFixed(1)> pts` (somme brute historique).
- **Fallback transparent** : si `cardContext='capitaine'` mais `paaJudgment` absent (premier scan, ou Haiku échoué), le badge revient au rendu lexical historique — pas de cassure visuelle.

**Voir aussi** : `DESIGN-CAP-PAA-JUDGE-HAIKU`, `DESIGN-RAD-PAA-TREE` (rendu Radar inchangé), `DESIGN-RAD-CARD-CHEVRON-TOGGLE`.

---

### DESIGN-CAP-PAA-JUDGE-CACHE-SESSION

**Réf PRD :** [FR-CAP-PAA-JUDGE-CACHE-SESSION](./prd.md#fr-cap-paa-judge-cache-session--les-jugements-ia-restent-en-mémoire-pendant-la-session-navigateur)

**Refs code**
- [src/stores/article/article-keywords.store.ts](../../src/stores/article/article-keywords.store.ts) — champ `paaJudgment` (type `PaaJudgmentBlock`) attaché à chaque entrée `richCaptain.exploredKeywords`.

**Flux DB** : **aucune persistance**. Strictement mémoire JS (store Pinia).

**Stores Pinia** : `useArticleKeywordsStore` (`AUTHORITY:` sur `article_keywords` — le champ `paaJudgment` est un compagnon non-persisté du store).

**Watchers & réactivité**
- Pas de watcher dédié — le store hydrate `paaJudgment` au mount Capitaine, le conserve sur switch d'article (Map cross-switch), et s'efface au F5 navigateur.

**Décisions d'architecture**
- **Justification produit** : `painPoint` immutable post-Cerveau (cf. `DESIGN-MOT-PAIN-IMMUTABLE-AFTER-CEREVEAU`) ⇒ jugement Haiku stable pendant toute la session ⇒ cache cross-switch sûr (pas de risque de divergence entre le jugement caché et la donnée source).
- **F5 = vide tout** : choix assumé. Le rafraîchissement complet est une action explicite de l'utilisateur — il sait qu'il déclenche un nouveau coût IA.
- **Cohabitation avec `DESIGN-CAP-RELEVANCE-NO-CACHE`** : cette dernière régit le **score Pertinence algorithmique legacy** (lexical). Pour la composante PAA × douleur (devenue jugement Haiku), c'est `DESIGN-CAP-PAA-JUDGE-CACHE-SESSION` qui s'applique. Pas de contradiction — champs distincts du store.
- **Tests d'invariant** :
  - `grep CREATE TABLE.*paa_judg` dans `server/db/schema.sql` doit retourner 0 résultat (interdiction de persistance DB).
  - Spy `pg.query` sur tous les `INSERT` du store ne doit jamais capturer un payload contenant `paaJudgment`.

**Voir aussi** : `DESIGN-CAP-PAA-JUDGE-HAIKU`, `DESIGN-CAP-RELEVANCE-LIVE`, `DESIGN-CAP-RELEVANCE-NO-CACHE`, `DESIGN-MOT-PAIN-IMMUTABLE-AFTER-CEREVEAU`.

---

### DESIGN-CAP-NO-PAINPOINT-WATCHER

**Réf PRD :** [FR-CAP-NO-PAINPOINT-WATCHER](./prd.md#fr-cap-no-painpoint-watcher)

**Refs code**
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — **absence volontaire** de `watch(() => props.selectedArticle?.painPoint, ...)`.

**Décisions d'architecture**
- Watcher Sprint 8 historique (commit `5b849df`) **supprimé** — gérait un scénario obsolète (painPoint qui change en cours de workflow).
- Aujourd'hui `FR-PAIN-IMMUTABLE-AFTER-CEREVEAU` rend le painPoint immutable post-Cerveau — le watcher n'a plus de raison d'être.

**Voir aussi** : `DESIGN-MOT-PAIN-IMMUTABLE-AFTER-CEREVEAU` (renommé en §8.3 lors de la refonte).

---

### DESIGN-CAP-LOCK-INTEGRITY

**Réf PRD :** [FR-CAP-LOCK-INTEGRITY](./prd.md#fr-cap-lock-integrity)

**Refs code**
- [src/composables/keyword/useExploredKeywords.ts](../../src/composables/keyword/useExploredKeywords.ts) — déduplication `addEntry` / `loadCards` / `restoreFromHistory`.
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) — watcher `keywords.capitaine` ne ré-appelle plus `addEntry` (juste un log warning si entry manquante).

**Décisions d'architecture**
- **Verrouillage sur `originalCard.keyword`** : pas sur la racine active. Cohérence DB (1 RadarCard = 1 entrée stable).
- **Déduplication à 3 portes** : `addEntry` (case-insensitive + trim), `loadCards` (dédup avant remplacement), `restoreFromHistory` (dédup avant restauration).
- **Tri stable** : `entry.originalCard.keyword` / `entry.originalCard.relevanceScore` utilisés (jamais `entry.card.*` qui est variable selon la racine active).
- `pinnedPredicate` matche sur `originalCard.keyword OR card.keyword` pour gérer le cas où la racine elle-même a été lockée.

**Voir aussi** : `DESIGN-RAD-CARD-CHEVRON-TOGGLE` (interaction avec les variantes de racine).

---

## §8.7 — Moteur — Lieutenants (DESIGN-LIE)

### DESIGN-LIE-SERP-ANALYZE

**Réf PRD :** [FR-LIE-SERP-ANALYZE](./prd.md#fr-lie-serp-analyze)

**Refs code**
- [server/routes/serp-analysis.routes.ts](../../server/routes/serp-analysis.routes.ts) — endpoint `POST /api/serp/analyze`.
- [server/services/external/serp-analysis.service.ts](../../server/services/external/serp-analysis.service.ts) — orchestration scrape + cache.

**Tables consommées** : `keyword_metrics` (cache cross-article freshness 7 j) + `keyword_serp_results` / `keyword_serp_scrapes` (depuis la décomposition `keyword_metrics`).

**Flux DB**

*Lecture* : cache check `keyword_metrics` ou `keyword_serp_results` → hit retourne le snapshot SERP scrappé.

*Écriture* : miss → fetch DataForSEO `/serp/google/organic` + scrape HTTP des URLs → UPSERT dans `keyword_serp_results` + `keyword_serp_scrapes`.

**Stores Pinia** : `useArticleKeywordsStore` (consommateur côté front).

**Décisions d'architecture**
- Curseur intelligent : sous la valeur par défaut → filtre local sans appel ; au-dessus → scraping complémentaire.
- Cache cross-article : un Capitaine partagé entre articles ne re-scrape pas.

**Voir aussi** : `DESIGN-LIE-SLIDER-INTELLIGENT`, `DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE`.

---

### DESIGN-LIE-EXTRACT-HEADINGS

**Réf PRD :** [FR-LIE-EXTRACT-HEADINGS](./prd.md#fr-lie-extract-headings)

**Refs code**
- [server/services/external/serp-analysis.service.ts](../../server/services/external/serp-analysis.service.ts) — extraction regex `<h[1-3]>...</h[1-3]>` + `extractTextContent` + `computeHnRecurrenceFrom`.

**Tables consommées** : `keyword_serp_scrapes` (colonne `headings JSONB` extraite au scrape).

**Flux DB** : extraction faite au scrape (DESIGN-LIE-SERP-ANALYZE). Sortie sérialisée dans `headings[]` par URL.

**Décisions d'architecture**
- Extraction par regex (pas parsing DOM lourd) — suffisant pour H1/H2/H3.
- Calcul de récurrence (`HnRecurrenceItem[]`) côté service pour éviter re-calcul côté front.

**Voir aussi** : `DESIGN-LIE-SERP-ANALYZE`.

---

### DESIGN-LIE-PROPOSE-AI

**Réf PRD :** [FR-LIE-PROPOSE-AI](./prd.md#fr-lie-propose-ai)

**Refs code**
- [server/routes/keyword-ai-panel.routes.ts](../../server/routes/keyword-ai-panel.routes.ts) — endpoint `POST /keywords/:keyword/propose-lieutenants` (SSE).
- [server/prompts/propose-lieutenants.md](../../server/prompts/propose-lieutenants.md) — prompt enrichi (SERP + PAA + racines).
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — panel consommateur.

**Tables consommées** : `lieutenant_explorations(article_id, keyword, status, score, reasoning, ...)`.

**Flux DB**

*Écriture* : à la fin du streaming IA, persistance batch dans `lieutenant_explorations` (UPSERT par `(article_id, keyword)`).

**Stores Pinia** : `useArticleKeywordsStore`.

**Décisions d'architecture**
- Streaming SSE pour voir la réflexion IA en direct (UX).
- Filtre auto post-IA : cap par level (Pilier 5 / Intermédiaire 5 / Spécifique 4).
- Modèle Claude Sonnet (qualité supérieure à Haiku sur ce raisonnement).

**Voir aussi** : `DESIGN-LIE-GEOFUNNEL-RULE`, `DESIGN-LIE-HN-STRUCTURE`.

---

### DESIGN-LIE-GEOFUNNEL-RULE

**Réf PRD :** [FR-LIE-GEOFUNNEL-RULE](./prd.md#fr-lie-geofunnel-rule)

**Refs code**
- [server/prompts/propose-lieutenants.md](../../server/prompts/propose-lieutenants.md) — règle textuelle dans le prompt (Pilier max 1-2 villes, autres ZÉRO).

**Flux DB** : aucun — règle de scoring intégrée au prompt IA.

**Décisions d'architecture**
- Règle anti-cannibalisation : éviter qu'un article généraliste capte des requêtes locales.
- Pénalité -15 à -25 points appliquée par l'IA elle-même (signalée dans les éliminés).

**Voir aussi** : `DESIGN-LIE-PROPOSE-AI`.

---

### DESIGN-LIE-HN-STRUCTURE

**Réf PRD :** [FR-LIE-HN-STRUCTURE](./prd.md#fr-lie-hn-structure)

**Refs code**
- [server/routes/keyword-ai-panel.routes.ts](../../server/routes/keyword-ai-panel.routes.ts) — endpoint `POST /keywords/:keyword/ai-hn-structure` (SSE).
- [server/prompts/lieutenants-hn-structure.md](../../server/prompts/lieutenants-hn-structure.md) — prompt structure Hn.

**Tables consommées** : `article_keywords.hn_structure` (TEXT).

**Flux DB**

*Lecture* : payload en entrée inclut les Lieutenants déjà verrouillés et la structure Hn actuelle (pour itération).

*Écriture* : à la fin du streaming, l'utilisateur peut sauvegarder le résultat dans `article_keywords.hn_structure`.

**Décisions d'architecture**
- Sortie texte libre markdown (pas JSON strict) — laisse à l'utilisateur le soin d'arbitrer le plan final.
- Régénération possible à volonté.

**Voir aussi** : `DESIGN-LIE-PROPOSE-AI`, `DESIGN-LIE-CHECK` (la structure Hn est l'une des deux conditions d'émission du check).

---

### DESIGN-LIE-SECTIONS-FOLDABLE

**Réf PRD :** [FR-LIE-SECTIONS-FOLDABLE](./prd.md#fr-lie-sections-foldable)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — parent.
- Sous-composants : `LieutenantSerpAnalysis`, `LieutenantH2Structure`, `LieutenantsAiPanel`, `LieutenantProposals`.
- `CollapsableSection` (atomique global) avec lazy-load.

**Flux DB** : aucun — pure UI.

**Stores Pinia** : `useArticleKeywordsStore` (consommateur).

**Décisions d'architecture**
- Lazy-load des sections dépliées : évite de monter des arbres lourds (PAA niveau 2) tant que l'utilisateur ne les ouvre pas.

**Voir aussi** : `DESIGN-UI-MOTEUR-SHARED` (CollapsableSection).

---

### DESIGN-LIE-CANDIDATES-BADGES

**Réf PRD :** [FR-LIE-CANDIDATES-BADGES](./prd.md#fr-lie-candidates-badges)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — rendu badges.

**Flux DB** : aucun — affichage à partir des propositions IA (source + pertinence vient du backend).

**Décisions d'architecture**
- 3 sources possibles : SERP (concurrents), PAA (questions), Groupe (cocon Cerveau).
- 3 niveaux de force : Fort / Moyen / Faible.
- Cumul des badges si un candidat vient de plusieurs sources.

---

### DESIGN-LIE-CHECKBOX-COUNT

**Réf PRD :** [FR-LIE-CHECKBOX-COUNT](./prd.md#fr-lie-checkbox-count)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — checkboxes + compteur.

**Endpoints** : `POST /api/articles/:id/keywords` (sauvegarde sélection Lieutenants).

**Tables consommées** : `article_keywords.lieutenants` (TEXT[]).

**Flux DB**

*Écriture* : cochage/décochage → debounce 300 ms → POST sauvegarde. Mise à jour de `lieutenant_explorations.status` (`locked` ↔ `suggested`).

**Stores Pinia** : `useArticleKeywordsStore` (méthodes `lockLieutenant`, `unlockLieutenant`).

**Décisions d'architecture**
- Lock individuel immédiat (FR-LIE-CHECKBOX-LOCK-IMMEDIATE dans §8.6) — pas de bouton « Verrouiller la sélection » en bloc.
- Fourchettes recommandées par niveau (Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3).

**Voir aussi** : `DESIGN-LIE-CHECK`.

---

### DESIGN-LIE-SLIDER-INTELLIGENT

**Réf PRD :** [FR-LIE-SLIDER-INTELLIGENT](./prd.md#fr-lie-slider-intelligent)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — gestion curseur.

**Flux DB**

*Lecture / écriture conditionnelle* : sous la valeur par défaut → filtre local des résultats déjà scrapés ; au-dessus → scraping complémentaire (cf. `DESIGN-LIE-SERP-ANALYZE`).

**Décisions d'architecture**
- Économie API : un ajustement à la baisse ne déclenche jamais d'appel externe.

---

### DESIGN-LIE-CHECK

**Réf PRD :** [FR-LIE-CHECK](./prd.md#fr-lie-check)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — computed `lieutenantsCheckActive` + watcher d'émission.
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — constante `MOTEUR_LIEUTENANTS_LOCKED`.

**Flux DB** : POST `/api/articles/:id/progress/check` ou `/uncheck` selon transition de la computed.

**Stores Pinia** : `useArticleProgressStore`.

**Watchers & réactivité**
- Watcher sur `lieutenantsCheckActive` (computed = ≥ 1 Lieutenant `locked` ET `hn_structure` non-vide).
- Réconciliation défensive au mount : si DB contient le check mais qu'une des deux conditions n'est plus vraie, retrait automatique (cf. `DESIGN-MOT-CHECK-RECONCILIATION`).

**Décisions d'architecture**
- Règle de gating duale — éviter qu'un check Lieutenants soit posé alors que la Rédaction n'a pas la structure Hn dont elle a besoin.

**Voir aussi** : `DESIGN-MOT-WORKFLOW-GATING-DUAL`, `DESIGN-MOT-CHECK-RECONCILIATION`.

---

### DESIGN-LIE-AI-FRONTIER

**Réf PRD :** [FR-LIE-AI-FRONTIER](./prd.md#fr-lie-ai-frontier)

**Refs code**
- [src/components/moteur/LieutenantsSelection.vue](../../src/components/moteur/LieutenantsSelection.vue) — disposition stricte des containers (lignes ~735-890 selon la version actuelle).
- [tests/unit/components/lieutenants-selection-architecture.test.ts](../../tests/unit/components/lieutenants-selection-architecture.test.ts) — test architectural permanent.

**Flux DB** : aucun — invariant UX/architectural.

**Décisions d'architecture**
- Séparation visuelle stricte entre **données utilisateur** (cards verrouillés/éliminés, structure Hn validée) et **coque IA** (suggestions non actées).
- Test architectural permanent qui échoue si un refactor absorbe les containers utilisateur dans la coque IA.

**Historique** : régression Sprint C-1 (commit `890b285`, 2026-05-02) avait fusionné les zones — restauration sprint 1 (2026-05-04), formalisée par cette FR.

**Voir aussi** : `DESIGN-UI-AI-PANELS-PATTERN`.

---

### DESIGN-LIE-SCRAPE-DEDIE

**Réf PRD :** [FR-LIE-SCRAPE-DEDIE](./prd.md#fr-lie-scrape-dedie)

**Refs code**
- [server/services/external/lieutenants-analysis.service.ts](../../server/services/external/lieutenants-analysis.service.ts) — service dédié.
- [server/services/external/scrape-corpus.service.ts](../../server/services/external/scrape-corpus.service.ts) — service de scrape neutre (cf. `DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE`).

**Tables consommées** : `keyword_serp_results`, `keyword_serp_scrapes`.

**Flux DB**

*Lecture* : lit `keyword_serp_results` pour les URLs cibles.

*Écriture conditionnelle* : si le scrape manque, déclenche le fetch SERP + scrape, persiste dans `keyword_serp_scrapes`.

**Décisions d'architecture**
- Aucun import croisé avec le service Lexique (test architectural permanent).
- Lit uniquement `headings[]` des scrapes — pas `text_content` (réservé Lexique).
- Cache mémoire 1 h partagé avec Lexique (clé `keyword:lang:country`).

**Voir aussi** : `DESIGN-LEX-SCRAPE-DEDIE`, `DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE`, `DESIGN-MOT-LEXIQUE-DECOUPLAGE`.

---

### DESIGN-LIE-CHECKBOX-LOCK-IMMEDIATE

**Réf PRD :** [FR-LIE-CHECKBOX-LOCK-IMMEDIATE](./prd.md#fr-lie-checkbox-lock-immediate--cocher-un-lieutenant-le-verrouille-immédiatement-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [src/components/moteur/LieutenantsPanel.vue](../../src/components/moteur/LieutenantsPanel.vue) — checkboxes individuelles, pas de bouton batch.
- Store : `articleKeywordsStore.lockLieutenant(payload)` / `unlockLieutenant(keyword)`.

**Tables consommées** : `lieutenant_explorations.status` (`'locked'` ↔ `'suggested'`).

**Flux DB** : cochage/décochage → POST/DELETE immédiat → mise à jour `status`. Watcher `lieutenantsCheckActive` émet/retire le check workflow (cf. `DESIGN-MOT-WORKFLOW-GATING-DUAL`).

**Décisions d'architecture (mise à jour 2026-05-08)**
- Suppression du concept « panel locked » qui désactivait toutes les checkboxes — cul-de-sac UX.
- Suppression du timestamp `lockedAt` (colonne DB droppée migration 019, type `RichLieutenant.lockedAt` retiré). Source unique = `status`.
- Badge « Lieutenants verrouillés » et badge « Validée avec les lieutenants » supprimés.

**Voir aussi** : `DESIGN-MOT-WORKFLOW-GATING-DUAL`, `DESIGN-LEX-CHECKBOX-LOCK-IMMEDIATE` (jumeau côté Lexique).

---

## §8.8 — Moteur — Lexique (DESIGN-LEX)

### DESIGN-LEX-TFIDF

**Réf PRD :** [FR-LEX-TFIDF](./prd.md#fr-lex-tfidf)

**Refs code**
- [server/routes/serp-analysis.routes.ts](../../server/routes/serp-analysis.routes.ts) — endpoint `POST /api/serp/tfidf`.
- [server/services/keyword/tfidf.service.ts](../../server/services/keyword/tfidf.service.ts) — calcul DF par terme + niveaux.

**Tables consommées** : `keyword_serp_scrapes` (colonne `text_content`).

**Flux DB**

*Lecture* : lit `text_content` des scrapes des top 10 du keyword cible. Si scrape manquant → 404 ou pipeline de fetch selon `triggerScrapeIfMissing` (cf. `DESIGN-LEX-SCRAPE-DEDIE`).

*Écriture* : aucune côté backend (sauf via le wrapper `DESIGN-LEX-MULTI-KEYWORD` qui persiste les explorations).

**Décisions d'architecture**
- Tokenisation min 3 chars + strip stopwords français.
- Seuils DF figés : ≥ 70 % = Obligatoire, 30-70 % = Différenciateur, < 30 % = Optionnel.
- Plafond 50 termes par niveau.

**Voir aussi** : `DESIGN-LEX-SCRAPE-DEDIE`, `DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE`.

---

### DESIGN-LEX-SORT

**Réf PRD :** [FR-LEX-SORT](./prd.md#fr-lex-sort)

**Refs code**
- [src/components/shared/SortToggleBar.vue](../../src/components/shared/SortToggleBar.vue) — barre de tri.
- Fonction `jaccardWithPainPoint(term, painPoint)` côté front (intersection / union).

**Flux DB** : aucun — tri local côté front.

**Stores Pinia** : pas de store dédié — état tri local au composant.

**Décisions d'architecture**
- 3 modes : A-Z, Densité (par défaut), Pertinence douleur (conditionnel painPoint exists).
- Persistance session navigateur (pas de DB).

---

### DESIGN-LEX-SELECT

**Réf PRD :** [FR-LEX-SELECT](./prd.md#fr-lex-select)

**Refs code**
- [src/composables/lexique/useLexiqueLocking.ts](../../src/composables/lexique/useLexiqueLocking.ts) — famille « verrouillage » (cf. `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`).
- [src/stores/article/article-keywords.store.ts](../../src/stores/article/article-keywords.store.ts) — méthodes `addLexiqueTerm` / `removeLexiqueTerm`.

**Endpoints** : `PUT /api/articles/:id/keywords` (sauvegarde `lexique` JSONB).

**Tables consommées** : `article_keywords.lexique` (JSONB array de strings).

**Flux DB**

*Écriture* : cochage/décochage → `useLexiqueLocking.toggleTerm` → `articleKeywordsStore.add/removeLexiqueTerm` → `saveDecisions(id)` → 1 PUT par toggle.

**Stores Pinia** : `useArticleKeywordsStore`.

**Décisions d'architecture**
- Pré-cochage des Obligatoires au premier rendu (heuristique).
- Persistance immédiate par toggle (pas de bouton Enregistrer).

**Voir aussi** : `DESIGN-LEX-CHECK`, `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`.

---

### DESIGN-LEX-AI-PANEL

**Réf PRD :** [FR-LEX-AI-PANEL](./prd.md#fr-lex-ai-panel)

**Refs code**
- [server/routes/keyword-ai-panel.routes.ts](../../server/routes/keyword-ai-panel.routes.ts) — endpoint SSE.
- [server/prompts/lexique-ai-panel.md](../../server/prompts/lexique-ai-panel.md), [lexique-analysis-upfront.md](../../server/prompts/lexique-analysis-upfront.md).
- [src/components/moteur/LexiqueAiPanel.vue](../../src/components/moteur/LexiqueAiPanel.vue) — composant front.

**Flux DB** : aucun direct — l'analyse n'est pas persistée (réversible à la demande).

**Stores Pinia** : pas de store dédié.

**Décisions d'architecture**
- Prompt enrichi avec termes 3 niveaux + painPoint + strategy_context.
- Streaming SSE pour voir l'analyse au fil de l'eau.

**Voir aussi** : `DESIGN-UI-AI-PANELS-PATTERN`.

---

### DESIGN-LEX-MULTI-KEYWORD

**Réf PRD :** [FR-LEX-MULTI-KEYWORD](./prd.md#fr-lex-multi-keyword)

**Refs code**
- [server/services/keyword/lexique-exploration.service.ts](../../server/services/keyword/lexique-exploration.service.ts) — orchestration fetch SERP + TF-IDF + IA + persist.

**Endpoints** : `POST /api/articles/:id/lexique/extract` (à vérifier nom exact).

**Tables consommées** : `lexique_explorations(article_id, source_keyword, tfidf_terms JSONB, ai_recommendations JSONB, ai_missing_terms JSONB, ai_summary TEXT, explored_at)`.

**Flux DB**

*Écriture* : INSERT/UPSERT dans `lexique_explorations` après chaque exploration.

**Stores Pinia** : géré par `useLexiqueExplorations` composable (familie LECTURE — cf. `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`).

**Décisions d'architecture**
- Stockage indexé par `(article_id, source_keyword)` — un mot-clé exploré par article.

**Voir aussi** : `DESIGN-LEX-MULTI-KEYWORD-TABS`, `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`.

---

### DESIGN-LEX-CHECK

**Réf PRD :** [FR-LEX-CHECK](./prd.md#fr-lex-check)

**Refs code**
- [src/components/moteur/LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — watcher `isLocked` qui émet `MOTEUR_LEXIQUE_VALIDATED`.
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — constante.

**Flux DB** : POST `/progress/check` ou `/uncheck` selon transition de `isLocked = lexique.length > 0`.

**Stores Pinia** : `useArticleProgressStore`.

**Watchers & réactivité**
- Watcher sur `isLocked` (computed sur `lexique.length`).
- Réconciliation défensive au mount via `DESIGN-MOT-CHECK-RECONCILIATION`.

**Décisions d'architecture**
- Pas de seuil minimal — un seul terme coché suffit à valider l'étape.

**Voir aussi** : `DESIGN-MOT-CHECKS`, `DESIGN-MOT-CHECK-RECONCILIATION`.

---

### DESIGN-LEX-SCRAPE-DEDIE

**Réf PRD :** [FR-LEX-SCRAPE-DEDIE](./prd.md#fr-lex-scrape-dedie)

**Refs code**
- [server/services/external/lexique-analysis.service.ts](../../server/services/external/lexique-analysis.service.ts) — service dédié, signature pure `(keyword, opts?) => Promise<...>`.
- [server/services/external/scrape-corpus.service.ts](../../server/services/external/scrape-corpus.service.ts) — service neutre partagé avec Lieutenants.

**Tables consommées** : `keyword_serp_results`, `keyword_serp_scrapes`, `lexique_explorations`.

**Flux DB**

*Lecture* : lit `keyword_serp_scrapes.text_content` pour les URLs du keyword cible.

*Écriture conditionnelle* : si scrape manquant ET `triggerScrapeIfMissing: true` → fetch + scrape + persist. Sinon throw `LexiqueScrapeMissingError`.

**Décisions d'architecture**
- Aucun import croisé avec service Lieutenants (test architectural permanent).
- Lit uniquement `text_content` — pas `headings[]` (réservé Lieutenants).
- Cache mémoire 1 h partagé avec Lieutenants (clé `keyword:lang:country`).
- Signature pure invocable hors HTTP (testable unitairement).

**Voir aussi** : `DESIGN-LIE-SCRAPE-DEDIE`, `DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE`, `DESIGN-MOT-LEXIQUE-DECOUPLAGE`.

---

### DESIGN-LEX-PRECHECK-SERP

**Réf PRD :** [FR-LEX-PRECHECK-SERP](./prd.md#fr-lex-precheck-serp)

**Refs code**
- [server/services/keyword/keyword-serp.service.ts](../../server/services/keyword/keyword-serp.service.ts) — fonction `hasSerpScrape(keyword, lang, country)`.
- [src/composables/lexique/useSerpExistsCheck.ts](../../src/composables/lexique/useSerpExistsCheck.ts) — composable côté front.
- [src/components/shared/ConfirmModal.vue](../../src/components/shared/ConfirmModal.vue) — modale de confirmation coût.

**Endpoints** : `GET /api/keywords/:keyword/serp/exists` → `{ exists: boolean, scrapedAt: timestamp | null }`.

**Tables consommées** : `keyword_serp_scrapes` (SQL `MAX(scraped_at)` sub-ms).

**Flux DB**

*Lecture* : `SELECT MAX(scraped_at) FROM keyword_serp_scrapes WHERE keyword = $1`.

**Stores Pinia** : pas de store — état local composable.

**Watchers & réactivité**
- Watch immediate sur `keyword` → refetch automatique au switch d'article.

**Décisions d'architecture**
- Endpoint léger (pas de payload JSONB lourd) — pour pouvoir l'appeler au mount sans surcoût.
- Évite les 404 dans la console — l'absence devient un état attendu.

**Voir aussi** : `DESIGN-LEX-SCRAPE-DEDIE`.

---

### DESIGN-LEX-MULTI-KEYWORD-TABS

**Réf PRD :** [FR-LEX-MULTI-KEYWORD-TABS](./prd.md#fr-lex-multi-keyword-tabs)

**Refs code**
- [src/components/moteur/LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — orchestration des onglets via `<TabBar>`.
- [src/components/shared/TabBar.vue](../../src/components/shared/TabBar.vue) — composant pur réutilisable (ARIA `role="tablist"`).
- [src/components/moteur/LexiqueCustomKeywordInput.vue](../../src/components/moteur/LexiqueCustomKeywordInput.vue) — saisie libre.

**Tables consommées** : `lexique_explorations` (1 ligne par `(article_id, source_keyword)`).

**Flux DB**

*Lecture* : hydratation au mount via `GET /api/articles/:id/explorations`.

**Stores Pinia** : composable `useLexiqueExplorations` (cache local de la DB).

**Watchers & réactivité**
- Switch d'onglet = pur côté front (lit le cache, 0 fetch).
- Après extraction d'un nouveau mot-clé → `mergeFromDb` ajoute l'onglet + sélection automatique.

**Décisions d'architecture**
- Label = `source_keyword` brut (pas de transformation) — cohérence affichage/calcul CLAUDE.md §2.0.
- `<TabBar>` est un composant pur sans logique métier (réutilisable).

**Voir aussi** : `DESIGN-LEX-MULTI-KEYWORD`, `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`.

---

### DESIGN-LEX-LECTURE-VS-VERROUILLAGE

**Réf PRD :** [FR-LEX-LECTURE-VS-VERROUILLAGE](./prd.md#fr-lex-lecture-vs-verrouillage)

**Refs code**
- [src/composables/lexique/useLexiqueExplorations.ts](../../src/composables/lexique/useLexiqueExplorations.ts) — famille LECTURE (hydrate, merge, select).
- [src/composables/lexique/useLexiqueLocking.ts](../../src/composables/lexique/useLexiqueLocking.ts) — famille VERROUILLAGE (toggle term, save).
- [src/components/moteur/LexiquePanel.vue](../../src/components/moteur/LexiquePanel.vue) — orchestration + watcher gating workflow isolé.

**Endpoints**
- LECTURE : `GET /api/articles/:id/explorations`.
- VERROUILLAGE : `PUT /api/articles/:id/keywords`.

**Tables consommées**
- LECTURE : `lexique_explorations`.
- VERROUILLAGE : `article_keywords.lexique`.

**Flux DB** : les deux familles utilisent des endpoints disjoints, des tables disjointes, et n'ont aucun import croisé.

**Stores Pinia**
- LECTURE : refs propres au composable (pas de store global).
- VERROUILLAGE : proxy lecture sur `useArticleKeywordsStore.keywords.lexique`.

**Watchers & réactivité**
- Watcher `isLocked` (computed sur `lexique.length`) émet `MOTEUR_LEXIQUE_VALIDATED` — **présent dans `LexiquePanel.vue`, absent des deux composables** (orchestration MoteurView ↔ LexiquePanel).

**Décisions d'architecture**
- Tests architecturaux permanents (4 verts) : grep code vérifie l'absence d'import croisé entre familles.
- Métrique refacto : `LexiquePanel.vue <script>` 497 → 299 lignes (-40 %).

**Voir aussi** : `DESIGN-LEX-CHECK`, `DESIGN-LEX-MULTI-KEYWORD-TABS`.

---

### DESIGN-LEX-CHECKBOX-LOCK-IMMEDIATE

**Réf PRD :** [FR-LEX-CHECKBOX-LOCK-IMMEDIATE](./prd.md#fr-lex-checkbox-lock-immediate--cocher-un-terme-du-lexique-lajoute-immédiatement-à-la-sélection-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [src/composables/lexique/useLexiqueLocking.ts](../../src/composables/lexique/useLexiqueLocking.ts) — `toggleTerm(term)` → `addLexiqueTerm` / `removeLexiqueTerm`.
- Watcher `isLocked` (computed sur `lexique.length`) émet `MOTEUR_LEXIQUE_VALIDATED` (cf. `DESIGN-LEX-CHECK`).

**Tables consommées** : `article_keywords.lexique` (JSONB array).

**Flux DB** : cochage/décochage → PUT `/articles/:id/keywords` immédiat. 1 PUT par toggle (cf. `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`).

**Décisions d'architecture**
- Pas de bouton « Verrouiller le Lexique » global — chaque case fonctionne unitairement.
- Le check workflow `MOTEUR_LEXIQUE_VALIDATED` est dérivé automatiquement (watcher sur length).

**Voir aussi** : `DESIGN-LEX-CHECK`, `DESIGN-LEX-LECTURE-VS-VERROUILLAGE`, `DESIGN-LIE-CHECKBOX-LOCK-IMMEDIATE`.

---

## §8.9 — Moteur — Finalisation (DESIGN-FIN)

### DESIGN-FIN-RECAP

**Réf PRD :** [FR-FIN-RECAP](./prd.md#fr-fin-recap)

**Refs code**
- [src/components/moteur/FinalisationPanel.vue](../../src/components/moteur/FinalisationPanel.vue) — composant de l'onglet Finalisation, 3 sections repliables (Capitaine / Lieutenants / Lexique), 100 % lecture seule. *(Nommage historique `FinalisationRecap.vue` retiré — cf. §7 « Évolutions de nommage » du PRD.)*
- [src/components/shared/CollapsableSection.vue](../../src/components/shared/CollapsableSection.vue) — primitive UI repliable utilisée pour les 3 blocs.
- [src/stores/article/article-keywords.store.ts](../../src/stores/article/article-keywords.store.ts) — seule source de données lue par le panneau (champs `richCaptain`, `richLieutenants`, `lexique`).

**Endpoints** : aucun appel direct. Le composant consomme exclusivement ce que `useArticleKeywordsStore` a déjà hydraté pendant la session Moteur (Capitaine + Lieutenants + Lexique).

**Tables consommées** : `article_keywords` (lecture indirecte via le store). Pas d'écriture.

**Flux DB**

*Lecture* : aucune lecture initiée par cet onglet. Au moment où l'utilisateur bascule sur `Finalisation`, le store `useArticleKeywordsStore` est déjà peuplé par les onglets précédents (Capitaine pose `richCaptain`, Lieutenants pose `richLieutenants` avec statut `locked`, Lexique pose `lexique`). Le composant lit ces refs réactivement via 3 `computed`.

*Écriture* : aucune. Le composant n'expose ni input ni mutation — pour modifier une valeur, l'utilisateur revient sur l'onglet source (Capitaine / Lieutenants / Lexique).

**Stores Pinia**
- `useArticleKeywordsStore` — unique store consommé, fournit `keywords.richCaptain`, `keywords.richLieutenants` (filtrés sur `status === 'locked'`), `keywords.lexique`. Cf. son header `AUTHORITY:`.

**Watchers & réactivité**
- 3 `computed` (`captain`, `lieutenants`, `lexique`) recalculés à chaque mutation du store. Si l'utilisateur revient sur l'onglet Capitaine, change le keyword verrouillé puis re-bascule sur Finalisation, le récap reflète instantanément le nouveau Capitaine — pas de cache local côté composant.
- Fallback historique sur `lieutenants` : si `richLieutenants` est vide mais que la liste flat `keywords.lieutenants` existe (forme legacy avant l'introduction du statut `locked`), le composant retombe sur la liste flat avec `hnLevel: 2` par défaut. À documenter comme dette tant que `richLieutenants` n'est pas systématiquement peuplé.

**Décisions d'architecture**
- **Pas de check `moteur:finalisation_*`** : cohérent avec `DESIGN-FIN-CHECK`. Le panneau est un miroir des trois verrous Phase ②, pas un producteur de progression.
- **Pas de fetch propre** : héberger des appels dédiés dans `FinalisationPanel` créerait un risque de divergence si les onglets précédents mutaient le store sans réhydrater la DB — préférer la lecture du store comme SSOT de session.

**Voir aussi**
- `DESIGN-CAP-LOCK`, `DESIGN-LIE-LOCK`, `DESIGN-LEX-VALIDATE` — producteurs des trois verrous lus ici.
- `DESIGN-FIN-LINK-REDACTION` — bouton de transition aval.
- `DESIGN-FIN-CHECK` — explicitation du choix « pas de check Finalisation ».

---

### DESIGN-FIN-LINK-REDACTION

**Réf PRD :** [FR-FIN-LINK-REDACTION](./prd.md#fr-fin-link-redaction)

**Refs code**
- [src/components/moteur/FinalisationPanel.vue](../../src/components/moteur/FinalisationPanel.vue) — bouton « Aller à la Rédaction » dans l'onglet, émet l'event `navigate-redaction`.
- [src/views/MoteurView.vue](../../src/views/MoteurView.vue) — handler `navigateToRedaction` (push vers `/cocoon/:cocoonId/redaction?articleId=...`) + bouton global « Continuer vers la Rédaction » en pied de page, désactivé via `:disabled="!finalisationUnlocked"` avec tooltip `finalisationButtonTitle`.
- [src/composables/moteur/useFinalisationGating.ts](../../src/composables/moteur/useFinalisationGating.ts) — logique pure : `isFinalisationUnlocked(checks)` et `finalisationButtonTitle(checks)`, testable sans monter Vue.
- [src/composables/moteur/useMoteurSoftGating.ts](../../src/composables/moteur/useMoteurSoftGating.ts) — composable qui dérive `finalisationUnlocked` + `finalisationButtonTitle` à partir des 3 checks `MOTEUR_CAPITAINE_LOCKED` / `MOTEUR_LIEUTENANTS_LOCKED` / `MOTEUR_LEXIQUE_VALIDATED`.

**Routes Vue Router**
- Cible du bouton actif : `/cocoon/:cocoonId/redaction?articleId=<id>` (avec `articleId` issu de `selectedArticle.id`).
- Fallback : `/cocoon/:cocoonId/redaction` sans article si aucun article sélectionné (cas marginal — l'onglet n'est ouvert qu'à partir d'un article courant).

**Flux DB**

*Lecture* : aucun fetch déclenché par la transition. La navigation côté Vue Router ne modifie pas l'état, la Rédaction monte ses propres stores au mount.

*Écriture* : aucune. La transition est un simple `router.push` — pas de mutation côté DB.

**Stores Pinia**
- `useArticleProgressStore` (indirect via `useMoteurSoftGating`) — source des trois booléens de gating.
- `useKeywordsStore` (indirect) — utilisé par `useMoteurSoftGating` pour `isDiscoveryAllowed` (hors scope de cette FR, mais le composable est partagé).

**Watchers & réactivité**
- `finalisationUnlocked` est un `computed` de `useMoteurSoftGating` chaîné sur les checks du store — toute mutation `addCheck(MOTEUR_LEXIQUE_VALIDATED)` côté onglet Lexique déclenche immédiatement la bascule du bouton de pied de page (et du bouton interne au panel) de désactivé à actif, sans reload.
- Le tooltip `finalisationButtonTitle` est recalculé en miroir : « Continuer vers la Rédaction » si déverrouillé, sinon « Étapes restantes : <liste> ».

**Décisions d'architecture**
- **Double bouton, règle unique** : deux entry points UI (bouton dans le panel + bouton en pied de page de MoteurView), mais une seule règle de déverrouillage (`isFinalisationUnlocked` pur). C'est l'invariant qui empêche un état contradictoire — par construction les deux boutons ne peuvent pas diverger.
- **Pas de transaction « check finalisation »** côté backend : la transition est purement navigation, l'état d'avancement reste porté par `articles.completed_checks` qui est déjà à jour grâce aux 3 checks Phase ②.

**Voir aussi**
- `DESIGN-MOT-SOFT-GATING` — règles de gating souple Phase ②/③ globales du Moteur.
- `DESIGN-RED-*` — destination de la transition (vue Rédaction).
- `DESIGN-FIN-CHECK` — explication du fait qu'aucun check n'est posé au moment de la transition.

---

### DESIGN-FIN-CHECK

**Réf PRD :** [FR-FIN-CHECK](./prd.md#fr-fin-check)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — catalogue exhaustif : `MOTEUR_CHECKS` contient **5 constantes** (`MOTEUR_DISCOVERY_DONE`, `MOTEUR_RADAR_DONE`, `MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED`). Aucune `MOTEUR_FINALISATION_*`.
- [src/components/moteur/FinalisationPanel.vue](../../src/components/moteur/FinalisationPanel.vue) — aucun `emit('check-completed', ...)` dans le composant (vérifiable par `grep "check-completed" src/components/moteur/FinalisationPanel.vue` → 0 match).
- [src/composables/moteur/useFinalisationGating.ts](../../src/composables/moteur/useFinalisationGating.ts) — confirme la formule : `isFinalisationUnlocked = capitaineLocked && lieutenantsLocked && lexiqueValidated`. Pas de 4ᵉ booléen.

**Tables consommées** : `articles.completed_checks` TEXT[] (lecture seule depuis le Moteur — cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`).

**Flux DB**

*Lecture* : `articles.completed_checks` est lu une fois au mount de la vue Moteur via `useArticleProgressStore`. Les valeurs des 3 booléens `isCaptaineLocked` / `isLieutenantsLocked` / `isLexiqueValidated` sont des `computed` indexés sur ce tableau (présence/absence d'une constante).

*Écriture* : **aucune** depuis l'onglet Finalisation. Les seules écritures dans `completed_checks` pertinentes pour la transition vers Rédaction viennent des onglets Capitaine / Lieutenants / Lexique (via `POST /api/progress/check` côté backend, cf. `DESIGN-MOT-CHECKS`).

**Stores Pinia**
- `useArticleProgressStore` — lecture seule depuis l'onglet Finalisation. Le composant Finalisation n'appelle ni `addCheck` ni `removeCheck`.

**Watchers & réactivité**
- Aucun watcher propre à la Finalisation : la chaîne de réactivité est entièrement déléguée à `useMoteurSoftGating` (cf. `DESIGN-FIN-LINK-REDACTION`).

**Décisions d'architecture**
- **Le Moteur reste à 5 checks, pas 6.** Choix produit délibéré : la Finalisation est une vue d'**inspection**, pas une étape de production. Ajouter un `MOTEUR_FINALISATION_COMPLETED` créerait un check fantôme posé automatiquement dès que les trois autres sont posés, donc redondant et source potentielle de divergence (cas où un seul des deux serait persisté).
- **Conséquence sur le dashboard** : les dots de progression d'un article affichent au maximum 5 dots « Moteur » remplis (cf. `DESIGN-DASH-PROGRESS`). Tout consommateur ajoutant un 6ᵉ dot « Finalisation » introduirait une incohérence cross-vues.
- **Conséquence sur le PRD initial** : la mention historique d'un éventuel `moteur:finalisation_completed` (suspens dans le PRD pré-migration) est tranchée : ce check **n'existe pas**, ne doit pas être ajouté sans FR dédiée.

**Voir aussi**
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` — catalogue des 5 checks Moteur et règles d'écriture.
- `DESIGN-MOT-CHECKS` — émetteurs des 5 checks (composants Capitaine / Lieutenants / Lexique / Discovery / Radar).
- `DESIGN-FIN-LINK-REDACTION` — comment l'état « prêt rédaction » est dérivé sans 6ᵉ check.
- `DESIGN-DASH-PROGRESS` — affichage des dots, basé sur les 5 checks.

---

## §8.10 — Rédaction (DESIGN-RED)

### DESIGN-RED-BRIEF

**Réf PRD :** [FR-RED-BRIEF](./prd.md#fr-red-brief)

**Refs code**
- [server/routes/generate/brief-explain.routes.ts](../../server/routes/generate/brief-explain.routes.ts) — endpoint `POST /api/generate/brief-explain`, streaming SSE (`event: chunk` / `event: done`). Payload entrant : `{ articleId, articleTitle, keyword, cocoonName, articleType, keywords[], lexique[], hnStructure[], paaQuestions[], topCompetitors[], cocoonArticles[] }`.
- [server/prompts/brief-ia-panel.md](../../server/prompts/brief-ia-panel.md) — prompt système chargé via `loadPrompt('brief-ia-panel', {...})` qui injecte tout le payload (variables `articleTitle`, `keyword`, `cocoonName`, `paaBlock`, `competitorsBlock`, `cocoonArticlesBlock`, `microContextBlock`).
- [src/components/article/ArticleWorkflowIaBrief.vue](../../src/components/article/ArticleWorkflowIaBrief.vue) — consommateur unique (workflow guidé uniquement) ; reçoit `parsedBriefMarkdown` parsé via `marked.js` depuis le parent.
- [src/views/ArticleWorkflowView.vue](../../src/views/ArticleWorkflowView.vue) — orchestrateur : pose le `useStreaming<{ content: string }>` qui appelle `/api/generate/brief-explain`, accumule le markdown, parse incrémental avec `marked`, expose `parsedBriefMarkdown` + `iaBriefStreaming` au sous-composant.

**Endpoints**
- `POST /api/generate/brief-explain` — SSE.

**Tables consommées**
- `article_micro_contexts` — lecture serveur via `loadArticleMicroContext(articleId)` (angle, ton, directives) pour enrichir le prompt.
- Toutes les autres données du payload viennent du client (mot-clé Capitaine, Lieutenants, Lexique, sommaire Hn, PAA, top concurrents, articles cocon) — pas d'appel DB serveur supplémentaire.

**Flux DB**

*Lecture* : 1 appel serveur lit `article_micro_contexts` au début de la requête pour récupérer l'angle/ton/consignes. Le client a déjà hydraté `useArticleKeywordsStore` + `useCocoonsStore` + `useBriefStore` côté front pour construire le payload SSE — pas de fetch DB additionnel pendant le stream.

*Écriture* : aucune. L'analyse n'est pas persistée — elle vit en mémoire dans le composant côté client. Si l'utilisateur recharge la page, l'analyse précédente est perdue (cf. décision d'architecture).

**Stores Pinia**
- `useBriefStore` (`src/stores/strategy/brief.store.ts`) — fournit `briefData` (articleTitle, keyword, keywords, dataForSeo.paa, etc.) lu pour construire le payload.
- `useArticleKeywordsStore` — fournit `keywords.capitaine`, `keywords.lieutenants`, `keywords.lexique`, `keywords.hn_structure` injectés dans le payload.
- `useCocoonsStore` — fournit le nom du cocon courant (pour le payload + génération du slug).

**Watchers & réactivité**
- L'analyse n'est pas auto-déclenchée par watcher : `iaBriefStreaming` reste à `false` jusqu'à clic explicite sur « Lancer l'analyse » / « Relancer l'analyse ».
- Pendant le stream, chaque chunk SSE est concaténé puis re-parsé via `marked.parse(...)` côté `ArticleWorkflowView` — `parsedBriefMarkdown` est un `ref` qui repousse à chaque chunk, le sous-composant le rend en `v-safe-html`.

**Décisions d'architecture**
- **Pas de persistance DB de l'analyse** : décision produit assumée — l'analyse est un outil de réflexion pré-écriture, pas une livraison ; régénérer coûte ~2-5k tokens et reste rapide. Persister introduirait une colonne `articles.brief_analysis_md` rarement consultée et un risque de désynchronisation avec un brief modifié.
- **Bypass `apiStream` du wrapper unifié** : ce composant utilise directement `useStreaming<T>()` (cf. `DESIGN-INFRA-API-STREAM`) pour conserver une chaîne markdown pure ; les autres consommateurs ont migré.

**Voir aussi**
- `DESIGN-RED-IA-BRIEF` — panneau qui héberge l'affichage.
- `DESIGN-UI-AI-PANELS-PATTERN` — pattern générique des panels IA (CTA + streaming + skeleton).
- `DESIGN-CER-MICRO-CONTEXT` — source de l'angle/ton lu côté serveur.

---

### DESIGN-RED-OUTLINE

**Réf PRD :** [FR-RED-OUTLINE](./prd.md#fr-red-outline)

**Refs code**
- [server/routes/generate/outline.routes.ts](../../server/routes/generate/outline.routes.ts) — endpoint `POST /api/generate/outline`, streaming SSE. Output `{ outline: { sections: [{ id, level, title, annotation, status }] }, usage }`.
- [server/prompts/generate-outline.md](../../server/prompts/generate-outline.md) — prompt système, variables `{{articleTitle}}`, `{{articleType}}`, `{{keyword}}`, `{{secondaryKeywords}}` (lieutenants), `{{cocoonName}}`, `{{theme}}`, `{{paaQuestions}}`, `{{strategyContext}}`, `{{keywordContext}}`, `{{microContext}}`.
- [server/routes/generate/_helpers.ts](../../server/routes/generate/_helpers.ts) — fonction `parseOutlineFromText(fullContent)` qui transforme la sortie JSON brute du LLM en `Outline` typé.
- [src/stores/article/outline.store.ts](../../src/stores/article/outline.store.ts) — store Pinia `useOutlineStore` : actions `generateOutline(briefData)`, `updateSection`, `moveSection`, `addSection`, `removeSection`, `undo`, `redo`, `setValidated`. État `outline`, `isGenerating`, `isValidated`, `undoStack`, `redoStack`.
- [src/components/workflow/BriefStructureStep.vue](../../src/components/workflow/BriefStructureStep.vue) — composant qui déclenche la génération et expose l'édition du sommaire ; émet `check-completed` avec `REDACTION_OUTLINE_VALIDATED` (constante partagée).

**Endpoints**
- `POST /api/generate/outline` — SSE (chunks markdown puis `event: done` avec `outline` parsé).

**Tables consommées**
- `article_strategies` (lecture via `getStrategy(articleId)` serveur) — pour `buildStrategyContext`.
- `article_keywords` (lecture via `getArticleKeywords(articleId)` serveur) — pour `buildKeywordContext`.
- `article_micro_contexts` (lecture via `loadArticleMicroContext`) — pour le bloc `microContext`.
- **Écriture** : `article_content.outline` (JSONB) via `apiPut('/articles/:id/outline', ...)` (cf. `outline.store.ts` `saveOutline`).

**Flux DB**

*Lecture* : 1️⃣ utilisateur clique « Générer le sommaire » → 2️⃣ `outlineStore.generateOutline(briefData)` ouvre un stream SSE → 3️⃣ côté serveur, lecture de `article_strategies`, `article_keywords`, `article_micro_contexts` pour bâtir le prompt → 4️⃣ chunks SSE accumulés dans `outlineStore.streamedText` → 5️⃣ à `event: done`, `parseOutlineFromText` produit l'`Outline` typé → 6️⃣ store met `outline.value = parsedOutline`.

*Écriture* : utilisateur valide le sommaire → `outlineStore.saveOutline(articleId)` → `PUT /api/articles/:id/outline` → UPSERT dans `article_content (article_id, outline)` JSONB. Le validate-flag passe en check workflow `REDACTION_OUTLINE_VALIDATED` via `useArticleProgressStore.addCheck`.

**Stores Pinia**
- `useOutlineStore` — héberge l'outline en cours de session, gère undo/redo (stack profondeur 20), persiste vers `article_content.outline` JSONB.
- `useBriefStore` — fournit `briefData` (article + keywords + dataForSeo.paa) lu pour construire le payload de génération.
- `useArticleProgressStore` — destinataire du check `REDACTION_OUTLINE_VALIDATED` à la validation manuelle.

**Watchers & réactivité**
- `streamedText` accumulé chunk par chunk → rendu progressif possible côté UI pendant la génération.
- `canUndo` / `canRedo` sont des `computed` sur la profondeur des stacks ; toute mutation pousse l'état actuel sur la stack `undo` et purge la stack `redo`.
- Sommaire validé : `outline` est marqué dans `article_content.outline` JSONB, persisté ; reload page → `loadExistingOutline(articleId)` hydrate depuis DB.

**Décisions d'architecture**
- **Outline JSONB plutôt que table normalisée** : un outline est une structure arborescente courte (~20 sections max), souvent lu/écrit en bloc. Une table `outline_sections` normalisée coûterait plus en jointures qu'elle ne rapporte en flexibilité.
- **Undo/Redo client-only, profondeur 20** : pas de persistance des stacks (pas d'historique sur reload). C'est une UX d'édition session courte, pas un historique long terme.
- **Niveaux H4+ exclus** : helper `hnToOutline` (utilisé quand on importe une structure HN du Moteur) clampe `level` à `[2, 3]`. Le prompt `generate-outline.md` est aussi instruit de se limiter à H1/H2/H3.

**Voir aussi**
- `DESIGN-RED-ARTICLE` — consommateur direct de l'outline (split en groupes H2 puis stream par section).
- `DESIGN-LIE-HN-STRUCTURE` (à créer §8.7) — passerelle Moteur → Rédaction via `hnToOutline()`.
- `DESIGN-RED-CHECKS` — émetteur de `REDACTION_OUTLINE_VALIDATED`.

---

### DESIGN-RED-ARTICLE

**Réf PRD :** [FR-RED-ARTICLE](./prd.md#fr-red-article)

**Refs code**
- [server/routes/generate/article.routes.ts](../../server/routes/generate/article.routes.ts) — endpoint `POST /api/generate/article`, streaming SSE par section. Split outline → groupes H2 via `splitOutlineIntoGroups(outline)`, boucle sur chaque groupe.
- [server/routes/generate/_helpers.ts](../../server/routes/generate/_helpers.ts) — helpers : `splitOutlineIntoGroups`, `computeSectionBudget` (calcul role/budget/hint/maxTokens), `getPositionDirectives`, `isRateLimitError` + `getRetryAfterSeconds` (429 backoff exponentiel), `mergeConsecutiveElements` (post-traitement HTML).
- [server/prompts/generate-article-section.md](../../server/prompts/generate-article-section.md) — prompt par section. Variables `{{sectionOutline}}`, `{{sectionPosition}}` (intro/middle/conclusion), `{{previousContext}}` (~500 chars de la section précédente), `{{positionDirectives}}`, `{{wordCountBudget}}`, `{{sectionRole}}`, `{{sectionBudgetHint}}`, + variables communes (articleTitle, articleType, keyword, secondaryKeywords, cocoonName, strategyContext, keywordContext, microContext, fullOutline).
- [src/stores/article/editor.store.ts](../../src/stores/article/editor.store.ts) — store `useEditorStore` : `generateArticle(briefData, outline, targetWordCount?)` orchestre le stream, expose `content` (HTML SSOT), `streamedText`, `isGenerating`, `sectionProgress {current, total, title}`, `webSearchEnabled` (toggle session), `lastArticleUsage`.
- [src/composables/article/useArticleGeneration.ts](../../src/composables/article/useArticleGeneration.ts) — composable partagé `WorkflowView` ↔ `EditorView` qui enchaîne `editorStore.generateArticle` → `saveArticle` → `generateMeta` → `saveArticle`.

**Endpoints**
- `POST /api/generate/article` — SSE (events `chunk`, `section-start`, `section-done`, `done`).

**Constantes / paramètres**
- `INTER_SECTION_DELAY_MS` (défaut 15s) — délai inter-sections pour éviter le rate-limiting agressif côté Anthropic.
- `RATE_LIMIT_MAX_RETRIES` / `RATE_LIMIT_DEFAULT_WAIT` — backoff exponentiel sur 429.
- `DEFAULT_TARGET_WORDS_BY_TYPE` / `DEFAULT_TARGET_WORDS_FALLBACK` — fallbacks si pas de target client ni de micro-contexte.

**Tables consommées**
- `article_strategies` (lecture via `getStrategy`) — strategy context.
- `article_keywords` (lecture via `getArticleKeywords`) — keyword context (Capitaine + Lieutenants + Lexique).
- `article_micro_contexts` (lecture via `loadArticleMicroContext`) — angle/ton/directives + `target_word_count`.
- **Écriture** : `article_content.content` (TEXT) via `apiPut('/articles/:id', { content, metaTitle, metaDescription })` à la fin de la chaîne `useArticleGeneration` (en réalité ces colonnes vivent dans `articles` pour title/description et `article_content.content` pour le HTML — cf. schéma `articles.meta_title`, `articles.meta_description` colonnes).

**Flux DB**

*Lecture* : 1️⃣ utilisateur clique « Générer l'article » avec outline + briefData → 2️⃣ `editorStore.generateArticle` envoie SSE → 3️⃣ serveur lit `article_strategies` + `article_keywords` + `article_micro_contexts` + résout `targetWordCount` (client > microCtx > type default > fallback) → 4️⃣ split outline en N groupes H2 → 5️⃣ pour chaque groupe : `computeSectionBudget` → load prompt → stream Claude (web-search optionnel selon `webSearchEnabled`) → chunks SSE remontés au client → `event: section-done` à la fin → délai `INTER_SECTION_DELAY_MS` → groupe suivant → 6️⃣ `event: done` final, content complet dans `editorStore.content`.

*Écriture* : `useArticleGeneration.handleGenerateArticle()` enchaîne : `generateArticle()` → `saveArticle(id)` (= `PUT /articles/:id` avec `{ content, metaTitle, metaDescription }` → `UPDATE articles SET meta_title, meta_description ...` + `UPSERT article_content (article_id, content)` côté backend) → `generateMeta(id, keyword, title, content)` → `saveArticle(id)`. Le content est sauvegardé **avant** la méta pour ne rien perdre si la méta plante.

**Stores Pinia**
- `useEditorStore` — héberge `content` (HTML SSOT), `streamedText` (accumulation live), `sectionProgress` (current/total/title), `webSearchEnabled`. Toutes les sections enchaînées convergent vers `content` à la fin.
- `useOutlineStore` — fournit l'outline en entrée, marqué `status: 'generated'` section par section au fil du stream (cf. handler `onSectionDone` qui colore l'`OutlineRecap`).
- `useBriefStore` — fournit `briefData` injecté côté serveur via les helpers de contexte.
- `useArticleKeywordsStore` — fournit Capitaine + Lieutenants + Lexique (lus côté serveur depuis `article_keywords`).

**Watchers & réactivité**
- `editorStore.streamedText` accumulé sur chaque chunk → composant `ArticleStreamDisplay.vue` rend le HTML partiel pendant la génération.
- `editorStore.sectionProgress` mis à jour à chaque `section-start` SSE → composant `SectionProgressBar.vue` affiche barre + titre courant.
- `outlineStore.outline.sections[i].status` flip de `'suggested'` à `'generated'` à chaque `section-done` → `OutlineRecap` recolore les sections complétées.

**Décisions d'architecture**
- **Section-by-section vs single shot** : un article long (2000-3000 mots) en un seul appel dépasse les budgets de cohérence du LLM et le rend long à débugger. Le découpage par H2 permet un cost-tracking par section, une reprise partielle en cas d'erreur, et un rendu UX progressif.
- **Save intermédiaire avant la méta** : le composable `useArticleGeneration` sauvegarde le content **avant** d'appeler la méta. Si la méta plante (429, network), l'article complet est déjà persisté. Pas de perte de 5 minutes de génération.
- **Inter-section delay configurable** : 15s par défaut, ajustable via env. Sur des comptes Anthropic à quotas serrés, monter à 30s évite les retries 429 systématiques.
- **`targetWordCount` cascade** : `parsed.data.targetWordCount ?? microCtx?.targetWordCount ?? DEFAULT_TARGET_WORDS_BY_TYPE[type] ?? DEFAULT_TARGET_WORDS_FALLBACK`. La cliente envoie sa valeur (vue brief) → fallback micro-contexte → fallback type → fallback dur. Cohérent avec ce qu'affiche `ArticleWordCountBar`.

**Voir aussi**
- `DESIGN-RED-OUTLINE` — producteur de l'outline en entrée.
- `DESIGN-RED-META` — étape suivante chaînée par `useArticleGeneration`.
- `DESIGN-RED-WORD-COUNT-TARGET` — résolution de `targetWordCount`.
- `DESIGN-CER-WORD-COUNT-RECOMMEND` — endpoint qui calcule la cible recommandée.
- `DESIGN-INFRA-API-STREAM` — wrapper SSE consommé via `useStreaming`.

---

### DESIGN-RED-META

**Réf PRD :** [FR-RED-META](./prd.md#fr-red-meta)

**Refs code**
- [server/routes/generate/meta.routes.ts](../../server/routes/generate/meta.routes.ts) — endpoint `POST /api/generate/meta`. Réponse **JSON** (pas SSE) avec `{ metaTitle, metaDescription, usage }`. Boucle retry sur 429 (`RATE_LIMIT_MAX_RETRIES`).
- [server/prompts/generate-meta.md](../../server/prompts/generate-meta.md) — prompt avec variables `{{articleTitle}}`, `{{keyword}}`, `{{articleContent}}`.
- [src/stores/article/editor.store.ts](../../src/stores/article/editor.store.ts) — action `generateMeta(articleId, keyword, articleTitle, articleContent)` : appelle `POST /generate/meta`, écrit `metaTitle` / `metaDescription` dans le store + tronque proprement au mot près si dépassement (title 60ch, desc 160ch).

**Endpoints**
- `POST /api/generate/meta` — JSON synchrone.

**Tables consommées**
- **Écriture** : `articles.meta_title` (TEXT) + `articles.meta_description` (TEXT) via `apiPut('/articles/:id', ...)` après réception de la réponse.

**Flux DB**

*Lecture* : aucune (le content est passé en payload depuis le client, qui vient de le générer).

*Écriture* : 1️⃣ génération article terminée → `editorStore.content` peuplé + `saveArticle(id)` initial → 2️⃣ `useArticleGeneration` enchaîne `editorStore.generateMeta(id, keyword, title, content)` → 3️⃣ `POST /api/generate/meta` retourne JSON → 4️⃣ `editorStore.metaTitle` / `metaDescription` mis à jour avec troncature → 5️⃣ second `saveArticle(id)` qui persiste les méta dans `articles.meta_title` / `meta_description`.

**Stores Pinia**
- `useEditorStore` — destinataire de la méta générée ; expose `metaTitle`, `metaDescription`, `lastMetaUsage` ; persiste via `saveArticle`.

**Watchers & réactivité**
- `editorStore.metaTitle` / `metaDescription` sont des refs réactives → composant `ArticleMetaDisplay.vue` affiche les compteurs caractères / cible en temps réel après génération **et** pendant l'édition manuelle.

**Décisions d'architecture**
- **JSON sync vs SSE** : la méta est ~150 mots cumulés (title + description) — pas de gain UX à streamer. Le JSON synchrone simplifie le code client (`apiPost` standard, pas `apiStream`).
- **Troncature au mot près** : si le LLM dépasse (cas fréquent sur description ~180 chars), `editorStore.generateMeta` tronque côté client au dernier espace avant la limite, jamais en plein mot. La même règle est appliquée à l'édition manuelle (le compteur signale dépassement mais l'éditeur reste libre — l'utilisateur peut volontairement dépasser).
- **Décorrélation Méta/Article** : Méta est une opération distincte qui peut être relancée seule. Si elle plante, l'article reste sauvegardé.

**Voir aussi**
- `DESIGN-RED-ARTICLE` — étape précédente qui produit `content`.
- `DESIGN-RED-EDITOR-TIPTAP` — édition manuelle des méta après génération.

---

### DESIGN-RED-EDITOR-TIPTAP

**Réf PRD :** [FR-RED-EDITOR-TIPTAP](./prd.md#fr-red-editor-tiptap)

**Refs code**
- [src/components/editor/ArticleEditor.vue](../../src/components/editor/ArticleEditor.vue) — composant principal de l'éditeur, monte **3 éditeurs TipTap distincts** (intro, body, conclusion) via `useEditor()` et émet `update:content` en concaténant les 3 sorties HTML. Pré-traitement à l'init : `mergeConsecutiveElements` + `removeEmptyElements` + `splitArticleSections`.
- [src/components/editor/EditorToolbar.vue](../../src/components/editor/EditorToolbar.vue) — toolbar de mise en forme (gras, italique, listes, titres, liens, blocs spéciaux).
- [src/components/editor/EditorBubbleMenu.vue](../../src/components/editor/EditorBubbleMenu.vue) — bubble menu sur sélection (point d'entrée des 12 actions contextuelles, cf. `DESIGN-RED-CONTEXTUAL-ACTIONS`).
- [src/components/editor/tiptap/extensions/](../../src/components/editor/tiptap/extensions/) — extensions TipTap maison : `content-valeur`, `content-reminder`, `answer-capsule`, `internal-link`, `drag-handle`, `dynamic-block`, `dynamic-block-drop`.
- [src/components/editor/SaveStatusIndicator.vue](../../src/components/editor/SaveStatusIndicator.vue) — indicateur visuel « modifié / enregistré il y a Xs » lié à `editorStore.isDirty` + `lastSavedAt`.
- [src/composables/editor/useAutoSave.ts](../../src/composables/editor/useAutoSave.ts) — composable de sauvegarde automatique (debounce + déclenchement Ctrl+S via `useKeyboardShortcuts`).
- [src/stores/article/editor.store.ts](../../src/stores/article/editor.store.ts) — store `useEditorStore` : SSOT `content` (HTML concaténé des 3 éditeurs), `wordCount` computed (via `countWordsFromHtml`), `isDirty`, `isSaving`, `lastSavedAt`, `error`. Actions `setContent`, `markClean`, `markDirty`, `saveArticle(articleId)`.

**Endpoints**
- `PUT /api/articles/:id` — sauvegarde `{ content, metaTitle, metaDescription }`.
- `GET /api/articles/:id/content` — chargement initial (action `loadExistingContent`).

**Tables consommées**
- **Lecture** : `article_content.content` (TEXT) à l'ouverture de l'éditeur via `loadExistingContent(articleId)`.
- **Écriture** : `article_content.content` (TEXT) + `articles.meta_title` / `meta_description` via `saveArticle(articleId)`.

**Flux DB**

*Lecture* : à l'ouverture de la vue Rédaction, `editorStore.loadExistingContent(articleId)` → `GET /articles/:id/content` → hydrate `content`, `metaTitle`, `metaDescription` → les 3 sous-éditeurs TipTap sont initialisés avec leur portion (`splitArticleSections`).

*Écriture* : 1️⃣ frappe utilisateur dans un des 3 éditeurs → `onUpdate` TipTap → `emitCombinedContent()` concatène les 3 HTMLs → émet `update:content` au parent → 2️⃣ parent appelle `editorStore.setContent(html)` qui marque `isDirty = true` → 3️⃣ `useAutoSave` debounce → déclenche `editorStore.saveArticle(id)` → 4️⃣ `PUT /articles/:id` met à jour `article_content.content` + `articles.meta_*` → 5️⃣ `editorStore.lastSavedAt = now()`, `markClean()`.

**Stores Pinia**
- `useEditorStore` — SSOT absolu de `content` + état dirty/saving.

**Watchers & réactivité**
- 3 instances `useEditor` indépendantes (intro, body, conclusion) avec un `onUpdate` chacune → `emitCombinedContent` recompose la sortie HTML totale.
- `editorStore.wordCount` est un `computed` qui re-évalue `countWordsFromHtml(content)` à chaque mutation de `content` → consommé par `ArticleWordCountBar`, `useSeoScoring` watcher, et `useArticleGeneration.canReduce`.
- `useAutoSave` debounce les mutations de `isDirty` ; rollback de `isDirty` si la sauvegarde échoue (optimistic update assumé dans `saveArticle`).
- Ctrl+S : sauvegarde manuelle immédiate via `useKeyboardShortcuts` (cf. `ArticleWorkflowView.vue` lignes ~115-122).

**Décisions d'architecture**
- **3 sous-éditeurs au lieu d'un seul** : structurer visuellement intro / corps / conclusion sans devoir compter sur la mise en forme du contenu ; permet aussi un placeholder différent par zone.
- **`content` HTML, pas JSON TipTap** : sauvegarde en HTML rendu (compatible avec preview public, export, autres outils). La structure TipTap est reconstruite à l'init via `splitArticleSections`.
- **Optimistic save** : `markClean()` avant l'appel API ; rollback `isDirty = true` si erreur. UX plus fluide, surtout sur réseau lent.

**Voir aussi**
- `DESIGN-RED-WORD-COUNT-TARGET` — consommateur de `editorStore.wordCount`.
- `DESIGN-RED-SEO-LIVE` — watcher sur `content` pour scorer.
- `DESIGN-RED-CONTEXTUAL-ACTIONS` — bubble menu sur sélection.
- `DRIFT-013` — `ArticleWordCountBar` n'est consommé que par `ArticleWorkflowView`, pas par `ArticleEditorView` (à trancher produit).

---

### DESIGN-RED-SEO-LIVE

**Réf PRD :** [FR-RED-SEO-LIVE](./prd.md#fr-red-seo-live)

**Refs code**
- [src/composables/seo/useSeoScoring.ts](../../src/composables/seo/useSeoScoring.ts) — composable principal. `watch` sur `[editorStore.content, editorStore.metaTitle, editorStore.metaDescription, keywords(), articleKeywords?.()]` → debounce 300ms (`useDebounceFn`) → `requestIdleCallback` (ou `setTimeout` 0 en fallback) → appelle `seoStore.recalculate(...)`.
- [src/stores/article/seo.store.ts](../../src/stores/article/seo.store.ts) — store `useSeoStore` : `score: SeoScore | null`, `scoreLevel: 'good' | 'fair' | 'poor' | null` (seuils `SEO_SCORE_LEVELS`), `hasIssues` computed, `wordCount` (délégué à `editorStore` — SSOT G5), `recalculate(content, keywords, metaTitle, metaDescription, target?, related?, articleKeywords?, articleId?)`.
- [src/utils/seo-calculator.ts](../../src/utils/seo-calculator.ts) — `calculateSeoScore(...)` qui produit `SeoScore { global, wordCount, keywordDensities[], headingValidation, metaAnalysis, checklistItems[] }`.
- [shared/constants/seo.constants.ts](../../shared/constants/seo.constants.ts) — `SEO_SCORE_LEVELS = { good, fair }` (seuils good/fair, poor implicite).
- [src/components/panels/SeoPanel.vue](../../src/components/panels/SeoPanel.vue) — panel d'affichage (toggle via toolbar — cf. `DESIGN-RED-PANELS-LAYOUT`).

**Endpoints** : aucun. Le scoring est 100 % client (calcul pur sur le HTML + keywords).

**Tables consommées** : aucune en lecture directe par le composable ; il consomme les stores Pinia déjà hydratés (`editorStore`, `useArticleKeywordsStore`, `useKeywordsStore`).

**Flux DB**

*Lecture* : aucune (calcul pur sur données déjà en mémoire).

*Écriture* : aucune **directement**. Le `seo_score` final est persisté dans `articles.seo_score` (NUMERIC) à la sauvegarde de l'article — mais c'est `editorStore.saveArticle` (cf. `DESIGN-RED-EDITOR-TIPTAP`) qui pousse, pas `useSeoScoring`. Lors d'un futur chantier, `seoStore.score?.global` pourrait être inclus dans le payload de save pour figer la valeur côté DB.

**Stores Pinia**
- `useSeoStore` — héberge `score: SeoScore | null` + `isCalculating` + `scoreLevel` (computed) + `hasIssues` (computed). Délègue `wordCount` à `editorStore` pour rester SSOT.
- `useEditorStore` — source du contenu (`content`, `metaTitle`, `metaDescription`).
- `useArticleKeywordsStore` (optionnel via getter) — fournit Capitaine + Lieutenants + Lexique pour densités.

**Watchers & réactivité**
- 1 seul `watch(deep: true)` sur le tuple `[content, metaTitle, metaDescription, keywords, articleKeywords]` → `debouncedRecalculate` (300ms) → `requestIdleCallback` (non-bloquant) → `seoStore.recalculate(...)`.
- Annulation préventive : si un nouveau cycle démarre alors que `pendingIdle` n'est pas encore exécuté, `cancelIdle(pendingIdle)` purge l'ancien → un seul calcul par fenêtre de stabilité.
- Reset auto : si `editorStore.content` devient `null` (article reset), `seoStore.reset()` purge le score.

**Décisions d'architecture**
- **300ms debounce + `requestIdleCallback`** : le calcul SEO sur 2500 mots HTML coûte ~5-15 ms ; pas un blocage majeur, mais cumulé avec la frappe ça devient sensible. Le couple debounce + idle garantit qu'on ne calcule qu'à l'arrêt de frappe ET qu'on n'interrompt jamais l'UI.
- **`wordCount` délégué à `editorStore`** (finding G5 du refactor 2026) : avant, `editorStore.wordCount` et `seoStore.score.wordCount` pouvaient diverger si recalculate n'avait pas encore tourné. Maintenant `seoStore.wordCount` est un `computed` qui pointe sur `editorStore.wordCount` — invariant SSOT.
- **Pas de persistance DB du score temps réel** : `articles.seo_score` est figé au moment du save, pas du watcher. C'est le coût d'avoir un score réactif sans round-trip réseau à chaque keystroke.

**Voir aussi**
- `DESIGN-RED-EDITOR-TIPTAP` — source de `content` watchée.
- `DESIGN-RED-WORD-COUNT-TARGET` — SSOT word count partagé.
- `DESIGN-RED-PANELS-LAYOUT` — toggle UI du panel SEO.

---

### DESIGN-RED-CONTEXTUAL-ACTIONS

**Réf PRD :** [FR-RED-CONTEXTUAL-ACTIONS](./prd.md#fr-red-contextual-actions)

**Refs code**
- [src/composables/editor/useContextualActions.ts](../../src/composables/editor/useContextualActions.ts) — composable principal : `executeAction(actionType, selectedText, context, editor)` → ouvre stream SSE vers `/api/generate/action` → accumule `streamedResult` → `acceptResult(editor)` remplace la sélection, `rejectResult()` annule. Cas spécial `actionType === 'internal-link'` : bypass SSE, ouvre `showArticlePicker` pour `applyInternalLink(article)`.
- [src/components/editor/EditorBubbleMenu.vue](../../src/components/editor/EditorBubbleMenu.vue) — UI de la mini-barre TipTap qui présente les 12 actions au-dessus de la sélection.
- [server/routes/generate/action.routes.ts](../../server/routes/generate/action.routes.ts) — endpoint `POST /api/generate/action`, SSE. Charge `system-propulsite.md` (système) + `actions/<actionType>.md` (user prompt avec variables `selectedText`, `keywordInstruction`). Web search activé pour `sources-chiffrees` et `exemples-reels` uniquement (`needsWebSearch`).
- [server/prompts/actions/](../../server/prompts/actions/) — 12 prompts `.md` : `reformulate`, `simplify`, `convert-list`, `pme-example`, `keyword-optimize`, `add-statistic`, `answer-capsule`, `question-heading`, `localize`, `sources-chiffrees`, `exemples-reels`, `ce-quil-faut-retenir`. **Vérifié 2026-05-12 par `ls server/prompts/actions/` : exactement 12 fichiers.**

**Endpoints**
- `POST /api/generate/action` — SSE.

**Tables consommées** : aucune (l'action travaille sur `selectedText` envoyé en payload + le mot-clé Capitaine du contexte client).

**Flux DB**

*Lecture* : aucune.

*Écriture* : aucune **directement** par l'action. La modification de la sélection (`editor.insertContent(streamedResult)`) propage via `onUpdate` TipTap → `editorStore.setContent` → `isDirty = true` → autoSave → persistance standard. L'action est invisible pour la couche DB.

**Stores Pinia**
- Aucun store dédié. Le composable `useContextualActions` est local au composant qui le monte (typiquement `ArticleEditorView` ou `ArticleWorkflowView`). Il consomme indirectement `editorStore` via la chaîne de modification TipTap.

**Watchers & réactivité**
- État local au composable : `isExecuting`, `streamedResult`, `actionError`, `currentAction`, `showArticlePicker`.
- Sélection sauvegardée avant le stream (`savedFrom` / `savedTo`) pour pouvoir restaurer la position et remplacer même si l'utilisateur a perdu le focus pendant la génération.
- `onUnmounted` (uniquement si appelé dans un composant) : `abort()` annule le stream en cours pour éviter les warnings de mémoire.

**Décisions d'architecture**
- **12 actions = 12 fichiers `.md`** : prompts isolés, chargés dynamiquement via `loadPrompt('actions/' + actionType)`. Ajouter une 13ᵉ action = créer un nouveau `.md` + valeur dans l'enum `ActionType` côté types. Pas de logique en dur dans le code.
- **Action `internal-link` bypass total** : cette action ne va pas du tout sur l'IA, c'est un UX pattern différent (picker d'article). Elle est exposée dans le même composant pour cohérence d'UX (le bubble menu propose 13 boutons dont 12 IA + 1 picker), mais le code la traite à part — pas de prompt `internal-link.md`.
- **Web search opt-in par action** : seulement `sources-chiffrees` et `exemples-reels` autorisent le web search (`WEB_SEARCH_TOOL`). Les autres restent en pur LLM pour éviter le coût.
- **`reformulate.md` x2 références au prompt** : un même prompt est utilisé pour l'action "reformuler" sur sélection ; ne pas confondre avec d'éventuels usages côté Moteur — c'est bien le même fichier mais avec des `selectedText` différents.

**Voir aussi**
- `DESIGN-RED-INTERNAL-LINKING` — cas particulier `internal-link` qui ouvre le picker.
- `DESIGN-INFRA-PROMPT-LOADER` — mécanique `loadPrompt(...)` qui injecte les variables.

---

### DESIGN-RED-INTERNAL-LINKING

**Réf PRD :** [FR-RED-INTERNAL-LINKING](./prd.md#fr-red-internal-linking)

**Refs code**
- [src/composables/seo/useInternalLinking.ts](../../src/composables/seo/useInternalLinking.ts) — composable : `requestSuggestions()` (passe `articleId` + content au store), `applySuggestion(suggestion, editor)` (cherche l'ancre dans le doc TipTap, pose un mark `internalLink` avec `targetId` + `href`, save dans la matrice), `dismissSuggestion`, `clearSuggestions`.
- [src/stores/keyword/linking.store.ts](../../src/stores/keyword/linking.store.ts) — store `useLinkingStore` : `matrix`, `suggestions[]`, `orphans[]`, `anchorAlerts[]`, `crossCocoonOpportunities[]`. Actions `fetchMatrix`, `fetchSuggestions(articleId, content)`, `saveLinks(links[])`, `clearSuggestions`.
- [src/components/linking/LinkSuggestions.vue](../../src/components/linking/LinkSuggestions.vue) — UI du panel Maillage (consommé par `ArticlePanelsResizable`).
- [src/components/editor/tiptap/extensions/internal-link/](../../src/components/editor/tiptap/extensions/internal-link/) — extension TipTap custom (`setMark('internalLink', { targetId, href })`).
- [server/services/article/linking.service.ts](../../server/services/article/linking.service.ts) — service backend pour suggestions + matrice + save.

**Endpoints**
- `POST /api/links/suggest` (ou route équivalente) — suggère pour un article + content.
- `POST /api/links/save` — persiste les liens validés.
- `GET /api/links/matrix` — récupère la matrice cocon + orphelins + alertes ancres.

**Tables consommées**
- **Lecture** : `internal_links` (matrice cocon), `articles` (cibles candidates).
- **Écriture** : `internal_links` (`source_id`, `target_id`, `position`, `anchor_text`, `reason`, `validated_at`) — contrainte d'unicité `(source_id, target_id, position)`.

**Flux DB**

*Lecture* : 1️⃣ utilisateur clique « Suggérer des liens » → 2️⃣ `linkingStore.fetchSuggestions(id, content)` → 3️⃣ serveur analyse le content (NLP / embeddings) + lit `articles` du cocon → 4️⃣ retourne `suggestions: [{ targetId, suggestedAnchor, href }]` → 5️⃣ store peuple `suggestions[]`, panel UI les liste.

*Écriture* : 1️⃣ utilisateur clique « Appliquer » sur une suggestion → 2️⃣ `applySuggestion(suggestion, editor)` résout `from/to` ProseMirror → pose le mark `internalLink` (modifie le contenu TipTap → dirty éditeur → autoSave) → 3️⃣ même temps, `linkingStore.saveLinks([link])` → `INSERT INTO internal_links (source_id, target_id, anchor_text, position) VALUES (...) ON CONFLICT DO UPDATE` → 4️⃣ suggestion retirée de `suggestions[]` localement.

**Stores Pinia**
- `useLinkingStore` (kebab-case `linking.store.ts` dans `src/stores/keyword/`) — héberge `suggestions`, `matrix`, `orphans`, `anchorAlerts`, `crossCocoonOpportunities`.
- `useEditorStore` — modifié indirectement quand le mark est posé (via `editor.chain().setMark('internalLink', ...)` qui déclenche `onUpdate`).

**Watchers & réactivité**
- Pas de watcher : les suggestions sont demandées explicitement par l'utilisateur, pas en continu.
- `applySuggestion` mute directement `linkingStore.suggestions` (filter) pour retirer la suggestion appliquée — pas via une action store, ce qui pourrait être nettoyé.

**Décisions d'architecture**
- **Mark TipTap `internalLink` séparé du mark `link` standard** : permet de distinguer visuellement les liens internes des liens externes (CSS différent), et de pouvoir suivre la matrice de maillage côté DB.
- **Stockage côté DB par `(source_id, target_id, position)`** : `position` est une chaîne pour l'instant (`char-<index>`), pas une position ProseMirror exacte. Limite : si l'article est remanié lourdement, le lien existe toujours en DB mais la position devient flottante. Pas critique pour la matrice cocon (qui s'intéresse au qui-pointe-vers-qui).
- **Suggestions à la demande, pas continu** : analyse NLP côté serveur trop coûteuse pour tourner sur chaque keystroke. L'utilisateur déclenche explicitement.

**Voir aussi**
- `DESIGN-RED-CONTEXTUAL-ACTIONS` — action `internal-link` qui ouvre un picker manuel (alternative au flux suggestion).
- `DESIGN-RED-PANELS-LAYOUT` — panel « Maillage » qui héberge l'UI.
- `DESIGN-INFRA-INTERNAL-LINKS` (§8.14 à créer) — formalisation de la matrice cocon (orphelins, alertes).

---

### DESIGN-RED-REDUCE-SECTION

**Réf PRD :** [FR-RED-REDUCE-SECTION](./prd.md#fr-red-reduce-section)

**Refs code**
- [server/routes/generate/reduce-section.routes.ts](../../server/routes/generate/reduce-section.routes.ts) — endpoint `POST /api/generate/reduce-section`. SSE (`chunk` + `done` avec clé unifiée `html`). Charge `system-propulsite` + `reduce-section.md` (variables `sectionHtml` escapé, `sectionTitle`, `targetWordCount`, `currentWordCount`, `keyword`, `keywords`).
- [server/prompts/reduce-section.md](../../server/prompts/reduce-section.md) — prompt qui condense la section.
- [src/stores/article/editor.store.ts](../../src/stores/article/editor.store.ts) — méthode `reduceArticle(articleId, targetWordCount, keyword, keywords)` : split content par H2, boucle séquentielle sur chaque section, appelle `/api/generate/reduce-section` par section, recompose, met à jour `editorStore.content`. État `isReducing`, `reduceProgress {current, total, title}`, `reduceAbortController`.
- [src/composables/article/useArticleGeneration.ts](../../src/composables/article/useArticleGeneration.ts) — expose `canReduce` (= delta > 15 %) et `handleReduce()` + `handleAbortReduce()`.

**Endpoints**
- `POST /api/generate/reduce-section` — SSE par section.

**Tables consommées**
- `article_strategies` (lecture via `getStrategy(articleId)`) — strategy context pour préserver ton + promesse.
- **Écriture** : `article_content.content` (TEXT) via `saveArticle(id)` après chaque boucle terminée.

**Flux DB**

*Lecture* : 1️⃣ `useArticleGeneration.handleReduce()` → 2️⃣ `editorStore.reduceArticle(id, target, kw, kws)` → 3️⃣ `splitArticleByH2(content)` → 4️⃣ boucle : pour chaque section H2 → 5️⃣ `POST /api/generate/reduce-section` → serveur lit `article_strategies` → stream → 6️⃣ remplace la section dans `editorStore.content` → 7️⃣ progress update.

*Écriture* : à la fin de la boucle (ou abort), `handleReduce` appelle `saveArticle(id)` → `article_content.content` mis à jour.

**Stores Pinia**
- `useEditorStore` — orchestrateur principal (`reduceArticle`, `isReducing`, `reduceProgress`, `abortReduce`, `lastReduceUsage`).

**Watchers & réactivité**
- `editorStore.reduceProgress` mis à jour à chaque section → composant `SectionProgressBar.vue` (ou équivalent visuel dans la vue) reflète l'avancement.
- `AbortController` (`reduceAbortController`) — annulation propre : interrompt le fetch SSE en cours, les sections déjà compressées sont conservées dans `content`, les suivantes restent intactes.

**Décisions d'architecture**
- **Seuil 15 % pour `canReduce`** : décision UX dans `useArticleGeneration.ts` (lignes 64-70). Sous 15 % de dépassement, la compression IA coûte plus en cohérence qu'elle ne gagne en concision — l'utilisateur peut toujours raccourcir manuellement.
- **Section-by-section comme la génération** : même approche que `DESIGN-RED-ARTICLE`. Cohérent côté UX (l'utilisateur reconnaît le pattern), cohérent côté coût (granularité 429-retry par section).
- **Pas de retry automatique sur échec d'une section** : à la différence de la génération initiale, un échec de compression ne fait pas réessayer — on garde la section originale (pas de troncature brutale). Évite de cramer des tokens sur une section qui résiste.

**Voir aussi**
- `DESIGN-RED-ARTICLE` — pattern section-by-section partagé.
- `DESIGN-RED-WORD-COUNT-TARGET` — source du `targetWordCount` lu pour calculer le delta.

---

### DESIGN-RED-HUMANIZE-SECTION

**Réf PRD :** [FR-RED-HUMANIZE-SECTION](./prd.md#fr-red-humanize-section)

**Refs code**
- [server/routes/generate/humanize-section.routes.ts](../../server/routes/generate/humanize-section.routes.ts) — endpoint `POST /api/generate/humanize-section`. Pattern accumulate-then-validate (pas de stream partiel client). Retry+fallback : (1) attempt → (2) si HTML structure cassée, retry avec `REINFORCEMENT_BLOCK` → (3) si toujours cassé, fallback au `sectionHtml` original (`structurePreserved: false`). Validateur : `validateHtmlStructurePreserved` côté serveur.
- [server/prompts/humanize-section.md](../../server/prompts/humanize-section.md) — prompt avec variables `sectionHtml` (escapé G3 anti-prompt-injection), `sectionTitle`, `keyword`, `keywords`, `reinforcement`.
- [src/stores/article/editor.store.ts](../../src/stores/article/editor.store.ts) — méthode `humanizeArticle(articleId, keyword, keywords)` : pipeline `humanizeAllSections()` parallélisé avec `AbortController`. Tracking `humanizeFallbackCount` (combien de sections sont retombées sur l'original). État `isHumanizing`, `humanizeProgress`, `lastHumanizeUsage`, `lastHumanizeError`, `humanizeAbortController`.

**Endpoints**
- `POST /api/generate/humanize-section` — JSON (pas de SSE pour le partiel ; SSE seulement pour `done`).

**Tables consommées**
- **Écriture** : `article_content.content` (TEXT) via `saveArticle(id)` après pipeline complet.

**Flux DB**

*Lecture* : aucune (toutes les variables viennent du payload client).

*Écriture* : 1️⃣ `useArticleGeneration.handleHumanize()` → 2️⃣ `editorStore.humanizeArticle(id, kw, kws)` → 3️⃣ split content par H2 → 4️⃣ chaque section appelée en parallèle avec `AbortController` partagé → 5️⃣ chaque réponse : si `structurePreserved: false` → incrémenter `humanizeFallbackCount`, garder original → 6️⃣ recomposer content → 7️⃣ `saveArticle(id)`.

**Stores Pinia**
- `useEditorStore` — orchestrateur (`humanizeArticle`, `isHumanizing`, `humanizeProgress`, `abortHumanize`, `humanizeFallbackCount`, `lastHumanizeError`).

**Watchers & réactivité**
- `humanizeProgress` mis à jour au fil des sections complétées (parallèle → ordre d'arrivée non déterministe, mais le compteur reflète le nombre de sections finies).
- `humanizeFallbackCount` accumulé → exposable dans une notification discrète UI (« 1 section retournée à l'original »).

**Décisions d'architecture**
- **Accumulate-then-validate, pas stream partiel** : streamer du HTML dont la structure peut être cassée → flash UI. On préfère afficher la barre de progression et révéler la section finale validée d'un coup. Section ~500 mots ≈ ~5s = latence acceptable.
- **Retry+fallback à 2 niveaux** : (1) attempt naïf → (2) attempt avec `REINFORCEMENT_BLOCK` (instructions très explicites de préservation structurelle) → (3) fallback original. Évite de produire du HTML cassé qui détruirait l'éditeur TipTap.
- **Parallélisation des sections** : à la différence de `reduce-section` (séquentiel), `humanize-section` parallélise les appels. Pas de dépendance inter-section (chaque section humanise indépendamment), gain de temps significatif sur 6-8 sections.
- **`escapeKeys: ['sectionHtml']`** : protection anti-prompt-injection. Si le contenu inclut du `{{...}}` ou des balises markdown, ils ne sont pas interprétés au load du prompt.

**Voir aussi**
- `DESIGN-RED-ARTICLE` — autre consommateur du même découpage H2.
- `DESIGN-RED-REDUCE-SECTION` — parallèle pattern, séquentiel celui-là.

---

### DESIGN-RED-WORD-COUNT-TARGET

**Réf PRD :** [FR-RED-WORD-COUNT-TARGET](./prd.md#fr-red-word-count-target)

**Refs code**
- [src/components/article/ArticleWordCountBar.vue](../../src/components/article/ArticleWordCountBar.vue) — composant UI affichant `actual | target | delta signé`.
- [src/composables/article/useArticleGeneration.ts](../../src/composables/article/useArticleGeneration.ts) — expose `wordCountTarget` (= `briefStore.briefData?.contentLengthRecommendation`), `wordCountDeltaDisplay` (= `editorStore.wordCountDelta(target)`), `canReduce` (= delta > 15 %).
- [src/stores/article/editor.store.ts](../../src/stores/article/editor.store.ts) — `wordCount` computed (SSOT G5), `wordCountDelta(target)` helper signé.
- [src/stores/strategy/brief.store.ts](../../src/stores/strategy/brief.store.ts) — `briefData.contentLengthRecommendation` calculée via `fetchContentLengthRecommendation(articleId, articleType)` (appel à `/api/articles/:id/recommend-word-count` + fallback heuristique `baseByType`).
- [server/services/article/target-word-count.service.ts](../../server/services/article/target-word-count.service.ts) — service backend pour la recommandation IA + heuristique.

**Endpoints**
- `POST /api/articles/:id/recommend-word-count` — produit la recommandation contextuelle (SERP avg + sommaire HN + type d'article).

**Tables consommées**
- **Lecture** : `article_micro_contexts.target_word_count` (priorité 2 après le client explicite), `articles.type` (priorité 3 pour fallback `DEFAULT_TARGET_WORDS_BY_TYPE`).
- **Écriture** : aucune par cette FR. La cible est calculée à la volée et stockée dans `briefStore.briefData` côté front + `article_micro_contexts.target_word_count` quand l'utilisateur la valide en amont (cf. FR-CER-MICRO-CONTEXT).

**Flux DB**

*Lecture* : 1️⃣ mount vue Rédaction → `briefStore.fetchBrief(id)` → `recommend-word-count` ou fallback → `briefData.contentLengthRecommendation` peuplé.

*Écriture* : aucune dans la Rédaction. Si l'utilisateur veut figer une cible custom, il passe par le micro-contexte (`article_micro_contexts.target_word_count`).

**Stores Pinia**
- `useBriefStore` — fournit `briefData.contentLengthRecommendation`.
- `useEditorStore` — fournit `wordCount` (computed) + `wordCountDelta(target)`.

**Watchers & réactivité**
- `wordCountTarget` est un `computed` dans `useArticleGeneration` → re-évalué quand `briefStore.briefData` change.
- `wordCountDeltaDisplay` est un `computed` qui chaîne `editorStore.wordCount` et `wordCountTarget` → mise à jour live à chaque frappe.
- `canReduce` est un `computed` qui dérive `delta > 15 % de target` → contrôle l'activation du bouton « Réduire ».

**Décisions d'architecture**
- **Cible client = cible serveur** : la même valeur (`wordCountTarget` dans `useArticleGeneration`) est passée à `editorStore.generateArticle(targetWordCount)` ET à `editorStore.reduceArticle(targetWordCount)`. Pas de divergence affichage vs calcul (cohérence affichage/calcul, cf. CLAUDE.md §2.0).
- **Cascade 4 niveaux** : client > microCtx > type default > hard fallback (cf. `DESIGN-RED-ARTICLE`). Le client reste autoritatif pour permettre de forcer une cible à la volée si besoin.
- **Affichage signé** : `wordCountDelta` retourne `wordCount - target`, donc positif si trop long, négatif si trop court. Aligne avec l'UX dashboard / SERP scoring.

**Voir aussi**
- `DESIGN-RED-EDITOR-TIPTAP` — source `editorStore.wordCount`.
- `DESIGN-RED-ARTICLE` — consommateur du target pour `computeSectionBudget`.
- `DESIGN-RED-REDUCE-SECTION` — consommateur du target pour le seuil 15 %.
- `DESIGN-CER-WORD-COUNT-RECOMMEND` — endpoint qui calcule la cible.
- `DESIGN-UI-ARTICLE-SHARED` (§8.15) — `ArticleWordCountBar` consommé par `ArticleWorkflowView` (cf. `DRIFT-013`).

---

### DESIGN-RED-PROGRESS

**Réf PRD :** [FR-RED-PROGRESS](./prd.md#fr-red-progress)

**Refs code**
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — store `useArticleProgressStore` : `progressMap: Record<id, ArticleProgress>`, `fetchProgress(id)`, `saveProgress(id, progress)`, `addCheck(id, check)`, `removeCheck(id, check)`. Cache LRU (max 50 items).
- [shared/types/article-progress.types.ts](../../shared/types/article-progress.types.ts) — type `ArticleProgress { id, phase, outline_validated, content_validated, meta_validated, seo, completed_checks[] }` (champs exacts à vérifier dans le fichier shared/types).
- [server/routes/articles.routes.ts](../../server/routes/articles.routes.ts) — endpoint `GET/PUT /api/articles/:id/progress`, `POST /api/articles/:id/progress/check`, `POST /api/articles/:id/progress/uncheck`.
- [server/db/schema.sql](../../server/db/schema.sql) — `articles.phase` TEXT (défaut `'proposed'`), `articles.completed_checks` TEXT[], `articles.check_timestamps` JSONB.

**Endpoints**
- `GET /api/articles/:id/progress` — lecture `ArticleProgress`.
- `PUT /api/articles/:id/progress` — sauvegarde complète.
- `POST /api/articles/:id/progress/check` — ajoute une constante de check.
- `POST /api/articles/:id/progress/uncheck` — retire une constante (cf. `DRIFT-008` — `DELETE` n'existe pas).

**Tables consommées**
- **Lecture/Écriture** : `articles.phase` (TEXT), `articles.completed_checks` (TEXT[]), `articles.check_timestamps` (JSONB).

**Flux DB**

*Lecture* : 1️⃣ mount vue Rédaction → `articleProgressStore.fetchProgress(id)` → `GET /api/articles/:id/progress` → 2️⃣ `progressMap[id] = response`.

*Écriture* : 1️⃣ utilisateur clique « Valider le brief » → 2️⃣ `articleProgressStore.addCheck(id, REDACTION_BRIEF_VALIDATED)` → 3️⃣ `POST /api/articles/:id/progress/check { check }` → 4️⃣ backend `UPDATE articles SET completed_checks = array_append(...), check_timestamps = jsonb_set(...)` → 5️⃣ réponse `ArticleProgress` mis à jour → 6️⃣ `progressMap[id]` rafraîchi → 7️⃣ dashboard, list-item, banner réactifs sur `completed_checks` se mettent à jour.

**Stores Pinia**
- `useArticleProgressStore` — SSOT côté front pour `phase` + `completed_checks` + `check_timestamps`. Cache LRU 50 items.

**Watchers & réactivité**
- Pas de watcher direct dans le store. Les composants consommateurs (dashboard, ArticleListItem, PhaseTransitionBanner, etc.) lisent réactivement `progressMap[id]?.phase` et `progressMap[id]?.completed_checks`.
- `articles.phase` est lu en miroir : pas de transition implicite déclenchée par un calcul front. Les transitions de phase viennent uniquement de l'ajout/retrait de checks via les actions explicites.

**Décisions d'architecture**
- **Enum de phases fermé** : `proposed | brief | outline | writing | seo | published`. Lu identique côté DB (`articles.phase`), côté types front (`ArticleProgress.phase`), côté dashboard. Cf. `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS`.
- **Phase ≠ check** : la phase est l'**état actuel**, les checks sont les **étapes validées**. La transition de phase est dérivée des checks côté backend (un check `redaction:outline_validated` posé peut faire passer la phase de `brief` à `outline`). Évite la divergence phase/checks.
- **Cache LRU** : 50 articles max en mémoire côté store pour éviter l'enflure mémoire sur un dashboard à 200 articles. Eviction du plus ancien à chaque ajout.

**Voir aussi**
- `DESIGN-RED-CHECKS` — émetteurs des 5 constantes Rédaction.
- `DESIGN-DASH-PROGRESS` — consommateur dashboard.
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` — catalogue des constantes.

---

### DESIGN-RED-CHECKS

**Réf PRD :** [FR-RED-CHECKS](./prd.md#fr-red-checks)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) — catalogue : `REDACTION_BRIEF_VALIDATED`, `REDACTION_OUTLINE_VALIDATED`, `REDACTION_CONTENT_WRITTEN`, `REDACTION_SEO_VALIDATED`, `REDACTION_PUBLISHED` (lignes 41-45). Agrégation dans `REDACTION_CHECKS` (lignes 47-53) et `ALL_WORKFLOW_CHECKS`.
- [src/components/workflow/BriefStructureStep.vue](../../src/components/workflow/BriefStructureStep.vue) — émetteur de `REDACTION_BRIEF_VALIDATED` (ligne 101) + import (ligne 22).
- [src/views/ArticleWorkflowView.vue](../../src/views/ArticleWorkflowView.vue) — émetteur de `REDACTION_OUTLINE_VALIDATED` (importé lignes 22-24).
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — récepteur via `addCheck(id, check)` / `removeCheck(id, check)`.

**Endpoints**
- `POST /api/articles/:id/progress/check` — pose un check.
- `POST /api/articles/:id/progress/uncheck` — retire un check (cf. `DRIFT-008`).

**Tables consommées**
- `articles.completed_checks` (TEXT[]) — colonne unique pour les 5 + checks Moteur + Cerveau.

**Flux DB**

*Lecture* : `useArticleProgressStore` hydrate `completed_checks` au mount via `fetchProgress(id)`. Les composants (`BriefStructureStep`, `OutlineRecap`, `FinalisationPanel` côté Moteur) lisent ce tableau pour cocher/dé-cocher leurs cases.

*Écriture* : `articleProgressStore.addCheck(id, REDACTION_*)` → endpoint → `UPDATE articles SET completed_checks = array_append(...)` côté backend, idempotent (pas de doublon).

**Stores Pinia**
- `useArticleProgressStore` — SSOT.

**Watchers & réactivité**
- Les composants qui affichent la liste des checks sont réactifs sur `progressMap[id].completed_checks` — toute mutation (`addCheck` / `removeCheck`) propage immédiatement.

**Décisions d'architecture**
- **5 constantes Rédaction, partagées via `shared/constants/`** : pas de string libre dans les composants. Toute écriture passe par la constante importée (cf. CLAUDE.md §3 règle 3 : « Jamais hardcoder la string »).
- **Tous les checks dans la même colonne `completed_checks` TEXT[]** : Moteur + Cerveau + Rédaction cohabitent. Pas de table normalisée par phase — simplifie les requêtes et le typage.
- **Idempotence côté backend** : `addCheck` ne crée pas de doublon si la constante est déjà présente. Permet de re-cliquer sans casser l'état.

**Voir aussi**
- `DESIGN-RED-PROGRESS` — consommateur des checks.
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` — catalogue complet (Moteur + Cerveau + Rédaction).
- `DESIGN-DASH-PROGRESS` — affichage des dots dérivés.

---

### DESIGN-RED-PANELS-LAYOUT

**Réf PRD :** [FR-RED-PANELS-LAYOUT](./prd.md#fr-red-panels-layout)

**Refs code**
- [src/components/article/ArticlePanelsToolbar.vue](../../src/components/article/ArticlePanelsToolbar.vue) — toolbar segmentée (5 boutons toggle : SEO, GEO, Maillage, Blocs [éditeur], IA Brief [workflow]). Émet `toggle-seo`, `toggle-geo`, `toggle-linking`, `toggle-blocks`, `toggle-ia-brief`. Gating visuel via `:disabled="!hasBody"` + libellé contextuel.
- [src/components/article/ArticlePanelsResizable.vue](../../src/components/article/ArticlePanelsResizable.vue) — rendu conditionnel des 4 panels factorisables (`SeoPanel`, `GeoPanel`, `LinkSuggestions`, `BlocksPanel`) selon `showSeoPanel`/`showGeoPanel`/etc. ErrorBoundary par panel.
- [src/composables/ui/usePanelToggle.ts](../../src/composables/ui/usePanelToggle.ts) — composable : `activePanel: PanelId`, `toggle(panel)`, computeds `showSeoPanel`, `showGeoPanel`, `showLinkSuggestions`, `showIaBriefPanel`, `showBlocksPanel`, `hasActivePanel`. **Mutual exclusion garantie** : `activePanel.value = activePanel.value === panel ? null : panel`.
- [src/components/panels/ResizablePanel.vue](../../src/components/panels/ResizablePanel.vue) — wrapper sticky + col-resize (largeur ajustable, persistance session via composable interne).
- [src/composables/ui/useKeyboardShortcuts.ts](../../src/composables/ui/useKeyboardShortcuts.ts) — capture Escape → ferme le panel actif.
- [src/views/ArticleWorkflowView.vue](../../src/views/ArticleWorkflowView.vue) — instancie `usePanelToggle('seo')` (panel SEO par défaut, IA Brief disponible).
- [src/views/ArticleEditorView.vue](../../src/views/ArticleEditorView.vue) — instancie `usePanelToggle('blocks')` (panel Blocs par défaut, IA Brief absent).

**Endpoints** : aucun. Composant purement UI.

**Tables consommées** : aucune.

**Flux DB** : N/A.

**Stores Pinia**
- `useEditorStore` — lecture de `content` pour calculer `hasBody = !!editorStore.content` côté parent (gating visuel des 4 panels factorisables).

**Watchers & réactivité**
- `activePanel` mutation → tous les `showXxxPanel` computeds se réévaluent → un seul panel rendu à la fois côté template.
- `hasBody` change quand `editorStore.content` passe de null à valeur (après génération) → boutons SEO/GEO/Maillage/Blocs deviennent actifs sans reload.
- Échap key handler — `useKeyboardShortcuts` fournit un binding global qui passe `activePanel = null`.

**Décisions d'architecture**
- **Mutual exclusion par composable, pas par CSS** : `usePanelToggle` garantit qu'un seul panel est en mémoire à un instant donné. Évite des bugs de scroll ou de focus parasite.
- **Gating visuel ≠ masquage** (libre arbitre absolu) : les boutons SEO/GEO/Maillage/Blocs restent **visibles** quand `!hasBody`, juste désactivés. L'utilisateur sait qu'ils existent et pourquoi ils ne sont pas actifs (libellé tooltip explicite). Pas de mystère « pourquoi je ne vois pas ce bouton ? ».
- **IA Brief hors gating** : analyse du brief = pas besoin d'avoir un contenu écrit. Le bouton reste actif dès le mount.
- **Default panel différent par vue** : `'seo'` pour Workflow (assisté), `'blocks'` pour Editor (libre). Cohérent avec les workflows attendus côté UX.
- **Pas de persistance DB du `activePanel`** : choix UI volatile, pas un état métier ; reset à chaque mount de vue.

**Voir aussi**
- `DESIGN-RED-SEO-LIVE`, `DESIGN-RED-INTERNAL-LINKING`, `DESIGN-RED-IA-BRIEF` — consommateurs.
- `DESIGN-UI-ARTICLE-SHARED` (§8.15) — composants partagés Workflow ↔ Editor.
- `DESIGN-INFRA-KEYBOARD-SHORTCUTS` (§8.14 à créer) — composable Escape.

---

### DESIGN-RED-IA-BRIEF

**Réf PRD :** [FR-RED-IA-BRIEF](./prd.md#fr-red-ia-brief)

**Refs code**
- [src/components/article/ArticleWorkflowIaBrief.vue](../../src/components/article/ArticleWorkflowIaBrief.vue) — composant atomique : reçoit `parsedBriefMarkdown: string` + `iaBriefStreaming: boolean`, émet `relaunch`. Rendu via `v-safe-html`. Bouton désactivé pendant le stream.
- [src/views/ArticleWorkflowView.vue](../../src/views/ArticleWorkflowView.vue) — orchestrateur : monte `<ArticleWorkflowIaBrief>` dans la zone `ResizablePanel` (à côté de `ArticlePanelsResizable` pour les 4 panels factorisables). Possède un `useStreaming<{ content: string }>()` séparé qui appelle `/api/generate/brief-explain`, accumule markdown, parse incrémental avec `marked.parse(...)`.
- [src/views/ArticleEditorView.vue](../../src/views/ArticleEditorView.vue) — **n'instancie pas** ce composant (vue éditeur libre, pas d'analyse stratégique brief).

**Endpoints** : voir `DESIGN-RED-BRIEF` (`POST /api/generate/brief-explain`).

**Tables consommées** : voir `DESIGN-RED-BRIEF` (lecture `article_micro_contexts` côté serveur uniquement).

**Flux DB**

*Lecture* : voir `DESIGN-RED-BRIEF`.

*Écriture* : aucune.

**Stores Pinia**
- Pas de store propre au panneau ; il consomme la chaîne `briefStore` + `articleKeywordsStore` côté `ArticleWorkflowView` pour le payload, et stocke le markdown parsé dans des `ref` locales (`parsedBriefMarkdown`, `iaBriefStreaming`).

**Watchers & réactivité**
- Pas d'auto-trigger : `iaBriefStreaming` ne passe à `true` que sur clic « Relancer l'analyse ».
- Chaque chunk SSE est accumulé puis `marked.parse(accumulated)` re-rendu — l'utilisateur voit le markdown formaté se construire phrase par phrase.

**Décisions d'architecture**
- **Workflow only** : `ArticleEditorView` n'expose pas IA Brief — l'éditeur libre n'a pas de brief structuré à analyser. Décision cohérente avec FR-RED-PANELS-LAYOUT (toolbar workflow inclut IA Brief, toolbar editor inclut Blocs à la place).
- **Pas de gating `hasBody`** : IA Brief est utilisable dès le mount (brief disponible avant écriture). C'est l'une des raisons d'avoir un sous-composant dédié et non un panneau dans `ArticlePanelsResizable` (qui partagerait le gating).
- **Markdown parsé client-side** : `marked.js` côté `ArticleWorkflowView`, transmis parsé en string HTML. Le sous-composant reste agnostique du format (juste un `v-safe-html`).

**Voir aussi**
- `DESIGN-RED-BRIEF` — endpoint backend + prompt.
- `DESIGN-RED-PANELS-LAYOUT` — toolbar qui inclut le bouton « IA Brief ».
- `DESIGN-UI-AI-PANELS-PATTERN` — pattern générique des panels IA (IA Brief est listé comme consommateur du pattern `advice`).

---

## §8.13 — Intégrations externes (DESIGN-EXT)

### DESIGN-EXT-DATAFORSEO

**Réf PRD :** [FR-EXT-DATAFORSEO](./prd.md#fr-ext-dataforseo--récupération-des-données-marché-google-via-dataforseo)

**Refs code**
- [server/services/external/dataforseo/_client.ts](../../server/services/external/dataforseo/_client.ts) — `fetchDataForSeo` / `fetchDataForSeoBatch` + auth Basic + retries 50000/429 + base URL switch sandbox/prod (`getBaseUrl`).
- [server/services/external/dataforseo/keywords.ts](../../server/services/external/dataforseo/keywords.ts), [serp.ts](../../server/services/external/dataforseo/serp.ts), [scoring.ts](../../server/services/external/dataforseo/scoring.ts), [brief.ts](../../server/services/external/dataforseo/brief.ts) — domain wrappers (keyword overview, SERP, scoring, brief data).
- [server/services/external/dataforseo/cache.ts](../../server/services/external/dataforseo/cache.ts) — `readCache` / `writeCache` sur `cache_type='dataforseo'`, TTL 7 jours, refresh policy `DATAFORSEO_MIN_REFRESH_HOURS` (défaut 168 prod, 0 dev).
- [server/services/external/dataforseo.service.ts](../../server/services/external/dataforseo.service.ts) — re-export de compatibilité (l'implémentation a déménagé dans `dataforseo/`).
- [server/routes/dataforseo.routes.ts](../../server/routes/dataforseo.routes.ts) — endpoints exposés au front.

**Endpoints DataForSEO consommés** (via `_client.fetchDataForSeo`)
- `/serp/google/organic/live/regular` — SERP top 10.
- `/serp/google/organic/live/advanced` — SERP + PAA + résonance Radar.
- `/dataforseo_labs/google/keyword_overview/live` — volume + CPC + KD + intention.
- `/dataforseo_labs/google/related_keywords/live` — expansion de mots-clés.
- `/dataforseo_labs/google/keyword_suggestions/live` — suggestions long-tail.
- `/dataforseo_labs/google/search_intent/live` — intent batch.
- `/dataforseo_labs/google/keyword_ideas/live` — idées par graine.
- `/keywords_data/google_ads/search_volume/live` — fallback volume (ne sert plus en routine).

**Tables consommées**
- `external_api_cache` (cache court, voir `DESIGN-INFRA-API-CACHE`) avec `cache_type='dataforseo'`. TTL 7 jours.
- `keyword_metrics` (cache permanent cross-article, voir `DESIGN-INFRA-KEYWORD-METRICS`) — upserts par les wrappers `keywords.ts` / `scoring.ts` après réponse.

**Stores Pinia consommateurs** (front) — `useArticleKeywordsStore`, `useDiscoveryStore`, `useRadarExplorationStore`, `useBriefStore`. Aucun store ne tape `/api/dataforseo/*` directement : passage exclusif par l'API `/api/keywords/*`, `/api/discovery/*`, `/api/radar/*`.

**Décisions d'architecture**
- **Cascade cache → fetch → cache write** systématique, alignée avec `FR-INFRA-GET-OR-FETCH`. Aucun appel ne saute le cache permanent + cache court.
- **Bypass cache (refresh forcé)** : le paramètre `noCache?: true` dans la cascade `getOrFetch` permet à l'UI de réémettre un appel quand l'utilisateur clique « Rafraîchir ».
- **Retry policy** : 429 = jusqu'à 3 retries avec backoff exponentiel (1s, 2s, 4s) ; erreurs internes `50000` = 1 retry seul (limite la facture en cas de boucle d'erreur DFSeo).
- **Quota exception dédiée** : `DataForSeoQuotaError` distingue un vrai 429 répété d'une `CostBudgetError` (cost-guard) côté appelants.

**Voir aussi**
- `DESIGN-EXT-DATAFORSEO-COSTGUARD` — garde-fou budget en amont de chaque appel.
- `DESIGN-EXT-DATAFORSEO-SANDBOX` — bascule sandbox / production.
- `DESIGN-INFRA-KEYWORD-METRICS` — cache permanent cross-article.

---

### DESIGN-EXT-DATAFORSEO-COSTGUARD

**Réf PRD :** [FR-EXT-DATAFORSEO-COSTGUARD](./prd.md#fr-ext-dataforseo-costguard--garde-fou-de-budget-sur-dataforseo)

**Refs code**
- [server/services/external/dataforseo-cost-guard.ts](../../server/services/external/dataforseo-cost-guard.ts) — module unique. Exporte `costGuard.reserve(endpoint, body)` (lève `CostBudgetError` si projection dépasse), `costGuard.commit(endpoint, body)` (incrémente le compteur sur succès), `costGuard.snapshot()` (lecture instantanée pour UI).
- Pricing référence : table `ENDPOINT_BASE_COST` (8 endpoints connus) + `ENDPOINT_PER_ITEM_COST` (surcharge par item pour les endpoints batch keyword_overview / search_intent).
- Endpoint inconnu : facturé à un coût de sécurité `DEFAULT_UNKNOWN_ENDPOINT_COST = 0.005 USD`.
- [server/services/external/dataforseo/_client.ts](../../server/services/external/dataforseo/_client.ts) — chaque appel à `fetchDataForSeo` passe par `costGuard.reserve()` avant et `costGuard.commit()` après succès.

**Configuration (env)**
- `DATAFORSEO_COST_BUDGET_USD` — plafond en USD sur la fenêtre. Défaut `0.50`.
- `DATAFORSEO_COST_WINDOW_MIN` — durée de la fenêtre glissante en minutes. Défaut `30`.

**Erreur exposée**
- `CostBudgetError` (classe dédiée) — porte `endpoint`, `attemptedCostUsd`, `spentUsd`, `budgetUsd`, `windowMin`. Routes API la sérialisent en code d'erreur dédié pour que le front sache distinguer un dépassement budget d'un échec API.

**Décisions d'architecture**
- **Reserve before fetch** : l'estimation tarifaire est calculée à partir du payload (body[0].keywords.length pour les batch) AVANT l'appel réseau. Un appel jamais émis ne facture rien — le garde-fou est préventif, pas réactif.
- **Sliding window en mémoire process** : pas de persistance DB (la fenêtre glissante est éphémère, ré-initialisée à chaque restart serveur — acceptable pour un usage solo). Si l'app redémarre pendant une période de scan intense, le quota est ré-armé — feature voulue, pas un bug.
- **Pricing « best effort »** : les tarifs en dur peuvent dériver des prix publics DataForSEO ; valeurs marquées explicitement comme **upper-bound de sécurité, pas vérité comptable**. Refresh manuel quand DFSeo change ses tarifs.

**Voir aussi**
- `DESIGN-EXT-DATAFORSEO` — appelant principal du cost-guard.
- `DESIGN-UI-COST-LOG` (à créer §8.15 si nécessaire) — affichage front du compteur `spentUsd / budgetUsd`.

---

### DESIGN-EXT-DATAFORSEO-SANDBOX

**Réf PRD :** [FR-EXT-DATAFORSEO-SANDBOX](./prd.md#fr-ext-dataforseo-sandbox--mode-bac-à-sable-dataforseo-pour-développer-sans-crédit)

**Refs code**
- [server/services/external/dataforseo/_client.ts](../../server/services/external/dataforseo/_client.ts) — fonctions `isSandbox()` (résout l'override navbar puis `.env`), `getBaseUrl()` (renvoie `https://sandbox.dataforseo.com/v3` ou `https://api.dataforseo.com/v3`).
- [server/services/infra/runtime-mode.service.ts](../../server/services/infra/runtime-mode.service.ts) — module qui détient le `RuntimeMode` (`'mock' | 'real' | null`) en mémoire process. `null` = pas d'override, on suit `.env`.
- [server/routes/runtime-mode.routes.ts](../../server/routes/runtime-mode.routes.ts) — endpoints `GET /api/runtime-mode` (renvoie `override`, `effective`, `envAiProvider`, `envDataforseoSandbox`) et `POST /api/runtime-mode` (mute `override`).
- [src/stores/ui/runtime-mode.store.ts](../../src/stores/ui/runtime-mode.store.ts) — `useRuntimeModeStore` côté front. Header `AUTHORITY:` à jour.

**Configuration (env)**
- `DATAFORSEO_SANDBOX=true` — opt-in explicite. Sans cette variable, le service tape la prod (décision documentée pour éviter le piège « sandbox auto en dev → prod en prod silencieuse »).

**Persistance de l'override**
- Côté front : `localStorage['runtime-mode']` + ref `useRuntimeModeStore.override`.
- Côté back : variable module dans `runtime-mode.service` (pas de DB). Restart serveur = perte de l'override. Au boot du front, `hydrate()` détecte le décalage front/back et repousse la valeur front au serveur si nécessaire.

**Décisions d'architecture**
- **Sandbox EXPLICIT, pas inféré** : ancienne implémentation utilisait `NODE_ENV !== 'production'`, ce qui silently failed sur `npm run dev` (qui ne set pas NODE_ENV). Décision de basculer sur une variable opt-in dédiée pour ne plus jamais consommer de crédits par accident — log warn explicite si on tape la prod.
- **Toggle navbar = un seul switch pour deux mondes** : `RuntimeMode='mock'` impose à la fois sandbox DataForSEO et provider IA mock côté serveur. Cohérence UX : un seul clic = pas de coût, partout.
- **Override > env** : l'override navbar prend toujours le pas sur `.env` (sinon le toggle UI serait illusoire).

**Voir aussi**
- `DESIGN-EXT-AI-MULTI-PROVIDER` — partage le même toggle global mock/real.
- `DESIGN-EXT-DATAFORSEO` — consommateur de `getBaseUrl()`.

---

### DESIGN-EXT-GSC-OAUTH

**Réf PRD :** [FR-EXT-GSC-OAUTH](./prd.md#fr-ext-gsc-oauth--connexion-google-search-console-par-oauth)

**Refs code**
- [server/services/external/gsc.service.ts](../../server/services/external/gsc.service.ts) — `getAuthUrl()`, `exchangeCode(code)`, `getValidToken()` (avec refresh auto), `isConnected()`, `loadToken()`, `saveToken()`. Helper local `refreshAccessToken(refreshToken)` qui interroge `https://oauth2.googleapis.com/token`.
- [server/routes/gsc.routes.ts](../../server/routes/gsc.routes.ts) — endpoints `GET /api/gsc/status`, `GET /api/gsc/auth` (redirect vers Google), `GET /api/gsc/callback?code=...` (échange + sauvegarde token).
- [src/stores/external/gsc.store.ts](../../src/stores/external/gsc.store.ts) — `useGscStore` côté front (`isConnected`, `checkConnection`).

**Configuration (env)**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — credentials OAuth2 enregistrés dans la console Google Cloud.
- `GOOGLE_REDIRECT_URI` — défaut `http://localhost:3400/api/gsc/callback`.

**Persistance du token**
- Stockage **fichier JSON** : `data/gsc-token.json` (`readJson` / `writeJson` via `server/utils/json-storage.ts`). Décision documentée : un seul utilisateur (outil solo), pas besoin de table — un fichier suffit et survit aux migrations DB.
- Schéma `GscToken` (cf. `shared/types/index.ts`) : `accessToken`, `refreshToken`, `expiresAt`, `scope`.

**Scope OAuth demandé**
- `https://www.googleapis.com/auth/webmasters.readonly` — lecture seule, jamais d'écriture sur le compte GSC.

**Décisions d'architecture**
- **Refresh transparent** : `getValidToken()` détecte un access token expiré (5 min de marge) et appelle silencieusement `refreshAccessToken()` avant chaque requête API. L'utilisateur n'a pas à se reconnecter tant que son refresh token est valide.
- **Token en fichier, pas en DB** : volontairement hors `external_api_cache`. C'est un secret persistant qui suit le cycle de vie de l'install, pas de la session DB.
- **Échec refresh = badge rouge** : si Google rejette le refresh (token révoqué), `getValidToken` lève une erreur que l'UI traduit en proposition de relancer le flow OAuth.

**Voir aussi**
- `DESIGN-EXT-GSC-PERFORMANCE` — consommateur de `getValidToken()`.
- `DESIGN-EXT-GSC-KEYWORD-GAP` — autre consommateur.

---

### DESIGN-EXT-GSC-PERFORMANCE

**Réf PRD :** [FR-EXT-GSC-PERFORMANCE](./prd.md#fr-ext-gsc-performance--récupération-des-données-de-performance-gsc)

**Refs code**
- [server/services/external/gsc.service.ts](../../server/services/external/gsc.service.ts) — `queryPerformance(siteUrl, startDate, endDate, dimensions?)`. Cache court via `getCached` / `setCached` (`cache_type='gsc_performance'`, TTL 24 h).
- [server/routes/gsc.routes.ts](../../server/routes/gsc.routes.ts) — endpoint `POST /api/gsc/performance` (body `{ siteUrl, startDate, endDate }`).
- [src/stores/external/gsc.store.ts](../../src/stores/external/gsc.store.ts) — action `fetchPerformance(siteUrl, startDate, endDate)`.

**Endpoint GSC consommé**
- `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query` — corps `{ startDate, endDate, dimensions }`.

**Tables consommées**
- `external_api_cache` avec `cache_type='gsc_performance'`, TTL 24 h. Key = slug `(siteUrl|startDate|endDate|dimensions)`.

**Type retourné** : `GscPerformance` (`shared/types/index.ts`) — `{ rows: GscPerformanceRow[] }` avec `query`, `page`, `clicks`, `impressions`, `ctr`, `position` par ligne.

**Décisions d'architecture**
- **Cache 24 h** : les données GSC sont rafraîchies par Google ~1× par jour, pas la peine de retaper la même requête plusieurs fois dans la journée.
- **Dimensions configurables** : la même fonction sert tri par query / page / device / country selon l'argument. Pas de duplication de logique par dimension.

**Voir aussi**
- `DESIGN-EXT-GSC-OAUTH` — fournit le token.
- `DESIGN-INFRA-API-CACHE` — backing store du cache 24 h.

---

### DESIGN-EXT-GSC-KEYWORD-GAP

**Réf PRD :** [FR-EXT-GSC-KEYWORD-GAP](./prd.md#fr-ext-gsc-keyword-gap--comparaison-entre-mots-clés-ciblés-et-indexés)

**Refs code**
- [server/services/external/gsc.service.ts](../../server/services/external/gsc.service.ts) — `analyzeKeywordGap(articleUrl, targetKeywords, siteUrl)`. Calcul des 3 listes : ciblés-et-indexés, ciblés-mais-non-indexés, indexés-mais-non-ciblés.
- [server/routes/gsc.routes.ts](../../server/routes/gsc.routes.ts) — endpoint `POST /api/gsc/keyword-gap` (body `{ articleUrl, targetKeywords, siteUrl }`).
- [src/stores/external/gsc.store.ts](../../src/stores/external/gsc.store.ts) — action `fetchKeywordGap(articleUrl, targetKeywords, siteUrl)`.

**Endpoint GSC consommé**
- `POST .../searchAnalytics/query` — filtré sur `page=articleUrl`, fenêtre 90 jours par défaut, dimension `query`.

**Type retourné** : `GscKeywordGap` (`shared/types/index.ts`) — trois listes `matched`, `missing`, `discovered` typées `GscKeywordComparison[]`.

**Tables consommées**
- `external_api_cache` (via la query performance sous-jacente).

**Décisions d'architecture**
- **Seuil 1 impression** : un mot-clé est considéré « indexé » à partir d'1 impression — pas besoin d'un clic pour valider. Décision produit (le gap est sur la visibilité, pas le trafic).
- **Fenêtre 90 jours par défaut** : assez longue pour capturer les requêtes saisonnières / long-tail, assez courte pour rester représentative du Google actuel.
- **Logique côté serveur, pas SQL** : `analyzeKeywordGap` fait un set-diff JavaScript sur deux Set normalisés (lowercase). Pas de jointure côté DB (la donnée GSC n'est pas persistée).

**Voir aussi**
- `DESIGN-EXT-GSC-PERFORMANCE` — fournit les rows brutes consommées.
- `DESIGN-EXT-GSC-OAUTH` — fournit le token.

---

### DESIGN-EXT-AI-MULTI-PROVIDER

**Réf PRD :** [FR-EXT-AI-MULTI-PROVIDER](./prd.md#fr-ext-ai-multi-provider--choix-du-fournisseur-ia-claude-gemini-openrouter-simulation)

**Refs code**
- [server/services/external/ai-provider.service.ts](../../server/services/external/ai-provider.service.ts) — dispatcher central. Type `AIProvider = 'claude' | 'gemini' | 'openrouter' | 'mock'`. Fonctions clés : `getProvider()` (lit override navbar > `.env`), `getProviderChain()`, `streamChatCompletion()`, `classifyWithTool()`, `calculateCost()`.
- [server/services/external/claude.service.ts](../../server/services/external/claude.service.ts), [gemini.service.ts](../../server/services/external/gemini.service.ts), [openrouter.service.ts](../../server/services/external/openrouter.service.ts), [mock.service.ts](../../server/services/external/mock.service.ts) — implémentations par provider.
- [server/services/external/mock-fixtures/](../../server/services/external/mock-fixtures/) — réponses déterministes pour le provider mock (`brief.ts`, `discovery.ts`, `generate.ts`, `intent.ts`, `long-tail-suggest.ts`, `radar.ts`, `strategy.ts`, `streams.ts`, `content-gap.ts`).
- [server/services/infra/runtime-mode.service.ts](../../server/services/infra/runtime-mode.service.ts) — toggle navbar global mock/real (partagé avec DataForSEO sandbox).
- [src/stores/ui/runtime-mode.store.ts](../../src/stores/ui/runtime-mode.store.ts) — store front qui pilote le toggle.

**Configuration (env)**
- `AI_PROVIDER` — `'claude' | 'gemini' | 'openrouter' | 'mock'`. Défaut `'claude'`.
- `AI_PROVIDER_NO_FALLBACK=1` — désactive la chaîne de fallback (debug provider isolé).
- `MOCK_LATENCY_MS` — latence simulée du provider mock (défaut 200 ms) pour valider les états loading côté UI.

**Décisions d'architecture**
- **Provider résolu à chaque appel** : `getProvider()` lit l'override navbar à chaque dispatch. Pas de cache → bascule à chaud sans redémarrer.
- **Mock hors chaîne de fallback** : `AI_PROVIDER=mock` se contente à `['mock']` (pas de fallback vers Claude). C'est un provider explicite pour tests, pas une roue de secours.
- **`USAGE_SENTINEL` final côté stream** : tous les providers émettent un marker `__USAGE__{...}` en fin de stream pour que le client extraie l'usage (parity Claude ↔ Gemini ↔ OpenRouter ↔ Mock).
- **Cost normalisé** : `calculateCost(usage)` route vers la pricing table du bon provider (Claude variable selon modèle, Gemini ~$0 sur free tier, OpenRouter $0 sur `:free`, Mock $0).

**Voir aussi**
- `DESIGN-EXT-AI-FALLBACK` — chaîne de bascule.
- `DESIGN-EXT-CLAUDE` / `DESIGN-EXT-GEMINI` — implémentations.
- `DESIGN-EXT-DATAFORSEO-SANDBOX` — partage le même toggle navbar.

---

### DESIGN-EXT-AI-FALLBACK

**Réf PRD :** [FR-EXT-AI-FALLBACK](./prd.md#fr-ext-ai-fallback--bascule-automatique-entre-fournisseurs-ia-en-cas-de-saturation)

**Refs code**
- [server/services/external/ai-provider.service.ts](../../server/services/external/ai-provider.service.ts) — fonctions internes `withRetry()` (backoff exponentiel sur erreur retryable), `withFallbackChain()` (enchaîne providers de `getProviderChain()`).
- Ordre canonique : `CANONICAL_ORDER = ['claude', 'gemini', 'openrouter']`. Le primary (`AI_PROVIDER`) passe en premier, les autres suivent dans l'ordre canonique en excluant le primary.
- Erreurs typées : `AIProviderQuotaError(provider, message)`, `AIProviderOverloadedError(provider, message)` — uniquement ces deux types déclenchent le fallback. Tout autre type d'erreur (réseau, bug applicatif) remonte tel quel.

**Configuration (env)**
- `AI_PROVIDER_NO_FALLBACK=1` — la chaîne se réduit à `[primary]`. Utilisé en debug pour voir les vraies erreurs sans qu'elles soient masquées par un fallback.

**Décisions d'architecture**
- **Retry avant fallback** : sur le primary, jusqu'à 2 retries en backoff exponentiel pour absorber un overload passager. Le fallback ne se déclenche qu'après ces retries.
- **Fallback typé strict** : seules `Quota` et `Overloaded` (status 429/529/503) sont des signaux de saturation provider. Une erreur 400 (mauvais prompt), 401 (clé invalide), ou réseau aléatoire ne déclenche **pas** le fallback — elle révèle un vrai problème côté primary, masquer reviendrait à perdre du diagnostic.
- **Log explicite** : chaque bascule logue `fallback to <provider> (primary exhausted)` pour que l'utilisateur trace la cause dans la pile d'activité.
- **Stream initial** : pour `streamChatCompletion`, le fallback se déclenche **avant le premier token** émis. Si Claude commence à streamer puis crashe en milieu de stream, on remonte l'erreur (changer de provider en cours de stream casserait la cohérence du contenu).

**Voir aussi**
- `DESIGN-EXT-AI-MULTI-PROVIDER` — fournit `getProviderChain()`.
- `DESIGN-EXT-CLAUDE` / `DESIGN-EXT-GEMINI` — émetteurs d'erreurs typées.

---

### DESIGN-EXT-CLAUDE

**Réf PRD :** [FR-EXT-CLAUDE](./prd.md#fr-ext-claude--intégration-du-fournisseur-ia-claude-anthropic)

**Refs code**
- [server/services/external/claude.service.ts](../../server/services/external/claude.service.ts) — wrapper SDK Anthropic. Fonctions : `streamChatCompletion()`, `classifyWithTool<T>(systemPrompt, userPrompt, tool, model?, maxTokens?)` (force tool_use), `calculateCost(model, inputTokens, outputTokens, cacheRead?, cacheCreation?)`.
- SDK : `@anthropic-ai/sdk` (cf. `package.json` — version figée par CLAUDE.md §8).
- Pricing table (per million tokens, snapshot 2026) :
  - `claude-sonnet-4-6` / `claude-sonnet-4-5-20250514` : $3 in / $15 out.
  - `claude-haiku-4-5-20251001` : $0.8 in / $4 out.
  - `claude-opus-4-6` : $15 in / $75 out.
- Cache discount Anthropic (ephemeral cache) : -90 % sur cache_read, +25 % sur cache_creation — répercuté dans `calculateCost`.

**Configuration (env)**
- `ANTHROPIC_API_KEY` — requis.
- `CLAUDE_MODEL` — modèle par défaut. Recommandation : `claude-haiku-4-5-20251001` pour le dev (cheap), `claude-sonnet-4-6` pour la prod (équilibré).

**Décisions d'architecture**
- **Tool use pour la sortie structurée** : `classifyWithTool` force Claude à émettre le JSON via `tool_use`, garantissant le schéma. Pas de parsing fragile sur du texte libre.
- **Pricing en dur, pas par API** : Anthropic n'expose pas de billing API pour récupérer le tarif live ; on garde une table en code refresh à la main (commenté avec date du snapshot).
- **Erreur 529 = AIProviderOverloadedError** : mappée par `ai-provider.service.ts` pour déclencher le fallback.

**Voir aussi**
- `DESIGN-EXT-AI-MULTI-PROVIDER` — Claude est le provider par défaut.
- `DESIGN-EXT-AI-FALLBACK` — Claude saturé → Gemini.

---

### DESIGN-EXT-GEMINI

**Réf PRD :** [FR-EXT-GEMINI](./prd.md#fr-ext-gemini--intégration-du-fournisseur-ia-gemini-google)

**Refs code**
- [server/services/external/gemini.service.ts](../../server/services/external/gemini.service.ts) — wrapper SDK `@google/genai`. Fonctions : `streamChatCompletion()` (mode streaming), `classifyJsonGemini<T>()` (mode JSON forcé via `responseMimeType: 'application/json'`).
- Pricing table (per million tokens, snapshot 2026) :
  - `gemini-2.0-flash` / `gemini-2.0-flash-lite` : $0 (free tier, symbolique).
  - `gemini-2.5-flash` : $0.10 in / $0.40 out (paid).
  - `gemini-2.5-pro` : $1.25 in / $10.00 out (paid).

**Configuration (env)**
- `VITE_GEMINI_API_KEY` — clé API (le préfixe `VITE_` est historique, lue côté serveur).
- `GEMINI_PROJET_NAME` / `GEMINI_PROJET_ID` — métadonnées projet Google Cloud.
- `GEMINI_MODEL` — défaut `gemini-2.0-flash` (gratuit + rapide).

**Rate-limits documentés**
- Free tier Flash : ~15 req/min, 1 M tokens/jour.
- Erreurs `429 RESOURCE_EXHAUSTED` et `503 UNAVAILABLE` sont mappées sur les types `Quota` / `Overloaded` pour déclencher le fallback.

**Décisions d'architecture**
- **JSON natif via SDK** : Gemini accepte `responseMimeType: 'application/json'` (+ éventuellement `responseSchema`) pour garantir un parsing sans regex. Si Gemini renvoie un JSON invalide malgré tout, l'erreur remonte explicitement et le fallback se déclenche.
- **Pas d'ephemeral cache** : à la différence d'Anthropic, Gemini n'a pas de mécanisme cache système — on envoie le prompt complet à chaque appel. Conséquence : éviter Gemini sur les prompts ultra-longs récurrents (préférer Claude avec cache).
- **Pricing symbolique sur free tier** : valeurs `$0` pour que `calculateCost` reste cohérent et la pile d'activité affiche `~$0.00` au lieu de masquer la ligne.

**Voir aussi**
- `DESIGN-EXT-AI-MULTI-PROVIDER` — Gemini est le premier fallback.
- `DESIGN-EXT-AI-FALLBACK` — bascule depuis Claude.

---

### DESIGN-EXT-EMBEDDINGS

**Réf PRD :** [FR-EXT-EMBEDDINGS](./prd.md#fr-ext-embeddings--calcul-de-similarité-sémantique-avec-un-modèle-local-huggingface)

**Refs code**
- [server/services/external/embedding.service.ts](../../server/services/external/embedding.service.ts) — `computeSemanticScores(topic, texts)`. Charge paresseusement le modèle, calcule la similarité cosinus avec préfixes E5 (`query:` pour topic, `passage:` pour chaque texte).
- Modèle : `Xenova/multilingual-e5-small` (HuggingFace, multilingue dont français).
- SDK : `@huggingface/transformers` (cf. CLAUDE.md §8, version 3.8.1).

**Décisions d'architecture**
- **Lazy-load au premier usage** : le premier appel à `computeSemanticScores` déclenche `pipeline('feature-extraction', MODEL_ID)`. ~60 s de chargement initial. Décision : ne pas pré-charger au boot serveur (coûte 60 s × N redémarrages dev), préférer un premier appel lent.
- **Singleton mémoire process** : une fois chargé, le pipeline reste en mémoire pour toute la session serveur. Restart = re-chargement.
- **Dégradation gracieuse** : si le chargement échoue (timeout, environnement restreint), `computeSemanticScores` retourne `null`. Les consommateurs (Radar pertinence sémantique) traitent `null` comme « score indisponible » et masquent l'affichage — l'app continue à tourner sans cette feature.
- **Préfixes E5 obligatoires** : les modèles E5 exigent `query:` côté requête et `passage:` côté documents pour produire des scores comparables. Ces préfixes sont appliqués automatiquement par `computeSemanticScores` — pas exposé à l'appelant.
- **100 % local** : aucun appel réseau, aucune facture. C'est le seul provider IA garanti sans coût.

**Voir aussi**
- `DESIGN-RAD-RESONANCE` (à créer §8.5) — consommateur de la pertinence sémantique côté Radar.

---

### DESIGN-EXT-AUTOCOMPLETE-GOOGLE

**Réf PRD :** [FR-EXT-AUTOCOMPLETE-GOOGLE](./prd.md#fr-ext-autocomplete-google--suggestions-dautocomplétion-google)

**Refs code**
- [server/services/keyword/autocomplete.service.ts](../../server/services/keyword/autocomplete.service.ts) — `fetchAutocomplete(keyword)`. Rate-limited à 1 req/s (cf. `rateLimitWait`). Retourne `AutocompleteSignal { autocompleteSource: 'google', autocompleteSuggestions: AutocompleteEntry[] }` ou liste vide en cas de rejet Google.
- Endpoint Google consommé : `https://suggestqueries.google.com/complete/search?client=firefox&q=...` (JSON public).
- Consommateurs principaux : `server/routes/keyword-scan.routes.ts` (scan Radar), `server/routes/keywords.routes.ts` (validate-pain + audit), `server/services/intent/intent-scan.service.ts` (résonance topic).

**Tables consommées**
- `keyword_autocomplete` (cf. `server/db/schema.sql:144-154`) — FK vers `keyword_metrics(keyword, lang, country)`. Stocke `autocompleteSuggestions` (texte + position).
- TTL effectif : 24 h si suggestions non vides, 30 min si liste vide (revérification rapide d'une racine peu populaire).

**Décisions d'architecture**
- **Rate-limit 1 req/s in-process** : Google quarantines vite si on tape trop fort. `rateLimitWait` introduit une attente minimale entre deux requêtes au sein du process serveur.
- **Liste vide = signal valide, pas erreur** : si Google rejette ou ne propose rien, on enregistre `autocompleteSuggestions: []` plutôt que de remonter une erreur bloquante. L'utilisateur voit juste « pas de pépite » à cette racine.
- **Cache DB-first** : `fetchAutocomplete` consulte d'abord `keyword_metrics` via la jointure ; si la donnée est fraîche, aucun appel à Google n'est émis.
- **Localisation dans `services/keyword/`, pas `services/external/`** : conséquence historique — la fonction sert aussi des étapes purement métier (validate-pain) et reste dans le domaine `keyword/`. Voir DRIFT-016.

**Voir aussi**
- `DESIGN-INFRA-KEYWORD-METRICS` — backing store du cache permanent.
- `DESIGN-RAD-RESONANCE` (à créer §8.5) — un consommateur côté Radar.

---

## §8.14 — Infrastructure transversale (DESIGN-INFRA)

> **Rôle de cette section.** Les FR-INFRA du PRD décrivent des invariants techniques que l'utilisateur **ne voit pas directement** mais qui conditionnent toute son expérience : caches qui évitent de re-payer, wrapper réseau qui standardise les erreurs, persistance qui ramène l'utilisateur exactement où il s'était arrêté. Ce registre §8.14 est la **vue inverse** des FR-INFRA : pour chaque invariant, on cite les fichiers réels, les tables consommées, les stores Pinia mobilisés, les watchers load-bearing. Pour les FR-INFRA qui décrivent une table persistée, le bloc « Flux DB » et les références au schéma `server/db/schema.sql` priment ; pour celles qui décrivent un invariant pur (no-fallback, KPI-consistency), le bloc « Décisions d'architecture » et les tests architecturaux priment.

---

### DESIGN-INFRA-API-CACHE

**Réf PRD :** [FR-INFRA-API-CACHE](./prd.md#fr-infra-api-cache--cache-court-des-appels-externes)

**Refs code**
- [server/db/cache-helpers.ts](../../server/db/cache-helpers.ts) lignes 13-49 — helpers atomiques `getCached(cacheType, cacheKey)`, `setCached(cacheType, cacheKey, data, ttlMs)`, `deleteCached(cacheType, cacheKey)`.
- [server/db/schema.sql](../../server/db/schema.sql) lignes 121-130 — table `external_api_cache(id SERIAL PK, cache_key TEXT, cache_type TEXT, data JSONB, cached_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NOT NULL, UNIQUE(cache_key, cache_type))`.

**Types de cache observés (cache_type)** : `paa`, `serp`, `radar`, `discovery`, `autocomplete`, `intent`, `longtail`, et alii — chaque service externe choisit son `cacheType` + TTL.

**Flux DB**
*Lecture* : appelant → `getCached(type, key)` → `SELECT data FROM external_api_cache WHERE cache_type = $1 AND cache_key = $2 AND expires_at > NOW()` → renvoie `data` ou `null`.
*Écriture* : appelant → `setCached(type, key, data, ttlMs)` → `INSERT … ON CONFLICT (cache_key, cache_type) DO UPDATE SET data, cached_at = NOW(), expires_at = EXCLUDED.expires_at`.

**Décisions d'architecture**
- **Unique table multi-types** : un seul `external_api_cache` héberge tous les types (vs une table par fournisseur). Garde le schéma plat et le job de purge unique (DESIGN-INFRA-API-CACHE-PURGE).
- **JSONB opaque** : la colonne `data` est neutre, chaque service est responsable de sa propre sérialisation.

**Voir aussi**
- `DESIGN-INFRA-API-CACHE-PURGE` — job de purge horaire.
- `DESIGN-INFRA-GET-OR-FETCH` — pattern cache-first utilisateur de `getCached`/`setCached`.
- `DESIGN-INFRA-KEYWORD-METRICS` — cache permanent disjoint (table dédiée pour les KPI).

---

### DESIGN-INFRA-API-CACHE-PURGE

**Réf PRD :** [FR-INFRA-API-CACHE-PURGE](./prd.md#fr-infra-api-cache-purge--nettoyage-automatique-du-cache-court)

**Refs code**
- [server/index.ts](../../server/index.ts) lignes 113-123 — `setInterval(async () => { … DELETE FROM external_api_cache WHERE expires_at < NOW() }, 60 * 60 * 1000)`.

**Flux DB**
*Job horaire* : timer Node `setInterval(60 × 60 × 1000ms)` → `pool.query('DELETE FROM external_api_cache WHERE expires_at < NOW()')` → log debug du `rowCount` purgé.

**Décisions d'architecture**
- **`setInterval` plutôt que cron** : single-process Node, pas de scheduler externe. Acceptable pour un outil solo.
- **Pas de purge synchrone** : la lecture (`getCached`) filtre déjà `expires_at > NOW()`, donc une ligne périmée n'est jamais servie même si la purge n'a pas encore tourné. La purge est un nettoyage de fond, pas un mécanisme de correction.

---

### DESIGN-INFRA-KEYWORD-METRICS

**Réf PRD :** [FR-INFRA-KEYWORD-METRICS](./prd.md#fr-infra-keyword-metrics--cache-permanent-des-kpi-mot-clé)

**Refs code**
- [server/services/keyword/keyword-metrics.service.ts](../../server/services/keyword/keyword-metrics.service.ts) — `getKeywordMetrics(keyword)`, `upsertKeywordKpis`, `upsertKeywordAutocomplete`, `upsertKeywordPaa`, `isKeywordMetricsFresh(fetchedAt, days)`. Le header `AUTHORITY:` du fichier liste les producteurs/consommateurs.
- [server/db/schema.sql](../../server/db/schema.sql) lignes 179-198 — table `keyword_metrics(keyword TEXT, lang TEXT DEFAULT 'fr', country TEXT DEFAULT 'fr', search_volume INTEGER, keyword_difficulty INTEGER, cpc NUMERIC, competition NUMERIC, intent_raw NUMERIC, autocomplete_suggestions JSONB, autocomplete_source TEXT, paa_questions JSONB, fetched_at TIMESTAMPTZ, local_analysis JSONB, content_gap_analysis JSONB, local_comparison JSONB, intent_label TEXT, PRIMARY KEY (keyword, lang, country))`. Contraintes : `intent_label` ∈ { commercial, transactional, informational, navigational, null }.

**Tables liées (FK)** : `keyword_paa_questions`, `keyword_serp_results`, `keyword_serp_scrapes` (toutes FK sur `keyword_metrics(keyword, lang, country)`, suppression en cascade).

**Stores Pinia consommateurs**
- `useArticleKeywordsStore` — hydrate les KPIs cachés à l'ouverture d'un article (via endpoints `keyword-queries`).
- `useRadarExplorationStore` — lit le KPI block dans `scan_result.cards`.
- Composables `useResonanceScore`, `useCaptainRelevance` — relient les valeurs cachées à l'UI.

**Décisions d'architecture**
- **Clé composite `(keyword, lang, country)`** : permet de garder les KPIs FR + EN sans collision.
- **Freshness 7 jours par défaut** : appliquée par les services consommateurs, pas par la DB. Au-delà, refetch silencieux.
- **COALESCE systématique** : `upsertKeywordKpis` n'écrase jamais une valeur existante par `null` (header `AUTHORITY:` du fichier). Évite la régression silencieuse quand DataForSEO renvoie partiel.

**Voir aussi**
- `DESIGN-INFRA-PAA-CACHE` — accès spécialisé aux PAA via `keyword_metrics.paa_questions` (cf. DRIFT-018).
- `DESIGN-MOT-RAW-KPIS` — exposition des KPIs côté Moteur.
- `DESIGN-INFRA-KPI-NULLABLE` — propagation `null` end-to-end depuis cette table.

---

### DESIGN-INFRA-PAA-CACHE

**Réf PRD :** [FR-INFRA-PAA-CACHE](./prd.md#fr-infra-paa-cache--cache-des-questions-people-also-ask)

**Refs code**
- [server/services/infra/paa-cache.service.ts](../../server/services/infra/paa-cache.service.ts) — `readPaaCache(keyword, requiredDepth)`, `writePaaCache(entry)`.

**Backing store réel** : pas de table `paa_cache` dédiée — le service lit / écrit dans `keyword_metrics.paa_questions` (JSONB) via `getKeywordMetrics` + `upsertKeywordPaa`. **Cf. DRIFT-018** : le PRD pré-migration annonçait une table `paa_cache(keyword + depth)` distincte avec TTL 90 jours, alors que la réalité du code est une colonne JSONB de `keyword_metrics` avec freshness 1 jour (non-empty) / 30 min (empty).

**Décisions d'architecture**
- **Réutilisation de `keyword_metrics`** : un PAA est attaché à un mot-clé, donc cohabite logiquement avec ses autres KPIs. Pas de jointure cross-table nécessaire.
- **Depth-aware** : la cache vérifie `Math.max(...paaQuestions.map(q => q.depth))` ≥ `requiredDepth` avant de servir, pour ne pas masquer un manque de profondeur.

**Voir aussi**
- `DESIGN-INFRA-KEYWORD-METRICS` — backing store réel.
- `DRIFT-018` — divergence PRD vs code sur la table cible et le TTL.

---

### DESIGN-INFRA-GET-OR-FETCH

**Réf PRD :** [FR-INFRA-GET-OR-FETCH](./prd.md#fr-infra-get-or-fetch--discipline-cache-dabord-fetch-ensuite)

**Refs code (pattern reproduit, pas helper centralisé — cf. DRIFT-009)**
- [server/services/keyword/community-discussions.service.ts](../../server/services/keyword/community-discussions.service.ts) lignes 5-... — réimplémentation locale du pattern.
- [server/services/keyword/keyword-discovery.service.ts](../../server/services/keyword/keyword-discovery.service.ts) lignes 11-... — idem.
- [server/services/intent/intent-scan.service.ts](../../server/services/intent/intent-scan.service.ts) — variante avec freshness.
- Helpers atomiques disponibles : [server/db/cache-helpers.ts](../../server/db/cache-helpers.ts) `getCached` + `setCached`.

**Décisions d'architecture**
- **Pattern dupliqué assumé temporairement** : `cache-helpers.ts` n'expose pas de `getOrFetch<T>(cacheType, key, ttlMs, fetcher)` centralisé. Chaque service réimplémente la cascade `cache → fetch → setCached`. C'est documenté comme dette en `DRIFT-009`.
- **Discipline par convention** : CLAUDE.md anti-pattern « appel API externe sans consulter le cache d'abord » + audit data-flow-discipline.

**Voir aussi**
- `DRIFT-009` — `getOrFetch` n'est pas un helper centralisé.

---

### DESIGN-INFRA-API-WRAPPER

**Réf PRD :** [FR-INFRA-API-WRAPPER](./prd.md#fr-infra-api-wrapper--point-dentrée-unique-pour-tous-les-appels-backend)

**Refs code**
- [src/services/api.service.ts](../../src/services/api.service.ts) — exports `apiGet<T>(path, options?)` (ligne 94), `apiPost<T>(path, body, options?)` (ligne 106), `apiDelete<T>` (ligne 124), `apiPatch<T>` (ligne 135), `apiPut<T>` (ligne 151), `apiStream<T>` (ligne 275).
- Helpers internes : `pushUsageIfPresent(path, data)` (cost-log injection ligne 17), `pushDbOpsIfPresent(path, container)` (DB ops tracking ligne 36), `KNOWN_ERROR_CODES` map (lignes 55-68 : `DATAFORSEO_QUOTA_EXCEEDED`, `AI_PROVIDER_QUOTA_EXCEEDED`, `AI_PROVIDER_OVERLOADED`), `handleApiError(res, method, path)` (lignes 81-91).

**Stores Pinia mobilisés**
- `useCostLogStore` — destinataire des `addEntry` (api usage), `addDbEntry` (db ops), `addMessage` (erreurs connues).

**Décisions d'architecture**
- **Périmètre `/api/*` uniquement** : le wrapper ne gère que le trafic interne front → backend de l'app. Les appels `fetch` du backend vers les API tierces (`server/services/external/*` : DataForSEO, Google OAuth, GSC, OpenRouter, Tavily, Google Suggest) sont volontairement hors wrapper — chaque occurrence porte un commentaire `// External API call — bypass wrapper by design` (cf. NFR-OBS-EXTERNAL-API-OPT-OUT).
- **Streaming SSE séparé** : les endpoints POST → SSE passent par `apiStream` (DESIGN-INFRA-API-STREAM), pas par `apiPost`.
- **Audit data-flow-discipline** : critère mesurable — 0 violation « fetch() directs hors wrapper » côté `src/`. Dette résorbée le 2026-05-05 (chantier `tech-spec-fetch-to-wrapper-migration`).

**Critères d'acceptation techniques**
- AC.WRAP.1 : `grep -r "fetch(" src/` retourne 0 occurrence non-commentée hors `api.service.ts`.
- AC.WRAP.2 : un endpoint qui retourne un payload `{ data, usage }` voit son `usage` injecté dans `useCostLogStore` sans intervention du composant appelant.
- AC.WRAP.3 : un 429 avec `error.code = DATAFORSEO_QUOTA_EXCEEDED` produit un message d'erreur lisible dans la pile d'activité.

**Voir aussi**
- `DESIGN-INFRA-API-STREAM` — variante SSE.
- `DESIGN-INFRA-COST-LOG-STORE` — destination des entries.
- `DESIGN-INFRA-ERROR-HANDLER` — côté serveur, traduction `Error → { code, message }`.

---

### DESIGN-INFRA-API-STREAM

**Réf PRD :** [FR-INFRA-API-STREAM](./prd.md#fr-infra-api-stream--streaming-sse-unifié-pour-lia-progressive)

**Refs code**
- [src/services/api.service.ts](../../src/services/api.service.ts) ligne 275+ — `apiStream<T>(path, body, callbacks?, options?)`.
- [src/composables/editor/useStreaming.ts](../../src/composables/editor/useStreaming.ts) — composable réactif (refs `isStreaming`, `currentText`) + helper `startStreamOnce`, tous deux thin wrappers sur `apiStream`.
- Tests : [tests/unit/services/api.service.test.ts](../../tests/unit/services/api.service.test.ts) — 8 cas dédiés « FR-INFRA-API-STREAM ».

**Endpoints consommateurs SSE**
- `/api/generate/action` (actions IA contextuelles éditeur).
- `/api/generate/article` (génération full d'un article section par section).
- `/api/generate/outline` (génération d'outline).
- `/api/keywords/:kw/ai-panel` (panel IA Capitaine).
- Et autres routes `generate/*` du Moteur (RadarAiPanel, LexiqueAiPanel, LieutenantsAiPanel).

**Callbacks supportés** : `onChunk` (texte cumulatif), `onChunkRaw` (par chunk), `onDone`, `onUsage`, `onSectionStart`, `onSectionDone`, `onError`. Retour final : `{ result, usage, errorMessage, aborted }`.

**Décisions d'architecture**
- **Sentinel `[DONE]`** : convention pour signaler la fin du stream avant fermeture EventSource.
- **Cost-log injection** : à la réception de `onUsage`, l'API stream pousse l'`usage` final dans `useCostLogStore`, miroir d'`apiPost`. Garantit la traçabilité coût uniforme.
- **Abort propre** : `AbortSignal` propagé, le serveur ne reste pas suspendu.

**Voir aussi**
- `DESIGN-INFRA-API-WRAPPER` — équivalent non-streaming.
- `DESIGN-RED-ARTICLE` (§8.10) — consommateur principal du stream `/api/generate/article`.

---

### DESIGN-INFRA-ZOD-SHARED

**Réf PRD :** [FR-INFRA-ZOD-SHARED](./prd.md#fr-infra-zod-shared--validation-des-contrats-frontback)

**Refs code**
- [shared/schemas/](../../shared/schemas/) — répertoire des schémas partagés. **13 fichiers** au 2026-05-12 (count vérifié `find shared -name "*.schema.ts"`) — le PRD pré-migration annonçait « ~41 », c'est la marque d'un comptage hérité d'une époque où chaque type avait son fichier. Cf. **DRIFT-017**.
- Schémas représentatifs : `article.schema.ts`, `article-progress.schema.ts`, `article-micro-context.schema.ts`, `dataforseo.schema.ts`, `discovery-cache.schema.ts`, `generate.schema.ts`, `keyword.schema.ts`, `linking.schema.ts`, `long-tail-suggestions.schema.ts`, `serp-analysis.schema.ts`, `shared-enums.schema.ts`, `strategy.schema.ts`, `theme-config.schema.ts`.
- Validation runtime : `safeParse` dans les routes Express ; côté front, types TS inférés via `z.infer<typeof ...>`.

**Décisions d'architecture**
- **Schémas partagés au sens littéral** : un même fichier `.schema.ts` exporte la définition utilisée des deux côtés. Zéro divergence possible front/back.
- **Pas de schéma 1:1 avec chaque endpoint** : un endpoint peut composer plusieurs schémas (body validé par un, response inférée d'un autre).

**Voir aussi**
- `DRIFT-017` — comptage de schémas dans le PRD pré-migration (41 annoncés, 13 réels).
- `NFR-INT-ZOD-VALIDATION`, `NFR-SEC-ZOD-INPUT` — invariants NFR.

---

### DESIGN-INFRA-PROMPT-LOADER

**Réf PRD :** [FR-INFRA-PROMPT-LOADER](./prd.md#fr-infra-prompt-loader--prompts-ia-agnostiques--injection-sécurisée)

**Refs code**
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — `loadPrompt(filename, variables?, options?)` lit depuis `server/prompts/`, substitue `{{variable}}` et blocs conditionnels `{{#conditional}}…{{/conditional}}`.
- Helpers de construction de contexte : `buildCocoonStrategyBlock(strategy)` (lignes 54-70), `buildMicroContextBlock`, `buildKeywordContext`, `buildThemeContextBlock`. Disposés dans le même fichier ou des modules `*-context.ts` voisins.
- Hardening prompt injection : `escapePromptContent(raw)` (lignes 43-52) — neutralise `\n\nHuman:`, `<system>`, `</system>`, `<user-content>`, `</user-content>`, `{{`, `}}` puis enveloppe le résultat dans `<user-content>...</user-content>`. Tableau `INSTRUCTION_SEQUENCES` (lignes 32-41).
- Header explicite « WARNING — Prompt injection hardening » (lignes 1-10) interdit `loadPrompt` sur contenu utilisateur sans `options.escapeKeys`.

**Décisions d'architecture**
- **Prompt = .md agnostique** : aucune logique conditionnelle, aucun import. Les `.md` restent éditables par un rédacteur non-développeur.
- **Helpers de contexte coopératifs** : si une donnée est absente (cocoon sans stratégie, article sans micro-contexte), le helper retourne `''` plutôt que d'injecter un placeholder ambigu — la variable substituée disparaît, le prompt reste lisible.
- **Escape one-way** : `escapePromptContent` encode les séquences sensibles en `\u00XX` ; pas de désencodage côté Claude, le texte reste lisible mais inoffensif.

**Voir aussi**
- `NFR-SEC-PROMPT-INJECTION`, `NFR-INT-PROMPT-AGNOSTIC`, `NFR-INT-STRATEGY-OPTIONAL`.

---

### DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS

**Réf PRD :** [FR-INFRA-WORKFLOW-CHECKS-CONSTANTS](./prd.md#fr-infra-workflow-checks-constants--source-unique-des-checks-workflow)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts) lignes 1-63 — sources de toutes les chaînes de checks workflow.

**Inventaire des constantes (vérifié 2026-05-12)**
| Workflow | Constante | Valeur string |
|---|---|---|
| Moteur (5) | `MOTEUR_DISCOVERY_DONE` | `moteur:discovery_done` |
| | `MOTEUR_RADAR_DONE` | `moteur:radar_done` |
| | `MOTEUR_CAPITAINE_LOCKED` | `moteur:capitaine_locked` |
| | `MOTEUR_LIEUTENANTS_LOCKED` | `moteur:lieutenants_locked` |
| | `MOTEUR_LEXIQUE_VALIDATED` | `moteur:lexique_validated` |
| Cerveau (3) | `CERVEAU_STRATEGY_DEFINED` | `cerveau:strategy_defined` |
| | `CERVEAU_HIERARCHY_BUILT` | `cerveau:hierarchy_built` |
| | `CERVEAU_ARTICLES_PROPOSED` | `cerveau:articles_proposed` |
| Rédaction (5) | `REDACTION_BRIEF_VALIDATED` | `redaction:brief_validated` |
| | `REDACTION_OUTLINE_VALIDATED` | `redaction:outline_validated` |
| | `REDACTION_CONTENT_WRITTEN` | `redaction:content_written` |
| | `REDACTION_SEO_VALIDATED` | `redaction:seo_validated` |
| | `REDACTION_PUBLISHED` | `redaction:published` |

Plus les agrégats : `MOTEUR_CHECKS`, `CERVEAU_CHECKS`, `REDACTION_CHECKS`, `ALL_WORKFLOW_CHECKS`, type `WorkflowCheck`.

**Stockage** : colonne `articles.completed_checks` TEXT[] (cf. [server/db/schema.sql](../../server/db/schema.sql) ligne 74). SSOT unique pour la progression (cf. NFR-INT-COMPLETED-CHECKS-SSOT).

**Décisions d'architecture**
- **Préfixe par workflow** : `moteur:*` / `cerveau:*` / `redaction:*` évite les collisions dans une seule colonne flat.
- **Constantes immuables `as const`** : tableaux et types dérivés via `typeof ALL_WORKFLOW_CHECKS[number]`.
- **Status `CERVEAU_*`** : les 3 constantes existent mais aucun composant front ne les émet à ce jour (cf. DRIFT-002). C'est une promesse PRD non câblée — pas un bug de cette FR-INFRA, mais à signaler dans `DESIGN-CER-CHECKS`.

**Voir aussi**
- `DESIGN-MOT-CHECKS-CONSTANTS` (§8.3) — application côté Moteur.
- `DRIFT-002` — constantes Cerveau non émises.
- `DRIFT-010` — migration `020_normalize_completed_checks.sql` archivée (post-normalisation).

---

### DESIGN-INFRA-SCORE-MODULE

**Réf PRD :** [FR-INFRA-SCORE-MODULE](./prd.md#fr-infra-score-module--module-score-unifié)

**Refs code**
- [shared/score/index.ts](../../shared/score/index.ts) — point d'entrée unique du module (re-exports).
- [shared/score/types.ts](../../shared/score/types.ts) — type `Score = number | null` explicite.
- [shared/score/format.ts](../../shared/score/format.ts) — helpers d'affichage : `formatScore`, `formatVolume`, `formatCpc`, `formatKd`, `formatPercent`. Tous retournent `'—'` pour `null` / `undefined`.
- [shared/score/compare.ts](../../shared/score/compare.ts) — `compareScores(a, b)` (descending, `null` en bas), `compareScoresAsc`, `compareScoresAscNullsLast`.
- [shared/score/aggregate.ts](../../shared/score/aggregate.ts) — `averageScores`, `maxScore`, `minScore`, `countValidScores`.

**Garde-fou architectural** : [.dependency-cruiser.cjs](../../.dependency-cruiser.cjs) règle `score-internal-only-via-index` (lignes 58-72) — `shared/score/{types,format,compare,aggregate}.ts` ne sont importables QUE depuis `shared/score/` lui-même. Tout consommateur externe passe par `shared/score/index.ts` (ou son alias `@shared/score`).

**Décisions d'architecture**
- **Un seul point d'entrée index** : permet de réagencer les fichiers internes (split, fusion) sans casser les imports consommateurs.
- **Type `Score = number | null`** : `null` est explicitement représentable et propagé.
- **Helpers symétriques affichage/calcul** : `formatVolume` produit la cellule, `compareScores` produit le tri sur la même donnée. Discipline imposée par les FR-INFRA-KPI-CONSISTENCY.

**Voir aussi**
- `DESIGN-INFRA-NO-SCORE-FALLBACK` — règle ESLint complémentaire.
- `DESIGN-INFRA-KPI-NULLABLE` — propagation `null` end-to-end.
- `DESIGN-INFRA-DEPENDENCY-CRUISER` — règle d'architecture qui verrouille le module.

---

### DESIGN-INFRA-NO-SCORE-FALLBACK

**Réf PRD :** [FR-INFRA-NO-SCORE-FALLBACK](./prd.md#fr-infra-no-score-fallback--interdiction-du-fallback-silencieux-sur-score)

**Refs code**
- [eslint.config.ts](../../eslint.config.ts) lignes 49-79 — règle `no-restricted-syntax` (3 sélecteurs AST) qui matche `xxxScore ?? 0`, `obj.someScore ?? 0`, `obj.something.score?.total ?? 0` (chemins MemberExpression où la dernière ou avant-dernière propriété matche `/[Ss]core/`).
- Exception au sein du module : lignes 86-92 — `files: ['shared/score/**/*.ts', 'tests/unit/shared/score.test.ts']` désactive la règle (l'implémentation a le droit aux `0` dans ses calculs internes).

**Couverture réelle de la regex** : le sélecteur AST cible **`Score`** (insensible à la casse) uniquement. Les KPI marché `Density`, `Volume`, `Difficulty`, `Cpc`, `Competition` mentionnés dans le PRD pré-migration ne sont **pas couverts** par la regex actuelle. **Cf. DRIFT-019.**

**Décisions d'architecture**
- **Garde-fou statique par ESLint** : pas besoin de relecture, ça casse au build. Le développeur est forcé d'expliciter le cas `null`.
- **Périmètre limité aux scores** : la règle est tolérante sur `volume ?? 0` (par exemple) — c'est un choix de scope, on accepte les fallbacks numériques bruts hors « score ».

**Voir aussi**
- `DRIFT-019` — divergence PRD vs code sur la couverture de la regex.
- `DESIGN-INFRA-KPI-NULLABLE` — discipline complémentaire au niveau des types.

---

### DESIGN-INFRA-KPI-NULLABLE

**Réf PRD :** [FR-INFRA-KPI-NULLABLE](./prd.md#fr-infra-kpi-nullable--kpi-marché-nullables-de-bout-en-bout)

**Refs code (types)**
- `shared/types/keyword-validate.types.ts` — `KeywordOverview { searchVolume: number | null, keywordDifficulty: number | null, cpc: number | null, competition: number | null, … }`.
- `shared/types/intent.types.ts` — `LocationMetrics`.
- `shared/types/radar.types.ts` — `RadarKeywordKpis`.
- `shared/types/scoring.types.ts` — `ValidatePainResult.dataforseo`, `KeywordAuditResult`.

**Adapters concernés (pas de `?? 0`)**
- `server/services/external/dataforseo.service.ts` — `fetchKeywordOverview`, `fetchKeywordOverviewBatch`, `fetchKeywordOverviewForLocation`.
- `server/services/infra/data.service.ts` — adapter DB → KPI (ligne `keyword_metrics` → `kpis[]`).
- `server/services/intent/intent.service.ts` — `LocationMetrics` propagation.

**Tests d'invariant**
- `tests/unit/coherence/kpi-nullable.test.ts` (5+ cas dédiés).
- `tests/unit/services/dataforseo.service.test.ts` — assertions `expect(result.searchVolume).toBeNull()` quand `keyword_info: null`.

**Décisions d'architecture**
- **Pas de `?? 0` à la frontière API → type** : le `null` est la valeur sémantique « non disponible ». Substituer `0` serait factuellement faux (un mot-clé à volume 0 vs un mot-clé sans donnée).
- **Pas de `?? -1` ni `?? "N/A"`** : `null` est plus expressif et déjà géré par TS.

**Voir aussi**
- `DESIGN-INFRA-SCORE-MODULE` — helpers consommateurs (format, compare, aggregate).
- `DESIGN-INFRA-KPI-DISPLAY-DASH` — règle d'affichage `—`.
- `DESIGN-INFRA-KPI-CONSISTENCY` — règle de cohérence affichage/calcul.
- `DESIGN-MOT-RAW-KPIS` (§8.3) — point de chute côté Moteur.

---

### DESIGN-INFRA-KPI-DISPLAY-DASH

**Réf PRD :** [FR-INFRA-KPI-DISPLAY-DASH](./prd.md#fr-infra-kpi-display-dash--affichage--pour-kpi-absent)

**Refs code**
- [shared/score/format.ts](../../shared/score/format.ts) — helpers `formatVolume`, `formatCpc`, `formatKd`, `formatPercent`. Tous retournent `'—'` pour `null` / `undefined`.

**Composants consommateurs (audit grep `formatVolume|formatCpc|formatKd|formatPercent`)**
- `src/components/intent/RadarKeywordCard.vue` + sous-composants `radar-card/*`.
- `src/components/moteur/captain/*` (LocalComparisonStep, etc.).
- `src/components/moteur/CaptainPanel.vue`.
- Templates de cartes Discovery et Radar.

**Tests d'invariant**
- `tests/unit/shared/score.test.ts` — `formatVolume(null) === '—'`, `formatVolume(1234) === '1.2k'`, `formatCpc(null) === '—'`, `formatKd(null) === '—'`, `formatPercent(null) === '—'`.
- Tests composants — `RadarKeywordCard` rendu avec `card.kpis.cpc = null` → cellule contient `'—'`, pas `'0.00 €'`.

**Décisions d'architecture**
- **Placeholder uniforme `—` (tiret cadratin)** : pas de variantes (`N/A`, `?`, `-`). Le caractère est `'—'` (U+2014) — typographiquement neutre.
- **Helpers exclusifs** : aucun composant ne formate à la main `value.toFixed(2)` directement. Empêche la régression silencieuse.

---

### DESIGN-INFRA-KPI-CONSISTENCY

**Réf PRD :** [FR-INFRA-KPI-CONSISTENCY](./prd.md#fr-infra-kpi-consistency--cohérence-affichage--tri--agrégat-sur-kpi)

**Refs code (invariant pur — pas un fichier unique)**
- [shared/score/format.ts](../../shared/score/format.ts) — fonction d'affichage.
- [shared/score/compare.ts](../../shared/score/compare.ts) — fonction de tri.
- [shared/score/aggregate.ts](../../shared/score/aggregate.ts) — fonctions d'agrégat.
- Tests cohérence : [tests/unit/coherence/kpi-nullable.test.ts](../../tests/unit/coherence/kpi-nullable.test.ts) — appariement direct affichage/tri sur un même dataset.

**Décisions d'architecture**
- **Application de CLAUDE.md §2.0** : la valeur affichée et la valeur triée/agrégée sont produites par la même chaîne de helpers — pas de fallback divergent.
- **Test de cohérence dédié** : un test prend un dataset `[A: vol=100, B: vol=null, C: vol=50]`, vérifie l'ordre rendu par un composant ET l'ordre produit par `compareScores`, et s'assure de l'égalité.

**Critères d'acceptation techniques**
- AC.CONSIST.1 : tri descending `[100, null, 50]` via `compareScores` → `[100, 50, null]`.
- AC.CONSIST.2 : `averageScores([10, null, 30]) === 20` (dénominateur 2, pas 3).
- AC.CONSIST.3 : `countValidScores([10, null, null, 30]) === 2`.

**Voir aussi**
- `DESIGN-INFRA-SCORE-MODULE` — module hôte.
- CLAUDE.md §2.0 — règle de cohérence affichage/calcul.

---

### DESIGN-INFRA-KPI-SCORING-NULLSAFE

**Réf PRD :** [FR-INFRA-KPI-SCORING-NULLSAFE](./prd.md#fr-infra-kpi-scoring-nullsafe--scoring-null-safe)

**Refs code**
- `shared/scoring.ts` ou `shared/kpi-scoring.ts` — `computeCompositeScore`, `computeMarketScore`, `computeServerVerdict`, `opportunityIndex`, `generateAlerts`.
- Tests : `tests/unit/shared/scoring.test.ts` (assertions sur composantes `null`, renormalisation poids, verdict `GRAY`).

**Décisions d'architecture**
- **Renormalisation des poids** : si une composante manque, son poids est redistribué pondéralement sur les composantes effectives. Évite la pénalisation injuste d'un mot-clé partiellement scoré.
- **Verdict neutre `GRAY` si tout est `null`** : pas de `NO_GO` (rouge) sur absence de donnée — c'est trompeur. `GRAY` signale clairement « pas de signal ».
- **Alerte `missing_metrics` (info) au lieu de `zero_volume` (danger)** : sémantique fidèle. Une absence n'est pas un échec.

**Critères d'acceptation techniques**
- AC.NULLSCORE.1 : `computeCompositeScore({ searchVolume: null, difficulty: 50, cpc: 1, competition: 0.5 })` → `total` calculé sur 3 composantes ; `volume === null` dans le breakdown.
- AC.NULLSCORE.2 : tous KPIs `null` → `total === null`.
- AC.NULLSCORE.3 : `computeServerVerdict(…tous null…)` → `'GRAY'`.
- AC.NULLSCORE.4 : `opportunityIndex` sur `local.searchVolume = null` → `null`.
- AC.NULLSCORE.5 : `generateAlerts({ searchVolume: null, … })` → contient `{ type: 'missing_metrics', level: 'info' }`, **pas** `{ type: 'zero_volume', level: 'danger' }`.

---

### DESIGN-INFRA-CHECK-HEALTH

**Réf PRD :** [FR-INFRA-CHECK-HEALTH](./prd.md#fr-infra-check-health--audit-complet-du-repo-en-une-commande)

**Refs code**
- [package.json](../../package.json) — script `check:health` agrège : `lint` (oxlint + eslint) + `type-check` (vue-tsc) + `check:cycles` (madge) + `check:dead` (knip) + `check:arch` (dependency-cruiser).

**Décisions d'architecture**
- **Baseline CI** : `check:health` est le seul script à passer avant merge — pas besoin de mémoriser 5 commandes.
- **Échec en cascade** : un sous-check rouge fait échouer la commande globale. `npm run check:health` retourne exit code ≠ 0.

**Voir aussi**
- `DESIGN-INFRA-DEPENDENCY-CRUISER` — un des sous-checks.

---

### DESIGN-INFRA-DEPENDENCY-CRUISER

**Réf PRD :** [FR-INFRA-DEPENDENCY-CRUISER](./prd.md#fr-infra-dependency-cruiser--garde-fous-architecturaux)

**Refs code**
- [.dependency-cruiser.cjs](../../.dependency-cruiser.cjs) — configuration.

**Règles actives**
| Règle | Sévérité | Description |
|---|---|---|
| `no-server-in-src` | error | `src/` ne doit JAMAIS importer depuis `server/` — passer par `shared/`. |
| `no-circular` | error | Pas de cycle d'import. |
| `no-orphans` | warn | Fichier orphelin (jamais importé) — soit le supprimer, soit l'ajouter à knip. |
| `score-internal-only-via-index` | error | Les fichiers internes de `shared/score/` (types, format, compare, aggregate) sont importables **uniquement** depuis `shared/score/` (passer par `index.ts` pour les consommateurs externes). |

**Décisions d'architecture**
- **Verrouillage par build, pas par revue** : impossible de violer la frontière sans casser CI.
- **Couvre `npm run check:arch`** : intégré à `check:health`.

**Voir aussi**
- `DESIGN-INFRA-SCORE-MODULE` — bénéficie de la règle `score-internal-only-via-index`.

---

### DESIGN-INFRA-RUNTIME-MODE

**Réf PRD :** [FR-INFRA-RUNTIME-MODE](./prd.md#fr-infra-runtime-mode--toggle-global-mock--réel)

**Refs code**
- [server/services/infra/runtime-mode.service.ts](../../server/services/infra/runtime-mode.service.ts) — module-scoped `overrideMode: RuntimeMode | null`. Exports `getRuntimeMode()`, `setRuntimeMode(mode)`, `getEffectiveMode()` (override → fallback `.env`).
- [server/routes/runtime-mode.routes.ts](../../server/routes/runtime-mode.routes.ts) — `GET /api/runtime-mode` (état + effective), `POST /api/runtime-mode` (Zod `enum(['mock','real']).nullable()`).
- [src/stores/ui/runtime-mode.store.ts](../../src/stores/ui/runtime-mode.store.ts) — store Pinia. Refs : `override`, `effective`, `isHydrated`. Actions : `hydrate()`, `setMode(mode)`, `toggle()`.
- Consommateurs back : `server/services/external/ai-provider.service.ts` (`getProvider()` consulte l'override **avant** `process.env.AI_PROVIDER`), `server/services/external/dataforseo/_client.ts` (`isSandbox()` consulte l'override **avant** `process.env.DATAFORSEO_SANDBOX`).
- UI : [src/components/shared/AppNavbar.vue](../../src/components/shared/AppNavbar.vue) — bouton toggle, badge mock/real.

**Stores Pinia**
- `useRuntimeModeStore` — header `AUTHORITY:` vérifié (`localStorage runtime-mode` + `GET/POST /api/runtime-mode`).

**Flux DB**
*Aucun* — pas de table dédiée. Persistance limitée à : `localStorage` côté front + RAM module-scoped côté serveur.

**Watchers & réactivité**
- Au boot du store : `hydrate()` détecte un mismatch `localStorage` (override `'real'`) vs serveur (`null`, restart) → re-POST automatique pour resynchroniser (cas serveur restart).
- `setMode` : update optimiste local + POST. Rollback en cas d'erreur réseau (refs `previousOverride`, `previousEffective`, `writeLocalStorage(previousOverride)`).

**Décisions d'architecture**
- **Override RAM côté serveur** : choix assumé pour un outil solo. Restart serveur = perte d'override (rattrapée automatiquement par le front). Pas de DB pour un état dev/session.
- **Sémantique condensée** : un toggle pilote 2 commutateurs distincts (AI provider + DataForSEO sandbox). C'est imparfait en théorie mais c'est la convention solo « tout mock » / « tout réel ».
- **Validation Zod stricte** : `enum(['mock','real']).nullable()` rejette toute autre valeur côté route POST.

**Critères d'acceptation techniques**
- AC.RUNTIME.1-8 : voir PRD. Les ACs portent sur la combinaison override RAM + .env fallback + hydratation localStorage + rollback optimiste + resync after restart.

---

### DESIGN-INFRA-SCRAPE-CORPUS-NEUTRE

**Réf PRD :** [FR-INFRA-SCRAPE-CORPUS-NEUTRE](./prd.md#fr-infra-scrape-corpus-neutre--scraping-http-neutre-cross-onglets)

**Refs code**
- [server/services/external/scrape-corpus.service.ts](../../server/services/external/scrape-corpus.service.ts) — service neutre. Header `AUTHORITY:` lignes 1-17 : `keyword_serp_results` + `keyword_serp_scrapes` + `keyword_paa_questions` (writes only — single producer cross-domaine) + cache mémoire 1h module-scoped Map.
- Constantes : `MEMORY_CACHE_TTL_MS = 60 * 60 * 1000` (1h), `MEMORY_CACHE_MAX_ENTRIES = 100` (LRU), `FETCH_TIMEOUT_MS = 10_000`, `USER_AGENT = 'Mozilla/5.0 (compatible; BlogRedactorSEO/1.0; …)'`.
- API publique : `fetchAndPersist(keyword, articleLevel)`, `getHeadings(keyword)` (Lieutenants), `getTextContent(keyword)` (Lexique), `getPaaQuestions(keyword)`.
- Test helper exporté : `__resetMemoryCacheForTests()`.

**Flux DB**
*Écriture* : `fetchAndPersist` → `withSerpTransaction` → `upsertSerpResults` + `upsertSerpScrapes` + `upsertPaaQuestions` (toutes lignes commit en une seule transaction).
*Lecture* : `getHeadings` / `getTextContent` → `keyword_serp_results` JOIN `keyword_serp_scrapes` filtré sur freshness 7j → optimisé (SELECT scopé).
*Tables consommées* : `keyword_serp_results`, `keyword_serp_scrapes`, `keyword_paa_questions` (cf. [server/db/schema.sql](../../server/db/schema.sql) lignes 215-240).

**Décisions d'architecture**
- **NEVER IMPORTS (test architectural)** : le header `AUTHORITY:` interdit explicitement les imports de `tfidf.service`, `lieutenants-*.service`, `lexique-*.service`. AC.SCRAPE.1 vérifie par grep.
- **Cache mémoire LRU borné** : 100 entrées max. Au-delà, eviction LRU (clé la moins récemment accédée). Évite la fuite mémoire en prod long-running.
- **Tri-state `fromCache`** : `'memory'` | `'db'` | `null` retourné par `fetchAndPersist` — permet aux consommateurs et tests de vérifier qu'aucun fetch externe inutile n'a eu lieu.
- **Tolérance erreur URL** : si une URL répond 404/timeout, la ligne `keyword_serp_scrapes` est créée avec `headings = []` et `text_content = null` ; les autres URLs du même scrape réussissent et la transaction commit normalement.

**Critères d'acceptation techniques**
- AC.SCRAPE.1-7 : voir PRD. Couvrent indépendance architecturale, cache mémoire/DB, tolérance erreur, double lecture, LRU.

**Voir aussi**
- `DESIGN-MOT-LEXIQUE-DECOUPLAGE`, `DESIGN-MOT-SCHEMA-KEYWORD-DECOMPOSITION` — invariants Moteur qui dépendent de ce service.
- `DESIGN-LEX-SCRAPE-DEDIE`, `DESIGN-LIE-SCRAPE-DEDIE` (§8.7, §8.8) — consommateurs.

---

### DESIGN-INFRA-LOGGER

**Réf PRD :** [FR-INFRA-LOGGER](./prd.md#fr-infra-logger--logging-serveur-structuré)

**Refs code**
- [server/utils/logger.ts](../../server/utils/logger.ts) — module 45 lignes. Niveaux `DEBUG / INFO / WARN / ERROR` (constantes `LEVELS`). API : `log.debug`, `log.info`, `log.warn`, `log.error`.
- Configuration : `logs.config.ts` à la racine — flags `level`, `showTimestamp`, `emoji`, `showFilePath`.
- Stack trace parsing : `getCallerInfo()` reconstruit `dossier/fichier:ligne` à partir de la pile d'erreurs.

**Décisions d'architecture**
- **Niveaux numériques `{ DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }`** : un message n'est émis que si `LEVELS[level] >= LEVELS[logsConfig.level]`.
- **Couleurs chalk + emoji** : DEBUG gris 🔍 / INFO cyan ✅ / WARN jaune ⚠️ / ERROR rouge ❌. Lisibilité immédiate dans un terminal.
- **Pas de transport fichier** : terminal uniquement. C'est un outil solo, pas une plateforme à monitorer.

---

### DESIGN-INFRA-ERROR-HANDLER

**Réf PRD :** [FR-INFRA-ERROR-HANDLER](./prd.md#fr-infra-error-handler--middleware-central-derreur-backend)

**Refs code**
- [server/utils/error-handler.ts](../../server/utils/error-handler.ts) lignes 6-56 — middleware Express monté en dernier dans [server/index.ts](../../server/index.ts) ligne 84.
- Erreurs typées reconnues :
  - `DataForSeoQuotaError` → 429 + `{ code: 'DATAFORSEO_QUOTA_EXCEEDED' }`.
  - `CostBudgetError` → 429 + `{ code: 'DATAFORSEO_COST_BUDGET', spentUsd, budgetUsd, windowMin, endpoint }`.
  - `AIProviderQuotaError` → 429 + `{ code: 'AI_PROVIDER_QUOTA_EXCEEDED', provider }`.
  - `AIProviderOverloadedError` → 503 + `{ code: 'AI_PROVIDER_OVERLOADED', provider }`.
  - Tout autre `Error` → 500 + `{ code: 'INTERNAL_ERROR', message: err.message }`.

**Décisions d'architecture**
- **Codes d'erreur explicites** : `KNOWN_ERROR_CODES` côté front ([src/services/api.service.ts](../../src/services/api.service.ts) lignes 55-68) traduit les codes en toasts utilisateurs avec recommandation d'action (cf. DESIGN-INFRA-API-WRAPPER).
- **Pas de stack trace exposée** : seul `err.message` est renvoyé, pas la stack. Cohérent avec le périmètre localhost.
- **Logging systématique** : avant chaque réponse, `log.error(\`${method} ${path} — ${message}\`)`.

**Voir aussi**
- `DESIGN-INFRA-API-WRAPPER` — traduction codes → toasts côté front.

---

### DESIGN-INFRA-HEALTH-CHECK

**Réf PRD :** [FR-INFRA-HEALTH-CHECK](./prd.md#fr-infra-health-check--endpoint-de-santé)

**Refs code**
- [server/index.ts](../../server/index.ts) lignes 52-55 — route inline `GET /api/health` → `res.json({ data: { status: 'ok' } })`.

**Décisions d'architecture**
- **Pas de fichier `health.routes.ts`** : la route tient en 4 lignes, inline dans `server/index.ts`. Pas de surcouche d'abstraction inutile.
- **Réponse enveloppée `{ data: ... }`** : cohérent avec le wrapper API (lecture via `apiGet<T>('/health')`).

**Consommateurs**
- Scripts `predev` / `pretest:browser` : attendent ce endpoint vert avant de lancer le front ou Playwright.

---

### DESIGN-INFRA-DB-CONNECTION-CHECK

**Réf PRD :** [FR-INFRA-DB-CONNECTION-CHECK](./prd.md#fr-infra-db-connection-check--vérification-postgresql-au-démarrage)

**Refs code**
- [server/index.ts](../../server/index.ts) lignes 92-111 — `pool.query('SELECT 1').then(() => log.info('PostgreSQL connected')).catch(err => log.error('PostgreSQL connection failed', { … hint }))`.

**Diagnostic intégré** : le `hint` adapte le message selon `err.code` :
| `err.code` | Hint |
|---|---|
| `ECONNREFUSED` | « PostgreSQL service is not running … On Windows: `net start postgresql-x64-18` (admin). » |
| `28P01` | « Authentication failed — check PG_USER / PG_PASSWORD in .env. » |
| `3D000` | « Database "…" does not exist — create it with \`createdb\`. » |

**Décisions d'architecture**
- **Vérification non-bloquante** : le check tourne en parallèle de l'écoute Express (`app.listen` lancé indépendamment). Le serveur démarre même si PG est down — mais les requêtes retourneront 500 jusqu'à reconnexion.
- **Hint contextuel** : sauve 5 minutes au consultant solo quand il oublie de démarrer le service PG.

---

### DESIGN-INFRA-COST-LOG-STORE

**Réf PRD :** [FR-INFRA-COST-LOG-STORE](./prd.md#fr-infra-cost-log-store--pile-dactivité-api-db-messages)

**Refs code**
- [src/stores/ui/cost-log.store.ts](../../src/stores/ui/cost-log.store.ts) — `useCostLogStore` (Pinia setup-style). Types `ApiActivityEntry`, `DbActivityEntry`, `MessageActivityEntry`, union `ActivityEntry`.
- API : `addEntry(actionLabel, usage: ApiUsage)`, `addDbEntry(actionLabel, op: DbOp)`, `addMessage(level, label, detail?)`, `removeEntry(id)`, `clearAll()`, `toggleCollapsed()`.
- Computeds : `totalCost` (somme `estimatedCost` des entries API), `entryCount`.
- Refs : `entries: ActivityEntry[]` (unshift en tête), `isCollapsed: boolean`.

**Stores Pinia**
- `useCostLogStore` — header `AUTHORITY:` à ajouter (pas présent au 2026-05-12, cf. recommandation `audit_data_flow.py`).

**Producteurs (injection automatique)**
- `apiGet/apiPost/...` via `pushUsageIfPresent` (cf. DESIGN-INFRA-API-WRAPPER).
- `apiGet/apiPost/...` via `pushDbOpsIfPresent` (cf. DESIGN-INFRA-API-WRAPPER).
- `apiStream` via `onUsage` callback (cf. DESIGN-INFRA-API-STREAM).
- `reportKnownError` quand le wrapper détecte un code d'erreur connu.

**Consommateurs UI**
- Composant pile d'activité globale (overlay flottant — à confirmer dans `src/components/shared/`).

**Décisions d'architecture**
- **`unshift` en tête** : les entrées récentes apparaissent en haut.
- **`level: 'api' | 'db' | 'info' | 'warning' | 'error'`** : union discriminée pour permettre des rendus variés (badge tokens pour `api`, badge temps pour `db`, icône pour les messages).
- **Pas de persistance** : la pile est mémoire navigateur uniquement. Refresh = pile vidée. Choix assumé — c'est un outil de session.

**Voir aussi**
- `DESIGN-INFRA-API-WRAPPER`, `DESIGN-INFRA-API-STREAM` — sources d'entrées.
- `NFR-OBS-COST-LOG`, `NFR-OBS-DBOPS-TRACK`, `NFR-OBS-KNOWN-ERRORS`.

---

### DESIGN-INFRA-PAA-EXPLORATIONS

**Réf PRD :** [FR-INFRA-PAA-EXPLORATIONS](./prd.md#fr-infra-paa-explorations--persistance-des-paa-testées-par-article)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 292-304 — table `paa_explorations(id SERIAL PK, article_id INTEGER FK articles ON DELETE CASCADE, keyword TEXT, question TEXT, answer TEXT, is_match BOOLEAN DEFAULT false, match_quality TEXT, explored_at TIMESTAMPTZ DEFAULT now(), UNIQUE(article_id, keyword, question))`.
- Producteur : [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) `saveCaptainExploration()` ligne 856 — UPSERT batch (lignes 883-887 pour le bloc `paa_explorations`).
- Consommateurs :
  - `getCaptainExplorations(articleId)` ligne 659 — SELECT par article (ligne 689 `SELECT * FROM paa_explorations WHERE article_id = $1 ORDER BY explored_at`).
  - Endpoint counts `GET /api/articles/:id/explorations/counts` (`server/routes/article-explorations.routes.ts`) — consommé par `TabCachePanel.vue` (cf. FR-EXP-COUNTS).

**Flux DB**
*Lecture* : mount onglet Capitaine → `getCaptainExplorations(id)` → `SELECT * FROM paa_explorations WHERE article_id = $1 ORDER BY explored_at` → store `useArticleKeywordsStore` (champ `exploredPaa`).
*Écriture* : action utilisateur (test PAA) → `saveCaptainExploration` → `INSERT INTO paa_explorations … ON CONFLICT (article_id, keyword, question) DO UPDATE`.

**Décisions d'architecture**
- **Article-scoped + permanent** : distinct de `external_api_cache.cache_type='paa'` (TTL court, cross-article). Ici on persiste **l'annotation utilisateur** (match / no-match / qualité), pas la PAA brute.
- **UNIQUE (article_id, keyword, question)** : idempotence des re-tests. L'utilisateur peut retester la même question — l'historique ne se duplique pas.

**Voir aussi**
- `DESIGN-CAP-PERSIST` (§8.6) — flux côté Capitaine.
- `DESIGN-MOT-EXPLORATION-COUNTS` — endpoint counts consommé par `TabCachePanel`.

---

### DESIGN-INFRA-INTENT-EXPLORATIONS-LEGACY

**Réf PRD :** [FR-INFRA-INTENT-EXPLORATIONS-LEGACY](./prd.md#fr-infra-intent-explorations-legacy--table-legacy-à-supprimer)

**État DB live (vérifié 2026-05-12)**
- [server/db/schema.sql](../../server/db/schema.sql) — **AUCUNE `CREATE TABLE intent_explorations`**. La table n'existe pas dans le snapshot courant.
- Producteurs : aucun.
- Consommateurs : aucun.

**Origine de la dette**
- Migration archivée `server/db/migrations/_archive/007_keyword_explorations.sql` aurait créé la table puis elle aurait été drop manuellement sans migration tracée. **Source** : le snapshot horodaté ne la liste pas, mais le `CREATE TABLE` resterait dans la migration archivée et **recréerait la table orpheline si la DB était replayée à neuf**.
- Commentaire trompeur signalé : `server/services/queries/keyword-queries.service.ts:5` indique « table supprimée » alors qu'aucun `DROP` n'avait été émis officiellement.

**Décisions d'architecture (recommandées)**
- **Action 1** : créer une migration idempotente `DROP TABLE IF EXISTS intent_explorations CASCADE` (no-op sur les DB où la table est déjà absente, drop sur celles où elle existe encore).
- **Action 2** : ajuster le commentaire trompeur du service `queries`.

---

### DESIGN-INFRA-KEYWORDS-SEO

**Réf PRD :** [FR-INFRA-KEYWORDS-SEO](./prd.md#fr-infra-keywords-seo--pool-de-mots-clés-du-cocon)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 242-250 — `keywords_seo(id SERIAL PK, cocoon_name TEXT, mot_clef TEXT NOT NULL, type_mot_clef TEXT, statut TEXT DEFAULT 'suggested', created_at TIMESTAMPTZ)`.
- Producteurs : [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) `addKeyword()` ligne 502, `replaceKeyword()` ligne 521, `updateKeywordStatus()` ligne 529, `deleteKeyword()` ligne 537.
- Consommateurs : `getKeywordsByCocoon(cocoonName)` ligne 473, `loadKeywordsDb()` ligne 491. Routes : `GET /api/keywords/cocoon/:name`, `GET /api/keywords` dans [server/routes/keywords.routes.ts](../../server/routes/keywords.routes.ts).

**Flux DB**
*Lecture* : mount Cerveau/Capitaine → `useKeywordsStore.fetch(cocoonName)` → endpoint → `getKeywordsByCocoon` → `SELECT … FROM keywords_seo WHERE cocoon_name = $1` → store.
*Écriture* : action utilisateur (ajout/remplacement/statut/suppression) → endpoint → fonction service correspondante → INSERT/UPDATE/DELETE.

**Décisions d'architecture**
- **Cocoon-scoped, pas article-scoped** : c'est le **pool du cocon**, distinct de `article_keywords` (Capitaine/Lieutenants/Lexique **sélectionnés pour un article**).
- **Statuts ouverts (`TEXT`, pas `ENUM`)** : `suggested`, `validated`, `discarded` — gérés au niveau applicatif.

**Voir aussi**
- `DESIGN-CER-AIGUILLAGE`, `DESIGN-CER-BATCH-CREATE` — producteurs métier.

---

### DESIGN-INFRA-LOCAL-ENTITIES

**Réf PRD :** [FR-INFRA-LOCAL-ENTITIES](./prd.md#fr-infra-local-entities--référentiel-statique-dentités-locales)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 283-290 — `local_entities(id SERIAL PK, name TEXT NOT NULL, type TEXT, aliases TEXT[], region TEXT)`.
- Service : [server/services/infra/local-entities.service.ts](../../server/services/infra/local-entities.service.ts) — `getEntities()`, `scoreLocalAnchoring(text, …)`.
- Route : `server/routes/local.routes.ts` (si présente — sinon endpoints embarqués dans une autre route).
- Seed historique : `_archive/scripts/seed-migration-json-to-pg-2026-04.ts`.

**Décisions d'architecture**
- **Référentiel statique** : pas de write runtime. Seed unique au déploiement.
- **Cross-cocon** : référentiel partagé, pas scoped sur un cocon.
- **Distinct de `keyword_metrics.local_comparison`** : ce dernier (JSONB) contient les entités **scrapées dynamiquement** des SERPs concurrentes — pas la même source. Le PRD insiste sur ne pas confondre.

**Voir aussi**
- `DESIGN-CAP-LOCAL-ANCHORING` (§8.6), `DESIGN-RED-CONTENT-GAP` (§8.10) — consommateurs.

---

### DESIGN-INFRA-LIEUTENANT-EXPLORATIONS

**Réf PRD :** [FR-INFRA-LIEUTENANT-EXPLORATIONS](./prd.md#fr-infra-lieutenant-explorations--persistance-des-propositions-lieutenants-par-article)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 266-281 — `lieutenant_explorations(id SERIAL PK FROM SEQ lieutenant_proposals_id_seq, article_id INTEGER FK articles ON DELETE CASCADE, keyword TEXT, status TEXT DEFAULT 'suggested', captain_keyword TEXT, reasoning TEXT, sources TEXT[], suggested_hn_level INTEGER, score INTEGER DEFAULT 0, kpis JSONB, explored_at TIMESTAMPTZ, UNIQUE(article_id, keyword))`. **Pas de colonne `locked_at`** dans le snapshot courant — le PRD pré-migration la mentionnait, c'est inexact. **Cf. DRIFT-020.**
- Producteur : [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) `saveLieutenantExplorations` ligne 942 (UPSERT batch).
- Consommateur : `getLieutenantExplorations(articleId)` ligne 921 — SELECT ORDER BY score DESC.

**Origine du nom** : table renommée depuis `lieutenant_proposals` en migration `010_cross_article_tables.sql` ; séquence id préservée.

**Flux DB**
*Lecture* : mount onglet Lieutenants → endpoint dédié → `getLieutenantExplorations` → store `useArticleKeywordsStore` (champ `richLieutenants`).
*Écriture* : génération IA Lieutenants OU ajout manuel → `saveLieutenantExplorations` (UPSERT batch).

**Décisions d'architecture**
- **Renommage 2026 migration 010** : `lieutenant_proposals` → `lieutenant_explorations` pour aligner avec `paa_explorations`, `captain_explorations`, etc. (nomenclature unifiée).
- **JSONB `kpis`** : permet de figer les KPIs au moment de la proposition (vs lire `keyword_metrics` à chaque consultation), pour reproductibilité.
- **`status` ouvert** : `suggested`, `selected`, `discarded` — gérés applicativement.

**Voir aussi**
- `DESIGN-LIE-PROPOSE`, `DESIGN-LIE-SELECT`, `DESIGN-LIE-PERSIST` (§8.7).
- `DRIFT-020` — colonne `locked_at` mentionnée dans le PRD pré-migration mais absente du schéma courant.

---

### DESIGN-INFRA-KEYWORD-DISCOVERIES

**Réf PRD :** [FR-INFRA-KEYWORD-DISCOVERIES](./prd.md#fr-infra-keyword-discoveries--cache-long-terme-des-scans-discovery)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 156-163 — `keyword_discoveries(seed TEXT, lang TEXT DEFAULT 'fr', sources_json JSONB, ai_analysis_json JSONB, fetched_at TIMESTAMPTZ, PRIMARY KEY (seed, lang))`.
- Service : `server/services/keyword/keyword-discovery-db.service.ts` — `getDiscoveryCache(seed, lang)` (~ligne 44), `cacheDiscoverySources` (~ligne 57), `cacheDiscoveryAiAnalysis` (~ligne 75), `clearDiscoveryCache` (~ligne 90).
- Routes : `GET /api/keywords/discovery/cache/:seed` (lecture cache), `POST /api/keywords/discovery/cache/clear` (purge), `POST /api/keywords/discovery/cache/refresh` (rafraîchissement explicite).
- Front : `useKeywordDiscoveryStore`, `KeywordDiscoveryTab.vue`.

**Flux DB**
*Lecture* : mount onglet Discovery → `useKeywordDiscoveryStore.hydrate(seed, lang)` → `apiGet('/keywords/discovery/cache/:seed')` → SELECT par PK `(seed, lang)` → badge **« Dernière analyse du DD/MM/YYYY · N mots-clés »** + boutons **Charger** / **Rafraîchir**.
*Écriture (sources)* : scan Discovery achevé sur les sources brutes → `cacheDiscoverySources(seed, lang, sources)` → UPSERT.
*Écriture (analyse IA)* : analyse IA Claude achevée → `cacheDiscoveryAiAnalysis(seed, lang, ai)` → UPSERT (champ `ai_analysis_json`).

**Décisions d'architecture**
- **TTL applicatif 30 jours** : le service consommateur compare `fetchedAt` à `Date.now()` — distinct de `external_api_cache` (TTL court 24-48h).
- **Découplage `sources_json` / `ai_analysis_json`** : permet de mettre à jour l'enrichissement IA sans réécraser les sources brutes.
- **Refresh explicite** : un endpoint dédié `…/refresh` invalide le cache sans toucher au reste de la cascade — l'utilisateur peut « repartir d'une analyse neuve » sans purger la DB.

**Voir aussi**
- `DESIGN-DIS-CACHE` (§8.4) — flux complet côté Discovery (sources + analyse IA + UPSERT).
- `DESIGN-INFRA-API-CACHE` — cache court externe (différent).

---

### DESIGN-INFRA-ARTICLE-STRATEGIES

**Réf PRD :** [FR-INFRA-ARTICLE-STRATEGIES](./prd.md#fr-infra-article-strategies--persistance-de-la-stratégie-dun-article)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 52-59 — `article_strategies(article_id INTEGER PK FK articles ON DELETE CASCADE, data JSONB NOT NULL, completed_steps INTEGER DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT now())`. **`completed_steps` est INTEGER (compteur), pas TEXT[]** — le PRD pré-migration disait TEXT[] (cf. **DRIFT-003** déjà documenté).
- Service : `server/services/strategy/strategy.service.ts` — `getArticleStrategy(articleId)`, `saveArticleStrategy(articleId, data, completedSteps)` (lignes 23-45).
- Routes : `GET /api/articles/:id/strategy`, `POST /api/articles/:id/strategy` dans [server/routes/strategy.routes.ts](../../server/routes/strategy.routes.ts).
- Store front : `useArticleStrategyStore` (hydrate au mount du Cerveau).

**Flux DB**
*Lecture* : mount Cerveau article → `useArticleStrategyStore.fetch(articleId)` → endpoint → service → store.
*Écriture* : validation d'un step Cerveau → `useArticleStrategyStore.save(data, completedSteps)` → endpoint → `INSERT … ON CONFLICT (article_id) DO UPDATE SET data, completed_steps, updated_at = NOW()`.

**Décisions d'architecture**
- **`data: JSONB`** : conteneur ouvert pour la totalité du wizard (aiguillage, painPoint, intent, micro-context, etc.). Évolution du schéma stratégie sans migration DDL.
- **Distinct de `articles.completed_checks`** (workflow Moteur) : `completed_steps` ici est l'**avancement interne** du wizard Cerveau, pas un check workflow exposé.

**Voir aussi**
- `DESIGN-CER-STEPS-ARTICLE` (§8.1), `DESIGN-CER-CONTEXT-FOR-MOTEUR` (§8.1) — flux Cerveau qui produit / consomme cette table.
- `DRIFT-003` — colonne `completed_steps` est INTEGER, pas TEXT[].

---

### DESIGN-INFRA-COCOON-STRATEGIES

**Réf PRD :** [FR-INFRA-COCOON-STRATEGIES](./prd.md#fr-infra-cocoon-strategies--persistance-de-la-stratégie-dun-cocon)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 104-110 — `cocoon_strategies(cocoon_id INTEGER PK FK cocoons ON DELETE CASCADE, data JSONB NOT NULL DEFAULT '{}'::jsonb, generated_at TIMESTAMPTZ NOT NULL DEFAULT now())`.
- Service : `server/services/strategy/cocoon-strategy.service.ts` — `getCocoonStrategy(cocoonSlug)`, `saveCocoonStrategy(cocoonId, data)` (lignes 52-81).
- Lecture additionnelle : `keyword-queries.service.ts:321` (injecté dans les prompts IA via `buildCocoonStrategyBlock`).

**Champs JSONB observés (data)** : `cible`, `douleur`, `angle`, `promesse`, `cta` — chaque champ est un objet avec `validated` (string utilisateur final) + métadonnées de génération IA.

**Flux DB**
*Lecture* : 1/ mount Cerveau cocon → store hydrate. 2/ Prompt IA Moteur/Rédaction → `loadPrompt` → `buildCocoonStrategyBlock(getCocoonStrategy(cocoonSlug))` → injecté dans `{{cocoon_strategy_context}}`.
*Écriture* : validation d'une étape stratégie cocon → service → UPSERT.

**Décisions d'architecture**
- **Cross-articles, cocon-scoped** : un seul enregistrement par cocon, partagé par tous les articles du cocon.
- **`buildCocoonStrategyBlock`** : helper de formatage Markdown — produit `''` si tous les champs sont vides (cf. DESIGN-INFRA-PROMPT-LOADER, principe « variables optionnelles »).

**Voir aussi**
- `DESIGN-CER-STEPS-COCOON` (§8.1).
- `DESIGN-INFRA-PROMPT-LOADER` — chaîne `buildCocoonStrategyBlock` → `loadPrompt`.

---

### DESIGN-INFRA-MICRO-CONTEXTS

**Réf PRD :** [FR-INFRA-MICRO-CONTEXTS](./prd.md#fr-infra-micro-contexts--micro-contextes-darticle-injectés-dans-la-rédaction)

**Refs code**
- [server/db/schema.sql](../../server/db/schema.sql) lignes 41-50 — `article_micro_contexts(article_id INTEGER PK FK articles ON DELETE CASCADE, angle TEXT, tone TEXT, directives TEXT, updated_at TIMESTAMPTZ DEFAULT now(), target_word_count INTEGER)`.
- Lecture : [server/services/infra/data.service.ts](../../server/services/infra/data.service.ts) ligne 1017 (`SELECT amc.*, a.slug FROM article_micro_contexts amc …`).
- Écriture : `data.service.ts` ligne 1036 (`INSERT INTO article_micro_contexts … ON CONFLICT (article_id) DO UPDATE`).
- Validation : `microContextDbSchema.parse({ micro_contexts: [{ id, …data }] })` (ligne 1044) via [shared/schemas/article-micro-context.schema.ts](../../shared/schemas/article-micro-context.schema.ts).
- Routes : [server/routes/articles.routes.ts](../../server/routes/articles.routes.ts) lignes 189-240 (`GET/POST /api/articles/:id/micro-context`).

**Flux DB**
*Lecture* : 1/ Cerveau micro-context step → store hydrate. 2/ Prompt IA Rédaction → `loadPrompt` → `buildMicroContextBlock(getMicroContext(articleId))` → injecté dans `{{micro_context}}`.
*Écriture* : validation du step micro-context (Cerveau) → endpoint → UPSERT.

**Décisions d'architecture**
- **1:1 avec `articles`** : un seul enregistrement par article (PK = `article_id`).
- **Champs simples (`TEXT`)** : pas de JSONB ici — le micro-contexte est éditorial, on garde une colonne par champ pour la lisibilité et les recherches éventuelles.
- **`target_word_count`** ajouté en migration ultérieure (cf. `FR-CER-WORD-COUNT-RECOMMEND`).

**Voir aussi**
- `DESIGN-CER-MICRO-CONTEXT` (§8.1) — flux côté Cerveau.
- `DESIGN-CER-WORD-COUNT-RECOMMEND` (§8.1).
- `DESIGN-INFRA-PROMPT-LOADER` — chaîne `buildMicroContextBlock` → `loadPrompt`.

---

### DESIGN-INFRA-EXTERNAL-API-CACHE

**Réf PRD :** [FR-INFRA-EXTERNAL-API-CACHE](./prd.md#fr-infra-external-api-cache--cache-générique-partagé-pour-tous-les-appels-api-externes-déplacée-depuis-86-le-2026-05-12)

**Refs code**
- [server/db/cache-helpers.ts](../../server/db/cache-helpers.ts) — `getCached(type, key)`, `setCached(type, key, data, ttlMs)`, `deleteCached`.
- [server/index.ts](../../server/index.ts) — job de purge horaire ciblant `external_api_cache`.

**Tables consommées** : `external_api_cache(id, cache_key TEXT, cache_type TEXT, data JSONB, cached_at, expires_at)` — UNIQUE `(cache_key, cache_type)`.

**Flux DB**

*Lecture* : `getCached(type, key)` filtre `expires_at > NOW()` — retourne hit ou null.

*Écriture* : `setCached(type, key, data, ttlMs)` UPSERT `ON CONFLICT (cache_key, cache_type)`.

**Cache_types actifs (2026-05-12)** : `dataforseo`, `gsc`, `radar`, `long-tail-suggest`, `suggest` (4 sub-keys), `keyword-discovery`, `intent`, `community-discussions`, `validate`, `autocomplete`. Liste extensible par convention (string libre).

**Décisions d'architecture (Sprint 19 option A)**
- Table conservée long terme — pas de plan de mort, pas de tables dédiées par fournisseur.
- Renommage historique : `api_cache → external_api_cache` (Sprint 16) — voir DRIFT historique.

**Voir aussi** : `DESIGN-INFRA-API-CACHE` (générique), `DESIGN-INFRA-API-CACHE-PURGE`, `DESIGN-PERF-PURGE-HOURLY`.

---

## §8.15 — Composants UI partagés (DESIGN-UI)

### DESIGN-UI-RADAR-CARD

**Réf PRD :** [FR-UI-RADAR-CARD](./prd.md#fr-ui-radar-card)

**Refs code**
- [src/components/intent/RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) — master, expose la prop `displayMode: 'kpi' | 'relevance'` (cf. lignes 22-36) qui pilote le rendu du score sans dupliquer le composant.
- [src/components/intent/radar-card/RadarCardScoreRing.vue](../../src/components/intent/radar-card/RadarCardScoreRing.vue) — sous-composant SVG du ring Pertinence (mode `relevance`).
- [src/components/intent/radar-card/RadarCardPaaTree.vue](../../src/components/intent/radar-card/RadarCardPaaTree.vue) — sous-composant arbre PAA récursif parent → children.
- [src/components/intent/RadarCardCheckable.vue](../../src/components/intent/RadarCardCheckable.vue) — wrapper d'ajout en mode sélection multiple, ajoute un mécanisme de toggle sans toucher au rendu de la carte.
- [src/components/intent/RadarCardLockable.vue](../../src/components/intent/RadarCardLockable.vue) — wrapper Capitaine, ajoute le verrouillage (lock/unlock) en surcouche du rendu.

**Contextes consommateurs réels (vérifiés par grep des imports)**
| Contexte utilisateur | Composant Vue qui monte la carte | Wrapper utilisé | Mode score |
|---|---|---|---|
| Phase Discovery — résultats d'un scan douleur | [src/components/intent/scanner/DouleurScannerResults.vue](../../src/components/intent/scanner/DouleurScannerResults.vue) | `RadarCardCheckable` | `kpi` |
| Phase ② Capitaine — liste des mots-clés à verrouiller (via `CaptainInteractiveWords`) | [src/components/moteur/CaptainInteractiveWords.vue](../../src/components/moteur/CaptainInteractiveWords.vue), monté par [CaptainRadarList.vue](../../src/components/moteur/captain/CaptainRadarList.vue) | `RadarCardLockable` | `relevance` |
| Phase ② Capitaine — affichage diagnostique d'un mot-clé Capitaine sélectionné | [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue) (ligne 1150) | `RadarKeywordCard` direct | `relevance` |

**Stores Pinia**
- `useArticleKeywordsStore` (Capitaine) — fournit le mot-clé Capitaine verrouillé et les scores Pertinence lus par la carte en mode `relevance`.
- `useRadarExplorationStore` (Discovery / Radar) — fournit la liste `scan_result.cards` lue par les wrappers `Checkable` lors d'un scan.

**Watchers & réactivité**
- Aucun watcher propre à la carte : le rendu est entièrement piloté par les props. Si le store Capitaine mute (re-validation Pertinence sur changement de pain point), la carte se rafraîchit par réactivité Vue standard.
- Le sous-composant `RadarCardPaaTree.vue` gère son état d'ouverture/repli localement (state interne) — il ne propage rien au store.

**Décisions d'architecture**
- **Un seul composant, deux modes via prop** : `displayMode: 'kpi' | 'relevance'` plutôt que deux composants séparés. Garantit qu'un changement visuel (typographie, espacement, palette) profite simultanément aux deux modes. Voir [RadarKeywordCard.vue](../../src/components/intent/RadarKeywordCard.vue) lignes 131-189 (branchements sur `props.displayMode`).
- **Wrappers minces** : `RadarCardCheckable` et `RadarCardLockable` ajoutent uniquement le mécanisme d'état (sélection workflow vs verrouillage). Ils délèguent intégralement le rendu à `<RadarKeywordCard>` enfant — pas de duplication CSS/template.
- **Test architectural** : à ajouter — pour l'instant, la cohérence cross-contextes repose sur la discipline de revue. Un test qui monte les 3 wrappers dans des contextes Vitest distincts et compare leurs DOM serait l'invariant le plus robuste.

**Critères d'acceptation techniques**
- AC.UIRADAR.1 : Modifier une classe CSS racine de `RadarKeywordCard.vue` doit propager à `RadarCardCheckable`, `RadarCardLockable`, et à l'usage direct dans `CaptainPanel.vue` sans branchement conditionnel.
- AC.UIRADAR.2 : La prop `displayMode` est la seule façon de basculer le score affiché — aucune autre prop ne doit conditionner l'apparence du bloc score.
- AC.UIRADAR.3 : Tout nouveau wrapper qui veut composer la carte radar doit la monter via `<RadarKeywordCard>` enfant, sans dupliquer son template.

**Voir aussi**
- `DESIGN-RAD-SCORING-BIMODAL` (à créer §8.5) — règles de scoring KPI vs Pertinence.
- `DESIGN-RAD-PAA-TREE` (à créer §8.5) — comportement de l'arbre PAA.
- `DESIGN-CAP-LOCK` (à créer §8.6) — mécanique de verrouillage exploitée par le wrapper Lockable.
- `DRIFT-012` — `LaboView` et `KeywordRadarTab` mentionnés dans le PRD historique n'existent pas dans le code ; les vrais consommateurs ont été identifiés par grep.

---

### DESIGN-UI-AI-PANELS-PATTERN

**Réf PRD :** [FR-UI-AI-PANELS-PATTERN](./prd.md#fr-ui-ai-panels-pattern)

**Refs code (infrastructure factorisée)**
- [src/components/moteur/ai-panel/AiPanel.vue](../../src/components/moteur/ai-panel/AiPanel.vue) — composant générique. Props clés : `variant: 'suggestion' | 'advice'`, `state: AiPanelState`, `error`, `isStale`, `ctaLabel`, `regenLabel`, `hideUntilTriggered`, `regenConfirmMessage`, `triggerDisabled`, `defaultCollapsed`.
- [src/components/moteur/ai-panel/AiPanelHeader.vue](../../src/components/moteur/ai-panel/AiPanelHeader.vue) — header replié/déplié, titre + sous-titre.
- [src/components/moteur/ai-panel/AiPanelSkeleton.vue](../../src/components/moteur/ai-panel/AiPanelSkeleton.vue) — état empty / loading factorisé.
- [src/components/moteur/ai-panel/AiSuggestionList.vue](../../src/components/moteur/ai-panel/AiSuggestionList.vue) — variant `suggestion` (liste d'éléments cliquables).
- [src/components/moteur/ai-panel/AiAdviceMarkdown.vue](../../src/components/moteur/ai-panel/AiAdviceMarkdown.vue) — variant `advice` (parse `marked.js` incrémental sur SSE).
- [src/components/moteur/ai-panel/AiTriggerButton.vue](../../src/components/moteur/ai-panel/AiTriggerButton.vue) — bouton CTA + régénération avec confirmation optionnelle.
- [src/composables/moteur/useAiPanel.ts](../../src/composables/moteur/useAiPanel.ts) — type `AiPanelState = 'idle' | 'streaming' | 'success' | 'error'`.

**Panels consommateurs (audit codebase 2026-05-12)**
| Panel | Onglet | Variant | Forme | FR métier |
|---|---|---|---|---|
| `DiscoveryPanel.vue` *(usage direct de `<AiPanel>`, refonte 2026-05-11)* | Discovery | `suggestion` | Carte interne au panneau Discovery | FR-DIS-AI-PANEL |
| [RadarAiPanel.vue](../../src/components/moteur/RadarAiPanel.vue) | Radar | `suggestion` | Carte dédiée | FR-RAD-AI-LONGTAIL |
| `<AiPanel>` intégré dans [CaptainSidePanel.vue](../../src/components/moteur/CaptainSidePanel.vue) (ligne 191) | Capitaine | `advice` | Side panel droit | FR-CAP-AI-VALIDATION |
| [LexiqueAiPanel.vue](../../src/components/moteur/LexiqueAiPanel.vue) | Lexique | `suggestion` | Carte dédiée | FR-LEX-AI-MULTIKW |
| [LieutenantsAiPanel.vue](../../src/components/moteur/LieutenantsAiPanel.vue) | Lieutenants | `advice` | Carte dédiée *(n'utilise pas directement `<AiPanel>` — refonte spécifique, cf. note du test architectural)* | FR-LIE-AI-PROPOSALS, FR-LIE-AI-FRONTIER |
| [ArticleWorkflowIaBrief.vue](../../src/components/article/ArticleWorkflowIaBrief.vue) | Rédaction Workflow | `advice` | Brief de section IA | FR-RED-IA-BRIEF |

**Tests architecturaux**
- [tests/unit/components/moteur/ai-panels-persistence.test.ts](../../tests/unit/components/moteur/ai-panels-persistence.test.ts) — parcourt la liste fixée des panels audités (Discovery, Lexique, Lieutenants au 2026-05-11) et vérifie :
  - Import du composant `AiPanel` (ou pattern équivalent) au top du module.
  - Aucun `v-if` racine sur `<AiPanel>` conditionné à un état utilisateur transitoire (`hasClickedX`, `analysisResult === null`...).
- [tests/unit/components/ai-panel/AiPanel.test.ts](../../tests/unit/components/ai-panel/AiPanel.test.ts) et autres tests par sous-composant — couvrent la mécanique du composant générique.

**Stores Pinia**
- Pas de store propre au pattern : chaque panel consommateur orchestre son fetch local via un composable dédié (`useAiPanel`, `useDiscoveryAi`, `useRadarLongTailAi`, etc.) qui expose `state: Ref<AiPanelState>`, `result`, `error`, et une méthode `trigger()`.
- Le store de l'onglet hôte (`useArticleKeywordsStore`, `useRadarExplorationStore`...) peut être lu en amont pour calculer la précondition `triggerDisabled`, mais la donnée IA elle-même reste locale au composant.

**Watchers & réactivité**
- État `state: AiPanelState` recalculé par computed à partir du composable hôte. Toute mutation de `loading`/`result`/`error` propage en cascade : header (`AiPanelHeader`) bascule l'icône, bouton (`AiTriggerButton`) bascule le label CTA/Regen, slot par défaut affiche le contenu adapté.
- Auto-uncollapse pendant `streaming` ou `error` (cf. `AiPanel.vue` ligne 48-50) : l'utilisateur voit immédiatement ce qui se passe sans avoir à déplier manuellement.

**Décisions d'architecture**
- **Présence DOM persistante (NFR-UX-STABLE-SKELETON)** : invariant transverse imposé aux 6 panels. Aucun `v-if` parent ne doit retirer `<AiPanel>` du DOM en fonction d'un état utilisateur transitoire (clic, scroll, action déclenchée). Les états « pas prêt à agir » sont rendus par `triggerDisabled: true` + slot `#idle` avec message d'invitation explicite. Statut audit 2026-05-11 : Discovery / Lexique / Lieutenants conformes ; Radar / Capitaine (`CaptainSidePanel`) / Rédaction (`ArticleWorkflowIaBrief`) à auditer.
- **Pattern unique, deux variants visuels** : `variant: 'suggestion' | 'advice'` pour deux familles de rendus (liste cliquable vs markdown narratif). Toute évolution structurelle (nouveau state, nouvelle prop, nouveau comportement de stream) se fait dans `src/components/moteur/ai-panel/` — jamais dupliquée dans un panel consommateur.
- **`LieutenantsAiPanel.vue` exception documentée** : ce panel n'utilise pas directement `<AiPanel>` mais reproduit le pattern (refonte spécifique 2026-05-04). Le test architectural le tolère mais vérifie quand même les invariants de persistance/désactivation explicite.

**Critères d'acceptation techniques**
- AC.UIAIP.1 : Pour chaque panel consommateur listé, un test composant monte le parent dans un état initial et vérifie la présence DOM de `[data-testid^="ai-panel-"]` ou équivalent.
- AC.UIAIP.2 : Quand la précondition métier n'est pas remplie, le CTA est `disabled` avec un message d'invitation explicite dans le slot `#idle`.
- AC.UIAIP.3 : Aucun `v-if` racine conditionné à un état utilisateur transitoire au-dessus de `<AiPanel>` dans le template parent.
- AC.UIAIP.4 : Tout nouveau panel IA introduit dans le Moteur DOIT respecter ces 3 ACs — vérifié par `ai-panels-persistence.test.ts`.

**Voir aussi**
- `DESIGN-INFRA-NFR-UX-STABLE-SKELETON` (à créer §9) — règle UX transversale de présence DOM persistante.
- `DESIGN-DIS-AI-PANEL`, `DESIGN-RAD-AI-LONGTAIL`, `DESIGN-CAP-AI-VALIDATION`, `DESIGN-LEX-AI-MULTIKW`, `DESIGN-LIE-AI-PROPOSALS`, `DESIGN-RED-IA-BRIEF` — instances individuelles à formaliser dans leurs sections respectives.

---

### DESIGN-UI-ARTICLE-SHARED

**Réf PRD :** [FR-UI-ARTICLE-SHARED](./prd.md#fr-ui-article-shared)

**Refs code (sous-composants partagés)**
| Composant | Fichier | Consommateurs réels (grep imports) |
|---|---|---|
| `ArticlePanelsToolbar` | [src/components/article/ArticlePanelsToolbar.vue](../../src/components/article/ArticlePanelsToolbar.vue) | `ArticleEditorView` + `ArticleWorkflowView` |
| `ArticlePanelsResizable` | [src/components/article/ArticlePanelsResizable.vue](../../src/components/article/ArticlePanelsResizable.vue) | `ArticleEditorView` + `ArticleWorkflowView` |
| `SectionProgressBar` | [src/components/article/SectionProgressBar.vue](../../src/components/article/SectionProgressBar.vue) | `ArticleEditorView` + `ArticleWorkflowView` |
| `ArticleCostBadges` | [src/components/article/ArticleCostBadges.vue](../../src/components/article/ArticleCostBadges.vue) | `ArticleWorkflowView` (l'import dans `ArticleEditorView` n'est plus présent au 2026-05-12) |
| `ArticleWordCountBar` | [src/components/article/ArticleWordCountBar.vue](../../src/components/article/ArticleWordCountBar.vue) | `ArticleWorkflowView` uniquement (le PRD pré-migration indiquait `ArticleEditorView`, c'est inversé dans la réalité du code 2026-05-12) |
| `ArticleEditorActionOverlays` | [src/components/article/ArticleEditorActionOverlays.vue](../../src/components/article/ArticleEditorActionOverlays.vue) | `ArticleEditorView` uniquement |

**Composable partagé**
- [src/composables/article/useArticleGeneration.ts](../../src/composables/article/useArticleGeneration.ts) — orchestre génération article (SSE stream section par section + persistance `article_content.content` + cost log). Appelé par **`ArticleEditorView` ET `ArticleWorkflowView`** (vérifié grep).

**Vues consommatrices**
- [src/views/ArticleEditorView.vue](../../src/views/ArticleEditorView.vue) — édition libre TipTap d'un article existant (entrée directe depuis dashboard, route `/article/:articleId/editor`).
- [src/views/ArticleWorkflowView.vue](../../src/views/ArticleWorkflowView.vue) — vue intégrée au pipeline Moteur → Rédaction (route `/cocoon/:cocoonId/redaction?articleId=...`), avec brief IA, outline généré, sections enchaînées.

**Stores Pinia**
- `useArticleContentStore` — hydrate/persiste le contenu HTML (`article_content.content`) consommé par les deux vues.
- `useCostLogStore` — partagé par les `ArticleCostBadges` pour afficher tokens + €.

**Watchers & réactivité**
- Le composable `useArticleGeneration` expose des refs partagées (`isGenerating`, `currentSection`, `progress`, `costTokens`, `costEur`...). Les sous-composants `SectionProgressBar` / `ArticleCostBadges` / `ArticleWordCountBar` consomment ces refs réactivement — le rendu reste cohérent par construction si les deux vues réutilisent le même composable.

**Décisions d'architecture**
- **Frontière Workflow ↔ Editor consolidée par sous-composants atomiques** : plutôt que deux templates dupliqués, les blocs d'édition partagés sont extraits dans `src/components/article/` (V4 + V5 du chantier découpage monstres Vue). Toute fonctionnalité éditeur partagée passe par un sous-composant ou un composable de cette liste — la duplication est interdite par convention.
- **Tokens couleur vérifiés par tests UX** : les variables CSS partagées (`--color-error*`, `--color-bg-elevated`, etc.) utilisées par `ArticleEditorActionOverlays` et consorts sont auditées dans [tests/unit/components/ux-audit-sprint2.test.ts](../../tests/unit/components/ux-audit-sprint2.test.ts) et tests UX-audit suivants — assure qu'aucune valeur en dur n'est introduite par mégarde.

**Critères d'acceptation techniques**
- AC.UIART.1 : Tout composant listé ci-dessus est importé **soit** dans `ArticleEditorView`, **soit** dans `ArticleWorkflowView`, **soit** dans les deux — pas de duplication via copier-coller dans une vue tierce.
- AC.UIART.2 : La génération d'article (`useArticleGeneration`) est consommée par les deux vues — un test grep doit retomber sur 2 occurrences exactement dans `src/views/`.
- AC.UIART.3 : Un changement de prop public sur un sous-composant doit refléter sur les deux vues consommatrices après mise à jour de la signature.

**Voir aussi**
- `DESIGN-RED-PANELS-TOOLBAR`, `DESIGN-RED-PANELS-RESIZABLE`, `DESIGN-RED-PROGRESS-BAR`, `DESIGN-RED-COST-BADGES`, `DESIGN-RED-WORDCOUNT`, `DESIGN-RED-ACTION-OVERLAYS` — instances individuelles à formaliser dans §8.10.
- `DRIFT-013` — divergence PRD vs code sur la localisation de `ArticleWordCountBar` (PRD : `ArticleEditorView` ; code : `ArticleWorkflowView`).

---

### DESIGN-UI-MOTEUR-SHARED

**Réf PRD :** [FR-UI-MOTEUR-SHARED](./prd.md#fr-ui-moteur-shared)

**Refs code (briques partagées vérifiées 2026-05-12)**
| Brique | Fichier | Onglets consommateurs (grep imports) |
|---|---|---|
| `CollapsableSection` (primitive globale) | [src/components/shared/CollapsableSection.vue](../../src/components/shared/CollapsableSection.vue) | Discovery, Radar, Capitaine, Lieutenants, Lexique (transversal) |
| `TabCachePanel` | [src/components/moteur/TabCachePanel.vue](../../src/components/moteur/TabCachePanel.vue) | `MoteurView.vue` (sticky-bottom global, prop `active-tab` aiguille les counts par onglet) |
| `TabLoadPrompt` | [src/components/moteur/TabLoadPrompt.vue](../../src/components/moteur/TabLoadPrompt.vue) | `MoteurView.vue` (jumeau de `TabCachePanel`, même sticky) |
| `KeywordAssistPanel` | [src/components/moteur/KeywordAssistPanel.vue](../../src/components/moteur/KeywordAssistPanel.vue) | `LieutenantsPanel.vue`, `LexiquePanel.vue` (vérifié par grep) |
| `MoteurContextRecap` | [src/components/moteur/MoteurContextRecap.vue](../../src/components/moteur/MoteurContextRecap.vue) | `MoteurView.vue` (header, monté une fois pour tous les onglets) |
| `PhaseTransitionBanner` | [src/components/moteur/PhaseTransitionBanner.vue](../../src/components/moteur/PhaseTransitionBanner.vue) | `MoteurView.vue` (banner Phase ② → ③) |
| `ProgressDots` | [src/components/moteur/ProgressDots.vue](../../src/components/moteur/ProgressDots.vue) | `MoteurView.vue` (header), reflet des 5 checks `MOTEUR_*` |

**Stores Pinia mobilisés**
- `useArticleProgressStore` — source des 5 checks consommés par `ProgressDots` et `PhaseTransitionBanner`.
- `useArticleKeywordsStore` — source du Capitaine verrouillé affiché par `MoteurContextRecap`.
- `useStrategyStore` (via `useCocoonStrategyStore`) — source du contexte stratégie (cocon, articles suggérés / publiés) consommé par `MoteurContextRecap`.
- `useRadarExplorationStore` + `useArticleKeywordsStore` (composables utilitaires) — sources des counts cache exposés par `TabCachePanel`.

**Watchers & réactivité**
- `TabCachePanel` reçoit `entries` (counts par onglet) via prop calculée dans `MoteurView`. Le passage de `active-tab` ajuste les éléments visibles sans démontage — le panel reste sticky.
- `ProgressDots` recalcule l'état des 5 dots par computed à partir de `useArticleProgressStore.completedChecks` — toute mutation `addCheck(MOTEUR_*)` propage immédiatement.
- `MoteurContextRecap` lit les sections « Articles suggérés » / « Articles publiés » via le champ dérivé `cocoon.publishedArticles` exposé par `loadArticlesDb` (cf. `FR-MOT-RECAP-PUBLISHED`) — la dérivation est faite côté backend pour empêcher la divergence frontend.

**Décisions d'architecture**
- **Une brique = un seul site de montage** : la plupart de ces briques sont montées **une seule fois dans `MoteurView.vue`** (au-dessus des onglets), pas dans chaque onglet. C'est l'invariant qui empêche la duplication par méprise. `KeywordAssistPanel` fait exception car il accompagne contextuellement Lieutenants + Lexique uniquement.
- **`BasketStrip.vue` supprimé** : la brique mentionnée dans le PRD historique a été retirée le 2026-05-11 (chantier `radar-dbfirst-refactor`, FR-MOT-BASKET-DEPRECATED) — les keywords accumulés vivent désormais en DB via `radar_explorations.generated_keywords` + `scan_result.cards`. Cf. `DRIFT-011`.
- **Sticky bottom unifié `TabCachePanel` + `TabLoadPrompt`** : un wrapper `div.cache-bar` (cf. `MoteurView.vue:520`) maintient les deux côte à côte avec un sticky unique — chaque composant ignore l'autre, mais le wrapper assure leur solidarité visuelle.

**Critères d'acceptation techniques**
- AC.UIMOT.1 : Un composant listé ci-dessus est importé **au plus une fois** dans `MoteurView.vue` (ou ses panels enfants pour `KeywordAssistPanel`) — pas de duplication.
- AC.UIMOT.2 : `ProgressDots` reflète l'état exact de `useArticleProgressStore.completedChecks` — pas de cache local divergent.
- AC.UIMOT.3 : `MoteurContextRecap` lit `cocoon.publishedArticles` directement (pas de re-filtrage frontend), cf. invariant `FR-MOT-RECAP-PUBLISHED`.

**Voir aussi**
- `DESIGN-MOT-CONTEXT-RECAP`, `DESIGN-MOT-PHASE-TRANSITION`, `DESIGN-MOT-PROGRESS-DOTS`, `DESIGN-MOT-LOAD-PROMPT`, `DESIGN-MOT-ASSIST-PANEL`, `DESIGN-MOT-CACHE-CLEAR` — instances individuelles à formaliser dans §8.3.
- `DESIGN-DASH-PROGRESS` — affichage miroir des 5 checks côté dashboard (cohérence cross-vues).
- `DRIFT-011` — `BasketStrip.vue` supprimé 2026-05-11, encore référencé dans le PRD pré-migration.

---

## §9 — Non-Functional Requirements (DESIGN-NFR-*)

> Les NFRs traitées ici décrivent **comment** l'app tient ses promesses non-fonctionnelles (refs code, mécaniques, garde-fous, critères techniques mesurables). Le PRD côté `prd.md` §9 porte la **promesse côté utilisateur** (réactivité, économie, fiabilité).
>
> **§9.7 (Compatibilité runtime)** et **§9.8 (Configuration et environnement)** ont été retirées du périmètre PRD/registry : les versions exactes vivent dans [`architecture.md`](./architecture.md), les variables d'env dans [`.env.example`](../../.env.example). Les comportements pilotés par ces variables sont déjà couverts par d'autres NFRs/FRs (cf. notes de sortie dans le PRD).

---

### §9.1 — Performance (DESIGN-PERF)

#### DESIGN-PERF-API-LOCAL

**Réf PRD :** [NFR-PERF-API-LOCAL](./prd.md#nfr-perf-api-local--réactivité-des-actions-locales)

**Refs code**
- [server/index.ts](../../server/index.ts) — pas de middleware timing branché aujourd'hui.
- [server/utils/error-handler.ts](../../server/utils/error-handler.ts) — handler central des erreurs (mais pas d'instrumentation de latence).

**Décisions d'architecture**
- **Cible interne < 200 ms** pour toute route qui ne déclenche pas un appel externe payant. Cible non monitorée — pas de `prom-client` ou équivalent dans la stack.
- **Pas de middleware timing** : décision assumée pour un outil solo en monoposte. Si un jour un goulet d'étranglement apparaît, ajouter un middleware d'observabilité côté `server/index.ts` (durée par route + tag) serait la première étape.
- **Pas de p99 / SLO** : pas de monitoring de production — cible purement prescriptive.

**Critères d'acceptation techniques**
- AC.PERFAPI.1 : un endpoint local (sans `fetch` externe) renvoie typiquement en < 100 ms sur une base PostgreSQL chaude.
- AC.PERFAPI.2 : aucune route GET locale n'effectue plus de 3 queries SQL séquentielles. Au-delà, jointures ou agrégation côté SQL.

**Historique**
- 2026-04-24 : NFR formalisée (PRD initial).
- 2026-05-12 : déportée dans le registry (chantier docs/prd-split-spec-design).

**Voir aussi**
- `DESIGN-PERF-VIEW-LOAD` (pendant côté front).
- `DESIGN-MAIN-NO-CYCLES` — un cycle d'import qui charge tout l'arbre est un risque de latence cachée.

---

#### DESIGN-PERF-SSE-FIRST-TOKEN

**Réf PRD :** [NFR-PERF-SSE-FIRST-TOKEN](./prd.md#nfr-perf-sse-first-token--premier-mot-dia-visible-rapidement)

**Refs code**
- [server/routes/generate/article.routes.ts](../../server/routes/generate/article.routes.ts) — orchestration SSE de la génération article section par section.
- [server/services/external/claude.service.ts](../../server/services/external/claude.service.ts) — wrapper streaming SDK Anthropic.
- [src/services/api.service.ts](../../src/services/api.service.ts) (`apiStream`) — wrapper front qui consomme la `ReadableStream` POST.
- [src/composables/editor/useStreaming.ts](../../src/composables/editor/useStreaming.ts) — composable consommateur côté éditeur.

**Décisions d'architecture**
- **SSE first-token < 2 s** : non monitoré ; dépend du provider IA (Claude rapide ≈ 1 s, Gemini ≈ 1,5 s, OpenRouter variable).
- **Annulation utilisateur** : le wrapper SSE expose un `AbortController` consommé par le composable — un clic « Stop » coupe le stream immédiatement côté front et abort la fetch.
- **Heartbeat optionnel** : pas implémenté ; pas nécessaire tant que le réseau local est stable.

**Critères d'acceptation techniques**
- AC.PERFSSE.1 : premier `data:` SSE envoyé en < 2 s après réception du POST (hors cold start provider).
- AC.PERFSSE.2 : un `AbortController.abort()` côté client interrompt le stream serveur ET le rendu front sans laisser de zombie.

**Voir aussi**
- `DESIGN-INFRA-API-STREAM` — wrapper SSE unifié.
- `DESIGN-EXT-AI-FALLBACK` — bascule provider si timeout.

---

#### DESIGN-PERF-VIEW-LOAD

**Réf PRD :** [NFR-PERF-VIEW-LOAD](./prd.md#nfr-perf-view-load--bascule-rapide-entre-vues)

**Refs code**
- [src/router/index.ts](../../src/router/index.ts) — routes lazy via `() => import('../views/X.vue')` pour toutes les vues sauf `DashboardView` (chargée eagerly).

**Décisions d'architecture**
- **Lazy routes par défaut** : seul `DashboardView` (point d'entrée) et `NotFoundView` sont chargés au boot ; les 13 autres vues sont des chunks lazy.
- **Pas de prefetch d'arbre cocon** : le passage `DashboardView → SiloDetailView → CocoonLandingView` paye chaque chunk à son premier accès. Sur un cocon visité 100 fois dans une journée, le chunk est en cache navigateur — coût marginal.
- **Skeleton vs spinner** : la majorité des vues affichent un layout squelette pendant le fetch des données (pattern stable skeleton, cf. `DESIGN-UX-STABLE-SKELETON` à venir §9.9).

**Critères d'acceptation techniques**
- AC.PERFVL.1 : un changement de route via `router.push` rend la nouvelle vue en < 500 ms en condition chunk déjà chargé.
- AC.PERFVL.2 : un échec de chargement de chunk lazy (réseau coupé, hash invalide après déploiement) déclenche le handler `chunkLoadError` qui propose un reload (cf. `src/router/index.ts:112-120`).

**Voir aussi**
- `DESIGN-MAIN-NO-CYCLES` — un cycle d'imports peut forcer un chunk gros (charge plusieurs vues en bloc).

---

#### DESIGN-PERF-CACHE-HIT-RATE

**Réf PRD :** [NFR-PERF-CACHE-HIT-RATE](./prd.md#nfr-perf-cache-hit-rate--évite-les-appels-payants-déjà-connus)

**Refs code**
- [server/services/keyword/keyword-metrics.service.ts](../../server/services/keyword/keyword-metrics.service.ts) — cache permanent cross-article (table `keyword_metrics`).
- [server/services/external/dataforseo/index.ts](../../server/services/external/dataforseo/index.ts) — orchestrateur DataForSEO qui consulte le cache avant tout call.
- [server/services/infra/paa-cache.service.ts](../../server/services/infra/paa-cache.service.ts) — wrapper cache PAA (lit `keyword_metrics.paa_questions`).

**Persistance**
- Table `keyword_metrics(keyword, lang, country)` — PK composite, `fetched_at` pour freshness. Cf. `DESIGN-INFRA-KEYWORD-METRICS`.
- Table `external_api_cache(cache_key, cache_type, expires_at)` — TTL court (générique). Cf. `DESIGN-INFRA-API-CACHE`.
- Table `keyword_paa_questions` — cache PAA structuré par profondeur (cf. `DESIGN-INFRA-PAA-CACHE`).

**Décisions d'architecture**
- **Cascade 3 niveaux** : `keyword_metrics` (permanent cross-article) > `external_api_cache` (TTL générique) > `paa_cache` (logique sur `keyword_metrics.paa_questions`). Cf. `DESIGN-INFRA-API-CACHE`.
- **Pas d'instrumentation hit-rate** : la promesse « > 90 % » est prescriptive, pas mesurée. Pour l'auditer, un compteur à ajouter dans `keyword-metrics.service.ts` (incrémenter `hit` ou `miss` sur chaque lookup) puis un endpoint stats.

**Critères d'acceptation techniques**
- AC.PERFCH.1 : un second appel à `getKeywordMetrics(kw, lang, country)` avec une ligne `keyword_metrics` fraîche (< 30 j) renvoie depuis la DB sans `fetch` DataForSEO.
- AC.PERFCH.2 : la consultation cache précède **tous** les appels DataForSEO du service `dataforseo.service.ts`.

**Voir aussi**
- `DESIGN-MOT-CACHE-CASCADE` — orchestration des 3 niveaux côté Moteur.
- `DESIGN-INFRA-API-CACHE`, `DESIGN-INFRA-KEYWORD-METRICS`, `DESIGN-INFRA-PAA-CACHE`.
- `DRIFT-018` — la table `paa_cache` n'existe pas physiquement (logique sur `keyword_metrics.paa_questions`).

---

#### DESIGN-PERF-PURGE-HOURLY

**Réf PRD :** [NFR-PERF-PURGE-HOURLY](./prd.md#nfr-perf-purge-hourly--nettoyage-automatique-du-cache-obsolète)

**Refs code**
- [server/index.ts](../../server/index.ts):113-123 — `setInterval(..., 60 * 60 * 1000)` qui DELETE les entrées expirées de `external_api_cache`.

**Persistance**
- Table `external_api_cache(expires_at)` — DELETE WHERE expires_at < NOW().

**Décisions d'architecture**
- **Job in-process** : pas de scheduler externe (cron, pg_cron, BullMQ). L'app étant solo et locale, un `setInterval` au démarrage suffit.
- **Pas de purge sur `keyword_metrics`** : volontaire — le cache permanent ne doit pas être purgé automatiquement, sinon perte de capital cache. Si `keyword_metrics.fetched_at` est > 30 j, le service refetch à la demande (pas de purge en amont).
- **Pas de log de succès** : le job log uniquement les erreurs et les purges > 0 ligne (cf. log.debug). Pas de bruit en condition normale.

**Critères d'acceptation techniques**
- AC.PERFPH.1 : `setInterval` armé une fois au boot dans `server/index.ts`. Pas de double-arm si reload (le serveur entier redémarre).
- AC.PERFPH.2 : une entrée `external_api_cache` avec `expires_at` < NOW() est supprimée au prochain tick horaire.

**Voir aussi**
- `DESIGN-INFRA-API-CACHE-PURGE` — détail du flux de purge.
- `DESIGN-INFRA-API-CACHE` — schéma de la table.

---

#### DESIGN-PERF-SEO-DEBOUNCE

**Réf PRD :** [NFR-PERF-SEO-DEBOUNCE](./prd.md#nfr-perf-seo-debounce--scoring-seo-live-sans-saccader-la-frappe)

**Refs code**
- [src/composables/seo/useSeoScoring.ts](../../src/composables/seo/useSeoScoring.ts):9-76 — `useDebounceFn(..., 300)` + `requestIdleCallback` fallback pour exécuter le calcul SEO.

**Décisions d'architecture**
- **Debounce 300 ms** : le scoring est lancé 300 ms après la dernière saisie utilisateur. Trade-off frappe fluide vs reactivité du score — la valeur tient empiriquement.
- **`requestIdleCallback` quand disponible** : le scoring s'exécute en deferred (priorité basse navigateur) pour ne pas concurrencer le rendering du curseur dans l'éditeur. Fallback `setTimeout(..., 0)` si l'API n'est pas dispo (Safari < 16, vieux navigateurs).
- **Calcul incrémental non implémenté** : le scoring SEO recalcule tout l'article à chaque tick. Sur un article de 5000 mots c'est encore acceptable ; au-delà, envisager un calcul incrémental par paragraphe.

**Critères d'acceptation techniques**
- AC.PERFSD.1 : aucune mutation reactive n'est faite **avant** les 300 ms de pause de frappe.
- AC.PERFSD.2 : le scoring n'est pas exécuté dans le même tick que la mutation TipTap (priorité basse via `requestIdleCallback`/`setTimeout`).

**Voir aussi**
- `DESIGN-RED-SEO-SCORING` — moteur de scoring SEO côté Rédaction.
- `DESIGN-RED-EDITOR-TIPTAP` — éditeur consommateur.

---

#### DESIGN-PERF-INTER-SECTION-DELAY

**Réf PRD :** [NFR-PERF-INTER-SECTION-DELAY](./prd.md#nfr-perf-inter-section-delay--pause-entre-sections-pour-fiabiliser-la-génération)

**Refs code**
- [server/routes/generate/_helpers.ts](../../server/routes/generate/_helpers.ts):35-36 — `export const INTER_SECTION_DELAY_MS = Number(process.env.INTER_SECTION_DELAY ?? 15_000)`.
- [server/routes/generate/article.routes.ts](../../server/routes/generate/article.routes.ts):208-211 — orchestration `await sleep(INTER_SECTION_DELAY_MS)` entre 2 sections.

**Décisions d'architecture**
- **Default 15 s** : valeur empirique anti-rate-limit Claude. Pour les tests d'intégration, `INTER_SECTION_DELAY=0` dans `.env.test`.
- **Pause côté serveur** : la pause est appliquée par le backend entre 2 SSE chunks, pas côté front. L'utilisateur voit un état d'attente entre 2 sections, pas un blocage interactif.
- **Pas de back-off adaptatif** : la pause est fixe. Si Claude renvoie un 429, l'app ne ré-essaie pas plus longtemps — c'est le `claude.service.ts` qui gère le retry.

**Critères d'acceptation techniques**
- AC.PERFISD.1 : entre 2 sections d'un même article, un `setTimeout` de `INTER_SECTION_DELAY_MS` (ou `process.env.INTER_SECTION_DELAY` si défini) sépare 2 appels Claude.
- AC.PERFISD.2 : en mode test (`INTER_SECTION_DELAY=0`), la pause est désactivée, permettant des tests Vitest rapides.

**Voir aussi**
- `DESIGN-RED-GENERATE-ARTICLE` — orchestration générale.

---

### §9.2 — Coût et optimisation (DESIGN-COST)

#### DESIGN-COST-CACHE-FIRST

**Réf PRD :** [NFR-COST-CACHE-FIRST](./prd.md#nfr-cost-cache-first--aucun-appel-payant-si-la-réponse-est-déjà-en-cache)

**Refs code**
- [server/services/external/dataforseo/index.ts](../../server/services/external/dataforseo/index.ts) — chaque méthode débute par un `await getKeywordMetrics(...)` (ou équivalent paaCache) avant le fetch DataForSEO.
- [server/services/keyword/keyword-metrics.service.ts](../../server/services/keyword/keyword-metrics.service.ts) — exposition des helpers `getKeywordMetrics`, `isKeywordMetricsFresh`, `upsertKeywordMetrics`.
- [server/services/infra/paa-cache.service.ts](../../server/services/infra/paa-cache.service.ts) — wrapper PAA spécialisé.

**Persistance**
- Tables `keyword_metrics`, `external_api_cache`, `keyword_paa_questions` — cf. `DESIGN-INFRA-API-CACHE`, `DESIGN-INFRA-KEYWORD-METRICS`, `DESIGN-INFRA-PAA-CACHE`.

**Décisions d'architecture**
- **Cache-first par convention** : chaque service externe vérifie le cache avant l'appel. Pattern réimplémenté localement par service plutôt qu'extrait dans un `getOrFetch` central (cf. `DRIFT-009`).
- **Pas de "force refresh" implicite** : pour rafraîchir un mot-clé, il faut purger explicitement via les boutons « Vider cache » des panneaux Moteur (cf. `FR-UI-MOTEUR-SHARED`) ou attendre l'expiration TTL.

**Critères d'acceptation techniques**
- AC.COSTCF.1 : tout `fetch` vers `api.dataforseo.com` est précédé d'une consultation cache dans le même fichier.
- AC.COSTCF.2 : un test unitaire mock-fait sur `dataforseo.service.ts` doit pouvoir prouver « 0 appel fetch » quand le cache renvoie une valeur fraîche.

**Voir aussi**
- `DESIGN-MOT-CACHE-CASCADE` — orchestration des 3 niveaux.
- `DESIGN-INFRA-GET-OR-FETCH` — pattern réimplémenté localement.

---

#### DESIGN-COST-POSTGRESQL

**Réf PRD :** [NFR-COST-POSTGRESQL](./prd.md#nfr-cost-postgresql--persistance-qui-survit-aux-redémarrages)

**Refs code**
- [server/db/pool.ts](../../server/db/pool.ts) — pool `pg` global.
- [server/db/schema.sql](../../server/db/schema.sql) — snapshot horodaté de la structure (cf. CLAUDE.md §1).
- [server/db/migrations/](../../server/db/migrations/) — migrations actives (anciennes archivées dans `_archive/`).

**Persistance**
- 20 tables actives au 2026-05-12 (cf. matrice §8.14.bis du PRD).
- Pas de fichier JSON dans `data/` pour des données chaudes (vestiges archivés dans `data/_archive/`).

**Décisions d'architecture**
- **PostgreSQL local monoposte** : décision assumée pour un outil solo. Pas de réplication, pas de cloud. Backup = `pg_dump` manuel ou automatisé OS.
- **Snapshot SQL plutôt que migrations** : la doc canonique du schéma est `schema.sql` (snapshot avec sha256 + commit), pas la liste de migrations. Les migrations restent la trace historique mais ne sont pas la source de vérité (cf. `DRIFT-010`).
- **Exception GSC token** : `data/gsc-token.json` est un fichier JSON local (OAuth token + refresh) — décision historique outil solo, cf. `DESIGN-EXT-GSC-OAUTH`.

**Critères d'acceptation techniques**
- AC.COSTPG.1 : `npm run db:check` (compare sha256 DB live ↔ snapshot) doit rester vert.
- AC.COSTPG.2 : aucun service backend n'écrit sur disque pour des données chaudes (ils utilisent `pool.query(...)`).

**Voir aussi**
- `DESIGN-INFRA-API-CACHE`, `DESIGN-INFRA-KEYWORD-METRICS` — tables principales.
- `DRIFT-010` — migration `020` archivée, snapshot est SSOT.

---

#### DESIGN-COST-BODY-LIMIT

**Réf PRD :** [NFR-COST-BODY-LIMIT](./prd.md#nfr-cost-body-limit--plafond-raisonnable-sur-la-taille-des-payloads)

**Refs code**
- [server/index.ts](../../server/index.ts):35 — `app.use(express.json({ limit: '5mb' }))`.

**Décisions d'architecture**
- **5 Mo** : marge confortable pour les articles longs (5 Mo de JSON = ~ 100 articles de 5000 mots, ce qui ne devrait jamais se voir dans une requête unitaire).
- **Refus immédiat HTTP 413** : Express renvoie un `Payload Too Large` qui remonte au handler global d'erreur.

**Critères d'acceptation techniques**
- AC.COSTBL.1 : un POST de payload > 5 Mo reçoit un 413 sans crasher le serveur.
- AC.COSTBL.2 : la limite est configurée **une seule fois** dans `server/index.ts`, pas répliquée dans chaque route.

**Voir aussi**
- `DESIGN-INFRA-ERROR-HANDLER` — propagation de l'erreur 413.

---

#### DESIGN-COST-DATAFORSEO-BUDGET

**Réf PRD :** [NFR-COST-DATAFORSEO-BUDGET](./prd.md#nfr-cost-dataforseo-budget--budget-glissant-qui-plafonne-la-dépense)

**Refs code**
- [server/services/external/dataforseo-cost-guard.ts](../../server/services/external/dataforseo-cost-guard.ts) — module sliding-window complet.

**Variables d'environnement**
- `DATAFORSEO_COST_BUDGET_USD` — budget en USD (default 0.5).
- `DATAFORSEO_COST_WINDOW_MIN` — durée fenêtre en minutes (default 30).

**Décisions d'architecture**
- **Budget glissant in-memory** : les entrées (timestamp + coût) sont stockées en RAM dans le module. Au redémarrage du serveur, l'historique est perdu — c'est volontaire (start fresh à chaque session).
- **Tarifs DataForSEO codés en dur** : `ENDPOINT_BASE_COST` et `ENDPOINT_PER_ITEM_COST` reflètent les tarifs publics au moment de l'écriture. À refresh si DataForSEO change ses prix.
- **Endpoint inconnu = 0.005 USD** : DEFAULT_UNKNOWN_ENDPOINT_COST appliqué avec un `log.warn` pour signaler un trou de couverture.

**Critères d'acceptation techniques**
- AC.COSTDB.1 : `costGuard.reserve(endpoint, body)` throw `CostBudgetError` si la dépense projetée dépasse `budgetUsd()` sur la fenêtre.
- AC.COSTDB.2 : `.env.test` ou `process.env.DATAFORSEO_COST_BUDGET_USD=999` permet de désactiver l'effet pour les tests intégration.

**Historique**
- 2026-05-04 : module créé suite à un incident production (consommation accidentelle massive).

**Voir aussi**
- `DESIGN-EXT-DATAFORSEO-COSTGUARD` — détail du flux côté Discovery/Radar.
- `DESIGN-COST-DATAFORSEO-RESERVE` — pendant pré-call.
- `DRIFT-022` — env vars du PRD pré-migration différentes des vraies (`DATAFORSEO_COST_BUDGET` vs `DATAFORSEO_COST_BUDGET_USD`).

---

#### DESIGN-COST-DATAFORSEO-RESERVE

**Réf PRD :** [NFR-COST-DATAFORSEO-RESERVE](./prd.md#nfr-cost-dataforseo-reserve--blocage-pré-appel-quand-le-budget-serait-dépassé)

**Refs code**
- [server/services/external/dataforseo-cost-guard.ts](../../server/services/external/dataforseo-cost-guard.ts) — méthodes `reserve(endpoint, body)` et `commit(endpoint, body)`.
- [server/services/external/dataforseo/_client.ts](../../server/services/external/dataforseo/_client.ts) — wrapper qui appelle `reserve` puis `commit` autour de chaque fetch DataForSEO.

**Décisions d'architecture**
- **Reserve + commit pattern** : `reserve` ajoute le coût *projeté* à la fenêtre **avant** l'appel HTTP. `commit` confirme (ou rien) après succès. En cas d'erreur réseau, le coût est gardé (pessimiste) — un mode strict.
- **Pas de rollback automatique** : si l'appel DataForSEO échoue, le coût reste compté. Décision : préférer la prudence (l'appel a peut-être consommé un crédit même si la réponse est en erreur).
- **CostBudgetError = 429 côté client** : le middleware d'erreur traduit en 429 Too Many Requests pour le front, qui affiche la notification dédiée.

**Critères d'acceptation techniques**
- AC.COSTDR.1 : `reserve()` lance `CostBudgetError` avant tout `fetch` si le budget serait dépassé.
- AC.COSTDR.2 : aucun fetch DataForSEO n'est émis quand `reserve` throw.

**Voir aussi**
- `DESIGN-EXT-DATAFORSEO-COSTGUARD` — vue end-to-end avec UI.

---

#### DESIGN-COST-AI-MOCK

**Réf PRD :** [NFR-COST-AI-MOCK](./prd.md#nfr-cost-ai-mock--mode-développement-gratuit)

**Refs code**
- [server/services/external/ai-provider.service.ts](../../server/services/external/ai-provider.service.ts) — dispatcher multi-provider (claude / gemini / openrouter / mock).
- [server/services/external/mock.service.ts](../../server/services/external/mock.service.ts) — implémentation des fixtures locales.
- [server/services/external/mock-fixtures/](../../server/services/external/mock-fixtures/) — JSON figés (réponses Claude, Gemini, DataForSEO).
- [server/services/infra/runtime-mode.service.ts](../../server/services/infra/runtime-mode.service.ts) — toggle mock/réel persisté en DB.
- [src/components/shared/RuntimeModeBadge.vue](../../src/components/shared/RuntimeModeBadge.vue) — badge navbar visible.

**Variables d'environnement**
- `AI_PROVIDER=mock|claude|gemini|openrouter` — provider par défaut au boot.
- Override runtime via toggle navbar (persisté en `runtime_mode` table).

**Décisions d'architecture**
- **Toggle navbar unique** : un seul toggle pilote DataForSEO sandbox + provider IA (cohérence UX assumée, cf. `DESIGN-EXT-DATAFORSEO-SANDBOX`).
- **Fixtures déterministes** : les réponses mock sont stables — un même prompt renvoie toujours le même résultat. Idéal pour les tests E2E.
- **Pas d'auto-bascule réseau coupé** : si Claude renvoie une erreur réseau, l'app ne bascule pas automatiquement en mock. C'est une décision utilisateur via le toggle. Le fallback inter-provider (Claude → Gemini) est géré par `ai-provider.service.ts` (cf. `DESIGN-EXT-AI-FALLBACK`).

**Critères d'acceptation techniques**
- AC.COSTAM.1 : `AI_PROVIDER=mock` au boot supprime tout appel à Anthropic/Google.
- AC.COSTAM.2 : le badge navbar reflète l'état actuel (mock | real | sandbox) à tout moment.

**Voir aussi**
- `DESIGN-EXT-AI-MULTI-PROVIDER` — dispatcher.
- `DESIGN-INFRA-RUNTIME-MODE` — persistance du toggle.

---

### §9.3 — Intégration et contrats (DESIGN-INT)

#### DESIGN-INT-MOTEUR-BIMODAL

**Réf PRD :** [NFR-INT-MOTEUR-BIMODAL](./prd.md#nfr-int-moteur-bimodal--mêmes-composants-en-workflow-et-en-libre)

**Refs code**
- [src/components/moteur/CaptainPanel.vue](../../src/components/moteur/CaptainPanel.vue):60 — `props.mode: 'workflow' | 'libre'`.
- [src/components/moteur/DiscoveryPanel.vue](../../src/components/moteur/DiscoveryPanel.vue):30 — idem.
- [src/components/moteur/LieutenantsPanel.vue](../../src/components/moteur/LieutenantsPanel.vue):37 — idem.

**Décisions d'architecture**
- **Prop `mode` au lieu de duplication** : un seul composant prend une prop qui conditionne les comportements (émission de checks, persistance article-scoped vs scratch, gating). C'est le pattern qui a remplacé l'ancien Labo en double (cf. §8.11 supprimé 2026-05-10).
- **Pas de `v-if mode === 'workflow'` partout** : les différences sont concentrées dans 1-2 endroits par composant (typiquement : événements émis vers le parent, écriture en DB). Le rendu visuel est intentionnellement identique.

**Critères d'acceptation techniques**
- AC.INTMB.1 : aucun composant Moteur n'existe en deux variantes workflow / libre.
- AC.INTMB.2 : la prop `mode` est typée `'workflow' | 'libre'` (union stricte, pas `string`).

**Voir aussi**
- `DESIGN-MOT-BIMODAL` (instance générale du pattern).
- §8.11 PRD — historique Labo supprimé.

---

#### DESIGN-INT-COMPLETED-CHECKS-SSOT

**Réf PRD :** [NFR-INT-COMPLETED-CHECKS-SSOT](./prd.md#nfr-int-completed-checks-ssot--une-seule-source-pour-la-progression-dun-article)

**Refs code**
- [src/stores/article/article-progress.store.ts](../../src/stores/article/article-progress.store.ts) — store Pinia, header `AUTHORITY: PostgreSQL articles.completed_checks TEXT[]`.
- [server/routes/articles.routes.ts](../../server/routes/articles.routes.ts) — endpoints `POST /articles/:id/progress/check` et `POST /articles/:id/progress/uncheck`.

**Persistance**
- Table `articles(completed_checks TEXT[])` — colonne flat, valeurs préfixées (`moteur:*`, `cerveau:*`, `redaction:*`).

**Décisions d'architecture**
- **AUTHORITY explicite** : le store porte un header `AUTHORITY:` consultable via grep (cf. CLAUDE.md §3.2). Tout consommateur de la progression lit ce store, pas la table directement.
- **Optimistic update** : les actions `addCheck` / `removeCheck` mettent à jour l'état Pinia immédiatement puis POST en arrière-plan. Si l'API échoue, rollback Pinia.
- **Pas de copie locale** : aucun composant ne maintient sa propre liste de checks dérivée. Tous lisent `progressMap[articleId]`.

**Critères d'acceptation techniques**
- AC.INTSSOT.1 : `useArticleProgressStore.completedChecks` est la seule source consommée par les composants qui affichent une progression.
- AC.INTSSOT.2 : un `addCheck(MOTEUR_*)` côté Moteur déclenche un re-rendu de `ProgressDots` au dashboard dans le même tick.

**Voir aussi**
- `DESIGN-DASH-PROGRESS`, `DESIGN-MOT-CHECKS`, `DESIGN-MOT-DISPLAY-FROM-STORE`.

---

#### DESIGN-INT-CHECKS-NAMESPACE

**Réf PRD :** [NFR-INT-CHECKS-NAMESPACE](./prd.md#nfr-int-checks-namespace--préfixes-de-workflow-pour-ranger-les-checks)

**Refs code**
- [shared/constants/workflow-checks.constants.ts](../../shared/constants/workflow-checks.constants.ts):15-45 — toutes les constantes préfixées :
  - Moteur : `MOTEUR_DISCOVERY_DONE` = `'moteur:discovery_done'`, `MOTEUR_RADAR_DONE`, `MOTEUR_CAPITAINE_LOCKED`, `MOTEUR_LIEUTENANTS_LOCKED`, `MOTEUR_LEXIQUE_VALIDATED`.
  - Cerveau : `CERVEAU_STRATEGY_DEFINED`, `CERVEAU_HIERARCHY_BUILT`, `CERVEAU_ARTICLES_PROPOSED`.
  - Rédaction : `REDACTION_BRIEF_VALIDATED`, `REDACTION_OUTLINE_VALIDATED`, `REDACTION_CONTENT_WRITTEN`, `REDACTION_SEO_VALIDATED`, `REDACTION_PUBLISHED`.

**Décisions d'architecture**
- **Convention `domain:snake_case`** : préfixe lowercase + `:` + nom en snake_case lowercase. La constante TS est `DOMAIN_NAME` (uppercase + `_`) pour distinguer la valeur stockée vs la référence code.
- **Colonne unique flat** : pas de colonne séparée par domaine (sinon évolution coûteuse). Le filtrage se fait en mémoire (ex : `completedChecks.filter(c => c.startsWith('moteur:'))`).
- **Cerveau prêt mais non émis** : les 3 constantes `CERVEAU_*` existent mais aucun composant ne les émet (cf. `DRIFT-002` — décision produit à prendre).

**Critères d'acceptation techniques**
- AC.INTCN.1 : aucun composant n'écrit directement une string `'moteur:xxx'` — il utilise une constante.
- AC.INTCN.2 : tous les checks émis correspondent à une constante exportée par `workflow-checks.constants.ts`.

**Voir aussi**
- `DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS` — détail des constantes.
- `DRIFT-002` — checks Cerveau non émis côté front.

---

#### DESIGN-INT-SERP-ONCE

**Réf PRD :** [NFR-INT-SERP-ONCE](./prd.md#nfr-int-serp-once--le-serp-est-scrapé-une-seule-fois-et-cascade)

**Refs code**
- [server/services/keyword/keyword-metrics.service.ts](../../server/services/keyword/keyword-metrics.service.ts) — `serp_raw_json` JSONB dans `keyword_metrics`.
- [server/services/external/scrape-corpus.service.ts](../../server/services/external/scrape-corpus.service.ts) — récupération du contenu HTML des résultats SERP.
- [server/routes/serp-analysis.routes.ts](../../server/routes/serp-analysis.routes.ts) — endpoint Lieutenants.
- Lexique consomme `keyword_metrics.serp_raw_json` via les services Lexique (cf. `DESIGN-LEX-* TODO`).

**Persistance**
- `keyword_metrics(serp_raw_json JSONB)` — réutilisé entre Lieutenants et Lexique sans double scrape.

**Décisions d'architecture**
- **Une scrape pour deux usages** : les Lieutenants scrape les 10 résultats Google ; le Lexique réutilise pour faire son TF-IDF. Zéro doublon par design.
- **Pas d'invalidation manuelle SERP** : la fraîcheur est portée par `fetched_at` de `keyword_metrics`. Au-delà du seuil, refetch.

**Critères d'acceptation techniques**
- AC.INTSO.1 : le service Lexique consomme `keyword_metrics.serp_raw_json` plutôt que de relancer un scrape.
- AC.INTSO.2 : aucun chemin de code ne fait un double scrape pour le même (keyword, lang, country) dans la fenêtre de fraîcheur.

**Voir aussi**
- `DESIGN-LIE-* TODO`, `DESIGN-LEX-* TODO` — détail aval.

---

#### DESIGN-INT-SCORING-CONFIGURABLE

**Réf PRD :** [NFR-INT-SCORING-CONFIGURABLE](./prd.md#nfr-int-scoring-configurable--seuils-de-scoring-centralisés-et-explicables)

**Refs code**
- [shared/scoring.ts](../../shared/scoring.ts) — seuils legacy.
- [shared/kpi-scoring.ts](../../shared/kpi-scoring.ts) — seuils KPI marché (volume, CPC, difficulté, etc.).
- [shared/score/](../../shared/score/) — module unifié exposant `compareScores`, `averageScores`, `index.ts` SSOT consommateur.

**Décisions d'architecture**
- **Module score à entrée unique** : `shared/score/index.ts` est le point de consommation pour le front et le back. Les fichiers internes (`aggregate.ts`, `compare.ts`, `format.ts`) ne sont pas importés directement.
- **Dependency-cruiser garde** : `.dependency-cruiser.cjs` interdit les imports profonds dans `shared/score/` (sauf depuis le module lui-même).
- **Tooltips côté UI** : les composants qui affichent un score importent les helpers de format (`formatVolume`, `formatCpc`, etc.) — l'explication tooltip lit la même formule.

**Critères d'acceptation techniques**
- AC.INTSC.1 : aucun composant ne hardcode un seuil — il importe depuis `shared/scoring.ts` ou `shared/score/`.
- AC.INTSC.2 : changer un seuil dans le module propage à tous les consommateurs sans modification ailleurs.

**Voir aussi**
- `DESIGN-INFRA-SCORE-MODULE` — détail module.
- `DESIGN-INFRA-NO-SCORE-FALLBACK` — règle anti-fallback.

---

#### DESIGN-INT-PROMPT-AGNOSTIC

**Réf PRD :** [NFR-INT-PROMPT-AGNOSTIC](./prd.md#nfr-int-prompt-agnostic--prompts-ia-réutilisables-contexte-injecté-à-lextérieur)

**Refs code**
- [server/prompts/](../../server/prompts/) — fichiers `.md` agnostiques (variables `{{strategy_context}}`, `{{painPoint}}`, `{{captainKeyword}}`...).
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts):93-129 — `loadPrompt(name, variables, options)` qui substitue les placeholders et applique `escapePromptContent` sur les variables marquées.

**Décisions d'architecture**
- **`loadPrompt` est le seul chemin** : aucun service ne fait `fs.readFile + .replace` artisanal. C'est l'invariant qui empêche les divergences.
- **`escapePromptContent` obligatoire** : toute variable utilisateur (selectedText, brief, articleContent) est marquée `escape: true` dans `options.escapeKeys`. Le prompt-loader applique l'escape avant substitution. Anti prompt-injection (cf. `DESIGN-INFRA-PROMPT-LOADER`).
- **Pas de strategy injection inline** : si un prompt a besoin du contexte stratégie cocon, il porte `{{strategy_context}}` et le service appelant passe `cocoonSlug` à `loadPrompt` qui charge la stratégie automatiquement.

**Critères d'acceptation techniques**
- AC.INTPA.1 : aucun fichier `.md` dans `server/prompts/` ne contient une référence à un article ou un cocon spécifique.
- AC.INTPA.2 : aucun service backend n'utilise `fs.readFile` directement sur un prompt — tous passent par `loadPrompt`.

**Voir aussi**
- `DESIGN-INFRA-PROMPT-LOADER` — détail mécanisme.
- `NFR-SEC-PROMPT-INJECTION` — hardening.

---

#### DESIGN-INT-STRATEGY-OPTIONAL

**Réf PRD :** [NFR-INT-STRATEGY-OPTIONAL](./prd.md#nfr-int-strategy-optional--lia-fonctionne-même-sans-stratégie-cerveau)

**Refs code**
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — si `cocoonSlug` passé mais pas de stratégie en base, `{{strategy_context}}` reçoit `''` (chaîne vide) ; les services qui consomment `painPoint` substituent par `(non défini)` quand absent.
- [server/services/strategy/](../../server/services/strategy/) — fallback de récupération stratégie.

**Décisions d'architecture**
- **Dégradation gracieuse** : absence d'amont = contexte vide, pas erreur. L'utilisateur peut utiliser le Moteur ou la Rédaction sans avoir terminé Cerveau.
- **Placeholders lisibles** : `(non défini)` plutôt que `undefined`/`null` — l'IA voit un texte sensé même quand la donnée manque.
- **Pas de blocage UI** : aucune action IA n'est désactivée parce que la stratégie est vide. Seules les actions qui dépendent d'un check Moteur sont gatées (cf. `FR-MOT-SOFT-GATING`).

**Critères d'acceptation techniques**
- AC.INTSO.1 : un appel `POST /generate/article-section` avec un article sans `article_strategies` row ne crashe pas — la prompt expansion remplace `{{strategy_context}}` par chaîne vide.
- AC.INTSO.2 : un appel sans `painPoint` substitue par `(non défini)`.

**Voir aussi**
- `DESIGN-CER-CONTEXT-FOR-MOTEUR` — pont Cerveau→Moteur.

---

#### DESIGN-INT-ZOD-VALIDATION

**Réf PRD :** [NFR-INT-ZOD-VALIDATION](./prd.md#nfr-int-zod-validation--toutes-les-requêtes-api-sont-validées)

**Refs code**
- [shared/schemas/](../../shared/schemas/) — 13 fichiers `.schema.ts` partagés front/back (cf. `DRIFT-017` — pas 41 comme annoncé pré-migration).
- Chaque route Express utilise `Schema.safeParse(req.body)` et délègue à un service métier en cas de succès.

**Décisions d'architecture**
- **Schemas dans `shared/`** : front + back consomment les mêmes types/parsers. Zéro divergence possible.
- **safeParse plutôt que parse** : permet de renvoyer une 400 avec détails (`result.error.flatten()`) au lieu de crasher.
- **Pas un schema 1:1 par endpoint** : un endpoint peut composer plusieurs schemas (body + query + response).

**Critères d'acceptation techniques**
- AC.INTZV.1 : toutes les routes Express qui acceptent un body POST/PUT/PATCH appellent `Schema.safeParse(...)` avant la logique métier.
- AC.INTZV.2 : un body invalide renvoie HTTP 400 avec `{ error: { issues: [...] } }`.

**Voir aussi**
- `DESIGN-INFRA-ZOD-SHARED` — liste détaillée des 13 schemas.
- `DRIFT-017` — divergence count annoncé vs réel.

---

#### DESIGN-INT-API-WRAPPER

**Réf PRD :** [NFR-INT-API-WRAPPER](./prd.md#nfr-int-api-wrapper--tous-les-appels-au-backend-passent-par-un-wrapper-unique)

**Refs code**
- [src/services/api.service.ts](../../src/services/api.service.ts):94, 106, 124, 135, 151, 275 — exports `apiGet`, `apiPost`, `apiDelete`, `apiPatch`, `apiPut`, `apiStream`.

**Décisions d'architecture**
- **Un seul fichier wrapper** : pas de helper local par store. Tout passe par `src/services/api.service.ts`.
- **Garanties communes** : retry sur réseau coupé, `KNOWN_ERROR_CODES` traduits en notifications, cost-log automatique sur les routes IA, `AbortSignal` propagé.
- **`apiStream` pour SSE** : wrapper POST → ReadableStream avec mêmes garanties que `apiPost` (cost-log + error mapping).

**Critères d'acceptation techniques**
- AC.INTAW.1 : `python .claude/skills/data-flow-discipline/scripts/audit_data_flow.py` retourne 0 violation dans la catégorie « fetch() directs hors wrapper » côté `src/`.
- AC.INTAW.2 : tout fichier `src/**/*.ts` ou `src/**/*.vue` qui appelle `/api/*` passe par un des 6 helpers.

**Historique**
- 2026-05-05 : dette résorbée (chantier `tech-spec-fetch-to-wrapper-migration`).

**Voir aussi**
- `DESIGN-INFRA-API-WRAPPER`, `DESIGN-INFRA-API-STREAM` — détail des wrappers.

---

#### DESIGN-OBS-EXTERNAL-API-OPT-OUT

**Réf PRD :** [NFR-OBS-EXTERNAL-API-OPT-OUT](./prd.md#nfr-obs-external-api-opt-out--les-appels-aux-apis-tierces-sont-volontairement-hors-wrapper)

**Refs code**
- [server/services/external/](../../server/services/external/) — 14 sites de `fetch()` vers APIs tierces (DataForSEO, Google Suggest, GSC, Tavily, OAuth callbacks).
- Marqueur convention : `// External API call — bypass wrapper by design (<provider>)`.

**Décisions d'architecture**
- **Marqueur grep-able** : la chaîne `External API call` est cherchée par l'audit data-flow. Si présent, le `fetch()` est légitime ; si absent et hors `external/`, c'est une violation.
- **Pas de wrapper externe** : pourquoi pas un wrapper unifié pour les APIs tierces aussi ? Parce que chacune a sa logique propre (retry, code d'erreur, format, auth) — un wrapper unique serait soit trop générique (peu utile) soit trop complexe (autant garder du natif).

**Critères d'acceptation techniques**
- AC.OBSEAO.1 : `grep -r "External API call" server/` retourne ≥ 14 occurrences.
- AC.OBSEAO.2 : `audit_data_flow.py` reconnaît le marqueur et n'émet pas de violation pour ces fetch.

**Historique**
- 2026-05-05 : marqueur introduit pour permettre le passage en vert de l'audit après migration `fetch→wrapper` (`tech-spec-fetch-to-wrapper-migration`).

**Voir aussi**
- `DESIGN-EXT-*` — services qui contiennent ces fetch.

---

### §9.4 — Maintenabilité (DESIGN-MAIN)

#### DESIGN-MAIN-ORG-STORES

**Réf PRD :** [NFR-MAIN-ORG-STORES](./prd.md#nfr-main-org-stores--stores-organisés-par-domaine)

**Refs code**
- [src/stores/article/](../../src/stores/article/) — stores Article (editor, brief, outline, seo, geo, internal-linking, progress…).
- [src/stores/keyword/](../../src/stores/keyword/) — stores Keyword (article-keywords, radar-exploration, keyword-discovery, linking…).
- [src/stores/strategy/](../../src/stores/strategy/) — stores Strategy (cocoon-strategy, article-strategy, theme-config).
- [src/stores/external/](../../src/stores/external/) — stores External (gsc, runtime-mode, cost-log…).
- [src/stores/ui/](../../src/stores/ui/) — stores UI (notification, captain-trigger, workflow-nav, local).

**Décisions d'architecture**
- **5 domaines stables** : `article`, `keyword`, `strategy`, `external`, `ui`. Tout nouveau store doit appartenir à un de ces 5 — sinon c'est un signal qu'on devrait scinder ou repenser le domaine.
- **Pattern nom de fichier** : `kebab-case.store.ts` (ex : `article-progress.store.ts`).
- **Header `AUTHORITY:` obligatoire** : tout store sur donnée partagée porte le header (cf. CLAUDE.md §3.2).

**Critères d'acceptation techniques**
- AC.MAINOS.1 : `ls src/stores/` retourne exactement 5 dossiers.
- AC.MAINOS.2 : tout store importé dans plus d'un composant porte un header `AUTHORITY:` à jour.

**Voir aussi**
- CLAUDE.md §3 — règles de structure.

---

#### DESIGN-MAIN-ORG-COMPOSABLES

**Réf PRD :** [NFR-MAIN-ORG-COMPOSABLES](./prd.md#nfr-main-org-composables--composables-organisés-par-domaine)

**Refs code**
- [src/composables/article/](../../src/composables/article/), [editor/](../../src/composables/editor/), [intent/](../../src/composables/intent/), [keyword/](../../src/composables/keyword/), [lexique/](../../src/composables/lexique/), [moteur/](../../src/composables/moteur/), [seo/](../../src/composables/seo/), [ui/](../../src/composables/ui/) — **8 domaines au 2026-05-12** (vs 5 annoncés dans le PRD pré-migration, cf. `DRIFT-023`).

**Décisions d'architecture**
- **Croissance assumée** : les composables ont éclos en sous-domaines au fur et à mesure (extraction `moteur` depuis les vues, `lexique` séparé de `keyword`, `article` pour les transverses Rédaction). Le PRD est maintenu à jour.
- **Pattern nom de fichier** : `useCamelCase.ts` (ex : `useSeoScoring.ts`).
- **Pas de `composables/utils/` fourre-tout** : si un composable n'a pas de place évidente, c'est probablement un service ou une fonction utilitaire pure.

**Critères d'acceptation techniques**
- AC.MAINOC.1 : `ls src/composables/` retourne 8 dossiers : `article`, `editor`, `intent`, `keyword`, `lexique`, `moteur`, `seo`, `ui`.
- AC.MAINOC.2 : tout fichier `useXxx.ts` vit dans un de ces 8 dossiers.

**Voir aussi**
- `DRIFT-023` — divergence 5 vs 8.

---

#### DESIGN-MAIN-ORG-SERVICES

**Réf PRD :** [NFR-MAIN-ORG-SERVICES](./prd.md#nfr-main-org-services--services-backend-organisés-par-domaine)

**Refs code**
- [server/services/keyword/](../../server/services/keyword/) (autocomplete, keyword-metrics, keyword-radar, paa, scoring, intent…).
- [server/services/external/](../../server/services/external/) (DataForSEO, GSC, Claude, Gemini, OpenRouter, Mock, AI-provider, embedding, scrape-corpus).
- [server/services/intent/](../../server/services/intent/) (intent-scan, captain-paa).
- [server/services/article/](../../server/services/article/) (article-keywords, content-gap…).
- [server/services/strategy/](../../server/services/strategy/) (strategy CRUD + IA suggest/deepen/consolidate).
- [server/services/infra/](../../server/services/infra/) (data-service, paa-cache, discovery-cache, radar-cache, radar-exploration, local-entities, runtime-mode).
- [server/services/queries/](../../server/services/queries/) — queries SQL réutilisables.

**Décisions d'architecture**
- **7 domaines stables** : `keyword`, `external`, `intent`, `article`, `strategy`, `infra`, `queries`.
- **Routes Express délèguent** : pas de logique métier dans les `routes/*.routes.ts` — seulement validation Zod, appel service, format réponse `{ data: T }`.
- **Drift connu** : `autocomplete.service.ts` est dans `keyword/` au lieu de `external/` malgré son rôle d'API tierce (cf. `DRIFT-016`).

**Critères d'acceptation techniques**
- AC.MAINOSV.1 : `ls server/services/` retourne 7 dossiers.
- AC.MAINOSV.2 : aucune route Express ne contient une query SQL ou un appel API tierce inline.

**Voir aussi**
- `DRIFT-016` — autocomplete mal placé.

---

#### DESIGN-MAIN-TESTS-VITEST

**Réf PRD :** [NFR-MAIN-TESTS-VITEST](./prd.md#nfr-main-tests-vitest--couverture-unitaire-vitest)

**Refs code**
- [tests/unit/](../../tests/unit/) — miroir de `src/`, `server/`, `shared/`. Sous-dossiers : `architecture`, `coherence`, `components`, `composables`, `directives`, `infra`, `router`, `routes`, `schemas`, `services`, `shared`, `stores`, `utils`.
- [tests/contract-api/](../../tests/contract-api/) — tests de contrats Zod entre front et back.
- [tests/integration/](../../tests/integration/), [tests/integration-tabs/](../../tests/integration-tabs/) — tests d'intégration multi-composants.
- [vitest.config.ts](../../vitest.config.ts) — config Vitest unifiée.

**Décisions d'architecture**
- **Tests miroirs** : `tests/unit/stores/article-progress.store.test.ts` ↔ `src/stores/article/article-progress.store.ts`. Convention de chemin = découverte facile.
- **Préfixes par domaine** : `describe('moteur: ...', ...)`, `describe('cerveau: ...', ...)` pour grep et filter.
- **Baseline diff** : `npm run test:snapshot` enregistre `tests/.baseline.json` (rouges/verts) ; `npm run test:check` compare un run actuel à la baseline — répond « mon chantier a-t-il cassé un test ? ».

**Critères d'acceptation techniques**
- AC.MAINTV.1 : `npm run test:unit` exécute la suite complète et doit être vert avant merge sur main.
- AC.MAINTV.2 : tout nouveau service/store/composable sur zone TDD strict (cf. CLAUDE.md §2.1) a au moins un test associé.

**Voir aussi**
- `docs/testing-guide.md` — règles détaillées TDD strict vs pragmatique.

---

#### DESIGN-MAIN-TESTS-PLAYWRIGHT

**Réf PRD :** [NFR-MAIN-TESTS-PLAYWRIGHT](./prd.md#nfr-main-tests-playwright--couverture-bout-en-bout-playwright)

**Refs code**
- [tests/browser-e2e/](../../tests/browser-e2e/) — suite Playwright.
- [playwright.config.ts](../../playwright.config.ts) — config (ports auto via pretest:browser).
- [tests/e2e-workflows/](../../tests/e2e-workflows/) — workflows complets (Cerveau → Moteur → Rédaction).

**Décisions d'architecture**
- **Auto-kill ports** : `pretest:browser` libère 3400 / 5400 avant lancement pour éviter les conflits avec un `npm run dev` actif.
- **`*.browser.test.ts`** : convention de naming pour distinguer les tests Playwright des unit.
- **Pas de CI cloud** : tests Playwright lancés manuellement sur Windows local — pas de pipeline GitHub Actions actuellement (outil solo).

**Critères d'acceptation techniques**
- AC.MAINTP.1 : `npm run test:browser` exécute la suite Playwright et libère les ports d'abord.
- AC.MAINTP.2 : chaque parcours majeur (Cerveau workflow, Moteur 6 onglets, Rédaction génération) a au moins un scénario E2E.

**Voir aussi**
- `docs/testing-guide.md`.

---

#### DESIGN-MAIN-TOOLING

**Réf PRD :** [NFR-MAIN-TOOLING](./prd.md#nfr-main-tooling--outillage-qualité-automatisé)

**Refs code**
- [eslint.config.ts](../../eslint.config.ts) — config ESLint avec plugin Vue + TypeScript + Vitest + Oxlint chain.
- [.oxlintrc.json](../../.oxlintrc.json) — config Oxlint (linter Rust ultra-rapide).
- [.prettierrc.json](../../.prettierrc.json) (si présent) — config Prettier.
- [.dependency-cruiser.cjs](../../.dependency-cruiser.cjs) — règles d'architecture (no-server-in-src, no-cycles, score-module-internal).
- [knip.config.ts](../../knip.config.ts) (ou équivalent) — config code mort.
- [.husky/](../../.husky/) — hooks Git (pre-commit run `npx lint-staged`).

**Variables d'environnement**
- N/A.

**Décisions d'architecture**
- **Oxlint avant ESLint** : Oxlint catch la majorité des bugs en quelques secondes (Rust), ESLint complète sur les règles plus avancées (TypeScript, Vue).
- **Husky + lint-staged** : pre-commit auto-formatte les fichiers staged. Pas de skip-hook autorisé sans raison explicite.
- **knip + madge + dependency-cruiser** : 3 outils complémentaires (dead code, cycles, archi).

**Critères d'acceptation techniques**
- AC.MAINTO.1 : `npm run lint` retourne vert sur main.
- AC.MAINTO.2 : un commit qui introduit un cycle d'import est rejeté par le pre-commit (via `check:cycles`).

**Voir aussi**
- `DESIGN-INFRA-DEPENDENCY-CRUISER` — détail config archi.

---

#### DESIGN-MAIN-CHECK-HEALTH

**Réf PRD :** [NFR-MAIN-CHECK-HEALTH](./prd.md#nfr-main-check-health--commande-unique--tout-va-bien-)

**Refs code**
- [package.json](../../package.json) `"check:health"` script — `run-s lint type-check check:cycles check:dead check:arch`.

**Décisions d'architecture**
- **`run-s` séquentiel** : chaque check tourne après le précédent ; le premier rouge fait sortir avec exit code ≠ 0. Bénéfice : feedback rapide sans attendre la fin.
- **Pas de tests dans `check:health`** : volontaire — `check:health` valide la statique (lint + type + archi), pas le runtime. Les tests s'exécutent à part via `test:unit` et `test:browser`.

**Critères d'acceptation techniques**
- AC.MAINCH.1 : `npm run check:health` retourne 0 si tout est vert, ≠ 0 sinon.
- AC.MAINCH.2 : un échec sur l'un des 5 checks (lint, type-check, cycles, dead, arch) propage le code de sortie.

**Voir aussi**
- `DESIGN-INFRA-CHECK-HEALTH` — détail interne.

---

#### DESIGN-MAIN-NO-SCORE-FALLBACK

**Réf PRD :** [NFR-MAIN-NO-SCORE-FALLBACK](./prd.md#nfr-main-no-score-fallback--interdire-les-fallbacks-silencieux-sur-scores)

**Refs code**
- [eslint.config.ts](../../eslint.config.ts):49-79 — trois sélecteurs AST `no-restricted-syntax` qui matchent `XxxScore ?? 0` (Identifier, MemberExpression direct et penultième).
- [shared/score/](../../shared/score/) — `compareScores`, `averageScores` — helpers à utiliser à la place.

**Décisions d'architecture**
- **Pas une règle ESLint custom mais des `no-restricted-syntax`** : la règle est implémentée via 3 sélecteurs AST (pas un plugin séparé, pas un fichier `local-rules/no-score-fallback.cjs`). Le PRD parle de « règle no-score-fallback » comme nom logique, le code utilise `no-restricted-syntax`.
- **Override pour `shared/score/**`** : l'implémentation du module a le droit aux `0` dans ses calculs internes (sinon impossible d'écrire la formule).
- **Couverture limitée à `[Ss]core`** : la règle ne couvre pas `Density|Volume|Difficulty|Cpc|Competition` malgré la promesse PRD d'extension 2026-05-05 (cf. `DRIFT-019`).

**Critères d'acceptation techniques**
- AC.MAINNSF.1 : `npm run lint` rejette `card.relevanceScore ?? 0`.
- AC.MAINNSF.2 : `npm run lint` accepte `shared/score/aggregate.ts` qui contient légitimement des `0`.

**Voir aussi**
- `DESIGN-INFRA-NO-SCORE-FALLBACK` — détail historique de la règle.
- `DRIFT-019` — couverture incomplète aux KPI marché.

---

#### DESIGN-MAIN-FILE-SIZE

**Réf PRD :** [NFR-MAIN-FILE-SIZE](./prd.md#nfr-main-file-size--cible-de-taille-de-fichier-raisonnable)

**Refs code**
- Pas de garde-fou automatisé (pas de règle lint « max-lines » active). C'est une discipline.

**État des offenders au 2026-05-12** (vs PRD pré-migration qui listait CaptainValidation 1507 L, KeywordDiscoveryTab 1419 L, BrainPhase 1066 L — fichiers depuis disparus ou refactorisés, cf. `DRIFT-021`) :
- **`src/components/moteur/CaptainPanel.vue` : 1509 L** — orchestrateur unifié de l'onglet Capitaine (regroupement post-refactor 2026-05).
- **`server/services/infra/data.service.ts` : 1052 L** — service serveur fourre-tout cache + articles ; candidat scission.
- **Zone de vigilance 700-1000 L** : `keywords.routes.ts` (912), `dynamic-block-drop.ts` (901), `MoteurView.vue` (856), `ArticleEditorView.vue` (790), `StrategyStep.vue` (779), `RadarPanel.vue` (777), `LexiquePanel.vue` (761), `LieutenantsPanel.vue` (753), `ArticleWorkflowView.vue` (732), `BriefStructureStep.vue` (723), `KeywordAuditTable.vue` (723).

**Décisions d'architecture**
- **Cible 400 L, pas mur** : la cible est prescriptive, pas bloquante. Pas de pre-commit hook qui rejette.
- **Sprints de stabilisation** : la dette est traitée par paquets (cf. `tech-spec-stabilisation-codebase` Sprints S4-S5 historiques, et tech-specs à venir pour `CaptainPanel.vue` + `data.service.ts`).

**Critères d'acceptation techniques**
- AC.MAINFS.1 : un nouveau fichier vise < 400 L. Au-delà, justification dans la tech-spec.
- AC.MAINFS.2 : tout fichier > 1000 L est documenté comme dette technique (PRD §12.5 ou tech-spec dédiée).

**Voir aussi**
- `DRIFT-021` — révision des offenders.
- §12.5 PRD — dette technique.

---

#### DESIGN-MAIN-NO-CYCLES

**Réf PRD :** [NFR-MAIN-NO-CYCLES](./prd.md#nfr-main-no-cycles--pas-de-cycles-dimports)

**Refs code**
- [package.json](../../package.json) `"check:cycles"` script — `madge --circular --ts-config tsconfig.json --extensions ts shared server`.

**Décisions d'architecture**
- **Madge sur `shared` + `server`** : `src/` n'est pas inclus dans le check actuel (à voir si à étendre).
- **`check:cycles` dans `check:health`** : intégré au check de santé global ; échec = rejet pre-commit.

**Critères d'acceptation techniques**
- AC.MAINNC.1 : `npm run check:cycles` retourne vert (0 cycle détecté).
- AC.MAINNC.2 : un commit qui introduit un cycle est rejeté.

**Voir aussi**
- `DESIGN-MAIN-CHECK-HEALTH` — intégration.

---

### §9.5 — Sécurité et robustesse (DESIGN-SEC)

#### DESIGN-SEC-CORS

**Réf PRD :** [NFR-SEC-CORS](./prd.md#nfr-sec-cors--accès-limité-à-la-machine-locale)

**Refs code**
- [server/index.ts](../../server/index.ts) — middleware CORS configuré pour localhost uniquement.

**Décisions d'architecture**
- CORS restrictif par défaut — l'app n'est pas pensée pour fonctionner en exposition réseau.
- Pas de configuration dynamique de la liste d'origines : un seul mode `localhost`.

**Voir aussi** : `DESIGN-OBS-HEALTH` (endpoint non protégé qui sert au check de santé).

---

#### DESIGN-SEC-ZOD-INPUT

**Réf PRD :** [NFR-SEC-ZOD-INPUT](./prd.md#nfr-sec-zod-input--toute-requête-api-est-validée-à-lentrée)

**Refs code**
- [shared/schemas/](../../shared/schemas/) — schémas Zod partagés front+back.
- Toute route Express utilise `safeParse` côté entrée.

**Décisions d'architecture**
- Schémas partagés `shared/schemas/` — garantit qu'un payload accepté côté front l'est aussi côté back.
- Rejet 400 avec message structuré (champ + raison) — pas de stack trace.

**Voir aussi** : `DESIGN-INT-ZOD-VALIDATION`, `DESIGN-OBS-ERROR-HANDLER`.

---

#### DESIGN-SEC-PROMPT-INJECTION

**Réf PRD :** [NFR-SEC-PROMPT-INJECTION](./prd.md#nfr-sec-prompt-injection--protection-contre-linjection-de-prompt-ia)

**Refs code**
- [server/utils/prompt-loader.ts](../../server/utils/prompt-loader.ts) — fonction `escapePromptContent()`.

**Décisions d'architecture**
- Échappement systématique sur toute variable substituée dans un prompt (`{{strategy_context}}`, `{{painPoint}}`, `{{articleTitle}}`, etc.).
- Filtre les caractères de contrôle, neutralise les marqueurs de fin de prompt, etc.

**Voir aussi** : `DESIGN-INFRA-PROMPT-LOADER`.

---

#### DESIGN-SEC-ENV-VARS

**Réf PRD :** [NFR-SEC-ENV-VARS](./prd.md#nfr-sec-env-vars--secrets-dans-env-jamais-commités)

**Refs code**
- [.gitignore](../../.gitignore) — exclusion `.env`.
- [.env.example](../../.env.example) — template documentant les variables.

**Décisions d'architecture**
- Lecture via `process.env.*` exclusivement côté services backend.
- Aucune constante de clé en dur dans le code.

---

#### DESIGN-SEC-GSC-TOKENS

**Réf PRD :** [NFR-SEC-GSC-TOKENS](./prd.md#nfr-sec-gsc-tokens--token-oauth-google-search-console-stocké-localement)

**Refs code**
- [server/services/external/gsc.service.ts](../../server/services/external/gsc.service.ts) — gestion du token (lecture/écriture/refresh).

**Tables / fichiers consommés** : fichier local au chemin défini par variable d'env (typiquement `data/gsc-token.json`).

**Décisions d'architecture**
- Stockage local en clair — accepté en monoposte single-user.
- Refresh automatique du token (OAuth refresh flow).
- Aucun log du contenu du token (filtre côté logger).

**Évolution possible** : chiffrement du fichier ou déplacement vers un coffre-fort système (Windows Credential Manager, macOS Keychain).

**Voir aussi** : `DESIGN-EXT-GSC-OAUTH`.

---

### §9.6 — Observabilité (DESIGN-OBS)

#### DESIGN-OBS-LOGGER

**Réf PRD :** [NFR-OBS-LOGGER](./prd.md#nfr-obs-logger--logs-structurés-avec-4-niveaux-de-gravité)

**Refs code**
- [server/utils/logger.ts](../../server/utils/logger.ts) — logger central, 4 niveaux DEBUG/INFO/WARN/ERROR.

**Décisions d'architecture**
- Format : `[timestamp] [level] [module] message`.
- Pas de logger externe (Winston, Pino…) — logger maison léger suffisant pour monoposte.
- Pas de transport fichier persistant — sortie console uniquement (l'utilisateur garde l'output ouvert).

**Voir aussi** : `DESIGN-OBS-CONFIG`.

---

#### DESIGN-OBS-CONFIG

**Réf PRD :** [NFR-OBS-CONFIG](./prd.md#nfr-obs-config--verbosité-des-logs-ajustable-par-module)

**Refs code**
- [server/utils/logs.config.ts](../../server/utils/logs.config.ts) (ou équivalent) — config niveaux par module.

**Décisions d'architecture**
- Config statique au démarrage (modification = redémarrage léger).
- Niveau par défaut : INFO partout.

**Voir aussi** : `DESIGN-OBS-LOGGER`.

---

#### DESIGN-OBS-HEALTH

**Réf PRD :** [NFR-OBS-HEALTH](./prd.md#nfr-obs-health--endpoint-de-santé-du-backend)

**Refs code**
- [server/index.ts](../../server/index.ts) — endpoint `GET /api/health`.

**Endpoints** : `GET /api/health` → 200 OK avec payload minimal.

**Décisions d'architecture**
- Réponse instantanée — pas de check DB inclus (la connexion DB est vérifiée au démarrage, cf. `DESIGN-OBS-DB-CHECK`).
- Pas d'authentification — endpoint trivial sans données sensibles.

---

#### DESIGN-OBS-DB-CHECK

**Réf PRD :** [NFR-OBS-DB-CHECK](./prd.md#nfr-obs-db-check--vérification-de-la-base-au-démarrage)

**Refs code**
- [server/index.ts](../../server/index.ts) — ping PostgreSQL au démarrage.
- [server/db/pool.ts](../../server/db/pool.ts) (ou équivalent) — pool pg.

**Décisions d'architecture**
- Ping au démarrage uniquement — pas de re-check périodique en production.
- Échec → log ERROR explicite + comportement documenté (continuer ou s'arrêter selon flag).

---

#### DESIGN-OBS-ERROR-HANDLER

**Réf PRD :** [NFR-OBS-ERROR-HANDLER](./prd.md#nfr-obs-error-handler--gestion-centralisée-des-erreurs-api)

**Refs code**
- [server/utils/error-handler.ts](../../server/utils/error-handler.ts) — middleware central.

**Décisions d'architecture**
- Tout `next(err)` Express passe par ce middleware.
- Mapping erreur applicative → statut HTTP + code applicatif + message utilisateur.
- Détail technique loggué côté serveur, pas exposé au client.

**Voir aussi** : `DESIGN-OBS-KNOWN-ERRORS`.

---

#### DESIGN-OBS-COST-LOG

**Réf PRD :** [NFR-OBS-COST-LOG](./prd.md#nfr-obs-cost-log--journal-dactivité-visible-dans-lui)

**Refs code**
- [src/stores/ui/cost-log.store.ts](../../src/stores/ui/cost-log.store.ts) — store Pinia `useCostLogStore`.
- [src/services/api.service.ts](../../src/services/api.service.ts) — injection `pushUsageIfPresent` après chaque appel.

**Stores Pinia** : `useCostLogStore` — accumule API usage + DB ops + messages.

**Décisions d'architecture**
- Pas de persistance — log session navigateur.
- Plafond circulaire (N derniers événements) pour éviter la fuite mémoire.

**Voir aussi** : `DESIGN-OBS-DBOPS-TRACK`.

---

#### DESIGN-OBS-DBOPS-TRACK

**Réf PRD :** [NFR-OBS-DBOPS-TRACK](./prd.md#nfr-obs-dbops-track--compteur-dopérations-db-par-requête)

**Refs code**
- [server/utils/db-ops-tracker.ts](../../server/utils/db-ops-tracker.ts) (ou équivalent) — comptage par requête.
- [src/services/api.service.ts](../../src/services/api.service.ts) — fonction `pushDbOpsIfPresent`.

**Décisions d'architecture**
- Compteur attaché au lifecycle d'une requête HTTP — réinitialisé à chaque requête entrante.
- Exposé dans la réponse via un header ou un champ enveloppe.

**Voir aussi** : `DESIGN-OBS-COST-LOG`.

---

#### DESIGN-OBS-KNOWN-ERRORS

**Réf PRD :** [NFR-OBS-KNOWN-ERRORS](./prd.md#nfr-obs-known-errors--codes-derreur-applicatifs-lisibles-dans-lui)

**Refs code**
- [shared/constants/known-errors.ts](../../shared/constants/known-errors.ts) (ou équivalent) — catalogue partagé front+back.
- [src/services/api.service.ts](../../src/services/api.service.ts) — reconnaissance des codes connus + affichage UI.

**Décisions d'architecture**
- Codes énumérés (ex : `BUDGET_EXCEEDED`, `PROVIDER_QUOTA`, `INVALID_KEYWORD`).
- Message utilisateur en français (langue cible du produit) — pas le message brut du provider.

**Voir aussi** : `DESIGN-OBS-ERROR-HANDLER`, `DESIGN-EXT-DATAFORSEO-COSTGUARD`.

---

### §9.9 — Expérience utilisateur (DESIGN-UX)

#### DESIGN-UX-STABLE-SKELETON

**Réf PRD :** [NFR-UX-STABLE-SKELETON](./prd.md#nfr-ux-stable-skeleton--squelette-dinterface-stable-états-visuels-plutôt-quapparitions)

**Refs code**
- [src/components/moteur/ai-panel/AiPanel.vue](../../src/components/moteur/ai-panel/AiPanel.vue) + sous-composants — coque générique avec états `idle/streaming/success/error`.
- [src/components/moteur/RadarPanel.vue](../../src/components/moteur/RadarPanel.vue) — exemple d'application complète (DouleurScannerResults rend toujours les 3 sections, RadarThermometer accepte `null`).
- [src/components/moteur/discovery/DiscoverySourcesList.vue](../../src/components/moteur/discovery/DiscoverySourcesList.vue) — compteurs `(0)` toujours visibles.
- [tests/unit/components/moteur/ai-panels-persistence.test.ts](../../tests/unit/components/moteur/ai-panels-persistence.test.ts) — tests architecturaux qui vérifient la présence DOM au mount.

**Décisions d'architecture**
- **États visuels recommandés** : `idle` (coque grisée, CTA disabled, message d'invitation), `loading` (spinner sur CTA), `success` (contenu rendu), `error` (bandeau + retry).
- **`v-if` autorisés uniquement pour le coût de rendu** (ex : arbre PAA non déplié = lourd à monter) — accompagné d'un placeholder de même silhouette pour préserver la mise en page.
- **Pattern composant réel en état vide > placeholder mock distinct** — un composant unique accepte `null` props et adapte son rendu, plutôt qu'un placeholder séparé qui risque de diverger visuellement au passage idle → success.

**Critères d'acceptation techniques**
- AC.UX.SKEL.1 : pour chaque coque IA Moteur listée en périmètre, un test composant vérifie que le DOM `data-testid="*-ai-panel"` est présent au mount sans action utilisateur déclenchée.
- AC.UX.SKEL.2 : pour chaque CTA majeur, un test vérifie la présence DOM + l'attribut `disabled` si la précondition n'est pas remplie.
- AC.UX.SKEL.3 : aucun élément du périmètre n'utilise un `v-if` conditionné à un état utilisateur transitoire (`hasClickedX`, `analysisLoading === false && analysisResult === null`).

**Statut audit (au 2026-05-12)**
- Discovery : ✅ conforme.
- Radar : ✅ conforme.
- Lexique : ✅ conforme.
- Lieutenants : ✅ conforme.
- Capitaine, Rédaction (`ArticleWorkflowIaBrief`) : ⚠️ à auditer (tests `it.skip` dans `ai-panels-persistence.test.ts`).

**Voir aussi** : `DESIGN-UI-AI-PANELS-PATTERN`.

---
