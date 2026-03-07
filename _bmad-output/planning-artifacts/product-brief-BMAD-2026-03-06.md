---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - brainstorming/brainstorming-session-2026-03-06.md
date: 2026-03-06
author: ""
status: complete
---

# Product Brief: Blog Redactor SEO

## Executive Summary

**Blog Redactor SEO** est un outil web dédié à Propulsite qui automatise la rédaction d'articles de blog optimisés SEO/GEO. L'outil exploite une base de données d'articles organisés en cocons sémantiques, une stratégie de mots-clés structurée, et le ton pédagogique unique de Propulsite pour générer des articles complets — du sommaire au HTML final prêt à publier. Inspiré des fonctionnalités de Surfer SEO mais entièrement personnalisé, il résout le problème central : produire du contenu qui rank tout en restant naturel, pédagogique et authentique.

---

## Core Vision

### Problem Statement

Rédiger des articles de blog qui performent en SEO tout en conservant un ton naturel et pédagogique est un défi permanent. Les problèmes concrets :
- **Choix des mots-clés** : difficulté à sélectionner les bons mots-clés, en bonne quantité, pour chaque article
- **Intégration naturelle** : formuler des phrases qui intègrent les mots-clés sans que ça sonne artificiel à la lecture
- **Triple contrainte** : maintenir simultanément un objectif de pédagogie, de ranking SEO, et de naturel dans le contenu
- **Absence de processus** : aujourd'hui aucun workflow structuré de rédaction n'est en place, les articles existants ne sont pas publiés

### Problem Impact

Sans outil dédié, les 54 articles planifiés sur 6 cocons sémantiques restent en attente. Chaque jour sans contenu publié est une opportunité de ranking perdue. En 2026, avec 25% du trafic migrant vers les moteurs génératifs (Google AI Overviews, Perplexity, ChatGPT), l'absence de contenu optimisé SEO et GEO signifie une invisibilité croissante pour Propulsite.

### Why Existing Solutions Fall Short

Les outils existants (Surfer SEO, Frase, ChatGPT) présentent des lacunes critiques :
- **Pas de personnalisation profonde** : ils ne connaissent pas le ton Propulsite, les exemples grandes marques ramenés au contexte PME, ni les blocs pédagogiques spécifiques (content-valeur, content-reminder)
- **Pas de template dédié** : aucun ne produit du HTML conforme au template Propulsite
- **Pas de connaissance du plan éditorial** : ils ignorent la BDD d'articles, les cocons, et les relations entre contenus
- **Pas de maillage intelligent** : ils ne peuvent pas mailler automatiquement entre des articles qu'ils ne connaissent pas
- **Mode "générique"** : le contenu généré manque d'identité — ce n'est pas "comme j'ai envie de faire moi"

### Proposed Solution

Un outil web Vue.js de rédaction automatisée qui fonctionne en workflow séquentiel :
1. **Sélection** : l'utilisateur choisit un cocon → voit les articles proposés à rédiger
2. **Brief SEO** : l'outil génère automatiquement le brief avec mots-clés, longueur recommandée et données SERP
3. **Sommaire** : génération automatique de la structure (H1, H2, H3) — **validation obligatoire par l'utilisateur** avant de continuer
4. **Rédaction** : génération 100% automatique du contenu complet (intro, chapitres, exemples, conclusion) dans le ton Propulsite
5. **Maillage** : injection automatique des liens internes sur des phrases judicieuses, avec ancres persistantes et traçables
6. **Export** : HTML final conforme au template, prêt à publier

### Key Differentiators

- **Outil 100% dédié** : connaît la BDD d'articles, les mots-clés, les cocons et le style Propulsite — ce n'est pas un outil générique
- **Ton et pédagogie intégrés** : reproduit le style conversationnel, les exemples grandes marques → PME, les blocs pédagogiques
- **Maillage persistant** : les ancres internes sont traçables — une régénération d'article conserve les mêmes liens sur les mêmes phrases
- **Validation du sommaire** : l'utilisateur garde le contrôle sur la structure avant la génération complète
- **HTML prêt à publier** : sortie conforme au template Propulsite, pas de copier-coller à reformater
- **Stratégie SEO/GEO intégrée** : scoring temps réel inspiré de Surfer SEO, optimisation pour les moteurs génératifs

---

## Target Users

### Primary Users

**Arnau — Fondateur de Propulsite**

- **Contexte** : entrepreneur Toulousain, expert en croissance digitale pour PME/TPE, rédige lui-même le contenu du blog Propulsite
- **Compétences** : connaissance approfondie du marketing digital et de la pédagogie, mais pas expert SEO technique (choix de mots-clés, densité, placement stratégique)
- **Motivation** : publier 54 articles de qualité sur 6 cocons sémantiques pour établir l'autorité topique de Propulsite et générer du trafic organique
- **Frustration actuelle** : écrit avec passion et pédagogie mais n'a pas de processus pour intégrer le SEO naturellement. Les articles restent non publiés faute d'optimisation
- **Besoin** : un outil qui automatise toute la chaîne de rédaction SEO, du choix d'article à l'export HTML, en reproduisant son ton unique
- **Moment "aha!"** : cliquer sur un cocon, valider un sommaire, et obtenir un article complet prêt à publier qui sonne comme s'il l'avait écrit lui-même, mais optimisé SEO

### Secondary Users

N/A — Outil à usage personnel uniquement. Pas d'autres rédacteurs ou administrateurs prévus.

### User Journey

1. **Ouverture** : Arnau ouvre l'outil, voit le dashboard de ses 6 cocons avec le statut de chaque article
2. **Sélection** : il clique sur un cocon, parcourt les articles proposés, en choisit un à rédiger
3. **Brief** : l'outil affiche le brief SEO (mot-clé pilier, mots-clés secondaires, longueur recommandée)
4. **Sommaire** : l'outil génère un plan (H1, H2, H3). Arnau valide ou ajuste le sommaire
5. **Génération** : l'outil rédige l'article complet avec le ton Propulsite, les exemples, les blocs pédagogiques
6. **Review** : Arnau relit, voit le score SEO en temps réel dans le panel latéral. Il peut utiliser les actions contextuelles (reformuler, simplifier, etc.)
7. **Maillage** : l'outil injecte automatiquement les liens internes vers les autres articles du blog sur des phrases pertinentes
8. **Export** : un clic génère le HTML final conforme au template, prêt à copier dans le CMS

---

## Success Metrics

### User Success

- **Articles publiés** : passer de 0 à 54 articles publiés et optimisés
- **Temps par article** : réduire le temps de production d'un article complet (rédaction + optimisation + maillage + mise en forme) à moins de 30 minutes d'intervention utilisateur
- **Qualité perçue** : chaque article sonne naturel et pédagogique — le lecteur ne détecte pas que c'est généré par IA
- **Satisfaction sommaire** : le sommaire proposé est validé sans modification majeure dans 80%+ des cas

### Business Objectives

- **Ranking SEO** : articles positionnés en première page Google sur leurs mots-clés cibles dans les 3-6 mois post-publication
- **Trafic organique** : augmentation mesurable du trafic blog Propulsite après publication des premiers cocons complets
- **Visibilité GEO** : Propulsite cité comme source dans les réponses des moteurs génératifs (Google AI Overviews, Perplexity)
- **Autorité topique** : couverture complète des 6 cocons sémantiques = signal d'expertise pour Google

### Key Performance Indicators

| KPI | Cible | Mesure |
|-----|-------|--------|
| Articles générés et publiés | 54 articles | Compteur dans le dashboard |
| Score SEO moyen par article | > 80/100 | Panel SEO de l'outil (inspiré Surfer SEO) |
| Maillage interne complet | 0 articles orphelins | Matrice de maillage |
| Couverture mots-clés | 100% des ~100 mots-clés utilisés | Tracking dans la BDD |
| Temps intervention utilisateur | < 30 min/article | Workflow : sélection → validation sommaire → review → export |

---

## MVP Scope

### Core Features (MVP — P0)

1. **Dashboard par cocon**
   - Liste des 6 cocons sémantiques (depuis `BDD_Articles_Blog.json`)
   - Articles par cocon avec statut (à rédiger / brouillon / publié)
   - Mots-clés associés à chaque article (depuis `BDD_Mots_Clefs_SEO.json`)
   - Clic sur un article → ouvre le workflow de rédaction

2. **Brief SEO automatique**
   - Affichage du mot-clé pilier + moyenne traine + longue traine
   - Proposition de longueur de contenu recommandée
   - Type d'article (Pilier / Intermédiaire / Spécialisé) et son rôle dans le cocon

3. **Génération de sommaire (avec validation utilisateur)**
   - Génération automatique de la structure H1, H2, H3 alignée sur le template Propulsite
   - L'utilisateur valide ou modifie le sommaire avant toute génération de contenu
   - Prise en compte des blocs pédagogiques (content-valeur, content-reminder, sommaire cliquable)

4. **Génération automatique du contenu**
   - Rédaction 100% automatique de l'article complet basée sur le sommaire validé
   - Reproduction du ton Propulsite : vouvoiement, exemples grandes marques → PME, données chiffrées, conclusion actionnable
   - Respect de la densité de mots-clés et du placement stratégique (titre, H1, intro, H2s, conclusion, meta)

5. **Panel SEO temps réel**
   - Score SEO global actualisé pendant l'édition
   - Tracking densité mots-clés (pilier / moyenne traine / longue traine)
   - Checklist SEO : présence mots-clés dans titre, H1, intro, meta description, H2s
   - Validation hiérarchie Hn

6. **Actions contextuelles sur sélection de texte**
   - Reformuler
   - Simplifier
   - Convertir en liste
   - Enrichir avec exemple (pattern grandes marques → PME)

7. **Maillage interne automatique**
   - Détection des phrases-ancres pertinentes dans le contenu
   - Suggestion et injection automatique des liens vers les autres articles du blog
   - Persistance des ancres : les liens sont traçables et conservés lors des régénérations
   - Respect de la hiérarchie de cocon (Pilier ↔ Intermédiaire ↔ Spécialisé)

8. **Export HTML**
   - Génération du HTML final conforme au `templateArticle.html`
   - Meta title + meta description optimisés
   - Mise à jour du statut de l'article dans `BDD_Articles_Blog.json`

### Out of Scope for MVP

- **Intégration DataForSEO** : pas de requêtes API externes dans le MVP. Les données SEO sont tirées des BDD JSON existantes
- **Score GEO** : panel GEO dédié, answer capsules automatiques, schema markup → Phase 1
- **Génération IA de la structure basée sur SERP** : analyse concurrentielle automatique → Phase 1
- **Actions contextuelles avancées** : "Ajouter statistique", "Créer answer capsule", "Formuler en question" → Phase 2
- **Preview SERP / Preview GEO** → Phase 2
- **Cocon health dashboard** (vue macro) → Phase 2
- **Gap detector**, Mode "Passion d'abord", visualisation maillage, inline suggestions → Phase 3

### MVP Success Criteria

- L'utilisateur peut sélectionner un article depuis le dashboard, valider un sommaire, obtenir un article complet généré, et exporter le HTML final — en un seul workflow fluide
- Le contenu généré respecte le ton Propulsite et intègre les mots-clés de manière naturelle
- Le score SEO de chaque article généré dépasse 80/100
- Le maillage interne est cohérent avec la structure en cocons
- Les ancres de maillage persistent entre les régénérations d'un même article

### Future Vision

**Phase 1 — IA + DataForSEO + GEO**
- Intégration DataForSEO (SERP, PAA, Related Keywords, volumes) pour enrichir les briefs
- Score GEO avec vérification answer capsules, titres en questions, densité de faits
- Schema markup automatique (Article, FAQPage, BreadcrumbList) dans l'export
- Génération de structure basée sur l'analyse des top résultats Google

**Phase 2 — Polish + Analytics**
- Actions contextuelles avancées (statistiques sourcées, answer capsules, questions)
- Analyse concurrentielle (structure et mots-clés des top 3 SERP)
- Cocon health dashboard (% complétion, maillage, couverture mots-clés)
- Preview SERP (title + meta description dans Google)

**Phase 3 — Innovation**
- Gap detector : analyse des contenus concurrents pour suggérer de nouveaux articles
- Mode "Passion d'abord" : toggle qui masque les panneaux SEO pour écrire librement
- Visualisation maillage interactive (carte du parcours lecteur dans les cocons)
- Inline suggestions SEO pendant la frappe
- Preview GEO (simulation de citation IA)

---

## Technical Considerations

### Stack technique

| Couche | Choix | Raison |
|--------|-------|--------|
| Frontend | Vue 3 + Composition API | Choix de l'utilisateur |
| Éditeur | TipTap (ProseMirror) | Meilleur éditeur rich text pour Vue, extensible |
| State | Pinia | Standard Vue 3 |
| Backend | Node/Express ou Nitro | Proxy pour API IA + stockage |
| IA | Claude API (Anthropic) | Génération de contenu, reformulation, suggestions |
| Stockage | JSON files (MVP) | Simple, évolutif vers SQLite/Supabase ensuite |

### Données existantes

- `BDD_Articles_Blog.json` : 54 articles sur 6 cocons (Pilier / Intermédiaire / Spécialisé)
- `BDD_Mots_Clefs_SEO.json` : ~100 mots-clés classés par cocon et type
- `templateArticle.html` : structure HTML de référence pour l'export
- 2 articles exemples : base du style guide Propulsite
