---
name: tech-spec-prompts-architecture
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C4 ; K5, K7, R11, M10, D1-D3, M14, M15, M17, T11)
  - _bmad-output/planning-artifacts/prd.md (FR-INFRA-PROMPT-LAYERS, FR-INFRA-TYPE-RULES-SSOT ; amendées : FR-INFRA-PROMPT-LOADER, FR-LEX-METIER-ONLY, FR-RED-CONTEXTUAL-ACTIONS)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-INFRA-PROMPT-LOADER, DESIGN-INFRA-PROMPT-LAYERS, DESIGN-INFRA-TYPE-RULES-SSOT, DESIGN-LEX-METIER-ONLY)
  - docs/prompts-reference.md (généré), docs/prompts-architecture.md, docs/testing-guide.md
---

# Tech-spec — Architecture des prompts (C4)

## Contexte

Le pilier 1013 a perdu son budget de mots en route : le prompt de section
recevait `sectionBudgetHint`, mais aucun `{{sectionBudgetHint}}` ne l'attendait,
et le chargeur ne disait rien. La cartographie du 2026-09-25 (45 prompts) montre
que ce n'est pas un cas isolé :

| Constat | Où |
|---|---|
| Une variable absente reste `{{x}}` dans le prompt ; une variable fournie mais inutilisée est ignorée en silence | `server/utils/prompt-loader.ts:119-122` |
| `strategy.routes.ts` (6 routes) lit ses prompts à la main, `.replace` sur la 1re occurrence, motifs `$` interprétés dans le texte de l'utilisateur | `strategy.routes.ts:170-545` |
| Marqueurs envoyés tels quels à l'IA : `{{#stepDescription}}` (toujours), `{{#topicSuggestions}}` (étape `articles`) | `strategy-suggest.md:20-22`, `cocoon-articles.md:17-23` |
| Stratégie du cocon injectée deux fois ; `strategy_context` toujours vide pour la longue traîne | `micro-context-suggest.routes.ts:28`, `long-tail-suggest.service.ts:101-106` |
| `articleContent` (texte de l'article) non échappé dans la méta | `meta.routes.ts:37` |
| 3 prompts morts | `generate-article.md`, `pain-translate.md`, `actions/localize.md` |
| Années et quartiers écrits en dur (« selon BrightLocal, 2024 », « Croix de pierre, St Simon… ») | `system-propulsite.md:5,22,29,31,32,41,49`, `actions/*`, `reduce-section.md`, `cocoon-*.md` |
| Exemple recopié deux fois par l'IA (le slug du 1013) | `cocoon-articles.md:64,83,108` |
| Règles par type contradictoires : Intermédiaire = 1 000-1 500 mots dans deux prompts, cible 1 800 dans le code ; 4 valeurs par défaut différentes | voir « Règles par type » |
| La doc des prompts cite des routes et fichiers qui n'existent pas | `docs/prompts-reference.md` |

## Objectif

1. **Chargeur strict** : une variable attendue et absente, ou fournie et inutilisée, est une **erreur** (hors production). Rendu en une passe, sans interprétation des `$`, avec des sections `{{#x}}…{{/x}}` gardées si `x` n'est pas vide.
2. **Tous les prompts passent par le chargeur** (fin des `readFile` + `.replace`).
3. **Couche contexte automatique** : `{{today}}`, `{{year}}`, `{{zone}}`, `{{zone_landmarks}}`, `{{strategy_context}}` sont fournis par le chargeur quand le prompt les cite. Zone = `theme_config.avatar.location` ; repères = `local_entities`.
4. **Règles par type : une seule source** (`shared/constants/article-type-rules.ts`), rendue dans les prompts par `{{type_rules}}` et lue par tous les calculs.
5. **Aucune année, aucun lieu en dur** dans les prompts ; exemples fictifs, d'un autre métier.
6. **Doc générée** : `docs/prompts-reference.md` produit par un script, un test vérifie qu'il est à jour.

## Lots

### L1 — Chargeur strict (D2)

`server/utils/prompt-loader.ts`
- `renderPromptTemplate(template, variables, name)` (pure, exportée) :
  1. sections `{{#clé}}…{{/clé}}` : contenu gardé si la valeur (trim) n'est pas vide, retiré sinon ;
  2. variables `{{clé}}` : une seule passe, remplacement par fonction (pas de `$&`, pas de substitution en chaîne) ;
  3. contrôle **sur le modèle** : clés du modèle non fournies = « manquantes » ; clés fournies absentes du modèle = « inutilisées » (hors variables globales).
- Hors `NODE_ENV=production` : `PromptTemplateError` (nom du prompt + clés). En production : `log.error` et rendu (manquante → vide).
- Variables globales, chargées **seulement si le modèle les cite** : `strategy_context` (existant : ajouté en fin si le modèle ne le cite pas), `today` (« 25 septembre 2026 », Europe/Paris), `year`, `zone`, `zone_landmarks`.
- `escapeKeys` doit ne citer que des clés fournies.

Tests Red (`tests/unit/utils/prompt-loader.test.ts`) : variable manquante → erreur ; inutilisée → erreur ; `$&` conservé ; valeur contenant `{{autre}}` non substituée ; section vide retirée, section pleine gardée ; globales injectées seulement si citées.

### L2 — Tous les prompts par le chargeur (K5, D1)

- `strategy.routes.ts` : les 6 routes délèguent à `server/services/strategy/strategy-prompts.service.ts`, qui appelle `loadPrompt` avec **exactement** les variables de chaque modèle. Les blocs `{{#…}}` deviennent des sections. *Décision : le texte des réponses de stratégie n'est pas enveloppé (`escapeKeys`) : c'est le texte de l'utilisateur lui-même, et le rendu en une passe ferme déjà les deux trous (`{{…}}` réinterprété, motifs `$`). Le texte de l'article envoyé à la méta, lui, est échappé.*
- `cocoon-add-article-prompt.ts` : ne fait plus de rendu ; il produit les variables (`isPilier`, `isIntermediaire`, `isSpecialise`, `userInput`, `existingArticles`, `articleType`).
- `strategy-merge.md` au niveau cocon : plus de titre d'article = nom du cocon (section `{{#articleTitle}}`).
- `silos.routes.ts` (`theme-parse`) : `loadPrompt`.
- Corrigés au passage : marqueurs envoyés à l'IA (A, C) ; stratégie doublée (micro-contexte) ; `strategy_context` de la longue traîne ; `articleContent` échappé ; clés inutilisées de la section d'article (`sectionPosition`, `sectionBudgetHint`, voir L3).
- Supprimés : `generate-article.md`, `pain-translate.md`, `actions/localize.md` (+ fixture simulée `translate-pain`).

Tests Red : un test par modèle de `strategy.routes.ts` (aucun ne l'était) qui rend le prompt réel avec les variables de la route et vérifie qu'il ne reste aucun `{{` ; route cocon étape `articles` sans marqueur.

### L3 — Règles par type, source unique (M10)

`shared/constants/article-type-rules.ts` : mots (cible, min, max), H2 (min, max), H3 par H2, lieutenants (min, max retenus). `describeTypeRules(level)` → texte injecté par `{{type_rules}}`.

| Consommateur actuel (copie) | Devient |
|---|---|
| `server/routes/generate/_helpers.ts` `DEFAULT_TARGET_WORDS_BY_TYPE` | `wordsTarget` |
| `server/services/article/target-word-count.service.ts` `TYPE_BASE` | `wordsMin` / `wordsMax` |
| `src/stores/strategy/brief.store.ts` `calculateContentLength` (milieu 2 650 / 1 850 / 1 150) | `wordsTarget` (même valeur affichée et envoyée à la génération) |
| `shared/seo-validators.ts` `MIN_WORDS`, `MIN_H2` | `wordsFloor`, `h2Floor` (*décision : un plancher d'alerte « contenu mince » n'est pas la borne basse d'une cible ; les fusionner aurait durci l'alerte sans décision. Deux notions, une source.*) |
| `keyword-ai-panel.routes.ts` `MAX_SELECTED` | `maxLieutenants` |
| `scripts/auto-article/heuristics/pick-lieutenants.ts` `LIEUTENANT_MAX` (8 / 5 / 3) | `maxLieutenants` (5 / 5 / 4, comme l'écran) |
| `SeoPanel.vue` (`?? 1500`) | `DEFAULT_TARGET_WORDS_FALLBACK` |
| Ville dans les H2 (« 1-2 H2 pour un pilier, 0 sinon », dans deux prompts) | `localH2Max` |
| `recommend-word-count` : `breakdown.typeBase.midpoint` | `breakdown.typeBase.target` (la valeur n'est plus un milieu) |
| `generate-outline.md`, `propose-lieutenants.md`, `lieutenants-hn-structure.md` (fourchettes en dur) | `{{type_rules}}` |
| `generate-article-section.md` | `{{sectionBudgetHint}}` (budget de la section, enfin transmis — R1 en partie) |

Test Red (`tests/unit/coherence/type-rules-ssot.test.ts`) : aucun prompt ne contient de fourchette de mots ou de H2 ; chaque consommateur rend la valeur de la source (en changeant la source, tous suivent).

Cartographie (donnée partagée : longueur cible) — producteurs : règles, recommandation IA (`recommend-word-count`), saisie du brief ; consommateurs : affichage du brief, génération (budget), vérificateurs (publication, SEO) ; persistance : `article_micro_contexts.target_word_count` ; règle : la valeur affichée est celle envoyée.

### L4 — Date, zone, exemples (R11, K7)

- `system-propulsite.md` : plus d'année ni de quartier ; `{{zone}}`, `{{zone_landmarks}}` ; scénario hypothétique « un artisan de {{zone}} » ; exemples de sources sans année inventée.
- `actions/add-statistic.md`, `actions/sources-chiffrees.md`, `reduce-section.md` : années relatives à `{{year}}`.
- `cocoon-articles.md` (+ `-spe`, `add-article`) : exemples d'un autre métier, fictifs, et règle « ne recopie jamais un exemple » ; « Meilleur X {{year}} ».
- `content-gap.service.ts` : prompt en ligne « Toulouse/Occitanie » → zone.

Test Red (`tests/unit/coherence/prompts-no-hardcoded.test.ts`) : aucun `20\d\d` ni nom de lieu de la zone dans `server/prompts/**`.

### L5 — Documentation générée (D3)

- `scripts/prompts-reference.ts` (`npm run docs:prompts`) : pour chaque prompt, variables, sections, globales, fichiers qui le chargent.
- `tests/unit/architecture/prompts-reference.test.ts` : le fichier commité = la sortie du script.
- `docs/prompts-architecture.md` : les cinq couches (identité, contexte, règles par type, tâche, contrat de sortie) et où chacune vit.
- `docs/testing-guide.md` §4 : fixtures simulées à jour.

### L6 — Restes rattachés à C4

- **T11** : `intentValueToPseudoScore` exportée, le test vérifie la vraie fonction.
- **M14** : `painPointToWords` retire la ponctuation.
- **M15** : lexique modifié depuis la Rédaction (`ArticleKeywordsPanel.vue`) : mots génériques refusés à l'ajout et retirés des suggestions.
- **M17** : listes de mots vides alignées sur `shared/utils/generic-terms.ts` là où elles servent le même but.

## Hors périmètre

- `{{cocoon_context}}` (état du cocon) : C7, avec son service.
- Identité de marque configurable (« Propulsite » reste écrit dans l'identité).
- Règle de nombre de FAQ : aucune n'existe ; la passe FAQ arrive en C5.

## Vérification

`npm run verify`, `npm run test:check`, `npm run test:browser` sur Cerveau / Moteur / Rédaction (les fixtures simulées reconnaissent les prompts à des phrases : toute phrase retouchée doit rester reconnue).

## Livré (2026-09-25)

Branche `refactor/prompts-architecture`, PR à ouvrir. Exigences versées au PRD et au registre : `FR-INFRA-PROMPT-LAYERS`, `FR-INFRA-TYPE-RULES-SSOT` ; amendées : `FR-INFRA-PROMPT-LOADER`, `FR-LEX-METIER-ONLY`, `FR-RED-CONTEXTUAL-ACTIONS`.

### Commits par lot

| Lot | Commit | Contenu |
|---|---|---|
| L1 + L2 | `e2f7fb3` refactor(prompts): chaque prompt reçoit exactement les variables qu'il attend | Chargeur strict, variables globales, `strategy-prompts.service.ts`, corrections au passage, trois prompts morts supprimés ; cette tech-spec |
| L3 | `3c4e1f8` refactor(regles): une seule définition du pilier, de l'intermédiaire et du spécialisé | `article-type-rules.ts` seule table, `{{type_rules}}`, consommateurs branchés ; tech-spec complétée |
| L4 | `17d8efd` fix(prompts): ni année ni lieu écrits en dur, des exemples qu'on ne peut pas recopier | `{{today}}`, `{{year}}`, `{{zone}}`, `{{zone_landmarks}}` ; exemples d'un autre métier |
| L5 | `d21a65a` docs(prompts): la référence des prompts est générée et vérifiée | `npm run docs:prompts`, `docs/prompts-architecture.md`, `testing-guide.md` §4 |
| L6 | `16e481a` fix(lexique,pertinence): les restes du lexique et du scoring rattachés à C4 | M15, M14, T11, M17 (requalifiée), en-têtes `AUTHORITY:` |

CI GitHub verte sur L1-L3 (commit `3c4e1f8`). Suite unitaire et fonctionnelle complète verte en local (397 fichiers).

### Tests

- `tests/unit/utils/prompt-template.test.ts` (L1) — rendu en une passe, mode strict, globales.
- `tests/unit/architecture/prompt-variables.test.ts` (L1-L2) — chaque appel `loadPrompt` du serveur fournit exactement les repères de son `.md`.
- `tests/unit/services/strategy-prompts.service.test.ts` (L2) — chaque modèle du Cerveau rendu avec les vraies variables de sa route.
- `tests/unit/coherence/type-rules-ssot.test.ts` (L3).
- `tests/unit/coherence/prompts-no-hardcoded.test.ts` (L4).
- `tests/unit/architecture/prompts-reference.test.ts` (L5).
- `tests/unit/components/article-keywords-panel-lexique.test.ts`, `tests/unit/routes/lexique-suggest.routes.test.ts` (M15) ; `tests/unit/coherence/intent.test.ts` (T11) ; `tests/unit/services/captain-relevance-haiku-override.service.test.ts` (M14).

### Écarts avec le plan

- **M17 requalifiée** : seule la copie exacte `src/constants/french-nlp.ts` est supprimée (ses lecteurs lisent `shared/utils/keyword-roots.ts`). Les autres listes de mots vides servent un autre but : le filtre du lexique écarte « créer », « comment », « combien », qui sont du bruit dans un lexique mais du sens dans un mot-clé. Les aligner sur `generic-terms.ts` aurait dégradé les racines du Radar et la couverture SEO.
- **Pas d'`escapeKeys` sur le texte des réponses de stratégie** : c'est le texte de l'utilisateur lui-même, et le rendu en une passe ferme déjà les deux trous (`{{…}}` réinterprété, motifs `$`). Le texte de l'article envoyé à la méta, lui, est échappé.
- **Pas de règle de nombre de FAQ** : aucune n'existe dans le code ; elle viendra avec la passe FAQ (C5). Le critère « FAQ » de `FR-INFRA-TYPE-RULES-SSOT` est amendé en ce sens.
- **`{{cocoon_context}}` (état du cocon) reporté en C7**, avec `FR-INFRA-COCOON-CONTEXT` et son service.
- **`strategy-merge.md` non modifié** : la section `{{#articleTitle}}` prévue en L2 n'a pas été nécessaire ; le modèle affiche « Sujet », le nom du cocon y est à sa place (test « fusion au niveau cocon : le sujet est le cocon »).
- **Tests de L1** : écrits dans `tests/unit/utils/prompt-template.test.ts` (et non `prompt-loader.test.ts`, seulement ajusté).
- **M15 sans porte** : la Rédaction filtre les termes génériques à l'ajout et dans la suggestion, mais n'évalue pas la porte `lexique-lock` (elle n'a pas d'étape « Lexique validé ») ; la publication la rejoue.
- **R1 en partie** : le budget de la section est transmis au prompt (`{{sectionBudgetHint}}`) ; la rédaction section par section elle-même est revue en C5.

### Découvert en documentant

- Le registre affirmait que `loadPrompt` traitait déjà les blocs `{{#conditional}}` (il ne faisait qu'un `replaceAll` par variable), et plaçait `buildMicroContextBlock` et `buildThemeContextBlock` dans `prompt-loader.ts` (ils sont dans `server/routes/generate/_helpers.ts` et `server/services/strategy/strategy-prompts.service.ts`) ; `DESIGN-CER-THEME-CONFIG` disait que les prompts relisaient `theme_config` en base, alors que le Cerveau reçoit une copie envoyée par l'écran. Corrigé dans le registre.
- `FR-RED-CONTEXTUAL-ACTIONS` listait encore l'action « localiser », sortie de l'éditeur le 2026-04-16 : amendée (11 actions).
- Des consignes restent écrites dans le code, hors `.md` (`keywords.routes.ts`, `content-gap.service.ts`, `target-word-count.service.ts`…) : consigné comme limite dans `DESIGN-INFRA-PROMPT-LAYERS`.
- **`{{zone_landmarks}}` n'est pas trié par zone** : `loadZoneContext` renvoie tout le référentiel `local_entities`, qui décrit Toulouse. Un client à Bordeaux reçoit la bonne zone mais des repères toulousains ; le test « client à Bordeaux » simule les entités et ne le voit pas. L'« En situation » de `FR-INFRA-PROMPT-LAYERS` est réécrite pour rester vraie ; limite consignée au PRD, au registre et en checklist (D5).
