---
name: tech-spec-lot8-douleur-mot-cle-propose
title: Recette réelle du 2026-10-02, lot 8 — la douleur du mot-clé proposé par l'utilisateur
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-10-02
synced_with:
  - spec/requirements.md (FR-CER-KEYWORD-REAL-DATA, FR-PIE-AI-GENERATION)
  - spec/04-cerveau.md, spec/recette/02-cerveau.md (CER-R3), spec/parcours/PU-01-premier-article-du-cocon.md
  - design/11-cerveau.md, design/04-ia-et-prompts.md, design/05-prompts-reference.md, design/data-flows/strategy-context.md
---

# Tech-spec — Lot 8 : la douleur du mot-clé proposé par l'utilisateur

## Le défaut, vu en réel

Le 2026-10-02, après le lot 7, le pilier du cocon « Création de site internet sur mesure à Toulouse » a été créé sur un mot-clé proposé par l'utilisateur (« création site internet toulouse », 720 recherches par mois, difficulté 17). Ce mot-clé revenait sans douleur ni intention éditoriale : l'article créé avait `pain_point` et `pain_intent_expected` vides. Conséquences au Moteur : aucun Score Pertinence au Capitaine (« — »), consignes de l'IA avec « (non défini) », pilier jugé « informationnel » à la porte du Capitaine. Et la douleur d'un article ne se modifie nulle part après sa création.

Exigence touchée : FR-CER-KEYWORD-REAL-DATA (un critère ajouté), précision dans FR-PIE-AI-GENERATION.

## Correctif

- `child-candidates.service.ts` :
  - `resolveTarget(tree, focus)` : niveau du nouvel article et refus d'avant l'appel payant, extraits de `proposeChildCandidates` et partagés avec `measureOwnCandidate` (un parent non rédigé est désormais refusé aussi pour un mot-clé proposé, avant toute dépense) ;
  - `measureOwnCandidate(cocoonId, keyword, focus)` : la mesure et `describeOwnKeyword` partent en parallèle ;
  - `describeOwnKeyword` : prompt `cocoon-own-keyword.md` (stratégie, état du cocon, niveau, section du parent, mot-clé imposé), JSON `{ painPoint, painIntentExpected }`, ne lève jamais (panne ou réponse illisible → `null`).
- Route `POST /cocoons/:cocoonId/candidate-measure` : accepte `parentId` et `parentSection` (`measureOwnCandidateSchema` étend `childCandidatesSchema`).
- `useCocoonBuilder.measureOwnCandidate` : envoie la cible ; mesuré sans douleur → avertissement « … est mesuré, mais l'IA n'a pas écrit la difficulté de son lecteur : l'article sera créé sans douleur, et le Capitaine n'aura pas de Score Pertinence. »
- Mode simulé : fixture `cocoon-own-keyword` (douleur qui cite le mot-clé, intention commerciale).
- En passant : l'en-tête `AUTHORITY:` du service citait à tort `keyword_serp_results` en écriture (relevé en cache `serp-top` depuis longtemps) ; corrigé, la ligne de design qui le signalait est retirée.

## Tests

- `tests/unit/services/child-candidates.service.test.ts` : douleur et intention écrites avec la stratégie et l'état du cocon ; niveau et section transmis pour un enfant ; IA en panne ou illisible → mesuré sans douleur ; intention hors des quatre → vide ; parent non rédigé refusé avant tout appel payant.
- `tests/unit/routes/cocoon-articles.routes.test.ts` : la cible passe au service.
- `tests/unit/composables/useCocoonBuilder.test.ts` : la cible part avec le mot-clé ; sans douleur, l'avertissement.
- `tests/unit/services/mock-cocoon-child.test.ts` : le mode simulé répond au prompt réellement assemblé.

## Reprise

Le pilier #1354, créé sans douleur, est retiré et recréé à l'écran avec le même mot-clé, cette fois porteur de sa douleur.
