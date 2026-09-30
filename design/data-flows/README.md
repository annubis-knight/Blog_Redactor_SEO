# Flux de données — index et méthode

Une **donnée partagée** traverse plusieurs couches : elle est écrite par un écran ou un script, rangée en base, recopiée dans un store (la mémoire de travail d'un écran, Pinia), puis lue par d'autres écrans, des calculs, des portes (contrôles de qualité) ou des consignes de l'IA. Exemple : l'étape « Capitaine verrouillé » est posée par l'onglet Capitaine, rangée dans `articles.completed_checks`, puis lue par les points de progression, le bouton de la Rédaction et l'onglet ouvert à la sélection.

Chaque fiche de ce dossier suit une de ces données : qui la **produit**, où elle **persiste** entre deux sessions, qui la **consomme** (affichage, calcul), les **règles de cohérence** qui la tiennent, les **cas à risque**, les **limites connues** et les **tests** qui la gardent. Les fiches décrivent le code actuel, avec ses fichiers et ses symboles ; le détail de chaque domaine reste dans les [chapitres de design](../README.md), vers lesquels elles renvoient.

## Quand ouvrir une fiche

Avant de planifier un changement, dès qu'il touche une donnée qui passe d'une couche à l'autre ([`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) §2.0, phase 1.bis « Cartographie »). Déclencheurs :

- le changement modifie l'**affichage** d'une valeur **et** son calcul, son tri ou son filtre ;
- il touche un type partagé de [`shared/types/`](../../shared/types/) ;
- il touche la **persistance** : table, cache, store Pinia, stockage du navigateur ;
- le bug ressemble à « la donnée diffère entre deux endroits » ou « ça marche au premier chargement, pas au rechargement ».

Si la fiche existe : la relire, vérifier dans le code ce qu'on va toucher, et la mettre à jour avec le changement. Si elle n'existe pas : l'écrire (ci-dessous) avant de coder.

## Index des fiches

**Article et cocon**

| Fiche | Donnée | Autorité |
|---|---|---|
| [articles](./articles.md) | La fiche d'un article : identité, niveau, place dans l'arbre du cocon (parent, section), statut, phase | table `articles` |
| [completed-checks](./completed-checks.md) | Progression : six étapes du Moteur et « premier jet accepté » | `articles.completed_checks` |
| [strategy](./strategy.md) | Stratégie du cocon (cinq étapes, carte indicative `proposedArticles`, `completedSteps`) ; stratégie d'article héritée | `cocoon_strategies.data`, `article_strategies` |
| [strategy-context](./strategy-context.md) | Ce que savent les consignes de l'IA : stratégie, douleur de l'article, état du cocon | recalculé à chaque appel (sources en base) |
| [local](./local.md) | Zone du client et repères locaux (consignes, recherche web, porte de structure) ; restes de l'ancienne analyse Maps | `theme_config.data.avatar.location`, `local_entities` |

**Moteur et mots-clés**

| Fiche | Donnée | Autorité |
|---|---|---|
| [moteur](./moteur.md) | Vue d'ensemble : ce que lit, écrit et valide chacun des sept onglets, ce que la vue remet à zéro au changement d'article | — (renvoie aux fiches ci-dessous) |
| [keyword-metrics](./keyword-metrics.md) | Mesures d'un mot-clé partagées entre articles (volume, difficulté, CPC, intention, suggestions, PAA…) | `keyword_metrics` |
| [intent](./intent.md) | Intention de recherche selon Google, croisée avec l'intention attendue de l'article | `keyword_metrics.intent_label` / `intent_raw`, `articles.pain_intent_expected` |
| [radar-keywords](./radar-keywords.md) | Liste d'attente du Radar : mots-clés à scanner | `radar_explorations.generated_keywords` |
| [radar-explorations](./radar-explorations.md) | Dernier scan Radar d'un article, longues traînes proposées et cochées | `radar_explorations.scan_result` |
| [score-capitaine](./score-capitaine.md) | Score Marché, Score Pertinence et verdict d'un candidat | recalculés, jamais enregistrés |
| [relevance-score-live-computation](./relevance-score-live-computation.md) | Calcul complet du Score Pertinence, ses entrées et ses raisons d'absence | recalculé ; entrées en base |
| [captain-relevance](./captain-relevance.md) | Jugement des questions PAA face à la douleur, au Capitaine | mémoire de session du store (non enregistré) |
| [captain-keyword-locked](./captain-keyword-locked.md) | Capitaine verrouillé : affichage en direct dans la barre et le Lexique, cannibalisation | `article_keywords.capitaine` (copie : `articles.captain_keyword_locked`) |
| [keywords](./keywords.md) | Décisions de mots-clés d'un article : Capitaine, Lieutenants, Lexique, racines, structure H1/H2/H3 | `article_keywords` |
| [lieutenants](./lieutenants.md) | Lieutenants proposés, cochés, verrouillés | `article_keywords.lieutenants`, `lieutenant_explorations` |
| [lexique](./lexique.md) | Termes du lexique choisis parmi le TF-IDF des concurrents | `article_keywords.lexique` |

**Rédaction**

| Fiche | Donnée | Autorité |
|---|---|---|
| [seo](./seo.md) | Scores SEO et GEO : calcul en direct, enregistrement avec le texte noté | écran pendant la rédaction ; `articles.seo_score` / `geo_score` entre deux sessions |

**Portes de qualité**

| Fiche | Donnée | Autorité |
|---|---|---|
| [gate-waivers](./gate-waivers.md) | Dérogations : passer outre un point 🟠 / 🔴, pour ce point et ses données ; réaffichées à la publication | `gate_waivers` (`input_hash` = empreinte du point) |

Fichier à part : [`_template.md`](./_template.md), le modèle d'une fiche.

## Comment écrire une fiche

1. **Copier [`_template.md`](./_template.md)** sous le nom de la donnée (`kebab-case.md`).
2. **Front-matter** : `name`, `description` (une phrase), `type`, `last_updated`, `related_fr` (identifiants `FR-…` / `NFR-…` qui existent dans [`spec/requirements.md`](../../spec/requirements.md) ; n'en inventez pas). Ajouter `synced_with: [autre-fiche.md]` quand deux fiches décrivent la même cause et doivent bouger ensemble (exemple : `completed-checks.md` et `captain-keyword-locked.md`, un test le vérifie).
3. **Répondre aux cinq questions de §2.0**, dans le code :
   - producteurs : qui crée, modifie, restaure la donnée (écran, route, service, scripts, écritures faites par le serveur seul) ;
   - consommateurs : qui l'affiche, qui décide avec (tri, filtre, agrégat, porte, consigne de l'IA) ;
   - persistance : table et colonnes, et chaque copie en mémoire (qui la remplit, quand elle est relue) ;
   - cas d'usage : premier chargement, rechargement, changement d'article, deux onglets, écriture refusée, donnée absente ;
   - régressions : un `git log` sur le champ sert à trouver les pièges ; la fiche, elle, n'écrit que l'état actuel, dans « Limites connues ».
4. **Règles d'écriture** : le code fait foi ; on cite des fichiers et des symboles, jamais des numéros de ligne ; liens relatifs à ce dossier (`../../src/…`, `../11-cerveau.md`) ; français, phrases courtes, un terme technique défini à sa première apparition ; pas d'historique dans le corps. Un écart entre le code et une exigence se note dans « Limites connues », avec l'exigence concernée.
5. **Un test au moins** dans [`tests/unit/coherence/`](../../tests/unit/coherence/), qui vérifie que la valeur affichée et la valeur calculée sortent de la même expression. Modèle : [`_template.test.ts`](../../tests/unit/coherence/_template.test.ts). Préfixer le `describe()` par l'identifiant de l'exigence (`FR-MOT-CHECKS — …`) : chercher l'identifiant retrouve alors l'exigence, le design, la fiche et le test. Un test qui recopie la logique au lieu d'importer le code ne garde rien : la fiche doit le dire.
6. **Ajouter la fiche à l'index** ci-dessus.

Outil : le skill `/data-flow-discipline` (`cartographier <donnée>` pose les questions une à une et génère une fiche à partir de **son propre** modèle, à ramener ensuite à la forme de `_template.md` ; `audit` lance l'audit ci-dessous).

## La règle de cohérence

> Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de repli différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout : en bas du tri, hors de la moyenne, affichée « — ».

Les bugs qu'elle évite :
- **l'affichage et le tri divergent** : l'utilisateur trie par score et la liste ne bouge pas, parce que le tri lit une valeur et la carte en affiche une autre ;
- **le repli silencieux** : un `?? 0` sur un score absent fait mentir le tri sans signaler l'absence ;
- **la chaîne en dur** : un composant écrit `'moteur:capitaine_locked'` au lieu de la constante `MOTEUR_CAPITAINE_LOCKED` ; au prochain renommage, une partie des usages suit, l'autre non ;
- **le cache divergent** : la même donnée vit en base, en cache et en store, et personne ne sait lequel fait foi ;
- **le rechargement qui diffère du premier chargement** : la donnée est créée par un chemin et relue par un autre, qui ne produisent pas la même chose.

## L'en-tête `AUTHORITY:`

Tout fichier de `src/stores/`, `src/composables/` ou `server/services/` qui touche une donnée partagée porte en tête un commentaire cherchable ([`.claude/CLAUDE.md`](../../.claude/CLAUDE.md) §3.2). Exemple réel, [`cocoon-article.service.ts`](../../server/services/article/cocoon-article.service.ts) :

```typescript
/**
 * AUTHORITY: PostgreSQL `articles` (création : `parent_id`, `parent_section`) ;
 *            `articles.completed_checks` du parent (`redaction:draft_accepted`).
 * READS FROM: articles du cocon (getArticlesByCocoon), texte et structure du
 *             parent (article_content.content, article_keywords.hn_structure),
 *             keyword_metrics (mot-clé mesuré), porte `draft` du parent.
 * WRITES TO: articles (insertCocoonArticle ; setArticleParent pour un rattachement,
 *            K8) ; étape `redaction:draft_accepted` du parent quand sa porte passe.
 * CONSUMERS: POST /api/cocoons/:cocoonId/articles, PUT .../articles/:articleId/parent
 *            et GET /api/cocoons/:cocoonId/tree (cocoons.routes.ts) — écran du
 *            Cerveau, mode automatique.
 * RELATED FR: FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE,
 *             FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-KEYWORD-REAL-DATA
 */
```

La fiche et l'en-tête se répondent : la fiche donne la vue d'ensemble, l'en-tête dit à qui lit le fichier où le flux continue. Un `` grep "AUTHORITY: PostgreSQL `articles`" `` retrouve les fichiers qui parlent à cette table. Un en-tête faux égare plus qu'un en-tête absent : on le corrige quand la fiche change.

## Garde-fous automatiques

| Garde-fou | Ce qu'il bloque | Où il tourne |
|---|---|---|
| Règle ESLint `no-restricted-syntax` ([`eslint.config.ts`](../../eslint.config.ts)) | `?? 0` et replis semblables sur un score ou un indicateur (volume, difficulté, CPC, concurrence, densité) ; seul `shared/score/` y échappe, hors exceptions déclarées dans le code | au commit (`lint-staged`), `verify:full`, `check:health` ; pas dans `verify` |
| [`completed-checks.test.ts`](../../tests/unit/coherence/completed-checks.test.ts) | une étape écrite en dur dans `src/` | `test:unit`, CI |
| Tests de `tests/unit/coherence/` | écarts entre affichage et calcul, par donnée | `test:unit`, CI ; pas dans `verify` |
| Audit `python ".claude/skills/data-flow-discipline/scripts/audit_data_flow.py" --root .` (réglages : [`.data-flow-discipline.json`](../../.data-flow-discipline.json)) | replis silencieux, chaînes d'étape en dur, `fetch` direct, en-têtes `AUTHORITY:` manquants, fichiers trop longs, fiches dont le nom n'apparaît dans aucun test de `tests/unit/coherence/` | à la demande (`--output` pour écrire le rapport) |
