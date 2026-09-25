---
name: tech-spec-prompts-architecture
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C4 ; K5, K7, R11, M10, D1-D3, M14, M15, M17, T11)
  - _bmad-output/planning-artifacts/prd.md (FR-INFRA-PROMPT-LAYERS, FR-INFRA-TYPE-RULES-SSOT, FR-INFRA-PROMPT-LOADER)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-INFRA-PROMPT-LOADER, DESIGN-INFRA-PROMPT-LAYERS, DESIGN-INFRA-TYPE-RULES-SSOT)
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
| `shared/seo-validators.ts` `MIN_WORDS`, `MIN_H2` | `wordsMin`, `h2Min` |
| `keyword-ai-panel.routes.ts` `MAX_SELECTED` | `maxLieutenants` |
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
