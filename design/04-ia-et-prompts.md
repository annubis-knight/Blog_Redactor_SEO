---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# IA et prompts

Comment l'outil parle à l'IA : la forme des consignes, qui appelle quoi et avec quel modèle, et le mode
simulé. Le détail du code du chargeur est dans [Infrastructure](20-infrastructure.md#chargeur-de-prompts-et-couches-de-contexte),
celui des fournisseurs dans [Intégrations externes](18-integrations.md#répartiteur-dia-et-chaîne-de-secours).

## Architecture des prompts

*Exigences : `FR-INFRA-PROMPT-LAYERS`, `FR-INFRA-PROMPT-LOADER`, `FR-INFRA-COCOON-CONTEXT`, `FR-INFRA-TYPE-RULES-SSOT`, `NFR-INT-PROMPT-AGNOSTIC`*

Un prompt, c'est la consigne envoyée à l'IA. Chaque prompt est un fichier `.md` de
[`../server/prompts/`](../server/prompts/), complété au moment de l'appel. Le rédiger, c'est briefer un
pigiste : lui dire qui il est, ce qu'il doit savoir, les règles de la maison, ce qu'on attend de lui et sous
quelle forme le rendre. Ce sont les cinq couches.

### Les cinq couches

| Couche | Ce qu'elle dit | Où elle vit |
|---|---|---|
| 1. Identité | Qui écrit, pour qui, avec quel ton | `system-propulsite.md`, prompt système des générations de texte ; la première phrase des prompts d'analyse (« Tu es un expert SEO… ») |
| 2. Contexte | Date, zone, stratégie, état du cocon, article, mots-clés | Globales du chargeur (`{{today}}`, `{{year}}`, `{{zone}}`, `{{zone_landmarks}}`, `{{strategy_context}}`) ; blocs fournis par l'appelant (`{{strategyContext}}`, `{{keywordContext}}`, `{{microContext}}`, `{{themeContext}}`, `{{cocoon_context}}`…) |
| 3. Règles par type | Ce qu'est un pilier, un intermédiaire, un spécialisé | `{{type_rules}}`, rendu par `describeTypeRules()` depuis [`../shared/constants/article-type-rules.ts`](../shared/constants/article-type-rules.ts), la seule table |
| 4. Tâche | La mission et ses consignes | Le corps du `.md` |
| 5. Contrat de sortie | La forme attendue, et qui la vérifie | La section « Format de sortie » du `.md` ; les contrats ([`../shared/contracts/`](../shared/contracts/)) qui lisent la réponse ; les vérificateurs ([`../shared/verifiers/`](../shared/verifiers/)) qui jugent le résultat aux portes |

### Le chargeur

[`../server/utils/prompt-loader.ts`](../server/utils/prompt-loader.ts) — `loadPrompt(nom, variables, { cocoonSlug?, escapeKeys? })`.

- **Strict.** Une variable citée par le `.md` et non fournie, ou fournie et non citée, lève
  `PromptTemplateError` hors production ; en production, l'écart est journalisé et l'appel continue.
- **Une passe.** `{{#clé}}…{{/clé}}` est gardé, sans ses marqueurs, si la valeur n'est pas vide, et retiré
  sinon : c'est la seule logique permise dans un `.md`. Puis chaque `{{clé}}` est remplacé ; un texte
  inséré n'est jamais relu (un `{{x}}`, `$1` ou `$&` qu'il contient reste du texte).
- **Contenu de l'utilisateur.** Une clé listée dans `escapeKeys` est neutralisée (séquences d'instruction,
  balises système, accolades) et enveloppée `<user-content>` (`escapePromptContent`). Une valeur vide reste
  vide.
- **Stratégie du cocon.** Avec `cocoonSlug`, la stratégie validée du cocon remplit `{{strategy_context}}` ;
  si le `.md` ne cite pas ce repère, elle est ajoutée en fin de prompt.

Les globales (`PROMPT_GLOBALS`) sont fournies par le chargeur lui-même, quand le `.md` les cite :

| Globale | Valeur | Source |
|---|---|---|
| `today` | « 28 septembre 2026 » (heure de Paris) | Horloge (`formatFrenchDate`) |
| `year` | « 2026 » | Horloge (`currentYear`) |
| `zone` | Par exemple « Toulouse, France » | `theme_config`, `avatar.location` |
| `zone_landmarks` | Autres noms de la zone, quartiers et communes, lieux connus | `local_entities`, **de la zone du client seulement** : une entité rattachée à une région n'est gardée que si la zone nomme cette région ; les entités sans région (le référentiel par défaut) seulement si la zone nomme l'une de ses régions. Les entreprises ne sont jamais reprises. Un client à Bordeaux ne reçoit aucun quartier toulousain. |
| `strategy_context` | Stratégie validée du cocon | `cocoon_strategies`, si l'appel passe `cocoonSlug` ; vide sinon |

Zone et repères : `loadZoneContext` ([`../server/services/strategy/prompt-context.service.ts`](../server/services/strategy/prompt-context.service.ts)).

### L'état du cocon (`{{cocoon_context}}`)

Un rédacteur qui ignore le reste du site répète ce que disent les autres pages. Les trois consignes qui
**construisent un article** reçoivent donc le même état du cocon, lu en base au moment de l'appel. Ce n'est
pas une globale : l'appelant le fournit.

| Consigne | Appelant | Bloc |
|---|---|---|
| `cocoon-child-keywords.md` (mots-clés candidats d'un nouvel article, Cerveau) | `child-candidates.service.ts` → `cocoonContextForNewArticle` | Obligatoire : un état illisible fait échouer la proposition |
| `cocoon-own-keyword.md` (douleur du mot-clé proposé par l'utilisateur, Cerveau) | `child-candidates.service.ts` `describeOwnKeyword` → `cocoonContextForNewArticle` | Obligatoire : sans état, pas d'appel, le mot-clé reste sans douleur |
| `lieutenants-hn-structure.md` (structure de l'article, Moteur) | `keyword-ai-panel.routes.ts` → `cocoonContextForArticle` | `{{#cocoon_context}}…{{/cocoon_context}}` |
| `generate-article-draft.md` (premier jet, Rédaction) | `article-draft.routes.ts` → `cocoonContextForArticle` | `{{#cocoon_context}}…{{/cocoon_context}}` |

Le texte est rendu par `renderCocoonContext` ([`../shared/cocoon-context.ts`](../shared/cocoon-context.ts)) :
l'arbre (le pilier, ses sections et l'article né de chacune, rédigé ou non), les articles sans parent, puis,
pour l'article visé, la section de son parent dont il naît (extrait de 1 200 caractères au plus) et ses
propres sections qui ont déjà leur article. Exemple, pour l'intermédiaire « Auditer son site web » :

```
## Cocon « Croissance digitale »

- Pilier « Le guide de la croissance digitale » (mot-clé « croissance digitale pme ») — rédigé
  - Section « Audit de site » → intermédiaire « Auditer son site web » (mot-clé « audit site web ») — à rédiger
  - Section « Choisir son hébergeur » → pas encore d’article

## Cet article dans le cocon

- Il naît de la section « Audit de site » de « Le guide de la croissance digitale » (pilier).
  Ce que « Le guide de la croissance digitale » en dit déjà :
  > Un audit repère les pages lentes et les contenus en double…
  Cet article développe en profondeur ce que cette section résume : il ne la répète pas.
```

La passe d'enrichissement « Résumer » (`enrich-resumes.md`) ne reçoit pas cet état : seulement le titre et
le mot-clé de l'enfant que le chapitre doit annoncer (`childTitle`, `childKeyword`).

### Ce qu'un `.md` ne contient jamais

| Interdit | Pourquoi | Garde-fou |
|---|---|---|
| Une année ou un lieu | La date et la zone viennent du contexte | `tests/unit/coherence/prompts-no-hardcoded.test.ts` |
| Une règle par type (fourchette de mots, de H2, de candidats) | Elle vient de `{{type_rules}}` | `tests/unit/coherence/type-rules-ssot.test.ts` |
| Un exemple recopiable | Les exemples viennent d'un autre métier et remplacent la ville par `[ville]` | `prompts-no-hardcoded.test.ts` |
| Un contexte d'article ou de cocon écrit en dur | Il est injecté à l'appel (`NFR-INT-PROMPT-AGNOSTIC`) | Revue |

Et dans le code des appelants :

- `tests/unit/architecture/prompt-variables.test.ts` (dans `npm run verify`) vérifie que chaque appel
  `loadPrompt` fournit **exactement** les variables de son `.md`, que le contenu de l'utilisateur
  (`selectedText`, `sectionHtml`, `articleHtml`, `articleContent`, `articleText`, `chapterHtml`,
  `instruction`) passe toujours par `escapeKeys`, et que chaque action de l'éditeur n'attend que
  `selectedText` et `keywordInstruction`.
- `tests/unit/architecture/prompts-reference.test.ts` vérifie que la référence générée est à jour et
  qu'aucun prompt n'est orphelin.

### Ajouter ou modifier un prompt

1. Écrire le `.md` dans `server/prompts/`. Citer les globales et `{{type_rules}}` plutôt qu'écrire des
   dates, des lieux ou des nombres par type.
2. L'appeler par `loadPrompt` avec exactement ses variables ; mettre dans `escapeKeys` tout texte venu de
   l'utilisateur.
3. Lui donner un rôle dans `ROLES` ([`../scripts/prompts-reference.ts`](../scripts/prompts-reference.ts) ; un
   prompt sans rôle fait échouer la génération), puis `npm run docs:prompts`, qui régénère
   [05 — Référence des prompts](05-prompts-reference.md).
4. En mode simulé, les fixtures (`server/services/external/mock-fixtures/`) reconnaissent un flux à des
   phrases du prompt et une sortie structurée au nom de son outil : garder ces phrases, ou mettre la fixture
   à jour. Une fixture copie le format du bloc d'exemple du prompt, pas le type TypeScript.

### Limite connue : consignes écrites dans le code

Six appels ne passent pas, ou pas entièrement, par un `.md` : leur prompt système est écrit dans le code. Ils échappent au
chargeur (ni globales, ni contrôle strict), aux tests des `.md` et à la référence générée, ce que
`FR-INFRA-PROMPT-LAYERS` interdit (« chaque consigne d'IA doit suivre les mêmes cinq couches », inventaire
tiré des consignes elles-mêmes).

| Appel | Où est la consigne |
|---|---|
| Filtre de pertinence de Discovery (`classify_relevance`) | `keywords.routes.ts`, route `POST /keywords/relevance-score` |
| Sélection stratégique de Discovery (`curate_keywords`) | `keywords.routes.ts`, route `POST /keywords/analyze-discovery` |
| Analyse des thèmes concurrents (`analyze_content_gap`) | `content-gap.service.ts` |
| Longueur recommandée (`recommend_word_count`) | `target-word-count.service.ts` (`askAi`) |
| Jugement des questions PAA (`submit_paa_judgments`) | `captain-paa-judge.service.ts` (`SYSTEM_PROMPT` ; le message utilisateur, lui, vient de `captain-paa-judge.md`) |
| Mots-clés du Radar (`generate_radar_keywords`) | `keyword-radar.service.ts` (prompt système écrit dans l'appel ; le message utilisateur, lui, vient de `intent-keywords.md`) |

## Catalogue des prompts

*Exigences : `FR-INFRA-PROMPT-LAYERS`, `FR-INFRA-PROMPT-LOADER`, `FR-INFRA-TYPE-RULES-SSOT`*

L'inventaire complet, avec les variables, les blocs facultatifs et les appelants de chaque prompt, est
généré : [05 — Référence des prompts](05-prompts-reference.md) (`npm run docs:prompts` ; un test échoue s'il
n'est pas à jour). Le tableau ci-dessous en donne le rôle.

| Prompt | Rôle | Chargé par |
|---|---|---|
| `system-propulsite.md` | Identité et règles d'écriture ; prompt système des générations de texte | `generate/action`, `article-draft`, `humanize-section`, `meta`, `reduce-section` ; `enrichment.service.ts` ; `child-candidates.service.ts` |
| `cocoon-brainstorm.md` | Suggestion pour une étape de la stratégie du cocon | `strategy-prompts.service.ts` |
| `cocoon-articles.md` | Carte du cocon : le pilier et les intermédiaires | `strategy-prompts.service.ts` |
| `cocoon-articles-topics.md` | Sujets à couvrir dans le cocon | `strategy-prompts.service.ts` |
| `cocoon-paa-queries.md` | Requêtes Google pour les PAA de chaque intermédiaire | `strategy-prompts.service.ts` |
| `cocoon-articles-spe.md` | Articles spécialisés nourris des PAA | `strategy-prompts.service.ts` |
| `cocoon-add-article.md` | Un article de plus sur la carte, du niveau demandé | `strategy-prompts.service.ts` |
| `cocoon-child-keywords.md` | 3 à 5 mots-clés candidats d'un nouvel article | `child-candidates.service.ts` |
| `cocoon-own-keyword.md` | Douleur et intention éditoriale du mot-clé proposé par l'utilisateur | `child-candidates.service.ts` |
| `strategy-suggest.md` | Suggestion pour une étape de la stratégie d'article | `strategy-prompts.service.ts` |
| `strategy-deepen.md` | Sous-question pour approfondir une étape | `strategy-prompts.service.ts` |
| `strategy-consolidate.md` | Consolide réponse principale et sous-réponses | `strategy-prompts.service.ts` |
| `strategy-enrich.md` | Enrichit le texte validé d'une sous-réponse | `strategy-prompts.service.ts` |
| `strategy-merge.md` | Fusionne saisie de l'utilisateur et suggestion IA | `strategy-prompts.service.ts` |
| `theme-parse.md` | Description libre de l'entreprise → configuration du thème | `silos.routes.ts` |
| `intent-keywords.md` | Mots-clés courts pour chercher les PAA (Radar) | `keyword-radar.service.ts` |
| `radar-long-tail-suggest.md` | Longues traînes scorées à partir des racines du Radar | `long-tail-suggest.service.ts` |
| `capitaine-ai-panel.md` | Avis d'expert sur le candidat capitaine | `keyword-ai-panel.routes.ts` |
| `captain-paa-judge.md` | Pertinence des PAA du capitaine face à la douleur | `captain-paa-judge.service.ts` |
| `propose-lieutenants.md` | Candidats lieutenants (SERP, PAA, racines, groupes de mots) | `keyword-ai-panel.routes.ts` |
| `lieutenants-hn-structure.md` | Structure H2/H3 à partir des lieutenants retenus | `keyword-ai-panel.routes.ts` |
| `lexique-ai-panel.md` | Avis d'expert sur les termes TF-IDF | `keyword-ai-panel.routes.ts` |
| `lexique-analysis-upfront.md` | Recommande ou écarte chaque terme TF-IDF | `keyword-ai-panel.routes.ts` |
| `lexique-suggest.md` | Champ sémantique du capitaine | `keywords.routes.ts` |
| `brief-ia-panel.md` | Lecture critique du brief | `generate/brief-explain.routes.ts` |
| `micro-context-suggest.md` | Angle, ton et consignes proposés | `generate/micro-context-suggest.routes.ts` |
| `generate-outline.md` | Sommaire H1/H2/H3 en JSON | `generate/outline.routes.ts` |
| `generate-article-draft.md` | Premier jet en un appel, chiffres « à sourcer » | `generate/article-draft.routes.ts` |
| `generate-meta.md` | Titre et description pour Google | `generate/meta.routes.ts` |
| `reduce-section.md` | Raccourcit une section | `generate/reduce-section.routes.ts` |
| `humanize-section.md` | Relecture : tics d'IA, franglais, accords, typographie | `generate/humanize-section.routes.ts` |
| `section-rewrite.md` | Réécrit un chapitre selon une consigne | `enrichment.service.ts` |
| `enrich-sources.md` | Passe « sources » : recherche web, liens réels | `enrichment.service.ts` |
| `enrich-exemples.md` | Passe « exemples » | `enrichment.service.ts` |
| `enrich-tableaux.md` | Passe « tableaux » | `enrichment.service.ts` |
| `enrich-images.md` | Passe « images » : place à fournir et texte alternatif | `enrichment.service.ts` |
| `enrich-faq.md` | Passe « FAQ » | `enrichment.service.ts` |
| `enrich-resumes.md` | Passe « résumer » : section devenue article enfant, 150 à 250 mots | `enrichment.service.ts` |
| `auto-intake.md` | Brief structuré à partir d'une idée (robot) | `generate/auto-intake.routes.ts` |
| `auto-placement.md` | Place un nouvel article dans l'arbre (robot) | `generate/placement-suggest.routes.ts` |
| `actions/reformulate.md` | Reformuler la sélection | `generate/action.routes.ts` (`actions/${actionType}`) |
| `actions/simplify.md` | Simplifier le vocabulaire | idem |
| `actions/convert-list.md` | Paragraphe → liste | idem |
| `actions/pme-example.md` | Exemple « grande marque → PME » | idem |
| `actions/keyword-optimize.md` | Intégrer le mot-clé naturellement | idem |
| `actions/add-statistic.md` | Ajouter une statistique sourcée | idem |
| `actions/answer-capsule.md` | Capsule réponse pour les moteurs IA | idem |
| `actions/question-heading.md` | Titre → question | idem |
| `actions/ce-quil-faut-retenir.md` | Bloc « Ce qu'il faut retenir » | idem |
| `actions/sources-chiffrees.md` | Bloc « Sources chiffrées » (recherche web) | idem |
| `actions/exemples-reels.md` | Bloc « Exemples réels » (recherche web) | idem |

## IA multi-fournisseur

*Exigences : `FR-EXT-AI-MULTI-PROVIDER`, `FR-EXT-AI-FALLBACK`, `FR-EXT-CLAUDE`, `NFR-COST-AI-MOCK` · détail : [Intégrations externes](18-integrations.md)*

[`../server/services/external/ai-provider.service.ts`](../server/services/external/ai-provider.service.ts)
est le seul point d'entrée des appels IA.

- `getProvider()` : l'override du mode (`mock` → `mock`, `real` → `claude`), sinon `mock` si le mode
  effectif l'est (`getEffectiveMode()`, une seule autorité avec `isSandbox()`), sinon `AI_PROVIDER`
  (`claude` par défaut, `gemini`, `openrouter`, `mock`), relu à chaque appel.
- `getProviderChain()` : le fournisseur principal, puis les autres dans l'ordre `claude → gemini →
  openrouter`. `mock` n'a pas de repli ; `AI_PROVIDER_NO_FALLBACK=1` coupe le repli.
- Erreurs connues : `AIProviderQuotaError` (429), `AIProviderOverloadedError` (503),
  `AIProviderUnavailableError` (modèle retiré, clé invalide : passe au suivant). Nouvelle tentative
  sur 429, 500, 503.
- Recherche web : seuls `claude` et `mock` (`TOOL_CAPABLE_PROVIDERS`) ; jamais de repli silencieux
  vers un fournisseur qui ne sait pas chercher.
- Fin de flux : `USAGE_SENTINEL` porte l'usage, de façon uniforme entre fournisseurs.
- Modèles : cf. [Carte des usages de l'IA](#carte-des-usages-de-lia). Gemini : `GEMINI_MODEL` ; OpenRouter :
  `OPENROUTER_MODEL` (modèles `:free` seulement).
- Local : embeddings `Xenova/multilingual-e5-small` (`embedding.service.ts`), chargés à la demande.

## Carte des usages de l'IA

*Exigences : `FR-EXT-CLAUDE`, `FR-EXT-AI-MULTI-PROVIDER`, `FR-INFRA-COST-LOG-STORE`*

### Trois façons d'appeler

| Fonction | Ce qu'elle rend | Modèle Claude |
|---|---|---|
| `streamChatCompletion` | Du texte au fil de l'eau ; la route le relaie en flux SSE (Server-Sent Events : le serveur pousse des événements) | `CLAUDE_MODEL`, sinon `claude-sonnet-4-6` ; prompt système mis en cache chez Anthropic |
| `collectStreamWithUsage` ([`../server/utils/stream-usage.ts`](../server/utils/stream-usage.ts)) | Le même flux, lu en entier par le serveur, qui répond en JSON `{ data: { …, usage } }` | Idem |
| `classifyWithTool` | Un JSON forcé par un outil (Claude doit remplir un schéma) | `claude-haiku-4-5-20251001`, sauf modèle passé par l'appelant. `CLAUDE_MODEL` n'y joue pas. |

Avec Gemini ou OpenRouter (principal ou repli), chaque fournisseur prend son propre modèle, et le schéma de
`classifyWithTool` est ajouté au message. Changer `CLAUDE_MODEL` ne change donc que les textes, pas les
classements.

### Qui appelle quoi

Types : **SSE** = flux relayé à l'écran ; **JSON** = flux lu par le serveur ; **outil** = `classifyWithTool`.
Sans mention, le modèle est celui de la ligne du tableau précédent.

**Cerveau**

| Usage | Route | Prompt | Type |
|---|---|---|---|
| Configuration du thème depuis un texte libre | `POST /theme/config/parse` | `theme-parse.md` | JSON |
| Stratégie du cocon, une étape (et carte indicative) | `POST /strategy/cocoon/:cocoonSlug/suggest` | selon l'étape : `cocoon-brainstorm`, `cocoon-articles`, `cocoon-articles-topics`, `cocoon-paa-queries`, `cocoon-articles-spe`, `cocoon-add-article` ; `strategy-merge` pour une fusion | JSON |
| Stratégie d'article, une étape | `POST /strategy/:id/suggest` | `strategy-suggest.md` (`strategy-merge.md` pour une fusion) | JSON |
| Approfondir, consolider, enrichir une étape | `POST /strategy/{:id, cocoon/:cocoonSlug}/{deepen, consolidate, enrich}` | `strategy-deepen`, `strategy-consolidate`, `strategy-enrich` | JSON |
| Mots-clés candidats d'un nouvel article, puis leur mesure (DataForSEO) | `POST /cocoons/:cocoonId/child-candidates` | `system-propulsite` + `cocoon-child-keywords` (état du cocon) | JSON |
| Douleur du mot-clé proposé par l'utilisateur, en parallèle de sa mesure | `POST /cocoons/:cocoonId/candidate-measure` | `system-propulsite` + `cocoon-own-keyword` (état du cocon) | JSON |

**Moteur**

| Usage | Route | Prompt | Type |
|---|---|---|---|
| Discovery : filtre de pertinence | `POST /keywords/relevance-score` | écrit dans la route | outil `classify_relevance` |
| Discovery : sélection stratégique | `POST /keywords/analyze-discovery` | écrit dans la route | outil `curate_keywords`, Haiku 4.5 imposé, 8 192 jetons |
| Radar : mots-clés à scanner | `POST /keywords/radar/generate` | `intent-keywords.md` | outil `generate_radar_keywords`, `HAIKU_MODEL` sinon Haiku 4.5 |
| Radar : longues traînes | `POST /articles/:id/radar-exploration/long-tail` | `radar-long-tail-suggest.md` | outil `suggest_long_tail` ; cache `external_api_cache` 7 jours |
| Capitaine : avis de l'IA | `POST /keywords/:keyword/ai-panel` | `capitaine-ai-panel.md` | SSE |
| Capitaine : jugement des questions PAA | `POST /articles/:id/captain/judge-paa` | consigne dans le code + `captain-paa-judge.md` | outil `submit_paa_judgments`, Haiku 4.5 imposé |
| Lieutenants : propositions | `POST /keywords/:keyword/propose-lieutenants` | `propose-lieutenants.md` | SSE (8 192 jetons) |
| Structure : plan H1/H2/H3 | `POST /keywords/:keyword/ai-hn-structure` | `lieutenants-hn-structure.md` (état du cocon) | SSE |
| Lexique : tri des termes | `POST /keywords/:keyword/ai-lexique-upfront` | `lexique-analysis-upfront.md` | SSE (4 096 à 16 384 jetons selon le nombre de termes) |
| Lexique : avis de l'IA | `POST /keywords/:keyword/ai-lexique` | `lexique-ai-panel.md` | SSE ; **aucun appelant** à l'écran ni dans le robot |
| Longueur recommandée | `POST /articles/:id/recommend-word-count` | écrit dans le service | outil `recommend_word_count` ; seulement si la moyenne des concurrents et le sommaire existent |

**Rédaction**

| Usage | Route | Prompt | Type |
|---|---|---|---|
| Lecture critique du brief | `POST /generate/brief-explain` | `brief-ia-panel.md` | SSE |
| Micro-contexte proposé | `POST /generate/micro-context-suggest` | `micro-context-suggest.md` | SSE |
| Thèmes des concurrents | `POST /content-gap/analyze` | écrit dans le service | outil `analyze_content_gap` (après Tavily) |
| Sommaire (robot seulement : l'écran lit la structure du Moteur ; `generateOutline` d'`outline.store` n'a pas d'appelant) | `POST /generate/outline` | `generate-outline.md` | SSE |
| Premier jet | `POST /generate/article-draft` | `system-propulsite` + `generate-article-draft` (état du cocon) | SSE, sans recherche web ; reprise au chapitre coupé, deux fois au plus |
| Passes d'enrichissement, par chapitre | `POST /generate/enrich/:pass` | `enrich-sources`, `-exemples`, `-tableaux`, `-images`, `-faq`, `-resumes` | SSE à un seul `done` ; `sources` avec recherche web (3 recherches au plus, France, ville de la zone) |
| Réécriture d'un chapitre sur consigne | `POST /generate/section-rewrite` | `section-rewrite.md` | SSE à un seul `done` |
| Méta | `POST /generate/meta` | `system-propulsite` + `generate-meta` | JSON |
| Réduction d'une section | `POST /generate/reduce-section` | `system-propulsite` + `reduce-section` | SSE |
| Relecture de la langue, par section | `POST /generate/humanize-section` | `system-propulsite` + `humanize-section` | SSE ; second essai renforcé si la structure HTML n'est pas gardée |
| Actions de l'éditeur sur une sélection | `POST /generate/action` | `system-propulsite` + `actions/<type>` | SSE ; recherche web pour `sources-chiffrees` et `exemples-reels` |
| Champ sémantique du capitaine | `POST /keywords/lexique-suggest` | `lexique-suggest.md` | JSON |

**Mode automatique** (en plus des routes ci-dessus)

| Usage | Route | Prompt | Type |
|---|---|---|---|
| Brief à partir d'une idée | `POST /generate/auto-intake` | `auto-intake.md` | JSON |
| Emplacement dans l'arbre | `POST /generate/placement-suggest` | `auto-placement.md` | JSON |

Hors LLM : la similarité de sens utilisée par le Radar est calculée en local (embeddings, cf. ci-dessus),
gratuitement.

### Coût de chaque appel

Chaque appel rend un `usage` (modèle qui a répondu, jetons, coût estimé par `calculateCost`). Il arrive à la
pile d'activité par le `done` d'un flux SSE (`apiStream`) ou par le champ `usage` d'une réponse JSON
(`pushUsageIfPresent`), avec le libellé de `labelFromUrl` ([`../src/utils/api-label.ts`](../src/utils/api-label.ts)).
Détail : [Intégrations externes](18-integrations.md#retour-du-coût-et-des-erreurs-vers-la-pile-dactivité).

Une recherche web ajoute beaucoup de jetons d'entrée (le texte des pages trouvées) : la passe « sources » est
la plus chère. Les frais propres à la recherche ne sont pas comptés.

Une action qui fait plusieurs appels rend un seul `usage`, additionné : le jugement des PAA
(`captain-paa-judge.service.ts`, un appel par candidat) comme la reprise de la relecture. Une réponse servie
par un cache (longues traînes : `long-tail-suggest.service.ts`) ne rend pas d'`usage` : rien n'a été payé.
Avant le lot 6 (recette du 2026-09-30), ces deux appels ne remontaient pas leur coût.

### Régler les modèles

| Réglage | Effet |
|---|---|
| `CLAUDE_MODEL` | Modèle des flux et des réponses JSON collectées (défaut `claude-sonnet-4-6`) |
| `HAIKU_MODEL` | Modèle des mots-clés à scanner du Radar seulement (défaut `claude-haiku-4-5-20251001`) |
| Argument `model` de `classifyWithTool` | Seul moyen de changer le modèle d'une sortie structurée ; le jugement des PAA et la sélection de Discovery l'imposent en dur |
| `GEMINI_MODEL`, `OPENROUTER_MODEL` | Modèles de ces fournisseurs, principal ou repli. Le défaut Gemini (`gemini-2.0-flash`) n'est plus servi (`FR-EXT-GEMINI` non tenue) |

Liste complète des variables : [Qualités transverses](21-qualites.md).

## Mode simulé / réel

*Exigences : `FR-EXT-DATAFORSEO-SANDBOX`, `NFR-COST-AI-MOCK`*

- [`../server/services/infra/runtime-mode.service.ts`](../server/services/infra/runtime-mode.service.ts) —
  `overrideMode` en mémoire vive (`'mock' | 'real' | null`), perdu au redémarrage. `getEffectiveMode()` :
  l'override, sinon `mock` si `AI_PROVIDER=mock` ou `DATAFORSEO_SANDBOX=true`, sinon `real`.
- API : `GET /api/runtime-mode` (`override`, `effective`, réglages `.env`, `aiProvider` = `getProvider()`),
  `POST /api/runtime-mode` (`{ mode: 'mock' | 'real' | null }`, répond `override`, `effective`, `aiProvider`).
  `aiProvider` nomme le fournisseur dans la confirmation de « Régénérer » l'avis du Capitaine
  (`useAiCallNotice`, FR-CAP-AI-PANEL).
- Consommateurs : `getProvider()` (IA) et `isSandbox()` ([`../server/services/external/dataforseo/_client.ts`](../server/services/external/dataforseo/_client.ts)),
  qui choisit `sandbox.dataforseo.com` ou `api.dataforseo.com`. Tous deux lisent le mode effectif :
  le badge MOCK garantit l'IA simulée **et** le bac à sable. Le plafond de dépense ne s'applique
  pas au bac à sable (`budgetApplicable`).
- Écran : [`../src/stores/ui/runtime-mode.store.ts`](../src/stores/ui/runtime-mode.store.ts) — mémorise le
  choix en `localStorage`, le renvoie au serveur quand celui-ci l'a perdu (redémarrage) et adopte un
  choix posé ailleurs ; se resynchronise au focus et toutes les 15 s (`startAutoResync`) ; bouton de
  `AppNavbar.vue`.
- Robot : `--mode=mock|real` (défaut `mock`) → `POST /runtime-mode` au démarrage, jamais restauré
  ([Mode automatique](06-mode-automatique.md)).
- La simulation d'IA ([`../server/services/external/mock.service.ts`](../server/services/external/mock.service.ts),
  `mock-fixtures/`) reconnaît un flux à des phrases du prompt et une sortie structurée au nom de son outil :
  modifier ces phrases impose de mettre la fixture à jour.
