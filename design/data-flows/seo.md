---
name: seo
description: Scores SEO et GEO de l'article en rédaction — calculés à l'écran en continu, affichés dans les panneaux, puis enregistrés dans articles.seo_score / geo_score avec le seul texte qu'ils notent.
type: "SeoScore { global: number, factors, keywordDensities[], headingValidation, metaAnalysis, checklistItems, wordCount, hasArticleKeywords, … } (shared/types/seo.types.ts) ; GeoScore ; en base : articles.seo_score / geo_score NUMERIC, NULL = inconnu"
last_updated: 2026-09-28
related_fr: [FR-RED-SEO-LIVE, FR-RED-GEO-LIVE, FR-RED-SEO-SCORE-PERSIST, NFR-PERF-SEO-DEBOUNCE, FR-RED-WORD-COUNT-TARGET, FR-RED-META, FR-INFRA-NO-SCORE-FALLBACK]
---

# Data Flow — seo

> **En clair :** pendant la rédaction, l'outil note l'article sur 100, deux fois. Le score **SEO** mesure ce que Google regarde : le capitaine (mot-clé principal) et les lieutenants (mots-clés secondaires) bien présents, des titres bien hiérarchisés, une méta à la bonne longueur, un texte assez long. Le score **GEO** mesure ce qu'une IA qui répond aux questions peut extraire et citer : paragraphes courts, titres en questions, capsules de réponse, statistiques sourcées. Le calcul se fait dans le navigateur ; la base garde le dernier score **du texte enregistré**, ou « inconnu ».
>
> **Type/format :** `SeoScore` ([`shared/types/seo.types.ts`](../../shared/types/seo.types.ts)) ; `global` est un nombre de 0 à 100, jamais `null` une fois calculé. En base : `articles.seo_score`, `articles.geo_score` (NUMERIC, `NULL` = inconnu).
>
> **Chapitres :** [Rédaction](../17-redaction.md) (« Scores SEO et GEO », « Longueur visée », « Données de la Rédaction »).

## Producteurs

**Calcul SEO.** [`useSeoScoring`](../../src/composables/seo/useSeoScoring.ts), monté par [`ArticleWorkflowView.vue`](../../src/views/ArticleWorkflowView.vue) et [`ArticleEditorView.vue`](../../src/views/ArticleEditorView.vue) :
- `watch` profond sur le texte et la méta (`editorStore`), les mots-clés du cocon et les mots-clés de l'article (`article_keywords` : capitaine, lieutenants, lexique) ;
- `useDebounceFn` de 300 ms, puis `requestIdleCallback` (repli `setTimeout 0`) ; un calcul en attente est annulé par le suivant ;
- texte vide → `seoStore.reset()` (score `null`) ;
- sinon `seoStore.recalculate(texte, mots-clés du cocon, meta title, meta description, longueur visée, mots-clés associés, mots-clés de l'article, slug)`.

[`seo.store.ts`](../../src/stores/article/seo.store.ts) `recalculate` → `calculateSeoScore` ([`src/utils/seo-calculator.ts`](../../src/utils/seo-calculator.ts)) :
- densités **sur les mots-clés de l'article seulement** : sans capitaine, aucune densité (`hasArticleKeywords = false`), jamais de repli sur les mots-clés du cocon ;
- six facteurs, pondérés par `SEO_SCORE_WEIGHTS` ([`shared/constants/seo.constants.ts`](../../shared/constants/seo.constants.ts)) : capitaine 0,25, lieutenants 0,15, titres 0,20, meta title 0,15, meta description 0,10, longueur 0,15 ;
- longueur visée : `contentLengthTarget` fourni par la vue (cf. [Rédaction](../17-redaction.md), « Longueur visée »), sinon `DEFAULT_CONTENT_LENGTH_TARGET = 1500` ;
- capitaine cherché dans le vrai slug (`checkSlugKeyword`).

Puis `recalculate` confie le score à l'éditeur : `editorStore.recordScore('seo', global, seoScoreKey(texte, meta title, meta description))`.

**Calcul GEO.** [`useGeoScoring`](../../src/composables/seo/useGeoScoring.ts) (300 ms) → [`geo.store.ts`](../../src/stores/article/geo.store.ts) → `calculateGeoScore` ([`src/utils/geo-calculator.ts`](../../src/utils/geo-calculator.ts), `GEO_SCORE_WEIGHTS` 30 / 25 / 25 / 20, constantes dans [`shared/constants/geo.constants.ts`](../../shared/constants/geo.constants.ts)) → `recordScore('geo', …)` avec pour empreinte le texte seul.

**Enregistrement** — [`editor.store.ts`](../../src/stores/article/editor.store.ts), sans état réactif :
- `scoreSnapshots` garde le dernier score de chaque sorte avec l'**empreinte** du texte noté (`seoScoreKey` = texte + méta ; GEO = texte, [`src/utils/score-key.ts`](../../src/utils/score-key.ts)) ;
- `saveArticle` envoie `PUT /api/articles/:id { content, metaTitle, metaDescription, seoScore, geoScore }`, chaque score valant `freshScore` : la valeur si son empreinte est celle du texte envoyé, sinon `null` ;
- `recordScore` : si le texte noté est exactement le dernier enregistré (`lastSaved`) et que la valeur a changé, envoie `PUT { seoScore }` ou `{ geoScore }` seul ; en cas d'échec, revient à la valeur précédente ;
- `loadExistingContent` (rédaction guidée) initialise `lastSaved` avec le texte chargé et les scores en base : le score recalculé sur ce texte intact rejoint la base.

**Serveur.** `saveArticleContent` ([`article-content.service.ts`](../../server/services/article/article-content.service.ts)) écrit `seo_score` / `geo_score` **dès que le champ est présent**, même `null`, et ne les touche pas s'il est absent. Aucun calcul de score côté serveur ; le mode automatique n'en calcule pas.

## Persistance

| Niveau | Où | Fraîcheur |
|---|---|---|
| Autorité **pendant la rédaction** | `useSeoStore.score`, `useGeoStore` | Recalculés à chaque modification ; remis à `null` par `reset` |
| Autorité **entre deux sessions** | `articles.seo_score`, `articles.geo_score` | Score du texte enregistré, ou `NULL` si le score connu ne correspond pas à ce texte |
| Empreintes | `scoreSnapshots`, `lastSaved` (variables du store éditeur) | Remises à zéro par `resetEditor` |

`GET /api/articles/:id/content` renvoie les scores enregistrés ; l'écran ne les affiche pas : il recalcule.

## Consommateurs

### Affichage (UI)

- [`SeoPanel.vue`](../../src/components/panels/SeoPanel.vue) — jauge `ScoreGauge` du score global, nombre de mots, temps de lecture, avertissement « aucun mot-clé article » si `!hasArticleKeywords` ; onglets `KeywordsTab`, `IndicatorsTab` (facteurs, placement du capitaine, présence des lieutenants, alertes : [`AlertsCard.vue`](../../src/components/panels/indicators/AlertsCard.vue)), `SerpDataTab`.
- [`GeoPanel.vue`](../../src/components/panels/GeoPanel.vue) — score GEO et son détail.
- Boutons « SEO » et « GEO » grisés tant que l'article n'a pas de texte ([`ArticlePanelsToolbar.vue`](../../src/components/article/ArticlePanelsToolbar.vue)).

### Calcul / tri / filtre / agrégat

- `scoreLevel` (`SEO_SCORE_LEVELS` : ≥ 70 bon, ≥ 40 moyen, sinon faible ; `null` sans score).
- `hasIssues` — titres invalides, densité hors cible, meta title ou description hors longueur.
- Audit `npm run verify:content` ([`scripts/verify-content.ts`](../../scripts/verify-content.ts) → `describeScores`, [`verify-content-gates.ts`](../../scripts/verify-content-gates.ts)) : seul lecteur des scores **enregistrés**, affiche « — » quand ils sont inconnus.
- La porte de publication **ne lit pas** le score enregistré : elle rejoue ses propres vérificateurs.

## Règles de cohérence

- **Le score enregistré est celui affiché, pour ce texte.** Même calcul (`calculateSeoScore`), même valeur, et une empreinte qui prouve que le texte n'a pas changé entre le calcul et l'envoi. Sinon la base porte `NULL`, jamais un chiffre d'une autre version.
- **La méta compte pour le SEO, pas pour le GEO.** Modifier la méta périme le score SEO seulement.
- **Une absence reste une absence** en base (`NULL`) et dans l'audit (« — »). À l'écran, la jauge reçoit `score?.global ?? 0` : un article sans score calculé s'afficherait à 0 (cf. limites).
- **Même longueur visée** pour le facteur « longueur », la barre de mots et la porte du premier jet (cf. [Rédaction](../17-redaction.md), « Longueur visée »).

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque |
|---|---|---|---|
| **Frappe rapide** | texte de l'éditeur | aucune | Couvert : un seul calcul 300 ms après la dernière frappe, pendant un temps mort du navigateur. |
| **Sauvegarde avant la fin du calcul** | empreinte | `seoScore: null` avec le texte, puis `PUT { seoScore }` seul dès que le calcul sur ce texte arrive | Couvert (`recordScore`). |
| **Méta générée après le premier jet** | texte + méta | nouvelle empreinte SEO | Le score SEO d'avant la méta n'est plus envoyé ; celui calculé avec la méta part à la sauvegarde suivante. |
| **Mots-clés de l'article chargés après le texte** | `articleKeywords` | aucune | Premier calcul sans capitaine (densités neutres à 50), puis nouveau calcul quand ils arrivent. |
| **Premier jet enregistré au fil (`saveContenuPartiel`)** | — | `PUT { content }` sans score | La colonne garde l'ancien score à côté du nouveau texte jusqu'à la sauvegarde finale ; si la génération s'interrompt, il y reste. |
| **Ouverture dans l'éditeur libre** | `setContent` + `markClean` | aucune | `lastSaved` reste vide : le score recalculé ne part qu'à la prochaine sauvegarde. |
| **Article ouvert, jamais modifié** | score recalculé | `PUT { seoScore }` seul (rédaction guidée) | Voulu : le score du texte intact rejoint la base. |

## Limites connues

- **Densités neutres.** Sans capitaine, les facteurs « capitaine » et « lieutenants » valent 50 chacun : 40 % du score global est une valeur par défaut. L'écran le signale (avertissement « aucun mot-clé article »), le nombre, lui, ne le dit pas.
- **Jauge à 0.** `SeoPanel` passe `seoStore.score?.global ?? 0` à `ScoreGauge` : repli silencieux à corriger (le chapitre Rédaction le relève aussi).
- **Enregistrement au fil.** `saveContenuPartiel` écrit le texte sans remettre les scores à `NULL` : un score d'une version précédente peut rester en base à côté d'un premier jet interrompu (écart à FR-RED-SEO-SCORE-PERSIST, « jamais un score d'une autre version »). Le mode automatique, qui enregistre du texte sans score, laisse de même la colonne inchangée.
- Les scores enregistrés ne servent qu'à l'audit : aucun écran ne les affiche.

## Tests de cohérence

- [`tests/unit/coherence/seo.test.ts`](../../tests/unit/coherence/seo.test.ts) — le vrai `useSeoStore` : plusieurs recalculs rapides regroupés, `scoreLevel` aux seuils 70 / 40 et `null`, `hasIssues` (H1 absent ou double, niveau sauté, densité hors cible, méta hors longueur), aucune densité sans mots-clés d'article (et score de 61 attendu avec densités neutres), `reset`, nombre de mots repris de l'éditeur, capitaine dans le slug.
- Hors du dossier `coherence/` : [`editor-score-persist.test.ts`](../../tests/unit/stores/editor-score-persist.test.ts) (FR-RED-SEO-SCORE-PERSIST : score du texte enregistré envoyé avec lui ; autre version → « inconnu » ; méta modifiée périme le SEO, pas le GEO ; score calculé après ou pendant la sauvegarde envoyé seul ; pas de double envoi), [`seo-calculator.test.ts`](../../tests/unit/utils/seo-calculator.test.ts), [`geo-calculator.test.ts`](../../tests/unit/utils/geo-calculator.test.ts), [`verify-content-gates.test.ts`](../../tests/unit/scripts/verify-content-gates.test.ts) (`describeScores`).
- À écrire : un test qui vérifie qu'un enregistrement au fil remet les scores à « inconnu », et un test de `SeoPanel` sans score (la jauge doit dire « — »).

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
