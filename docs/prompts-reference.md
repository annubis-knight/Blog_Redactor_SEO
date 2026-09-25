# Référence des prompts — Blog Redactor SEO

> **Fichier généré** par `npm run docs:prompts` (`scripts/prompts-reference.ts`) : ne pas l’éditer à la main.
> Un test (`tests/unit/architecture/prompts-reference.test.ts`) vérifie qu’il est à jour.
> Architecture (couches, chargeur strict, variables globales) : [`prompts-architecture.md`](./prompts-architecture.md).

49 prompts. Variables globales, fournies par le chargeur quand un prompt les cite : `strategy_context`, `today`, `year`, `zone`, `zone_landmarks`.

Colonnes : **Variables** = à fournir par l’appelant, exactement (le chargeur refuse une variable manquante ou en trop) ; **Sections** = blocs `{{#clé}}…{{/clé}}` gardés si la valeur n’est pas vide.

## Système

| Prompt | Rôle | Variables | Sections | Globales | Chargé par |
|---|---|---|---|---|---|
| `system-propulsite.md` | Identité et règles d’écriture (ton, SEO, GEO, liste noire) ; prompt système des générations de texte | — | `zone`, `zone_landmarks` | `today`, `year`, `zone`, `zone_landmarks` | `server/routes/generate/action.routes.ts`, `server/routes/generate/article-draft.routes.ts`, `server/routes/generate/humanize-section.routes.ts`, `server/routes/generate/meta.routes.ts`, `server/routes/generate/reduce-section.routes.ts`, `server/services/article/enrichment.service.ts`, `server/services/strategy/child-candidates.service.ts` |

## Cerveau — stratégie et cocon

| Prompt | Rôle | Variables | Sections | Globales | Chargé par |
|---|---|---|---|---|---|
| `cocoon-add-article.md` | Un seul article complémentaire, du type demandé | `articleType`, `cocoonName`, `existingArticles`, `isIntermediaire`, `isPilier`, `isSpecialise`, `previousAnswers`, `siloName`, `themeContext`, `userInput` | `isIntermediaire`, `isPilier`, `isSpecialise`, `previousAnswers`, `themeContext`, `userInput` | `year` | `server/services/strategy/strategy-prompts.service.ts` |
| `cocoon-articles.md` | Structure du cocon : le Pilier et les Intermédiaires | `cocoonName`, `existingArticles`, `previousAnswers`, `siloName`, `themeContext`, `topicSuggestions` | `existingArticles`, `previousAnswers`, `themeContext`, `topicSuggestions` | `year` | `server/services/strategy/strategy-prompts.service.ts` |
| `cocoon-articles-spe.md` | Articles Spécialisés, nourris des PAA récupérées | `articles`, `cocoonName`, `paaContext`, `previousAnswers`, `siloName`, `themeContext` | `paaContext`, `previousAnswers`, `themeContext` | `year` | `server/services/strategy/strategy-prompts.service.ts` |
| `cocoon-articles-topics.md` | Sujets et sous-thèmes à couvrir dans le cocon | `cocoonName`, `existingArticles`, `previousAnswers`, `siloName`, `themeContext` | `existingArticles`, `previousAnswers`, `themeContext` | — | `server/services/strategy/strategy-prompts.service.ts` |
| `cocoon-brainstorm.md` | Suggestion pour une étape de la stratégie du cocon | `cocoonName`, `currentInput`, `existingArticles`, `previousAnswers`, `siloName`, `step`, `stepDescription`, `themeContext` | `existingArticles`, `previousAnswers`, `themeContext` | — | `server/services/strategy/strategy-prompts.service.ts` |
| `cocoon-child-keywords.md` | 3 à 5 mots-clés candidats pour un nouvel article (pilier, ou enfant d’une section de son parent), mesurés ensuite | `articleLevel`, `cocoon_context`, `parentSection`, `type_rules` | `parentSection` | `strategy_context` | `server/services/strategy/child-candidates.service.ts` |
| `cocoon-paa-queries.md` | Requêtes Google pour récupérer les PAA de chaque Intermédiaire | `articles`, `cocoonName`, `previousAnswers`, `siloName`, `themeContext` | `previousAnswers`, `themeContext` | — | `server/services/strategy/strategy-prompts.service.ts` |
| `strategy-consolidate.md` | Consolide la réponse principale et les sous-réponses | `contextBlock`, `mainAnswer`, `step`, `subAnswers` | — | — | `server/services/strategy/strategy-prompts.service.ts` |
| `strategy-deepen.md` | Propose une sous-question pour approfondir une étape | `contextBlock`, `existingSubQuestions`, `mainAnswer`, `mainQuestion`, `previousAnswers`, `step` | — | — | `server/services/strategy/strategy-prompts.service.ts` |
| `strategy-enrich.md` | Enrichit le texte validé avec une sous-réponse | `contextBlock`, `existingValidated`, `step`, `subAnswer`, `subQuestion` | — | — | `server/services/strategy/strategy-prompts.service.ts` |
| `strategy-merge.md` | Fusionne le texte de l’utilisateur et la suggestion IA (article ou cocon) | `aiSuggestion`, `articleTitle`, `cocoonName`, `existingValidatedBlock`, `hasExistingValidated`, `noExistingValidated`, `previousAnswersBlock`, `siloName`, `step`, `stepDescription`, `themeContextBlock`, `userInput` | `hasExistingValidated`, `noExistingValidated` | — | `server/services/strategy/strategy-prompts.service.ts` |
| `strategy-suggest.md` | Suggestion pour une étape de la stratégie d’article (cible, douleur, angle…) | `articleTitle`, `cocoonName`, `currentInput`, `existingArticles`, `previousAnswers`, `siloName`, `step`, `stepDescription`, `themeContext` | `existingArticles`, `previousAnswers`, `stepDescription`, `themeContext` | — | `server/services/strategy/strategy-prompts.service.ts` |
| `theme-parse.md` | Transforme une description libre de l’entreprise en configuration structurée | — | — | — | `server/routes/silos.routes.ts` |

## Moteur — mots-clés

| Prompt | Rôle | Variables | Sections | Globales | Chargé par |
|---|---|---|---|---|---|
| `capitaine-ai-panel.md` | Avis d’expert sur le candidat capitaine | `keyword`, `level`, `marketScore`, `painPoint`, `relevanceScore` | — | `strategy_context` | `server/routes/keyword-ai-panel.routes.ts` |
| `captain-paa-judge.md` | Juge la pertinence des PAA du capitaine face à la douleur | `article_title`, `keyword`, `paa_list_formatted`, `pain_intent_expected`, `pain_point` | — | — | `server/services/keyword/captain-paa-judge.service.ts` |
| `intent-keywords.md` | Mots-clés courts pour chercher les PAA (Radar) | `keyword`, `painPoint`, `title` | — | — | `server/services/keyword/keyword-radar.service.ts` |
| `lexique-ai-panel.md` | Avis d’expert sur les termes TF-IDF | `differenciateur_terms`, `keyword`, `level`, `obligatoire_terms`, `optionnel_terms`, `painPoint` | — | `strategy_context` | `server/routes/keyword-ai-panel.routes.ts` |
| `lexique-analysis-upfront.md` | Recommande ou écarte chaque terme TF-IDF, avec une raison | `differenciateur_terms`, `keyword`, `level`, `obligatoire_terms`, `optionnel_terms`, `painPoint` | — | `strategy_context` | `server/routes/keyword-ai-panel.routes.ts` |
| `lexique-suggest.md` | Champ sémantique du capitaine (termes attendus) | `articleTitle`, `capitaine`, `cocoonName`, `painPoint` | — | — | `server/routes/keywords.routes.ts` |
| `lieutenants-hn-structure.md` | Structure H2/H3 à partir des lieutenants retenus | `cocoon_context`, `hn_structure`, `keyword`, `level`, `lieutenants`, `locked_headings`, `painPoint`, `type_rules` | `cocoon_context` | `strategy_context` | `server/routes/keyword-ai-panel.routes.ts` |
| `propose-lieutenants.md` | Candidats lieutenants depuis SERP, PAA, racines et groupes de mots | `existing_lieutenants`, `hn_recurrence`, `keyword`, `level`, `paa_questions`, `painPoint`, `root_keywords`, `root_keywords_serp_data`, `serp_competitors`, `type_rules`, `word_groups` | — | — | `server/routes/keyword-ai-panel.routes.ts` |
| `radar-long-tail-suggest.md` | Longues traînes scorées à partir des racines du Radar | `article_pain_point`, `article_title`, `candidate_combinations`, `radar_keywords_with_kpis` | — | `strategy_context` | `server/services/keyword/long-tail-suggest.service.ts` |

## Rédaction

| Prompt | Rôle | Variables | Sections | Globales | Chargé par |
|---|---|---|---|---|---|
| `brief-ia-panel.md` | Lecture critique du brief complet | `articleTitle`, `articleType`, `cocoonArticles`, `cocoonName`, `hnStructure`, `keyword`, `keywords`, `lexique`, `microContext`, `paaQuestions`, `topCompetitors` | — | — | `server/routes/generate/brief-explain.routes.ts` |
| `enrich-exemples.md` | Passe exemples : ajoute un exemple en situation à un chapitre | `articleText`, `chapterHtml`, `keyword`, `keywords`, `strategyContext` | `strategyContext`, `zone`, `zone_landmarks` | `zone`, `zone_landmarks` | `server/services/article/enrichment.service.ts` |
| `enrich-faq.md` | Passe FAQ : écrit le chapitre « Questions fréquentes » de l’article | `articleText`, `keyword`, `keywords`, `strategyContext`, `type_rules` | `strategyContext` | — | `server/services/article/enrichment.service.ts` |
| `enrich-images.md` | Passe images : place une image à fournir et son texte alternatif | `articleText`, `chapterHtml`, `imageSrc`, `keyword`, `keywords`, `strategyContext` | `strategyContext` | — | `server/services/article/enrichment.service.ts` |
| `enrich-sources.md` | Passe sources : remplace les « à sourcer » d’un chapitre par des données trouvées par la recherche web, liens réels | `articleText`, `chapterHtml`, `keyword`, `keywords`, `strategyContext` | `strategyContext`, `zone` | `today`, `zone` | `server/services/article/enrichment.service.ts` |
| `enrich-tableaux.md` | Passe tableaux : ajoute un tableau quand le chapitre compare ou énumère | `articleText`, `chapterHtml`, `keyword`, `keywords`, `strategyContext` | `strategyContext` | — | `server/services/article/enrichment.service.ts` |
| `generate-article-draft.md` | Premier jet de l’article entier en un appel, sans recherche web ; chiffres posés « à sourcer » | `articleTitle`, `articleType`, `cocoonName`, `cocoon_context`, `continuation`, `keyword`, `keywordContext`, `microContext`, `outlinePlan`, `previousText`, `secondaryKeywords`, `strategyContext`, `type_rules`, `wordCountBudget` | `cocoon_context`, `continuation` | — | `server/routes/generate/article-draft.routes.ts` |
| `generate-meta.md` | Meta title et meta description | `articleContent`, `articleTitle`, `keyword` | — | — | `server/routes/generate/meta.routes.ts` |
| `generate-outline.md` | Sommaire H1/H2/H3 en JSON (prompt système du sommaire) | `articleTitle`, `articleType`, `cocoonName`, `competitorStructure`, `keyword`, `keywordContext`, `microContext`, `paaQuestions`, `secondaryKeywords`, `strategyContext`, `theme`, `type_rules` | — | — | `server/routes/generate/outline.routes.ts` |
| `humanize-section.md` | Relecture d’une section : retire les tics d’écriture IA, corrige la langue (franglais, accords, typographie) | `keyword`, `keywords`, `reinforcement`, `sectionHtml`, `sectionTitle` | — | — | `server/routes/generate/humanize-section.routes.ts` |
| `micro-context-suggest.md` | Angle, ton et consignes proposés pour l’article | `articleTitle`, `articleType`, `cocoonName`, `keyword`, `siloName`, `themeConfig` | `strategy_context` | `strategy_context` | `server/routes/generate/micro-context-suggest.routes.ts` |
| `reduce-section.md` | Raccourcit une section en gardant structure et SEO | `currentWordCount`, `keyword`, `keywords`, `sectionHtml`, `sectionTitle`, `strategyContext`, `targetWordCount` | — | — | `server/routes/generate/reduce-section.routes.ts` |
| `section-rewrite.md` | Réécrit un chapitre selon une consigne, en voyant l’article entier | `articleText`, `chapterHtml`, `instruction`, `keyword`, `keywords`, `strategyContext` | `strategyContext` | — | `server/services/article/enrichment.service.ts` |

## Actions contextuelles

| Prompt | Rôle | Variables | Sections | Globales | Chargé par |
|---|---|---|---|---|---|
| `actions/add-statistic.md` | Ajouter une statistique sourcée | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/answer-capsule.md` | Capsule réponse pour l’extraction par les IA | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/ce-quil-faut-retenir.md` | Bloc « Ce qu’il faut retenir » | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/convert-list.md` | Convertir un paragraphe en liste | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/exemples-reels.md` | Bloc « Exemples réels » (recherche web) | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/keyword-optimize.md` | Intégrer le mot-clé naturellement | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/pme-example.md` | Exemple « grande marque → PME » | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/question-heading.md` | Transformer un titre en question | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/reformulate.md` | Reformuler la sélection | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/simplify.md` | Simplifier le vocabulaire | `keywordInstruction`, `selectedText` | — | — | `server/routes/generate/action.routes.ts` |
| `actions/sources-chiffrees.md` | Bloc « Sources chiffrées » (recherche web) | `keywordInstruction`, `selectedText` | — | `year` | `server/routes/generate/action.routes.ts` |

## Mode automatique

| Prompt | Rôle | Variables | Sections | Globales | Chargé par |
|---|---|---|---|---|---|
| `auto-intake.md` | Brief éditorial structuré à partir d’une idée | `articleType`, `businessContext`, `cocoonName`, `topic` | — | — | `server/routes/generate/auto-intake.routes.ts` |
| `auto-placement.md` | Place un nouvel article dans l’arborescence | `articleTitle`, `businessContext`, `candidates`, `idea`, `painPoint`, `pilierKeyword` | — | — | `server/routes/generate/placement-suggest.routes.ts` |
