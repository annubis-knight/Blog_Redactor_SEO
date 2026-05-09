---
title: 'Sprint Plan — Découplage Lieutenants/Lexique + scrape-corpus neutre'
slug: sprint-plan-decouplage-lieutenants-lexique
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
  - _bmad-output/planning-artifacts/epics-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/stories-decouplage-lieutenants-lexique.md
---

# Sprint Plan — Découplage Lieutenants/Lexique + `scrape-corpus`

> Ordonnancement séquentiel des 11 stories, avec checkpoints de validation et règles de merge.

---

## Cadrage

- **Durée** : 1 sprint de 2 semaines (10 jours ouvrés).
- **Charge estimée** : ~9 jours-personne (cf. récap stories). Marge ~10 % pour imprévus.
- **Contexte** : projet solo, pas de blocage par revue externe.
- **Branche unique** : `feat/decouplage-lieutenants-lexique` créée depuis `origin/main` au démarrage. Toutes les stories y sont commitées séquentiellement (1 commit Conventional Commits par story). Merge dans `main` UNE FOIS à la fin du sprint, après Story D3 validée. Cf. §"Stratégie de merge" plus bas.
- **Prérequis bloquant** : ✅ chantier 1 (`sprint-keyword-metrics-decomposition: done`, [sprint-status.yaml:68](../implementation-artifacts/sprint-status.yaml#L68)) et drop colonne `serp_raw_json` (commit `b193997`). Aucun stub temporaire nécessaire.

---

## Ordre des stories

Ordonnancement strict par dépendance technique.

| # | Story | Préfixe commit | Dépend de | Estimation | Jour cible |
|---|---|---|---|---|---|
| 1 | **A1** Création `scrape-corpus.service` | `feat(scrape):` | — | 1.0j | J1 |
| 2 | **A2** Tests intégration + grep `scrape-corpus` | `test(scrape):` | A1 | 1.0j | J2 |
| 3 | **B1** Création `lieutenants-analysis.service` | `feat(lieutenants):` | A1 (consomme `scrape-corpus`) | 1.0j | J3 |
| 4 | **B2** Création `lexique-analysis.service` | `feat(lexique):` | A1 (consomme `scrape-corpus`) | 1.0j | J4 |
| 5 | **B3** Tests architecturaux croisés | `test(arch):` | A1, B1, B2 | 0.5j | J5 (matin) |
| 6 | **C1** Bascule route `/serp/analyze` | `refactor(serp):` | B1 | 1.0j | J5 (après-midi) → J6 |
| 7 | **C2** Bascule route `/serp/tfidf` | `refactor(lexique):` | B2 | 0.5j | J7 (matin) |
| 8 | **C3** Suppression `analyzeSerpCompetitors` + cleanup tests | `refactor(serp):` | C1, C2 | 1.0j | J7 (après-midi) → J8 |
| 9 | **D1** Tests intégration AC.DECOUPLAGE | `test(decouplage):` | C3 | 1.0j | J9 |
| 10 | **D2** Docs + FR/NFR active | `docs(prd):` | C3 | 0.5j | J10 (matin) |
| 11 | **D3** Archivage + sprint-status | `chore(plan):` | D2 | 0.25j | J10 (après-midi) |

**Buffer** : J10 (fin) pour imprévus, ré-runs `npm run check:health`, ajustements feedback.

---

## Diagramme de dépendances

```
A1 ──► A2
 │
 ├──► B1 ──┐
 │         │
 ├──► B2 ──┼──► B3
 │         │
 │         ├──► C1 ──┐
 │         │         │
 │         └──► C2 ──┴──► C3 ──► D1
 │                              D2 ──► D3
 │
 └─ (A1 est le seul prérequis structurel ; A2 est verticalement parallélisable
    en pratique, mais on reste sur l'ordre A1 → A2 → B* pour simplicité solo)
```

---

## Checkpoints de validation par story

À chaque fin de story, **avant commit** :

```
Self-review CLAUDE.md §5  →  npm run lint           ✅
                              npm run type-check     ✅
                              npm run test:unit      ✅
                              npm run test:check     ✅ (diff vs baseline)
                              npm run check:dead     ✅
                              npm run check:cycles   ✅
                              npm run check:arch     ✅ (dependency-cruiser)
                              npm run build          ✅ (avant tout merge significatif)
```

**Cette refonte est purement backend** — pas de `npm run test:browser` requis (UI inchangée).

**Pour les stories qui touchent la DB** (A1, A2, D1) : test d'intégration sur DB locale obligatoire.

**Pour Story C1 spécifiquement** : exécuter manuellement le scénario UI Lieutenants (article test → onglet Lieutenants → "Analyser SERP") une fois après merge local pour confirmer qu'aucune régression visible n'est introduite. Ce n'est pas un test automatisé mais un smoke test obligatoire (charte CLAUDE.md "Pour UI ou frontend changes, start the dev server..." — ici l'UI ne change pas mais consomme la route basculée).

---

## Stratégie de merge

**Modèle branche-racine chantier** (identique au chantier 1) : une seule branche `feat/decouplage-lieutenants-lexique` créée depuis `origin/main`, sur laquelle toutes les stories sont commitées séquentiellement. Merge dans `main` UNE FOIS à la fin, après Story D3 validée et tous les checks verts.

1. **Au démarrage** : `git fetch origin && git checkout -b feat/decouplage-lieutenants-lexique origin/main` (une seule fois).
2. **Pour chaque story i** : implémentation TDD (Red/Green/Refactor), self-review §5, validation §6, **1 commit Conventional Commits sur la branche-racine** (pas de sous-branche, pas de merge intermédiaire).
3. **À la fin du sprint** : push final + merge dans `main` (`--no-ff` pour préserver l'historique du chantier) + suppression branche locale + remote (CLAUDE.md §11.2).

**Pourquoi pas 1 branche par story** : pour un chantier solo cohérent, ça pollue `main` avec 11 commits intermédiaires d'un chantier en cours, et complique le rollback. La branche-racine garde l'historique propre côté `main` (1 merge commit visible) et préservé côté chantier (11 commits atomiques dans la branche).

**Conflits** : aucun risque entre stories du même chantier sur la même branche — au contraire, ça expose les conflits potentiels en interne (ex: `serp-analysis.routes.ts` touché par C1 puis C2 puis C3) au lieu de les enterrer dans des merges successifs.

---

## Garde-fous transversaux

### G1 — `analyzeSerpCompetitors` deprecated wrapper pendant la fenêtre C1 → C3

Pendant la fenêtre C1 → C3 (jours 5 à 8), **le wrapper deprecated coexiste avec les nouveaux services**. Risque : drift entre wrapper et nouveau path.
- **Mesure** : test snapshot par fixture (AC.C1.1) garantit que `POST /api/serp/analyze` ancien path vs nouveau retourne le même JSON.
- **Mesure** : `log.warn 'analyzeSerpCompetitors deprecated wrapper, ...'` permet de tracer (en local et en prod) tout consommateur résiduel.
- **Si drift détecté** : revert C1, root-cause, fix.

### G2 — NFR-INT-SERP-ONCE (multi-article même keyword, single fetch)

Cet invariant cross-cutting **ne doit pas régresser** durant tout le sprint.
- **Mesure** : test d'intégration multi-article (existe déjà cf. `tests/unit/coherence/lieutenants.test.ts:44`) doit rester vert à chaque story.
- **Mesure renforcée** : Story D1 ajoute des tests AC.DECOUPLAGE.4 qui mesurent explicitement le mock count `fetchPageHtml` croisé.

### G3 — Contrats endpoints publics

Les endpoints `/serp/analyze` et `/serp/tfidf` gardent leurs contrats (codes HTTP, format `{ data: T }`, messages d'erreur exacts).
- **Mesure** : tests de contrat existants restent verts (story C1 et C2 touchent les routes mais préservent le contrat ; le 404 message TF-IDF est verbatim AC.C2.2).

### G4 — Pas de cross-import (test architectural permanent)

Le test architectural `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts` (créé en A2, étendu en B3) est **permanent** : reste après archivage du chantier comme régression contre toute réintroduction de couplage.
- **Mesure** : à chaque story de l'epic B+, ce test doit rester vert.

### G5 — Cache mémoire 1h ne masque pas une régression DB

Risque subtil : pendant le développement, le cache mémoire 1h pourrait masquer un bug d'écriture DB (le cache hit le fait passer alors que la DB est cassée).
- **Mesure** : Story A2 et D1 utilisent un mock qui contrôle explicitement le cache (`jest.useFakeTimers()` ou avancement manuel de `Date.now`) et alterne hit/miss pour exposer les deux paths.

### G6 — Cohérence avec chantier 3 (à venir)

Le chantier 3 va consommer ces services pour livrer FR-LEX-PRECHECK-SERP, FR-LEX-MULTI-KEYWORD-TABS. La signature de `lexique-analysis.analyzeLexique` (notamment le flag `triggerScrapeIfMissing`) est conçue pour ce besoin futur.
- **Mesure** : la signature `analyzeLexique(keyword, opts?: { ..., triggerScrapeIfMissing? })` reste stable. Si modifications nécessaires, les anticiper via une note dans le code en story B2 (commentaire `// chantier 3 utilisera triggerScrapeIfMissing=true derrière une confirmation UX`).

---

## Critère de clôture du sprint

Le sprint est **terminé** quand :
- ✅ Toutes les stories A, B, C, D sont mergées dans `main`.
- ✅ `grep -r "analyzeSerpCompetitors" src/ server/ shared/ tests/` retourne 0 occurrence.
- ✅ Tests architecturaux grep verts (no cross-import entre les 3 services).
- ✅ `npm run check:health` vert sur `main`.
- ✅ Les 4 FRs/NFRs dans le PRD ont `Statut: active` :
  - `NFR-MOT-LEXIQUE-DECOUPLAGE` (§8.3)
  - `FR-INFRA-SCRAPE-CORPUS-NEUTRE` (§8.14)
  - `FR-LIE-SCRAPE-DEDIE` (§8.7)
  - `FR-LEX-SCRAPE-DEDIE` (§8.8)
- ✅ Tech-spec, epics, stories, sprint-plan archivés dans `_archive/` avec bandeau ARCHIVED.
- ✅ `_bmad-output/implementation-artifacts/sprint-status.yaml` à jour.
- ✅ Test d'intégration `tests/integration/decouplage-lieutenants-lexique.test.ts` reste actif (AC.DECOUPLAGE.* verts) — pas archivé, c'est un filet de régression permanent.

---

## Risques sprint-level

| Risque | Probabilité | Mitigation |
|---|---|---|
| Bug subtil dans la reconstruction `SerpAnalysisResult` du wrapper deprecated (Story C1) qui ne casse pas les tests mais altère le payload Lieutenants | Moyen | Test snapshot par fixture (AC.C1.1) ; smoke test manuel UI Lieutenants après C1. |
| `npm run test:unit` lent à cause des nouveaux tests d'intégration DB | Faible | Tests d'intégration tagués → optionnel pour le run par défaut. Marquer `tests/integration/decouplage-*.test.ts` comme intégration explicite. |
| Tests architecturaux grep faux positif (ex: import légitime via barrel `index.ts`) | Moyen | Filtrage explicite dans le test (exclure types-only, exclure barrel re-exports). Si nécessaire, exclude-list commentée. |
| Stories qui touchent les mêmes fichiers (C1, C2, C3 sur `serp-analysis.routes.ts` et `serp-analysis.service.ts`) génèrent conflits | Moyen | Ordonnancement strict ; rebase systématique avant push. Sur branche-racine unique : conflits exposés en interne, pas de merge successifs. |
| Décalage si parallélisation accidentelle de stories non commutatives | Élevé en équipe, faible en solo | Solo : on ne lance que la story du jour. |
| Helpers `extractHeadings`/`extractTextContent` migrés vers `scrape-corpus` cassent les tests `tests/unit/services/serp-analysis.test.ts` qui les importent par leur ancien path | Moyen | Story C3 prévoit explicitement la migration de ces tests. Si A1 casse les tests legacy temporairement, accepter le rouge intermédiaire jusqu'à C3 (ou faire un re-export léger transitoire dans `serp-analysis.service.ts`). À trancher en A1. |
| Le cache mémoire 1h provoque un bug subtil en intégration (state partagé entre tests) | Moyen | Tests doivent reset le cache mémoire entre runs (export `__resetMemoryCacheForTests` ou hook `beforeEach`). À mentionner explicitement en A1. |

---

## Post-sprint (différé, hors scope)

- **Suppression de la route `POST /api/serp/tfidf`** (AC.LEX-SCRAPE.5 dit "conservée") — différée à un PR ultérieur, post-chantier 3, après livraison de l'UX pré-check (FR-LEX-PRECHECK-SERP).
- **Cache mémoire multi-process** (Redis / IPC) si le serveur passe un jour en multi-worker.
- **Helpers `extractHeadings`/`extractTextContent`** : décision finale en C3 sur leur localisation. Si maintenus dans `scrape-corpus.service.ts` (probable), aucune action post-sprint. Sinon (extraction dans `server/utils/html-parsing.ts`), story de suite.
