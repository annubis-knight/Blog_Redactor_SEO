---
name: strategy-context
description: Ce que les consignes de l'IA savent du cocon et de l'article — stratégie du cocon ({{strategy_context}}), stratégie de l'article ou du cocon ({{strategyContext}}), douleur de l'article ({{painPoint}}) et état de l'arbre du cocon ({{cocoon_context}}).
type: "blocs Markdown rendus dans les prompts par loadPrompt ; sources : cocoon_strategies.data, article_strategies.data, articles.pain_point, arbre du cocon (articles, article_content, article_keywords)"
last_updated: 2026-09-28
related_fr: [FR-MOT-STRATEGY-INJECTION, FR-MOT-PAINPOINT-INJECTION, FR-PAIN-IMMUTABLE-AFTER-CEREVEAU, FR-CAP-PAINPOINT-FALLBACK, FR-CER-CONTEXT-FOR-MOTEUR, FR-CER-STEPS-ARTICLE, FR-INFRA-PROMPT-LOADER, FR-INFRA-PROMPT-LAYERS, FR-INFRA-COCOON-CONTEXT, NFR-INT-STRATEGY-OPTIONAL]
---

# Data Flow — strategy-context

> **En clair :** une consigne (un *prompt*, fichier `.md` de [`server/prompts/`](../../server/prompts/)) ne contient rien qui dépende du client. Au moment de l'appel, le chargeur de prompts y glisse des blocs de contexte : la stratégie validée du cocon, la douleur de l'article (le problème vécu par le lecteur), l'état de l'arbre du cocon. Exemple : pour proposer la structure H2/H3 d'un intermédiaire, l'IA reçoit la cible du cocon, la douleur de l'article et la liste des articles déjà nés du pilier, pour ne pas les répéter.
>
> **Type/format :** des chaînes Markdown, vides quand la donnée manque (jamais une erreur). La douleur absente devient le texte explicite « (non défini) ».
>
> **Chapitres :** [IA et prompts](../04-ia-et-prompts.md), [Référence des prompts](../05-prompts-reference.md) (inventaire généré : variables et appelants de chaque prompt), [Infrastructure transversale](../20-infrastructure.md) (« Chargeur de prompts et couches de contexte », « État du cocon pour les générations »), [Moteur — cadre commun](../12-moteur.md) (« Contexte donné à l'IA »), [Rédaction](../17-redaction.md). La donnée stratégie elle-même : [strategy.md](./strategy.md). La zone du client (`{{zone}}`) : [local.md](./local.md).

## Producteurs

Quatre blocs, construits côté serveur à chaque appel, sans cache.

| Variable | Source | Construit par | Vide quand |
|---|---|---|---|
| `{{strategy_context}}` (globale du chargeur) | `cocoon_strategies.data.{cible,douleur,angle,promesse,cta}.validated` | `loadPrompt(nom, variables, { cocoonSlug })` → `loadCocoonStrategyBlock` → `getCocoonStrategy` → `buildCocoonStrategyBlock` ([`server/utils/prompt-loader.ts`](../../server/utils/prompt-loader.ts)) | pas de `cocoonSlug`, cocon inconnu, stratégie absente ou illisible, aucune valeur validée |
| `{{strategyContext}}` (variable d'appelant) | stratégie d'article, sinon stratégie du cocon | `pickStrategyContext(getStrategy(id), getCocoonStrategy(cocon))` ([`server/routes/generate/_helpers.ts`](../../server/routes/generate/_helpers.ts)) : `buildStrategyContext(article)` s'il n'est pas vide, sinon `buildCocoonStrategyBlock` | aucune des deux |
| `{{painPoint}}` | `articles.pain_point` | `getArticlePainPoint(articleId)` ([`server/services/queries/article-pain-point.service.ts`](../../server/services/queries/article-pain-point.service.ts)) | jamais vide : `PAIN_POINT_FALLBACK = '(non défini)'` si la colonne est nulle ou blanche, l'article inconnu, l'id invalide, ou la base en panne |
| `{{cocoon_context}}` | arbre du cocon (`getCocoonTree` : articles, parent, section, « rédigé », mot-clé ; texte du parent) | `cocoonContextForArticle(articleId)` ou `cocoonContextForNewArticle(cocoonId, parentId, section)` ([`cocoon-context.service.ts`](../../server/services/strategy/cocoon-context.service.ts)), rendu par `renderCocoonContext` ([`shared/cocoon-context.ts`](../../shared/cocoon-context.ts)) | article hors cocon (`''`) |

**Détail des constructeurs.**
- `buildCocoonStrategyBlock` : titre « Contexte stratégique du cocon », une ligne par valeur `validated` non vide (Cible, Douleur, Angle, Promesse, CTA), puis une phrase de consigne ; vide sans aucune valeur.
- `buildStrategyContext` (article) : vide si `completedSteps === 0` ; sinon Cible, Douleur adressée, Angle différenciateur, Promesse au lecteur (champs `validated`) et CTA (`cta.type — cta.target`, forme propre à l'article).
- Placement de `{{strategy_context}}` : au repère si le `.md` le cite ; sinon, **ajouté en fin de prompt** dès que le bloc n'est pas vide. C'est donc l'envoi de `cocoonSlug` qui décide.
- Une variable fournie par l'appelant l'emporte sur la globale de même nom.

**Écrivains des sources.** La stratégie du cocon : le Cerveau ([strategy.md](./strategy.md)). La stratégie d'article : le mode automatique seul. `articles.pain_point` : **uniquement à la création** de l'article (`insertCocoonArticle`, douleur du candidat choisi, sinon de la ligne de la carte) ; aucune route ne la modifie ensuite (FR-PAIN-IMMUTABLE-AFTER-CEREVEAU). L'arbre : [articles.md](./articles.md).

## Persistance

Aucune pour les blocs eux-mêmes : ils sont recalculés à chaque appel d'IA et ne sont jamais enregistrés. Les sources vivent en base (`cocoon_strategies`, `article_strategies`, `articles`, `article_content`, `article_keywords`).

**Deuxième copie de la douleur, côté écran.** `SelectedArticle.painPoint` du Moteur vient de la ligne de la carte (`proposedArticles[].painPoint`, via `buildRecapArticles`) pour un article « suggéré », de `articles.pain_point` pour un article « publié ». Les deux valeurs sont écrites ensemble à la création ; aucune n'est modifiable ensuite.

## Consommateurs

### Affichage (UI)

- [`MoteurStrategyContext.vue`](../../src/components/moteur/MoteurStrategyContext.vue) (Moteur et Rédaction) montre la stratégie validée du cocon, lue par `GET /api/cocoons/:id/strategy/context` : mêmes champs `validated` que le bloc des consignes.
- La douleur n'est affichée qu'au Cerveau (ligne de la carte, [`ProposedArticleRow.vue`](../../src/components/strategy/ProposedArticleRow.vue)). Au Radar, [`DouleurScannerInputs`](../../src/components/intent/scanner/DouleurScannerInputs.vue) ne montre ses champs qu'en mode `libre`, que rien ne monte : aucun écran du Moteur ne la modifie.
- Carte Radar : « — » en Score Pertinence et infobulle « définir le point de douleur » quand la douleur manque ([`RadarCardScoreRing.vue`](../../src/components/intent/radar-card/RadarCardScoreRing.vue), cause `no-pain`).

### Calcul / tri / filtre / agrégat — qui reçoit quoi

| Appel | `{{strategy_context}}` | `{{strategyContext}}` | douleur | `{{cocoon_context}}` |
|---|---|---|---|---|
| Avis IA du Capitaine (`POST /keywords/:kw/ai-panel`, `capitaine-ai-panel.md`) | repère présent, mais **`CaptainPanel` n'envoie pas `cocoonSlug`** : bloc vide | — | base | — |
| Structure (`ai-hn-structure`, `lieutenants-hn-structure.md`, envoyé par `useStructureHn`) | oui | — | base | oui (`.catch(() => '')`) |
| Lieutenants (`propose-lieutenants`, envoyé par `useLieutenantsIa`) | oui, ajouté en fin (pas de repère) | — | base | — |
| Lexique (`ai-lexique-upfront`, envoyé par `useLexiqueIa` ; `lexique-suggest` depuis `article-keywords.store`) | oui | — | base | — |
| Radar : génération (`radar/generate`, `intent-keywords.md`, depuis `useDiscoveryPanel` / `useResonanceScore`) | pas de `cocoonSlug` envoyé : vide | — | **écran** (obligatoire, 400 sinon ; `useDiscoveryPanel` envoie le mot-clé racine à la place d'une douleur absente) | — |
| Radar : scan (`radar/scan`), scan du Capitaine (`POST /keywords/:kw/scan`) | — | — | **écran** (Pertinence seulement si ≥ 10 caractères) | — |
| Longue traîne (`long-tail-suggest.service.ts`) | oui (nom du cocon) | — | écran (`article_pain_point`, repli « (non defini) ») | — |
| Score Pertinence relu au chargement du Capitaine (`captain-relevance.service.ts`) | — | — | base | — |
| Candidats d'un nouvel article (`child-candidates.service.ts`, `cocoon-child-keywords.md`) | oui (nom du cocon) | — | — (l'IA **propose** une douleur par candidat) | oui, **obligatoire** (absent → 404) |
| Micro-contexte suggéré, explication du brief (`micro-context-suggest.md`, `brief-ia-panel.md`) | oui (slug calculé par la route) | — | — | — |
| Sommaire, premier jet, passes d'enrichissement, réécriture d'un chapitre | — | oui (`pickStrategyContext`) | — | premier jet seulement (échec → `log.warn`, bloc vide) |
| Réduction d'une section (`reduce-section.md`) | — | stratégie d'**article** seule (`buildStrategyContext(getStrategy(id))`) | — | — |
| Prompts du Cerveau (`strategy-suggest`, `cocoon-*`) | — | — | — | — (ils reçoivent `previousAnswers` et le thème, cf. [strategy.md](./strategy.md)) |

Le micro-contexte (angle, ton, consignes, longueur visée), autre bloc d'article, est décrit dans [Cerveau](../11-cerveau.md) (« Micro-contexte et longueur visée »).

## Règles de cohérence

- **Le même champ partout.** La barre « Contexte stratégique » et le bloc des consignes lisent les mêmes valeurs `validated` du cocon. Une valeur vide est omise des deux, jamais remplacée par un texte par défaut.
- **Une absence dite, pas cachée.** Sans douleur, l'IA reçoit « (non défini) » et la carte Radar affiche « — » en Pertinence ; jamais une chaîne vide dans la consigne, jamais un 0 à l'écran.
- **Relire à chaque appel.** Aucun bloc n'est mis en cache : une stratégie modifiée au Cerveau part dans l'appel suivant.
- **Une seule fois par consigne.** La stratégie arrive soit par `{{strategy_context}}`, soit par `{{strategyContext}}` ; aucun prompt ne cite les deux, et les prompts système (`system-propulsite`) sont chargés sans `cocoonSlug`.
- **Jamais dans le `.md`.** Le contexte s'injecte au chargement ; on ne réécrit pas un prompt pour y mettre une valeur.

## Cas d'usage à risque

| Cas | Lecture | Risque |
|---|---|---|
| **Avis IA du Capitaine** | `{{strategy_context}}` sans `cocoonSlug` | L'avis est rendu sans la stratégie du cocon, alors que le prompt a le repère (FR-MOT-STRATEGY-INJECTION non tenue). |
| **Génération Radar depuis Discovery** | pas de `cocoonSlug` | Même écart pour `intent-keywords.md`. |
| **Douleur absente** | `pain_point` NULL | Consignes du Moteur avec « (non défini) » ; Pertinence « — » au scan (moins de 10 caractères). |
| **Douleur lue à deux endroits** | écran (carte) pour le Radar et le scan ; base pour les panneaux IA et la Pertinence relue | Même valeur tant que la carte et la base concordent (écrites ensemble à la création). Une ligne de carte régénérée sous le même titre, sans `dbId`, n'est plus sélectionnable (id 0) : pas de divergence possible sur un article travaillé. |
| **Réduction d'une section** | stratégie d'article seule | Un article construit à l'écran n'a pas de stratégie d'article : la réduction ne reçoit aucune stratégie. |
| **Cocon illisible pour les candidats** | `cocoonContextForNewArticle` → `null` | Refus 404 `COCOON_NOT_FOUND`, avec message (voulu). |
| **Stratégie validée à moitié** | cinq champs | Le bloc ne contient que les valeurs validées ; les consignes fonctionnent (NFR-INT-STRATEGY-OPTIONAL). |

## Limites connues

- **FR-MOT-STRATEGY-INJECTION (non tenue)** — l'avis IA du Capitaine (`CaptainPanel`) et la génération Radar de Discovery (`useDiscoveryPanel`) n'envoient pas `cocoonSlug`.
- Trois replis pour une douleur absente : « (non défini) » (`PAIN_POINT_FALLBACK`), « (non defini) », sans accent, dans `long-tail-suggest.service.ts`, et le mot-clé racine lui-même dans `useDiscoveryPanel` (`painPoint: painPoint || seed`) — ce dernier est un repli silencieux : l'IA de Discovery croit recevoir une douleur.
- La réduction ne reçoit pas la stratégie du cocon (cf. [Rédaction](../17-redaction.md)).
- `POST /keywords/:kw/ai-lexique` (`lexique-ai-panel.md`) n'a aucun appelant à l'écran.

## Tests de cohérence

- [`tests/unit/coherence/strategy-context.test.ts`](../../tests/unit/coherence/strategy-context.test.ts) — le vrai code : `buildStrategyContext` (vide sans stratégie ou à `completedSteps = 0`, champs non validés omis), `getArticlePainPoint` (valeur trimée ; « (non défini) » pour NULL, blanc, article absent, id invalide, panne), présence d'une variable de douleur dans huit prompts, `{{strategy_context}}` dans `capitaine-ai-panel.md`, formats des blocs d'article et de cocon, et, dans les six prompts du Moteur, absence de `{{strategyContext}}`, `{{pain_point}}`, `{{painpoint}}` (dans ces six-là, `{{strategyContext}}` serait une faute ; les prompts de la Rédaction l'utilisent à dessein). Trois cas du chargeur restent en `it.todo`.
- [`tests/unit/coherence/prompts-no-hardcoded.test.ts`](../../tests/unit/coherence/prompts-no-hardcoded.test.ts) — aucune année ni aucun lieu écrits dans les prompts ; la zone et l'année viennent du contexte (détail dans [local.md](./local.md)).
- Hors du dossier `coherence/` : [`prompt-variables.test.ts`](../../tests/unit/architecture/prompt-variables.test.ts) (chaque appel fournit exactement les variables attendues), [`prompt-template.test.ts`](../../tests/unit/utils/prompt-template.test.ts), [`cocoon-context.test.ts`](../../tests/unit/shared/cocoon-context.test.ts).
- À écrire : un test qui vérifie que chaque analyse IA du Moteur reçoit `cocoonSlug` (il échouera tant que le Capitaine et Discovery ne l'envoient pas).

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
