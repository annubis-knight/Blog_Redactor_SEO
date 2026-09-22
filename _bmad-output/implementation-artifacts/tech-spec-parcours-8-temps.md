---
name: tech-spec-parcours-8-temps
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-22
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
| (ce commit) | Parcours Lexique et Découverte, mise en commun du verrouillage Capitaine, fiabilisation des attentes. |

**État** : 21 tests verts (5 sous-phases × 3 niveaux + 6 tests de socle), ~2 min 40
en mode simulé, sans un centime dépensé. Deux exécutions consécutives vertes.

### Ce que les parcours ont révélé

1. **Garde-fou de coût vs bac à sable** — corrigé (`c7ab5e0`).
2. **Lieutenants pré-cochés mais non verrouillés** : après la proposition IA, les
   cartes apparaissent cochées alors qu'aucun Lieutenant n'est verrouillé en
   base ; le check workflow n'arrive qu'après un vrai clic. Le parcours reproduit
   le geste (décoche puis recoche) — à trancher côté produit.
3. **Les tests navigateur existants étaient permissifs** : `moteur-navigation`
   vérifie des repères `phase-tab-*` qui n'existent pas (la nav utilise
   `wf-item-*`), sous un `if (count > 0)` — vert sans rien contrôler.
4. **Résidus anciens en base** : des `keyword_metrics` étiquetés `test-…` de
   sessions antérieures subsistent (les parcours, eux, nettoient tout).

### Reste à faire

- Variante « mode réel » (coût DataForSEO) : mêmes scénarios, exécution manuelle.
- Ajouter les repères `data-testid` manquants (déclencheurs Découverte et Radar,
  résumé SERP, cases du Lexique) pour des sélecteurs moins fragiles.
- Décider du sort des tests permissifs existants (les durcir ou les retirer).
