---
title: 'Epics — Refonte schéma keyword_metrics'
slug: epics-keyword-metrics-decomposition
version: 1.0.0
last_updated: 2026-05-09
status: proposed
related_nfr: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/tech-spec-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/stories-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/sprint-plan-keyword-metrics-decomposition.md
---

# Epics — Décomposition `keyword_metrics`

> Découpe macro du chantier en 4 epics ordonnés par dépendance. Chaque epic regroupe des stories (détails dans `stories-keyword-metrics-decomposition.md`).

---

## Epic A — Schéma & migration data

**Objectif** : poser les 4 nouvelles tables et migrer les données existantes sans perte.

**Pourquoi en premier** : tout ce qui suit dépend du schéma cible. Et la migration data doit être **idempotente** pour permettre des relances sans drift.

**Couvre AC** : AC.SCHEMA.1, AC.SCHEMA.2.

**Stories** :
- Story A1 — Migration SQL `015_keyword_metrics_decomposition.sql` (CREATE TABLE × 4 + index).
- Story A2 — Script de backfill `backfill-keyword-serp.ts` idempotent + tests d'intégrité.

**Definition of Done** :
- Les 4 tables existent en local et sont vides initialement.
- Le backfill exécuté sur les 7 lignes `serp_raw_json` actuelles produit les bons comptages (`COUNT(*)` `keyword_serp_results` = somme des `competitors.length` JSONB).
- Le backfill est rejouable sans doublons (idempotent via `ON CONFLICT DO NOTHING` sur les PK composite).

---

## Epic B — Couche service `keyword-serp.service.ts` + dual-write

**Objectif** : exposer une API CRUD pour les 4 nouvelles tables, et faire en sorte que tout nouveau scan SERP écrive dans les nouvelles tables ET dans la legacy `serp_raw_json` pendant la phase de bascule.

**Pourquoi avant les consommateurs** : il faut que les nouvelles tables soient peuplées en continu par le code qui tourne, sinon la bascule des consommateurs verrait des données stales.

**Couvre AC** : aucune AC NFR directement, mais prérequis structurel à AC.SCHEMA.3.

**Stories** :
- Story B1 — Création `keyword-serp.service.ts` avec API getters/upserts + tests unitaires (TDD strict).
- Story B2 — Dual-write dans `serp-analysis.service.ts` : `analyzeSerpCompetitors` écrit dans les 4 nouvelles tables ET conserve `upsertKeywordSerp` (transaction).

**Definition of Done** :
- `keyword-serp.service.ts` couvert par tests unit (Vitest) avec mocks `query()`.
- Header `AUTHORITY:` posé.
- Après un `POST /api/serp/analyze` sur un keyword frais, les nouvelles tables ET `serp_raw_json` contiennent les mêmes URLs (test d'intégration).

---

## Epic C — Bascule des consommateurs (lectures)

**Objectif** : un par un, faire migrer les 6 consommateurs identifiés vers les nouvelles tables.

**Pourquoi un par un** : limite le blast radius. Chaque story est mergeable indépendamment et activable derrière un test ciblé. La bascule du cache check (route `/serp/analyze`) doit rester en cohérence avec le dual-write (Epic B).

**Couvre AC** : AC.SCHEMA.3 (et AC.SCHEMA.4 mesurable une fois Epic C complet).

**Stories** :
- Story C1 — Bascule **TF-IDF Lexique** (`tfidf.service.ts` + route `/serp/tfidf`) → lit `keyword_serp_scrapes`.
- Story C2 — Bascule **cache check `/serp/analyze`** → lit `keyword_serp_results` (NFR-INT-SERP-ONCE preserved).
- Story C3 — Bascule **brief Capitaine** (`keyword-queries.service.ts` + `dataforseo/brief.ts`) → lit `keyword_serp_results` (URLs only).
- Story C4 — **Stop dual-write** : retirer écriture `serp_raw_json` dans `serp-analysis.service.ts` + retrait `serpRawJson` du type `KeywordMetrics` + mise à jour mocks de tests.

**Definition of Done de l'epic** :
- `grep -r "serpRawJson\|serp_raw_json" src/ server/ shared/` ne renvoie plus aucune occurrence en code (sauf migration SQL et docs historiques).
- Les 5 fichiers de tests (mocks `serp_raw_json`) ont été migrés ou marqués obsolètes.
- Endpoint `/serp/analyze` et `/serp/tfidf` gardent leurs contrats (codes HTTP, format `{ data: T }`).
- NFR-INT-SERP-ONCE vert : test d'intégration multi-article même keyword → 1 seul fetch externe.

---

## Epic D — Validation perf + clôture

**Objectif** : prouver le gain perf attendu (AC.SCHEMA.4), mettre à jour les docs, archiver les artefacts BMAD.

**Pourquoi à la fin** : besoin que la bascule complète soit faite pour mesurer le bon delta.

**Couvre AC** : AC.SCHEMA.4 + clôture documentaire.

**Stories** :
- Story D1 — Bench : SELECT brief Capitaine avant/après (chronométré sur DB locale, 1821 lignes).
- Story D2 — Mise à jour docs : `keyword-metrics.md`, `lieutenants.md`, `lexique.md`, `prd.md` (statut NFR `proposed → active`).
- Story D3 — Archivage tech-specs livrés + sprint-status update.

**Definition of Done** :
- `tech-spec-keyword-metrics-decomposition.md` déplacée dans `_archive/` avec bandeau ARCHIVED.
- PRD §8.3.bis : NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION passe `Statut: active`, `Depuis: 2026-05-XX`.
- Bench documenté : taille moyenne SELECT brief Capitaine (KB) avant vs après.
- `sprint-status.yaml` mis à jour.

---

## Hors scope (post-stabilisation)

**Epic E (différé ≥ 2 semaines après stabilisation)** :
- Story E1 — Migration SQL `016_drop_serp_raw_json.sql` : `ALTER TABLE keyword_metrics DROP COLUMN serp_raw_json` (AC.SCHEMA.5).
- Critère d'activation : 14 jours sans incident sur les nouvelles tables, observabilité confirmée (logs warn → 0).

---

## Vue séquentielle

```
Epic A (schéma + backfill)
   │
   ▼
Epic B (service + dual-write)
   │
   ▼
Epic C (basculer consommateurs : C1 → C2 → C3 → C4)
   │
   ▼
Epic D (perf + docs + clôture)
   │
   ▼
[Epic E hors scope, différé]
```
