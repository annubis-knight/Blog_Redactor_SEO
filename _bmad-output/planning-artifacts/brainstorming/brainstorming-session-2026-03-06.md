---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - BDD_Articles_Blog.json
  - BDD_Mots_Clefs_SEO.json
  - templateArticle.html
  - article-design-emotionnel.html
  - article-quand-refondre-son-site-web.html
  - "Tu es expert en SEO, spécialisé en mots clefs pili.md"
  - "Tu es expert en SEO, et tu travaille pour une entr.md"
session_topic: "Outil web Vue.js de rédaction d'articles de blog SEO/GEO pour Propulsite"
session_goals: "Concevoir le workflow complet, fonctionnalités éditeur, intégration DataForSEO, stratégie GEO, maillage interne, reproduction du ton Propulsite"
selected_approach: "progressive-flow"
techniques_used:
  - "Phase 1: Analyse Morphologique"
  - "Phase 2: Cross-Pollination"
  - "Phase 3: Six Thinking Hats"
  - "Phase 4: Solution Matrix"
ideas_generated: []
context_file: "_bmad/bmm/data/project-context-template.md"
---

# Brainstorming Session Results — Blog Redactor SEO/GEO

**Facilitateur :** Mary (Business Analyst)
**Date :** 2026-03-06
**Projet :** Propulsite Blog Redactor SEO/GEO

---

## Session Overview

**Topic :** Concevoir un outil web (Vue.js) de rédaction d'articles de blog SEO/GEO pour Propulsite

**Goals :**
- Concevoir le workflow complet (de la sélection d'article au HTML final)
- Définir les fonctionnalités de l'éditeur interactif (actions contextuelles)
- Intégrer DataForSEO pour l'enrichissement SEO
- Intégrer une stratégie GEO (Generative Engine Optimization)
- Gérer le maillage interne intelligent entre 50+ articles / 6 cocons
- Reproduire le ton et la pédagogie Propulsite

### Context

**Propulsite** est une entreprise Toulousaine experte en croissance digitale pour PME/TPE. Le blog cible 6 cocons sémantiques avec 54 articles planifiés. L'utilisateur écrit avec un ton pédagogique, conversationnel, riche en exemples de grandes marques ramenés au contexte PME. Le problème principal : il écrit avec passion mais oublie l'optimisation SEO. L'outil doit fusionner écriture authentique et optimisation automatique.

**Données existantes analysées :**
- `BDD_Articles_Blog.json` : 54 articles sur 6 cocons (Pilier/Intermédiaire/Spécialisé)
- `BDD_Mots_Clefs_SEO.json` : ~100 mots-clés (Pilier/Moyenne traine/Longue traine)
- `templateArticle.html` : Structure HTML de référence
- 2 articles exemples montrant le ton et la pédagogie Propulsite
- Conversations Perplexity montrant la recherche de mots-clés et cocons

---

## Technique Selection

**Approach :** Progressive Technique Flow
**Journey Design :** Systematic development from exploration to action

**Progressive Techniques :**
- **Phase 1 — Exploration :** Analyse Morphologique (décomposition systématique de toutes les dimensions)
- **Phase 2 — Pattern Recognition :** Cross-Pollination (emprunts aux meilleurs outils et domaines)
- **Phase 3 — Development :** Six Thinking Hats (évaluation multi-perspective)
- **Phase 4 — Action Planning :** Solution Matrix (priorisation et roadmap)

---

# PHASE 1 : ANALYSE MORPHOLOGIQUE

## Dimension 1 : Étapes du Workflow

| Étape | Description |
|-------|-------------|
| **A. Sélection** | Choisir un article depuis le dashboard (par cocon, par priorité, par statut) |
| **B. Brief SEO/GEO** | Génération automatique d'un brief enrichi par DataForSEO |
| **C. Recherche** | Phase de documentation/recherche sur le sujet (optionnelle, assistée) |
| **D. Génération structure** | L'IA propose la trame (H1, H2, H3, blocs pédagogiques) alignée au template |
| **E. Génération draft** | L'IA rédige un premier jet en respectant ton + SEO + template |
| **F. Édition interactive** | L'utilisateur retouche avec actions contextuelles |
| **G. Injection maillage** | Identification et injection des liens internes |
| **H. Validation** | Score SEO/GEO final + checklist avant export |
| **I. Export** | Génération HTML final conforme au template |

## Dimension 2 : Sources de données

| Source | Usage |
|--------|-------|
| `BDD_Articles_Blog.json` | Plan éditorial : 54 articles, cocons, types, slugs |
| `BDD_Mots_Clefs_SEO.json` | ~100 mots-clés classés par cocon et type |
| **DataForSEO — SERP API** | Top 10 résultats Google pour le mot-clé cible → analyser structure, longueur, H2s des concurrents |
| **DataForSEO — People Also Ask** | Questions "Autres questions posées" → deviennent des H2/H3 ou FAQ |
| **DataForSEO — Related Keywords** | Termes sémantiquement liés → enrichir le champ lexical |
| **DataForSEO — Search Volume** | Volume de recherche + difficulté → prioriser les articles |
| **DataForSEO — Competitor Content** | Analyse du contenu des top résultats → identifier les gaps |
| **Articles déjà rédigés** | Base de maillage interne + détection de duplication |
| **Template HTML** | Structure de sortie imposée |
| **Style guide extrait** | Ton, patterns pédagogiques, blocks types (extrait des exemples) |

## Dimension 3 : Fonctionnalités de l'éditeur (actions contextuelles sur sélection)

| Action contextuelle | Description |
|---------------------|-------------|
| **Reformuler** | Réécrire la sélection en gardant le sens, variant le style |
| **Injecter lien interne** | Proposer les articles pertinents du blog à lier sur cette phrase |
| **Optimiser pour mot-clé** | Réécrire la sélection pour y intégrer naturellement un mot-clé ciblé |
| **Simplifier** | Rendre la sélection plus accessible/lisible |
| **Enrichir avec exemple** | Ajouter un exemple concret (grande marque → PME, pattern Propulsite) |
| **Convertir en liste** | Transformer un paragraphe en bullet points / check-list |
| **Ajouter statistique** | Insérer une donnée chiffrée pertinente (boost GEO) |
| **Créer answer capsule** | Reformater en réponse directe de 20-25 mots (format GEO optimal) |
| **Formuler en question** | Transformer un H2/H3 en question (boost GEO : 3.4x plus de citations IA) |

## Dimension 4 : Optimisation SEO

| Fonctionnalité | Détail |
|----------------|--------|
| **Score SEO temps réel** | Panel latéral avec score global actualisé pendant l'édition |
| **Densité mots-clés** | Tracking pilier / moyenne traine / longue traine avec cibles |
| **Placement stratégique** | Vérifier présence des mots-clés dans : title, H1, intro, H2s, conclusion, meta |
| **Hiérarchie Hn** | Validation de la structure H1 > H2 > H3 |
| **Meta title + description** | Génération automatique optimisée |
| **Slug URL** | Proposition de slug SEO-friendly |
| **Alt text images** | Suggestions d'alt text avec mots-clés |
| **Longueur contenu** | Recommandation basée sur l'analyse SERP (concurrents) |
| **Champ lexical** | Termes sémantiques liés à intégrer (via DataForSEO Related Keywords) |

## Dimension 5 : Optimisation GEO (Generative Engine Optimization)

| Fonctionnalité | Détail |
|----------------|--------|
| **Answer capsules** | Vérifier que chaque H2 a une réponse directe de 20-25 mots juste après |
| **Titres en questions** | Score : % de H2/H3 formulés en questions (cible : 70%+) |
| **Densité de faits** | Compteur de statistiques/données par article (cible : 3-5 minimum) |
| **Citations sourcées** | Vérifier que les stats ont des sources (+89% de probabilité de citation IA) |
| **Score GEO** | Panel dédié avec score composite (extractibilité, fraîcheur, faits, structure) |
| **Schema markup** | Génération auto : Article, FAQPage, HowTo, Organization, BreadcrumbList |
| **Multimodal check** | Vérifier présence images/tableaux (+156% citations avec multimodal) |
| **Paragraphes courts** | Alerter si paragraphe > 3 lignes |
| **Langage direct** | Détecter le jargon corporate et proposer des reformulations |

## Dimension 6 : Maillage interne

| Fonctionnalité | Détail |
|----------------|--------|
| **Matrice de liens** | Vue globale : quel article lie vers quel article, par cocon |
| **Suggestions contextuelles** | En écrivant, le système détecte les phrases-ancres potentielles et propose les articles cibles |
| **Hiérarchie de cocon** | Règles : Pilier ↔ Intermédiaire ↔ Spécialisé (pas de Spécialisé → Spécialisé cross-cocon sans passer par Intermédiaire) |
| **Orphan detection** | Alerter si un article n'a aucun lien entrant |
| **Diversité d'ancres** | Éviter que le même texte d'ancre soit utilisé partout |
| **Cross-cocon** | Identifier les opportunités de liens entre cocons quand les sujets se recoupent |
| **Tracking** | Stocker quel article contient quels liens, texte d'ancre, article cible |

## Dimension 7 : Reproduction du ton Propulsite

| Pattern identifié | Implémentation |
|-------------------|----------------|
| **Adresse directe** | Vouvoiement du lecteur, questions rhétoriques ("Votre site est-il...?") |
| **Exemples grandes marques → PME** | Pattern : "Airbnb fait X... Comment une PME peut s'en inspirer ?" |
| **Blocs pédagogiques** | `content-valeur` (explication + `list-disc`) → `content-reminder` (résumé + `check-list`) |
| **Données chiffrées** | Stats en accroche + source ("D'après le professeur Zaltman, 95% de...") |
| **Conclusion actionnable** | "3/4 actions immédiates pour votre business" |
| **CTA Propulsite** | Dernier paragraphe avec invitation au contact |
| **Images entre sections** | 1 image par chapitre minimum |
| **Sommaire cliquable** | Ancres vers chaque H2 |
| **Sidebar articles liés** | 2-3 articles du même cocon |

## Dimension 8 : Outputs

| Output | Format |
|--------|--------|
| **Article HTML** | Conforme au `templateArticle.html` |
| **Metadata SEO** | Title, meta description, slug, mots-clés utilisés |
| **Rapport SEO** | Score, densité par mot-clé, placements, manques |
| **Rapport GEO** | Score, answer capsules, questions, facts density, schema |
| **Rapport maillage** | Liens injectés, ancres, articles cibles, orphelins |
| **JSON article enrichi** | Mise à jour de `BDD_Articles_Blog.json` avec statut, mots-clés utilisés, liens |

---

# PHASE 2 : CROSS-POLLINATION

## Emprunts aux outils existants

### De Surfer SEO / Clearscope
- **Content score en temps réel** pendant la rédaction → panel latéral avec jauge
- **NLP terms** : liste de termes sémantiques à inclure, chacun coché quand détecté dans le texte
- **Competitor analysis** : afficher la structure (H2s, longueur, mots-clés) des top 3 résultats Google

### De Frase.io
- **Brief automatique** basé sur l'analyse SERP : PAA, top headings, gaps de contenu
- **AI outline** : proposition de plan (H2/H3) basée sur ce qui rank + template Propulsite

### De Notion
- **Dashboard par cocon** : vue Kanban des articles (À rédiger → Brouillon → En relecture → Publié)
- **Relations entre bases** : articles ↔ mots-clés ↔ cocons ↔ liens, tout interconnecté
- **Blocs réutilisables** : patterns pédagogiques (content-valeur, content-reminder) en blocs drag & drop

### De Figma
- **Toolbar contextuelle flottante** : sélection de texte → barre d'actions apparaît
- **Panel de propriétés latéral** : métadonnées SEO/GEO de l'article en cours

### De Hemingway Editor
- **Highlighting par complexité** : phrases trop longues, voix passive, jargon → colorées dans l'éditeur
- **Score de lisibilité** intégré au panel SEO

### De VS Code
- **Inline suggestions** : propositions de complétion SEO-aware pendant la frappe
- **Problems panel** : liste des "erreurs" SEO/GEO

## Innovations par croisement de domaines

- **Spotify → Cocons** : Dashboard visuel de "flux de lecture" dans le cocon, comme une playlist avec un mood
- **Google Maps → Maillage** : Visualisation du parcours lecteur comme un itinéraire : Pilier → Intermédiaire → Spécialisé
- **Jeux vidéo → Progression** : Barre de progression du cocon (% articles rédigés, % maillage complet, % mots-clés couverts)

---

# PHASE 3 : SIX THINKING HATS

## Chapeau Blanc (Faits)
- 54 articles à rédiger sur 6 cocons
- ~100 mots-clés à distribuer
- DataForSEO coûte ~$0.01-0.05 par requête API (budget estimé : $3-5 pour les 54 articles)
- Vue.js comme frontend, besoin d'un backend pour l'API DataForSEO et le stockage
- Le GEO est un facteur critique en 2026 : 25% du trafic migre vers les moteurs génératifs
- Les answer capsules (20-25 mots après chaque H2) sont le prédicteur #1 de citation IA
- Le contenu avec données originales = +30-40% de visibilité IA

## Chapeau Rouge (Émotions / UX)
- **Frustration principale** : l'utilisateur écrit avec passion mais "oublie" le SEO. L'outil doit rendre le SEO invisible et automatique
- **Flow d'écriture** : ne jamais interrompre la créativité. Les suggestions SEO doivent être latérales (panel), pas intrusives
- **Satisfaction** : voir le score SEO/GEO monter en temps réel pendant qu'on écrit = dopamine
- **Le maillage** doit être un plaisir de découverte, pas une corvée
- **L'export** doit être un moment de fierté : article terminé, tous les voyants au vert

## Chapeau Jaune (Bénéfices)
- 54 articles SEO+GEO optimisés = autorité topique massive sur 6 thématiques
- Maillage interne structuré = Google comprend les cocons = boost ranking
- GEO = Propulsite cité par les IA = visibilité gratuite et crédibilité
- Outil réutilisable pour de futurs cocons
- Gain de temps colossal : de "écriture intuitive" à "production systématisée"
- Données DataForSEO rendent chaque article data-driven

## Chapeau Noir (Risques)
- **Sur-optimisation** : trop de mots-clés = contenu robotique → limiter densité max et alerter
- **Perte d'authenticité** : draft IA peut manquer de "patte" → le draft est une base, l'utilisateur retouche
- **Coût DataForSEO** : peut monter si requêtes non maîtrisées → cache des résultats
- **Complexité de build** : app Vue.js complète = effort significatif → MVP incrémental
- **GEO évolue vite** : stratégies 2026 peuvent changer → règles GEO configurables, pas hardcodées
- **Maillage forcé** : liens artificiels nuisent au lecteur → suggestions uniquement, jamais d'injection auto

## Chapeau Vert (Opportunités créatives)
- **Mode "Passion d'abord"** : toggle qui masque tous les panneaux SEO/GEO pour écrire librement
- **Gap detector** : après 10 articles, analyser ce que les concurrents couvrent et pas vous → suggestions
- **Cocon health dashboard** : vue macro avec % complétion, maillage, couverture mots-clés
- **Preview SERP** : voir à quoi ressemblera l'article dans Google
- **Preview GEO** : simuler comment une IA citerait un extrait de l'article

## Chapeau Bleu (Processus)
- **Workflow séquentiel clair** : Dashboard → Brief → Structure → Draft → Édition → Maillage → Validation → Export
- **Chaque étape est optionnelle** : sauter direct à l'édition si texte déjà écrit
- **MVP first** : Dashboard + Éditeur + Score SEO. Ajouter DataForSEO, GEO et maillage itérativement
- **Données persistées en JSON** au début, évolutif ensuite

---

# PHASE 4 : SOLUTION MATRIX

## Matrice Impact / Complexité

| Fonctionnalité | Impact SEO/GEO | Impact UX | Complexité | Priorité |
|---|---|---|---|---|
| Dashboard articles par cocon + statut | Moyen | Haut | Faible | **P0 - MVP** |
| Éditeur rich text avec template préchargé | Haut | Haut | Moyen | **P0 - MVP** |
| Score SEO temps réel (densité mots-clés) | Haut | Haut | Moyen | **P0 - MVP** |
| Actions contextuelles (reformuler, simplifier) | Moyen | Haut | Moyen | **P0 - MVP** |
| Brief SEO auto (depuis BDD JSON) | Haut | Haut | Faible | **P0 - MVP** |
| Export HTML conforme template | Haut | Moyen | Faible | **P0 - MVP** |
| Génération draft IA (ton Propulsite) | Haut | Haut | Haut | **P1** |
| DataForSEO : SERP + PAA + Related | Haut | Moyen | Moyen | **P1** |
| Action "Injecter lien interne" | Haut | Haut | Moyen | **P1** |
| Matrice de maillage interne | Haut | Moyen | Moyen | **P1** |
| Score GEO (answer capsules, questions, faits) | Haut | Moyen | Moyen | **P1** |
| Schema markup auto (Article, FAQ, HowTo) | Haut | Faible | Faible | **P1** |
| Action "Ajouter statistique" | Haut (GEO) | Moyen | Moyen | **P2** |
| Action "Créer answer capsule" | Haut (GEO) | Moyen | Faible | **P2** |
| Competitor content analysis | Haut | Moyen | Haut | **P2** |
| Cocon health dashboard | Moyen | Haut | Moyen | **P2** |
| Preview SERP | Moyen | Haut | Faible | **P2** |
| Gap detector (articles manquants) | Haut | Moyen | Haut | **P3** |
| Mode "Passion d'abord" (toggle SEO) | Faible | Haut | Faible | **P3** |
| Visualisation maillage (style carte) | Moyen | Haut | Haut | **P3** |
| Inline suggestions pendant la frappe | Moyen | Haut | Haut | **P3** |

## Roadmap d'implémentation

### Phase MVP (P0) — Le socle fonctionnel

```
Vue.js App
├── Dashboard
│   ├── Liste des cocons sémantiques (depuis BDD_Articles_Blog.json)
│   ├── Articles par cocon avec statut (à rédiger / brouillon / publié)
│   ├── Mots-clés associés (depuis BDD_Mots_Clefs_SEO.json)
│   └── Clic sur article → ouvre l'éditeur
│
├── Éditeur
│   ├── Structure préchargée (template HTML : Hero, Sommaire, Intro, 3 chapitres, Conclusion)
│   ├── Rich text (TipTap ou ProseMirror sur Vue)
│   ├── Toolbar contextuelle sur sélection :
│   │   ├── Reformuler
│   │   ├── Simplifier
│   │   ├── Convertir en liste
│   │   └── Enrichir avec exemple
│   ├── Panel latéral SEO :
│   │   ├── Brief (mot-clé pilier + moyenne + longue traine)
│   │   ├── Densité mots-clés (temps réel)
│   │   ├── Checklist SEO (titre, H1, intro, meta...)
│   │   └── Score global
│   └── Export HTML
│
└── Données
    ├── BDD_Articles_Blog.json (enrichi avec statut, mots-clés utilisés)
    ├── BDD_Mots_Clefs_SEO.json
    └── articles/ (contenu sauvegardé par article)
```

### Phase 1 (P1) — IA + DataForSEO + Maillage

```
├── DataForSEO Integration
│   ├── Brief enrichi : SERP top 10, PAA, related keywords, volumes
│   ├── Cache des résultats (1 appel par article, stocké)
│   └── Suggestions de H2/H3 basées sur PAA
│
├── Génération IA
│   ├── System prompt avec style guide Propulsite
│   ├── Génération structure (plan H2/H3)
│   ├── Génération draft (par section, pas tout d'un coup)
│   └── Respect des mots-clés + template
│
├── Maillage interne
│   ├── Action contextuelle "Injecter lien" → propose articles pertinents
│   ├── Matrice de liens (quel article lie vers quoi)
│   ├── Orphan detection
│   └── Tracking des ancres
│
├── GEO
│   ├── Score GEO dans le panel latéral
│   ├── Check answer capsules
│   ├── Check titres en questions
│   ├── Compteur de statistiques/faits
│   └── Schema markup auto dans l'export
```

### Phase 2 (P2) — Polish + Analytics

```
├── Actions contextuelles avancées
│   ├── "Ajouter statistique" (avec source)
│   ├── "Créer answer capsule"
│   └── "Formuler en question"
│
├── Competitor analysis (top 3 SERP)
├── Cocon health dashboard (% complétion, maillage, mots-clés)
└── Preview SERP (title + meta description)
```

### Phase 3 (P3) — Innovation

```
├── Gap detector (nouveaux articles suggérés)
├── Mode "Passion d'abord"
├── Visualisation maillage (carte interactive)
├── Inline suggestions SEO pendant la frappe
└── Preview GEO (simulation citation IA)
```

## Stack technique recommandée

| Couche | Choix | Raison |
|--------|-------|--------|
| **Frontend** | Vue 3 + Composition API | Choix utilisateur |
| **Éditeur** | TipTap (basé sur ProseMirror) | Meilleur éditeur rich text pour Vue, extensible, toolbar custom |
| **State** | Pinia | Standard Vue 3 |
| **Backend** | Node/Express ou Nitro | Proxy pour DataForSEO API + appels IA |
| **IA** | Claude API (Anthropic) | Génération de drafts, reformulation, suggestions |
| **SEO Data** | DataForSEO REST API | SERP, PAA, Related, Volumes |
| **Stockage** | JSON files (MVP) → SQLite/Supabase (P2) | Simple au début, évolutif |
| **Schema** | JSON-LD injecté dans l'export HTML | Standard Google |

## Données DataForSEO à requêter par article

| Endpoint | Données récupérées | Usage |
|----------|-------------------|-------|
| **SERP Regular** | Top 10 résultats pour le mot-clé pilier | Analyse concurrence, longueur cible, H2s |
| **People Also Ask** | Questions associées | Suggestions de H2/H3, FAQ schema |
| **Related Keywords** | Termes sémantiques liés | Enrichir le champ lexical |
| **Keyword Data** | Volume, CPC, difficulté | Prioriser les articles à rédiger |
| **On-Page API** | Analyse d'une URL concurrente | Extraire structure et mots-clés |

**Budget estimé** : ~$0.05-0.10 par article → ~$3-5 pour 54 articles.

## Règles GEO intégrées

1. **Answer capsule obligatoire** : 20-25 mots après chaque H2, réponse directe sans lien (+72.4% taux de citation)
2. **70%+ des H2/H3 en questions** (3.4x plus extractibles par l'IA)
3. **Minimum 3 statistiques sourcées par article** (+30-40% visibilité IA)
4. **Paragraphes max 3 lignes** (l'IA cite mieux le contenu aéré)
5. **Contenu multimodal** : minimum 1 image par chapitre (+156% citations)
6. **Fraîcheur** : date de mise à jour visible, rafraîchir les stats régulièrement
7. **Schema markup** : Article + FAQPage + BreadcrumbList sur chaque article
8. **Pas de jargon** : langage direct, conversationnel
9. **Sources citées avec liens** : +89% de probabilité de sélection IA
10. **robots.txt** : ne pas bloquer GPTBot, PerplexityBot — ajouter `llms.txt`

---

## Recherche GEO — Résumé des findings

### Qu'est-ce que le GEO ?
Le GEO (Generative Engine Optimization) est l'optimisation pour les moteurs de recherche génératifs (Google AI Overviews, ChatGPT, Perplexity, Claude). L'objectif n'est plus de ranker #1 en lien bleu, mais d'être la source que l'IA cite dans sa réponse. En 2026, 25% du volume de recherche traditionnel migre vers les moteurs génératifs.

### Métriques clés
- **Reference Rate** (taux de citation) remplace le ranking comme KPI principal
- **Share of Voice** : % de mentions vs concurrents dans les réponses IA
- **Citation Sentiment** : contexte positif/neutre/négatif de la citation

### Facteurs de sélection par l'IA (par ordre d'impact)
1. **Clarté et extractibilité (40%)** : answer capsules, hiérarchie titres, paragraphes courts
2. **Fraîcheur relative (25%)** : contenu mis à jour dans les 2 derniers mois = +28% citations
3. **Densité de faits et données (20%)** : stats originales, sources citées
4. **Autorité et crédibilité (10%)** : bios auteur, mentions brand, présence externe
5. **Performance technique (5%)** : FCP < 0.4s = 6.7 citations vs > 1.13s = 2.1 citations

### Impact du cocon sémantique sur le GEO
L'architecture en cocon sémantique est naturellement alignée avec le GEO car elle :
- Démontre une expertise profonde (topical authority)
- Crée un réseau sémantique robuste que les IA reconnaissent comme autoritaire
- Permet une couverture exhaustive d'un sujet

### Sources de la recherche GEO
- Search Engine Land: Mastering GEO in 2026
- Digital Applied: GEO Guide 2026
- Optimize GEO: Step-by-Step Guide 2026
- Geoptie: Generative Engine Optimization Definitive Guide
- Go Fish Digital: GEO Strategies 2026
- Semrush: How to Optimize Content for AI Search Engines
- Profound: AI Platform Citation Patterns
- Search Engine Land: How to Get Cited by ChatGPT
