---
doc: CLAUDE
version: 2.0.0
last_updated: 2026-04-30
synced_with: [_bmad-output/planning-artifacts/prd.md, _bmad-output/planning-artifacts/architecture.md, _bmad-output/planning-artifacts/epics.md, _bmad-output/implementation-artifacts/sprint-status.yaml, ARCHITECTURE_FLOWS.md]
---

# CLAUDE.md — Instructions et méthodologie de travail

> Ce fichier est lu automatiquement au démarrage de chaque session Claude Code.
> Il définit **comment on travaille** sur Blog Redactor SEO + indique les sources de vérité du projet.

## Projet

**Blog Redactor SEO** — Outil de production de contenu SEO (Vue 3 + Express 5 + PostgreSQL) pour consultant solo.
Pipeline : Cerveau (stratégie) → Moteur (validation mots-clés, 6 onglets / 3 phases) → Rédaction (TipTap + IA).

> Pour comprendre **ce que fait** le projet, voir `_bmad-output/planning-artifacts/prd.md`. Pour **comment il est construit**, voir `_bmad-output/planning-artifacts/architecture.md` et `ARCHITECTURE_FLOWS.md`.

---

## 1. Sources de vérité — À CONSULTER quand le sujet s'y prête

| Domaine                     | Document                                                   | Notes                                      |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Vue d'ensemble PRD          | `_bmad-output/planning-artifacts/prd.md`                   | Mis à jour 2026-04-24                      |
| Architecture globale        | `_bmad-output/planning-artifacts/architecture.md`          | Mis à jour 2026-04-24                      |
| Diagrammes de flux          | `ARCHITECTURE_FLOWS.md`                                    | Mis à jour 2026-04-24 — diagrammes Mermaid |
| Flux détaillé Moteur        | `docs/moteur-data-flow.md`                                 | Mis à jour 2026-04-24                      |
| Epics livrés (synthèse)     | `_bmad-output/planning-artifacts/epics.md`                 | Mis à jour 2026-04-24                      |
| État sprint                 | `_bmad-output/implementation-artifacts/sprint-status.yaml` | Mis à jour 2026-04-24                      |
| Multi-provider IA           | `docs/ai-usage-map.md`                                     | À jour                                     |
| Système article-id          | `docs/article-id-reference.md`                             | À jour                                     |
| Prompts .md                 | `docs/prompts-reference.md`                                | À jour                                     |
| Tests                       | `docs/testing-guide.md`                                    | À jour                                     |
| UI / sections               | `docs/ui-sections-guide.md`                                | À jour                                     |
| Génération article          | `docs/workflow-article-generation.md`                      | À jour                                     |
| Scores KPI vs Pertinence    | `docs/scoring-kpi-vs-relevance.md`                         | Mis à jour 2026-04-28                      |
| Point de douleur (backbone) | `docs/pain-point-editorial-backbone.md`                    | Mis à jour 2026-04-28                      |
| Améliorations UI Capitaine  | `docs/captain-ui-improvements.md`                          | Mis à jour 2026-04-30                      |

**Source de vérité absolue :** le code dans `src/`, `server/`, `shared/`. Les documents ci-dessus décrivent l'intention — le code décrit la réalité. En cas de divergence, le code l'emporte.

> **Règle de synchronisation** : si tu modifies un fichier listé dans le `synced_with` d'un autre, tu **dois** vérifier la cohérence de cet autre.

### Sources À NE PAS UTILISER comme spec

Ces documents existent pour traçabilité historique mais ne reflètent plus l'état livré :

#### `_bmad-output/implementation-artifacts/_archive/` — Stories et tech-specs historiques

51 fichiers (29 stories `N-N-*.md`, 5 rétrospectives `epic-N-retro-*.md`, 17 tech-specs `tech-spec-*.md`) tous implémentés et potentiellement divergents. Chaque fichier porte un **bandeau ARCHIVED**.

**Règle :**
- ❌ NE PAS les utiliser comme source pour connaître l'état actuel
- ❌ NE PAS écrire du code en se basant uniquement sur leurs acceptance criteria
- ✅ OK pour comprendre l'intention historique
- ✅ Si l'utilisateur les mentionne explicitement (`@fichier.md`), les lire

**Divergences connues vs plan initial :**
- Plan 2026-03 parlait de « 2 phases / suppression Phase ③ Assigner » → Livré : **3 phases** (Explorer / Valider / Finalisation)
- Plan 2026-03 parlait de slug pour identifier les articles → Livré : **articleId** (migration faite)
- Plan 2026-03 parlait de persistance JSON → Livré : **PostgreSQL** (pg 8.20)
- Plan 2026-03 parlait de checks non préfixés → Livré : **préfixés par workflow** (`moteur:*`, `cerveau:*`, `redaction:*`)

#### Autres archives
- `_bmad-output/planning-artifacts/_archive/` : `implementation-readiness-report-2026-03-30.md` (snapshot pré-brainstorming)
- `_bmad-output/planning-artifacts/research/*` : recherches mars 2026, contexte de conception
- `data/_archive/` : anciens JSON migrés vers PostgreSQL — **ne JAMAIS relire comme données live**
- `_bmad-output/brainstorming/` : sessions de brainstorming historiques

---

## 2. La boucle de travail (requirement-driven + TDD)

Le projet est piloté par les **exigences**, pas par le code. Les exigences (PRD + tech-specs actifs) existent **avant** les tests, qui existent **avant** le code de production sur les zones critiques.

Chaque incrément (= une story / tech-spec) suit **strictement** ces 6 phases :

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. ANALYSE          → identifier le problème, relire la spec   │
│         │              et le code existant, lister les inconnues│
│         ▼                                                       │
│  2. PLAN + STORY     → écrire/maj la tech-spec dans             │
│         │              _bmad-output/implementation-artifacts/,  │
│         │              tracer les checks workflow concernés,    │
│         │              décomposer en tâches techniques          │
│         ▼                                                       │
│  3. DEV (TDD)        → Red : écrire le test qui prouve le besoin│
│         │              Green : code minimal qui passe           │
│         │              Refactor : nettoyer sans casser          │
│         ▼                                                       │
│  4. SELF-REVIEW      → auto-critique structurée (voir §5)       │
│         │              corriger AVANT de passer à la validation │
│         ▼                                                       │
│  5. VALIDATION       → npm run lint, type-check, test:unit,     │
│         │              test:browser, check:dead, check:cycles   │
│         ▼              (voir §6)                                │
│  6. MAJ DOC          → bumper front-matter, actualiser          │
│                        sprint-status.yaml et tout doc impacté   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          ↓ retour à 1 pour la story suivante
```

**Aucune phase ne se saute.** Si une phase révèle un problème (ex: validation rouge), on **revient à la phase nécessaire**, on ne maquille pas le rouge.

### 2.1 Phase 3 — TDD strict vs pragmatique

#### TDD strict (Red → Green → Refactor obligatoires)
- **Services backend** (`server/services/{keyword,external,intent,article,strategy,infra,queries}/`) : mock des appels externes, vérifier la logique métier. Cas erreur (timeout, 4xx, 5xx, payload invalide) couverts.
- **Routes API** (`server/routes/`) : validation Zod, codes HTTP, contrats de réponse `{ data: T }`.
- **Stores Pinia** critiques (`src/stores/article/`, `src/stores/keyword/`) : mutations, getters, actions asynchrones.
- **Composables** de scoring/pertinence (`src/composables/keyword/`, `src/composables/intent/`).
- **Wrapper API** (`apiGet/apiPost/apiPut/apiDelete`) et middleware DB.
- **Constantes workflow** (`shared/constants/workflow-checks.constants.ts`) : tout check émis doit avoir un test.

#### Tests UI conséquents
- **Composants Vue Moteur bimodaux** (mode `workflow` / `libre`).
- **Composants Cerveau / Capitaine / Lieutenants** (interactions, side-panels, sélection).
- **Tests d'intégration** sur les flows : Cerveau → Moteur → Rédaction.

#### Pragmatique
- Composants UI purs (Button, Card, Modal…) : smoke test de rendu.
- Pages assemblage (router views) : couvertes par les tests d'intégration.

#### Stack de test
- **Vitest** : unit + integration (`tests/unit/`, `tests/contract-api/`).
- **@vue/test-utils** : composants Vue isolés.
- **Playwright** : E2E navigateur (`npm run test:browser`).
- Voir `docs/testing-guide.md` pour les patterns établis.

#### Discipline
- **Aucun commit sans test** sur les zones TDD strict ou les composants critiques.
- **Coverage** : pas de seuil bloquant arbitraire, mais les services backend critiques (validation mots-clés, scoring, génération article) doivent tendre vers 100 %.
- Préfixer les tests par leur domaine pour faciliter la traçabilité (`moteur:*`, `cerveau:*`, `redaction:*`).

---

## 3. Règles techniques essentielles

Reprises du PRD / architecture à jour. Les suivantes sont les plus souvent violées :

1. **Persistance = PostgreSQL uniquement** pour les données chaudes — pas de nouveau fichier JSON dans `data/`
2. **Identifiants** : `articleId` (TEXT dans DB), PAS `slug`. Les routes sont `/cocoon/:cocoonId/article/:articleId`
3. **Checks workflow** : toujours via les constantes `MOTEUR_*` / `CERVEAU_*` / `REDACTION_*` dans `shared/constants/workflow-checks.constants.ts`. Jamais hardcoder la string
4. **Organisation par domaine** :
   - Stores : `src/stores/{article,keyword,strategy,external,ui}/`
   - Composables : `src/composables/{keyword,intent,editor,seo,ui}/`
   - Services backend : `server/services/{keyword,external,intent,article,strategy,infra,queries}/`
5. **API wrapper** : `apiGet/apiPost/apiPut/apiDelete` (jamais `fetch` direct). Réponses dans `{ data: T }`
6. **Cache avant appel externe** : consulter `keyword_metrics` (cross-article permanent) puis `api_cache` (TTL) avant tout appel DataForSEO / Claude / etc.
7. **Prompts IA** : fichiers `.md` dans `server/prompts/`, chargés via `loadPrompt()` qui injecte `{{strategy_context}}` et autres variables. Ne JAMAIS modifier le `.md` pour passer du contexte — toujours pré-processer
8. **Composants Moteur bimodaux** : prop `mode: 'workflow' | 'libre'` (jamais dupliquer entre Moteur et Labo)
9. **Émission des checks** : composants Moteur en mode workflow émettent `check-completed` avec une constante `MOTEUR_*`
10. **Multi-provider IA** : passer par `ai-provider.service.ts` (Claude / Gemini / OpenRouter / Mock selon env)
11. **Langues** : Toujours parler à l'utilisateur en français
12. **Vulgarisation** : Lorsque des termes techniques sont présents dans une réponse, toujours ajouter une petite définition pour qu'un débutant de 12 ans puisse comprendre. Des exemples concrets sont toujours les bienvenus.

### 3.1 Règles de structure de fichiers
- **Une responsabilité par fichier**. Si un fichier dépasse ~300 lignes, envisager de le découper.
- **Pas de dossier `utils/` fourre-tout** dans un domaine — si une fonction n'a pas de place évidente, c'est probablement qu'elle appartient à un service métier.
- **Les composants Vue ne font pas d'appel `fetch` directement** — ils passent par un store ou un composable qui utilise `apiGet/apiPost/...`.
- **Les routes Express** parsent l'input (Zod), délèguent à un service, formattent la réponse `{ data: T }`. Pas de logique métier dans les handlers.
- **Aucun import croisé** : `src/` ne doit jamais importer depuis `server/` (sauf via `shared/` pour les types et constantes).

---

## 4. Anti-patterns à éviter

- ❌ Ajouter un nouveau fichier JSON dans `data/` pour des données chaudes (utiliser PostgreSQL)
- ❌ Identifier un article par son `slug` (utiliser `articleId`)
- ❌ Hardcoder une string de check workflow (utiliser les constantes `MOTEUR_*` / `CERVEAU_*` / `REDACTION_*`)
- ❌ Appeler `fetch` directement dans un composant Vue (passer par `apiGet/apiPost/...`)
- ❌ Appeler une API externe (DataForSEO, Claude…) sans consulter le cache `keyword_metrics` puis `api_cache` d'abord
- ❌ Modifier un prompt `.md` pour y injecter du contexte (toujours pré-processer via `loadPrompt()`)
- ❌ Dupliquer un composant Moteur entre mode workflow et mode libre (utiliser la prop `mode`)
- ❌ Importer depuis `server/` dans `src/` (passer par `shared/`)
- ❌ Bypasser `ai-provider.service.ts` pour appeler un SDK IA directement
- ❌ Sauter une phase de la boucle de travail (§2)
- ❌ Implémenter sans test sur les zones TDD strict (§2.1)
- ❌ Lire `data/_archive/` ou `_bmad-output/implementation-artifacts/_archive/` comme source de vérité

---

## 5. Phase 4 — Self-Review (auto-critique structurée)

À faire **avant** la validation. Passer la grille suivante :

- [ ] Chaque besoin de la story/tech-spec a-t-il un test qui le couvre ?
- [ ] Les checks workflow émis utilisent-ils les constantes `MOTEUR_*` / `CERVEAU_*` / `REDACTION_*` ?
- [ ] Y a-t-il du code mort, des `TODO` non assumés, des `console.log` ?
- [ ] La structure de fichiers respecte-t-elle l'organisation par domaine (§3) ?
- [ ] Les appels externes sont-ils précédés d'une consultation cache ?
- [ ] Les composants Vue passent-ils tous par `apiGet/apiPost/...` (pas de `fetch` direct) ?
- [ ] Les types sont-ils explicites (pas de `any` non justifié) ?
- [ ] Les noms reflètent-ils le **domaine métier** (`Cocoon`, `Captain`, `Lieutenant`, `Article`) plutôt que la technique ?
- [ ] Les composants Moteur bimodaux utilisent-ils bien la prop `mode` ?
- [ ] Le prompt IA modifié reste-t-il agnostique du contexte (variables `{{...}}` injectées par `loadPrompt`) ?
- [ ] La documentation impactée est-elle à jour ?

Si **n'importe quelle case est rouge → corriger avant validation**.

---

## 6. Phase 5 — Validation

Trois familles de checks, **toutes obligatoires vertes** avant de passer à la phase 6.

### 6.1 Statique
```bash
npm run lint         # oxlint + eslint
npm run type-check   # vue-tsc
```

### 6.2 Tests fonctionnels
```bash
npm run test:unit      # Vitest (unit + contract-api)
npm run test:browser   # Playwright (E2E)
```

### 6.3 Hygiène code
```bash
npm run check:dead     # knip (code mort)
npm run check:cycles   # madge (cycles d'import)
```

### 6.4 Build (avant tout merge significatif)
```bash
npm run build          # type-check + vite build
```

---

## 7. Phase 6 — MAJ documentation

À chaque fin de story / tech-spec :
1. Bumper `version` et `last_updated` du front-matter de la tech-spec si elle en a un.
2. Mettre à jour `_bmad-output/implementation-artifacts/sprint-status.yaml` (statut épique/sprint).
3. Si une décision archi a changé → bumper `_bmad-output/planning-artifacts/architecture.md` + `ARCHITECTURE_FLOWS.md` si schéma touché.
4. Si une fonctionnalité utilisateur a changé → bumper `_bmad-output/planning-artifacts/prd.md`.
5. Si un domaine documenté évolue → bumper le doc concerné dans `docs/` (ex: `docs/scoring-kpi-vs-relevance.md`, `docs/pain-point-editorial-backbone.md`).
6. Si la méthodologie évolue → bumper `CLAUDE.md` (ce document).
7. Vérifier la cohérence des listes `synced_with` dans tous les front-matters touchés.
8. Si la tech-spec est livrée et stable → la déplacer dans `_bmad-output/implementation-artifacts/_archive/` avec un bandeau **ARCHIVED**.

---

## 8. Stack (versions figées)

- Vue 3.5.29, Pinia 3.0.4, Vue Router 5.0.3, TipTap 3.22.3
- Express 5.2.1, PostgreSQL (pg 8.20.0)
- Anthropic SDK 0.78.0, Google GenAI 1.50.1, HuggingFace Transformers 3.8.1
- Zod 4.3.6, Vitest 4.0.18, Playwright 1.59.1
- TypeScript 5.9.3, Vite 7.3.1
- Node engines : `^20.19.0 || >=22.12.0`

---

## 9. Conventions de nommage

| Type             | Convention            | Exemple                                            |
| ---------------- | --------------------- | -------------------------------------------------- |
| Vue components   | PascalCase.vue        | `CaptainValidation.vue`                            |
| Stores           | kebab-case.store.ts   | `article-progress.store.ts`                        |
| Services backend | kebab-case.service.ts | `keyword-validate.service.ts`                      |
| Routes backend   | kebab-case.routes.ts  | `serp-analysis.routes.ts`                          |
| Composables      | useCamelCase.ts       | `useKeywordScoring.ts`                             |
| Types partagés   | kebab-case.types.ts   | `article-progress.types.ts`                        |
| Schemas Zod      | kebab-case.schema.ts  | `article-progress.schema.ts`                       |
| Prompts          | kebab-case.md         | `capitaine-ai-panel.md`                            |
| Tests            | miroir + .test.ts     | `tests/unit/stores/article-progress.store.test.ts` |
| Checks workflow  | `workflow:snake_case` | `moteur:capitaine_locked`                          |

---

## 10. Commandes utiles

```bash
npm run dev            # front + back en parallèle
npm run test:unit      # Vitest
npm run test:browser   # Playwright
npm run type-check     # vue-tsc
npm run lint           # oxlint + eslint
npm run check:dead     # knip (code mort)
npm run check:cycles   # madge (cycles)
npm run build          # type-check + vite build
```

---

## 11. Contexte de travail

- **Plateforme dev** : Windows 11, shell `bash` (syntaxe Unix dans les scripts — `/dev/null`, slashs avant).
- **Date de référence** : avril 2026.
- **Méthodologie** : BMAD (voir `.claude/commands/bmad-*` et `_bmad-output/`). Les tech-specs actifs vivent à la racine de `_bmad-output/implementation-artifacts/` ; les artefacts livrés et stables sont archivés dans `_archive/`.
- **Auto-critique > revue humaine** : la phase 4 (self-review) est faite par l'agent lui-même avant validation, l'utilisateur n'est pas un reviewer.

### Outils BMAD dans .claude/commands

Les commandes `bmad-*` sont des templates méthodologiques BMAD. Elles produisent des artefacts dans `_bmad-output/`. **Attention** : elles peuvent créer de nouveaux documents qui deviendront potentiellement obsolètes — ne pas les confondre avec les sources de vérité listées en §1.
