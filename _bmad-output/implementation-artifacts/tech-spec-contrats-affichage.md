---
name: tech-spec-contrats-affichage
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-09-22
synced_with:
  - _bmad-output/planning-artifacts/prd.md (NFR-INT-DISPLAY-CONTRACTS nouveau ; FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-SCORING-NULLSAFE, NFR-INT-ZOD-VALIDATION)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-INT-DISPLAY-CONTRACTS)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (entrée contrats-affichage)
  - docs/contrats-affichage-moteur.md (inventaire visuel des composants et de leurs contrats)
---

# Tech-spec — Contrats d'affichage (temps « mise en format » de la grille en 8 temps)

## Contexte

Entre la réponse brute d'une source (IA, DataForSEO, Google, calcul, base) et
l'écran, rien ne vérifie la forme de la donnée :

- `src/services/api.service.ts` renvoie `json.data as T` : un cast, pas un contrôle.
- `classifyWithTool` renvoie `toolBlock.input as T` ; les panneaux IA en flux
  réparent le JSON puis ne vérifient presque rien.
- DataForSEO : `status_code` vérifié, puis lecture des champs par `?.` et défauts.

Conséquence majeure : **« absent » devient « 0 »**, et le 0 ment. Exemples mesurés :

- `keyword-scan.routes.ts:176-180` : `rawVolume ?? 0` → KD inconnu affiché « KD 0 » vert.
- `shared/kpi-scoring.ts:61` : un KPI `null` ressort `rawValue: 0`, puis `computeVerdict`
  (`:120-123`) produit un **NO-GO « Aucun signal détecté »** — viole
  FR-INFRA-KPI-SCORING-NULLSAFE (« sans donnée → GRAY, pas négatif »).
- `useExploredKeywords.ts:39-59` : `?? 0` sur volume/KD/CPC → « 0 » au lieu de « — ».
- Rechargement ≠ premier chargement : PAA toujours 0 (`data.service.ts:855`),
  autocomplétion « Non trouvé » (live) vs « — » (rechargement).

Et un désordre de formes : 6 types concurrents pour une « carte de mot-clé ».

## Objectif

Ajouter le temps **« mise en format »** de la grille en 8 temps : toute réponse
destinée à l'affichage passe par un **contrat d'affichage** qui la met dans la forme
attendue par ses composants, ou la refuse proprement. **Sécurité invisible** :
l'interface se comporte comme avant, sauf qu'une donnée absente s'affiche « — »
au lieu d'un faux chiffre, et qu'un verdict n'est plus inventé.

## Non-objectifs (volontairement hors chantier)

- Aucune refonte visuelle, aucun nouvel écran, aucun nouveau bouton.
- Pas de fusion des 6 types de carte : un **bloc KPI commun** contractualisé les
  unifie sur ce qui compte (valeurs nullables), la fusion complète reste un chantier à part.
- Pas de changement des seuils ni des formules de score.

## Architecture

```
source brute ──► [contrat serveur] ──► JSON ──► [contrat client] ──► store ──► composant
                                         ▲
base (relecture) ──► [contrat relecture] ┘
```

### `shared/contracts/` (nouveau)

| Fichier | Rôle |
|---|---|
| `core.ts` | `defineContract`, `parseContract`, `ContractViolationError`, rapporteur injectable, primitives tolérantes |
| `<famille>.contract.ts` | Un schéma Zod par famille de résultat, typé contre l'interface de `shared/types/` |
| `index.ts` | Point d'entrée unique |

**Primitives tolérantes** (la même valeur produit toujours la même sortie) :

- `kpiValue()` : nombre fini → nombre ; chaîne numérique (colonnes `NUMERIC` de pg) →
  nombre ; `null`/`undefined` → `null` ; `NaN`, `Infinity`, texte → `null` + signalement.
- `tolerantArray(item)` : garde les éléments conformes, écarte les autres avec
  signalement (une question PAA cassée ne fait pas tomber toute la carte).
- Champs de présentation (`label`, `color`) : valeur neutre de repli + signalement.

**Trois états honnêtes** : valeur, absente (`null` → « — »), en échec (même rendu
« — », info-bulle « donnée indisponible », signalé dans les journaux).

**Rapporteur** : `setContractReporter(fn)` — branché sur `log.warn` côté serveur
(`server/index.ts`) et côté client (`src/main.ts`). Invisible pour l'utilisateur.

**Refus** : si la réponse est inutilisable (pas d'objet, champ identifiant absent),
`parseContract` lève `ContractViolationError` ; le chemin d'erreur existant de
l'écran s'applique (aucun nouvel écran d'erreur).

### Les trois frontières

1. **Serveur**, juste avant `res.json` / l'événement SSE `done` des routes Moteur.
2. **Client**, dans le wrapper : `apiPost(path, body, { contract })`.
3. **Relecture depuis la base**, là où naissent la plupart des faux zéros.

## Familles et lots

| Lot | Famille | Contrat | Composants servis |
|---|---|---|---|
| 1 (pilote) | Scan du Capitaine | `captainScanContract`, `captainHistoryEntryContract` | `CaptainRadarList`, `CaptainSidePanel`, `CaptainVerdictPanel`, `VerdictBar`, `CaptainRootsSidebar` |
| 2 | Carte de mot-clé (Radar) | `radarScanResultContract` (bloc `keywordKpis` commun) | `DouleurScannerResults`, `RadarKeywordCard` et sous-parties, `RadarAiPanel` |
| 3 | Analyse SERP | `serpAnalysisContract` | `LieutenantSerpAnalysis`, `LieutenantH2Structure` (récurrence) |
| 4 | Lieutenants IA | `lieutenantProposalsContract`, `hnStructureContract` | `LieutenantProposals`, `LieutenantCard`, `LieutenantH2Structure` |
| 5 | Lexique | `tfidfResultContract`, `lexiqueRecommendationsContract` | `LexiqueTermsList`, `LexiqueAiPanel` |
| 6 | Discovery | `discoveryContract`, `discoveryAnalysisContract` | `DiscoverySourcesList`, `DiscoveryAnalysisResults` |
| 7 | Conseil IA (texte) | `aiAdviceContract` | `AiAdviceMarkdown`, `LieutenantsAiPanel` |
| 8 | Validateurs transverses | — | tous |

## Valideurs (règle « un valideur par correction »)

1. **Tests de contrat** : chaque contrat a ses fixtures bonne / mal formée / incomplète.
2. **« Absent n'est pas zéro »** : un KPI absent donne « — » et un verdict GRAY.
3. **Cliquet de frontière** : test qui compte les appels du front vers les routes
   Moteur sans contrat ; le compte ne peut que baisser (lancé par `npm run verify`).
4. **ESLint** : la règle anti-fallback voit aussi les chaînages optionnels
   (`kpi?.rawValue ?? 0`).
5. **Cohérence premier chargement / rechargement** : même verdict, mêmes KPI.

## Cartographie du pilote (CLAUDE.md §2.0)

| Axe | Constat |
|---|---|
| Producteurs | `POST /keywords/:kw/scan` (`keyword-scan.routes.ts`) ; relecture `getCaptainExplorations` (`data.service.ts:835-889`) ; `restoreFromHistory` (`useExploredKeywords.ts:362`) |
| Consommateurs | `hydrateCardFromValidation`, `validateRoots` (couleur du volume), `CaptainPanel` (`toKpiSummary`), `captain-trigger.store`, `CaptainVerdictPanel`/`VerdictBar` (label, couleur), robot (`moteur-valider.ts`, verdict) |
| Persistance | `keyword_metrics` (KPI bruts), `captain_explorations` (entrée), `paa_explorations` |
| Cas d'usage | clic sur un candidat, mot saisi à la main, racines, rechargement de l'onglet |
| Régressions | chantier KPI nullable du 2026-05-05 incomplet sur `KpiResult` |

## Critères d'acceptation

- AC1 — Un KPI sans donnée s'affiche « — » partout, au premier chargement comme au rechargement.
- AC2 — Un mot-clé sans aucune donnée (volume, PAA, autocomplétion absents) a un verdict GRAY, jamais NO-GO.
- AC3 — Un NO-GO « Aucun signal » n'apparaît que si les trois signaux sont réellement à 0.
- AC4 — Une réponse partiellement mal formée s'affiche quand même (éléments valides gardés), l'anomalie est journalisée.
- AC5 — Une réponse inutilisable emprunte le chemin d'erreur existant de l'écran.
- AC6 — Chaque route Moteur couverte applique son contrat côté serveur ; chaque appel front couvert applique le même côté client.
- AC7 — `npm run verify` vert, `test:check` sans nouveau rouge, comportement de l'interface inchangé hors « — ».

## Validation

`npm run verify` à chaque lot ; `npm run verify:full` (serveur éteint) en fin de chantier.

## Journal des lots

_(complété au fil de l'eau)_
