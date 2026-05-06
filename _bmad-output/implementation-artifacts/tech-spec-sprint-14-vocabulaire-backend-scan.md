---
name: Sprint 14 — Vocabulaire backend "validate" → "scan"
version: 2.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 14 : Vocabulaire backend "scan"

## 1. Contexte

Décision produit (Sprint 10.5 brainstorm) : harmoniser le vocabulaire pour distinguer
**recherche/exploration** (= `scan`) du **verrouillage/décision utilisateur** (= `lock`).

Avant Sprint 14, le mot "validate" était utilisé pour deux choses différentes :
1. La **recherche** (appel DataForSEO + calcul scoring) — c'est de la **recherche**.
2. Le **verrouillage** (décision utilisateur de figer un mot-clé) — c'est de la **décision**.

Sprint 11 a déjà aligné l'UI ("Verrouiller" au lieu de "Valider"). Sprint 14
finit le travail côté **vocabulaire backend** pour que `scan` désigne sans
ambiguïté la recherche.

Le Sprint 14 a été livré en **3 vagues** pour limiter le risque.

## 2. Vague A — Frontend (composable + fonction)

| Avant | Après |
|-------|-------|
| `useCapitaineValidation` (composable) | `useCapitaineScan` |
| `validateKeyword()` (fonction du composable) | `scanKeyword()` |
| `useCapitaineValidation.ts` (fichier) | `useCapitaineScan.ts` |
| `useCapitaineValidation.test.ts` | `useCapitaineScan.test.ts` |

23 fichiers consommateurs adaptés (composants Vue + tests + autres composables).

## 3. Vague B — Types partagés

| Avant | Après |
|-------|-------|
| `ValidateResponse` | `ScanResponse` |
| `ValidateVerdict` | `ScanVerdict` |
| `PaaQuestionValidate` | `PaaQuestionScan` |

19 fichiers consommateurs. Le fichier `shared/types/keyword-validate.types.ts`
**conserve son nom** (rayon trop large pour le renommer aussi, et le fichier
contient aussi `ArticleLevel`, `KpiResult`, `KpiColor`, `VerdictLevel` qui ne
sont pas spécifiques à "validate").

## 4. Vague C — Backend (service + route + URL HTTP)

| Avant | Après |
|-------|-------|
| `server/services/keyword/keyword-validate.service.ts` | `keyword-scan.service.ts` |
| `server/routes/keyword-validate.routes.ts` | `keyword-scan.routes.ts` |
| `import keywordValidateRoutes` (server/index.ts) | `import keywordScanRoutes` |
| URL HTTP `POST /api/keywords/:keyword/validate` | `POST /api/keywords/:keyword/scan` |
| `tests/unit/routes/keyword-validate.routes.test.ts` | `keyword-scan.routes.test.ts` |
| `tests/unit/services/keyword-validate.test.ts` | `keyword-scan.service.test.ts` |

10 fichiers consommateurs (3 frontend + 5 tests). 7 appels frontend `apiPost`
mis à jour pour pointer vers `/scan` au lieu de `/validate`.

**Préservé** : la route `POST /api/keywords/validate-pain` (validation de painPoint
côté Cerveau) reste inchangée — elle est sémantiquement différente (validation
d'un painPoint utilisateur, pas un scan de mot-clé).

## 5. FRs

### FR-API-VOCABULAIRE-SCAN (nouvelle)
Le vocabulaire **"scan"** désigne la recherche/exploration d'un mot-clé (appel
DataForSEO + calcul scoring) côté backend. Le vocabulaire **"validate"** est
réservé au cas spécifique de validation de painPoint utilisateur (Cerveau).
Les composants Capitaine consomment l'endpoint `POST /api/keywords/:keyword/scan`
qui retourne un `ScanResponse` typé.

**Critères d'acceptation testables** :
- Recherche grep `useCapitaineValidation` dans `src/`, `tests/` retourne 0 occurrence.
- Recherche grep `ValidateResponse|ValidateVerdict|PaaQuestionValidate` dans
  `src/`, `tests/`, `shared/`, `server/` retourne 0 occurrence.
- L'URL HTTP `/keywords/:keyword/validate` n'est plus exposée par le backend.
  Seul `/keywords/:keyword/scan` est actif.
- L'endpoint `/keywords/validate-pain` (validation painPoint) reste fonctionnel.
- Tests existants passent sans modification de logique.

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-14-vocabulaire-backend-scan.

## 6. Validation

- `npm run type-check` ✅
- `npm run test:unit` : **3983 tests verts** (2 sanity E2E pré-existants requièrent serveur dev).
- `npm run build` : 10.13s ✅
- `npm run check:dead` : aucun nouveau code mort.

## 7. Hors-scope (à long terme)

- Le fichier `shared/types/keyword-validate.types.ts` conserve son nom car il
  contient aussi des types non spécifiques à "validate" (`ArticleLevel`,
  `KpiResult`, etc.). Renommage possible dans un sprint dédié futur si le
  fichier est restructuré.
- Le service `keyword-validate-pain.routes.ts` (validation painPoint) n'est
  pas concerné — la sémantique "validate" est juste pour ce cas-là.
