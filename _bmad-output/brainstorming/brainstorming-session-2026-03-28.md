---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Simplifier le workflow Moteur + créer le Labo + sophistication invisible + pont Cerveau→Moteur'
session_goals: 'Restructurer le Moteur en 3 phases, créer le Labo, ajouter un guidage invisible, connecter la stratégie du Cerveau au Moteur'
selected_approach: 'AI-Recommended'
techniques_used: ['Decomposition structurelle', 'Mental model mapping', 'Feature factoring', 'UX invisible sophistication']
ideas_generated: ['3 phases mentales', 'Fusion Local+Maps', 'Content Gap → Brief only', 'Labo hors workflow', 'Progression par article', 'Checks automatiques', 'Bandeau phase-transition', 'Gating Assignation', 'Contexte stratégique collapsable', 'Enrichissement prompts IA', 'Alignement stratégique Audit']
context_file: ''
---

# Brainstorming Session — Résultats finaux

**Date :** 2026-03-28 / 2026-03-29
**Utilisateur :** Projet personnel, consultant SEO expert, usage solo
**Philosophie UX :** Machine complexe en back, simple à utiliser en front — sophistication invisible

---

## 1. Décisions validées

| # | Décision | Statut |
|---|----------|--------|
| 1 | Ordre Cerveau → Moteur → Rédaction imposé | ✅ |
| 2 | Article toggle obligatoire dans le Moteur (workflow) | ✅ |
| 3 | Moteur restructuré en 3 phases : Générer → Valider → Assigner | ✅ |
| 4 | Fusion Local/National + Maps & GBP → 1 onglet "Local" | ✅ |
| 5 | Content Gap retiré du Moteur (déjà dans le Brief) | ✅ |
| 6 | Local toujours actif (optimisation locale sur tous les articles) | ✅ |
| 7 | Discovery / Douleur Intent inchangés (optionnels, verrouillage si kw validés) | ✅ |
| 8 | Création d'un Labo hors workflow, accessible depuis le Dashboard | ✅ |
| 9 | Navigation libre entre phases, guidage invisible (pas de blocage) | ✅ |
| 10 | Progression affichée par article dans la liste du Moteur | ✅ |
| 11 | Checks automatiques cochés en arrière-plan quand un onglet produit un résultat | ✅ |
| 12 | Bandeau de suggestion quand une phase est complète | ✅ |
| 13 | Message inline dans Assignation si pas de capitaine validé | ✅ |
| 14 | Contexte stratégique du Cerveau accessible dans le Moteur (collapsable) | ✅ |
| 15 | Prompts IA enrichis avec la stratégie du Cerveau (invisible) | ✅ |
| 16 | Indicateur d'alignement stratégique dans l'Audit | ✅ |

---

## 2. Avant / Après

### AVANT : Moteur v1 (10 onglets plats)

```
[D] Discovery* → [0] Doul.Intent* → [1] Douleur → [2] Validation → [3] Exploration
→ [4] Audit → [5] Local → [6] Concurrents → [7] Maps → [8] Assignation
```

Problèmes :
- 10 onglets sans logique de groupement
- Content Gap dupliqué (Moteur + Brief)
- Local et Maps séparés sans raison
- Mode libre et mode article mélangés
- Aucun indicateur de progression par article
- Contexte stratégique du Cerveau non exploité

### APRÈS : Moteur v2 (8 onglets en 3 phases) + Labo + guidage invisible

```
MOTEUR (article obligatoire, 3 phases) :

  ① GÉNÉRER — Produire des mots-clés candidats
  ┌───────────┬──────────────┬──────────┐
  │ Discovery*│ Doul. Intent*│ Douleur  │
  └───────────┴──────────────┴──────────┘

  ② VALIDER — Analyser et choisir le mot-clé définitif
  ┌────────────┬─────────────┬────────┬────────┐
  │ Validation │ Exploration │ Audit  │ Local  │
  └────────────┴─────────────┴────────┴────────┘

  ③ ASSIGNER — Structurer capitaine / lieutenants / lexique
  ┌──────────────┐
  │ Assignation  │
  └──────────────┘


LABO (hors workflow, depuis Dashboard) :

  Recherche libre sur n'importe quel mot-clé
  ┌───────────┬──────────────┬─────────────┬────────┬────────┐
  │ Discovery │ Doul. Intent │ Exploration │ Audit  │ Local  │
  └───────────┴──────────────┴─────────────┴────────┴────────┘
```

---

## 3. Moteur — Détail des 3 phases

### Phase ① Générer (3 onglets, dont 2 optionnels)

- **Discovery*** — Découverte de mots-clés par IA (optionnel, verrouillé si kw validés)
- **Douleur Intent*** — Scanner de résonance / radar (optionnel, verrouillé si kw validés)
- **Douleur** — Traduction de la douleur client en mots-clés candidats

La phase est considérée complète quand Discovery (analyse IA) + Douleur Intent (radar) ont tous les deux fait leur travail.

### Phase ② Valider (4 onglets, tous actifs)

- **Validation** — Vérification multi-sources des mots-clés candidats
- **Exploration** — Analyse d'intention de recherche (SERP + autocomplete)
- **Audit** — Données DataForSEO (volume, difficulté, CPC, scores)
- **Local** — Comparaison Local/National + Maps & fiche Google Business (fusion des anciens onglets 5 et 7)

### Phase ③ Assigner (1 onglet)

- **Assignation** — Définition du capitaine, des lieutenants et du lexique

Prérequis : au moins un mot-clé doit être validé dans l'Audit. Si ce n'est pas le cas, l'onglet affiche un message explicatif avec un lien vers l'Audit.

---

## 4. Fusions et suppressions

| Avant | Après | Raison |
|-------|-------|--------|
| Local/National (#5) + Maps & GBP (#7) | **Local** (1 onglet) | Même sujet, fusionnés en 2 sections |
| Concurrents (#6) | **Supprimé du Moteur** | Déjà dans le Brief, évite le doublon |

---

## 5. Labo — Espace de recherche libre

**Route :** `/labo`
**Accès :** Bouton dans la Navbar et le header du Dashboard (à côté de Maillage et GSC)
**Contexte :** Aucun article, aucun cocon — recherche libre sur n'importe quel mot-clé

**Composants réutilisés du Moteur :**
- Discovery (KeywordDiscoveryTab)
- Douleur Intent (DouleurIntentScanner)
- Exploration (ExplorationInput + IntentStep + AutocompleteValidation)
- Audit (KeywordAuditTable — mode ponctuel)
- Local (LocalComparisonStep + MapsStep fusionnés)

**Use case :** "J'ai une intuition sur un mot-clé, je veux le vérifier rapidement avant de l'intégrer dans un cocon."

---

## 6. Sophistication invisible — Guidage sans blocage

### 6a. Points de progression par article

Dans la liste des articles du Moteur, chaque article affiche des petits points qui se remplissent automatiquement :

```
Comment choisir son CRM pour PME     ●●●○○○○ 3/7
CRM gratuit vs payant pour TPE       ●○○○○○○ 1/7
Migrer d'Excel vers un CRM          ○○○○○○○ 0/7
```

Chaque point correspond à une étape clé. Les points se remplissent tout seuls quand un onglet a fait son travail.

### 6b. Checks automatiques en arrière-plan

L'app note silencieusement la progression à chaque résultat :

| Ce que l'utilisateur fait | Ce que l'app note |
|---|---|
| Discovery : l'analyse IA tourne | "Discovery fait" |
| Douleur Intent : le radar scanne | "Radar fait" |
| Exploration : l'intention est analysée | "Intention faite" |
| Audit : DataForSEO retourne des données | "Audit fait" |
| Local : la comparaison s'affiche | "Local fait" |
| Un mot-clé est validé dans l'Audit | "Capitaine choisi" |
| Capitaine + lieutenants + lexique assignés | "Assignation faite" |

Source de données : `article-progress.completedChecks[]` (système existant, non exploité aujourd'hui).

### 6c. Bandeau de transition entre phases

Quand tous les checks d'une phase sont complétés pour l'article en cours, un bandeau discret apparaît :

```
✓ Génération complète — 4 mots-clés candidats
                          [Continuer vers Valider →]
```

Un bouton, c'est tout. Si l'utilisateur veut rester, il l'ignore.

### 6d. Message inline dans l'Assignation

Si l'utilisateur ouvre l'onglet Assignation alors qu'aucun mot-clé capitaine n'est validé, l'onglet affiche un message au lieu du contenu habituel :

```
Validez un mot-clé capitaine dans l'Audit
avant de passer à l'assignation.
                          [Aller à l'Audit →]
```

Pas de blocage de navigation. L'onglet est toujours cliquable.

---

## 7. Pont Cerveau → Moteur

### 7a. Rappel de la stratégie (collapsable)

En haut du Moteur, sous l'article sélectionné, une section repliée par défaut :

```
▸ Contexte stratégique                         [déplier]
  Cible : PME 10-50 salariés, directeur commercial
  Angle : Comparatif pragmatique, pas de jargon
  Promesse : Choisir le bon CRM en 30 min de lecture
```

Toujours là si besoin, jamais intrusif.

### 7b. Enrichissement des prompts IA (invisible)

Quand le Moteur appelle Claude (PainTranslator, Discovery, etc.), la stratégie du Cerveau (cible, angle, promesse) est automatiquement injectée dans le prompt. L'utilisateur ne voit rien changer, mais les suggestions IA sont plus pertinentes car elles connaissent le contexte stratégique.

### 7c. Indicateur d'alignement dans l'Audit

Dans les résultats d'un mot-clé DataForSEO, un indicateur simple montre si le mot-clé est cohérent avec la stratégie :

```
"crm pme toulouse"  Volume: 720  Difficulté: 34
  ✓ Alignement fort — correspond à la cible PME locale
```

Calcul basique (matching textuel cible/localisation), pas d'IA nécessaire.

---

## 8. Flux utilisateur macro — Vue finale

```
/config              → Configuration thème (setup initial)

/                    → Dashboard (silos, stats, progression)
                        ├── [Labo]     → Recherche libre (hors workflow)
                        ├── [Maillage] → Matrice maillage interne
                        ├── [GSC]      → Post-publication
                        └── [⚙]       → Config

/labo                → Recherche libre (Discovery, Exploration, Audit, Local)

/silo/:id            → Détail silo → liste cocons

/cocoon/:id          → Landing cocon (hub de choix)
                        ├── [Cerveau]   → Brainstorm stratégique cocon
                        ├── [Moteur]    → Recherche mots-clés (article obligatoire)
                        │                 ① Générer → ② Valider → ③ Assigner
                        └── [Rédaction] → Liste articles du cocon

/cocoon/:id/article/:slug → Workflow article (4 étapes)
                        [1] Stratégie → [2] Brief (+ Content Gap) → [3] Sommaire → [4] Article

/article/:slug/editor → Éditeur TipTap (actions contextuelles, panneaux SEO/GEO/Maillage)
```

---

## 9. Glossaire (fixé pour le projet)

| Terme | Signification |
|-------|---------------|
| Générer | Phase de production de mots-clés candidats |
| Valider | Phase d'analyse et de choix du mot-clé définitif |
| Assigner | Phase de structuration : capitaine, lieutenants, lexique |
| Labo | Espace de recherche libre hors workflow |
| Moteur | Workflow de recherche mots-clés contextualisé par article |
| Cerveau | Phase de brainstorm stratégique au niveau cocon |
| Rédaction | Phase de production d'articles (stratégie → brief → sommaire → article) |
| Sophistication invisible | L'app guide et protège sans bloquer ni complexifier l'interface |

---

## 10. Prochaines étapes (implémentation)

| # | Tâche | Complexité | Dépendances |
|---|-------|------------|-------------|
| 1 | Restructurer le Moteur en 3 phases visuelles | Moyenne | Aucune |
| 2 | Fusionner Local + Maps en 1 onglet | Faible | Aucune |
| 3 | Retirer Content Gap du Moteur | Faible | Aucune |
| 4 | Créer la vue Labo (`/labo`) | Moyenne | Aucune |
| 5 | Ajouter le Labo dans la Navbar | Faible | Tâche 4 |
| 6 | Ajouter les dots de progression par article | Moyenne | Aucune |
| 7 | Brancher les checks automatiques sur article-progress | Moyenne | Tâche 6 |
| 8 | Ajouter les bandeaux de transition entre phases | Faible | Tâche 7 |
| 9 | Ajouter le message inline dans l'Assignation | Faible | Aucune |
| 10 | Ajouter le bandeau contexte stratégique (collapsable) | Faible | Aucune |
| 11 | Enrichir les prompts IA avec le contexte du Cerveau | Moyenne | Aucune |
| 12 | Ajouter l'indicateur d'alignement stratégique dans l'Audit | Faible | Tâche 11 |
