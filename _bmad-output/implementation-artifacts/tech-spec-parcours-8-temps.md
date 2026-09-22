---
name: tech-spec-parcours-8-temps
type: tech-spec
status: in-progress
version: 0.1.0
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

## Cartographie (à compléter)

_(chaîne cocon → stratégie → article → Moteur, et repères `data-testid` par
sous-phase : voir §Journal)_

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

_(complété au fil de l'eau)_
