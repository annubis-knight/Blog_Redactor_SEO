---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-31.md'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 2
  projectDocs: 0
classification:
  projectType: 'web_app'
  domain: 'SEO Content Production Tool'
  complexity: 'medium'
  projectContext: 'brownfield'
workflowType: 'prd'
completedAt: '2026-03-31'
lastUpdated: '2026-03-31'
updateReason: 'Alignement Phase ② Valider avec brainstorming GO/NO-GO du 2026-03-31'
---

# Product Requirements Document - Blog Redactor SEO

**Author:** Utilisateur
**Date:** 2026-03-30

## Executive Summary

Blog Redactor SEO est un outil de production de contenu SEO conçu pour un consultant solo expert. L'application couvre le cycle complet : stratégie de cocon sémantique (Cerveau), recherche et validation de mots-clés (Moteur), puis rédaction assistée par IA (Rédaction). L'utilisateur cible est un professionnel SEO qui veut passer de "j'ai un cocon à remplir" à "article publié avec des mots-clés validés" de façon quasi-instantanée, sans se noyer dans la complexité des données sous-jacentes.

Le projet est en phase d'évolution majeure : le pipeline Cerveau → Rédaction est fonctionnel (stratégie 6 étapes, brief SEO, génération de sommaire/article, éditeur TipTap avec actions contextuelles). Le périmètre de ce PRD porte sur la restructuration du **Moteur** (passage de 10 onglets plats à 2 phases — Générer, Valider), où la **Phase ② Valider** devient un workflow GO/NO-GO en 3 sous-onglets séquentiels (Capitaine → Lieutenants → Lexique) avec feu tricolore contextuel selon le niveau d'article. Les onglets Intention, Audit et Local sont **extraits vers une vue Dashboard** indépendante. Le PRD couvre aussi la création du **Labo** (espace de recherche libre hors workflow), l'ajout d'un système de **guidage invisible** (progression par article, checks automatiques, bandeaux de transition), et le **pont Cerveau→Moteur** (contexte stratégique accessible et injection dans les prompts IA).

### Ce qui rend ce produit unique

1. **Verdict GO/NO-GO qui donne confiance** — Workflow séquentiel en 3 sous-onglets (Capitaine → Lieutenants → Lexique) avec feu tricolore contextuel selon le niveau d'article (Pilier/Intermédiaire/Spécifique). Seuils transparents au survol, l'IA conseille mais ne touche jamais au verdict, l'utilisateur garde le libre arbitre total (forcer GO, input alternatif). Un seul scraping SERP alimente les Lieutenants ET le Lexique.

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
- **Confiance avant rédaction** — Le feu tricolore GO/NO-GO donne un verdict clair sur le Capitaine. Les Lieutenants sont choisis sur la base des données SERP réelles. Le Lexique est extrait des concurrents. Au moment de rédiger, tout est verrouillé et validé.
- **Recherche libre accessible** — Le Labo permet de vérifier une intuition sur un mot-clé en quelques clics, sans contexte article/cocon.

### Business Success

- **Workflow bout-en-bout** — Le chemin Cerveau → Moteur (2 phases : Générer, Valider) → Rédaction fonctionne pour tout article d'un cocon.
- **Réduction du temps de production** — Le temps entre "je choisis un article" et "article rédigé avec mots-clés validés" diminue significativement vs. le workflow actuel (10 onglets plats). L'onglet Valider est celui où l'on passe le MOINS de temps possible.
- **Autonomie complète** — L'outil couvre 100% du workflow sans basculer vers un outil externe.

### Technical Success

- **Zéro appel API redondant** — Résultats DataForSEO, Claude, autocomplete et intent cachés et réutilisés.
- **Persistance des résultats** — Chaque résultat de service est sauvegardé et rechargé automatiquement à la reprise.
- **Réactivité** — Pas de lag visible. Appels longs en streaming ou asynchrones avec feedback visuel.

### Indicateurs mesurables

| Indicateur | Cible |
|-----------|-------|
| Appels API redondants | 0 (cache systématique) |
| Phases du Moteur identifiables | 2 phases visuelles (Générer, Valider) + 3 sous-onglets séquentiels dans Valider |
| Progression par article | Dots automatiques sur chaque article |
| Persistance des résultats | 100% (rechargement sans re-call) |
| Workflow sans outil externe | Oui |

## User Journeys

### Journey 1 : Production d'article de A à Z (Success Path)

**Contexte :** Lundi matin, l'utilisateur ouvre l'app pour produire un article dans le cocon "CRM pour PME". Pas encore de mots-clés validés.

**Parcours :**
1. **Dashboard** → Silo "Solutions Digitales" → Cocon "CRM pour PME"
2. **Cocoon Landing** → 3 portes : Cerveau (fait), **Moteur** (à faire), Rédaction
3. **Moteur ① Générer** → Sélection de l'article. Discovery lance l'analyse IA, Douleur Intent scanne les résonances. Dots : ●●○○○○
4. **Moteur ② Valider — Capitaine** → Le mot-clé arrive pré-rempli depuis la Phase Cerveau. Thermomètre + KPIs contextuels (Volume, KD, CPC, PAA, Intent, Autocomplete) → feu tricolore GO/ORANGE/NO-GO. Panel IA expert en streaming. Verdict : GO vert. Verrouillage du Capitaine "crm pme". Dots : ●●●○○○
5. **Moteur ② Valider — Lieutenants** → Bouton "Analyser SERP" → scraping top 10. Hn concurrents, PAA associés, groupes croisés → candidats avec badges pertinence [SERP] [PAA] [Groupe]. Sélection de 4 Lieutenants. Dots : ●●●●○○
6. **Moteur ② Valider — Lexique** → TF-IDF extrait des données SERP déjà scrapées (zéro requête supplémentaire). 3 niveaux : Obligatoire/Différenciateur/Optionnel avec densité récurrence/page. Checkbox pré-cochées pour les obligatoires. Dots : ●●●●●●
7. **Rédaction** → Brief enrichi → Sommaire → Article en streaming → Éditeur TipTap
8. **Résultat** → Article rédigé, mots-clés validés, export HTML

**Émotion :** "Le feu vert m'a donné confiance. Trois sous-onglets, un seul scraping SERP, et j'avais capitaine, lieutenants et lexique en 5 minutes."

### Journey 2 : Vérification au Labo (Recherche libre)

**Contexte :** Intuition sur le mot-clé "erp cloud pme". Vérification rapide avant intégration dans un cocon.

**Parcours :**
1. **Navbar** → Clic sur **Labo**
2. **Labo** → Mêmes composants que le Moteur en mode recherche libre — pas de contexte article ni cocon, juste un champ libre. Tape "erp cloud pme", lance le verdict GO/NO-GO (thermomètre + KPIs) : volume 1200, KD 42, feu ORANGE
3. **Exploration rapide** → Vérifie l'autocomplete, PAA, intention — signaux positifs
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
| Success Path | Moteur 2 phases, validation GO/NO-GO en 3 sous-onglets séquentiels, feu tricolore contextuel, SERP comme fondation unique, dots progression, bandeaux transition, pipeline bout-en-bout, enrichissement prompts IA |
| Labo | Verdict GO/NO-GO en mode libre (sans article/cocon), accessible partout |
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

### Phase 1 — MVP : Le socle Capitaine

**Journeys supportés :** Success Path + Reprise de travail

| # | Feature | Justification | Dépendances |
|---|---------|---------------|-------------|
| 1 | Moteur en 2 phases visuelles (Générer, Valider) | Le Moteur passe de 10 onglets plats à 2 phases claires | Aucune |
| 2 | Sous-onglet Capitaine — Thermomètre + KPIs contextuels + feu tricolore GO/ORANGE/NO-GO | Cœur du verdict de viabilité mot-clé | Feature 1 |
| 3 | Seuils contextuels par niveau article (Pilier/Intermédiaire/Spécifique) avec tooltip au survol | L'intelligence est dans le verdict, pas dans l'affichage | Feature 2 |
| 4 | Panel IA expert SEO en streaming (dépliable, ne touche jamais au verdict) | Complément d'information, confiance utilisateur | Feature 2 |
| 5 | Input alternatif + historique slider + mécanisme lock/unlock du Capitaine | L'utilisateur garde le contrôle total | Feature 2 |
| 6 | Découpage automatique en racine(s) pour les mots-clés longue traîne | Enrichissement des données faibles sans remplacer le verdict | Feature 2 |
| 7 | Feedback NO-GO orienté (3 catégories : Trop longue traîne / KPIs faibles / Hors sujet) | Le NO-GO n'est pas un mur, c'est un GPS | Feature 2 |
| 8 | Dots de progression par article | Premier signal de sophistication invisible | Aucune |
| 9 | Checks automatiques sur article-progress (`capitaine_locked`, `lieutenants_locked`, `lexique_validated`) | Fondation du guidage — les dots se remplissent | Feature 8 |
| 10 | Enrichissement prompts IA (Cerveau→Moteur) | Qualité des suggestions IA — invisible | Aucune |

### Phase 2 — Growth : Lieutenants + Lexique + Dashboard

| # | Feature | Dépendances |
|---|---------|-------------|
| 11 | Sous-onglet Lieutenants — bouton "Analyser SERP", Hn concurrents, PAA, Groupes croisés, badges pertinence, sélection checkbox | Feature 5 (Capitaine verrouillé) |
| 12 | Curseur SERP intelligent (3-10, défaut 10) : sous défaut = filtre local, au-dessus = scraping complémentaire | Feature 11 |
| 13 | Sous-onglet Lexique — TF-IDF des données SERP, 3 niveaux (Obligatoire/Différenciateur/Optionnel), densité/page, checkbox pré-cochées | Feature 11 (données SERP héritées) |
| 14 | Extraction Intention/Audit/Local vers vue Dashboard indépendante | Aucune |
| 15 | Bandeaux de transition entre phases | Feature 9 |
| 16 | Contexte stratégique collapsable dans le Moteur | Aucune |
| 17 | Vue Labo (`/labo`) — mêmes composants en mode recherche libre | Aucune |

### Phase 3 — Vision

- Génération de cocons entiers en un clic (articles + mots-clés + rédaction chaînée)
- Suggestions proactives de nouveaux cocons basées sur les gaps de contenu
- Boucle GSC post-publication (le mot-clé ranke-t-il ?)
- Batch processing multi-articles en parallèle
- Score de complémentarité Capitaine ↔ Lieutenants (couverture complète vs. mots-clés isolés)

### Risques du projet

| Type | Risque | Mitigation |
|------|--------|-----------|
| Technique | Restructuration casse les composants existants | Composants internes inchangés — seul le wrapper MoteurView change |
| Technique | Checks automatiques difficiles à brancher | Store `article-progress` existe déjà avec `completedChecks[]` — modification des noms de checks |
| Technique | Enrichissement prompts altère la qualité | Injection en contexte additionnel — facile à A/B tester |
| Technique | Scraping SERP top 10 = temps de réponse long | Curseur 3-10 permet de réduire ; cache TTL persiste les résultats |
| UX | Flux séquentiel (Capitaine → Lieutenants → Lexique) ajoute de la friction | Navigation libre maintenue — le verrouillage est un gating souple, l'utilisateur peut toujours consulter les sous-onglets |
| Scope | Lieutenants + Lexique retardent le MVP | Explicitement Phase 2 — le Capitaine seul couvre le verdict GO/NO-GO |
| Data | Seuils de scoring trop stricts ou trop laxistes | Seuils ajustables à l'implémentation avec données réelles — tooltip transparent |

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

### Moteur — Phase ② Valider (workflow GO/NO-GO en 3 sous-onglets)

**Architecture :** Un seul onglet de validation avec 3 sous-onglets séquentiels. Chaque sous-onglet verrouille ses résultats avant de débloquer le suivant. Le mot-clé arrive pré-rempli depuis la Phase ① Générer. L'utilisateur ne saisit rien sauf s'il veut tester un alternatif.

#### Sous-onglet Capitaine (mot-clé principal)

- FR10 : Le mot-clé Capitaine arrive pré-rempli depuis la Phase Cerveau ou la Phase ① Générer. L'utilisateur peut saisir un mot-clé alternatif et naviguer dans l'historique via un slider
- FR11 : Le système affiche un feu tricolore GO/ORANGE/NO-GO avec un score global calculé à partir de 6 KPIs : Volume, KD, CPC, PAA pertinence, Intent match, Autocomplete
- FR12 : Les seuils de chaque KPI sont contextuels selon le niveau d'article (Pilier/Intermédiaire/Spécifique). Par exemple Volume VERT : >1000 (Pilier), >200 (Intermédiaire), >30 (Spécifique)
- FR13 : Le CPC est un KPI asymétrique : CPC > 2€ = bonus vert, CPC 0-2€ = neutre, jamais de rouge
- FR14 : Si tous les signaux sont à zéro (volume=0 ET PAA=0 ET autocomplete=0), le verdict est NO-GO automatique avec raison "Aucun signal détecté"
- FR15 : Pour les mots-clés longue traîne (3+ mots) avec données faibles, le système découpe automatiquement en racine(s) et affiche les KPIs de la racine en section "Analyse racine" — le verdict reste sur le mot-clé original
- FR16 : Chaque KPI est affiché avec une barre de progression et les zones vert/orange/rouge visibles. Les seuils appliqués sont visibles au survol (tooltip)
- FR17 : Un panel IA expert SEO s'auto-génère en streaming dès que les KPIs sont disponibles. Le panel est dépliable et ne touche JAMAIS au feu tricolore (complément d'information uniquement)
- FR18 : L'utilisateur peut forcer GO sur un verdict ORANGE ou ROUGE (libre arbitre total)
- FR19 : Le NO-GO explique POURQUOI et oriente — trois catégories : "Trop longue traîne" / "KPIs faibles" / "Hors sujet"
- FR20 : L'utilisateur verrouille le Capitaine via un bouton "Valider ce Capitaine" — le verrouillage débloque le sous-onglet Lieutenants. Un mécanisme lock/unlock (cadenas) permet de déverrouiller

#### Sous-onglet Lieutenants (mots-clés secondaires H2/H3)

- FR21 : Le sous-onglet affiche le Capitaine verrouillé et le niveau d'article en en-tête
- FR22 : L'utilisateur lance l'analyse SERP via un bouton "Analyser SERP" — scraping des top 3-10 résultats (curseur configurable, défaut 10)
- FR23 : Le scraping SERP alimente 3 sections dépliables : Structure Hn concurrents (H2 fréquents avec % récurrence), PAA associés (N+2 de pertinence), Groupes de mots-clés (issus de la Phase Cerveau)
- FR24 : Les candidats Lieutenants sont présentés avec des badges de provenance multi-source [SERP] [PAA] [Groupe] et un badge de pertinence (Fort/Moyen/Faible) basé sur la complémentarité avec le Capitaine
- FR25 : L'utilisateur sélectionne les Lieutenants via checkboxes. Un compteur indique le nombre recommandé selon le niveau : Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3
- FR26 : Le curseur SERP est intelligent : sous le défaut = filtre local instantané, au-dessus du défaut = scraping complémentaire
- FR27 : Un panel IA dépliable recommande une structure Hn avec les Lieutenants sélectionnés
- FR28 : L'utilisateur verrouille les Lieutenants via "Valider les Lieutenants" — le verrouillage débloque le sous-onglet Lexique

#### Sous-onglet Lexique (termes sémantiques LSI)

- FR29 : Le Lexique est extrait par analyse TF-IDF des contenus SERP déjà scrapés à l'étape Lieutenants — aucune nouvelle requête API
- FR30 : Les termes sont classés en 3 niveaux : Obligatoire (70%+ des concurrents), Différenciateur (30-70%), Optionnel (<30%) — avec densité de récurrence par page (ex: ×4.2/page)
- FR31 : L'utilisateur valide les termes via checkboxes. Les termes Obligatoires sont pré-cochés
- FR32 : Un panel IA dépliable fournit une analyse lexicale expert avec recommandations
- FR33 : L'utilisateur valide le Lexique via "Valider le Lexique" — les résultats finaux (capitaine, lieutenants[], lexique[]) sont écrits dans le store ArticleKeywords

#### Règles transversales Phase ②

- FR34 : Aucune action automatique au changement de sous-onglet — l'utilisateur déclenche tout manuellement
- FR35 : Les KPIs bruts sont TOUJOURS visibles — libre arbitre > algorithme
- FR36 : La persistance des résultats suit le pattern cache TTL existant avec possibilité de refresh

### Extraction vers Dashboard (Intention, Audit, Local)

- FR37 : Les onglets Intention (SERP intent), Audit (cocon complet) et Local (local vs national + Maps) sont retirés de la Phase ② Valider du Moteur
- FR38 : Ces fonctionnalités sont accessibles dans une vue Dashboard indépendante, découplée du workflow de validation
- FR39 : Les phase checks du Moteur sont modifiés : `capitaine_locked + lieutenants_locked + lexique_validated` remplacent `intent_done + audit_done + local_done`

### Progression et guidage invisible

- FR40 : L'utilisateur peut voir des dots de progression (●/○) à côté de chaque article dans la liste du Moteur
- FR41 : Le système coche automatiquement les étapes complétées : Discovery fait, Radar fait, Capitaine verrouillé, Lieutenants verrouillés, Lexique validé
- FR42 : Un bandeau de suggestion apparaît quand tous les checks d'une phase sont complétés pour l'article en cours
- FR43 : L'utilisateur peut ignorer le bandeau et rester dans la phase actuelle

### Pont Cerveau→Moteur

- FR44 : L'utilisateur peut voir un résumé du contexte stratégique du Cerveau (cible, angle, promesse) dans une section collapsable en haut du Moteur
- FR45 : Le système injecte automatiquement le contexte stratégique du Cerveau dans les prompts IA du Moteur (Discovery, PainTranslator, Panel IA Capitaine) sans action utilisateur

### Labo — Recherche libre

- FR46 : L'utilisateur peut accéder au Labo depuis la Navbar et le Dashboard
- FR47 : L'utilisateur peut utiliser les mêmes composants que le Moteur (Discovery, Douleur Intent, verdict GO/NO-GO Capitaine) en mode recherche libre — sans sélectionner d'article ni de cocon
- FR48 : L'utilisateur peut saisir un mot-clé libre dans le Labo et lancer les analyses disponibles

### Cache et persistance

- FR49 : Le système sauvegarde les résultats de chaque service (Discovery, Validation Capitaine, SERP Lieutenants, Lexique TF-IDF) pour chaque article
- FR50 : Le système recharge automatiquement les résultats sauvegardés quand l'utilisateur revient sur un article
- FR51 : Le système ne relance pas un appel API si un résultat valide existe déjà en cache pour la même requête

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

- NFR8 : Les composants du Moteur fonctionnent en deux modes : contextualisé (article sélectionné, seuils adaptatifs selon le niveau) et libre (Labo, seuils par défaut "Intermédiaire")
- NFR9 : L'enrichissement des prompts IA par le contexte du Cerveau est optionnel — si aucune stratégie n'existe pour le cocon, les prompts fonctionnent sans enrichissement
- NFR10 : Le store `article-progress` avec `completedChecks[]` est la source unique de vérité pour la progression par article. Les checks sont : `capitaine_locked`, `lieutenants_locked`, `lexique_validated`
- NFR11 : Le scraping SERP ne se fait qu'UNE fois (sous-onglet Lieutenants) et les données cascadent vers le Lexique — zéro requête dupliquée
- NFR12 : Les seuils de scoring du feu tricolore sont configurables et stockés de façon transparente (visibles au survol)

### Maintenabilité

- NFR13 : Les composants réutilisés entre Moteur et Labo ne sont pas dupliqués — un seul composant avec un prop de mode (contextualisé / libre)
- NFR14 : Les prompts IA restent dans des fichiers `.md` séparés — l'enrichissement stratégique est un pré-processing en amont, pas une modification du prompt source
