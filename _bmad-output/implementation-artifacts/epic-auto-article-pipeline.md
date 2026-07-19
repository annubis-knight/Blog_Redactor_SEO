---
name: epic-auto-article-pipeline
type: epic
status: done
version: 1.0.0
last_updated: 2026-07-18
synced_with:
  - _bmad-output/implementation-artifacts/audit-auto-article-pipeline.md (audit étape par étape + backlog d'amélioration P1/P2/P3)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (entrée epic-auto-article-pipeline)
  - docs/auto-article-cli.md (guide d'usage du CLI)
  - package.json (scripts npm `auto:article` + `auto:typecheck`)
  - tsconfig.auto-scripts.json (type-check scopé du CLI)
---

# Epic — Génération automatique d'article SEO (CLI `auto-article`)

## 1. Problème & objectif

Aujourd'hui, produire un article optimisé SEO exige de traverser **manuellement** trois univers de l'app :
**Cerveau** (stratégie), **Moteur** (mots-clés, 5 checks), **Rédaction** (outline → article → meta).
Chaque étape est un clic, une validation, une attente. C'est puissant mais lent.

**Objectif** : un **CLI interactif** (`npm run auto:article`) qui, à partir d'une **description vague d'un sujet**
et d'un contexte business minimal, **déroule automatiquement** les trois phases et produit **un article prêt**
(contenu HTML rédigé + meta title/description + mots-clés verrouillés), avec **deux points de validation humaine**
(gates) entre les phases.

## 2. Décisions structurantes (validées avec l'utilisateur — 2026-07-18)

| Décision | Choix retenu |
|---|---|
| **Forme de l'outil** | CLI interactif Node/tsx dans `scripts/`, lancé via `npm run auto:article`. Pas de bouton UI (peut venir plus tard, l'orchestrateur reste réutilisable). |
| **Point d'entrée** | Une **description vague d'un sujet** + contexte business minimal → le script développe **Cerveau → Moteur → Rédaction** de bout en bout. |
| **Autonomie** | **Full auto** à l'intérieur de chaque phase, avec **2 gates** : après Cerveau (valider stratégie + article), après Moteur (valider les mots-clés). Sortie = article rédigé. |
| **Coûts API** | `--mode=mock\|real`, **mock par défaut** en dev (via le runtime-mode existant : `AI_PROVIDER=mock` / `DATAFORSEO_SANDBOX=true`). `real` avec cache multi-niveau + `dataforseo-cost-guard`. |

## 3. Décision d'architecture : CLI → API HTTP (pas d'import direct des services)

Le CLI **pilote l'API HTTP** (`http://localhost:${PORT:-3400}`) avec le serveur `npm run dev` lancé,
**au lieu** d'importer les services backend en process.

**Pourquoi** : l'orchestration coûteuse (découpage de l'outline en groupes de sections, calcul du budget de mots
par section, retry + backoff sur 429, construction des prompts avec `loadPrompt` + `strategy_context` + `keyword_context`)
vit dans les **handlers de route** (`server/routes/generate/*.ts`), **pas** dans les services. Piloter le HTTP
réutilise 100 % de cette logique **sans duplication**. Le toggle mock/réel est déjà branché au niveau service
(`ai-provider.service`, `dataforseo/_client`), donc `--mode` se règle via `POST /api/runtime-mode` au démarrage du run.

**Conséquences** :
- **Préflight obligatoire** : le CLI vérifie que le serveur répond (`GET /api/runtime-mode`) avant de commencer ; sinon message clair « lance `npm run dev` d'abord ».
- Le CLI embarque un **client HTTP léger** + un **consommateur SSE** (les routes `generate/*` et les panels IA streament en `text/event-stream`).
- Aucune règle §3.1 violée : on ne fait pas d'import croisé `src/ ← server/`, le CLI est un client réseau externe au même titre que le front.

**Alternative écartée** : import direct des services en process (comme `scripts/db-snapshot.ts`). Rejetée car
elle obligerait à réimplémenter l'orchestration des routes `generate/*` dans le CLI → duplication + drift garanti.

## 4. Cœur réutilisable : `auto-orchestrator`

Toute la logique **d'auto-décision** (heuristiques) et de **séquencement** est isolée dans un module testable,
indépendant du transport (pur, sans I/O réseau) :

```
scripts/auto-article/
  index.ts                 # entrypoint CLI (prompts interactifs, gates, --flags)
  http-client.ts           # apiGet/apiPost + consumeSse (client réseau, thin)
  orchestrator.ts          # séquence les phases, applique les gates
  phases/
    cerveau.ts             # sujet vague → stratégie + article
    moteur.ts              # discovery → radar → capitaine → lieutenants → lexique
    redaction.ts           # outline → article → meta → save → export
  heuristics/              # PUR, TDD strict — aucune I/O
    pick-capitaine.ts      # choix du Capitaine parmi les verdicts
    pick-lieutenants.ts    # sélection des Lieutenants (count par type)
    pick-lexique.ts        # sélection des termes lexique
    pick-radar-candidates.ts
  types.ts                 # AutoRunContext, AutoRunConfig, PhaseResult
  report.ts                # récap de run (coût, word count, chemins)
```

> **Règle** : les fichiers `heuristics/*` sont **purs et déterministes** (entrée = données API, sortie = décision).
> Ils constituent la zone **TDD strict** de cet epic (§CLAUDE.md 2.1). Le reste (`phases/*`, `http-client`) est
> testé par intégration mock-mode.

## 5. Contrat d'entrée (input minimal du CLI)

```
$ npm run auto:article

? Décris le sujet de ton article (vague, en une phrase) ▸ "aider les artisans du bâtiment à être visibles sur Google localement"
? Cocon cible ▸ [liste des cocons existants] / + Nouveau cocon
? (si nouveau) Nom du cocon ▸ "SEO local artisans BTP"
? Contexte business (optionnel, entrée pour valider) ▸ "PropulSite, création de sites TPE/PME, Toulouse"
? Type d'article ▸ Pilier / Intermédiaire / Spécialisé   (défaut: Intermédiaire)
? Mode ▸ mock (défaut) / real
```

À partir de là : **0 saisie obligatoire** jusqu'au Gate 1. Un **`--config run.json`** permet de rejouer un run
sans prompts (CI / batch futur). Tout est logué (chalk) avec un compteur `[n/8]`.

## 6. Les 2 gates

| Gate | Après | Ce qui est montré | Choix utilisateur |
|---|---|---|---|
| **Gate 1** | Cerveau | Titre d'article dérivé, mot-clé pilier, type, récap stratégie (cible/douleur/angle/promesse/cta) | `valider` / `régénérer` / `éditer un champ` / `abandonner` |
| **Gate 2** | Moteur | Capitaine verrouillé (+ verdict), Lieutenants[], Lexique (obligatoire/diff), structure Hn | `valider` / `relancer Moteur` / `abandonner` |

Sortie finale (pas un gate) : récap article (chemin export, word count, coût cumulé, meta).

---

## 7. Heuristiques d'auto-décision (remplacent le jugement humain)

> Ces règles encodent ce qu'un humain ferait manuellement. Toutes **loguées et justifiées** dans le run.

### 7.1 Candidats Radar (`pick-radar-candidates`)
Depuis les RadarCards du scan : garder le top **K** par `marketScore` (K = 12 Pilier / 8 Inter / 5 Spé),
en excluant `kpis === null` du tri par score (règle invariante §13 design-registry). Ces K alimentent le Capitaine.

### 7.2 Capitaine (`pick-capitaine`) — v3, révisée par les runs réels
Pour chaque candidat, `POST /api/keywords/:keyword/scan` → `{ verdict, marketScore, relevanceScore }`.

**Score composite normalisé** :
`0.5 × affinitéTopique + 0.2 × relevanceNorm + 0.3 × marketNorm`
- **affinitéTopique** (0-1) : part des tokens du mot-clé couverts par *titre + pilier + douleur*, calculée côté CLI (`text.ts`, stopwords FR + singularisation). Ajoutée car le `relevanceScore` produit s'est révélé **non-discriminant** en run réel (les 8 candidats scoraient tous exactement 6/100).
- **normalisation min-max** de relevance et market *dans le pool de candidats* : sans elle, les échelles hétérogènes (relevance 0-20 vs market 20-95) faisaient gagner le marché quels que soient les poids.
- **Garde anti-dérive** : jamais un mot-clé d'affinité 0 s'il existe un candidat on-topic.
- `forced: true` quand le verdict retenu n'est pas GO (on assume de passer outre le marché pour rester dans le sujet) → `log.warn` + rapport.
- Verrouille → émet `moteur:capitaine_locked`. Un seul Capitaine par article.

> **Historique** : v1 « meilleur relevance parmi les GO » → dérive hors-sujet (le GO est piloté par le marché). v2 « composite sur valeurs brutes » → inefficace (échelles). v3 corrige les deux. Régression verrouillée par `pick-capitaine.test.ts` (données réelles du 2026-07-18).

### 7.3 Lieutenants (`pick-lieutenants`)
`POST /api/serp/analyze` avec `topN` = 10. Parmi les Lieutenants proposés (badges [SERP]/[PAA]/[Groupe] + pertinence) :
- garder ceux de pertinence **Fort** puis **Moyen** jusqu'au **compteur recommandé** par type : Pilier 5–8, Inter 3–5, Spé 1–3 (cible = borne haute, plancher = borne basse) ;
- jamais de pertinence Faible sauf si le plancher n'est pas atteint.
- Verrouille → émet `moteur:lieutenants_locked`.

### 7.4 Lexique (`pick-lexique`)
`POST /api/serp/tfidf` (lit les contenus SERP hérités, zéro requête). Sélection :
- **tous** les termes **Obligatoire** (≥70 % concurrents) ;
- **différenciateurs** (30–70 %) : garder ceux dont la densité ≥ médiane du groupe ;
- **optionnels** exclus par défaut ; total plafonné à 30 termes.
- **Filtrage** (ajouté après run réel — le TF-IDF remonte du bruit même sur corpus réel) : mots grammaticaux FR, bruit de domaine (fragments « mots »/« clés » isolés), tokens < 3 caractères, et **mots déjà portés par le Capitaine/Lieutenants** → le Lexique apporte du vocabulaire *complémentaire*.
- Écrit `ArticleKeywords { capitaine, lieutenants[], lexique[], hnStructure }` via `PUT /api/article-keywords/:articleId` → émet `moteur:lexique_validated`.

### 7.5 Cerveau (`phases/cerveau`)
- **Intake** : 1 appel IA « brief » (sujet vague + contexte business) → `{ articleTitle, pilierKeyword, type suggéré, painPoint }`. Réutilise un prompt existant si adéquat, sinon nouveau `server/prompts/auto-intake.md` (agnostique, variables `{{...}}`).
- **Article** : créé dans le cocon via `POST /api/articles/batch-create` (1 article).
- **Stratégie** : pour chaque étape (cible, douleur, aiguillage, angle, promesse, cta) → `POST /api/strategy/:id/suggest` puis `PUT /api/strategy/:id`. `painPoint` figé (règle FR-PAIN-IMMUTABLE-AFTER-CEREVEAU).

### 7.6 Rédaction (`phases/redaction`)
`POST /api/articles/:id/recommend-word-count` (optionnel) → `POST /api/generate/outline` (SSE) →
`POST /api/generate/article` (SSE section-par-section) → `POST /api/generate/meta` →
`PUT /api/articles/:id` (save content + meta) → `PUT /api/articles/:id/status` → export (`export.routes`).

---

## 8. Découpage en stories

> Boucle §2 CLAUDE.md respectée par story : Analyse → (Cartographie si donnée partagée) → Plan → Dev TDD → Self-review → Validation → Clôture. Une story = une branche `feat/auto-<sujet>`.

### Story 1 — Socle CLI + client HTTP/SSE + orchestrateur + mode
**But** : le squelette exécutable, sans intelligence métier.
- `scripts/auto-article/` scaffold ; script npm `auto:article` ; parsing `--mode`, `--config`, `--verbose`.
- `http-client.ts` : `apiGet`/`apiPost` + `consumeSse` (parse `event:`/`data:`), gestion erreurs `{ error: { code, message } }`.
- Préflight `GET /api/runtime-mode` + `POST /api/runtime-mode` pour poser `--mode`.
- `orchestrator.ts` : machine à états 3 phases + 2 gates (phases stubbées).
- Prompts interactifs (readline natif `node:readline/promises`, **pas de nouvelle dépendance** sauf accord).
- `report.ts` (coût cumulé depuis les `usage` renvoyés par l'API).
- **TDD strict** : machine à états de l'orchestrateur (transitions, gate accept/reject/abort), parsing SSE, parsing des flags.
- **Validation** : `npm run type-check`, `test:unit`, `lint`. Démo : `npm run auto:article --mode=mock` traverse 3 phases stub + 2 gates.
- **Files** : `scripts/auto-article/{index,http-client,orchestrator,report,types}.ts`, `package.json` (+script), `tests/unit/scripts/auto-*.test.ts`.

### Story 2 — Phase Cerveau auto (sujet vague → stratégie + article) + Gate 1
**But** : de la description vague à un article créé avec sa stratégie.
- `phases/cerveau.ts` : intake IA, création article (`batch-create`), boucle stratégie (suggest+save).
- Prompt `server/prompts/auto-intake.md` si aucun existant ne convient (à explorer d'abord).
- Résolution/création du cocon (`cocoons.routes` — à explorer).
- **Gate 1** : récap + `valider/régénérer/éditer/abandonner`.
- **TDD strict** : mapping intake→article, mapping suggestions→payload stratégie (services purs).
- **Cartographie (1.bis)** : `painPoint` et `strategy` sont des données partagées Cerveau→Moteur→Rédaction → tracer producteurs/consommateurs.
- **Validation** : run mock s'arrête proprement au Gate 1 avec un article réel en DB + stratégie persistée.
- **Files** : `phases/cerveau.ts`, `heuristics/` (intake mapping), prompt éventuel, tests.

### Story 3 — Phase Moteur auto — Explorer (Discovery + Radar)
**But** : produire les candidats mots-clés.
- `phases/moteur.ts` (partie Explorer) : `discover` → `pick-radar-candidates` → `radar/scan`.
- Émission `moteur:discovery_done`, `moteur:radar_done` via `POST /api/articles/:id/progress/check` (constantes `MOTEUR_*`, jamais de string en dur).
- **TDD strict** : `pick-radar-candidates` (tri, exclusion `kpis===null`, K par type).
- **Validation** : run mock produit N RadarCards + K candidats déterministes.
- **Files** : `phases/moteur.ts` (partiel), `heuristics/pick-radar-candidates.ts`, tests.

### Story 4 — Phase Moteur auto — Valider (Capitaine + Lieutenants + Lexique) + Gate 2
**But** : verrouiller les 3 checks Phase ② et écrire `ArticleKeywords`.
- `pick-capitaine` (verdict GO préféré, fallback forcé loggé), `pick-lieutenants` (count/type), `pick-lexique` (obligatoire+diff).
- `scan` Capitaine, `serp/analyze` Lieutenants, `serp/tfidf` Lexique ; `PUT /api/article-keywords/:id`.
- Émission des 3 checks restants. **Gate 2** : récap mots-clés.
- **TDD strict** : les 3 heuristiques (cas GO/no-GO, plancher/plafond Lieutenants, seuils Lexique, `null`-safety).
- **Cartographie (1.bis)** : `ArticleKeywords` = donnée partagée (consommée par la Rédaction) → header `AUTHORITY:` si un service est créé.
- **Validation** : run mock → 5 checks présents en DB, `ArticleKeywords` complet, Gate 2 lisible.
- **Files** : `phases/moteur.ts` (complet), `heuristics/pick-{capitaine,lieutenants,lexique}.ts`, tests.

### Story 5 — Phase Rédaction auto (outline → article → meta → save → export)
**But** : l'article prêt.
- `phases/redaction.ts` : recommend-word-count → outline (SSE) → article (SSE) → meta → `PUT /articles/:id` → statut → export.
- Gestion des events SSE `section-start/chunk/section-done/rate-limit/done/error` (barre de progression CLI).
- **TDD strict** : agrégation `usage`/coût, assemblage du payload de save, parsing des events SSE (déjà couvert Story 1, étendu ici).
- **Validation** : run mock complet de bout en bout → fichier exporté + contenu en DB + meta ; word count cohérent.
- **Files** : `phases/redaction.ts`, `report.ts` (finalisation), tests.

### Story 6 — Robustesse, reprise, doc & clôture epic
**But** : outil fiable et documenté.
- **Reprise** : `--resume <articleId>` repart de l'état réel (checks déjà présents, contenu déjà écrit) — idempotence.
- **Erreurs** : retry réseau, message clair si serveur down / quota DataForSEO (`cost-guard`) / 429 Claude.
- `--mode=real` testé sur **un** article réel (coût réel assumé, cache exploité).
- **Doc** : `docs/ARCHITECTURE_FLOWS.md` (diagramme pipeline auto), `README`/section « Génération auto », `sprint-status.yaml`, PRD si l'auto devient capacité produit.
- **Validation** : `npm run check:health` vert ; run mock complet + 1 run real de contrôle.

---

## 9. Fichiers impactés (vue d'ensemble)

**Créés** : `scripts/auto-article/**` (≈12 fichiers), `tests/unit/scripts/**`, éventuellement `server/prompts/auto-intake.md`.
**Modifiés** : `package.json` (+ `auto:article`), `docs/ARCHITECTURE_FLOWS.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, PRD (optionnel).
**Réutilisés sans modification** (idéalement) : toutes les routes `server/routes/**`, tous les services, le runtime-mode, le cache multi-niveau, les prompts existants.

> Objectif de non-régression : **zéro modification de comportement** des routes existantes. Si une route manque
> une capacité (ex. pas d'endpoint pour lister les cocons, ou pas de lock programmatique du Capitaine), on
> l'ajoute de façon **additive** et testée, documentée dans la story concernée.

## 10. Risques & points à trancher en implémentation

1. **Lock programmatique** : le verrouillage Capitaine/Lieutenants/Lexique passe-t-il uniquement par l'UI (store) ou existe-t-il un chemin API ? → À explorer Story 4 ; sinon la seule persistance requise est `PUT /article-keywords/:id` + les `progress/check`, ce qui suffit peut-être à reconstituer l'état sans « lock » UI.
2. **Cocon** : endpoint de création/liste des cocons à confirmer (`cocoons.routes`) — Story 2.
3. **Qualité SEO en full-auto** : le fallback Capitaine forcé et la sélection Lieutenants peuvent produire un article moyen ; les 2 gates sont la soupape. Mesurer sur 2-3 runs réels (Story 6).
4. **Mode mock ≠ réalité** : le mock valide le *pipeline*, pas la *qualité*. Story 6 fait tourner 1 run réel de contrôle.
5. **Nouvelle dépendance prompts CLI** : on vise `node:readline/promises` (zéro dep). Si l'ergonomie souffre, demander avant d'ajouter `@inquirer/prompts`.

## 10bis. Livré (2026-07-18)

**6 stories livrées**, pipeline complet validé end-to-end en mode mock (run
reproductible via `--config`). Guide d'usage : `docs/auto-article-cli.md`.

### Périmètre réalisé
- **CLI** `scripts/auto-article/**` (npm `auto:article`), client HTTP + SSE, orchestrateur 3 phases / 2 gates, mode `mock|real`, `--config`, `--resume`, rapport de coût.
- **Cerveau** : endpoint additif `POST /api/generate/auto-intake` (prompt `auto-intake.md` + schéma `auto-intake.schema.ts` + fixture mock) → article créé (`batch-create`) + stratégie persistée (`PUT /strategy/:id`).
- **Moteur** : Discovery (`radar/generate`) + Radar (`radar/scan`) + Capitaine (`:kw/scan`) + Lieutenants (`serp/analyze`) + Lexique (`serp/tfidf`) → `PUT /articles/:id/keywords` + 5 checks `moteur:*`.
- **Rédaction** : `generate/outline` (SSE) → `generate/article` (SSE) → `generate/meta` → save → statut → `POST /export/:id` → `_auto-output/<slug>-<id>.html`.
- **Heuristiques pures** (zone TDD strict) : `pick-radar-candidates`, `pick-capitaine`, `pick-lieutenants`, `pick-lexique`, `resume-plan` + parseurs (flags, sse, gate, config, slug, canonical). **79 tests unitaires verts.**
- Fixtures mock ajoutées : `auto-intake`, `generate-outline`, `generate-meta-priority` (résout la collision du prompt meta qui embarque le HTML article).

### Écarts assumés vs plan initial
1. **Lieutenants dérivés des candidats Radar** (top-N par marketScore) au lieu de `propose-lieutenants` (SSE/IA) — plus simple, déterministe, offline. `serp/analyze` est tout de même appelé (peuple le scrape pour le Lexique). Évolution possible : basculer sur `propose-lieutenants` pour une meilleure qualité.
2. **Pas de route `PUT /article-keywords/:id`** (drift doc) : la persistance décisionnelle réelle est `PUT /api/articles/:id/keywords` (`saveArticleKeywords`).
3. **Création de cocon hors périmètre** : aucun endpoint ne le permet ; le CLI cible un cocon existant.
4. **Type-check du CLI** via `tsconfig.auto-scripts.json` dédié (`npm run auto:typecheck`), sans toucher au gate `type-check` existant (qui ne couvre pas `scripts/`).
5. **Longueur d'article non bridée** : les runs réels produisent 4 000-6 000 mots contre 1 800 visés (`DEFAULT_TARGET_WORDS_BY_TYPE` pour `intermediaire`) — le budget par section est une consigne molle que le modèle ignore. **Décision produit : on garde l'article entier** (pas de passe de réduction).

### Runs réels de contrôle (2026-07-18/19)
3 runs `--mode=real` (Claude Haiku 4.5 + DataForSEO production), **~$0.35 par run**
(~$0.09 Claude + ~$0.27 DataForSEO — ce dernier **non compté par le rapport du CLI**,
cf. audit défaut n°23) :
1. **#450** — pipeline OK, mais 3 défauts qualité révélés : Capitaine hors-sujet (« mots-clés SEO », pertinence 6/100 pour un article sur la génération de leads), Lexique pollué de mots vides, longueur 3,25× la cible.
2. **#451** — après un 1ᵉʳ correctif (composite sur valeurs brutes) : **toujours hors-sujet**. Diagnostic DB : les 8 candidats scoraient **tous exactement `relevance=6`** → le signal de pertinence produit est non-discriminant, et les échelles relevance/market étant hétérogènes, le marché écrasait la pondération.
3. **#452** — après correctifs v3 (affinité topique CLI + normalisation min-max + filtrage lexique) : Capitaine **« référencement naturel PME »** (affinité 100 %, pertinence 60, marché 29), Lexique propre (`site, google, stratégie, visibilité, trafic, liens, mobile…`, zéro mot vide), Lieutenants pertinents. **Qualité éditoriale validée.**

### Réserves connues
- **Score de Pertinence produit non-discriminant** : constaté en run réel (8 candidats → même score 6). Le CLI contourne via son affinité topique, mais **le scoring produit lui-même mériterait une investigation dédiée** (hors périmètre de cet epic).
- **Pollution DB dev** : les runs E2E de validation ont créé/muté des lignes (article #441…). Le `DELETE /articles/:id` est un soft-delete (ne libère pas le slug — d'où la réutilisation par slug, désormais idempotente).

## 11. Definition of Done (epic)
- `npm run auto:article --mode=mock` : run complet reproductible, 2 gates, article + meta + 5 checks en DB, export généré.
- 1 run `--mode=real` de contrôle validé manuellement.
- Heuristiques `heuristics/*` couvertes en TDD strict.
- `npm run check:health` vert ; aucune régression sur les routes existantes (`test:check` sans nouveau rouge imputable).
- Doc à jour ; `sprint-status.yaml` clôturé ; branches mergées et supprimées (§11.2).
