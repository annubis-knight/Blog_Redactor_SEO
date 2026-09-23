---
name: tech-spec-parcours-8-temps
type: tech-spec
status: done
version: 1.1.0
last_updated: 2026-09-23
synced_with:
  - docs/testing-guide.md (niveau browser-e2e)
  - docs/contrats-affichage-moteur.md (inventaire des composants et formats attendus)
  - _bmad-output/planning-artifacts/prd.md (NFR-INT-DISPLAY-CONTRACTS)
  - tests/browser-e2e/
---

# Tech-spec — Parcours « 8 temps » par sous-phase (tests navigateur en mode simulé)

## Contexte

Les tests navigateur existants (`tests/browser-e2e/`, 17 fichiers) vérifient que
les pages s'ouvrent, que les onglets et boutons sont là et qu'aucune erreur JS
n'apparaît. Ils ne déclenchent **aucune action utilisateur réelle** : sur la
session du 2026-09-22, 50 tests sont passés sans un seul appel à DataForSEO ni à
une IA. Onze tests du Capitaine se mettent d'eux-mêmes en pause parce que
l'article créé par la préparation des tests n'apparaît pas dans la barre du haut
(`MoteurContextRecap` lit la **stratégie du cocon**, pas la table `articles`).

Conséquence : la chaîne déclencheur → service → réponse → **mise en format** →
affichage n'est testée nulle part de bout en bout. Les contrats d'affichage
(NFR-INT-DISPLAY-CONTRACTS) sont couverts par des tests unitaires avec des
réponses fabriquées, jamais par un parcours réel.

## Objectif

Une suite de **parcours en 8 temps**, un fichier par sous-phase du Moteur, qui
suit le chemin d'un utilisateur dans un vrai navigateur, sources externes en
mode simulé (gratuit), et vérifie **chaque temps** de la grille :

| Temps | Ce que le test vérifie |
|---|---|
| ① Déclencheur | le clic utilisateur (bouton, champ, case) part bien |
| ② Mémoire | le second appel lit le cache (pas de nouvel appel externe) |
| ③ Service(s) | la requête attendue est émise (interception réseau Playwright) |
| ④ Réponse | la réponse arrive (statut, forme) |
| ⑤ Mise en format | contrat appliqué : valeur absente → « — », jamais 0 inventé |
| ⑥ Sauvegarde | la donnée est en base (relecture API ou SQL) |
| ⑦ Affichage | le texte attendu est réellement à l'écran |
| ⑧ Décision | l'action (verrouiller, cocher) émet le check workflow et persiste |

## Décisions (validées avec l'utilisateur, 2026-09-22)

1. **Niveau** : vrai navigateur (Playwright). C'est le seul niveau qui teste le
   temps ⑦.
2. **Sources externes** : DataForSEO en **bac à sable** (`sandbox.dataforseo.com`,
   coût 0, données factices mais structurellement complètes — vérifié sur
   `keyword_overview`, `related_keywords`, `serp/organic`), IA en **mode simulé
   local** (`AI_PROVIDER=mock` + fixtures `server/services/external/mock-fixtures/`).
   Un **simulateur local** n'est écrit que là où le bac à sable ne suffit pas.
3. **Données de test** : un cocon étiqueté par exécution, ses trois articles
   (Pilier, Intermédiaire, Spécifique), **supprimés en fin d'exécution**.
4. **Mode réel plus tard** : les scénarios sont écrits pour être rejouables en
   mode réel (variable d'environnement), sans doubler les fichiers. Le mode réel
   ne fait pas partie de la suite par défaut (coût).

## Non-objectifs

- Aucune modification de comportement produit. Si un test révèle un défaut, il
  est consigné, et corrigé dans un lot séparé.
- Pas de refonte des 17 fichiers browser existants ; les nouveaux parcours
  viennent à côté.
- Pas de tests en mode réel dans `npm run verify` (coût DataForSEO).

## Architecture de la suite

```
tests/browser-e2e/
  helpers/
    test-fixtures.ts        (existant — cocon + article simples)
    parcours-fixtures.ts    (nouveau — cocon + stratégie + 3 articles + mode simulé)
  parcours/
    capitaine.parcours.test.ts
    radar.parcours.test.ts
    lieutenants.parcours.test.ts
    lexique.parcours.test.ts
    discovery.parcours.test.ts
```

Chaque fichier : un `describe` par niveau d'article (Pilier → Intermédiaire →
Spécifique) et un test par temps (ou par groupe de temps quand ils sont
indissociables), pour que le rapport dise exactement **quel temps** a lâché.

## Cartographie

**Pour qu'un article soit pilotable dans le Moteur** (relevé du 2026-09-22) :

1. `silos` → `cocoons` (SQL direct, étiquetés `[test:<runId>]`).
2. `POST /api/articles/batch-create` (`{ cocoonName, articles: [{ title, type:
   'pilier'|'intermediaire'|'specifique', slug, suggestedKeyword, painPoint }] }`)
   — il n'existe pas de `POST /articles`. Le point de douleur ne peut être posé
   qu'à la création (aucun endpoint ne le modifie ensuite) et doit faire ≥ 10
   caractères pour que le score de Pertinence se calcule.
3. `PUT /api/strategy/cocoon/:slug` avec `proposedArticles[].dbId` : **c'est la
   stratégie du cocon que lit la barre du haut**, pas la table `articles`.
   `validated` y est un texte, pas un booléen.
4. `GET /api/cocoons` pour résoudre l'**index** du cocon : `data.service.ts`
   réécrit `id: globalCocoonIndex++`, et c'est cet index que l'URL attend.

**Pièges d'interface rencontrés** (absorbés par le socle) :

- le panneau « Articles suggérés » est replié et intercepte les clics ;
- une carte du Capitaine se sélectionne au clavier : un clic au centre tombe sur
  les mots interactifs du mot-clé, qui arrêtent la propagation ;
- après un rechargement, l'écran propose « Charger <onglet> » au lieu de
  restaurer tout seul, et rouvre le dernier onglet visité (le Capitaine peut
  donc être monté mais masqué) ;
- la liste du Lexique se verrouille dès qu'un terme est retenu.

## Critères d'acceptation

- AC1 — Un parcours crée son cocon, ses 3 articles, et les rend sélectionnables
  dans la barre du haut du Moteur, sans toucher aux données réelles.
- AC2 — Chaque sous-phase a un test qui déclenche l'action réelle et vérifie le
  texte affiché (temps ① à ⑦), plus la décision (temps ⑧) quand elle existe.
- AC3 — Le temps ⑤ est vérifié explicitement : au moins un KPI absent doit
  s'afficher « — » à l'écran, et aucun « 0 » ne doit apparaître à sa place.
- AC4 — Aucun appel payant : les requêtes DataForSEO partent vers le bac à
  sable, l'IA reste locale. Un test de garde vérifie le mode effectif du serveur.
- AC5 — En fin d'exécution, plus aucune ligne étiquetée `[test:` ni `[browser:`
  ne subsiste dans `silos`, `cocoons`, `articles` et les tables liées.
- AC6 — `npm run verify` reste vert ; `npm run test:check` sans nouveau rouge.

## Validation

`PLAYWRIGHT_NO_SERVER=1 npx playwright test tests/browser-e2e/parcours/<fichier>`
fichier par fichier, serveur démarré avec `AI_PROVIDER=mock`, puis la suite
complète. Le journal du serveur est relu : aucune alerte de contrat inattendue,
aucun appel vers `api.dataforseo.com` (production).

## Journal

| Commit | Contenu |
|---|---|
| `05116d3` | Socle (cocon + stratégie + 3 articles + mode simulé + nettoyage) et parcours du Capitaine. |
| `8bd65b7` | Parcours Radar et Lieutenants. |
| `c7ab5e0` | **Correctif produit** : le garde-fou de coût comptait les appels du bac à sable (gratuits) et refusait les scans en HTTP 429 après ~2 $ fictifs. Valideur : `tests/unit/services/dataforseo-cost-guard-sandbox.test.ts`. |
| `ce1c204` | Parcours Lexique et Découverte, mise en commun du verrouillage Capitaine, fiabilisation des attentes. |
| `84c8b95` | Les `skip` du Lexique remplacés par de vraies vérifications (garde-fou `test-quality`). |
| `b3a4f30` | **Décision produit** : l'IA propose, l'utilisateur valide — les cartes Lieutenants arrivent décochées. |
| `260664a` | **Interactions internes** : 4 fichiers (Capitaine, Radar, Lieutenants, panneaux IA). |
| `e31b5de` | **Correctif produit** : la barre du haut affichait « suggéré » même Capitaine verrouillé (`captainKeywordLocked: null` en dur). FR-MOT-RECAP-LOCK-SYNC. |
| `64e474a` | **Correctif produit** : le bouton « Aller à la Rédaction » du panneau Finalisation n'était gardé par aucun verrou, contrairement à celui du bas. |
| `7e54331` | **Durcissement** : socle réparé (index du cocon + stratégie) et tests permissifs remis d'aplomb. |

**État** : 39 parcours + 58 tests navigateur historiques = **97 tests verts**,
aucun en pause, sans un centime dépensé (sources simulées).

- **Parcours de sous-phase** (21) : 5 sous-phases × 3 niveaux d'article + 6 tests de socle.
- **Interactions internes** (18) : les gestes *dans* les composants, qui ne
  changent pas d'onglet et n'apparaissent donc dans aucun parcours.

| Fichier | Ce qu'il couvre |
|---|---|
| `interactions-capitaine` | mots cliquables du mot-clé → scan d'une variante racine ; choix d'une racine ; moyenne des racines ; ouverture / fermeture du tiroir ; conseil IA (repli, lancement, texte rendu) |
| `interactions-radar` | dépliage d'une carte ; arbre PAA (enfants, réponse) ; info-bulle de l'anneau (calcul détaillé, ou raison de l'absence) ; cocher / tout cocher / trier / filtrer CPC ; suggestions longue traîne |
| `interactions-lieutenants` | carte (score « — », niveau Hn, sources, case) ; section « Autres candidats » ; tri sans perte ; **titre du plan Hn verrouillé qui survit à une régénération** ; panneau IA |
| `interactions-panneaux-ia` | les conteneurs « résumé IA » de Découverte, Radar et Lexique : jamais muets, toujours un moyen de relancer |

### Ce que les parcours ont révélé

1. **Garde-fou de coût vs bac à sable** — corrigé (`c7ab5e0`).
2. **Lieutenants pré-cochés mais non verrouillés** — tranché (`b3a4f30`) : l'IA
   propose, l'utilisateur valide. Les cartes arrivent décochées ; chaque case
   cochée verrouille immédiatement. Motif : ces mots-clés deviennent les H2/H3
   de l'article, et l'écran ne doit pas afficher « retenu » ce que la base
   ignore.
3. **Les tests navigateur existants étaient permissifs** : `moteur-navigation`
   vérifie des repères `phase-tab-*` qui n'existent pas (la nav utilise
   `wf-item-*`), sous un `if (count > 0)` — vert sans rien contrôler.
4. **Résidus anciens en base** : des `keyword_metrics` étiquetés `test-…` de
   sessions antérieures subsistent (les parcours, eux, nettoient tout).

## Volet 2 — durcissement des tests permissifs (2026-09-23)

### Pourquoi ils ne vérifiaient rien

Deux défauts du socle historique (`helpers/test-fixtures.ts`), pas de la paresse :

1. `createArticle()` renvoyait la **clé primaire** du cocon, alors que l'URL
   `/cocoon/:id/...` attend son **index** dans `GET /cocoons`. Les tests
   ouvraient donc un cocon quelconque, le plus souvent inexistant.
2. Aucune stratégie de cocon n'était posée : la barre du haut n'avait aucun
   article à lister, donc la navigation n'était jamais rendue.

Faute de pouvoir afficher quoi que ce soit, les auteurs ont enrobé chaque
assertion d'un `if (count > 0)` toujours faux, ou écrit des tautologies
(`expect(count).toBeGreaterThanOrEqual(0)`, `expect(['true','false',null]).toContain(x)`).
Onze tests se mettaient eux-mêmes en pause avec le motif
« Selection article impossible : fixture incompatible MoteurContextRecap ».

### Ce que leur réveil a révélé

| Attente du test | Réalité du code |
|---|---|
| repère `phase-tab-*` | la nav émet `wf-item-*` ([WorkflowNav.vue:117](../../src/components/shared/WorkflowNav.vue)) |
| l'onglet Finalisation n'existe pas sans les 3 verrous | navigation libre (FR-MOT-FREE-NAV) ; c'est la **sortie** qui est gardée |
| `is-suggested` sur `.tree-article-btn` | la classe vit sur `.tree-article-keyword` |
| l'article sélectionné est persisté en localStorage | **jamais implémenté** : la clé `blog-redactor:moteur-selected-article` n'est dans aucun fichier de `src/`, seuls les 3 tests existaient (Sprint 18) |
| la liste du Capitaine est vide sur un article neuf | un article issu de la stratégie arrive **avec** son mot-clé suggéré |

Plus les deux correctifs produit (`e31b5de`, `64e474a`).

### Décisions

- **Tautologies supprimées** : une assertion qui ne peut pas échouer ment sur la
  couverture.
- **Attentes périmées réécrites** sur la règle réelle, jamais l'inverse.
- **Tests d'une fonctionnalité absente retirés** (persistance de la sélection) :
  un test qui décrit du vide n'est pas un garde-fou. À rouvrir comme demande
  produit si la persistance est souhaitée.
- **Smoke tests conservés** (`pageerror`, page non blanche) : faibles mais honnêtes.
- **Gestes communs mutualisés** dans `helpers/moteur-ui.ts`, bascule en sources
  simulées dans `helpers/runtime-mode.ts` — désormais appliquée **aux deux
  socles**, donc plus aucun test navigateur ne peut dépenser un centime.

### Reste à faire

- Variante « mode réel » (coût DataForSEO) : mêmes scénarios, exécution manuelle.
- Ajouter les repères `data-testid` manquants (déclencheurs Découverte et Radar,
  résumé SERP, cases du Lexique) pour des sélecteurs moins fragiles.
- **Ordre de tri par défaut du Radar** : les cartes sont ordonnées par
  `combinedScore` (legacy, `@deprecated`, KPI absent compté 0) alors qu'elles
  affichent le score KPI (absent → « — »). Décision produit en attente ; aucun
  `FR-RAD-*` ne couvre le tri, contrairement au Lexique (`FR-LEX-SORT`).
- **Les suites `contract-api` et `e2e-workflows` appellent la production
  DataForSEO payante** : elles ne posent aucun override, et `DATAFORSEO_SANDBOX`
  est commenté dans `.env`. Trois exécutions de `npm run test:check` épuisent le
  budget (2 $ / 30 min) et font rougir une douzaine de tests en HTTP 429. Les
  mêmes passent en bac à sable. À basculer.
- **Baseline `tests/.baseline.json` périmé** : pris sur `f6281f4` (branche
  `fix/audit-p0`), il annonce 2 rouges là où la branche en compte 12 sans aucune
  modification. À régénérer une fois le point précédent réglé.
