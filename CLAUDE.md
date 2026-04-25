# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu automatiquement au démarrage de chaque session Claude Code.
> Il indique quelles sont les sources de vérité actuelles du projet
> et lesquelles sont des archives historiques à ne pas utiliser comme spec.

## Projet

**Blog Redactor SEO** — Outil de production de contenu SEO (Vue 3 + Express 5 + PostgreSQL) pour consultant solo.
Pipeline : Cerveau (stratégie) → Moteur (validation mots-clés, 6 onglets / 3 phases) → Rédaction (TipTap + IA).

## Sources de vérité — À CONSULTER quand le sujet s'y prête

| Domaine                 | Document                                                   | Notes                                      |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Vue d'ensemble PRD      | `_bmad-output/planning-artifacts/prd.md`                   | Mis à jour 2026-04-24                      |
| Architecture globale    | `_bmad-output/planning-artifacts/architecture.md`          | Mis à jour 2026-04-24                      |
| Diagrammes de flux      | `ARCHITECTURE_FLOWS.md`                                    | Mis à jour 2026-04-24 — diagrammes Mermaid |
| Flux détaillé Moteur    | `docs/moteur-data-flow.md`                                 | Mis à jour 2026-04-24                      |
| Epics livrés (synthèse) | `_bmad-output/planning-artifacts/epics.md`                 | Mis à jour 2026-04-24                      |
| État sprint             | `_bmad-output/implementation-artifacts/sprint-status.yaml` | Mis à jour 2026-04-24                      |
| Multi-provider IA       | `docs/ai-usage-map.md`                                     | À jour                                     |
| Système article-id      | `docs/article-id-reference.md`                             | À jour                                     |
| Prompts .md             | `docs/prompts-reference.md`                                | À jour                                     |
| Tests                   | `docs/testing-guide.md`                                    | À jour                                     |
| UI / sections           | `docs/ui-sections-guide.md`                                | À jour                                     |
| Génération article      | `docs/workflow-article-generation.md`                      | À jour                                     |

**Source de vérité absolue :** le code dans `src/`, `server/`, `shared/`. Les documents ci-dessus décrivent l'intention — le code décrit la réalité. En cas de divergence, le code l'emporte.

## Sources À NE PAS UTILISER comme spec

Ces documents existent pour traçabilité historique mais ne reflètent plus l'état livré :

### `_bmad-output/implementation-artifacts/_archive/` — Stories et tech-specs historiques

Les 51 fichiers dans ce dossier sont des **artefacts de planification du 2026-03 / 2026-04** tous implémentés et potentiellement divergents de la réalité actuelle :

- 29 stories `N-N-*.md` (ex: `1-1-layout-3-phases-*.md`, `6-1-restructuration-moteur-*.md`)
- 5 rétrospectives `epic-N-retro-*.md`
- 17 tech-specs `tech-spec-*.md`

Chaque fichier porte un **bandeau ARCHIVED** en première ligne.

Seul `_bmad-output/implementation-artifacts/sprint-status.yaml` reste à la racine du dossier comme index de suivi des épics.

**Règle :**

- ❌ NE PAS les utiliser comme source pour connaître l'état actuel du projet
- ❌ NE PAS écrire du code en se basant uniquement sur leurs acceptance criteria (ils peuvent avoir évolué)
- ✅ OK d'y jeter un œil pour comprendre l'intention historique ou tracer une décision
- ✅ Si l'utilisateur les mentionne explicitement (`@fichier.md`), les lire

**Divergences connues vs plan initial :**

- Plan 2026-03 parlait de « 2 phases / suppression Phase ③ Assigner » → Livré : **3 phases** (Explorer / Valider / Finalisation)
- Plan 2026-03 parlait de slug pour identifier les articles → Livré : **articleId** (migration faite)
- Plan 2026-03 parlait de persistance JSON → Livré : **PostgreSQL** (pg 8.20)
- Plan 2026-03 parlait de checks non préfixés → Livré : **préfixés par workflow** (`moteur:*`, `cerveau:*`, `redaction:*`)

### `_bmad-output/planning-artifacts/_archive/`

Contient `implementation-readiness-report-2026-03-30.md` (snapshot pré-brainstorming à valeur historique uniquement).

### `_bmad-output/planning-artifacts/research/*`

Documents de recherche de mars 2026 — valeur historique, contexte de conception. Ne pas y chercher l'état actuel.

### `data/_archive/`

Anciens fichiers JSON (articles, BDD\_\*, strategies, autocomplete cache) migrés vers PostgreSQL. Ne JAMAIS les relire comme données live.

### `_bmad-output/brainstorming/`

Sessions de brainstorming historiques — contexte de conception.

## Règles techniques essentielles

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
12. **Communication avec l'utilisateur** : Lorsque des termes techniques sont présent dans une réponse, toujours ajouter une petite définition pour q'un débutant de 12ans puisse comprendre la réponse. Des exemples concrêts sont toujours les bienvenus.

## Stack (versions figées)

- Vue 3.5.29, Pinia 3.0.4, Vue Router 5.0.3, TipTap 3.22.3
- Express 5.2.1, PostgreSQL (pg 8.20.0)
- Anthropic SDK 0.78.0, Google GenAI 1.50.1, HuggingFace Transformers 3.8.1
- Zod 4.3.6, Vitest 4.0.18, Playwright 1.59.1
- TypeScript 5.9.3, Vite 7.3.1
- Node engines : `^20.19.0 || >=22.12.0`

## Conventions de nommage

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

## Commandes utiles

```bash
npm run dev            # front + back en parallèle
npm run test:unit      # Vitest
npm run test:browser   # Playwright
npm run type-check     # vue-tsc
npm run lint           # oxlint + eslint
npm run check:dead     # knip (code mort)
npm run check:cycles   # madge (cycles)
```

## Outils BMAD dans .claude/commands

Les commandes `bmad-*` dans `.claude/commands/` sont des templates méthodologiques BMAD
(Brainstorm, Market Analysis, Architecture, Development). Elles produisent des artefacts
dans `_bmad-output/`. **Attention** : ces commandes peuvent créer de nouveaux documents
qui deviendront potentiellement obsolètes avec le temps — ne pas les confondre avec les
sources de vérité listées en haut de ce fichier.
