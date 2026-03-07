---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - product-brief-BMAD-2026-03-06.md
  - brainstorming/brainstorming-session-2026-03-06.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: web_app
  domain: content_marketing_seo
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
date: 2026-03-06
status: complete
---

# Product Requirements Document - Blog Redactor SEO

**Author:** Arnau
**Date:** 2026-03-06

## Executive Summary

**Blog Redactor SEO** est un outil web dédié à Propulsite qui automatise la rédaction d'articles de blog avec une optimisation SEO/GEO native. L'outil exploite une base de données de 54 articles organisés en 6 cocons sémantiques, une stratégie de ~100 mots-clés structurée (pilier / moyenne traîne / longue traîne), et le ton pédagogique unique de Propulsite pour produire des articles complets — du choix de l'article à l'export HTML final prêt à publier.

Le problème central : rédiger du contenu qui rank en SEO tout en restant naturel et pédagogique. Aujourd'hui, le SEO est perçu comme un frein à la clarté du contenu. L'insight fondateur de cet outil est que l'IA en 2026 est capable de fusionner optimisation SEO et rédaction naturelle de manière indétectable — le lecteur ne remarque pas que le texte est enrichi en mots-clés. L'outil rend le SEO invisible pour libérer l'écriture.

Utilisateur unique : Arnau, fondateur de Propulsite, expert en croissance digitale PME/TPE. Il écrit avec passion et pédagogie mais n'a pas de processus pour intégrer le SEO. Les 54 articles restent non publiés. L'objectif business : faire ranker Propulsite sur ses mots-clés cibles et mesurer les KPIs de performance par mot-clé et par cocon sémantique.

### What Makes This Special

- **Rédaction SEO-native** : le contenu naît déjà optimisé — pas d'optimisation après coup. Le SEO est fusionné dans la rédaction, indétectable à la lecture
- **Outil 100% dédié** : connaît les cocons, les mots-clés, le template HTML et le ton Propulsite. Ce n'est pas un outil générique — c'est la machine à contenu de Propulsite
- **Ton fidèle** : vouvoiement, exemples grandes marques ramenés au contexte PME, blocs pédagogiques (content-valeur, content-reminder), données chiffrées, conclusions actionnables
- **Workflow complet** : sélection d'article → brief SEO → sommaire (validation utilisateur) → rédaction automatique → maillage interne → export HTML conforme au template
- **Maillage intelligent** : ancres internes persistantes et traçables, respectant la hiérarchie des cocons (Pilier ↔ Intermédiaire ↔ Spécialisé)

## Project Classification

| Dimension | Valeur |
|-----------|--------|
| **Type de projet** | Web App (SPA Vue.js) |
| **Domaine** | Content Marketing / SEO-GEO |
| **Complexité** | Moyenne — pas de compliance réglementaire, mais intégration IA (Claude API), éditeur riche (TipTap), logique métier cocons sémantiques |
| **Contexte** | Greenfield — nouveau produit from scratch |
| **Stack** | Vue 3 + Composition API, TipTap, Pinia, Node/Express, Claude API, JSON (V1) |

## Success Criteria

### User Success

- **Naturel du contenu** : chaque article généré sonne naturel et pédagogique — le lecteur ne détecte pas que c'est optimisé SEO. Le ton Propulsite (vouvoiement, exemples grandes marques → PME, blocs pédagogiques) est fidèlement reproduit
- **Interaction minimale** : entre le choix de l'article et l'obtention du contenu complet, l'utilisateur n'intervient que pour valider le sommaire. Le reste est 100% automatique
- **Satisfaction sommaire** : le sommaire proposé est validé sans modification majeure dans 80%+ des cas
- **Lecture fluide** : en relisant l'article, l'utilisateur ne remarque pas que les mots-clés ont été intégrés — le texte coule naturellement

### Business Success

- **54 articles publiés** : couverture complète des 6 cocons sémantiques
- **Ranking SEO** : articles positionnés en première page Google sur leurs mots-clés cibles dans les 3-6 mois post-publication
- **Trafic organique** : augmentation mesurable du trafic blog Propulsite après publication des premiers cocons complets
- **Visibilité GEO** : Propulsite cité comme source dans les réponses des moteurs génératifs (Google AI Overviews, Perplexity)
- **Autorité topique** : couverture complète des 6 cocons = signal d'expertise pour Google
- **KPIs traçables** : suivi des positions par mot-clé et des métriques de performance par cocon

### Technical Success

- **Temps de génération** : article complet généré en moins de 60 secondes
- **Score SEO** : chaque article généré dépasse 80/100 sur le scoring interne
- **Maillage cohérent** : 0 articles orphelins, maillage respectant la hiérarchie des cocons
- **Export fiable** : HTML généré conforme au template Propulsite, prêt à publier sans retouche
- **Coût maîtrisé** : coût API (Claude + DataForSEO) inférieur à 0.50€ par article

### Measurable Outcomes

| KPI | Cible | Mesure |
|-----|-------|--------|
| Articles générés et publiés | 54 articles | Compteur dans le dashboard |
| Score SEO moyen par article | > 80/100 | Panel SEO de l'outil |
| Score GEO moyen par article | > 75/100 | Panel GEO de l'outil |
| Maillage interne complet | 0 articles orphelins | Matrice de maillage |
| Couverture mots-clés | 100% des ~100 mots-clés utilisés | Tracking dans la BDD |
| Temps intervention utilisateur | < 5 min/article | Workflow : sélection → validation sommaire |
| Coût par article | < 0.50€ | Tracking API costs |

## Product Scope

### V1 — Version Complète

L'utilisateur a explicitement demandé une V1 très complète, pas un MVP. Toutes les features ci-dessous sont incluses dans la V1.

**1. Dashboard par cocon**
- Liste des 6 cocons sémantiques depuis `BDD_Articles_Blog.json`
- Articles par cocon avec statut (à rédiger / brouillon / publié)
- Mots-clés associés à chaque article depuis `BDD_Mots_Clefs_SEO.json`
- Clic sur un article ouvre le workflow de rédaction
- Statistiques par cocon : % complétion, couverture mots-clés, santé du maillage

**2. Brief SEO/GEO automatique enrichi DataForSEO**
- Mot-clé pilier + moyenne traîne + longue traîne depuis la BDD
- Données DataForSEO intégrées : SERP top 10, People Also Ask, Related Keywords, volumes de recherche, difficulté
- Longueur de contenu recommandée basée sur l'analyse SERP des concurrents
- Type d'article (Pilier / Intermédiaire / Spécialisé) et rôle dans le cocon
- Cache des résultats DataForSEO (1 appel par article, résultat stocké)

**3. Génération de sommaire avec validation utilisateur**
- Génération automatique de la structure H1, H2, H3 alignée au template Propulsite
- Suggestions de H2/H3 basées sur les PAA DataForSEO
- Prise en compte des blocs pédagogiques (content-valeur, content-reminder, sommaire cliquable)
- L'utilisateur valide ou modifie le sommaire avant toute génération de contenu

**4. Génération automatique du contenu**
- Rédaction 100% automatique de l'article complet basée sur le sommaire validé
- System prompt avec style guide Propulsite : vouvoiement, exemples grandes marques → PME, données chiffrées, conclusion actionnable
- Respect de la densité de mots-clés et du placement stratégique (titre, H1, intro, H2s, conclusion, meta)
- Answer capsules automatiques (20-25 mots après chaque H2) pour le GEO
- Titres H2/H3 formulés en questions quand pertinent (boost GEO)
- Minimum 3 statistiques sourcées par article

**5. Panel SEO temps réel**
- Score SEO global actualisé pendant l'édition
- Tracking densité mots-clés (pilier / moyenne traîne / longue traîne) avec cibles
- Checklist SEO : présence mots-clés dans titre, H1, intro, meta description, H2s
- Validation hiérarchie Hn
- NLP terms : liste de termes sémantiques DataForSEO à inclure, cochés quand détectés
- Champ lexical enrichi via DataForSEO Related Keywords

**6. Panel GEO temps réel**
- Score GEO composite (extractibilité, fraîcheur, faits, structure)
- Check answer capsules par H2
- Score titres en questions (% de H2/H3 en questions, cible 70%+)
- Compteur de statistiques/données sourcées (cible : 3-5 minimum)
- Vérification paragraphes courts (max 3 lignes)
- Détection jargon corporate avec propositions de reformulation

**7. Actions contextuelles sur sélection de texte**
- Reformuler
- Simplifier
- Convertir en liste
- Enrichir avec exemple (pattern grandes marques → PME)
- Optimiser pour mot-clé
- Ajouter statistique sourcée
- Créer answer capsule (20-25 mots)
- Formuler en question
- Injecter lien interne

**8. Maillage interne automatique**
- Détection des phrases-ancres pertinentes dans le contenu
- Suggestion et injection automatique des liens vers les autres articles du blog
- Persistance des ancres : liens traçables et conservés lors des régénérations
- Respect de la hiérarchie de cocon (Pilier ↔ Intermédiaire ↔ Spécialisé)
- Matrice de maillage : vue globale quel article lie vers quel article
- Orphan detection : alerte si un article n'a aucun lien entrant
- Diversité d'ancres : éviter le même texte d'ancre partout
- Cross-cocon : identification des opportunités de liens entre cocons

**9. Export HTML + Schema markup**
- HTML final conforme au `templateArticle.html`
- Meta title + meta description optimisés
- Schema markup automatique : Article, FAQPage, BreadcrumbList
- Mise à jour du statut de l'article dans `BDD_Articles_Blog.json`
- JSON-LD injecté dans l'export

**10. Éditeur riche interactif**
- TipTap (ProseMirror) avec template Propulsite préchargé
- Toolbar contextuelle flottante sur sélection de texte
- Panels latéraux SEO et GEO
- Sauvegarde automatique du contenu par article

### Phase 2 — Évolutions Futures

- **Analyse concurrentielle** : structure et mots-clés des top 3 SERP par article
- **Preview SERP** : visualisation title + meta description dans Google
- **Preview GEO** : simulation de citation IA
- **Gap detector** : analyse des contenus concurrents pour suggérer de nouveaux articles
- **Mode "Passion d'abord"** : toggle masquant les panneaux SEO/GEO pour écrire librement
- **Visualisation maillage interactive** : carte du parcours lecteur dans les cocons
- **Inline suggestions SEO** pendant la frappe
- **Évolution stockage** : migration JSON → SQLite ou Supabase si nécessaire

## User Journeys

### Journey 1 : Arnau rédige un article de A à Z (Happy Path)

**Opening Scene :** Arnau ouvre Blog Redactor SEO un mardi matin. Son dashboard affiche les 6 cocons sémantiques avec une barre de progression pour chacun. Le cocon "Croissance Digitale" est à 30% — 3 articles sur 10 sont publiés. Il clique dessus.

**Rising Action :** La liste des articles du cocon apparaît. L'article "Design Émotionnel : Comment Transformer Vos Visiteurs en Clients" est marqué "à rédiger". Il clique. Le brief SEO s'affiche instantanément : mot-clé pilier "design émotionnel site web", 8 mots-clés secondaires, données DataForSEO (volume 720/mois, difficulté 34), longueur recommandée 2500 mots, PAA "Qu'est-ce que le design émotionnel ?". Arnau lance la génération du sommaire. En 5 secondes, un plan H2/H3 apparaît avec des titres en questions et les blocs pédagogiques préplacés. Il ajuste un H2, valide.

**Climax :** Il clique "Générer l'article". En 40 secondes, l'article complet apparaît dans l'éditeur. Il commence à lire — le ton est Propulsite : vouvoiement, l'exemple de Airbnb ramené au contexte d'une PME locale, un bloc content-valeur avec une checklist, des statistiques sourcées. Le panel SEO affiche 85/100, le panel GEO 78/100. Tous les mots-clés sont cochés dans la checklist. Il ne remarque même pas que les mots-clés sont intégrés dans le texte — ça coule naturellement.

**Resolution :** Arnau sélectionne une phrase, clique "Enrichir avec exemple" — un nouvel exemple PME apparaît. Il clique "Maillage auto" — 4 liens internes sont injectés vers les bons articles du cocon. Il exporte en HTML. Le fichier est conforme au template, le schema markup est inclus, le statut de l'article passe à "publié". Le cocon "Croissance Digitale" affiche maintenant 40%.

### Journey 2 : Arnau ajuste un article insatisfaisant (Edge Case)

**Opening Scene :** Arnau ouvre un article déjà généré. En le relisant, il trouve un passage trop générique et un H2 mal formulé.

**Rising Action :** Il sélectionne le passage générique, clique "Reformuler". Une nouvelle version apparaît, plus naturelle. Il sélectionne le H2, clique "Formuler en question" — le H2 devient une question pertinente. Le score GEO monte de 3 points. Il remarque que le panel SEO indique une densité faible pour un mot-clé secondaire. Il sélectionne un paragraphe, clique "Optimiser pour mot-clé" et choisit le mot-clé en question. Le paragraphe est réécrit avec le mot-clé intégré naturellement.

**Climax :** Après 3 retouches ciblées (< 5 minutes), les scores SEO et GEO sont au vert. L'article sonne exactement comme il veut.

**Resolution :** Il exporte. Le HTML est prêt. L'article n'a nécessité que 5 minutes d'ajustement humain au lieu d'une réécriture complète.

### Journey 3 : Arnau surveille la santé de ses cocons (Monitoring)

**Opening Scene :** Arnau revient après avoir publié 20 articles sur 54. Il veut savoir où il en est globalement.

**Rising Action :** Le dashboard affiche chaque cocon avec sa barre de progression, le % de couverture mots-clés, et la santé du maillage. Le cocon "SEO Local" est à 80% de complétion mais la matrice de maillage montre 2 articles orphelins.

**Climax :** Il clique sur la matrice de maillage du cocon. Il voit visuellement quels articles ne sont pas liés. Il ouvre chaque article orphelin et lance le maillage auto — les liens sont injectés.

**Resolution :** Tous les cocons ont un maillage sain. Il sait exactement quels articles rédiger en priorité pour compléter la couverture.

### Journey Requirements Summary

| Journey | Capabilities révélées |
|---------|----------------------|
| **Happy Path** | Dashboard cocons, brief SEO/DataForSEO, génération sommaire, génération article, panels SEO/GEO, actions contextuelles, maillage auto, export HTML, mise à jour statut |
| **Edge Case** | Édition avec actions contextuelles, reformulation, optimisation mot-clé ciblé, scoring temps réel, régénération partielle |
| **Monitoring** | Vue globale cocons, statistiques complétion, matrice maillage, détection orphelins, maillage ciblé |

## Innovation & Novel Patterns

### Detected Innovation Areas

**SEO-native content generation :** L'approche fondamentalement innovante est la fusion de l'optimisation SEO directement dans le processus de génération. Contrairement aux outils existants qui génèrent du contenu puis l'optimisent (approche post-hoc), Blog Redactor SEO produit du contenu où le SEO est une dimension intégrée dès la rédaction. Le résultat est indétectable à la lecture.

**Dual SEO/GEO optimization :** Combiner scoring SEO traditionnel et scoring GEO (optimisation pour moteurs génératifs) dans un même outil. Les answer capsules, titres en questions, et densité de faits sourcés sont intégrés automatiquement dans la génération.

**Style-aware AI generation :** Le système ne produit pas du "contenu IA générique optimisé SEO" mais du contenu qui reproduit fidèlement un style d'écriture spécifique (ton Propulsite) — vouvoiement, exemples grandes marques → PME, blocs pédagogiques structurés.

**Persistent anchor tracking :** Les ancres de maillage interne sont persistantes et traçables. Une régénération d'article conserve les mêmes liens sur les mêmes phrases — le maillage est un graphe stable, pas un résultat aléatoire à chaque génération.

### Validation Approach

- Comparer la lisibilité des articles générés vs articles rédigés manuellement (blind test)
- Vérifier que les scores SEO > 80/100 sont atteints de manière consistante
- Mesurer le taux d'intervention humaine post-génération (cible : < 5 min)
- Suivre le ranking réel des articles publiés sur 3-6 mois

### Risk Mitigation

| Risque | Mitigation |
|--------|-----------|
| **Sur-optimisation SEO** | Limiter la densité max par mot-clé, alerter si texte sonne artificiel |
| **Perte du ton Propulsite** | System prompt détaillé avec exemples réels, validation par l'utilisateur |
| **Coût API excessif** | Cache DataForSEO, génération en une passe (pas de boucles), monitoring des coûts |
| **GEO évolue rapidement** | Règles GEO configurables, pas hardcodées |

## Web App Specific Requirements

### Architecture SPA

- **SPA Vue.js** : Single Page Application avec Vue 3 + Composition API
- **Routing** : Vue Router pour navigation dashboard → éditeur → exports
- **State management** : Pinia pour état global (articles, mots-clés, cocons, configuration)
- **Éditeur** : TipTap (ProseMirror) pour l'édition rich text

### Browser Support

- Chrome (dernière version) — navigateur principal de développement et d'usage
- Support Firefox et Edge en best-effort

### Responsive Design

- **Desktop-first** : l'outil est conçu pour une utilisation desktop (éditeur + panels latéraux)
- Largeur minimum : 1280px
- Pas de support mobile nécessaire (outil à usage personnel sur poste fixe)

### Performance Targets

- Chargement initial de l'app : < 3 secondes
- Navigation entre pages : < 500ms
- Génération sommaire : < 10 secondes
- Génération article complet : < 60 secondes
- Scoring SEO/GEO : mise à jour en < 2 secondes après modification

### Backend

- Node.js / Express comme proxy pour les appels API (Claude, DataForSEO)
- Stockage JSON files en V1 (articles, mots-clés, configuration, maillage)
- Pas de base de données relationnelle en V1
- API REST interne entre frontend et backend

### Intégration DataForSEO

| Endpoint | Données | Usage |
|----------|---------|-------|
| SERP Regular | Top 10 résultats pour le mot-clé pilier | Analyse concurrence, longueur cible |
| People Also Ask | Questions associées | Suggestions H2/H3, FAQ schema |
| Related Keywords | Termes sémantiques liés | Enrichir champ lexical, NLP terms |
| Keyword Data | Volume, CPC, difficulté | Priorisation articles |

Budget estimé : ~0.05-0.10€ par article → ~3-5€ pour 54 articles.

### Intégration Claude API

- Génération de sommaire (prompt structuré avec brief + contraintes)
- Génération d'article complet (system prompt Propulsite + sommaire validé + mots-clés)
- Actions contextuelles (reformuler, simplifier, enrichir, optimiser)
- Modèle : claude-sonnet-4-6 pour les générations rapides, claude-opus-4-6 si qualité insuffisante

## Functional Requirements

### Gestion du Plan Éditorial

- FR1: L'utilisateur peut visualiser les 6 cocons sémantiques avec leur statut de progression (% articles rédigés, publiés)
- FR2: L'utilisateur peut voir la liste des articles par cocon avec leur statut (à rédiger / brouillon / publié)
- FR3: L'utilisateur peut voir les mots-clés associés à chaque article (pilier, moyenne traîne, longue traîne)
- FR4: L'utilisateur peut voir les statistiques de santé par cocon (couverture mots-clés, maillage, complétion)
- FR5: L'utilisateur peut sélectionner un article pour lancer le workflow de rédaction

### Brief SEO/GEO

- FR6: Le système génère automatiquement un brief SEO pour l'article sélectionné (mot-clé pilier, secondaires, type d'article, rôle dans le cocon)
- FR7: Le système enrichit le brief avec les données DataForSEO (SERP top 10, PAA, related keywords, volumes, difficulté)
- FR8: Le système recommande une longueur de contenu basée sur l'analyse SERP des concurrents
- FR9: Le système cache les résultats DataForSEO pour éviter les appels redondants

### Génération de Structure

- FR10: Le système génère un sommaire (H1, H2, H3) aligné au template Propulsite et enrichi par les PAA DataForSEO
- FR11: L'utilisateur peut modifier le sommaire généré (ajouter, supprimer, réordonner, renommer des sections)
- FR12: L'utilisateur peut valider le sommaire pour lancer la génération de contenu
- FR13: Le sommaire intègre automatiquement les blocs pédagogiques Propulsite (content-valeur, content-reminder, sommaire cliquable)

### Génération de Contenu

- FR14: Le système génère l'article complet basé sur le sommaire validé, en respectant le ton Propulsite
- FR15: Le contenu généré intègre les mots-clés de manière naturelle et indétectable à la lecture
- FR16: Le contenu généré inclut des answer capsules (20-25 mots) après chaque H2
- FR17: Le contenu généré inclut des statistiques sourcées (minimum 3 par article)
- FR18: Le contenu généré formule les H2/H3 en questions quand pertinent
- FR19: Le contenu généré respecte le pattern Propulsite : vouvoiement, exemples grandes marques → PME, données chiffrées, conclusion actionnable
- FR20: Le système génère automatiquement le meta title et la meta description optimisés

### Éditeur Rich Text

- FR21: L'utilisateur peut éditer le contenu généré dans un éditeur rich text (TipTap)
- FR22: L'éditeur affiche le contenu avec la mise en forme du template Propulsite
- FR23: L'éditeur sauvegarde automatiquement le contenu
- FR24: L'utilisateur peut sélectionner du texte pour accéder aux actions contextuelles

### Actions Contextuelles

- FR25: L'utilisateur peut reformuler une sélection de texte
- FR26: L'utilisateur peut simplifier une sélection de texte
- FR27: L'utilisateur peut convertir une sélection en liste à puces
- FR28: L'utilisateur peut enrichir une sélection avec un exemple (pattern grandes marques → PME)
- FR29: L'utilisateur peut optimiser une sélection pour un mot-clé ciblé
- FR30: L'utilisateur peut ajouter une statistique sourcée à l'endroit de la sélection
- FR31: L'utilisateur peut créer une answer capsule (20-25 mots) à partir d'une sélection
- FR32: L'utilisateur peut reformuler un titre H2/H3 en question
- FR33: L'utilisateur peut injecter un lien interne sur une sélection en choisissant l'article cible

### Scoring SEO

- FR34: Le système affiche un score SEO global mis à jour en temps réel pendant l'édition
- FR35: Le système affiche la densité par mot-clé (pilier / moyenne traîne / longue traîne) avec cibles et état actuel
- FR36: Le système affiche une checklist SEO : présence des mots-clés dans titre, H1, intro, meta description, H2s, conclusion
- FR37: Le système valide la hiérarchie des titres Hn
- FR38: Le système affiche les NLP terms (termes sémantiques DataForSEO) à inclure, cochés quand détectés dans le texte

### Scoring GEO

- FR39: Le système affiche un score GEO composite mis à jour en temps réel
- FR40: Le système vérifie la présence d'answer capsules par H2
- FR41: Le système mesure le % de H2/H3 formulés en questions
- FR42: Le système compte les statistiques sourcées par article
- FR43: Le système alerte si un paragraphe dépasse 3 lignes
- FR44: Le système détecte le jargon corporate et propose des reformulations

### Maillage Interne

- FR45: Le système détecte les phrases-ancres pertinentes et propose des liens internes vers les articles du blog
- FR46: Le système injecte automatiquement les liens internes validés
- FR47: Les ancres de maillage persistent entre les régénérations d'un même article
- FR48: Le maillage respecte la hiérarchie de cocon (Pilier ↔ Intermédiaire ↔ Spécialisé)
- FR49: Le système affiche une matrice de maillage globale (quel article lie vers quel article)
- FR50: Le système détecte les articles orphelins (aucun lien entrant)
- FR51: Le système vérifie la diversité des textes d'ancre
- FR52: Le système identifie les opportunités de liens cross-cocon

### Export

- FR53: Le système génère le HTML final conforme au `templateArticle.html`
- FR54: Le système injecte le schema markup JSON-LD (Article, FAQPage, BreadcrumbList) dans l'export
- FR55: Le système met à jour le statut de l'article dans `BDD_Articles_Blog.json` après export
- FR56: Le système inclut le meta title et meta description dans l'export HTML

### Données et Persistance

- FR57: Le système charge et interprète `BDD_Articles_Blog.json` (54 articles, 6 cocons, types, slugs, statuts)
- FR58: Le système charge et interprète `BDD_Mots_Clefs_SEO.json` (~100 mots-clés classés par cocon et type)
- FR59: Le système sauvegarde le contenu de chaque article individuellement
- FR60: Le système persiste les données de maillage (liens, ancres, articles cibles) de manière traçable

## Non-Functional Requirements

### Performance

- NFR1: La génération d'un sommaire complète en moins de 10 secondes
- NFR2: La génération d'un article complet complète en moins de 60 secondes
- NFR3: Le scoring SEO/GEO se met à jour en moins de 2 secondes après une modification dans l'éditeur
- NFR4: Le chargement initial de l'application complète en moins de 3 secondes
- NFR5: La navigation entre pages (dashboard → éditeur) complète en moins de 500ms

### Coût

- NFR6: Le coût total API (Claude + DataForSEO) par article reste inférieur à 0.50€
- NFR7: Les résultats DataForSEO sont cachés pour éviter les appels redondants (1 appel par mot-clé pilier, réutilisé ensuite)

### Fiabilité

- NFR8: L'éditeur sauvegarde automatiquement le contenu toutes les 30 secondes pour éviter la perte de données
- NFR9: En cas d'échec d'appel API (Claude ou DataForSEO), le système affiche un message d'erreur clair et permet de réessayer
- NFR10: Les données JSON (articles, mots-clés, maillage) sont sauvegardées de manière atomique pour éviter la corruption

### Sécurité

- NFR11: Les clés API (Claude, DataForSEO) sont stockées côté serveur dans des variables d'environnement, jamais exposées au frontend
- NFR12: L'application tourne en local uniquement — pas d'authentification nécessaire

### Maintenabilité

- NFR13: Les règles GEO (seuils, critères de scoring) sont configurables via un fichier de configuration, pas hardcodées
- NFR14: Le system prompt Propulsite (ton, exemples, blocs pédagogiques) est externalisé dans un fichier éditable
- NFR15: Les templates HTML d'export sont séparés du code applicatif

### Intégration

- NFR16: L'intégration DataForSEO utilise l'API REST officielle avec gestion du rate limiting
- NFR17: L'intégration Claude API utilise le SDK officiel Anthropic avec gestion du streaming pour les générations longues
