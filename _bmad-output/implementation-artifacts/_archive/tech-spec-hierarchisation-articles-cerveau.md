> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Hiérarchisation articles Cerveau — liens Inter→Spé'
slug: 'hierarchisation-articles-cerveau'
created: '2026-04-02'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3', 'TypeScript', 'Pinia', 'Claude API (Anthropic SDK)', 'Vitest', '@vue/test-utils']
files_to_modify: ['server/prompts/cocoon-articles.md', 'src/components/production/BrainPhase.vue', 'src/components/strategy/ProposedArticleRow.vue']
code_patterns: ['Pinia stores avec ref/computed', 'Composables réactifs (useXxx)', 'Validation pure shared/ (pas d appel API)', 'Prompts Mustache-like ({{variable}}, {{#block}})', 'apiPost/apiGet pour les appels serveur', 'SSE streaming pour Claude', 'JSON storage dans data/']
test_patterns: ['Vitest + jsdom', '@vue/test-utils mount/flushPromises', 'vi.mock pour services et stores', 'setActivePinia(createPinia()) dans beforeEach', 'Component stubs pour enfants complexes', 'Tests fichier: tests/unit/{domain}/{feature}.test.ts']
---

# Tech-Spec: Hiérarchisation articles Cerveau — liens Inter→Spé

**Created:** 2026-04-02

## Overview

### Problem Statement

La génération d'articles à l'étape 6 du workflow Cerveau produit des articles "à plat" sans hiérarchie réelle. Les Intermédiaires ne couvrent pas le spectre complet du Pilier, les Spécialisés ne sont pas rattachés à un Intermédiaire précis, et aucun filtre de validation ne vérifie la pertinence SEO des mots-clés générés (règles de localisation, format, nombre de mots). Il n'y a pas de lien visuel entre les articles Inter et leurs Spécialisés enfants dans l'UI.

### Solution

1. Refonte du prompt `cocoon-articles.md` pour forcer une génération arborescente stricte avec règles SEO par niveau
2. Ajout d'un filtre de validation post-génération vérifiant la conformité structurelle (parentTitle, orphelins, ratios)
3. Ajout de liens visuels Inter→Spé dans le layout 3 colonnes existant
4. Ratios ajustés : 2-3 Spécialisés par Intermédiaire

### Scope

**In Scope:**
- Réécriture du prompt `cocoon-articles.md` avec hiérarchie forcée et règles SEO par niveau
- Filtre de validation post-génération (parentTitle valide, orphelins, ratio Spé/Inter)
- Liens visuels Inter→Spé dans les 3 colonnes (couleur par groupe + parentTitle sur les cartes Spé)
- Exploitation correcte de `parentTitle` dans l'affichage
- Ratios : 2-3 Spécialisés par Intermédiaire

**Out of Scope:**
- KPI (volume, KD%, CPC) — implémentation future
- Génération en cascade multi-appels — un seul appel Claude
- Changement du layout 3 colonnes
- Modifications des étapes 1-5 du Cerveau
- Modifications du Moteur ou de la Rédaction
- Modification des types TypeScript (ProposedArticle.parentTitle existe déjà)

## Context for Development

### Codebase Patterns

- **State management** : Pinia stores avec `ref()` / `computed()` dans `defineStore()`. Les stores appellent `apiPost`/`apiGet` depuis `@/services/api.service`.
- **Validation per-keyword** : Module pure `shared/composition-rules.ts` — exécution synchrone, pas d'API. Retourne `CompositionCheckResult` avec rules/pass/message. Déjà consommé via `compositionResults` computed dans BrainPhase.vue et passé en prop à ProposedArticleRow.
- **Dictionnaires** : `shared/composition-dictionaries.ts` — Sets normalisées pour détection localisation et audience. Lookup O(1).
- **Prompts Claude** : Fichiers `.md` dans `server/prompts/`. Variables injectées via `{{variable}}` et blocs conditionnels `{{#block}}...{{/block}}`. Chargés par `server/utils/prompt-loader.ts`.
- **API suggest** : `POST /api/strategy/cocoon/:slug/suggest` → charge le prompt template, injecte le contexte, streame la réponse Claude, retourne `{ suggestion: string }`.
- **Parsing response** : `BrainPhase.vue` tente d'abord un `JSON.parse` sur le JSON array complet, puis fallback sur extraction objet par objet (`extractArticlesFromJson`) pour gérer la troncation.
- **Affichage 3 colonnes** : `articleColumns` computed filtre `proposedArticles` par `type` et les distribue dans Pilier / Intermédiaire / Spécialisé. Chaque article est rendu par `ProposedArticleRow`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/prompts/cocoon-articles.md` | Prompt Claude pour génération d'articles — **à réécrire** |
| `src/components/production/BrainPhase.vue` | Composant principal étape 6 — parsing, validation, UI 3 colonnes |
| `src/components/strategy/ProposedArticleRow.vue` | Carte article individuelle — affichage, actions, badges |
| `shared/composition-rules.ts` | Moteur de validation keyword — déjà conforme, pas de changement nécessaire |
| `shared/composition-dictionaries.ts` | Dictionnaires localisation + audience — pas de changement |
| `shared/types/strategy.types.ts` | Type `ProposedArticle` — `parentTitle: string | null` déjà présent |
| `src/composables/useCapitaineValidation.ts` | Map `ArticleType` → `ArticleLevel` — pas de changement |
| `src/stores/cocoon-strategy.store.ts` | Store — `requestSuggestion()` — pas de changement |
| `server/routes/strategy.routes.ts` | Route API suggest — pas de changement |

### Technical Decisions

- **`parentTitle` existe déjà** dans `ProposedArticle` — pas de modification de type nécessaire
- **Les composition rules existantes sont conformes** (word_count, location, audience, question_format) — pas de changement dans `shared/composition-rules.ts`
- **La validation structurelle est cross-articles** (orphelins, ratios) — elle vit dans `BrainPhase.vue` comme une computed, pas dans le moteur de composition per-keyword
- **Liens visuels par couleur** : chaque groupe Inter+Spé reçoit une couleur distinctive. Les Spécialisés dans la colonne Spé sont regroupés sous leur parent Inter avec un indicateur visuel (pastille couleur + label parent)
- **Le parsing JSON avec fallback troncation** doit être préservé tel quel
- **Règle de l'entonnoir localisation** : Pilier = "Toulouse" frontal, Inter = héritage via maillage, Spé = hyper-local dans le texte uniquement

## Implementation Plan

### Tasks

- [x] **Task 1 : Réécrire le prompt `cocoon-articles.md`**
  - File: `server/prompts/cocoon-articles.md`
  - Action: Réécriture complète du prompt pour forcer la génération hiérarchique
  - Détails:
    1. Restructurer la mission en 3 phases explicites dans le prompt : d'abord le Pilier, puis les Intermédiaires (couvrant le spectre du Pilier), puis 2-3 Spécialisés par Intermédiaire
    2. Ajouter une section "Règles de hiérarchie" avec contraintes strictes :
       - Chaque Inter doit avoir `parentTitle` = titre exact du Pilier
       - Chaque Spé doit avoir `parentTitle` = titre exact d'un Intermédiaire
       - Les Inters doivent couvrir des facettes distinctes et complémentaires du Pilier
       - Chaque Inter doit avoir 2-3 Spécialisés enfants
    3. Intégrer les règles SEO par niveau dans le prompt (tableau synthèse des KPI qualitatifs) :
       - Pilier : 3-4 mots keyword, cible + localisation obligatoire, ton expert, ancrage local naturel
       - Inter : 3-4 mots keyword, cible obligatoire, localisation INTERDITE, approfondit une méthodologie/aspect du pilier
       - Spé : 5+ mots keyword, format question/problème, zéro localisation titre/slug, répond à une douleur très niche
    4. Ajouter les exemples corrects ET incorrects (repris des règles existantes + apports utilisateur)
    5. Ajouter la contrainte de termes interdits : PME, TPE → utiliser "entreprises", "dirigeants", "professionnels"
    6. Ajuster le ratio dans la mission : 1 Pilier, 2-4 Intermédiaires, **2-3 Spécialisés par Intermédiaire**
    7. Ajouter dans le format JSON une instruction : les articles doivent être ordonnés hiérarchiquement (Pilier d'abord, puis chaque Inter suivi de ses Spé)
    8. Conserver le format de sortie JSON existant (même structure d'objet `ProposedArticle`)
  - Notes: Le prompt doit être assez directif pour que Claude respecte la hiérarchie même avec `max_tokens` limité. Ordonner le JSON aide le parsing en cas de troncation (les articles Pilier + Inters arrivent en premier).

- [x] **Task 2 : Ajouter la validation structurelle post-génération dans BrainPhase.vue**
  - File: `src/components/production/BrainPhase.vue`
  - Action: Ajouter une computed `structuralWarnings` et l'afficher sous forme de bannière
  - Détails:
    1. Créer une computed `structuralWarnings` qui retourne un `Array<{ type: string; message: string }>` en analysant `store.strategy.proposedArticles` :
       - **`orphan_spe`** : Spécialisé dont `parentTitle` ne correspond à aucun titre d'Intermédiaire existant dans la liste
       - **`orphan_inter`** : Intermédiaire dont `parentTitle` ne correspond pas au titre du Pilier (ou `parentTitle` est null)
       - **`missing_parent`** : Spécialisé ou Intermédiaire avec `parentTitle` null ou vide
       - **`ratio_low`** : Intermédiaire ayant moins de 2 Spécialisés enfants
       - **`ratio_high`** : Intermédiaire ayant plus de 3 Spécialisés enfants
       - **`no_pilier`** : Aucun article de type Pilier dans la liste
    2. Afficher les warnings dans une bannière ambre (même style que `truncationWarning`) entre le bouton "Générer" et la grille 3 colonnes
    3. Chaque warning affiche une icône ⚠ + le message descriptif en français
    4. Les warnings sont advisory (ne bloquent pas la validation/acceptation)

- [x] **Task 3 : Groupement visuel Inter→Spé dans la colonne Spécialisé**
  - File: `src/components/production/BrainPhase.vue`
  - Action: Modifier la computed `articleColumns` et le template de la colonne Spécialisé pour regrouper les Spé par parent Intermédiaire
  - Détails:
    1. Créer une computed `groupColors` qui assigne une couleur CSS à chaque titre d'Intermédiaire (palette de 6 couleurs distinctes, rotation cyclique)
    2. Modifier la computed `articleColumns` pour que la colonne Spécialisé retourne les articles **groupés par `parentTitle`** : `Array<{ parentTitle: string; color: string; articles: ProposedArticle[] }>`
    3. Dans le template de la colonne Spécialisé, afficher un **séparateur de groupe** entre chaque groupe :
       - Petit label avec le titre de l'Inter parent tronqué + pastille de couleur
       - Les cartes Spé du groupe ont un `border-left: 3px solid {groupColor}`
    4. Dans la colonne Intermédiaire, ajouter une pastille de la même couleur sur chaque carte Inter (petit dot coloré dans le header de la carte)
    5. Les Spé sans parent (orphelins) sont affichés à la fin dans un groupe "Non rattachés" avec bordure grise pointillée
  - Notes: La colonne Pilier ne change pas (1 seul article). La colonne Intermédiaire ajoute juste un dot de couleur. La colonne Spécialisé est la plus impactée visuellement.

- [x] **Task 4 : Afficher le parentTitle sur les cartes ProposedArticleRow**
  - File: `src/components/strategy/ProposedArticleRow.vue`
  - Action: Ajouter l'affichage du `parentTitle` dans la carte article
  - Détails:
    1. Ajouter une nouvelle prop optionnelle `groupColor?: string` (couleur du groupe parent)
    2. Si `article.parentTitle` existe et n'est pas null :
       - Afficher un petit badge sous le titre avec l'icône lien (🔗 ou SVG) + `parentTitle` tronqué à 30 caractères
       - Style : `font-size: 0.6875rem`, `color: var(--color-text-muted)`, italic
    3. Si `groupColor` est fourni, appliquer `border-left: 3px solid {groupColor}` sur la carte
    4. Le badge parentTitle n'est visible que quand la carte est collapsed (quand expanded, le parentTitle est déjà contextualisé dans le groupe)
  - Notes: Ne pas toucher au reste de la carte (maturity tags, keyword slider, composition badges restent identiques).

- [x] **Task 5 : Passer le `groupColor` depuis BrainPhase vers ProposedArticleRow**
  - File: `src/components/production/BrainPhase.vue`
  - Action: Connecter les couleurs de groupe aux cartes
  - Détails:
    1. Dans le template de la colonne Intermédiaire, passer `:group-color="groupColors.get(article.title)"` à chaque `<ProposedArticleRow>`
    2. Dans le template de la colonne Spécialisé (groupée), passer `:group-color="group.color"` à chaque `<ProposedArticleRow>` du groupe
    3. La colonne Pilier ne passe pas de `groupColor` (pas de parent)

- [x] **Task 6 : Tests unitaires**
  - Files:
    - `tests/unit/components/brain-article-hierarchy.test.ts` (nouveau)
    - `tests/unit/components/proposed-article-row-parent.test.ts` (nouveau)
  - Action: Couvrir les nouveaux comportements
  - Détails:
    1. **brain-article-hierarchy.test.ts** :
       - Test `structuralWarnings` computed : orphan_spe, orphan_inter, missing_parent, ratio_low, ratio_high, no_pilier
       - Test : liste bien formée → 0 warnings
       - Test : Spé avec parentTitle invalide → warning orphan_spe
       - Test : Inter sans parentTitle → warning orphan_inter
       - Test : Inter avec 1 seul Spé → warning ratio_low
       - Test : Inter avec 4+ Spé → warning ratio_high
       - Test : pas de Pilier → warning no_pilier
       - Test : `groupColors` assigne des couleurs distinctes par Inter
       - Test : colonne Spé groupée par parentTitle
    2. **proposed-article-row-parent.test.ts** :
       - Test : parentTitle affiché quand présent
       - Test : parentTitle masqué quand null
       - Test : groupColor appliqué en border-left
       - Test : groupColor absent → pas de border-left
       - Test : parentTitle tronqué à 30 caractères

### Acceptance Criteria

- [ ] **AC 1** : Given le bouton "Générer les articles avec Claude" est cliqué, when Claude génère la réponse, then les articles retournés suivent la hiérarchie Pilier → Inter → Spé avec des `parentTitle` corrects (chaque Inter pointe vers le Pilier, chaque Spé pointe vers un Inter).

- [ ] **AC 2** : Given des articles générés avec un Spécialisé dont le `parentTitle` ne correspond à aucun Intermédiaire, when les articles sont parsés, then un warning "orphan_spe" est affiché dans la bannière de validation structurelle.

- [ ] **AC 3** : Given des articles bien hiérarchisés, when ils sont affichés dans les 3 colonnes, then chaque Intermédiaire a une pastille de couleur distinctive et les Spécialisés de la colonne Spé sont regroupés sous leur parent Intermédiaire avec la même couleur en bordure gauche.

- [ ] **AC 4** : Given un article Spécialisé avec un `parentTitle` valide, when la carte est affichée en mode collapsed, then un badge affiche le nom du parent Intermédiaire tronqué à 30 caractères.

- [ ] **AC 5** : Given des articles générés, when un Intermédiaire a moins de 2 Spécialisés enfants, then un warning "ratio_low" est affiché dans la bannière.

- [ ] **AC 6** : Given le prompt reçoit le contexte stratégique (cible, douleur, angle, promesse, CTA), when les articles sont générés, then les mots-clés Pilier contiennent une localisation (ex: Toulouse, toulousain), les mots-clés Inter n'en contiennent PAS, et les mots-clés Spé sont en format question 5+ mots.

- [ ] **AC 7** : Given les articles sont générés et le JSON est tronqué par max_tokens, when le fallback `extractArticlesFromJson` est utilisé, then les articles extraits conservent leurs `parentTitle` et la hiérarchie est préservée pour les articles complets récupérés.

- [ ] **AC 8** : Given des Spécialisés sans parent (orphelins), when ils sont affichés dans la colonne Spé, then ils apparaissent dans un groupe "Non rattachés" avec une bordure grise pointillée en fin de colonne.

## Additional Context

### Dependencies

- Aucune nouvelle dépendance npm
- Aucun changement de type TypeScript (ProposedArticle.parentTitle existe déjà)
- Aucun changement côté API/serveur (sauf le prompt)
- Aucune migration de données (les stratégies existantes avec parentTitle null restent valides)

### Testing Strategy

**Tests unitaires (Vitest) :**
- `brain-article-hierarchy.test.ts` : 8-10 tests couvrant la computed `structuralWarnings`, le groupement par couleur, et le groupement des Spé par parent
- `proposed-article-row-parent.test.ts` : 5 tests couvrant l'affichage du parentTitle et du groupColor

**Tests manuels :**
1. Ouvrir un cocon avec stratégie complétée (étapes 1-5 validées)
2. Aller à l'étape 6 (Articles)
3. Cliquer "Générer les articles avec Claude"
4. Vérifier : articles ordonnés hiérarchiquement, parentTitle corrects
5. Vérifier : colonnes 3 avec pastilles couleur sur les Inters et groupes dans la colonne Spé
6. Vérifier : bannière warnings vide si tout est correct
7. Supprimer un Inter → vérifier que les Spé enfants deviennent "orphelins" avec warning

### Notes

**Règles SEO par niveau (input utilisateur) :**

| Critère | Pilier (N2) | Intermédiaire (N3) | Spécialisé (N4) |
|---------|-------------|---------------------|------------------|
| Nb mots keyword | 3-4 | 3-4 | 5+ |
| Localisation titre/slug | Obligatoire | Interdit | Interdit |
| Localisation texte | Entités larges (Haute-Garonne, Occitanie) | Vocabulaire métier local (bassin toulousain) | Hyper-local (quartiers, événements) |
| Cible/audience dans keyword | Obligatoire | Obligatoire | — |
| Format keyword | Nominatif | Nominatif | Question ou problème concret |
| Intention | Informationnelle large | Info ou comparaison, expert/méthodo | Douleur/question très niche |
| Termes interdits | PME, TPE | PME, TPE | PME, TPE |
| parentTitle | null | → Pilier | → 1 seul Intermédiaire |
| Ratio | 1 | 2-4 | 2-3 par Intermédiaire |

**Règles de validation existantes (composition-rules.ts) — PAS DE CHANGEMENT :**

| Règle | Pilier | Intermédiaire | Spécialisé |
|-------|--------|---------------|------------|
| `word_count` | 3-4 mots ✅ | 3-4 mots ✅ | 5+ mots ✅ |
| `location_present` | Obligatoire ✅ | — | — |
| `location_absent` | — | Obligatoire ✅ | — |
| `audience_present` | Obligatoire ✅ | Obligatoire ✅ | — |
| `question_format` | — | — | Obligatoire ✅ |

**Palette de couleurs pour les groupes Inter→Spé :**
- Utiliser 6 couleurs CSS variables ou HSL avec rotation : bleu, vert, violet, orange, cyan, rose
- Les couleurs sont purement visuelles (pas de sémantique)
- Si plus de 6 Inters (rare), rotation cyclique

**Risque identifié :**
- Le prompt peut générer des `parentTitle` avec des variations mineures par rapport au titre exact de l'Inter (ex: guillemets, espaces). La validation structurelle doit faire un match normalisé (`trim().toLowerCase()`) et non strict.
