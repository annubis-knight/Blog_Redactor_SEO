---
name: articles
description: La fiche d'un article (table articles) — identité, niveau, place dans l'arbre du cocon (parent, section), statut et phase — et les copies qu'en gardent l'écran et les calculs.
type: "PostgreSQL articles (snake_case) → Article (camelCase, rowToArticle) ; GET /api/cocoons → Cocoon { articles[], publishedArticles[], stats } ; GET /api/cocoons/:id/tree → CocoonTreeNode[]"
last_updated: 2026-09-29
related_fr: [FR-DASH-NAV, FR-DASH-PROGRESS, FR-MOT-ARTICLE-SELECTION, FR-MOT-RECAP-PUBLISHED, FR-CER-COCOON-PROGRESSIVE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-AIGUILLAGE, FR-CER-KEYWORD-REAL-DATA, FR-CER-PARENT-WRITTEN-GATE, FR-CER-CREATION-HONNETE, FR-PIE-CERVEAU-OVERRIDE, FR-RED-PROGRESS, FR-RED-META, FR-RED-PUBLISH-GATE, FR-RED-LINKING-MANUAL, FR-INFRA-COCOON-CONTEXT, NFR-INT-ARTICLE-ID-NEVER-REUSED]
---

# Data Flow — articles

> **En clair :** un cocon est un arbre. Le pilier (la page qui présente tout le sujet) est en haut, ses intermédiaires dessous, puis leurs spécialisés. Chaque enfant naît d'un chapitre (H2) de son parent, qui le résume et renvoie vers lui. Exemple : le chapitre « Audit de site » du pilier devient l'intermédiaire « Auditer son site web » (`parent_id` = le pilier, `parent_section` = « Audit de site »). La table `articles` est la seule source de cet arbre.
>
> **Type/format :** une ligne `articles(id, cocoon_id, titre, type, slug, status, phase, parent_id, parent_section, suggested_keyword, captain_keyword_locked, pain_point, pain_intent_expected, meta_title, meta_description, seo_score, geo_score, completed_checks, check_timestamps, …)`. `rowToArticle` ([`server/services/infra/data.service.ts`](../../server/services/infra/data.service.ts)) la traduit en `Article` ([`shared/types/article.types.ts`](../../shared/types/article.types.ts)) ; le niveau passe de « Pilier / Intermédiaire / Spécialisé » (base) à `pilier / intermediaire / specifique` (code) par [`shared/utils/article-level.ts`](../../shared/utils/article-level.ts).
>
> **Chapitres :** [Modèle de données](../02-donnees.md) (table et contraintes), [Cerveau](../11-cerveau.md) (« Arbre réel du cocon », « Mode automatique et rattrapage »), [Moteur — cadre commun](../12-moteur.md) (« Barre des articles »), [Rédaction](../17-redaction.md) (« Données de la Rédaction », « Phase de l'article »), [Dashboard](../10-dashboard.md).
>
> **Colonnes qui ont leur propre fiche :** `completed_checks` → [completed-checks.md](./completed-checks.md) ; `captain_keyword_locked` → [captain-keyword-locked.md](./captain-keyword-locked.md) ; `pain_point` → [strategy-context.md](./strategy-context.md) ; `seo_score` / `geo_score` → [seo.md](./seo.md).

## Producteurs

**Création — un article à la fois, seul chemin.** `POST /api/cocoons/:cocoonId/articles` ([`server/routes/cocoons.routes.ts`](../../server/routes/cocoons.routes.ts), schéma `createCocoonArticleSchema`) → `createCocoonArticle` ([`server/services/article/cocoon-article.service.ts`](../../server/services/article/cocoon-article.service.ts)), dans cet ordre :

1. hiérarchie jugée sans les sections (`verifyCocoonHierarchy`, [`shared/verifiers/cocoon-hierarchy.ts`](../../shared/verifiers/cocoon-hierarchy.ts)) : pilier d'abord, un seul pilier, parent du niveau juste au-dessus et du même cocon → sinon 409 `HIERARCHY_VIOLATION` ;
2. mot-clé fourni présent dans `keyword_metrics` → sinon 422 `KEYWORD_NOT_MEASURED` ;
3. parent rédigé (`assertParentReady`) : sans l'étape `redaction:draft_accepted`, sa porte `draft` est jouée ; refus → 409 `GATE_BLOCKED`, accord → étape posée sur le parent ; puis section connue du parent (H2 du texte, sinon de sa structure) et libre ;
4. `insertCocoonArticle` : `id` tiré de la séquence `articles_id_seq` (jamais le numéro d'un article effacé, NFR-INT-ARTICLE-ID-NEVER-REUSED), `status = 'à rédiger'`, `phase = 'proposed'`, adresse = `slug` fourni ou tirée du titre ; adresse prise → 409 `SLUG_TAKEN`.

Appelants : le constructeur de l'étape Articles du Cerveau ([`useCocoonBuilder.createFromCandidate`](../../src/composables/strategy/useCocoonBuilder.ts), [`CocoonTreeBuilder.vue`](../../src/components/production/brain/CocoonTreeBuilder.vue), [`CocoonCandidatesPanel.vue`](../../src/components/production/brain/CocoonCandidatesPanel.vue)) et le mode automatique ([`scripts/auto-article/phases/cerveau.ts`](../../scripts/auto-article/phases/cerveau.ts), section choisie par `pickParentSection`). Après la 201, l'écran inscrit l'article au pool de mots-clés (`POST /api/keywords`) et sur la carte `proposedArticles` (cf. [strategy.md](./strategy.md)), puis relit l'arbre et `GET /api/cocoons`.

**Mutations.**

| Route | Fonction ([`data.service.ts`](../../server/services/infra/data.service.ts) sauf mention) | Colonnes |
|---|---|---|
| `PUT /api/cocoons/:cocoonId/articles/:articleId/parent` | `attachCocoonArticle` (mêmes règles qu'une création, l'article déplacé exclu du jugement) → `setArticleParent` | `parent_id`, `parent_section` |
| `PATCH /api/articles/:id` (`patchArticleSchema`) | `updateArticleInCocoon` | `titre`, `slug`, `pain_intent_expected` — jamais le niveau ni le parent |
| `DELETE /api/articles/:id` | `removeArticleFromCocoon` : 409 `HAS_CHILDREN` si un enfant est encore dans un cocon | `cocoon_id`, `parent_id`, `parent_section` à `NULL` ; la ligne reste en base |
| `PUT /api/articles/:id/status` | `updateArticleStatus` ; « publié » passe d'abord la porte `publish` (422 `GATE_BLOCKED`) | `status` ; `phase = published` si « publié » |
| `PUT /api/articles/:id` | `saveArticleContent` ([`article-content.service.ts`](../../server/services/article/article-content.service.ts)) | `meta_title`, `meta_description`, `seo_score`, `geo_score` (écrits dès que le champ est présent, même `null`) ; `phase = redaction` si le texte n'est pas vide |
| `PUT /api/articles/:id/keywords` | `saveArticleKeywords` (miroir `updateArticleCaptainKeyword`) | `captain_keyword_locked` |

- La phase suit `nextArticlePhase` ([`shared/utils/article-phase.ts`](../../shared/utils/article-phase.ts)) : `proposed` → `moteur` → `redaction` → `published`, jamais de recul. Rien n'écrit `moteur` aujourd'hui.
- À l'écran, seul l'export de l'aperçu ([`ArticlePreviewView.vue`](../../src/views/ArticlePreviewView.vue)) change le statut, pour « publié ». « brouillon » n'est posé que par le mode automatique ([`scripts/auto-article/phases/redaction.ts`](../../scripts/auto-article/phases/redaction.ts)).
- `pain_point` et `suggested_keyword` ne sont écrits qu'à la création. `updateArticleSuggestedKeyword` n'a aucun appelant.

**Rattrapage.** [`scripts/backfill-cocoon.ts`](../../scripts/backfill-cocoon.ts) (`npm run db:backfill-cocoon`, simulation par défaut, `--apply`) et le plan pur [`scripts/backfill-cocoon-plan.ts`](../../scripts/backfill-cocoon-plan.ts) : `UPDATE articles SET parent_id, parent_section … WHERE parent_id IS NULL` pour chaque article rapproché sûrement ; les autres sont listés, puis rattachés à la main (« Rattacher », `useCocoonBuilder.attachOrphan`).

## Persistance

**Autorité : la table `articles`** ([`server/db/schema.sql`](../../server/db/schema.sql)).
- `id INTEGER` par défaut `nextval('articles_id_seq')` : une séquence ne recule jamais, un numéro effacé n'est pas redonné ; `slug` unique ; `type` sous `CHECK` Pilier / Intermédiaire / Spécialisé.
- `cocoon_id` → `cocoons` `ON DELETE SET NULL`.
- `parent_id` → `articles` `ON DELETE RESTRICT`, jamais soi-même (`articles_parent_not_self`), index `idx_articles_parent_id` ; `parent_section` = titre du H2 du parent, comparé par `sectionKey` ([`shared/chapters.ts`](../../shared/chapters.ts), sans casse ni ponctuation finale).
- Tables filles 1:1 en `ON DELETE CASCADE` : `article_content`, `article_keywords`, `article_strategies`, `article_micro_contexts`, `gate_waivers`.

**Lectures serveur.** `loadArticlesDb` (silos ⋈ cocons ⟕ articles) reconstruit `Cocoon[]` à chaque appel, avec `publishedArticles` (phase `redaction` ou `published`) et `stats` (`computeStats`). Un article détaché (`cocoon_id` NULL) n'y figure plus ; `getArticleById` le trouve encore.

**Copies à l'écran** (aucune expiration, aucune synchronisation entre onglets) :

| Store | Rempli par | Relu |
|---|---|---|
| [`useCocoonsStore.cocoons`](../../src/stores/strategy/cocoons.store.ts) | `GET /api/cocoons` | Moteur, Rédaction, rédaction guidée, éditeur, Cerveau : **seulement s'il est vide**. Page du cocon : s'il ne contient pas le cocon. Toujours après une création (`useCocoonBuilder.createFromCandidate` ; pas après un rattachement), un retrait ou un changement de titre depuis la carte (`useArticleProposals`), et à l'ouverture de la matrice des liens |
| [`useArticlesStore.articles`](../../src/stores/article/articles.store.ts) | `GET /api/cocoons/:id/articles` | À chaque montage de la page du cocon et de `RedactionView` |
| [`useSilosStore.silos`](../../src/stores/strategy/silos.store.ts) | `GET /api/silos` (`getSilos`) | À chaque montage de l'accueil |
| `CocoonTreeBuilder` (état local) | `GET /api/cocoons/:cocoonId/tree` (`getCocoonTree`) | Au montage, au changement de cocon, après chaque création ou rattachement |

## Consommateurs

### Affichage (UI)

- **Accueil** ([`DashboardView.vue`](../../src/views/DashboardView.vue)) — [`SiloCard.vue`](../../src/components/dashboard/SiloCard.vue), [`CocoonCard.vue`](../../src/components/dashboard/CocoonCard.vue) : `stats` (nombre d'articles, par niveau, `completionPercent`).
- **Page du cocon** ([`CocoonLandingView.vue`](../../src/views/CocoonLandingView.vue)) — `cocoon.stats`.
- **Rédaction** ([`RedactionView.vue`](../../src/views/RedactionView.vue)) — [`ArticleList.vue`](../../src/components/dashboard/ArticleList.vue) / [`ArticleCard.vue`](../../src/components/dashboard/ArticleCard.vue) (titre, statut, lien vers la rédaction guidée) depuis `useArticlesStore` ; au-dessus, `MoteurContextRecap` en lecture seule, nourri par `useCocoonsStore` et coupé **à l'écran** par `status` (« publié » ou non).
- **Moteur** ([`MoteurView.vue`](../../src/views/MoteurView.vue)) — [`MoteurContextRecap.vue`](../../src/components/moteur/MoteurContextRecap.vue) : « Articles suggérés » = lignes de la carte de stratégie (`buildRecapArticles`, [`src/utils/recap-articles.ts`](../../src/utils/recap-articles.ts), `id = dbId`), « Articles publiés » = `cocoon.publishedArticles` (tri fait par le serveur, sur la phase). Sélection : `handleSelectArticle` → `SelectedArticle`.
- **Cerveau** — `CocoonTreeBuilder` : blocs pilier → intermédiaires dans l'ordre des sections, sections libres, enfants orphelins (« section retirée »), articles hors de l'arbre à rattacher.
- **Rédaction guidée** — `brief.store.fetchBrief` lit `GET /api/articles/:id` (l'article et le nom de son cocon) ; `BriefStructureStep` et `LinkingMatrix` lisent `cocoon.articles`.

### Calcul / tri / filtre / agrégat

- `computeStats` — compte par niveau et par statut ; `completionPercent = (brouillon + publié) / total`. Un statut inconnu compte comme « publié ».
- `publishedArticles` — filtre serveur sur `phase IN ('redaction', 'published')`.
- Hiérarchie (`parent_id`, `parent_section`, `type`) : `verifyCocoonHierarchy` (création, rattachement, candidats), `getCocoonTree`, `getArticleChildren` (passe « Résumer », maillage), `publishCocoonLinks` de la porte de publication (🔴 résumé d'un enfant trop long, 🟠 section disparue), `familySuggestions` du maillage ([`linking.service.ts`](../../server/services/article/linking.service.ts)), état du cocon envoyé aux prompts ([`cocoon-context.service.ts`](../../server/services/strategy/cocoon-context.service.ts)), `removeArticleFromCocoon` (refus `HAS_CHILDREN`).
- Mot-clé d'un nœud de l'arbre : `captainKeywordLocked ?? suggestedKeyword`. Mot-clé d'un enfant pour « Résumer » et le maillage : capitaine de `article_keywords`, sinon `captain_keyword_locked`, sinon `suggested_keyword`.
- Cannibalisation au Moteur : `GET /api/cocoons/:cocoonName/capitaines` (`Record<articleId, capitaine>`) → `hasCannibalization` (clé `articleId`).
- Export : `articles.titre` devient le H1 publié ; l'adresse (`slug`) résout les liens internes `#article-<id>`.

## Règles de cohérence

- **L'arbre crée, la carte guide.** Ce qui peut naître se lit dans `articles`, jamais dans `proposedArticles`. La carte n'est qu'une vue de travail, que le Moteur utilise pour lister ses articles.
- **Le serveur juge, l'écran montre.** L'écran grise ce qui serait refusé ; le serveur rejoue les mêmes règles (un état peut avoir changé entre-temps) et répond un refus lisible.
- **Une seule définition de « publié » par liste.** Le Moteur trie sur la phase côté serveur (`publishedArticles`). La barre en lecture seule de la Rédaction coupe sur le statut, côté écran : les deux listes « Articles publiés » ne disent pas la même chose (cf. limites).
- **Une absence reste une absence.** Un parent `NULL` est un pilier ou un article pas encore rattaché, jamais deviné ; le rattrapage liste ce qu'il ne sait pas placer.

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque |
|---|---|---|---|
| **Créer un enfant sous un parent qui vient de changer** | `completed_checks`, texte et structure du parent | 409 `GATE_BLOCKED` ou `HIERARCHY_VIOLATION` | Couvert : l'écran ouvre l'alarme sur le parent, ou affiche le refus. |
| **Après la 201, pool ou carte en échec** | — | article créé ; `POST /keywords` ou `saveStrategy` refusés | L'article existe (avertissement seulement, FR-CER-CREATION-HONNETE). Sans la ligne de carte, le Moteur ne le liste pas avant un nouvel enregistrement de la carte. |
| **Chapitre du parent renommé** | `parent_section` ↔ H2 du parent | aucune | L'enfant apparaît sous « section retirée » dans l'arbre ; 🟠 `child-section-missing` à la publication du parent. |
| **Retrait d'un article** | enfants dans le cocon ? | détachement, ou 409 `HAS_CHILDREN` | La ligne reste en base avec son adresse : un nouvel article au même titre reçoit `SLUG_TAKEN`. |
| **Deux créations simultanées** | — | `INSERT` (numéro par `nextval`) | Couvert : deux numéros différents, sans nouvel essai. |
| **Écriture en retard pour un article effacé** (scan du Capitaine fini après l'effacement, typiquement entre deux tests) | — | `captain_explorations` et autres tables filles | Couvert : refusée par la clé étrangère (journal « persist failed ») ; le numéro n'étant jamais redonné, elle ne tombe sur aucun autre article. Jusqu'au 2026-09-29 (« plus grand + 1 »), elle atterrissait sur l'article suivant. |
| **Publier, puis ouvrir la Rédaction ou le Moteur sans recharger** | `useCocoonsStore` déjà rempli | statut et phase changés en base | Les barres du haut gardent l'ancien état jusqu'au rechargement ; la liste `ArticleList` de la Rédaction, relue au montage, est à jour. |
| **Texte enregistré (phase `redaction`)** | `publishedArticles` | `phase` | L'article passe dans « Articles publiés » du Moteur, mais reste aussi dans « suggérés » (lignes de la carte, sans filtre de phase). |

## Limites connues

- **FR-MOT-RECAP-PUBLISHED (non tenue)** — deux causes dans le code : la liste « suggérés » du Moteur reprend toutes les lignes de la carte, sans regarder la phase ; et la barre de la Rédaction coupe sur `status === 'publié'` à l'écran, alors que l'exigence veut un tri par phase fait par le serveur. Un article en rédaction y figure dans « suggérés ».
- `useCocoonsStore` n'est relu que s'il est vide sur la plupart des vues : un statut ou une phase changés ailleurs n'y apparaissent qu'au rechargement.
- L'avancement (`completionPercent`) compte les brouillons et les publiés ; à l'écran, un article ne devient jamais « brouillon » (seul le mode automatique pose ce statut).
- `SiloCard` affiche `silo.stats?.completionPercent ?? 0` : un silo sans statistiques s'afficherait à 0 %.
- `getSilos` appelle `loadArticlesDb` deux fois.

## Tests de cohérence

- [`tests/unit/coherence/articles.test.ts`](../../tests/unit/coherence/articles.test.ts) — FR-MOT-ARTICLE-SELECTION : onglets verrouillés sans article, `computeSmartTab` selon les étapes (vrai `useMoteurTabs`). Les blocs FR-DASH-NAV, FR-DASH-PROGRESS, FR-CER-AIGUILLAGE, « batch-create » et « store / DB » manipulent des objets construits dans le test sans appeler le code : ils ne gardent rien.
- Ce qui garde réellement le flux, hors du dossier `coherence/` : [`cocoon-article.service.test.ts`](../../tests/unit/services/cocoon-article.service.test.ts) (pilier seul dans un cocon vide, enfant né d'une section d'un parent rédigé, étape posée sur le parent, `SLUG_TAKEN`, `KEYWORD_NOT_MEASURED`), [`verifiers-cocoon-hierarchy.test.ts`](../../tests/unit/shared/verifiers-cocoon-hierarchy.test.ts), [`cocoon-articles.routes.test.ts`](../../tests/unit/routes/cocoon-articles.routes.test.ts), [`articles.contract.test.ts`](../../tests/contract-api/articles.contract.test.ts) (`batch-create` → 404, `HAS_CHILDREN`), [`backfill-cocoon-plan.test.ts`](../../tests/unit/scripts/backfill-cocoon-plan.test.ts), [`recap-articles.test.ts`](../../tests/unit/utils/recap-articles.test.ts), [`article-phase.test.ts`](../../tests/unit/shared/article-phase.test.ts), [`tests/integration/data.service.test.ts`](../../tests/integration/data.service.test.ts) (`publishedArticles` ; numéro jamais redonné, écriture en retard refusée, créations simultanées), [`article-id-sequence.test.ts`](../../tests/unit/architecture/article-id-sequence.test.ts) (séquence dans les deux schémas, aucun calcul de numéro dans le code).
- À écrire : un test qui monte la barre de la Rédaction et celle du Moteur sur les mêmes articles et vérifie qu'un article n'est « publié » que selon une seule règle.

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
