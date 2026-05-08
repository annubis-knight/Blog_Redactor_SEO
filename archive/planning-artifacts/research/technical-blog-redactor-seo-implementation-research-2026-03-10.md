---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - domain-bonnes-pratiques-seo-2026-research-2026-03-10.md
  - domain-seo-technique-research-2026-03-10.md
  - domain-content-seo-vs-geo-research-2026-03-10.md
  - domain-preparer-blog-geo-2026-research-2026-03-10.md
  - prd.md
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Blog Redactor SEO - Implementation technique des 8 axes identifies'
research_goals: 'Deep-dive implementation pour scoring SEO/GEO, Schema Markup, DataForSEO API, Claude API prompt engineering, maillage interne, TipTap editor, llms.txt'
user_name: 'arnau'
date: '2026-03-10'
web_research_enabled: true
source_verification: true
---

# Blog Redactor SEO : Recherche Technique d'Implementation — Rapport Complet

**Date :** 2026-03-10
**Auteur :** arnau
**Type :** Recherche technique (deep-dive implementation)

---

## Resume Executif

Ce rapport de recherche technique couvre les 8 axes d'implementation identifies a partir de 4 rapports de recherche domaine (SEO 2026, SEO technique, Content SEO vs GEO, Preparer son blog pour le GEO) et du PRD de Blog Redactor SEO. Chaque axe fait l'objet d'un deep-dive avec algorithmes, exemples de code TypeScript, estimations de couts, et recommandations d'implementation concretement applicables au projet.

**Resultats cles :**

- **Scoring SEO** : ponderation composite inspiree de Surfer SEO/Clearscope avec 8 facteurs, saturation BM25 pour eviter la sur-optimisation, Web Workers pour le calcul off-thread
- **Scoring GEO** : framework 4 piliers (Entity, Extractability, Trust, Freshness), metriques de citabilite LLM (blocs 50-150 mots = 2.3x plus de citations IA), densite d'entites cible 20.6%
- **Schema JSON-LD** : Article + FAQPage + BreadcrumbList systematiques. FAQPage reste critique pour l'IA (3.2x plus de citations AI Overviews) malgre la perte de rich results Google
- **DataForSEO** : cout optimise ~$1.82 pour 100 mots-cles (fusion SERP+PAA en 1 appel Advanced). Minimum $50 suffit largement
- **Claude API** : cout ~0.13 EUR/article avec Sonnet 4.6 (bien sous les 0.50 EUR cibles). Prompt caching sur le system prompt = -90% sur l'input recurrent
- **llms.txt** : standard emergent (600+ sites adopteurs). Cout d'implementation minime, ratio benefice/effort favorable
- **TipTap** : architecture actuelle solide. Ameliorations : NodeViews Vue pour blocs speciaux, debounce getHTML(), multiple BubbleMenus contextuels
- **Maillage interne** : scoring multi-criteres (keyword matching + hierarchie cocon + similarite), analyse de graphe (BFS profondeur, orphelins, couverture), reconciliation d'ancres

---

## Table des Matieres

1. [Moteur de scoring SEO temps reel](#1-moteur-de-scoring-seo-temps-reel)
2. [Moteur de scoring GEO temps reel](#2-moteur-de-scoring-geo-temps-reel)
3. [Generation automatique de Schema Markup JSON-LD](#3-generation-automatique-de-schema-markup-json-ld)
4. [Integration API DataForSEO](#4-integration-api-dataforseo)
5. [Prompt engineering pour contenu SEO-native avec Claude API](#5-prompt-engineering-pour-contenu-seo-native-avec-claude-api)
6. [llms.txt et accessibilite aux crawlers IA](#6-llmstxt-et-accessibilite-aux-crawlers-ia)
7. [Editeur TipTap/ProseMirror — Extensions custom](#7-editeur-tiptapprosemirror--extensions-custom)
8. [Maillage interne intelligent](#8-maillage-interne-intelligent)
9. [Synthese et recommandations strategiques](#9-synthese-et-recommandations-strategiques)
10. [Sources et references](#10-sources-et-references)

---

## 1. Moteur de scoring SEO temps reel

### 1.1 Algorithmes de densite de mots-cles

#### Seuils recommandes (2026)

En 2026, la densite de mots-cles reste un indicateur garde-fou, pas un facteur de classement direct. Aucune correlation consistante n'a ete trouvee entre densite et classement (etude 1 500 resultats Google). L'autorite topique est le facteur on-page le plus fort.

| Type de mot-cle | Densite min | Densite max | Implementation actuelle | Ajustement |
|---|---|---|---|---|
| Pilier | 1.0% | 2.5% | 1.5-2.5% | Baisser le min a 1.0% |
| Moyenne traine | 0.5% | 1.5% | 0.8-1.5% | Baisser le min a 0.5% |
| Longue traine | 0.2% | 0.8% | 0.3-0.8% | Baisser le min a 0.2% |

_Sources : [Koanthic](https://koanthic.com/en/optimal-keyword-density/), [BrightForge](https://brightforge.com.ph/blog/keyword-density-in-2026-dead-metric-or-misunderstood-signal/), [Rankability](https://www.rankability.com/ranking-factors/google/keyword-density/)_

#### Approche BM25 (amelioration recommandee)

BM25 introduit une fonction de saturation qui penalise les repetitions excessives au lieu de les recompenser lineairement. Les premieres mentions d'un mot-cle comptent beaucoup, mais la 20e mention n'apporte quasi rien de plus que la 19e.

```typescript
export function bm25SaturationScore(
  termFrequency: number,
  docLength: number,
  avgDocLength: number,
  k1: number = 1.2,
  b: number = 0.75,
): number {
  const tf = termFrequency
  const lengthNorm = 1 - b + b * (docLength / avgDocLength)
  const saturatedTf = (tf * (k1 + 1)) / (tf + k1 * lengthNorm)
  return saturatedTf / (k1 + 1) // Normalise sur 0-1
}
```

NEURONwriter utilise une approche similaire combinant TF-IDF et BM25 pour mesurer la pertinence reelle du contenu.

_Sources : [Wikipedia/Okapi BM25](https://en.wikipedia.org/wiki/Okapi_BM25), [Elastic Blog](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables), [NEURONwriter](https://neuronwriter.com/how-neuronwriter-uses-tf-idf-bm25-to-measure-true-content-relevance/)_

### 1.2 Verification du placement strategique

Poids par emplacement pour le scoring :

| Emplacement | Poids | Justification |
|---|---|---|
| Meta Title | 0.25 | Emplacement le plus important pour Google |
| H1 | 0.20 | Fortement pondere par les crawlers |
| Introduction (100 premiers mots) | 0.20 | Signal de pertinence immediat |
| H2s | 0.15 | Distribution dans les sous-sections |
| Meta Description | 0.10 | Impact indirect (CTR) |
| Conclusion | 0.10 | Presence en fin d'article |

_Sources : [SEOWriting.ai](https://seowriting.ai/blog/where-to-place-seo-keywords), [ScaleMath](https://scalemath.com/blog/h1-tag/)_

### 1.3 Validation de la hierarchie Hn

Regles implementees : H1 unique, pas de saut de niveau (H2→H4 interdit), detection headings vides, alerte profondeur excessive (H5/H6).

_Sources : [SEO Review Tools](https://www.seoreviewtools.com/html-headings-checker/), [Conductor](https://www.conductor.com/academy/headings/)_

### 1.4 NLP terms / termes semantiques

Detection amelioree avec scoring par importance (volume de recherche) et categorisation par couverture. Score de couverture NLP pondere par log(volume+1) pour prioriser les termes a fort volume.

_Sources : [DataForSEO APIs](https://dataforseo.com/apis), [DataForSEO AI Optimization](https://dataforseo.com/apis/ai-optimization-api)_

### 1.5 Score composite SEO

#### Ponderations des outils existants

- **Surfer SEO** : 500+ signaux, poids sur la True Density et l'emplacement. Score >66 = pret a publier
- **Clearscope** : frequence/placement des termes, couverture semantique, exhaustivite vs concurrents. Notation A++ a F
- **Frase** : TF-IDF, topic modeling, evaluation d'entites

#### Ponderation recommandee pour Blog Redactor SEO

```typescript
export const SEO_SCORE_WEIGHTS_V2 = {
  keywordPilier: 0.20,     // Densite mot-cle principal
  keywordSecondary: 0.10,  // Densite mots-cles secondaires
  nlpCoverage: 0.15,       // Couverture des termes NLP/semantiques
  placementScore: 0.15,    // Placement strategique dans les zones cles
  heading: 0.15,           // Hierarchie des titres
  metaTitle: 0.10,         // Optimisation du title tag
  metaDescription: 0.05,   // Optimisation de la meta description
  contentLength: 0.10,     // Longueur du contenu vs cible
} as const // Total = 1.0
```

_Sources : [Surfer SEO Docs](https://docs.surferseo.com/en/articles/5700317-what-is-content-score), [Clearscope](https://www.clearscope.io/support/how-does-clearscope-grade-your-content), [Search Engine Land](https://searchengineland.com/content-scoring-tools-work-but-only-for-the-first-gate-in-googles-pipeline-469871)_

### 1.6 Performance du calcul temps reel

- **Debounce 300ms** via `@vueuse/core` (deja implemente). TipTap recommande minimum 500ms pour `getHTML()`
- **Web Workers** recommandes pour les articles >5000 mots avec beaucoup de termes NLP. Calcul SEO off-thread via `new Worker()`
- **Calcul incremental** : ne recalculer que les sections modifiees (transactions ProseMirror)
- **Cache intermediaire** : stocker le texte brut extrait et ne le re-extraire que si le HTML change

_Sources : [TipTap GitHub #2447](https://github.com/ueberdosis/tiptap/issues/2447), [LogRocket](https://blog.logrocket.com/optimizing-vue-js-apps-web-workers/)_

---

## 2. Moteur de scoring GEO temps reel

### 2.1 Answer capsules

Paragraphe concis (40-60 mots) place apres chaque H2, repondant directement a la question posee. Les pages avec cette technique ont un **taux de citation IA 40% superieur**.

Detection amelioree : plage 20-60 mots, doit etre declaratif (pas interrogatif), pas de meta-discours ("je vais", "dans cet article"). Qualite : optimal / acceptable / missing.

_Sources : [Backlinko](https://backlinko.com/generative-engine-optimization-geo), [ToTheWeb](https://totheweb.com/blog/beyond-seo-your-geo-checklist-mastering-content-creation-for-ai-search-engines/)_

### 2.2 Titres en questions

Detection via ponctuation (`?`) et patterns interrogatifs francais (comment, pourquoi, quand, ou, quel, combien, faut-il, peut-on, doit-on). Cible : 70%+ des H2/H3.

Les H2 en questions matchent directement les requetes conversationnelles de ChatGPT et Gemini.

_Sources : [Search Engine Land](https://searchengineland.com/what-is-generative-engine-optimization-geo-444418), [Matrix Marketing Group](https://matrixmarketinggroup.com/how-to-rank-in-ai-overviews-geo-aeo-strategy-guide/)_

### 2.3 Statistiques sourcees

L'ajout de statistiques sourcees ameliore la visibilite de **+40% en moyenne** (etude Princeton GEO). L'ajout de citations de sources fiables : **+30-40%**.

8 patterns regex couvrant : pourcentages avec source, "selon/d'apres", references d'etudes, chiffres absolus, citations academiques inline.

_Sources : [arXiv GEO paper](https://arxiv.org/pdf/2311.09735), [SEO.ai](https://seo.ai/blog/generative-engine-optimization-geo)_

### 2.4 Longueur des paragraphes

| Seuil | Mots | Usage |
|---|---|---|
| Optimal | 60 | Longueur ideale pour l'extractibilite IA |
| Warning | 80 | Seuil d'alerte |
| Critical | 120 | Paragraphe problematique |

_Sources : [Onely](https://www.onely.com/blog/llm-friendly-content/), [Averi.ai](https://www.averi.ai/breakdowns/the-definitive-guide-to-llm-optimized-content)_

### 2.5 Detection de jargon corporate

Dictionnaire etendu avec niveaux de severite (high/medium/low) : 25+ termes FR/EN avec suggestions de reformulation. Approche dictionnaire statique = la plus performante pour le calcul temps reel.

_Sources : [IBTimes](https://www.ibtimes.com/study-reveals-most-annoying-corporate-jargon-why-employees-cant-stand-it-3756947)_

### 2.6 Score composite GEO

Framework 4 piliers GenOptima (Entity, Extractability, Trust, Freshness) :
- 85-100 : Excellent
- 65-84 : Bon
- 40-64 : Modere
- 0-39 : Critique

```typescript
export const GEO_SCORE_WEIGHTS_V2 = {
  extractibility: 0.25,    // Structure, paragraphes courts, listes
  questionHeadings: 0.20,  // H2/H3 en format question
  answerCapsules: 0.20,    // Reponses directes apres chaque H2
  sourcedStats: 0.15,      // Statistiques avec sources
  factualDensity: 0.10,    // Densite de faits verifiables
  readabilityScore: 0.10,  // Score de lisibilite
} as const // Total = 1.0
```

_Sources : [GenOptima](https://www.gen-optima.com/geo/the-4-pillar-geo-framework-entity-extractability-trust-freshness/), [eSEOspace](https://eseospace.com/blog/geo-content-score-how-to-measure-ai-visibility/)_

### 2.7 Citabilite par les LLMs

Metriques techniques cles validees par la recherche :

| Metrique | Impact | Source |
|---|---|---|
| Blocs citables 50-150 mots auto-suffisants | **2.3x plus de citations** | [Visibility Stack](https://www.visibilitystack.ai/academy/content-engineering/how-ai-models-decide-what-content-to-cite) |
| Densite d'entites ~20.6% | Standard du contenu cite | [Victorino Group](https://victorinollc.com/thinking/llm-citation-attention-patterns) |
| Formulations definitives ("X est defini comme") | **36.2% vs 20.2%** de taux de citation | [Discovered Labs](https://discoveredlabs.com/blog/content-clarity-and-verifiability-the-technical-patterns-that-drive-llm-citations) |
| Listes et tableaux | **2.5x plus souvent cites** | [Averi.ai](https://www.averi.ai/breakdowns/the-definitive-guide-to-llm-optimized-content) |
| Longueur extractible optimale | **40-60 mots** | [Averi.ai](https://www.averi.ai/learn/content-formats-win-llms-snippets-qa-tables-structured-outputs) |

Implementation recommandee : score de citabilite composite mesurant blocs citables, densite d'entites, formulations definitives, elements structures, blocs snippet-ready.

---

## 3. Generation automatique de Schema Markup JSON-LD

### 3.1 Schema Article (BlogPosting)

Aucune propriete obligatoire selon Google. Recommandees : headline, image (3 ratios 16:9, 4:3, 1:1), author, datePublished, dateModified. Format JSON-LD recommande par Google. Les pages avec structured data obtiennent **30% plus de clics**.

### 3.2 Schema FAQPage

**Aout 2023** : Google a restreint les rich results FAQ aux sites gouvernementaux/sante. **Mais** le FAQ schema est devenu critique pour les moteurs IA :
- **3.2x plus susceptible** d'apparaitre dans les AI Overviews
- **28% de taux de citation en plus** avec structured data correct

Extraction automatique : H2/H3 en questions + premier paragraphe comme reponse. Limitation recommandee : 5-10 questions par page, reponses de 40-60 mots.

_Sources : [Frase.io](https://www.frase.io/blog/faq-schema-ai-search-geo-aeo), [Google Search Central](https://developers.google.com/search/blog/2023/08/howto-faq-changes)_

### 3.3 Schema BreadcrumbList

Hierarchie : PropulSite > Blog > Cocon > Article. Doit correspondre exactement a la navigation visible. Generer cote serveur, pas en client-side.

### 3.4 Schema HowTo

Google a retire les HowTo rich results (sept 2023). Utile uniquement pour la comprehension par les IA. Detection automatique : listes ordonnees (ol) avec 3+ elements ou headings numerotes.

### 3.5 Validation

- **Compile-time** : `schema-dts` (package npm maintenu par Google) pour les types TypeScript
- **Runtime** : `schemaorg-jsd` pour la validation au runtime

### 3.6 Impact sur les AI Overviews

| Metrique | Impact |
|---|---|
| Visibilite dans AI Overviews avec structured data | **+30%** |
| Probabilite de citation AIO avec schema markup | **3x plus** |
| Selection multimodale (texte+images+schema) | **+317% citations** |
| FAQ schema → citation AIO | **60% plus probable** |
| Pages sous position 5 citees dans AIO | **47%** |

_Sources : [Wellows](https://wellows.com/blog/google-ai-overviews-ranking-factors/), [Dataslayer](https://www.dataslayer.ai/blog/google-ai-overviews-the-end-of-traditional-ctr-and-how-to-adapt-in-2025), [WriteSonic](https://writesonic.com/blog/structured-data-in-ai-search)_

---

## 4. Integration API DataForSEO

### 4.1 Endpoints pertinents

| Endpoint | Usage | Cout |
|---|---|---|
| SERP Live Advanced | Top 10 resultats + PAA en 1 appel | **$0.003**/requete |
| Related Keywords | Termes semantiques lies, NLP terms | **$0.015**/tache (~50 items) |
| Keyword Overview (batch) | Volume, CPC, difficulte pour 100 KW | **$0.02** total |

**Optimisation majeure** : fusionner `fetchSerp()` et `fetchPaa()` en un seul appel SERP Advanced (les PAA sont inclus dans les items avec `type: "people_also_ask"`). Reduit le cout de 40% sur l'endpoint SERP.

**Nouveaute 2025** : champ `seed_question` et type `people_also_ask_ai_overview_expanded_element` pour les reponses AI Overviews dans les PAA.

### 4.2 Cout optimise pour 54 articles (~100 mots-cles)

| Endpoint | Appels | Sous-total |
|---|---|---|
| SERP Live Advanced (SERP + PAA) | 100 | **$0.30** |
| Related Keywords | 100 | **$1.50** |
| Keyword Overview (batch 100) | 1 | **$0.02** |
| **TOTAL optimise** | | **$1.82** |

Minimum de paiement : $50. Avec $50, on peut traiter ~1 660 mots-cles.

### 4.3 Strategie de cache

- TTL 30 jours (les donnees SEO changent lentement)
- Index de cache : fichier `cache-index.json` listant tous les mots-cles caches avec date
- Fallback vers cache expire si l'API echoue (stale cache avec warning)

### 4.4 Gestion des erreurs

- `Promise.allSettled()` pour les 4 endpoints en parallele (degradation gracieuse)
- Retry exponential backoff sur 429 et 503 (1s, 2s, 4s, max 3 retries)
- `AbortController` avec timeout 30s par requete

_Sources : [DataForSEO API Docs](https://docs.dataforseo.com/v3/), [DataForSEO Pricing](https://dataforseo.com/pricing/serp/google-organic-serp-api)_

---

## 5. Prompt engineering pour contenu SEO-native avec Claude API

### 5.1 Architecture des prompts

- **System prompt** : identite (redacteur web senior SEO/GEO), regles redactionnelles (vouvoiement, pattern grandes marques → PME, donnees chiffrees, paragraphes courts), integration SEO invisible, directives GEO. Regle d'incertitude pour eviter les hallucinations
- **User prompt** : balises XML (`<brief>`, `<sommaire_valide>`, `<questions_paa>`, `<consignes>`, `<format_sortie>`) pour la separation semantique. Claude les interprete comme des frontieres de preoccupations
- **Contenu naturel** : instruire la naturalite AVANT le SEO. Densite implicite (cible 1-2%) plutot que nombre de repetitions. Validation negative ("Ne force JAMAIS un mot-cle")

_Sources : [Anthropic Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [Clearscope](https://www.clearscope.io/blog/prompt-engineering-for-seo-content)_

### 5.2 Streaming et generation longue

- **Prompt caching** : `cache_control: { type: 'ephemeral' }` sur le system prompt. Le system prompt Propulsite est identique pour les 54 articles → les appels suivants (fenetre 5 min) coutent seulement 10% du prix d'input pour ce bloc
- **SSE** : headers `Content-Type: text/event-stream`, heartbeat toutes les 15s pour eviter les timeouts proxy, events nommes (`chunk`, `done`, `error`)
- **Injection TipTap** : accumuler le HTML complet et remplacer le contenu via `editor.commands.setContent()` avec `requestAnimationFrame`

### 5.3 Cout par article (Sonnet 4.6)

| Etape | Input tokens | Output tokens | Cout |
|---|---|---|---|
| Generation sommaire | ~2 000 | ~800 | $0.018 |
| Generation article | ~3 000 | ~4 000 | $0.069 |
| Generation meta | ~4 500 | ~100 | $0.015 |
| 3 actions contextuelles | ~4 500 | ~1 500 | $0.036 |
| **TOTAL par article** | | | **~$0.14 (~0.13 EUR)** |

**Total 54 articles** : 7.00 EUR sans optimisation, **3.00 EUR avec caching + Haiku pour metas + Batch API**.

### 5.4 Choix du modele par tache

```typescript
const MODEL_BY_TASK = {
  'generate-outline': 'claude-sonnet-4-6',
  'generate-article': 'claude-sonnet-4-6',
  'generate-meta': 'claude-haiku-4-5-20251001',   // -66% de cout
  'action-simple': 'claude-haiku-4-5-20251001',
  'action-complex': 'claude-sonnet-4-6',
}
```

### 5.5 Validation automatique de qualite

Validateur post-generation verifiant : nombre de mots, answer capsules, ratio questions, statistiques sourcees, longueur paragraphes, placement mots-cles, vouvoiement/tutoiement. Score 0-100 avec issues et warnings.

_Sources : [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)_

---

## 6. llms.txt et accessibilite aux crawlers IA

### 6.1 llms.txt

Standard propose par Jeremy Howard (2024). Fichier Markdown a la racine du site (`/llms.txt`) fournissant un index structure des ressources, optimise pour les LLMs.

**Fichiers compagnons** :
- `/llms.txt` : index structure (~1-2 Ko)
- `/llms-full.txt` : contenu complet de tous les articles en Markdown
- `page.html.md` : version Markdown de chaque page HTML

**Adoption** : 600+ sites (Perplexity, Anthropic, Cursor, Stripe, Cloudflare, Hugging Face, Yoast, DataForSEO). Aucun grand LLM n'a confirme officiellement utiliser ces fichiers, mais le cout d'implementation est minime.

### 6.2 Crawlers IA en 2026

**Strategie robots.txt recommandee** : bloquer le training, autoriser le retrieval.

| Bot | Entreprise | Type | Recommandation |
|---|---|---|---|
| GPTBot | OpenAI | Training | **Bloquer** |
| OAI-SearchBot | OpenAI | Retrieval (RAG) | **Autoriser** |
| ClaudeBot | Anthropic | Training | **Bloquer** |
| Claude-SearchBot | Anthropic | Retrieval (RAG) | **Autoriser** |
| Google-Extended | Google | Training IA | **Bloquer** |
| Googlebot | Google | Indexation | **Autoriser** |
| PerplexityBot | Perplexity | Indexation | **Autoriser** |
| CCBot | Common Crawl | Training | **Bloquer** |

### 6.3 Optimisation technique pour la citabilite IA

- **Semantique HTML5** : `<article>`, `<section>` avec `id`, `<nav aria-label="Sommaire">`, `<aside>` pour les blocs complementaires
- **Meta robots** : `max-snippet:-1` pour autoriser les extractions longues
- **Donnees structurees** : Article + FAQPage + BreadcrumbList + WebPage avec `@id` persistants
- **Chaque section autonome** : repond completement a la question posee par son titre

### 6.4 Checklist export HTML

**Structure** : html lang="fr", main unique, article, sections avec id, nav pour sommaire, aside pour blocs pedagogiques
**Meta** : title 60 chars, description 155 chars, robots max-snippet:-1, canonical, Open Graph
**JSON-LD** : Article, FAQPage, BreadcrumbList, WebPage avec @id croisees
**GEO** : H1 avec mot-cle, intro 40-60 mots, answer capsules, 70%+ questions, 3+ statistiques
**Fichiers** : llms.txt, llms-full.txt, page.html.md, robots.txt, sitemap.xml

_Sources : [llmstxt.org](https://llmstxt.org/), [Semrush](https://www.semrush.com/blog/llms-txt/), [Witscode](https://witscode.com/blogs/robots-txt-strategy-2026-managing-ai-crawlers/)_

---

## 7. Editeur TipTap/ProseMirror — Extensions custom

### 7.1 Architecture actuelle (solide)

Le projet utilise `@tiptap/vue-3` v3.20.1 avec `useEditor` (ShallowRef). Architecture correcte : composant editeur isole, panels SEO/GEO dans des composants separes. Extensions : StarterKit, Link, Placeholder, ContentValeur, ContentReminder, AnswerCapsule, InternalLink.

### 7.2 Bubble Menu contextuel

Amelioration : plusieurs `BubbleMenu` avec des `pluginKey` et `shouldShow` distincts :
- **Menu texte** : visible sur selection de texte standard (hors nodes speciaux)
- **Menu lien interne** : visible quand le curseur est sur un `internalLink`
- **Menu answer capsule** : visible dans un bloc `answerCapsule` (avec compteur de mots)

### 7.3 Extensions custom ameliorees

- **AnswerCapsule** : NodeView Vue avec compteur de mots en temps reel (20/25), indicateur de qualite (optimal/acceptable/missing)
- **ContentValeur/ContentReminder** : NodeViews Vue avec icones et labels
- **InternalLink** : Mark avec attributs supplementaires `cocoonName` et `targetType`
- **Table of Contents** : ProseMirror Plugin custom extrayant les headings, avec generation d'ID pour les ancres

### 7.4 Performance

- **Debouncer `getHTML()`** a 200ms dans `onUpdate` (actuellement appele a chaque frappe)
- **Preferer `getJSON()`** pour les comparaisons internes, ne generer le HTML qu'a la sauvegarde
- **Decorations** : limiter a ~100 simultanement, utiliser `DecorationSet` avec recalcul incremental
- Pour 2000-3000 mots : performances nominales, pas de virtual rendering necessaire

### 7.5 Sauvegarde automatique

Strategie actuelle (interval 30s) enrichie : auto-save sur `visibilitychange` (quand l'utilisateur quitte l'onglet) + `beforeunload` comme filet de securite. Format de stockage : HTML (adapte car l'export final est en HTML).

### 7.6 Conversion cote serveur

`@tiptap/html` fonctionne cote serveur sans DOM : `generateHTML()` et `generateJSON()`. TipTap Static Renderer pour le rendu SSR/SSG sans instancier d'editeur.

_Sources : [TipTap Vue 3 Docs](https://tiptap.dev/docs/editor/getting-started/install/vue3), [TipTap Performance](https://tiptap.dev/docs/guides/performance), [TipTap Node Views Vue](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue)_

---

## 8. Maillage interne intelligent

### 8.1 Detection d'ancres pertinentes

3 niveaux de complexite :

| Approche | Complexite | Recommandation |
|---|---|---|
| Keyword matching ameliore | V1 | **Implementer maintenant** — scoring multi-criteres avec keywords de l'article cible |
| TF-IDF | V1.5 | **Implementer pour la V1** — similarite cosinus entre documents, corpus de 54 articles |
| Embeddings semantiques | V2 | **Reporter** — necessite API embeddings (Claude ou autre) |

### 8.2 Scoring de matching article-ancre

Score multi-criteres : mots-cles communs (30%), hierarchie de cocon (25%), meme cocon (20%), titre dans le contenu (15%), pas de lien existant (10%).

**Hierarchie de cocon** :
- Adjacent (Pilier↔Intermediaire, Intermediaire↔Specialise) = score 1.0
- Meme niveau = 0.7
- Pilier→Specialise = 0.3
- Cross-cocon Pilier↔Pilier = 0.8

### 8.3 Matrice de maillage

Structure enrichie avec `sourceCocoon`, `targetCocoon`, `sourceType`, `targetType`, `isAutomatic`. Stats globales : totalLinks, intraCocoonLinks, crossCocoonLinks, avgLinksPerArticle, orphanCount.

Visualisation V1 : tableau heatmap (articles tries par cocon). V2 : graphe interactif (D3.js ou vis-network).

### 8.4 Analyse de graphe

Au-dela de la detection d'orphelins (inDegree = 0) :
- **Articles faiblement lies** : inDegree < 2
- **Articles hubs** : outDegree > 10 (risque de dilution)
- **Couverture par cocon** : % d'articles lies par cocon
- **Profondeur max BFS** : depuis les Piliers, chaque article doit etre atteignable en **3 clics maximum**

### 8.5 Diversite d'ancres

Scoring de diversite : ratio unique/total, classification par type (exact-match, partial-match, contextual, generic, branded). Regle SEO : exact-match < 20% du total, diversite ratio > 0.5, au moins 2 types d'ancres differents.

### 8.6 Cross-cocon linking

| Source → Cible | Max liens | Priorite |
|---|---|---|
| Pilier → Pilier | 2 | Haute |
| Intermediaire → Pilier (autre cocon) | 1 | Moyenne |
| Pilier → Intermediaire (autre cocon) | 1 | Moyenne |
| Intermediaire → Intermediaire (autre cocon) | 1 | Basse |
| Specialise → cross-cocon | 0 | Eviter |

### 8.7 Persistance des ancres

Structure enrichie avec positionnement (char-offset, heading-relative, paragraph-index), contexte (texte environnant, hash du paragraphe). Reconciliation apres regeneration : recherche exacte → recherche floue par contexte → marquer comme perdu.

### 8.8 Injection dans TipTap

`safeApplyLink()` : rechercher l'ancre dans le doc actuel, verifier qu'aucun lien n'existe deja, appliquer via `chain().setTextSelection().setMark()`. `batchApplyLinks()` : transaction unique ProseMirror pour un undo atomique.

_Sources : [Cocon Semantique](https://www.semjuice.com/definition/cocon-semantique/), [Graph Theory SEO](https://medium.com/omio-engineering/nailing-seo-internal-linking-with-graph-theory-2c45544a024d), [TipTap Commands](https://tiptap.dev/docs/editor/api/commands)_

---

## 9. Synthese et recommandations strategiques

### 9.1 Priorites d'implementation

| Priorite | Action | Axe | Impact |
|---|---|---|---|
| **P0** | Fusionner SERP + PAA en 1 appel Advanced | DataForSEO | -40% cout SERP |
| **P0** | Activer le prompt caching sur le system prompt | Claude API | -90% input recurrent |
| **P0** | Integrer le score NLP coverage dans le score SEO | Scoring SEO | Pertinence semantique |
| **P0** | Ameliorer detection answer capsules (qualite optimal/acceptable) | Scoring GEO | Citabilite IA |
| **P1** | Ajouter le scoring de placement strategique | Scoring SEO | Verification systematique |
| **P1** | Ajouter les metriques de citabilite LLM | Scoring GEO | Differentiation GEO |
| **P1** | Debouncer `getHTML()` dans l'editeur | TipTap | Performance |
| **P1** | Scoring multi-criteres pour le maillage | Maillage | Qualite des suggestions |
| **P2** | Generer llms.txt automatiquement | llms.txt | Future-proof |
| **P2** | NodeViews Vue pour blocs speciaux | TipTap | UX |
| **P2** | Analyse de graphe BFS (profondeur, couverture) | Maillage | Sante du maillage |
| **P2** | Web Worker pour le scoring | Performance | Articles longs |
| **P3** | Saturation BM25 | Scoring SEO | Precision |
| **P3** | Reconciliation d'ancres apres regeneration | Maillage | Persistance |
| **P3** | Batch API pour generation en serie | Claude API | -50% cout batch |

### 9.2 Architecture cible

```
src/
  utils/
    seo-calculator.ts       # Calcul SEO (enrichir avec NLP coverage, placement, BM25)
    geo-calculator.ts       # Calcul GEO (enrichir avec citabilite, densite factuelle)
    citability.ts           # NOUVEAU : metriques de citabilite LLM
  workers/
    scoring.worker.ts       # NOUVEAU : Web Worker pour calcul off-thread
  composables/
    useSeoScoring.ts        # Orchestration avec debounce (existe)
    useGeoScoring.ts        # Orchestration avec debounce (existe)
    useStreamToEditor.ts    # NOUVEAU : injection stream HTML vers TipTap
  components/editor/
    tiptap/extensions/
      answer-capsule.ts     # Enrichir avec NodeView Vue + compteur
      AnswerCapsuleView.vue # NOUVEAU : NodeView avec compteur mots
server/
  services/
    claude.service.ts       # Ajouter prompt caching, choix modele par tache
    dataforseo.service.ts   # Fusionner SERP+PAA, cache TTL, fallback stale
    export.service.ts       # Enrichir JSON-LD, generer llms.txt
    schema.service.ts       # NOUVEAU : generation schema-dts
    llms-txt.service.ts     # NOUVEAU : generation llms.txt et llms-full.txt
    linking.service.ts      # Enrichir scoring, analyse graphe, reconciliation
```

### 9.3 Estimations de cout total

| Poste | Cout estime | Notes |
|---|---|---|
| DataForSEO (100 mots-cles) | **$1.82** (~1.70 EUR) | Avec optimisation SERP+PAA |
| Claude API (54 articles) | **$3.24 - $7.56** (~3-7 EUR) | Selon niveau d'optimisation |
| **TOTAL pour 54 articles** | **~5-9 EUR** | Largement sous le budget (0.50 EUR/article x 54 = 27 EUR) |

---

## 10. Sources et references

### SEO et Scoring

- [Koanthic - Optimal Keyword Density](https://koanthic.com/en/optimal-keyword-density/)
- [Rankability - Keyword Density Ranking Factor](https://www.rankability.com/ranking-factors/google/keyword-density/)
- [Wikipedia - Okapi BM25](https://en.wikipedia.org/wiki/Okapi_BM25)
- [Elastic Blog - BM25 Algorithm](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables)
- [NEURONwriter - TF-IDF & BM25](https://neuronwriter.com/how-neuronwriter-uses-tf-idf-bm25-to-measure-true-content-relevance/)
- [Surfer SEO Docs - Content Score](https://docs.surferseo.com/en/articles/5700317-what-is-content-score)
- [Clearscope - Content Grading](https://www.clearscope.io/support/how-does-clearscope-grade-your-content)
- [SEOWriting.ai - Keyword Placement](https://seowriting.ai/blog/where-to-place-seo-keywords)
- [Conductor - Heading Tags](https://www.conductor.com/academy/headings/)

### GEO et Citabilite IA

- [arXiv - GEO Paper (Princeton)](https://arxiv.org/pdf/2311.09735)
- [Backlinko - GEO Guide](https://backlinko.com/generative-engine-optimization-geo)
- [GenOptima - 4-Pillar GEO Framework](https://www.gen-optima.com/geo/the-4-pillar-geo-framework-entity-extractability-trust-freshness/)
- [Visibility Stack - LLM Citation Mechanics](https://www.visibilitystack.ai/academy/content-engineering/how-ai-models-decide-what-content-to-cite)
- [Victorino Group - LLM Citation Patterns](https://victorinollc.com/thinking/llm-citation-attention-patterns)
- [Discovered Labs - LLM Citation Technical Patterns](https://discoveredlabs.com/blog/content-clarity-and-verifiability-the-technical-patterns-that-drive-llm-citations)
- [Averi.ai - LLM-Optimized Content](https://www.averi.ai/breakdowns/the-definitive-guide-to-llm-optimized-content)
- [Onely - LLM-Friendly Content](https://www.onely.com/blog/llm-friendly-content/)

### Schema Markup et Donnees Structurees

- [Google Search Central - Article](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Frase.io - FAQ Schema AI Search](https://www.frase.io/blog/faq-schema-ai-search-geo-aeo)
- [Wellows - AI Overviews Ranking Factors](https://wellows.com/blog/google-ai-overviews-ranking-factors/)
- [Dataslayer - AI Overviews CTR](https://www.dataslayer.ai/blog/google-ai-overviews-the-end-of-traditional-ctr-and-how-to-adapt-in-2025)
- [WriteSonic - Structured Data AI Search](https://writesonic.com/blog/structured-data-in-ai-search)
- [Google schema-dts](https://github.com/google/schema-dts)

### DataForSEO

- [DataForSEO API v3 Docs](https://docs.dataforseo.com/v3/)
- [DataForSEO SERP API Pricing](https://dataforseo.com/pricing/serp/google-organic-serp-api)
- [DataForSEO Labs Pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)
- [DataForSEO Live Endpoints Best Practices](https://dataforseo.com/help-center/best-practices-live-endpoints-in-dataforseo-api)

### Claude API et Prompt Engineering

- [Anthropic - Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Anthropic - Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic - Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic - Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Claude Prompt Engineering 2026](https://chatpromptgenius.com/claude-4-6-adaptive-thinking-best-prompts-for-seo-2026/)
- [DreamHost - Claude Prompt Techniques](https://www.dreamhost.com/blog/claude-prompt-engineering/)

### llms.txt et Crawlers IA

- [llmstxt.org - Specification](https://llmstxt.org/)
- [Semrush - What Is LLMs.txt](https://www.semrush.com/blog/llms-txt/)
- [Search Engine Journal - Claude Bots robots.txt](https://www.searchenginejournal.com/anthropics-claude-bots-make-robots-txt-decisions-more-granular/568253/)
- [Witscode - Robots.txt Strategy 2026](https://witscode.com/blogs/robots-txt-strategy-2026-managing-ai-crawlers/)

### TipTap et ProseMirror

- [TipTap Vue 3 Docs](https://tiptap.dev/docs/editor/getting-started/install/vue3)
- [TipTap Performance](https://tiptap.dev/docs/guides/performance)
- [TipTap Node Views Vue](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue)
- [TipTap Commands](https://tiptap.dev/docs/editor/api/commands)
- [TipTap HTML Utility](https://tiptap.dev/docs/editor/api/utilities/html)
- [TipTap BubbleMenu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)

### Maillage Interne

- [Cocon Semantique - Semjuice](https://www.semjuice.com/definition/cocon-semantique/)
- [Graph Theory SEO - Omio](https://medium.com/omio-engineering/nailing-seo-internal-linking-with-graph-theory-2c45544a024d)
- [Graph Theory Internal Linking - Botpresso](https://botpresso.com/graph-theory-based-internal-linking-50-to-1-orphan-pages/)
- [Anchor Text Diversity](https://marketbrew.ai/maximizing-anchor-text-diversity-for-improved-seo)
- [Google SEO Link Best Practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)

---

**Date de completion :** 2026-03-10
**Periode de recherche :** Analyse technique comprehensive (mars 2026)
**Verification des sources :** Tous les faits techniques cites avec sources actuelles
**Niveau de confiance :** Eleve — base sur de multiples sources autoritatives

_Ce rapport de recherche technique sert de reference pour l'implementation des 8 axes identifies dans Blog Redactor SEO et fournit des recommandations strategiques actionnables pour l'equipe de developpement._
