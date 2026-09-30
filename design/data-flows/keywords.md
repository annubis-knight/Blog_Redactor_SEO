---
name: article_keywords
description: "Décisions de mots-clés d'un article (Capitaine, Lieutenants, Lexique, racines, structure H1/H2/H3) rangées dans `article_keywords`, relues avec l'historique des candidats (`captain_explorations`, `lieutenant_explorations`) et tenues en mémoire par `useArticleKeywordsStore`."
type: "ArticleKeywords { articleId, capitaine, lieutenants[], lexique[], rootKeywords?, hnStructure?, richCaptain?, richRootKeywords?, richLieutenants? }"
last_updated: 2026-09-30
related_fr: [FR-CAP-PERSIST, FR-CAP-LOCK-RADIO, FR-LIE-CHECKBOX-LOCK-IMMEDIATE, FR-LIE-PERSIST, FR-LEX-SELECT, FR-LEX-PERSIST, FR-HN-TAB, FR-CAP-RELEVANCE-INPUTS, FR-MOT-EXPLORATIONS-HYDRATATION, FR-MOT-LOCK-DERIVED, FR-MOT-PHASES, FR-MOT-CACHE-PANEL-COUNT, FR-FIN-RECAP, FR-INFRA-API-WRAPPER]
---

# Data Flow — article_keywords

> **Description métier :** tout ce que l'utilisateur a décidé au Moteur pour un article : le Capitaine (mot-clé principal), les Lieutenants (mots-clés secondaires, futurs H2/H3), le Lexique (termes du corps de texte), les racines du Capitaine et la structure de titres. La lecture y ajoute l'historique des candidats étudiés.
> **Type/format :** `ArticleKeywords` ([`shared/types/keyword.types.ts`](../../shared/types/keyword.types.ts)). Une ligne `article_keywords` par article ; les champs `rich*` ne sont jamais stockés tels quels, ils sont reconstruits à la lecture.
> **Références :** [14 — Radar et Capitaine](../14-radar-capitaine.md) (enregistrement et relecture), [15 — Lieutenants, Structure, Lexique](../15-lieutenants-structure-lexique.md), [02 — Modèle de données](../02-donnees.md), [09 — Contrats d'affichage](../09-contrats-affichage.md) (contrat `article-keywords`). Fiches voisines : [captain-keyword-locked](captain-keyword-locked.md) (le Capitaine seul), [lieutenants](lieutenants.md), [lexique](lexique.md).

## Producteurs

Qui crée ou met à jour cette donnée :

- **Route unique d'écriture** — `PUT /api/articles/:id/keywords` ([`keywords.routes.ts`](../../server/routes/keywords.routes.ts)) :
  - `capitaine` obligatoire (400 `MISSING_PARAM`) ; `lieutenants`, `lexique`, `rootKeywords` absents deviennent `[]` ;
  - `hnStructure` absent = inchangé ; présent, il doit passer `hnStructureSchema` (400 `VALIDATION_ERROR`) ;
  - `saveArticleKeywords` ([`data.service.ts`](../../server/services/infra/data.service.ts)) relit la ligne, garde les champs non fournis, fait l'UPSERT `ON CONFLICT (article_id)`, puis écrit la copie `articles.captain_keyword_locked` (cf. [captain-keyword-locked](captain-keyword-locked.md)).
- **Store** — [`article-keywords.store.ts`](../../src/stores/article/article-keywords.store.ts) (en-tête `AUTHORITY:`) :
  - `saveDecisions(id)` (alias `saveKeywords`) envoie `capitaine`, `lieutenants`, `lexique`, `rootKeywords`, **sans** la structure ; renvoie `false` en cas d'échec ;
  - `saveStructure(id, structure)` envoie les mêmes champs **plus** `hnStructure` ; la mémoire ne prend la structure qu'après la réponse du serveur. C'est le seul écrivain de `hn_structure` ;
  - mutations en mémoire : `lockCaptain`, `unlockCaptain`, `setCapitaine`, `setRootKeywords`, `addLieutenant`, `removeLieutenant`, `lockLieutenant`, `unlockLieutenant`, `setRichLieutenants`, `unlockLieutenants`, `archiveLockedLieutenants` (chacune resynchronise la liste plate `lieutenants` ; la dernière demande aussi l'archivage enregistré, `POST /api/articles/:id/lieutenants/archive`), `proposeLieutenant` (proposition ajoutée depuis le panneau d'aide, liste plate inchangée), `addLexiqueTerm`, `removeLexiqueTerm`, `suggestLexique` (remplace le lexique par la suggestion de `POST /api/keywords/lexique-suggest`).
- **Appelants des enregistrements** :
  - [`CaptainPanel.vue`](../../src/components/moteur/CaptainPanel.vue) : verrou et déverrou (attendus), plus un enregistrement groupé 300 ms après les rafales de mutations (`requestSave` → `persistIfOwned`, seulement si le store porte l'article) ;
  - [`LieutenantsPanel.vue`](../../src/components/moteur/LieutenantsPanel.vue) et [`useLieutenantsIa.ts`](../../src/composables/moteur/useLieutenantsIa.ts) : chaque case cochée enregistre aussitôt (FR-LIE-CHECKBOX-LOCK-IMMEDIATE) ;
  - [`LexiquePanel.vue`](../../src/components/moteur/LexiquePanel.vue) et [`useLexiqueLocking.ts`](../../src/composables/lexique/useLexiqueLocking.ts) : un enregistrement par terme coché ;
  - [`useStructureHn.ts`](../../src/composables/moteur/useStructureHn.ts) : `saveStructure` (onglet Structure) ;
  - [`ArticleKeywordsPanel.vue`](../../src/components/keywords/ArticleKeywordsPanel.vue) (monté par `BriefStructureStep.vue` dans `ArticleWorkflowView`) : bouton d'enregistrement, ajout manuel, suggestion de lexique.
- **Racines** — `article_keywords.root_keywords` reçoit, au verrouillage, les racines **explorées** sur la carte verrouillée (`setRootKeywords(entry.rootVariants.keys())`). À ne pas confondre avec `captain_explorations.root_keywords`, écrit à chaque étude par `extractRoots` (cf. [relevance-score-live-computation](relevance-score-live-computation.md)).
- **Historique des candidats** (tables voisines, lues avec cette donnée) :
  - `captain_explorations` + `paa_explorations` : écrits par l'étude `POST /api/keywords/:keyword/scan` (`saveCaptainExploration`). `POST /api/articles/:id/captain-explorations` existe mais aucun écran ne l'appelle ;
  - `lieutenant_explorations` : `POST /api/articles/:id/lieutenant-explorations`, `POST /api/articles/:id/lieutenants/archive`.
- **Sans appelant** — `POST /api/keywords/migrate/:cocoonName/apply` (`applyMigration`, [`keyword-assignment.service.ts`](../../server/services/keyword/keyword-assignment.service.ts)) écrit aussi par `saveArticleKeywords`, mais son seul écran, `EnginePhase.vue`, n'est monté nulle part.

## Persistance

**Autorité** : `article_keywords(article_id PK → articles ON DELETE CASCADE, capitaine TEXT, lieutenants TEXT[], lexique TEXT[], hn_structure JSONB, root_keywords TEXT[], updated_at)` ; `updated_at` est tenu par le déclencheur `article_keywords_updated_at` (avant chaque `UPDATE`).

**Lecture** — `GET /api/articles/:id/keywords` → `getArticleKeywords(id)`, sorti par le contrat `article-keywords` (serveur et client) :

| Champ renvoyé | Source |
|---|---|
| `capitaine`, `lieutenants`, `lexique`, `rootKeywords`, `hnStructure` | la ligne `article_keywords` (`''` et `[]` si absente) |
| `richCaptain` | `{ keyword: capitaine, status: capitaine non vide ? 'locked' : 'suggested', exploredKeywords, aiPanelMarkdown }` ; `exploredKeywords` = `getCaptainExplorations` (KPI relus dans `keyword_metrics`, Score Marché relu dans `radar_explorations`, Score Pertinence recalculé, `paaJudgment: null`) |
| `richRootKeywords` | racines de chaque candidat (`captain_explorations.root_keywords`), sans KPI |
| `richLieutenants` | `getLieutenantExplorations` (`ORDER BY score DESC NULLS LAST`), absent si vide |

- Les explorations sont toujours chargées, même sans ligne `article_keywords` (FR-MOT-EXPLORATIONS-HYDRATATION). Ni ligne ni exploration → `data: null`.
- **Mémoire navigateur** : `useArticleKeywordsStore().keywords`, un seul article à la fois (`keywords.articleId`).
  - Moteur : `$reset()` puis `fetchKeywordsMerge` à chaque sélection d'article (par `useMoteurArticleSync.loadArticleData`, les onglets attendent `loadedArticleId`) et au bouton « Charger ». La réponse d'un article quitté est ignorée (`requestedArticleId`) ; une réponse vide donne des mots-clés vides à son nom (`initEmpty`), jamais un store `null` qui passerait pour « pas encore chargé » (CAP-7) ; les données d'un autre article encore en mémoire sont remplacées, pas fusionnées. La fusion n'adopte le `capitaine` de la base que si la mémoire est vide, ajoute les candidats absents (clé : mot-clé en minuscules, 30 au plus), fusionne les Lieutenants (un statut final `locked` / `archived` / `eliminated` l'emporte), unit les listes plates et reprend la structure de la base si la mémoire n'en a pas.
  - Rédaction : `fetchKeywords` remplace la mémoire (`ArticleWorkflowView`, `ArticleEditorView`).
- Aucun stockage navigateur, aucune expiration.

## Consommateurs

### Affichage (UI)

- **Capitaine** — `richCaptain.exploredKeywords` alimente la liste (`restoreFromHistory`, [`useExploredKeywords.ts`](../../src/composables/keyword/useExploredKeywords.ts)) ; `richCaptain.status` décide du verrou affiché. Détail : [captain-keyword-locked](captain-keyword-locked.md), [score-capitaine](score-capitaine.md).
- **Lieutenants** — `richLieutenants` (cartes, statuts) et `lieutenants` (liste plate) : [lieutenants](lieutenants.md).
- **Structure** — `hnStructure` : structure enregistrée de `useStructureHn` (la copie de travail est « modifiée » tant qu'elle en diffère).
- **Lexique** — `lexique` : termes cochés ; `lexique.length > 0` autorise l'extraction même Capitaine rouvert.
- **Finalisation** — [`FinalisationPanel.vue`](../../src/components/moteur/FinalisationPanel.vue) : Capitaine (« — » si vide), Lieutenants verrouillés, structure, termes du Lexique (FR-FIN-RECAP).
- **Panneau de cache des onglets** — `buildTabCacheEntries` ([`MoteurView.vue`](../../src/views/MoteurView.vue)) : `lieutenants.length`, `lexique.length`, capitaine verrouillé (FR-MOT-CACHE-PANEL-COUNT).
- **Rédaction** — `ArticleWorkflowView` passe `capitaine`, `lieutenants`, `lexique`, `hnStructure` au brief ; `ArticleEditorView` passe `capitaine` et `lieutenants` à l'éditeur ; `ArticleKeywordsPanel` affiche et modifie les trois listes.

### Calcul / tri / filtre / agrégat

- **Portes** ([`gate.service.ts`](../../server/services/gates/gate.service.ts)) : `captainGate` (capitaine), `lieutenantsGate` (capitaine + lieutenants), `hnGate` (structure + lieutenants + capitaine), `lexiqueGate` (lexique), `draftGate` et `publishGate` (capitaine, lieutenants).
- **Cocon** — `getArticleKeywordsByCocoon` : carte des capitaines (`GET /api/cocoons/:name/capitaines`) et `getCocoonExistingLieutenants` (lieutenants des autres articles du cocon, fournis à la proposition IA de Lieutenants contre la cannibalisation, [`keyword-ai-panel.routes.ts`](../../server/routes/keyword-ai-panel.routes.ts)) ; `cocoon-article.service` lit la structure du parent pour les sections d'un enfant.
- **Prompts** — `outline.routes.ts` et `article-draft.routes.ts` relisent `getArticleKeywords` pour le sommaire et le premier jet.
- **Moteur** — `effectiveRootKeywords` ([`useMoteurCrossTabState.ts`](../../src/composables/moteur/useMoteurCrossTabState.ts)) : racines de la carte verrouillée, sinon `rootKeywords` ; `selectedLieutenantsForLexique` : sélection locale, sinon `lieutenants`.

> **Règle de cohérence affichage / calcul** — Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout.
>
> Ici : l'écran et les portes lisent les mêmes colonnes. La porte relit la base, jamais la mémoire : c'est pourquoi chaque étape gardée n'est demandée qu'après un enregistrement réussi (`saveDecisions` / `saveStructure` renvoient `false` sinon). Le statut « verrouillé » du Capitaine est dérivé de `capitaine` non vide, à l'écriture comme à la lecture.

## Cas d'usage à risque

| Cas | Lecture | Écriture | Comportement |
|---|---|---|---|
| Premier chargement, rechargement | `GET …/keywords` | aucune | Candidats, Lieutenants et décisions relus ; scores recalculés à la lecture. |
| Changement d'onglet (même article) | store | aucune | Pas de relecture. |
| Changement d'article | `$reset` + `fetchKeywordsMerge` (`useMoteurArticleSync`) | aucune | La garde `keywords.articleId` évite d'afficher l'article précédent ; les onglets ne sont montés qu'une fois l'article chargé (`loadedArticleId`), et la réponse d'un article quitté est ignorée. |
| « Charger » (bouton de l'onglet) | `fetchKeywordsMerge` | aucune | La mémoire n'est jamais écrasée : un Capitaine déjà en mémoire l'emporte sur la base. |
| Enregistrement Lieutenants ou Lexique | — | `PUT` sans `hnStructure` | La structure en base est gardée. |
| Déverrouillage avec Lieutenants verrouillés | store | `archiveLockedLieutenants` (`POST …/lieutenants/archive`, verrouillés seulement) + `PUT` | Voir [captain-keyword-locked](captain-keyword-locked.md), limites, et [lieutenants](lieutenants.md). |
| Store initialisé vide puis enregistré | — | `PUT` avec `capitaine: ''` et listes vides | Efface les décisions en base (voir limites). |

## Limites connues

- **Enregistrement depuis un store vide** : `saveDecisions` et `saveStructure` créent un store vide (`ensureKeywords`) s'il n'existe pas, et `ArticleKeywordsPanel` fait `initEmpty` au montage si rien n'est chargé. Un enregistrement lancé dans cet état envoie `capitaine: ''`, `lieutenants: []`, `lexique: []` et efface les décisions de l'article. `CaptainPanel` et `LieutenantsPanel` s'en protègent en vérifiant que le store porte l'article ; les autres appelants non.
- **Liste plate forcée** : la route transforme un `lieutenants` ou `lexique` absent en `[]` ; seul `hnStructure` absent signifie « inchangé ».
- **Racines homonymes** : `article_keywords.root_keywords` (racines explorées sur la carte verrouillée) et `captain_explorations.root_keywords` (troncatures de `extractRoots`) portent le même nom mais pas la même donnée.

## Tests de cohérence qui la gardent

- [`tests/unit/coherence/keywords.test.ts`](../../tests/unit/coherence/keywords.test.ts) — verrou atomique du store (`FR-CAP-LOCK-RADIO`), liste plate des Lieutenants alignée sur les verrouillés et dédoublonnage (`FR-LIE-CHECKBOX-COUNT`), ajout et retrait de termes (`FR-LEX-SELECT`), fusion `fetchKeywordsMerge` idempotente (`FR-MOT-PHASES`). Son bloc `FR-CAP-PERSIST` teste une copie locale d'une ancienne règle : il ne garde rien (cf. [captain-keyword-locked](captain-keyword-locked.md)).
- [`tests/unit/stores/article-keywords.store.test.ts`](../../tests/unit/stores/article-keywords.store.test.ts), [`tests/unit/stores/article-keywords.merge.test.ts`](../../tests/unit/stores/article-keywords.merge.test.ts), [`tests/unit/services/article-keywords.test.ts`](../../tests/unit/services/article-keywords.test.ts) (relecture avec ou sans ligne, écriture limitée à `article_keywords` + copie), [`tests/unit/routes/article-keywords.routes.test.ts`](../../tests/unit/routes/article-keywords.routes.test.ts), [`tests/unit/shared/contracts/article-keywords.contract.test.ts`](../../tests/unit/shared/contracts/article-keywords.contract.test.ts), [`tests/contract-api/article-keywords-isolation.contract.test.ts`](../../tests/contract-api/article-keywords-isolation.contract.test.ts).
- À écrire : un enregistrement depuis un store vide ne doit pas effacer les décisions en base.

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
