---
name: prompts-architecture
type: doc
last_updated: 2026-09-25
synced_with:
  - server/utils/prompt-loader.ts (chargeur strict, variables globales)
  - server/services/strategy/prompt-context.service.ts (date, zone, repères triés par zone)
  - server/services/strategy/cocoon-context.service.ts et shared/cocoon-context.ts (état du cocon, {{cocoon_context}})
  - shared/constants/article-type-rules.ts (règles par type, {{type_rules}})
  - docs/prompts-reference.md (inventaire généré)
  - _bmad-output/planning-artifacts/prd.md (FR-INFRA-PROMPT-LAYERS, FR-INFRA-TYPE-RULES-SSOT, FR-INFRA-PROMPT-LOADER, FR-INFRA-COCOON-CONTEXT)
---

# Architecture des prompts

Un prompt, c'est la consigne envoyée à l'IA. Celui qui la rédige se trouve dans la
situation d'un chef qui briefe un pigiste : il faut dire qui il est, ce qu'il
doit savoir, les règles de la maison, ce qu'on attend de lui et sous quelle forme
le rendre. Ce sont les **cinq couches**. L'inventaire complet, avec les variables
et les appelants de chaque prompt, est dans [`prompts-reference.md`](./prompts-reference.md) (généré).

## Les cinq couches

| Couche | Ce qu'elle dit | Où elle vit |
|---|---|---|
| **1. Identité** | Qui écrit, pour qui, avec quel ton | `system-propulsite.md` (générations de texte) ; la première phrase des prompts d'analyse (« Tu es un expert SEO… ») |
| **2. Contexte** | Ce que l'IA doit savoir : date, zone, stratégie, état du cocon, article, mots-clés | Variables globales du chargeur (`{{today}}`, `{{year}}`, `{{zone}}`, `{{zone_landmarks}}`, `{{strategy_context}}`) ; blocs fournis par la route (`{{strategyContext}}`, `{{keywordContext}}`, `{{microContext}}`, `{{themeContext}}`, `{{cocoon_context}}`…) |
| **3. Règles par type** | Ce qu'est un pilier, un intermédiaire, un spécialisé | `{{type_rules}}`, rendu par `describeTypeRules()` depuis `shared/constants/article-type-rules.ts`, la seule table |
| **4. Tâche** | La mission et ses consignes | Le corps du `.md` |
| **5. Contrat de sortie** | La forme attendue, et qui la vérifie | La section « Format de sortie » du `.md` ; les contrats (`shared/contracts/`) qui lisent la réponse ; les vérificateurs (`shared/verifiers/`) qui jugent le résultat aux portes |

### L'état du cocon (`{{cocoon_context}}`, depuis C7)

Un rédacteur qui écrit une page sans connaître le reste du site répète ce que disent les autres pages : c'est ce qui est arrivé au pilier 1013, qui traitait en détail les sujets de ses futurs enfants. Depuis le chantier C7 (2026-09-25), les trois consignes qui **construisent un article** reçoivent le même état du cocon, lu en base au moment de l'appel :

| Consigne | Appelant | Bloc |
|---|---|---|
| `cocoon-child-keywords.md` (mots-clés candidats d'un nouvel article, Cerveau) | `child-candidates.service.ts` → `cocoonContextForNewArticle` | obligatoire |
| `lieutenants-hn-structure.md` (structure de l'article, Moteur) | `keyword-ai-panel.routes.ts` → `cocoonContextForArticle` | `{{#cocoon_context}}…{{/cocoon_context}}` (remplace `{{cocoon_articles}}`, la simple liste des voisins) |
| `generate-article-draft.md` (premier jet, Rédaction) | `article-draft.routes.ts` → `cocoonContextForArticle` | `{{#cocoon_context}}…{{/cocoon_context}}` |

Ce n'est **pas** une globale du chargeur : l'appelant la fournit (le test `prompt-variables` le vérifie). Le texte est rendu par `renderCocoonContext` (`shared/cocoon-context.ts`) : l'arbre (le pilier, ses sections et l'article né de chacune, rédigé ou non), puis, pour l'article visé, la section de son parent dont il naît et ce qu'elle en dit déjà, et ses propres sections qui ont déjà leur article. Exemple, pour l'intermédiaire « Auditer son site web » :

```
## Cocon « Croissance digitale »
- Pilier « Le guide de la croissance digitale » (mot-clé « croissance digitale pme ») — rédigé
  - Section « Audit de site » → intermédiaire « Auditer son site web » (mot-clé « audit site web ») — à rédiger
  - Section « Choisir son hébergeur » → pas encore d'article

## Cet article dans le cocon
- Il naît de la section « Audit de site » de « Le guide de la croissance digitale » (pilier).
  Ce que « Le guide de la croissance digitale » en dit déjà :
  > Un audit repère les pages lentes et les contenus en double…
  Cet article développe en profondeur ce que cette section résume : il ne la répète pas.
```

La passe d'enrichissement « Résumer » (`enrich-resumes.md`) ne reçoit pas cet état, seulement le titre et le mot-clé de l'enfant que le chapitre doit annoncer.

## Le chargeur est strict

`loadPrompt(nom, variables, { cocoonSlug?, escapeKeys? })` (`server/utils/prompt-loader.ts`) :

- **Une variable attendue et absente est une erreur**, comme une variable fournie et inutilisée
  (`PromptTemplateError`, hors production ; journalisée en production). C'est ainsi que le budget
  de mots des sections du pilier 1013 s'était perdu : fourni, jamais attendu, sans que rien ne le dise.
- **Rendu en une passe** : un texte inséré n'est jamais relu (un `{{x}}` tapé par l'utilisateur reste
  du texte) et ses `$&`, `$1` restent tels quels.
- **Sections** : `{{#clé}}…{{/clé}}` est gardé, sans ses marqueurs, si la valeur n'est pas vide ;
  retiré sinon. C'est la seule logique permise dans un `.md` : afficher ou non un bloc.
- **Variables globales** : le chargeur les fournit lui-même quand le prompt les cite, sans que
  l'appelant ait à y penser.

| Globale | Valeur | Source |
|---|---|---|
| `today` | « 25 septembre 2026 » (heure de Paris) | horloge |
| `year` | « 2026 » | horloge |
| `zone` | « Toulouse, France » | `theme_config.avatar.location` |
| `zone_landmarks` | Autres noms de la zone, quartiers et communes, lieux connus — **de la zone du client seulement** | table `local_entities` (les entreprises n'y sont pas reprises) ; depuis le 2026-09-25 (checklist D5), une entité rattachée à une région (`region`) n'est gardée que si la zone nomme cette région, et les entités sans région (le référentiel par défaut, aujourd'hui Toulouse) seulement si la zone nomme l'une de ses régions. Un client à Bordeaux ne reçoit donc aucun repère, plutôt que des quartiers toulousains |
| `strategy_context` | Stratégie validée du cocon | `cocoon_strategies`, si l'appel passe `cocoonSlug` ; ajoutée en fin de prompt si le `.md` ne la cite pas |

- **Contenu utilisateur** : une clé listée dans `escapeKeys` est neutralisée et enveloppée
  (`<user-content>`). Le texte d'un article ou d'une sélection l'est toujours (test d'architecture).

## Ce qu'un `.md` ne contient jamais

- **Une année ou un lieu** : la date et la zone viennent du contexte (test `prompts-no-hardcoded`).
- **Une règle par type** (fourchette de mots, de H2, de candidats) : elle vient de `{{type_rules}}`
  (test `type-rules-ssot`).
- **Un exemple recopiable** : les exemples viennent d'un autre métier et remplacent la ville par
  `[ville]` ; l'IA du Cerveau avait recopié deux fois l'exemple du pilier 1013.

## Ajouter ou modifier un prompt

1. Écrire le `.md` dans `server/prompts/` ; citer les globales et `{{type_rules}}` plutôt que d'écrire
   des dates, des lieux ou des nombres par type.
2. L'appeler par `loadPrompt` avec **exactement** ses variables (test `prompt-variables` : chaque
   appel du serveur est comparé à son `.md`).
3. Ajouter son rôle dans `ROLES` (`scripts/prompts-reference.ts`), puis `npm run docs:prompts`.
4. En mode simulé, les fixtures (`server/services/external/mock-fixtures/`) reconnaissent un appel à
   des phrases du prompt utilisateur (« Section à rédiger », « Propose les meilleurs lieutenants »…) :
   garder ces phrases, ou mettre la fixture à jour.
