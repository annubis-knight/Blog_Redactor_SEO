---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'web_app'
  domain: 'SEO Content Production Tool'
  complexity: 'medium'
  projectContext: 'brownfield'
workflowType: 'prd'
completedAt: '2026-03-30'
---

# Product Requirements Document - Blog Redactor SEO

**Author:** Utilisateur
**Date:** 2026-03-30

## Executive Summary

Blog Redactor SEO est un outil de production de contenu SEO conçu pour un consultant solo expert. L'application couvre le cycle complet : stratégie de cocon sémantique (Cerveau), recherche et validation de mots-clés (Moteur), puis rédaction assistée par IA (Rédaction). L'utilisateur cible est un professionnel SEO qui veut passer de "j'ai un cocon à remplir" à "article publié avec des mots-clés validés" de façon quasi-instantanée, sans se noyer dans la complexité des données sous-jacentes.

Le projet est en phase d'évolution majeure : le pipeline Cerveau → Rédaction est fonctionnel (stratégie 6 étapes, brief SEO, génération de sommaire/article, éditeur TipTap avec actions contextuelles). Le périmètre de ce PRD porte sur la restructuration du **Moteur** (passage de 10 onglets plats à 3 phases — Générer, Valider, Assigner), la création du **Labo** (espace de recherche libre hors workflow), l'ajout d'un système de **guidage invisible** (progression par article, checks automatiques, bandeaux de transition), et le **pont Cerveau→Moteur** (contexte stratégique accessible et injection dans les prompts IA).

### Ce qui rend ce produit unique

1. **Validation de mots-clés qui donne confiance** — Workflow structuré (Discovery → Validation multi-sources → Audit DataForSEO → Assignation capitaine/lieutenants/lexique) qui donne la certitude que le mot-clé peut ranker avant de rédiger.

2. **Sophistication invisible** — Machine complexe en back, simple en front. L'app note la progression silencieusement, coche les étapes en arrière-plan, suggère la suite sans jamais bloquer la navigation.

3. **Outil taillé sur mesure** — Adapté au workflow du consultant : ordre Cerveau→Moteur→Rédaction, structure en silos/cocons/articles, intégration de la stratégie dans chaque décision IA.

L'insight fondamental : le problème n'est pas de générer du contenu — c'est d'avoir *confiance* dans le mot-clé et la structure *avant* de rédiger. La rédaction devient alors la partie facile.

## Project Classification

| Critère | Valeur |
|---------|--------|
| **Type** | Web App — SPA Vue 3 + API Express |
| **Domaine** | Outil de production de contenu SEO |
| **Complexité** | Moyenne — orchestration de workflows, intégrations API multiples, pas de contraintes réglementaires |
| **Contexte** | Brownfield — 75+ composants, 20 stores Pinia, 27 services, 11 vues |
| **Stack** | Vue 3, Pinia, TipTap, Express 5, Claude API (Anthropic SDK), DataForSEO, Zod, Vitest |
| **Usage** | Local, desktop, utilisateur unique |

## Success Criteria

### User Success

- **Facilité = Qualité** — La simplicité d'utilisation est au même niveau que la qualité des mots-clés validés et des textes produits. L'un ne sacrifie jamais l'autre.
- **Guidage naturel** — L'utilisateur sait toujours où il en est dans le workflow (dots de progression, bandeaux de transition) sans documentation.
- **Confiance avant rédaction** — Au moment de lancer la génération d'article, l'utilisateur a la certitude que capitaine, lieutenants et lexique sont solides.
- **Recherche libre accessible** — Le Labo permet de vérifier une intuition sur un mot-clé en quelques clics, sans contexte article/cocon.

### Business Success

- **Workflow bout-en-bout** — Le chemin Cerveau → Moteur (3 phases) → Rédaction fonctionne pour tout article d'un cocon.
- **Réduction du temps de production** — Le temps entre "je choisis un article" et "article rédigé avec mots-clés validés" diminue significativement vs. le workflow actuel (10 onglets plats).
- **Autonomie complète** — L'outil couvre 100% du workflow sans basculer vers un outil externe.

### Technical Success

- **Zéro appel API redondant** — Résultats DataForSEO, Claude, autocomplete et intent cachés et réutilisés.
- **Persistance des résultats** — Chaque résultat de service est sauvegardé et rechargé automatiquement à la reprise.
- **Réactivité** — Pas de lag visible. Appels longs en streaming ou asynchrones avec feedback visuel.

### Indicateurs mesurables

| Indicateur | Cible |
|-----------|-------|
| Appels API redondants | 0 (cache systématique) |
| Phases du Moteur identifiables | 3 phases visuelles distinctes |
| Progression par article | Dots automatiques sur chaque article |
| Persistance des résultats | 100% (rechargement sans re-call) |
| Workflow sans outil externe | Oui |

## User Journeys

### Journey 1 : Production d'article de A à Z (Success Path)

**Contexte :** Lundi matin, l'utilisateur ouvre l'app pour produire un article dans le cocon "CRM pour PME". Pas encore de mots-clés validés.

**Parcours :**
1. **Dashboard** → Silo "Solutions Digitales" → Cocon "CRM pour PME"
2. **Cocoon Landing** → 3 portes : Cerveau (fait), **Moteur** (à faire), Rédaction
3. **Moteur ① Générer** → Sélection de l'article. Discovery lance l'analyse IA, Douleur Intent scanne les résonances. Dots : ●●○○○○○
4. **Moteur ② Valider** → Bandeau "Génération complète". Validation, Audit DataForSEO, Local. Dots : ●●●●●○○
5. **Moteur ③ Assigner** → Capitaine "crm pme", lieutenants, lexique. Dots : ●●●●●●●
6. **Rédaction** → Brief enrichi → Sommaire → Article en streaming → Éditeur TipTap
7. **Résultat** → Article rédigé, mots-clés validés, export HTML

**Émotion :** "C'était fluide, je savais toujours où j'en étais, et je suis sûr de mes mots-clés."

### Journey 2 : Vérification au Labo (Recherche libre)

**Contexte :** Intuition sur le mot-clé "erp cloud pme". Vérification rapide avant intégration dans un cocon.

**Parcours :**
1. **Navbar** → Clic sur **Labo**
2. **Labo** → Mêmes composants que le Moteur (Discovery, Douleur Intent, Exploration, Audit, Local) en mode recherche libre — pas de contexte article ni cocon, juste un champ libre. Tape "erp cloud pme", lance Exploration + Audit : volume 1200, difficulté 42
3. **Local** → Potentiel local confirmé
4. **Décision** → Mot-clé prometteur, retour au travail en cours

**Émotion :** "J'ai vérifié en 2 minutes sans casser mon workflow."

### Journey 3 : Reprise d'un article en cours

**Contexte :** Article commencé la semaine dernière. Dots : ●●●○○○○.

**Parcours :**
1. **Moteur** → Sélection de l'article. Dots montrent Discovery et Douleur Intent faits
2. **Cache** → Tous les résultats rechargés, aucun re-call API
3. **Phase ② Valider** → Reprise exactement là où il s'était arrêté
4. **Contexte** → Stratégie du Cerveau toujours accessible (collapsable), prompts IA enrichis

**Émotion :** "Tout est resté là où je l'avais laissé."

### Capabilities révélées par les journeys

| Journey | Capabilities |
|---------|-------------|
| Success Path | Moteur 3 phases, dots progression, bandeaux transition, pipeline bout-en-bout, enrichissement prompts IA |
| Labo | Mêmes composants que le Moteur en mode recherche libre (sans article/cocon), accessible partout |
| Reprise | Cache systématique, persistance résultats, rechargement article-progress |

## Innovation & Novel Patterns

### Sophistication invisible

Pattern innovant central. Contrairement aux outils SEO qui soit cachent la complexité (perdant en puissance), soit l'exposent (perdant en utilisabilité), Blog Redactor SEO fait les deux simultanément :

- Traque la progression silencieusement (checks auto en arrière-plan)
- Suggère la suite sans bloquer (bandeaux de transition, messages inline)
- Enrichit les prompts IA avec le contexte stratégique sans que l'utilisateur le voie
- Navigation libre à 100% — aucun gating dur

Pattern inspiré des jeux vidéo (progression invisible, tutoriels non-intrusifs) appliqué à un outil de productivité professionnel.

### Pont Cerveau→Moteur

Injection automatique du contexte stratégique (cible, angle, promesse) dans les prompts IA. La stratégie définie en amont influence silencieusement toutes les suggestions IA en aval.

### Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Guidage trop discret | Dots de progression visibles dans la liste articles — premier signal fort |
| Enrichissement prompts dégrade la qualité IA | Contexte injecté comme additionnel, pas comme contrainte — fallback = prompt standard |
| Navigation libre → étapes sautées | Message inline dans l'Assignation rattrape le cas critique (pas de capitaine validé) |

## Web App — Exigences spécifiques

SPA Vue 3 + backend Express, usage local/desktop, utilisateur unique. Pas de déploiement cloud, pas de multi-utilisateur, pas de SEO sur l'app elle-même.

**Architecture existante :**
- Frontend : Vue 3 + Vue Router + Pinia (20 stores) + TipTap
- Backend : Express 5, port 3005, CORS localhost
- Communication : REST API + SSE streaming
- Validation : Zod schemas partagés front/back
- Data : fichiers JSON locaux
- APIs externes : Claude (Anthropic SDK), DataForSEO, Google Autocomplete, Hugging Face Transformers

**Contraintes brownfield :**
- Réutiliser les 75+ composants existants au maximum (Labo = mêmes composants que Moteur en mode libre)
- Store `article-progress` existe mais n'est pas exploité — fondation des checks automatiques
- Cache DataForSEO en place — étendre aux autres services
- Prompts IA dans des fichiers `.md` séparés — enrichissement par le Cerveau = pré-processing

## Project Scoping & Phased Development

### Stratégie MVP

**Approche : Problem-Solving MVP** — Le minimum qui fait que le workflow Moteur fonctionne de bout en bout pour un article, avec des mots-clés validés et un résultat concret.

**Ressources :** Développeur solo. Pas de contrainte d'équipe.

### Phase 1 — MVP

**Journeys supportés :** Success Path + Reprise de travail

| # | Feature | Justification | Dépendances |
|---|---------|---------------|-------------|
| 1 | Moteur en 3 phases visuelles | Sans ça, le Moteur reste 10 onglets plats | Aucune |
| 2 | Fusion Local + Maps | Prérequis technique (2 → 1 onglet) | Aucune |
| 3 | Retrait Content Gap du Moteur | Suppression de doublon | Aucune |
| 4 | Dots de progression par article | Premier signal de sophistication invisible | Aucune |
| 5 | Checks automatiques sur article-progress | Fondation du guidage — les dots se remplissent | Feature 4 |
| 6 | Message inline dans l'Assignation | Gating souple — rattrape le cas critique | Aucune |
| 7 | Enrichissement prompts IA (Cerveau→Moteur) | Qualité des suggestions IA — invisible | Aucune |

### Phase 2 — Growth (UX polish + Labo)

| # | Feature | Dépendances |
|---|---------|-------------|
| 8 | Bandeaux de transition entre phases | Feature 5 |
| 9 | Contexte stratégique collapsable dans le Moteur | Aucune |
| 10 | Indicateur d'alignement stratégique dans l'Audit | Aucune |
| 11 | Vue Labo (`/labo`) — mêmes composants que le Moteur en mode recherche libre | Aucune |
| 12 | Labo dans la Navbar | Feature 11 |

### Phase 3 — Vision

- Génération de cocons entiers en un clic (articles + mots-clés + rédaction chaînée)
- Suggestions proactives de nouveaux cocons basées sur les gaps de contenu
- Boucle GSC post-publication (le mot-clé ranke-t-il ?)
- Batch processing multi-articles en parallèle

### Risques du projet

| Type | Risque | Mitigation |
|------|--------|-----------|
| Technique | Restructuration casse les composants existants | Composants internes inchangés — seul le wrapper MoteurView change |
| Technique | Checks automatiques difficiles à brancher | Store `article-progress` existe déjà avec `completedChecks[]` |
| Technique | Enrichissement prompts altère la qualité | Injection en contexte additionnel — facile à A/B tester |
| UX | 3 phases ajoutent de la friction | Navigation libre maintenue — phases visuelles, pas bloquantes |
| Scope | Le Labo retarde le MVP | Labo explicitement Post-MVP |

## Functional Requirements

### Moteur — Restructuration en 3 phases

- FR1 : L'utilisateur peut voir les onglets du Moteur organisés en 3 phases visuelles (Générer, Valider, Assigner)
- FR2 : L'utilisateur peut naviguer librement entre les 3 phases et tous les onglets sans aucun blocage
- FR3 : L'utilisateur doit sélectionner un article avant d'utiliser le Moteur (toggle article obligatoire)
- FR4 : L'utilisateur peut voir l'onglet Local qui fusionne les anciens onglets Local/National et Maps & GBP en deux sections dans un même onglet
- FR5 : Le Content Gap n'apparaît pas dans le Moteur (retiré car déjà dans le Brief)

### Moteur — Phase ① Générer

- FR6 : L'utilisateur peut lancer une analyse Discovery (IA) pour produire des mots-clés candidats
- FR7 : L'utilisateur peut lancer un scan Douleur Intent (radar) pour détecter les résonances
- FR8 : L'utilisateur peut traduire une douleur client en mots-clés candidats via l'onglet Douleur
- FR9 : Les onglets Discovery et Douleur Intent sont optionnels et se verrouillent si des mots-clés sont déjà validés

### Moteur — Phase ② Valider

- FR10 : L'utilisateur peut vérifier les mots-clés candidats via la Validation multi-sources
- FR11 : L'utilisateur peut analyser l'intention de recherche via l'Exploration (SERP + autocomplete)
- FR12 : L'utilisateur peut consulter les données DataForSEO d'un mot-clé (volume, difficulté, CPC) via l'Audit
- FR13 : L'utilisateur peut comparer les données Local/National et consulter les résultats Maps & GBP dans l'onglet Local fusionné

### Moteur — Phase ③ Assigner

- FR14 : L'utilisateur peut définir le mot-clé capitaine, les lieutenants et le lexique pour un article
- FR15 : L'onglet Assignation affiche un message explicatif avec lien vers l'Audit si aucun mot-clé capitaine n'est validé

### Progression et guidage invisible

- FR16 : L'utilisateur peut voir des dots de progression (●/○) à côté de chaque article dans la liste du Moteur
- FR17 : Le système coche automatiquement les étapes complétées quand un onglet produit un résultat (Discovery fait, Radar fait, Intention faite, Audit fait, Local fait, Capitaine choisi, Assignation faite)
- FR18 : Un bandeau de suggestion apparaît quand tous les checks d'une phase sont complétés pour l'article en cours
- FR19 : L'utilisateur peut ignorer le bandeau et rester dans la phase actuelle

### Pont Cerveau→Moteur

- FR20 : L'utilisateur peut voir un résumé du contexte stratégique du Cerveau (cible, angle, promesse) dans une section collapsable en haut du Moteur
- FR21 : Le système injecte automatiquement le contexte stratégique du Cerveau dans les prompts IA du Moteur (Discovery, PainTranslator, etc.) sans action utilisateur
- FR22 : L'utilisateur peut voir un indicateur d'alignement stratégique pour chaque mot-clé dans l'Audit (matching textuel cible/localisation)

### Labo — Recherche libre

- FR23 : L'utilisateur peut accéder au Labo depuis la Navbar et le Dashboard
- FR24 : L'utilisateur peut utiliser les mêmes composants que le Moteur (Discovery, Douleur Intent, Exploration, Audit, Local) en mode recherche libre — sans sélectionner d'article ni de cocon
- FR25 : L'utilisateur peut saisir un mot-clé libre dans le Labo et lancer les analyses disponibles

### Cache et persistance

- FR26 : Le système sauvegarde les résultats de chaque service (Discovery, Audit, Validation, Local, Intent) pour chaque article
- FR27 : Le système recharge automatiquement les résultats sauvegardés quand l'utilisateur revient sur un article
- FR28 : Le système ne relance pas un appel API si un résultat valide existe déjà en cache pour la même requête

## Non-Functional Requirements

### Performance

- NFR1 : Les réponses API locales (hors appels externes) sont retournées en < 200ms
- NFR2 : Le streaming SSE (Claude) affiche le premier token en < 2s
- NFR3 : Le chargement d'une vue (changement de route) se fait en < 500ms
- NFR4 : Le cache hit rate DataForSEO atteint > 90% après première utilisation d'un mot-clé

### Optimisation des coûts

- NFR5 : Aucun appel API externe n'est effectué si un résultat valide existe en cache
- NFR6 : Les résultats de tous les services sont persistés sur disque (fichiers JSON) et survivent au redémarrage de l'app
- NFR7 : La taille maximale d'un fichier JSON en mémoire est de 5MB (limite Express actuelle)

### Intégration

- NFR8 : Les composants du Moteur (Discovery, Douleur Intent, Exploration, Audit, Local) fonctionnent en deux modes : contextualisé (article sélectionné) et libre (Labo, sans article)
- NFR9 : L'enrichissement des prompts IA par le contexte du Cerveau est optionnel — si aucune stratégie n'existe pour le cocon, les prompts fonctionnent sans enrichissement
- NFR10 : Le store `article-progress` avec `completedChecks[]` est la source unique de vérité pour la progression par article

### Maintenabilité

- NFR11 : Les composants réutilisés entre Moteur et Labo ne sont pas dupliqués — un seul composant avec un prop de mode (contextualisé / libre)
- NFR12 : Les prompts IA restent dans des fichiers `.md` séparés — l'enrichissement stratégique est un pré-processing en amont, pas une modification du prompt source
