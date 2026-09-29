# tests/

**Guide complet** : [../design/07-tests-et-outillage.md](../design/07-tests-et-outillage.md) — familles,
commandes, bases et ports, mode simulé, qui paie, cliquets, CI, conventions.

## Structure rapide

| Dossier | Quoi | A besoin de |
|---------|------|-------------|
| `unit/` | Fonctions, composants, stores, services isolés ; `coherence/` (affichage = calcul, cliquets) et `architecture/` (règles lues dans le source) | rien |
| `functional/` | Chaîne de vraies fonctions d'une étape du parcours | rien |
| `contract-api/` | Une route HTTP : corps valide → forme, corps invalide → code d'erreur | serveur + base |
| `integration-tabs/` | Un onglet de bout en bout côté API | serveur + base |
| `e2e-workflows/` | Parcours qui traversent plusieurs onglets par l'API | serveur + base |
| `integration/` | Services appelés directement contre PostgreSQL | base |
| `browser-e2e/` | Playwright : ce qui n'existe qu'à l'écran ; `parcours/` : parcours « 8 temps » et bout en bout | serveur, interface et base dédiés (démarrés par Playwright) |
| `helpers/` | `setupTestContext()`, client d'API, fixtures étiquetées `[test:<runId>]`, portes, mode simulé | — |
| `fixtures/` | Données figées (un vrai article publié) | — |

## Lancer

```bash
npm run verify                # filet rapide : lint, types, tests purs, contenu en base, schéma (PostgreSQL requis)

# Tests HTTP : le serveur de développement doit tourner (sinon ils sont ignorés)
node --env-file=.env --import=tsx/esm server/index.ts   # sans --watch, AI_PROVIDER=mock conseillé
npm run test:unit             # toute la suite Vitest (hors navigateur)
npm run test:check            # compare à tests/.baseline.json : un nouveau rouge = le chantier l'a cassé

# Tests navigateur : Playwright démarre son propre serveur (3410 / 5410) et recrée
# la base blog_redactor_seo_test ; le serveur de développement n'est pas touché
npm run test:browser
```

Les suites tournent en mode simulé (IA locale, DataForSEO en bac à sable) : elles ne coûtent rien, sauf
avec `TESTS_REELS=1` (Vitest) ou `PARCOURS_REEL=1` (parcours navigateur de bout en bout).

## Philosophie

**Les tests priorisent le parcours utilisateur réel, pas la couverture de code.**

Les 2 parcours à garantir en priorité :
- **Parcours A** : créer un article de A à Z (Cerveau → Moteur → Rédaction)
- **Parcours B** : revenir sur un article en cours et retrouver son état exact

Les scénarios à garder verts sont listés dans le guide (section « Parcours d'API »).
