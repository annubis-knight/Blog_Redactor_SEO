---
name: tech-spec-lot7-candidats-mesurables
title: Recette réelle du 2026-10-02, lot 7 — des candidats mesurables pour le pilier
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-10-02
synced_with:
  - spec/requirements.md (FR-CER-KEYWORD-REAL-DATA)
  - spec/04-cerveau.md, spec/recette/02-cerveau.md (CER-R3), spec/parcours/PU-01-premier-article-du-cocon.md
  - design/11-cerveau.md, design/03-api.md, design/05-prompts-reference.md
---

# Tech-spec — Lot 7 : des candidats mesurables pour le pilier

## Le défaut, vu en réel

Le 2026-10-02, premier pilier réel du cocon « Création de site internet sur mesure à Toulouse » (Claude Haiku 4.5 + DataForSEO en production). « Créer le pilier » a rendu cinq candidats, tous des phrases longues (« création site internet sur mesure pour artisan toulouse »…). DataForSEO n'avait aucune donnée pour aucune : cinq « Non mesuré », cases grisées, **le pilier ne pouvait pas être créé**. Relancer coûtait un nouvel appel, sans garantie, et l'utilisateur n'avait aucun moyen de proposer la requête qu'il connaissait.

Exigence touchée : FR-CER-KEYWORD-REAL-DATA, trois critères ajoutés (requêtes courtes pour le pilier, mot-clé proposé par l'utilisateur, alerte quand rien n'est mesuré).

## 1. Le pilier demande des requêtes courtes

- `server/prompts/cocoon-child-keywords.md` : section `{{#pillarRule}}…{{/pillarRule}}`, au moins deux candidats sont la requête la plus large du sujet, « quelques mots seulement », jamais une question ni une phrase. Pas de fourchette chiffrée dans le prompt : le garde-fou `type-rules-ssot` les réserve aux règles par type ; les exemples donnent la longueur.
- `child-candidates.service.ts` `proposeChildCandidates` passe `pillarRule: 'oui'` pour un pilier, vide sinon.
- Test : `tests/unit/services/child-candidates.service.test.ts` (« le pilier reçoit la règle… ; un enfant non »). Les tests du mode simulé (`mock-cerveau`, `mock-cocoon-child`) passent la nouvelle variable.

## 2. « Votre mot-clé » : proposé, mesuré aussitôt

- Serveur : `measureOwnCandidate(cocoonId, keyword)` — normalise, refuse `COCOON_NOT_FOUND` (404) et `KEYWORD_TAKEN` (409, mot-clé d'un article du cocon) avant tout appel payant, mesure par `measureKeywords` (mêmes règles : mesures de moins de 7 jours relues d'abord), rend un `ChildCandidate`.
- Route : `POST /api/cocoons/:cocoonId/candidate-measure { keyword }` (`measureOwnCandidateSchema`, 2 à 120 caractères), délai du socket coupé.
- Écran : `CocoonCandidatesPanel.vue` (formulaire « Votre mot-clé », alerte `candidates-none-measured`), `useCocoonBuilder.measureOwnCandidate` (doublon de la liste refusé sans appel, ajout en fin de liste, garde `proposalSeq`), branché dans `CocoonTreeBuilder.vue` pour le pilier et pour les sections.
- Tests : `child-candidates.service.test.ts` (4), `cocoon-articles.routes.test.ts` (2), `cocoon-candidates-own-keyword.test.ts` (6), `useCocoonBuilder.test.ts` (3).

## 3. Hors périmètre

L'enregistrement local des réponses de l'IA, demandé pour la séance du 2026-10-02, n'est **pas** une exigence : il reste un ajout local, jamais versionné.
