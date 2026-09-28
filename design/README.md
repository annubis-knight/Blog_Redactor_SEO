---
title: 'Design — Blog Redactor SEO'
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
synced_with:
  - spec/README.md
  - spec/requirements.md
  - server/db/schema.sql
---

# Design — Blog Redactor SEO

**Comment l'outil est construit** : architecture, données, API, IA, tests, puis chaque domaine,
et le flux de chaque donnée partagée. Ce que l'outil doit faire est dans
[`spec/requirements.md`](../spec/requirements.md) ; comment il se comporte, dans les
[chapitres de la spécification](../spec/README.md).

**Règles de lecture**
- Le code fait foi. Ces chapitres décrivent le code au commit `60b9818` ; un écart trouvé se corrige ici.
- Les liens sont relatifs au dossier `design/` (`../src/…`). On cite des fichiers et des symboles, jamais des
  numéros de ligne : un `grep` du symbole retrouve l'endroit.
- Un identifiant `DESIGN-…` porte le même suffixe que son exigence `FR-…` / `NFR-…` : chercher l'un
  retombe sur l'autre, sur les tests et sur les commits.
- Un renvoi « conflit N » (ou « cf. conflits ») désigne l'écart n° N de la section du même domaine dans
  l'archive [`drift-consolidation-2026-09-28.md`](../_bmad-output/planning-artifacts/_archive/drift-consolidation-2026-09-28.md).

## Les chapitres

### Fondations

| Chapitre | Contenu |
|---|---|
| [01 — Architecture](01-architecture.md) | Vue d'ensemble, stack et versions, arborescence, couches et règles d'import, conventions, démarrage, décisions encore valides |
| [02 — Modèle de données](02-donnees.md) | Tables PostgreSQL, identifiants, **matrice tables ↔ exigences** (lue par un test) |
| [03 — API et routes](03-api.md) | Routes de l'écran, catalogue des routes du serveur |
| [04 — IA et prompts](04-ia-et-prompts.md) | Fournisseurs d'IA et repli, architecture des prompts, catalogue, usages de l'IA, mode simulé / réel |
| [05 — Référence des prompts](05-prompts-reference.md) | Généré par `npm run docs:prompts` ; un test vérifie qu'il est à jour |
| [06 — Mode automatique](06-mode-automatique.md) | Le robot `auto:article` : options, étapes, garde-fous |
| [07 — Tests et outillage](07-tests-et-outillage.md) | Stratégie de tests, `verify`, contrôles de santé, CI, qui paie quand les tests tournent |
| [08 — Carte des écrans](08-ecrans.md) | Chaque vue, ses sections, leurs composants, repères de test et appels |
| [09 — Contrats d'affichage](09-contrats-affichage.md) | Une donnée absente reste absente (« — ») ; la valeur affichée est celle qui trie |

### Domaines (dans l'ordre du parcours)

| Chapitre | Domaine |
|---|---|
| [10 — Dashboard](10-dashboard.md) | Accueil et page du cocon |
| [11 — Cerveau](11-cerveau.md) | Stratégie du cocon, construction progressive, carte indicative, douleur éditoriale |
| [12 — Moteur](12-moteur.md) | Cadre commun des sept onglets : phases, étapes, verrous, navigation |
| [13 — Discovery](13-discovery.md) | Découverte de mots-clés |
| [14 — Radar et Capitaine](14-radar-capitaine.md) | Carte Radar, Score Marché et Score Pertinence, verrouillage du Capitaine |
| [15 — Lieutenants, Structure, Lexique](15-lieutenants-structure-lexique.md) | Pages concurrentes, lieutenants, structure Hn, lexique |
| [16 — Finalisation](16-finalisation.md) | Récapitulatif et passage à la Rédaction |
| [17 — Rédaction](17-redaction.md) | Brief, premier jet, enrichissement, actions, méta, maillage, scores, publication, export |
| [18 — Intégrations externes](18-integrations.md) | DataForSEO, Google, Tavily, GSC, garde-fou de dépense |
| [19 — Interface partagée](19-interface.md) | Panneaux IA, composants communs |
| [20 — Infrastructure](20-infrastructure.md) | Portes et dérogations, étapes, chargeur de prompts, cache, schéma et scripts de base |
| [21 — Qualités transverses](21-qualites.md) | Performance, coût, sécurité, observabilité, configuration |

### Flux de données

[`data-flows/`](data-flows/README.md) — une fiche par donnée partagée : qui la produit, qui la lit, où elle
vit entre deux sessions, et les tests de cohérence qui la gardent. À ouvrir **avant** de toucher une
donnée qui traverse plusieurs couches (cf. `.claude/CLAUDE.md` §2.0).

## Où trouver le détail historique

Ces fichiers existent encore. Ils ne font plus foi : ils racontent l'intention et l'historique.

| Fichier | Contenu | État |
|---|---|---|
| `_bmad-output/planning-artifacts/prd.md` | PRD de 5 500 lignes : exigences par domaine, « En situation », §12.4 historique des FR depuis avril, ancienne matrice tables ↔ FR (§8.14.bis) | Historique ; lu par deux tests (traçabilité, `FR-MOT-DISPLAY-FROM-STORE`) |
| `_bmad-output/planning-artifacts/design-registry.md` | 8 400 lignes : une entrée `DESIGN-…` par exigence, numéros de ligne relevés à des commits donnés | Historique ; lu par le test de traçabilité |
| `_bmad-output/planning-artifacts/_archive/drift-consolidation-2026-09-28.md` | Les 315 écarts doc ↔ code relevés et tranchés en écrivant ces documents | Archive |
| `_bmad-output/planning-artifacts/architecture.md` | Décisions d'architecture de mars 2026 | Largement périmé |
| `_bmad-output/planning-artifacts/epics.md`, `tech-debt-from-drifts.md`, `drift-code-vs-doc.md` | Épopées initiales, dette issue des écarts de mai, registre des écarts | Historique |
| `_bmad-output/implementation-artifacts/tech-spec-*.md`, `epic-*.md`, `sprint-status.yaml` | Spécifications de chantier, épopée qualité SEO (C0–C8), suivi des sprints | Historique ; l'épopée est lue par un test |
| `README.md`, `GUIDE-01` à `GUIDE-04` | Mode d'emploi pour l'utilisateur | Partiellement périmés |
| `archive/`, `data/_archive/`, `server/db/migrations/_archive/`, `planning-artifacts/_archive/` | Anciennes specs, anciens JSON, anciennes migrations | Jamais comme vérité |

L'ancien dossier `docs/` a été fondu dans `spec/` et `design/` le 2026-09-28 : ses fiches de flux sont
dans [`data-flows/`](data-flows/README.md), la recette manuelle dans
[`spec/18-recette-manuelle.md`](../spec/18-recette-manuelle.md), et le reste, vérifié contre le code, dans
les chapitres ci-dessus. Les anciennes versions restent dans l'historique git.

## Entrées de design retirées

Ces conceptions répondaient à des exigences remplacées. Leur détail reste dans `design-registry.md`.

| ID | Remplacée par |
|---|---|
| `DESIGN-CER-BATCH-CREATE` | `DESIGN-CER-COCOON-PROGRESSIVE` (création un article à la fois) |
| `DESIGN-CAP-VERDICT-GATING`, `DESIGN-CAP-VERDICT-INFORMATIVE` | `DESIGN-CAP-LOCK-GATE` (porte du verrouillage du Capitaine) |
| `DESIGN-LIE-HN-STRUCTURE` | `DESIGN-HN-TAB` (onglet Structure) |
| `DESIGN-RED-ARTICLE` | `DESIGN-RED-DRAFT-SINGLE-PASS` (premier jet en un seul appel) |
| `DESIGN-RED-INTERNAL-LINKING` | `DESIGN-RED-LINKING-MANUAL` (maillage proposé depuis la famille du cocon) |
