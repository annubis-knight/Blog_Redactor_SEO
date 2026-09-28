---
name: strategy
description: Stratégie du cocon — cinq étapes validées, carte indicative des articles (proposedArticles) et compteur completedSteps — dans un seul document JSON cocoon_strategies.data ; stratégie d'article héritée (article_strategies), écrite par le seul mode automatique.
type: "CocoonStrategy (JSONB cocoon_strategies.data) ; ArticleStrategy (JSONB article_strategies.data + completed_steps INTEGER) ; StrategyContextData (lecture seule, GET /api/cocoons/:id/strategy/context)"
last_updated: 2026-09-28
related_fr: [FR-CER-STEPS-COCOON, FR-CER-SAISIE-PRESERVEE, FR-CER-STEPS-ARTICLE, FR-CER-COCOON-PROGRESSIVE, FR-CER-TYPE-TOLERANT, FR-PIE-AI-GENERATION, FR-PIE-CERVEAU-OVERRIDE, FR-CER-CONTEXT-FOR-MOTEUR, FR-RED-GEN-UNLOCK, FR-MOT-RECAP-PUBLISHED, FR-MOT-RECAP-LOCK-SYNC, FR-INFRA-COCOON-STRATEGIES, FR-INFRA-ARTICLE-STRATEGIES]
---

# Data Flow — strategy

> **En clair :** au Cerveau, l'utilisateur pose une fois pour tout le cocon sa stratégie : à qui il parle (Cible), quel problème il règle (Douleur), sous quel angle, avec quelle promesse et quel appel à l'action (CTA). La sixième étape, « Articles », prépare une **carte indicative** : la liste des articles envisagés, avec leur niveau, leur parent et leur mot-clé. Tout cela vit dans un seul document JSON par cocon.
>
> **Type/format :** `CocoonStrategy` ([`shared/types/strategy.types.ts`](../../shared/types/strategy.types.ts)) : `cible`, `douleur`, `angle`, `promesse`, `cta` (chacun `StrategyStepData { input, suggestion, validated, subQuestions? }`), `proposedArticles: ProposedArticle[]`, `suggestedTopics`, `topicsUserContext`, `completedSteps` (0 à 6), `cocoonSlug`, `updatedAt`. Validé par `cocoonStrategySchema` ([`shared/schemas/strategy.schema.ts`](../../shared/schemas/strategy.schema.ts)).
>
> **Chapitres :** [Cerveau](../11-cerveau.md) (« Stratégie du cocon : les six étapes », « Stratégie d'article », « Carte indicative du cocon », « Stratégie du cocon au Moteur et à la Rédaction »), [Infrastructure transversale](../20-infrastructure.md) (« Persistance du travail par article et par cocon »). L'injection dans les consignes de l'IA a sa fiche : [strategy-context.md](./strategy-context.md). L'arbre réel des articles aussi : [articles.md](./articles.md).

## Producteurs

**Les cinq étapes.** [`BrainPhase.vue`](../../src/components/production/BrainPhase.vue) et [`StrategyStep.vue`](../../src/components/strategy/StrategyStep.vue) mutent le store [`useCocoonStrategyStore`](../../src/stores/strategy/cocoon-strategy.store.ts) :
- saisie (`input`), validation (`validateOwnInput`, `validateSuggestion`, `validateAll` = fusion), sous-questions (`handleDeepen`, `handleSubSuggest`, `handleSubMerge`, `handleSubEnrich`) ;
- les appels à l'IA (`requestSuggestion`, `requestDeepen`, `requestEnrich` → `POST /api/strategy/cocoon/:cocoonSlug/suggest|deepen|enrich`, [`strategy.routes.ts`](../../server/routes/strategy.routes.ts), prompts de [`strategy-prompts.service.ts`](../../server/services/strategy/strategy-prompts.service.ts)) **renvoient un texte** ; ils n'écrivent rien en base.

**Enregistrement.** `saveStrategy(cocoonSlug)` → `PUT /api/strategy/cocoon/:cocoonSlug` avec **tout** le document. Appelé par `nextStep` (qui avance d'une étape et porte `completedSteps` au numéro atteint, sans jamais le baisser), par `handleNext` à l'étape 6 (« Terminer le brainstorm » : `completedSteps = 6`) et par chaque geste de la carte. `updateStepData`, `prevStep` et `goToStep` ne font que muter le store.

**La carte indicative** (`proposedArticles`) :
- [`useArticleProposals`](../../src/composables/editor/useArticleProposals.ts) : génération (`createGenerationPipeline`), ajout (`addSmartArticle`), retrait (`removeProposedArticle`, plus `DELETE /api/articles/:dbId` pour un article créé), titre (`editTitle`, plus `PATCH`), parent sur la carte (`changeParent`), intention attendue (`updatePainIntent`, plus `PATCH { painIntentExpected }` pour un article créé, FR-PIE-CERVEAU-OVERRIDE) ; le `watch` immédiat complète `id`, `suggestedSlug`, `dbId` et enregistre ;
- [`useCocoonBuilder`](../../src/composables/strategy/useCocoonBuilder.ts) : `registerInStrategy` inscrit l'article que l'arbre vient de créer (même `dbId`, sinon même titre non créé, sinon nouvelle ligne) ; `attachOrphan` recopie `parentTitle` et `parentSection` après un rattachement.

**Serveur.** [`cocoon-strategy.service.ts`](../../server/services/strategy/cocoon-strategy.service.ts) `saveCocoonStrategy` : `resolveCocoonId` (nom, nom sans tirets, puis slug de chaque cocon ; inconnu → exception, donc 500), fusion **de premier niveau** avec l'existant (`{ ...existant, ...reçu }` : une clé reçue remplace toute l'ancienne), validation Zod, `INSERT … ON CONFLICT (cocoon_id) DO UPDATE`, `generated_at = NOW()`.

**Stratégie d'article.** `PUT /api/strategy/:id` → [`strategy.service.ts`](../../server/services/strategy/strategy.service.ts) `saveStrategy` (même fusion, `articleStrategySchema`, `completed_steps` recopié du JSON). Seul écrivain : le mode automatique ([`scripts/auto-article/phases/cerveau.ts`](../../scripts/auto-article/phases/cerveau.ts), étape 8). Aucun écran ne la remplit.

## Persistance

| Donnée | Où | Lecture |
|---|---|---|
| Stratégie du cocon + carte | `cocoon_strategies(cocoon_id PK → cocoons ON DELETE CASCADE, data JSONB, generated_at)` | `getCocoonStrategy(slug)` : JSON refusé par le schéma → `null` |
| Stratégie d'article | `article_strategies(article_id PK → articles ON DELETE CASCADE, data JSONB, completed_steps INTEGER, updated_at)` | `getStrategy(id)` : même règle |
| Copie de travail (cocon) | `useCocoonStrategyStore.strategy` : un seul cocon à la fois | `fetchStrategy(slug)` au montage du Cerveau, du Moteur, de la Rédaction ; étape courante = `min(completedSteps, 5)` |
| Barre « Contexte stratégique » | `useCocoonStrategyStore.strategicContext` | `fetchContext(cocoonId)` au montage du Moteur et de la Rédaction ; figée ensuite |
| Copie de travail (article) | [`useStrategyStore.strategy`](../../src/stores/strategy/strategy.store.ts) | `fetchStrategy(id)` dans la rédaction guidée seulement |

L'écran désigne le cocon par le slug de son nom (`BrainPhase`, `MoteurView`, `RedactionView` le recalculent chacun) ; le serveur le résout en `cocoon_id`. Le champ `cocoonSlug` du JSON reprend la clé reçue au dernier enregistrement.

## Consommateurs

### Affichage (UI)

- **Cerveau** — `StrategyStep` (réponse, suggestion, texte validé, sous-questions), [`ContextRecap.vue`](../../src/components/strategy/ContextRecap.vue), la barre d'étapes (`cerveauNavSteps` → `useWorkflowNavStore`). Le `watch` de `stepData.input` ignore une valeur enregistrée vide quand la saisie locale ne l'est pas (FR-CER-SAISIE-PRESERVEE).
- **Carte** — [`BrainArticleProposalView.vue`](../../src/components/production/brain/BrainArticleProposalView.vue), [`ProposedArticleRow.vue`](../../src/components/strategy/ProposedArticleRow.vue) (badge « créé » si `createdInDb`), [`GenerateCocoonMenu.vue`](../../src/components/production/brain/GenerateCocoonMenu.vue) (`mapHasPillar` : un pilier titré).
- **Moteur et Rédaction** — [`MoteurStrategyContext.vue`](../../src/components/moteur/MoteurStrategyContext.vue) : les valeurs `validated` non vides de `GET /api/cocoons/:id/strategy/context` ; absente sans stratégie.
- **Moteur** — la barre des articles : « Articles suggérés » = **toutes** les lignes de `proposedArticles` (`buildRecapArticles`, [`src/utils/recap-articles.ts`](../../src/utils/recap-articles.ts) : `id = dbId`, titre, niveau, adresse et douleur de la carte, capitaine verrouillé lu dans `capitainesMap`). Les mots-clés proposés au Capitaine viennent de la ligne de même titre (`suggestedKeywordsForArticle`).

### Calcul / tri / filtre / agrégat

- `getPreviousAnswers` — textes validés des étapes, avec leurs sous-réponses validées → `previousAnswers` des prompts du Cerveau (`buildPreviousAnswersBlock`).
- `buildCocoonStrategyBlock` (cinq `validated` non vides) → `{{strategy_context}}` et `pickStrategyContext` : cf. [strategy-context.md](./strategy-context.md).
- `isComplete` (`completedSteps >= 6`) — verrou de l'étape « Article » dans la barre de la rédaction guidée ([`ArticleWorkflowView.vue`](../../src/views/ArticleWorkflowView.vue) : `cocoonStrategyStore.isComplete || strategyStore.isComplete`).
- Serveur : `GET /api/cocoons/:id/strategy/context`, candidats d'un nouvel article (`{{strategy_context}}` par le nom du cocon), rattrapage [`backfill-cocoon.ts`](../../scripts/backfill-cocoon.ts) (parent indiqué par la carte).

## Règles de cohérence

- **Seul `validated` sort du Cerveau.** Le badge du Cerveau, la barre « Contexte stratégique » et le bloc des consignes lisent le même champ. Une valeur vide est une absence : omise du bloc, `null` dans la barre, jamais remplacée par un texte par défaut.
- **`completedSteps` compte les étapes atteintes**, pas les étapes validées : « Suivant » le fait avancer, même sur une étape vide. C'est ce seuil (6) que lit la Rédaction.
- **La carte guide, l'arbre crée.** Ce qui peut naître se juge dans la table `articles`, jamais dans `proposedArticles` ([articles.md](./articles.md)). Mais le Moteur liste ses articles depuis la carte : un article créé doit y être inscrit.
- **Un seul document.** Les cinq étapes et la carte voyagent ensemble à chaque enregistrement : qui enregistre écrit tout.

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque |
|---|---|---|---|
| **Saisie sans « Suivant »** | store | aucune | La réponse tapée n'est enregistrée qu'au prochain `saveStrategy` (« Suivant », geste de la carte). Quitter l'écran avant la perd. |
| **Stratégie arrivée après la saisie** | `fetchStrategy` | aucune | Couvert : une valeur enregistrée vide n'écrase pas la saisie (FR-CER-SAISIE-PRESERVEE). |
| **Carte complète régénérée** | — | `proposedArticles` réassigné en entier | Les lignes `createdInDb` disparaissent de la carte ; le Moteur perd ces articles au prochain enregistrement. |
| **Génération ou régénération sans enregistrement** | store | aucune | `generateArticleProposals`, `regenerate*`, `select*` n'enregistrent pas : la carte affichée n'est pas celle de la base tant qu'un autre geste n'a pas enregistré. |
| **Deux onglets sur le même cocon** | chaque onglet a son store | `PUT` du document entier | Le dernier enregistrement gagne, étapes et carte comprises. |
| **JSON refusé par le schéma** | `getCocoonStrategy` → `null` | le prochain `PUT` repart d'une stratégie vide | Perte silencieuse : ne pas durcir `cocoonStrategySchema` sans migrer les données. |
| **Stratégie modifiée pendant que le Moteur est ouvert** | `strategicContext` figé | — | La barre se met à jour à la prochaine ouverture ; les consignes, elles, relisent la base à chaque appel. |
| **Titre modifié sur la carte** | `suggestedKeywordsForArticle` cherche par titre | `PATCH` du titre en base | Tant que la carte et la base concordent, rien ; une ligne régénérée sous un autre titre perd ses mots-clés proposés. |

## Limites connues

- **FR-CER-STEPS-ARTICLE (non tenue)** — aucun écran ne remplit `article_strategies` ; `POST /api/strategy/batch-status` et `POST …/consolidate` n'ont aucun appelant à l'écran.
- **FR-RED-GEN-UNLOCK (non tenue)** — le verrou lu sur `isComplete` ne vit que dans la barre de navigation ; « Valider le sommaire » ouvre l'étape Article sans le tester.
- Un niveau illisible dans une réponse de l'IA retombe en silence sur `specifique` (carte complète) ou sur le niveau demandé (ajout).

## Tests de cohérence

- [`tests/unit/coherence/strategy.test.ts`](../../tests/unit/coherence/strategy.test.ts) — **ne garde rien** : il déclare ses propres listes d'étapes et sa propre fonction de contexte, sans importer le code ; son bloc « completedSteps = nombre d'étapes validées » décrit une règle que le code ne suit pas (le compteur suit « Suivant »).
- [`tests/unit/coherence/strategy-context.test.ts`](../../tests/unit/coherence/strategy-context.test.ts) — le vrai `buildStrategyContext` et le vrai `buildCocoonStrategyBlock` : champs validés seulement, bloc vide sans donnée.
- Ce qui garde réellement le flux, hors du dossier `coherence/` : [`strategy-step-saisie.test.ts`](../../tests/unit/components/strategy-step-saisie.test.ts) (FR-CER-SAISIE-PRESERVEE), [`strategy.routes.test.ts`](../../tests/unit/routes/strategy.routes.test.ts), [`strategy.service.test.ts`](../../tests/unit/services/strategy.service.test.ts), [`cocoons-strategy.contract.test.ts`](../../tests/contract-api/cocoons-strategy.contract.test.ts), [`moteur-strategy-context.test.ts`](../../tests/unit/components/moteur-strategy-context.test.ts), [`useCocoonBuilder.test.ts`](../../tests/unit/composables/useCocoonBuilder.test.ts) (inscription sur la carte), [`proposed-articles-map.test.ts`](../../tests/unit/composables/proposed-articles-map.test.ts), [`recap-articles.test.ts`](../../tests/unit/utils/recap-articles.test.ts).
- À écrire : `strategy.test.ts` réécrit sur le vrai store (`nextStep` et `completedSteps`, `getPreviousAnswers`) ; un test qui vérifie qu'un `PUT` de la carte complète garde les lignes `createdInDb`.

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
