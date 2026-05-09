---
title: 'Sprint Plan — Refonte schéma keyword_metrics'
slug: sprint-plan-keyword-metrics-decomposition
version: 1.1.0
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
- **Branche unique** : `feat/keyword-metrics-decomposition` créée depuis `origin/main` au démarrage. Toutes les stories y sont commitées séquentiellement (1 commit conventional commits par story). Merge dans `main` UNE FOIS à la fin du sprint, après Story D3 validée. Cf. §"Stratégie de merge" plus bas.

---

## Ordre des stories

Ordonnancement strict par dépendance technique. Toutes les stories sont commitées séquentiellement sur la branche unique `feat/keyword-metrics-decomposition`.

| # | Story | Préfixe commit | Dépend de | Estimation | Jour cible |
|---|---|---|---|---|---|
| 1 | **A1** DDL 4 tables + snapshot | `feat(db):` | — | 0.5j | J1 (matin) |
| 2 | **A2** Script backfill | `feat(db):` | A1 | 1.0j | J1 (après-midi) → J2 |
| 3 | **B1** Service `keyword-serp` | `feat(keyword):` | A1 (table existe) | 1.0j | J3 |
| 4 | **B2** Dual-write `analyzeSerpCompetitors` | `refactor(serp):` | B1, A2 (backfill ok) | 1.0j | J4 |
| 5 | **C1** Bascule TF-IDF Lexique | `refactor(lexique):` | B1, B2 | 1.0j | J5 |
| 6 | **C2** Bascule cache check `/serp/analyze` | `refactor(serp):` | B1, B2 | 1.5j | J6 → J7 (matin) |
| 7 | **C3** Bascule brief Capitaine | `refactor(capitaine):` | B1 | 0.5j | J7 (après-midi) |
| 8 | **C4** Stop dual-write + retrait type | `refactor(serp):` | C1, C2, C3 | 1.0j | J8 |
| 9 | **D1** Bench perf | `chore(bench):` | C4 | 0.5j | J9 (matin) |
| 10 | **D2** Docs + NFR active | `docs(prd):` | C4 | 0.5j | J9 (après-midi) |
| 11 | **D3** Archivage + sprint-status | `chore(plan):` | D2 | 0.25j | J10 (matin) |

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

**Pour Story A1 (DDL appliqué) en plus** :
```
npm run db:snapshot        # régénère server/db/schema.sql
npm run db:check           # vérifie empreinte DB ≡ snapshot — DOIT être vert
git diff server/db/schema.sql   # le diff doit contenir les 4 nouveaux CREATE TABLE
```
Le diff `schema.sql` est le livrable versionné. Aucun fichier `migrations/NNN_*.sql` n'est créé (cf. commit `01f705b` 2026-05-09).

---

## Stratégie de merge

**Modèle branche-racine chantier** : une seule branche `feat/keyword-metrics-decomposition` créée depuis `origin/main`, sur laquelle toutes les stories sont commitées séquentiellement. Merge dans `main` UNE FOIS à la fin, après Story D3 validée et tous les checks verts.

1. **Au démarrage** : `git fetch origin && git checkout -b feat/keyword-metrics-decomposition origin/main` (une seule fois).
2. **Pour chaque story i** : implémentation TDD (Red/Green/Refactor), self-review §5, validation §6, **1 commit conventional commits sur la branche-racine** (pas de sous-branche, pas de merge intermédiaire).
3. **À la fin du sprint** : push final + merge dans `main` (no-ff pour préserver l'historique du chantier) + suppression branche locale + remote (CLAUDE.md §11.2).

**Pourquoi pas 1 branche par story** : pour un chantier solo cohérent, ça pollue `main` avec 11 commits intermédiaires d'un chantier en cours, et complique le rollback (impossible de revert "le chantier" en une seule opération). La branche-racine garde l'historique propre côté `main` (1 merge commit visible) et préservé côté chantier (11 commits atomiques dans la branche).

**Conflits** : aucun risque entre stories du même chantier sur la même branche — au contraire, ça expose les conflits potentiels en interne (ex: `serp-analysis.routes.ts` touché par C2 puis C4) au lieu de les enterrer dans des merges successifs.

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
- `ALTER TABLE keyword_metrics DROP COLUMN serp_raw_json;` appliqué directement à la DB locale (via `psql` ou script jetable `scripts/drop-serp-raw-json.ts`).
- `npm run db:snapshot` régénère `server/db/schema.sql`.
- `npm run db:check` doit être vert.
- Commit du diff `schema.sql` (la colonne disparaît). **Pas de fichier `migrations/NNN_*.sql`**.
- Critères d'activation :
  - 14 jours sans incident lié aux nouvelles tables.
  - Aucun log warn `legacy serp_raw_json fallback` dans les 14 derniers jours (instrumenté pendant Story C2/C4 si besoin).
  - PR séparée, taggée `[FOLLOW-UP]`, branche `chore/drop-serp-raw-json-column`.
- Estimation : XS (≤ ½ journée).
