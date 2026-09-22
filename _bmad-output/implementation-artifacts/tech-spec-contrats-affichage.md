---
name: tech-spec-contrats-affichage
type: tech-spec
status: done
version: 1.0.0
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
| `core.ts` | `defineContract`, `parseContract`, `parseContractList`, `ContractViolationError`, rapporteur injectable, primitives tolérantes |
| `score-blocks.ts` | Blocs Score marché / Pertinence partagés par plusieurs familles |
| `<famille>.contract.ts` | Un schéma Zod par famille de résultat, typé contre l'interface de `shared/types/` |

Pas de fichier `index.ts` : chaque appelant importe le contrat de sa famille
(seuls les contrats utilisés sont exportés — `npm run check:dead` au niveau de `main`).

**Primitives tolérantes** (la même valeur produit toujours la même sortie) :

- `kpiValue()` : nombre fini → nombre ; chaîne numérique (colonnes `NUMERIC` de pg) →
  nombre ; `null`/`undefined` → `null` ; `NaN`, `Infinity`, texte → `null` + signalement.
- `tolerantArray(item)` : garde les éléments conformes, écarte les autres avec
  signalement (une question PAA cassée ne fait pas tomber toute la carte).
- `requiredList(item)` : idem, mais la liste est obligatoire (sortie d'IA sans la
  liste demandée → refus, donc message d'erreur et « Relancer »).
- Champs de présentation (`label`, `color`) : valeur neutre de repli + signalement.

**Trois états honnêtes** : valeur, absente (`null` → « — »), en échec (même rendu
« — », signalé dans les journaux ; aucune info-bulle ajoutée, pour ne rien changer
à l'interface).

**Rapporteur** : `setContractReporter(fn)` — branché sur `log.warn` côté serveur
(`server/index.ts`) et côté client (`src/main.ts`). Invisible pour l'utilisateur.

**Refus** : si la réponse est inutilisable (pas d'objet, champ identifiant absent),
`parseContract` lève `ContractViolationError` ; le chemin d'erreur existant de
l'écran s'applique (aucun nouvel écran d'erreur). Message affiché : « Réponse reçue
dans un format inattendu (contrat « x ») — relancez l'action. » ; le détail des
écarts part dans le journal. Pour un flux SSE, `apiStream` applique le contrat à
l'événement `done` : refus → `onError` (même chemin qu'un `event: error`), pas `onDone`.

### Les trois frontières

1. **Serveur**, juste avant `res.json`, ou dans le `parser` de `runAiPanelStream`
   (avant sauvegarde et avant l'événement SSE `done`).
2. **Client**, dans le wrapper : `apiPost(path, body, { contract })`, et
   `startStream(url, body, callbacks, { contract })` pour les flux SSE.
3. **Relecture depuis la base** (`parseContract(…, 'db')`), là où naissent la plupart des faux zéros.

## Familles et lots

| Lot | Famille | Contrats (nom journalisé) | Composants servis |
|---|---|---|---|
| 1 (pilote) | Scan du Capitaine | `captainScanContract` (`captain-scan`), `captainScanEntryContract` (`captain-history`), `articleKeywordsContract` (`article-keywords`), `paaJudgmentBlockContract` / `captainPaaJudgeContract` | `CaptainRadarList`, `CaptainSidePanel`, `CaptainVerdictPanel`, `VerdictBar`, `CaptainRootsSidebar`, `ScoreRing` |
| 2 | Radar | `radarScanResultContract` (`radar-scan`), `radarGenerateContract`, `radarExplorationContract`, `longTailSuggestionsContract` | `DouleurScannerResults`, `RadarKeywordCard` et sous-parties, `RadarAiPanel`, `RadarThermometer` |
| 3 | Analyse SERP, TF-IDF | `serpAnalysisContract` (`serp-analysis`), `tfidfResultContract` (`tfidf`) | `LieutenantSerpAnalysis`, `LieutenantH2Structure` (récurrence), `LexiqueTermsList` |
| 4 | Lieutenants IA, plan Hn | `proposeLieutenantsAiContract` (serveur), `proposeLieutenantsContract`, `hnOutlineContract` (`ai-hn-structure`) | `LieutenantProposals`, `LieutenantCard`, `LieutenantH2Structure` |
| 5 | Lexique IA, explorations relues | `lexiqueAnalysisContract` (`lexique-ai`), `articleExplorationsContract` (`explorations`) | `LexiqueTermsList`, `LexiqueAiPanel`, onglets Lexique, thermomètre Radar relu |
| 6 | Découverte | `suggestAllContract`, `keywordDiscoveryContract`, `domainDiscoveryContract`, `discoveryAnalysisContract`, `relevanceScoreContract`, `discoveryCacheEntryContract` | `DiscoverySourcesList`, `DiscoveryAnalysisResults`, `DiscoveryWordGroupsSidebar`, filtre de pertinence |
| 7 | Conseil IA (texte) | `aiAdviceContract` (serveur), `aiAdviceDoneContract` (client), `adviceMarkdown()` (affichage) | `AiAdviceMarkdown` (panneau manuel et carrousel du Capitaine) |
| 8 | Compléments (repérés par l'inventaire) | `radarKeywordAddedContract`, `radarKeywordsBatchContract`, `radarKeywordRemovedContract`, `wordGroupsContract`, `discoveryCacheStatusContract`, `serpExistsContract` | liste d'attente du Radar, `DiscoveryWordGroupsSidebar`, barre de cache, pré-contrôle du Lexique |
| — | Validateurs transverses | cliquet, ESLint, tests « absent n'est pas zéro » | tous |

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

| Commit | Lot | Ce qui change pour l'utilisateur (hors « — » à la place d'un faux chiffre) |
|---|---|---|
| `5790a4d` | 1 — Capitaine | Plus de NO-GO « Aucun signal » inventé ; « KD 0 » vert disparu ; rechargement = premier chargement (PAA, autocomplétion, intention) ; moyenne des racines sans faux zéros. |
| `c35642f` | 2 — Radar | Thermomètre « En attente — » au lieu de « froide 0 » ; classement sans zéros d'absence ; plus de « Score null/100 » dans les info-bulles. |
| `4c7d8e2` | 3 — SERP, TF-IDF | Une page concurrente illisible relue en base est marquée « ! » et sort de la récurrence des titres (100 % au lieu de 50 %). |
| `2eacc91` | 4 — Lieutenants IA | Score IA absent → « — » (carte du panier, ancienne liste) ; niveau « H3 » lu ; doublons écartés ; éliminés sans score en bas du tri décroissant ; `apiStream` accepte un contrat et journalise les erreurs de callback au lieu de les avaler. |
| `d31955d` | 5 — Lexique IA, explorations | Analyse IA sans recommandations → message + « Relancer » (au lieu d'un écran figé) ; décision illisible → terme sans badge ; ancien scan Radar sans score → « En attente — ». |
| `ced3c1b` | — | 19 exports inutilisés rendus internes (code mort au niveau de `main`). |
| `b1a2ebe` | — | La règle ESLint anti « `?? 0` » voit le chaînage optionnel ; 3 cas justifiés annotés. |
| `ea323d2` | 6 — Découverte | KPI absents « — » au premier chargement comme depuis le cache ; **correctif** : la sauvegarde du cache refusait un KPI `null` (400 silencieux) → Découverte relancée et refacturée au retour sur la graine. |
| `79a2c3e` | 7 — Conseil IA | Conseil vide → erreur + « Régénérer » (au lieu d'un panneau blanc) ; emballage « ```markdown » retiré à l'affichage. |
| `d78e4c6` | 8 — Compléments | Liste d'attente du Radar, groupes de mots, état du cache et pré-contrôle SERP sous contrat ; exploration non scannée sans alerte ; Finalisation : Capitaine vide → « — » ; terme TF-IDF à densité illisible écarté (plus de « ×0/page »). |

**Cliquet final** : 0 appel client et 0 route serveur du Moteur sans contrat
(`tests/unit/architecture/display-contracts-coverage.test.ts`, 18 familles terminées).

### Restes volontairement hors périmètre

- `RelatedKeyword` (brief Rédaction, audit) garde des KPI non nullables :
  `server/services/external/dataforseo/keywords.ts` (annoté) — à migrer avec
  FR-INFRA-KPI-NULLABLE côté Rédaction.
- `detectSpecialCase` (`useMultiSourceVerdict.ts`) tolère un volume absent comme
  « nul » pour les verdicts latente / émergente : décision métier documentée par
  `kpi-nullable-composables.test.ts`, non modifiée.
- Ordre par défaut du Radar : trié par l'ancien `combinedScore` alors que la carte
  affiche le score KPI — décision produit à prendre, non modifiée.
