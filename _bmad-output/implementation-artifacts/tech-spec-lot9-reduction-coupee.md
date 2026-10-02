---
name: tech-spec-lot9-reduction-coupee
title: Recette réelle du 2026-10-02, lot 9 — la réduction ne coupe plus les chapitres
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-10-02
synced_with:
  - spec/requirements.md (FR-RED-REDUCE-SECTION, FR-RED-DRAFT-SINGLE-PASS)
  - spec/13-redaction.md
  - design/17-redaction.md, design/05-prompts-reference.md
---

# Tech-spec — Lot 9 : la réduction ne coupe plus les chapitres

## Le défaut, vu en réel

Le 2026-10-02, premier jet réel du pilier #1355 (« Création de site internet sur mesure à Toulouse : le guide complet ») : 3 386 mots pour 2 500 visés. « Réduire (-886 mots) » a ramené l'article à 2 386 mots en 35 secondes, mais :

- six appels sur huit se sont arrêtés au plafond de jetons (`stopReason: max_tokens`, vu dans l'enregistrement des réponses de l'IA) ; le plafond était tiré des mots visés (`mots × 1,5 × 1,3`), trop court pour du HTML français ;
- leurs textes coupés ont été appliqués et enregistrés : cinq chapitres finissaient en pleine phrase (« … au lieu », « … La page de »), paragraphes jamais fermés, un H3 vidé ;
- la porte du premier jet n'a vu aucun « bloc coupé » : `trimTruncatedBlocks` cherche `<p>…</p>`, et un paragraphe jamais fermé s'étendait jusqu'au `</p>` du chapitre suivant, dont la fin est propre ;
- la réduction a sorti des chiffres de leurs marqueurs « à sourcer » (quatre alertes 🔴 à la porte).

## Correctif

- [`reduce-section.routes.ts`](../../server/routes/generate/reduce-section.routes.ts) : `reduceMaxTokens(sectionHtml)` — plafond tiré de la taille de la section reçue (≈ 3 caractères par jeton, marge 30 %, entre 1 024 et 8 192), comme l'humanisation ; une réponse arrêtée avant `end` émet `error { code: 'RESPONSE_TRUNCATED' }` et l'écran garde la section d'origine (`reduceArticle` le faisait déjà pour toute erreur).
- [`shared/content-repair.ts`](../../shared/content-repair.ts) : `closeUnclosedParagraphs` referme un `<p>` resté ouvert avant le bloc suivant ou en fin de texte ; `trimTruncatedBlocks` l'applique d'abord, ce qui sert la porte du premier jet, celle de la publication, la vérification des propositions d'enrichissement et le nettoyage du premier jet.
- [`reduce-section.md`](../../server/prompts/reduce-section.md) : les marqueurs « à sourcer » sont dans les règles absolues.

## Tests

- `tests/unit/routes/generate.routes.test.ts` : le plafond suit la taille de la section ; une réponse `max_tokens` → `error RESPONSE_TRUNCATED`, ni `chunk` ni `done`.
- `tests/unit/shared/content-repair.test.ts` : paragraphe jamais fermé avant le chapitre suivant (cas réel), marqueur coupé, paragraphes sains intacts.
- `tests/unit/shared/content-validators.test.ts` : `truncated-block` sur le cas réel.

## Hors périmètre (noté pour la suite)

- Le premier jet n°1 se terminait par `</html>` puis « ## Notes pour la passe d'enrichissement » : le nettoyage ne retire pas ce qui suit la fermeture du document (la porte le bloque).
- « Section n/N » n'a pas été vu à l'écran pendant un premier jet réel.
