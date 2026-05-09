---
title: 'Epics — Découplage Lieutenants/Lexique + scrape-corpus neutre'
slug: epics-decouplage-lieutenants-lexique
version: 1.0.0
last_updated: 2026-05-09
status: in-progress
related_nfr: NFR-MOT-LEXIQUE-DECOUPLAGE
related_fr:
  - FR-INFRA-SCRAPE-CORPUS-NEUTRE
  - FR-LIE-SCRAPE-DEDIE
  - FR-LEX-SCRAPE-DEDIE
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/tech-spec-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/stories-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/sprint-plan-decouplage-lieutenants-lexique.md
---

# Epics — Découplage Lieutenants/Lexique + `scrape-corpus`

> Découpe macro du chantier 2 en 4 epics ordonnés par dépendance. Chaque epic regroupe des stories (détails dans `stories-decouplage-lieutenants-lexique.md`).

---

## Epic A — Service neutre `scrape-corpus`

**Objectif** : extraire la responsabilité « fetch SERP DataForSEO + scrape HTTP + extraction `headings`/`textContent`/`isBlog` + persistance neutre + cache mémoire 1h » dans un service à responsabilité unique, sans aucune connaissance de Lieutenants ni de Lexique.

**Pourquoi en premier** : les 2 services métier (`lieutenants-analysis`, `lexique-analysis`) en dépendent. Aucun consommateur de production tant que A n'est pas livré → blast radius nul (code mort jusqu'à Epic C).

**Couvre AC PRD** : AC.SCRAPE.1, AC.SCRAPE.2, AC.SCRAPE.3, AC.SCRAPE.4, AC.SCRAPE.5 (FR-INFRA-SCRAPE-CORPUS-NEUTRE).

**Stories** :
- Story A1 — Création `server/services/external/scrape-corpus.service.ts` (API + cache mémoire 1h LRU + helpers extraits depuis `serp-analysis.service`).
- Story A2 — Tests unitaires (cache hit/miss, eviction LRU) + tests d'intégration (kw vierge = 10 fetchs ; 1 URL 404 = 9 OK ; cache hit = 0 fetch HTTP) + test architectural grep (no cross-import).

**Definition of Done** :
- `scrape-corpus.service.ts` exporte 4 fonctions publiques (`fetchAndPersist`, `getHeadings`, `getTextContent`, `getPaaQuestions`).
- Cache mémoire 1h fonctionnel (Map module-scoped + eviction LRU à 100 entrées).
- Header `AUTHORITY:` posé conforme au template tech-spec §2.5.
- Tests unitaires + intégration verts (mock count `fetchPageHtml` strict).
- Test architectural grep AC.SCRAPE.1 vert.
- Aucun consommateur de production encore branché (le service est dormant).

---

## Epic B — Services métier `lieutenants-analysis` + `lexique-analysis`

**Objectif** : créer les deux services métier qui consomment `scrape-corpus` chacun pour leur usage strict (`getHeadings` pour Lieutenants, `getTextContent` pour Lexique). Aucun import croisé.

**Pourquoi avant la bascule des routes** : les services doivent exister et être testés isolément avant qu'on les branche derrière les routes existantes. Sépare la création de la consommation.

**Couvre AC PRD** : AC.LIE-SCRAPE.1, AC.LIE-SCRAPE.2, AC.LIE-SCRAPE.3, AC.LIE-SCRAPE.4 (FR-LIE-SCRAPE-DEDIE) ; AC.LEX-SCRAPE.1, AC.LEX-SCRAPE.2, AC.LEX-SCRAPE.3, AC.LEX-SCRAPE.4 (FR-LEX-SCRAPE-DEDIE) ; AC.DECOUPLAGE.3 (NFR-MOT-LEXIQUE-DECOUPLAGE).

**Stories** :
- Story B1 — Création `server/services/keyword/lieutenants-analysis.service.ts` (`proposeLieutenants(keyword, articleLevel, opts?)`) + tests unitaires (mock `scrape-corpus` ; vérification que `textContent` n'est jamais lu).
- Story B2 — Création `server/services/keyword/lexique-analysis.service.ts` (`analyzeLexique(keyword, opts?)`) + tests unitaires (mock `scrape-corpus` ; vérification que `headings` n'est jamais lu ; message 404 verbatim conservé).
- Story B3 — Tests architecturaux croisés (un seul fichier `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts`) : vérifie zero cross-import entre les 3 services.

**Definition of Done de l'epic** :
- Les 2 services exposent leur API publique typée.
- Headers `AUTHORITY:` posés sur chacun (conformes templates tech-spec §2.5).
- Tests unitaires verts avec **mock count = 0** sur la lecture de la colonne interdite respective.
- Test architectural grep AC.LIE-SCRAPE.1 + AC.LEX-SCRAPE.1 + AC.DECOUPLAGE.3 vert.
- Aucun consommateur de production encore branché (services dormants — la bascule est en Epic C).

---

## Epic C — Bascule des routes + dépréciation `analyzeSerpCompetitors`

**Objectif** : faire basculer les 2 routes de production (`/serp/analyze` et `/serp/tfidf`) sur les nouveaux services métier. Supprimer définitivement `analyzeSerpCompetitors` une fois les deux routes basculées.

**Pourquoi un par un** : limite le blast radius. Chaque story est mergeable, testable et reversible indépendamment. La bascule de `/serp/analyze` est la plus risquée (NFR-INT-SERP-ONCE) — elle est testée avant celle de `/serp/tfidf`.

**Couvre AC PRD** : AC.LEX-SCRAPE.5 (route `/serp/tfidf` conservée) + invariants `fromCache` et NFR-INT-SERP-ONCE préservés.

**Stories** :
- Story C1 — Bascule route `POST /api/serp/analyze` → `lieutenants-analysis.proposeLieutenants`. `analyzeSerpCompetitors` devient un wrapper deprecated qui délègue (compat tests legacy + log warn). Test snapshot : ancien path vs nouveau retourne le même `SerpAnalysisResult`.
- Story C2 — Bascule route `POST /api/serp/tfidf` → `lexique-analysis.analyzeLexique`. Code 404 + message verbatim ("Lancez d'abord l'analyse SERP dans l'onglet Lieutenants") préservés.
- Story C3 — Suppression `analyzeSerpCompetitors` : le wrapper deprecated est supprimé ; les tests legacy (`tests/unit/services/serp-analysis.test.ts`, `tests/integration/serp-analyze-dual-write.test.ts`) sont **migrés** vers `scrape-corpus` ou supprimés s'ils ne testent plus rien d'utile (audit story C3). Helpers `extractHeadings`/`extractTextContent`/`fetchPageHtml`/`classifyIsBlog` migrés ou supprimés de `serp-analysis.service.ts`.

**Definition of Done de l'epic** :
- `grep -r "analyzeSerpCompetitors" src/ server/ shared/ tests/` retourne 0 occurrence (sauf logs git history).
- Routes `/serp/analyze` et `/serp/tfidf` répondent avec leurs contrats préservés (codes HTTP, messages d'erreur, format `{ data: T }`).
- NFR-INT-SERP-ONCE vert : test multi-article même keyword → 1 seul fetch externe.
- `npm run check:health` vert sur la branche.
- `serp-analysis.service.ts` est soit supprimé, soit réduit à des re-exports légers (à trancher en C3).

---

## Epic D — Validation découblage + clôture

**Objectif** : prouver le découplage par tests d'intégration NFR (kw vierges des deux côtés, cache partagé), mettre à jour les docs, archiver les artefacts BMAD.

**Pourquoi à la fin** : besoin que la bascule complète soit faite pour que les tests AC.DECOUPLAGE.* aient un sens. Avant Epic C, ils testeraient du code mort.

**Couvre AC PRD** : AC.DECOUPLAGE.1, AC.DECOUPLAGE.2, AC.DECOUPLAGE.4 (NFR-MOT-LEXIQUE-DECOUPLAGE).

**Stories** :
- Story D1 — Tests d'intégration AC.DECOUPLAGE.1/.2/.4 (un seul fichier `tests/integration/decouplage-lieutenants-lexique.test.ts`).
- Story D2 — Mise à jour docs : `docs/data-flows/lieutenants.md`, `docs/data-flows/lexique.md`, `docs/data-flows/keyword-metrics.md`. PRD : 3 FR (`FR-INFRA-SCRAPE-CORPUS-NEUTRE`, `FR-LIE-SCRAPE-DEDIE`, `FR-LEX-SCRAPE-DEDIE`) + 1 NFR (`NFR-MOT-LEXIQUE-DECOUPLAGE`) passent `Statut: proposed → active`.
- Story D3 — Archivage BMAD + sprint-status update.

**Definition of Done** :
- Tests d'intégration AC.DECOUPLAGE.* verts.
- PRD : les 4 FRs/NFRs ont `Statut: active`, `Depuis: 2026-05-XX`.
- 3 docs data-flows à jour (diagrammes Mermaid + tables d'autorité).
- 4 artefacts BMAD (`tech-spec-*`, `epics-*`, `stories-*`, `sprint-plan-*`) déplacés dans `_archive/` avec bandeau **ARCHIVED**.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` mis à jour.

---

## Vue séquentielle

```
Epic A (scrape-corpus neutre + tests)
   │
   ▼
Epic B (lieutenants-analysis + lexique-analysis + tests arch grep)
   │
   ▼
Epic C (bascule route /serp/analyze → /serp/tfidf → suppression analyzeSerpCompetitors)
   │
   ▼
Epic D (tests AC.DECOUPLAGE + docs + archivage)
```

---

## Hors scope (chantier 3 ou ultérieur)

- **FR-LEX-PRECHECK-SERP** (endpoint `GET /api/keywords/:keyword/serp/exists`) — chantier 3.
- **FR-LEX-MULTI-KEYWORD-TABS** (système d'onglets `lexique_explorations` dans `LexiquePanel.vue`) — chantier 3.
- **Suppression de la route `/serp/tfidf`** (AC.LEX-SCRAPE.5 dit explicitement "conservée") — différée à un PR ultérieur, post-chantier 3 si pertinent.
- **Cache mémoire multi-process** (Redis / IPC) si le serveur passe en multi-worker — story dédiée, pas dans le périmètre.
