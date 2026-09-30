---
name: tech-spec-lot6-restes
title: Recette du 2026-09-30, lot 6 — les 7 défauts restés voisins des lots 1 à 5
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md (FR-CAP-AI-PANEL, FR-CAP-ROOTS, FR-RAD-AI-SUGGESTIONS, FR-LEX-AI-PANEL, FR-INFRA-LIEUTENANT-EXPLORATIONS, FR-EXT-DATAFORSEO-SANDBOX, FR-INFRA-COST-LOG-STORE)
  - spec/recette/ (01, 04, 05, 06, 08, 09), spec/parcours/ (PU-03, PU-04, PU-07)
  - spec/07-radar.md, spec/08-capitaine.md, spec/09-lieutenants.md, spec/11-lexique.md, spec/14-integrations.md, spec/16-infrastructure.md
  - design/02-donnees.md, design/03-api.md, design/04-ia-et-prompts.md, design/08-ecrans.md, design/13-discovery.md, design/14-radar-capitaine.md, design/15-lieutenants-structure-lexique.md, design/18-integrations.md, design/20-infrastructure.md, design/21-qualites.md, design/data-flows/
  - server/db/changes/2026-09-30-keyword-metrics-from-sandbox.sql, server/db/schema.sql, server/db/bootstrap.sql
---

# Tech-spec — Lot 6 : les 7 défauts restants

Après les lots 1 à 5, sept exigences voisines restaient « non tenue ». Arnaud a choisi de les corriger toutes, sans rien ajouter en route. Quatre agents en parallèle (fichiers répartis), une seule branche d'intégration `fix/lot6-restes`, une seule PR. Chaque défaut : exigence, test rouge qui cite l'ID, correctif, doc. Les 7 exigences repassent **active** (113 « non tenue » sur 286 dans `spec/requirements.md`, contre 120 avant ce lot).

## 1. Avis IA du Capitaine (FR-CAP-AI-PANEL)

- **Stratégie non transmise.** L'écran n'envoyait jamais `cocoonSlug` ; `POST /keywords/:kw/ai-panel` ne chargeait la stratégie que par ce champ, donc `{{strategy_context}}` restait vide. `server/routes/keyword-ai-panel.routes.ts` `cocoonOfArticle` retrouve le cocon de l'article (`getArticleById`). Test : `tests/unit/routes/captain-ai-panel-strategy.test.ts` (vrai `loadPrompt`, vrai `.md`).
- **Confirmation « un appel Claude » en simulé.** Texte écrit en dur. `shared/ai-call-notice.ts` `paidAiCallNotice`, composable `src/composables/ui/useAiCallNotice.ts`, `aiProvider: getProvider()` dans les réponses de `/runtime-mode` et le store `runtime-mode`. En simulé : « Mode simulé : la réponse sera simulée, sans appel payant. » Tests : `tests/unit/shared/ai-call-notice.test.ts`, `tests/unit/components/captain-ai-regen-confirm.test.ts`.

## 2. Racines du Capitaine (FR-CAP-ROOTS)

- **Ordre.** Les études restent en parallèle ; les racines sont rangées dans l'ordre d'`extractRoots` (de la plus longue à la plus courte). Test : `useExploredKeywords-roots-order.test.ts`.
- **Réouverture.** `getArticleKeywords` rendait les racines sans indicateurs alors que `computeRelevanceForCaptainTab` venait de lire leurs mesures. `server/services/keyword/captain-root-studies.ts` `rootStudiesFromMetrics` rend indicateurs, questions et Score Pertinence d'une racine déjà mesurée, sans requête ni appel en plus. Une racine jamais mesurée reste « — » avec l'infobulle « Racine pas encore étudiée : aucune mesure en base. Un clic l'étudie. » (rien de payant sans clic). Tests : `services/captain-roots-reopen.test.ts`, contrat `article-keywords`, `captain-roots-sidebar.test.ts`.

## 3. Suggestions IA du Radar (FR-RAD-AI-SUGGESTIONS)

- **Bouton sans effet.** `RadarPanel.vue` relayait la sélection sous un nom d'événement que personne n'écoutait. « Marquer comme candidats Capitaine » passe par `cards-selected`, le même chemin qu'« Envoyer au Capitaine ». Test : `radar-mark-captain-candidates.test.ts`.
- **Pastille « P » vide.** Voulu : le Radar ne calcule pas la pertinence (FR-RAD-NO-RELEVANCE-IN-SCAN). L'exigence est alignée sur cette règle ; rien n'est calculé au Radar.

## 4. Analyse IA du Lexique (FR-LEX-AI-PANEL)

- **Deux listes.** Le décompte et l'état « à lancer » lisaient la liste relue en base (`useLexiqueExplorations`), les badges une seconde liste propre à `useLexiqueIa`, le résumé et les termes manquants le dernier flux reçu, quel que soit le mot-clé. Une seule analyse affichée, celle du mot-clé affiché, dans `useLexiqueExplorations` (relue au chargement, rangée à la fin d'une analyse par `applyIaAnalysis`). Une réponse arrivée après un changement d'article est ignorée. Tests : `tests/unit/composables/lexique/lexique-ai-analysis.test.ts`, `tests/unit/components/lexique-ai-panel-une-analyse.test.ts`.

## 5. « Tout réinitialiser » des Lieutenants (FR-INFRA-LIEUTENANT-EXPLORATIONS)

- **Archivage à l'écran seulement.** Au rechargement, les cases viennent des statuts `locked` de `lieutenant_explorations` ; « Tout réinitialiser » vidait la liste plate sans écrire ces statuts, et la route d'archivage n'avait aucun appelant. L'action du store appelle `POST /articles/:id/lieutenants/archive` avec les seuls lieutenants verrouillés (liste `keywords` optionnelle, validée par Zod, dans la route et `archiveLieutenantExplorations`).
- **Ajout depuis le panneau d'aide.** Nouvelle action `proposeLieutenant` : entrée proposée, enregistrée aussitôt, non cochée.
- Tests : `lieutenant-explorations-persist.test.ts`, `routes/lieutenants-archive.routes.test.ts`, `db-tables-coverage.test.ts`.

## 6. Données du bac à sable resservies comme vraies (FR-EXT-DATAFORSEO-SANDBOX)

- **Caches à clé.** `server/db/cache-helpers.ts` `modeScopedKey` : en simulé, les clés d'`external_api_cache` et la racine des découvertes (`keyword_discoveries`) reçoivent le préfixe `mock:` ; en réel, la clé ne change pas. Search Console et suggestions Google restent partagées (même réponse dans les deux modes). Le cache mémoire du relevé des pages concurrentes est aussi rangé par mode. Test : `tests/unit/services/sandbox-cache-isolation.test.ts`.
- **Mesures par mot-clé.** Décision d'Arnaud : colonne `keyword_metrics.from_sandbox` (changement daté `server/db/changes/2026-09-30-keyword-metrics-from-sandbox.sql`, appliqué à la base de développement puis `db:snapshot`). Toute écriture en simulé marque la ligne ; une écriture réelle ne retire pas la marque. Au passage en réel (`POST /api/runtime-mode`, ou démarrage du serveur en réel), `purgeSandboxMeasures` efface les lignes marquées (tables filles en cascade) ; si l'effacement échoue, la bascule est refusée (500 `SANDBOX_PURGE_FAILED`). Test : `tests/unit/services/sandbox-measures-purge.test.ts`.
- **Limites écrites dans l'exigence, validées par Arnaud** : l'historique propre à chaque article (cartes du Radar, questions PAA jugées et avis du Capitaine, indicateurs des lieutenants, lexique extrait) garde ses chiffres simulés ; une mesure simulée encore en cours au moment de la bascule s'enregistre comme réelle.

## 7. Pile « Coûts API » (FR-INFRA-COST-LOG-STORE)

- **Opérations en base.** Le middleware `server/middleware/db-telemetry.middleware.ts` était testé mais pas monté. Monté sur `/api`, il ne note que les écritures (une ligne par table et par type), ne recompte pas un couple déjà rapporté par la route, couvre les transactions ; les panneaux IA en flux joignent leurs écritures à l'événement `done`. « Écriture significative » est définie dans l'exigence. Tests : `db-telemetry-middleware.test.ts`, `architecture/db-telemetry-mounted.test.ts`.
- **Coûts manquants.** `long-tail-suggest.service.ts` jetait l'`usage` ; `captain-paa-judge.service.ts` ne l'écrivait que dans le journal. Les deux remontent (une ligne par appel, libellés « Longues traînes du Radar », « Jugement des questions PAA »), toujours inscrits par `apiPost`. Tests : `routes/ai-cost-usage.routes.test.ts`, `composables/cost-log-long-tail-paa-judge.test.ts`.

## Intégration

- Conflits de fusion (doc et liste de `vitest.verify.config.ts`) résolus en gardant les deux apports ; un test de C ajusté à la réponse de `/runtime-mode` enrichie par A (`aiProvider`).
- Vérifications sur la branche fusionnée : lint, `verify:unit`, `type-check`, `db:check` ; 360 fichiers de tests de composants, composables, stores, routes, services et cohérence (3 914 tests) verts.

## Vu en route, non corrigé (noté pour plus tard)

- Discovery et Lexique affichent encore « Cela consommera un appel Claude. » en dur, même en simulé (`useAiCallNotice` s'y branche en une ligne).
- Le sous-titre « tri local par mix marché + pertinence » du panneau Radar est trompeur (« P » toujours vide).
- NFR-OBS-DBOPS-TRACK reste non tenue : elle demande aussi les lectures et un seuil d'alerte (question ouverte : voir les lectures dans la pile, au risque de la noyer ?).
- Une réponse illisible de l'IA pour les longues traînes renvoie 502 sans son coût ; les lignes « base » d'une route sans libellé portent le dernier segment de l'adresse.
- Lexique : seul le prompt limite les termes manquants à 5 ; le message d'erreur d'analyse reste affiché au changement d'onglet.
- Données simulées écrites avant ce lot : les découvertes du 30/09 sous l'ancienne clé et les mesures écrites avant la colonne (`from_sandbox = false`) ne sont pas reconnues ; nettoyage manuel, avec l'accord d'Arnaud.
