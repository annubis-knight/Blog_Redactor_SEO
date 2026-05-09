---
title: 'Sprint Plan — Refonte schéma keyword_metrics'
slug: sprint-plan-keyword-metrics-decomposition
version: 1.0.0
last_updated: 2026-05-09
status: proposed
related_nfr: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/tech-spec-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/epics-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/stories-keyword-metrics-decomposition.md
---

# Sprint Plan — Décomposition `keyword_metrics`

> Ordonnancement séquentiel des 11 stories, avec checkpoints de validation et règles de merge.

---

## Cadrage

- **Durée** : 1 sprint de 2 semaines (10 jours ouvrés).
- **Charge estimée** : ~9 jours-personne (cf. récap stories). Marge ~10 % pour imprévus.
- **Contexte** : projet solo, pas de blocage par revue externe.
- **Branche racine** : `refactor/keyword-metrics-decomposition` (chantier global). Chaque story = sous-branche dérivée puis rebase + merge dans la branche racine, qui est mergée dans `main` à la fin du sprint.
- **Modèle alternatif (recommandé pour solo)** : 1 branche par story directement issue de `main`, mergée dès passage Phase 5+6 (CLAUDE.md §11.2). Permet des releases progressives et limite les conflits. **C'est ce modèle qu'on suit ci-dessous.**

---

## Ordre des stories

Ordonnancement strict par dépendance technique. Aucune story ne peut commencer avant que ses dépendances soient mergées dans `main`.

| # | Story | Branche | Dépend de | Estimation | Jour cible |
|---|---|---|---|---|---|
| 1 | **A1** Migration SQL | `feat/keyword-serp-tables-schema` | — | 0.5j | J1 (matin) |
| 2 | **A2** Script backfill | `feat/keyword-serp-backfill-script` | A1 | 1.0j | J1 (après-midi) → J2 |
| 3 | **B1** Service `keyword-serp` | `feat/keyword-serp-service` | A1 (table existe) | 1.0j | J3 |
| 4 | **B2** Dual-write `analyzeSerpCompetitors` | `refactor/serp-analysis-dual-write` | B1, A2 (backfill ok) | 1.0j | J4 |
| 5 | **C1** Bascule TF-IDF Lexique | `refactor/tfidf-from-keyword-serp-scrapes` | B1, B2 | 1.0j | J5 |
| 6 | **C2** Bascule cache check `/serp/analyze` | `refactor/serp-analyze-cache-from-tables` | B1, B2 | 1.5j | J6 → J7 (matin) |
| 7 | **C3** Bascule brief Capitaine | `refactor/capitaine-brief-from-serp-results` | B1 | 0.5j | J7 (après-midi) |
| 8 | **C4** Stop dual-write + retrait type | `refactor/drop-serp-raw-json-dual-write` | C1, C2, C3 | 1.0j | J8 |
| 9 | **D1** Bench perf | `chore/bench-keyword-metrics-payload` | C4 | 0.5j | J9 (matin) |
| 10 | **D2** Docs + NFR active | `docs/keyword-metrics-decomposition` | C4 | 0.5j | J9 (après-midi) |
| 11 | **D3** Archivage + sprint-status | `chore/archive-keyword-metrics-decomposition` | D2 | 0.25j | J10 (matin) |

**Buffer** : J10 (après-midi) pour imprévus, ré-runs `npm run check:health`, ajustements feedback.

---

## Diagramme de dépendances

```
A1 ──► A2
 │       │
 ▼       ▼
B1 ──► B2 ──┬──► C1 ──┐
 │           │         │
 │           ├──► C2 ──┤
 │                     │
 └──► C3 ─────────────┤
                       ▼
                       C4 ──► D1
                              D2 ──► D3
```

---

## Checkpoints de validation par story

À chaque fin de story, **avant merge dans `main`** :

```
Self-review CLAUDE.md §5  →  npm run lint           ✅
                              npm run type-check     ✅
                              npm run test:unit      ✅
                              npm run test:browser   (si UI touchée — ici jamais)
                              npm run check:dead     ✅
                              npm run check:cycles   ✅
                              npm run build          ✅ (avant tout merge significatif)
```

Pour les stories qui touchent la DB (A1, A2, B2, C2) : test d'intégration sur DB locale obligatoire.

---

## Stratégie de merge

**Modèle 1-branche-par-story, merge progressif dans `main`** (CLAUDE.md §11.2) :

1. Pour chaque story i : `git checkout -b <type>/<sujet> origin/main`.
2. TDD strict (Red/Green/Refactor) côté services backend (cf. CLAUDE.md §2.1).
3. Self-review §5 + validation §6 verts.
4. Commit (pas d'`--amend`), push, merge no-ff dans `main` (ou fast-forward si propre), suppression branche locale + remote.
5. Pull `origin/main`, repartir pour story i+1.

**Pourquoi pas branche racine longue durée** : risque de conflits cumulés entre stories qui touchent les mêmes fichiers (`serp-analysis.routes.ts` est touché par C2 ET C4 ; `serp-analysis.service.ts` par B2 et C4 ; `keyword-metrics.service.ts` par C4 et D2).

---

## Garde-fous transversaux

### G1 — Cohérence dual-write (entre B2 et C4)

Pendant la fenêtre B2 → C4 (jours 4 à 8), **les deux paths d'écriture coexistent**. Risque : drift.
- **Mesure** : sur DB locale, après chaque scan SERP (test ou manuel), vérifier `competitors[].url` dans `serp_raw_json` == `getSerpResults().map(r => r.url)`.
- **Si drift détecté** : revert à la story qui l'a introduit, root-cause, fix.

### G2 — NFR-INT-SERP-ONCE (multi-article même keyword, single fetch)

Cet invariant cross-cutting **ne doit pas régresser** durant tout le sprint.
- **Mesure** : test d'intégration multi-article (existe déjà cf. `tests/unit/coherence/lieutenants.test.ts:44`) doit rester vert à chaque story.

### G3 — Contrats endpoints publics

Les endpoints `/serp/analyze` et `/serp/tfidf` gardent leurs contrats (codes HTTP, format `{ data: T }`, messages d'erreur exacts).
- **Mesure** : tests de contrat existants restent verts. Si un message change (ex: TF-IDF "Lancez d'abord l'analyse SERP" est conservé verbatim), le test garantit l'invariant.

### G4 — Pas de regression mémoire / type

Le retrait de `serpRawJson` du type `KeywordMetrics` (Story C4) **doit casser à la compilation** tout consommateur oublié. C'est volontaire — `npm run type-check` est le filet de sécurité ultime.

---

## Critère de clôture du sprint

Le sprint est **terminé** quand :
- ✅ Toutes les stories A, B, C, D sont mergées dans `main`.
- ✅ `grep -r "serpRawJson\|upsertKeywordSerp" src/ server/ shared/` retourne 0 occurrence.
- ✅ `npm run check:health` vert sur `main`.
- ✅ NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION dans le PRD : statut `active`, depuis `2026-05-XX`.
- ✅ Tech-spec, epics, stories, sprint-plan archivés dans `_archive/` avec bandeau ARCHIVED.
- ✅ `_bmad-output/implementation-artifacts/sprint-status.yaml` à jour.
- ⚪ Story E1 (drop colonne `serp_raw_json`) **différée** dans le backlog avec note "déclenchable à partir de 2026-05-XX + 14 jours si zéro warn log lié à `serp_raw_json`".

---

## Risques sprint-level

| Risque | Probabilité | Mitigation |
|---|---|---|
| Bug subtil dans la reconstruction `SerpAnalysisResult` (Story C2) qui ne casse pas les tests mais altère le brief Capitaine | Moyen | Test snapshot par fixture (AC.C2.4) ; bench output Capitaine avant/après. |
| `npm run test:unit` lent à cause des nouvelles intégrations DB | Faible | Tests d'intégration tagués → optionnel pour le run par défaut. |
| Backfill A2 plante sur un payload exotique non vu en local | Faible (7 rows seulement) | AC.A2.7 : log warn + skip ; ajouter une review manuelle de chaque ligne loguée. |
| Stories qui touchent les mêmes fichiers (C2 et C4 sur `serp-analysis.routes.ts`) génèrent conflits | Moyen | Ordonnancement strict ; rebase systématique avant push. |
| Décalage si parallélisation accidentelle de stories non commutatives | Élevé en équipe, faible en solo | Solo : on ne lance que la story du jour. |

---

## Post-sprint (différé, hors scope)

**Story E1 — Drop `serp_raw_json`** (AC.SCHEMA.5, déclenchable ≥ 2 semaines après merge sprint si stable) :
- Migration `016_drop_serp_raw_json.sql` : `ALTER TABLE keyword_metrics DROP COLUMN serp_raw_json;`
- Critères d'activation :
  - 14 jours en prod sans incident lié aux nouvelles tables.
  - Aucun log warn `legacy serp_raw_json fallback` dans les 14 derniers jours (instrumenté pendant Story C2/C4 si besoin).
  - PR séparée, taggée `[FOLLOW-UP]`, branche `chore/drop-serp-raw-json-column`.
- Estimation : XS (≤ ½ journée).
