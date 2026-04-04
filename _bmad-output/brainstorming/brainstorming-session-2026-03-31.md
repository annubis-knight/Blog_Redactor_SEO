---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Redéfinir la validation mot-clé comme décision binaire GO/NO-GO — onglet unique, exhaustif, user-friendly'
session_goals: 'Identifier le strict nécessaire pour un verdict GO/NO-GO, extraire Intention/Audit/Local vers le dashboard, repenser les flux de données'
selected_approach: 'progressive-flow'
techniques_used: ['Question Storming', 'First Principles Thinking', 'Morphological Analysis', 'Decision Tree Mapping']
ideas_generated: 52
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitateur:** Arnau
**Date:** 2026-03-31

---

## Session Overview

**Sujet :** Redéfinir la validation mot-clé SEO comme une décision binaire GO/NO-GO dans un onglet unique, exhaustif et user-friendly
**Objectifs :**
- Identifier les fonctionnalités réellement obligatoires pour valider un mot-clé
- Séparer Intention, Audit, Local du Moteur → vue Dashboard
- Repenser les flux de données entre composants

### Contexte Technique Actuel

La Phase ② Valider actuelle mélange 3 niveaux de décision :
1. **Viabilité mot-clé** (Validation) — GO/NO-GO
2. **Stratégie contenu** (Intention) — quel contenu créer
3. **Cohérence cocon** (Audit + Local) — architecture globale

**Décision :** Focus exclusif sur le niveau 1 — la viabilité du mot-clé.

### Hiérarchie militaire validée (code existant)

| Grade | Rôle | Quantité | Usage |
|-------|------|----------|-------|
| **Capitaine** | Mot-clé **principal** | 1 par article | Title, H1, URL |
| **Lieutenants** | Mots-clés **secondaires** | 2-5 par article | H2, H3 |
| **Lexique** | Termes sémantiques LSI | 10-15 par article | Corps de texte |

Source : `shared/types/keyword.types.ts` — `ArticleKeywords { capitaine: string, lieutenants: string[], lexique: string[] }`

---

## Technique Selection

**Approche :** Progressive Technique Flow
**Design :** Développement systématique de l'exploration vers l'action

**Techniques progressives :**
- **Phase 1 - Exploration :** Question Storming — définir l'espace du problème
- **Phase 2 - Reconnaissance de patterns :** First Principles Thinking — identifier les vérités fondamentales
- **Phase 3 - Développement :** Morphological Analysis — combiner les paramètres de validation
- **Phase 4 - Plan d'action :** Decision Tree Mapping — cartographier le flux GO/NO-GO + architecture données

---

## Technique Execution Results

### Phase 1 : Question Storming — Exploration expansive

**Focus :** Cartographier toutes les questions qu'un rédacteur SEO doit pouvoir résoudre en regardant un seul écran de validation.

**Idées générées (22) :**

**[Flux #1]** Le mot-clé n'est pas saisi — il arrive pré-rempli depuis la Phase Cerveau. L'onglet Validation est un juge, pas un explorateur.

**[Flux #2]** Un seul visuel unifié pour tous les niveaux (Pilier, Intermédiaire, Spécifique). Les données sont riches pour les piliers et pauvres pour les spécifiques — mais l'interface doit rester identique.

**[Flux #3]** Si c'est validé → on passe vite. Le meilleur onglet de validation est celui où tu passes le MOINS de temps possible.

**[Verdict #4]** Feu tricolore — GO (vert) / INCERTAIN (orange) / NO-GO (rouge). L'orange signifie "les données ne suffisent pas à trancher, mais ce n'est pas mort".

**[Data #5]** Découpage de mot-clé long pour obtenir des données représentatives. Quand le mot-clé renvoie 0, tester automatiquement la racine courte pour avoir des signaux exploitables.

**[UX #6]** Les mêmes KPIs affichés, mais l'interprétation s'adapte au niveau d'article. Volume 50 = rouge pour Pilier, vert pour Spécifique. L'intelligence est dans le verdict, pas dans l'affichage.

**[Flow #7]** Le mot-clé arrive déjà assigné à un article → le niveau est connu d'avance. Les seuils de verdict sont automatiques. Zéro configuration côté utilisateur.

**[Feedback #8]** NO-GO doit expliquer POURQUOI et orienter l'utilisateur. Trois catégories : "Trop longue traîne" / "KPIs faibles" / "Hors sujet". Le NO-GO n'est pas un mur, c'est un GPS.

**[Signal #9]** Groupes de mots-clés issus de la Phase Cerveau comme signal de pertinence contextuelle dans le cocon sémantique.

**[Signal #10]** People Also Ask comme validateur thématique. Le nombre de PAA pertinents devient un KPI en soi.

**[Business #11]** CPC comme KPI business non-rédhibitoire. CPC = 0 n'est pas un NO-GO. CPC > 0 est un signal positif business. Asymétrie volontaire.

**[Intent #12]** Tag d'intention de recherche comme critère de validation. L'intention croise le niveau d'article.

**[UX #13]** Fallback manuel — l'utilisateur peut taper un mot-clé de remplacement. L'onglet passe de "juge passif" à "juge interactif".

**[UX #14]** Remplacement du mot-clé de l'article directement depuis l'onglet. Court-circuit du workflow — évite un aller-retour frustrant.

**[Verdict #15]** Score global (feu tricolore) + détail de CHAQUE KPI avec sa contribution. Le verdict est le titre, les KPIs sont le raisonnement. Transparence totale.

**[UX #16]** Orange = pouvoir à l'utilisateur. L'IA sait dire "je ne sais pas" — et c'est une feature, pas un bug.

**[IA #17]** Panel de conseils IA — prompt expert SEO. L'IA ne juge pas avec un chiffre, elle argumente comme un consultant.

**[UX #18]** Historique des mots-clés testés avec slider de navigation (pattern du workflow Cerveau).

**[Flow #19]** Validation en 3 temps séquentiels : Capitaine → Lieutenants → Lexique. Un seul onglet, trois sous-onglets. Chaque étape débloque la suivante.

**[SERP #20]** Récupération des termes concurrents depuis la SERP. Le champ lexical n'est pas inventé — il est extrait de la réalité compétitive.

**[Reuse #21]** PAA avec analyse N+2 de pertinence — fonctionnalité existante à réutiliser.

**[Reuse #22]** Slider/persistance du workflow Cerveau — pattern à reproduire.

---

### Phase 2 : First Principles Thinking — Vérités fondamentales

**Focus :** Éliminer les suppositions et identifier les vérités non-négociables de la validation mot-clé.

**13 vérités testées et validées :**

| # | Vérité | Statut |
|---|--------|--------|
| V1 | Zéro partout (volume + PAA + autocomplete) = NO-GO automatique | **ABSOLU** |
| V2 | KPIs bruts TOUJOURS visibles — libre arbitre > algorithme | **ABSOLU** |
| V3 | Capitaine validé AVANT Lieutenants — dépendance séquentielle stricte | **ABSOLU** |
| V4 | Mêmes poids de KPIs, interprétation contextuelle selon niveau article | **ABSOLU** |
| V5 | Panel IA = complément, ne touche JAMAIS au feu tricolore | **ABSOLU** |
| V6 | L'utilisateur peut forcer GO sur ORANGE ou ROUGE | **ABSOLU** |
| V8 | Seuils fixes, transparents, visibles au survol, contextualisés | **ABSOLU** |
| V9 | Découpage mot-clé = enrichissement, jamais remplacement du verdict | **ABSOLU** |
| V10 | Champ lexical = OBLIGATOIRE, pas optionnel | **ABSOLU** |
| V11 | Aucune action auto au changement d'onglet — l'utilisateur déclenche tout | **ABSOLU** |
| V12 | Multi-sources priorisées mais pas obligatoires | **BONNE PRATIQUE** |
| V13 | SERP : 5→10 par défaut, configurable 3-10 | **CONFIGURABLE** |

**Idées supplémentaires (13) :**

**[IA #23]** Panel IA auto-généré en streaming dès que les KPIs sont disponibles. Zéro friction.

**[UX #24]** Mécanisme lock/unlock du mot-clé Capitaine. Bouton cadenas visible avec possibilité de déverrouiller.

**[SEO #25]** Hiérarchie sémantique N / N+1 / N+2 pour les Lieutenants. Sources : Groupes + PAA + Related Searches.

**[SEO #26]** Validation des Lieutenants — KPIs adaptés : pertinence sémantique et couverture d'intention > volume.

**[SEO #27]** Score de complémentarité Capitaine ↔ Lieutenant. On ne cherche pas des bons mots-clés isolés — on cherche une couverture complète.

**[SEO #28]** Extraction TF-IDF des top résultats SERP pour le champ lexical. On ne devine pas — on mesure.

**[SEO #29]** Trois niveaux de termes lexicaux : Obligatoire (70%+) / Différenciateur (30-70%) / Optionnel (<30%).

**[SEO #30]** Nombre configurable de résultats à scraper (3-10), défaut 10.

**[UX #31]** Champ lexical avec validation par checkbox. Termes obligatoires pré-cochés.

**[UX #32]** Sous-onglets internes : Capitaine / Lieutenants / Lexique. Cohérence terminologique.

**[Persist #33]** Persistance avec TTL variable + possibilité de refresh. Pattern de cache déjà implémenté.

**[Flow #34]** Pas de lien visuel automatique Cerveau ↔ Validation. L'utilisateur est le pilote.

**[Flow #35]** Faciliter les transitions de données, pas les transitions d'interface. Les données suivent, l'interface attend.

---

### Phase 3 : Morphological Analysis — Assemblage des sous-onglets

**Focus :** Combiner systématiquement les dimensions UX/Data/Interaction pour chaque sous-onglet.

#### Layout Capitaine (mot-clé principal)

**Dimensions choisies :**
- D1 : Thermomètre existant + sections dépliables par fonctionnalité (PAA, Groupes, Autocomplete, etc.)
- D2 : Panel IA en section sous les KPIs, dépliable, auto-chargé
- D3 : Input en haut de page avec slider d'historique en-dessous
- D4 : Tooltip seuils au survol + barres par KPI avec zones vert/orange/rouge
- D5 : Section dédiée "Analyse racine" sous les KPIs (conditionnelle)
- D6 : Bouton "Valider ce Capitaine" en bas de page

```
┌─────────────────────────────────────────────────┐
│  Input mot-clé alternatif    [Rechercher]       │
│  ◄ ● ● ● ► Historique slider                   │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │     THERMOMÈTRE (composant existant)      │  │
│  │     Score global + Feu tricolore          │  │
│  │     [Survol → tooltip seuils appliqués]   │  │
│  └───────────────────────────────────────────┘  │
├─── KPIs détaillés ──────────────────────────────┤
│  Volume ████████░░ 720/mois    [vert]           │
│  KD     ███░░░░░░░ 23/100     [vert]           │
│  CPC    █████░░░░░ 1.2€       [orange]          │
│  Intent [Informationnelle]     [vert]           │
│  (barres avec zones vert/orange/rouge visibles) │
├─── Analyse racine (si données faibles) ─────────┤
│  Mot-clé original : "soulager douleur cervi..." │
│  → Racine "douleur cervicale" : Vol 2400, KD 34 │
├─── Fonctionnalités détaillées ──────────────────┤
│  PAA (People Also Ask)              [▼ déplier] │
│  Groupes de mots-clés               [▼ déplier] │
│  Autocomplete                        [▼ déplier] │
│  Discussions communautaires          [▼ déplier] │
├─── Panel Conseil IA (auto, dépliable) ──────────┤
│  ▼ Analyse Expert SEO                           │
│  "Ce mot-clé présente un bon potentiel..."      │
├─────────────────────────────────────────────────┤
│          [ Valider ce Capitaine ]                │
└─────────────────────────────────────────────────┘
```

#### Layout Lieutenants (mots-clés secondaires)

**Dimensions choisies :**
- D1 : Trois sources séparées, déclenchées par un seul bouton "Analyser SERP" (pattern Discovery)
- D2 : Liste fusionnée des H2 fréquents avec % de récurrence
- D3 : Checkbox + badge pertinence (fort/moyen/faible) + compteur recommandé
- D4 : Curseur 3-10, défaut 10. Sous 10 = filtre local. Au-dessus = scraping complémentaire
- D5 : Même pattern IA — section dépliable avec structure Hn recommandée

```
┌─────────────────────────────────────────────────┐
│  Capitaine verrouillé : "douleur cervicale"     │
│  Article : [Spécifique] Soulager la douleur     │
├─────────────────────────────────────────────────┤
│  Résultats SERP : top [██████████] 10 sites     │
│  [ Analyser SERP ]                              │
├─── Structure Hn concurrents ─────[▼ déplier] ──┤
│  H2 "Causes de la douleur"    9/10 ██████░     │
│  H2 "Symptômes associés"      7/10 █████░░     │
│  H2 "Traitements naturels"    6/10 ████░░░     │
├─── PAA associés (N+2)  ─────────[▼ déplier] ──┤
│  "Comment soulager rapidement ?" — 8/10        │
│  "Quelle est la cause principale ?" — 6/10     │
├─── Groupes mots-clés (Cerveau) ─[▼ déplier] ──┤
│  Cluster "traitement cervicale" — 12 termes    │
│  Cluster "cause douleur cou" — 8 termes        │
├─── Sélection des Lieutenants ───────────────────┤
│  Lieutenants sélectionnés : 4/6 recommandés     │
│  ☑ "causes douleur cervicale"                   │
│    [SERP 9/10] [PAA] [Groupe] — Fort           │
│  ☑ "traitement douleur cervicale"               │
│    [SERP 6/10] [Groupe] — Fort                 │
│  ☑ "exercices douleur cervicale"                │
│    [SERP 3/10] [PAA] — Moyen                   │
│  ☐ "douleur cervicale stress"                   │
│    [Groupe] — Faible                            │
├─── Panel Conseil IA ────────────────────────────┤
│  ▼ Structure Hn recommandée                     │
│  "Je recommande 5 H2 couvrant : causes,        │
│   symptômes, traitements, exercices, quand      │
│   consulter. Il manque un angle prévention."    │
├─────────────────────────────────────────────────┤
│          [ Valider les Lieutenants ]             │
└─────────────────────────────────────────────────┘
```

#### Layout Lexique (termes sémantiques LSI)

**Dimensions choisies :**
- D1 : Données extraites du scraping SERP déjà effectué (Lieutenants) — pas de nouvelle requête
- D2 : 3 niveaux (Obligatoire/Différenciateur/Optionnel) + densité récurrence/page
- D3 : Checkbox par terme, obligatoires pré-cochés
- D4 : Même pattern IA — section dépliable avec analyse lexicale

```
┌─────────────────────────────────────────────────┐
│  Capitaine : "douleur cervicale"                │
│  Lieutenants : causes, traitement, exercices    │
│  Article : [Spécifique] Soulager la douleur     │
├─── Termes OBLIGATOIRES (70%+ concurrents) ──────┤
│  ☑ "cervicalgie"        9/10  ×4.2 /page  🟢   │
│  ☑ "trapèze"            8/10  ×3.1 /page  🟢   │
│  ☑ "tensions musculaires" 7/10  ×2.8 /page 🟢  │
│  ☑ "posture"            7/10  ×5.6 /page  🟢   │
├─── Termes DIFFÉRENCIATEURS (30-70%) ────────────┤
│  ☐ "arthrose cervicale"  5/10  ×1.9 /page  🟡  │
│  ☐ "nerf coincé"         4/10  ×1.4 /page  🟡  │
│  ☐ "kinésithérapie"      4/10  ×2.1 /page  🟡  │
├─── Termes OPTIONNELS (<30%) ────────────────────┤
│  ☐ "fascia"              2/10  ×0.8 /page  🟠  │
│  ☐ "myorelaxant"         1/10  ×1.1 /page  🟠  │
├─── Panel Conseil IA ────────────────────────────┤
│  ▼ Analyse Lexicale Expert SEO                  │
│  "Les 4 termes obligatoires couvrent le champ   │
│   médical de base. Ajoutez 'kinésithérapie'     │
│   — densité forte (2.1/page) chez 4/10."        │
├─────────────────────────────────────────────────┤
│          [ Valider le Lexique ]                  │
└─────────────────────────────────────────────────┘
```

**Idées Morphological Analysis (8) :**

**[SEO #36]** Lieutenants présentés comme liste de candidats avec badge pertinence (fort/moyen/faible) basé sur complémentarité + source.

**[SEO #37]** Nombre de Lieutenants recommandé selon niveau : Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3.

**[BREAKTHROUGH #38]** SERP Analysis comme FONDATION des Lieutenants — un seul scraping, trois usages (Hn → Lieutenants, TF-IDF → Lexique, PAA → validation).

**[SEO #39]** Les Hn concurrents révèlent directement les Lieutenants attendus par Google.

**[ARCH #40]** Nouveau flux en 3 temps : Capitaine (KPIs) → Lieutenants (SERP) → Lexique (TF-IDF du même scraping).

**[UX #41]** AUCUNE action automatique au changement d'onglet ou au verrouillage. L'utilisateur clique toujours.

**[Tech #42]** Curseur SERP intelligent : sous le défaut = filtre local instantané, au-dessus = scraping complémentaire.

**[UX #46]** Tags de provenance multi-source [SERP] [PAA] [Groupe] sur chaque candidat Lieutenant.

---

### Phase 4 : Decision Tree Mapping — Arbres de décision

**Focus :** Cartographier les chemins de décision et les flux de données pour l'implémentation.

#### Arbre 1 : Verdict GO/ORANGE/NO-GO du Capitaine

```
MOT-CLÉ REÇU (Phase Cerveau ou input manuel)
    │
    ▼
ÉTAPE 1 : Données disponibles ?
    Lancer en parallèle : DataForSEO, Autocomplete, PAA, Groupes
    │
    ├─ Volume=0 ET PAA=0 ET Autocomplete=0
    │   → NO-GO AUTOMATIQUE (V1)
    │   → Raison : "Aucun signal détecté"
    │   → Proposer input alternatif
    │
    └─ Au moins 1 signal
        │
        ▼
ÉTAPE 2 : Découpage nécessaire ?
    Longue traîne (3+ mots) + données faibles ?
    │
    ├─ OUI → Découper en racine(s), requêter DataForSEO
    │        Afficher en "Analyse racine"
    │        Verdict reste sur mot-clé ORIGINAL (V9)
    │
    └─ NON → Continuer avec données directes
        │
        ▼
ÉTAPE 3 : Score par KPI (seuils contextuels selon niveau article)

    VOLUME :
    ┌──────────┬────────┬──────────┬────────────┐
    │          │ Pilier │ Interm.  │ Spécifique │
    │ VERT     │ >1000  │ >200     │ >30        │
    │ ORANGE   │ 200-999│ 50-199   │ 5-29       │
    │ ROUGE    │ <200   │ <50      │ <5         │
    └──────────┴────────┴──────────┴────────────┘

    KD :
    ┌──────────┬────────┬──────────┬────────────┐
    │          │ Pilier │ Interm.  │ Spécifique │
    │ VERT     │ <40    │ <30      │ <20        │
    │ ORANGE   │ 40-65  │ 30-50    │ 20-40      │
    │ ROUGE    │ >65    │ >50      │ >40        │
    └──────────┴────────┴──────────┴────────────┘

    CPC (asymétrique) :
    • CPC > 2€ → bonus vert | CPC 0-2€ → neutre | Jamais de rouge

    PAA PERTINENCE :
    • >60% pertinents → VERT | 30-60% → ORANGE | <30% → ROUGE

    INTENT MATCH :
    • Correspond → VERT | Mixte → ORANGE | Contradictoire → ROUGE

    AUTOCOMPLETE :
    • Présent top 5 → VERT | Présent 6+ → ORANGE | Absent → neutre
        │
        ▼
ÉTAPE 4 : Verdict global

    GO si : ≥4/6 verts, AUCUN rouge sur Volume ou KD, PAA non-rouge
    ORANGE si : mix sans rouge critique, OU données insuffisantes + signaux
    NO-GO si : rouge Volume ET KD, OU PAA rouge + Volume rouge

    → Seuils visibles au survol (V8)
    → L'utilisateur peut forcer GO sur ORANGE/ROUGE (V6)
    → Seuils ajustables à l'implémentation
```

#### Arbre 2 : Flux de données entre sous-onglets

```
SOURCES EXTERNES
├─ Phase Cerveau → mot-clé suggéré, groupes, niveau article
├─ DataForSEO API → volume, KD, CPC, competition
└─ Google API → autocomplete, PAA, SERP

        │
        ▼
SOUS-ONGLET CAPITAINE
  Entrées : mot-clé (Cerveau ou input), niveau article, groupes
  Requêtes : DataForSEO, Autocomplete, PAA, (racine si LT), Panel IA
  Sorties verrouillées : capitaine, KPIs, PAA pertinents, groupes, verdict
        │
        ▼ (verrouillage — pas d'action auto)
SOUS-ONGLET LIEUTENANTS
  Entrées héritées : capitaine, PAA, groupes (pas de re-fetch)
  Requête manuelle : bouton "Analyser SERP" → scraping top 3-10
  Extraction : Hn concurrents, termes récurrents, recherches associées
  Croisement : PAA + Groupes + SERP Hn
  Sorties verrouillées : lieutenants[], données SERP brutes, structure Hn
        │
        ▼ (verrouillage — pas d'action auto)
SOUS-ONGLET LEXIQUE
  Entrées héritées : capitaine, lieutenants, données SERP (pas de re-fetch)
  Traitement local : TF-IDF sur contenus SERP déjà scrapés
  Catégorisation : Obligatoire / Différenciateur / Optionnel + densité/page
  Sorties finales : lexique[], brief complet → ArticleKeywords store
```

**Point clé :** Les données cascadent. Le scraping SERP ne se fait qu'UNE fois (Lieutenants) et alimente aussi le Lexique. Zéro requête dupliquée.

#### Arbre 3 : Extraction Intention/Audit/Local vers Dashboard

```
ÉTAT ACTUEL                          ÉTAT CIBLE
Moteur Phase ② :                     Moteur Phase ② :
├─ Validation                        ├─ Capitaine
├─ Intention  → EXTRAIRE             ├─ Lieutenants
├─ Audit      → EXTRAIRE             └─ Lexique
└─ Local      → EXTRAIRE
                                     Dashboard (nouvelle vue) :
                                     ├─ Intention (SERP intent)
                                     ├─ Audit (cocon complet)
                                     └─ Local (local vs national)

Phase checks modifiés :
  Avant : intent_done + audit_done + local_done
  Après : capitaine_locked + lieutenants_locked + lexique_validated
```

**Idées Decision Tree Mapping (4) :**

**[SEO #48]** Densité de récurrence par page — le KPI expert. La colonne "×4.2 /page" montre la densité moyenne chez les concurrents.

**[SEO #49]** Trois niveaux de densité à cibler : obligatoires → densité moyenne concurrents, différenciateurs → densité haute, optionnels → 1-2 mentions.

**[SEO #50]** Score de fréquence = récurrence × densité × position dans la page. Un terme dans les Hn a plus de poids qu'un terme dans le footer.

**[Tech #45]** Re-render dynamique au changement de curseur SERP. Les analyses de pertinence et badges Lieutenants sont recalculés.

---

## Idea Organization and Prioritization

### Thèmes identifiés (6)

**Thème 1 : VERDICT & SCORING** — Le cœur du système GO/ORANGE/NO-GO
- Feu tricolore 3 états, seuils contextuels par niveau article, CPC asymétrique, transparence totale des seuils au survol, score global + KPIs détaillés

**Thème 2 : UX & NAVIGATION** — Comment l'utilisateur interagit
- Mot-clé pré-rempli, historique slider, input alternatif, lock/unlock, sous-onglets Capitaine/Lieutenants/Lexique, aucune action auto, l'utilisateur est pilote

**Thème 3 : INTELLIGENCE ARTIFICIELLE** — Le rôle de l'IA
- Panel conseils expert SEO, auto-généré en streaming, ne touche JAMAIS le verdict, complément d'information uniquement

**Thème 4 : ARCHITECTURE SEO** — La structure sémantique
- Hiérarchie N/N+1/N+2, SERP Analysis comme fondation des Lieutenants, TF-IDF pour le Lexique, score de complémentarité, badges pertinence multi-source

**Thème 5 : DONNÉES & PERSISTANCE** — Flux et cache
- Découpage enrichissement, persistance TTL, curseur SERP intelligent, cascade de données sans re-fetch, pattern cache existant réutilisé

**Thème 6 : EXTRACTION DASHBOARD** — Sortir Intention/Audit/Local
- Migration vers vue Dashboard, phase checks modifiés, flux préservés, navigation découplée

### Concepts Breakthrough

1. **SERP Analysis comme fondation unique** (#38) — un seul scraping alimente Lieutenants ET Lexique
2. **Feu tricolore contextuel** (#4 + V4) — mêmes KPIs, seuils adaptatifs selon le niveau article
3. **L'onglet qui te libère** (#3) — le meilleur onglet est celui où tu passes le MOINS de temps

### Priorités d'implémentation

**P1 — Le socle (Capitaine)**
- Thermomètre + KPIs contextuels + feu tricolore
- Panel IA expert en streaming
- Input alternatif + historique slider
- Lock/Unlock + feedback NO-GO

**P2 — La structure (Lieutenants)**
- Bouton "Analyser SERP" → 3 sections (Hn, PAA, Groupes)
- Candidats avec badges source + pertinence
- Curseur SERP 3-10 (défaut 10)
- Sélection checkbox + compteur recommandé

**P3 — La finition (Lexique)**
- TF-IDF extrait des données SERP (pas de nouvelle requête)
- 3 niveaux + densité récurrence/page
- Checkbox pré-cochées (obligatoires)
- Panel IA lexical

**P4 — L'extraction (Dashboard)**
- Migrer Intention/Audit/Local vers vue Dashboard
- Modifier les phase checks du Moteur
- Préserver les flux de données existants

---

## Session Summary

**Bilan :**
- **52 idées** générées à travers 4 techniques progressives
- **13 vérités fondamentales** validées comme principes d'architecture
- **3 layouts complets** prêts pour l'implémentation (Capitaine, Lieutenants, Lexique)
- **3 arbres de décision** (Verdict GO/NO-GO, Flux données, Extraction Dashboard)
- **6 thèmes** organisés avec priorisation claire
- **3 concepts breakthrough** identifiés

**Décisions clés prises :**
- L'onglet Validation devient un workflow en 3 sous-onglets (Capitaine → Lieutenants → Lexique)
- Le feu tricolore est contextuel au niveau d'article avec seuils transparents
- L'IA conseille mais ne touche JAMAIS au verdict
- L'utilisateur garde le libre arbitre total (forcer GO, input alternatif)
- Le scraping SERP est la fondation unique des Lieutenants ET du Lexique
- Intention, Audit et Local migrent vers une vue Dashboard indépendante
- Seuils de scoring ajustés à l'implémentation avec données réelles

**Composants existants réutilisables :**
- Thermomètre (RadarThermometer.vue)
- PAA avec analyse N+2 (DouleurIntentScanner.vue)
- Groupes de mots-clés (KeywordDiscovery)
- Slider/persistance (pattern Cerveau)
- Cache TTL (système existant)
- ArticleKeywords store (capitaine/lieutenants/lexique)
