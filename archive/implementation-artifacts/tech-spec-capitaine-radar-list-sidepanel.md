---
title: 'Migration Carrousel Capitaine → Liste verticale + Side Panel sticky'
slug: 'capitaine-radar-list-sidepanel'
created: '2026-04-25'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vue 3.5 (Composition API, <script setup>)
  - Pinia 3
files_to_modify:
  - src/components/moteur/CaptainValidation.vue
  - src/components/moteur/CaptainSidePanel.vue (NEW)
  - src/components/moteur/CaptainCarousel.vue (DELETE après migration)
  - tests/unit/components/captain-validation.test.ts
  - tests/unit/components/captain-sub-components.test.ts (commentaire stale à nettoyer)
  - docs/ui-sections-guide.md (mention CaptainCarousel à mettre à jour)
  - docs/moteur-data-flow.md (mention CaptainCarousel à mettre à jour)
  - ARCHITECTURE_FLOWS.md (mention CaptainCarousel à mettre à jour)
code_patterns:
  - 'Composable useRadarCarousel : entries[] + currentIndex (réutilisé sans modif)'
  - 'CaptainInteractiveWords par carte (déjà multi-instanciable)'
  - 'lockCaptain du store : un seul slot richCaptain (overwrite atomique de keyword + aiPanelMarkdown + lockedAt)'
  - 'Mode workflow et mode libre cloisonnés : nouvelle UI sur workflow uniquement, manual-mode existant conservé pour libre'
test_patterns:
  - 'Vitest + @vue/test-utils, mocks store via createTestingPinia'
  - 'data-testid pour sélecteurs stables, préfixe unique side-panel-* sur CaptainSidePanel'
---

# Tech-Spec: Migration Carrousel Capitaine → Liste verticale + Side Panel sticky

**Created:** 2026-04-25

## Overview

### Problem Statement

L'onglet **Capitaine** (Phase ② Valider du Moteur) affiche aujourd'hui les mots-clés candidats via un **carrousel à navigation prev/next** : une seule `RadarCard` visible à la fois, le panneau IA et la sidebar racines liés à la carte courante. L'utilisateur doit cliquer ◀▶ pour comparer plusieurs mots-clés, ce qui rend l'évaluation comparative pénible (chaque switch déclenche un re-render mental). Avec 5–10 candidats validés et persistés dans `validationHistory`, l'expérience devient inefficace.

### Solution

Remplacer le carrousel par une **liste verticale de RadarCard** (toutes les entrées validées visibles en même temps, scroll naturel) + une **side panel sticky à droite** qui affiche, pour la carte sélectionnée par clic : (1) la sidebar des mots-clés racines, (2) le panneau IA streamé, (3) les actions de lock/envoi aux Lieutenants. Le composable `useRadarCarousel` est conservé sans modification — seule la couche présentation change.

**Cloisonnement workflow vs libre :** la nouvelle UI s'applique **uniquement au mode `workflow`** (parent `MoteurView`). Le mode `libre` (parent `LaboView`) **conserve l'ancien manual-mode** (table seuils, history-chips, suggested-keywords, RadarKeywordCard standalone, AI panel manual). Cloisonnement par `v-if="mode === 'workflow'"` vs `v-else`. Aucune perte fonctionnelle.

La règle « 1 capitaine verrouillé à la fois » devient explicite : verrouiller une nouvelle carte unlock l'ancienne via émission `check-removed` puis `check-completed`, et appel store `lockCaptain(nouveau)` qui overwrite atomiquement `richCaptain` (slot unique).

### Scope

**In Scope:**
- Remplacement du bloc `carousel-section` (et `locked-captain-section`) **dans la branche `mode === 'workflow'`** par une liste verticale de `CaptainInteractiveWords` (1 par entrée) + side panel sticky.
- Création de `CaptainSidePanel.vue` (nouveau) en sticky à droite, vide par défaut, alimenté par la carte cliquée.
- Sélection d'une carte au clic (toute la surface, avec `@click.stop` ajoutés sur les zones interactives internes pour empêcher la double-action).
- Lock-as-radio : verrouiller une carte unlock l'ancienne (émission `check-removed` puis `check-completed`, log explicite "lock transfert"). Garde `entry.validation` requis avant lock.
- Suppression du composant `CaptainCarousel.vue` et de son import.
- Réécriture **partielle** de `tests/unit/components/captain-validation.test.ts` : sélecteurs `carousel-*` → `radar-list-*` / `side-panel-*`, scénarios prev/next → click-to-select. Tests du mode libre (table seuils, history chips, suggested keywords, etc.) **conservés tels quels**.
- Mise à jour des docs mentionnant CaptainCarousel : `docs/ui-sections-guide.md`, `docs/moteur-data-flow.md`, `ARCHITECTURE_FLOWS.md`.
- Nettoyage du commentaire stale dans `tests/unit/components/captain-sub-components.test.ts:25`.
- Reset de `selectedIndex` quand `props.selectedArticle.id` change ou quand `carousel.entries` est vidé.
- États empty / loading / error gérés explicitement dans la liste, avec `data-testid` dédiés.

**Out of Scope:**
- Aucun changement au composable `useRadarCarousel` (entries/currentIndex restent).
- Aucun changement au composable `useCapitaineValidation` (continue de servir le mode libre + helpers exportés).
- Aucun changement au store `article-keywords` (lockCaptain, addCaptainValidation, validationHistory, richRootKeywords).
- Aucun changement aux routes API (`/keywords/:kw/validate`, `/ai-panel`).
- Aucun changement aux constantes de checks workflow (`MOTEUR_*`).
- Aucun changement à `CaptainInteractiveWords`, `RadarCardLockable`, `RadarKeywordCard`, `CaptainRootsSidebar`, `CaptainAiPanel`, `CaptainLockPanel`.
- Aucune modification du flow auto-validation à l'ouverture (le watcher `props.radarCards` continue d'appeler `loadCards`).
- Pas de fallback "drawer" responsive (largeur min 1100px requise pour MoteurView, vérifiée dans Notes).
- Pas de drag-and-drop / réordonnancement des cartes.
- Pas de scroll-to-locked automatique (ajout d'un bouton "Aller à la carte verrouillée" dans la side panel à la place — cf Décision #9).
- Pas de refonte du système de checks workflow vers les constantes `MOTEUR_*` (dette identifiée, hors scope).

## Context for Development

### Codebase Patterns

- **Composables Vue 3** : logique d'état dans `src/composables/<domaine>/useXxx.ts`, instanciés dans `<script setup>` du composant.
- **Naming des fichiers** : composants Vue en `PascalCase.vue` (ex. `CaptainSidePanel.vue`).
- **Props & emits typés** : `defineProps<{...}>()` + `defineEmits<{...}>()`. Pas de runtime declaration.
- **Sélecteurs de tests** : `data-testid="kebab-case"` partout (jamais de classes CSS pour les tests).
- **Logging** : `import { log } from '@/utils/logger'`. Niveaux `info` pour les actions utilisateur, `debug` pour le state, `warn` pour les erreurs récupérables.
- **i18n implicite FR** : tous les libellés UI directement en français dans le template.
- **Émission des checks workflow** : émettre les constantes via les imports `MOTEUR_*` de `shared/constants/workflow-checks.constants.ts` — **mais** dans `CaptainValidation` actuel les strings sont hardcodées (`'capitaine_locked'`). On garde le hardcoding pour rester iso (pas de scope creep) et on note la dette en bas.
- **Style scoped** : CSS variables `--color-*` du design system, pas de couleurs en dur.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| [src/components/moteur/CaptainValidation.vue](src/components/moteur/CaptainValidation.vue) | Composant à modifier (template + script touchés, store inchangé) |
| [src/components/moteur/CaptainCarousel.vue](src/components/moteur/CaptainCarousel.vue) | À supprimer après migration (barre prev/next obsolète) |
| [src/components/moteur/CaptainInteractiveWords.vue](src/components/moteur/CaptainInteractiveWords.vue) | Carte interactive — réutilisée tel quel, instanciée N fois en v-for |
| [src/components/moteur/CaptainRootsSidebar.vue](src/components/moteur/CaptainRootsSidebar.vue) | Sidebar racines — déplacée dans CaptainSidePanel |
| [src/components/moteur/CaptainAiPanel.vue](src/components/moteur/CaptainAiPanel.vue) | Panneau IA — déplacé dans CaptainSidePanel |
| [src/components/moteur/CaptainLockPanel.vue](src/components/moteur/CaptainLockPanel.vue) | Bouton lock + envoi Lieutenants — déplacé dans CaptainSidePanel |
| [src/composables/keyword/useRadarCarousel.ts](src/composables/keyword/useRadarCarousel.ts) | Composable conservé, fournit entries[] + currentIndex (sélection) |
| [src/stores/article/article-keywords.store.ts](src/stores/article/article-keywords.store.ts:181) | `lockCaptain` écrit `richCaptain.keyword` (radio natif côté store) |
| [src/views/MoteurView.vue](src/views/MoteurView.vue#L656) | Parent qui passe `radarCards`, `suggestedKeywords` (props inchangées) |
| [src/views/LaboView.vue](src/views/LaboView.vue#L129) | Parent mode libre (props inchangées) |
| [tests/unit/components/captain-validation.test.ts](tests/unit/components/captain-validation.test.ts) | 55 références au carousel → réécriture sélecteurs |

### Technical Decisions

1. **`useRadarCarousel` non renommé** : `currentIndex` reste son rôle interne (auto-validation, addEntry). Pas touché.
2. **`selectedIndex` local séparé de `currentIndex`** : ref `selectedIndex: Ref<number | null>` dans `CaptainValidation`. Reset à `null` :
   - À l'ouverture (initialisation).
   - Dans le watcher `props.selectedArticle?.id` quand `oldId !== id` (avant le `carousel.reset()` existant).
   - Dans le watcher `carousel.entries.value.length` si nouvelle longueur < ancien `selectedIndex`.
   `selectedEntry = computed(() => selectedIndex.value !== null ? carousel.entries.value[selectedIndex.value] ?? null : null)`.
3. **Synchronisation `currentIndex` lors de la sélection** : `selectEntry(idx)` fait `selectedIndex.value = idx; carousel.goTo(idx)`. **`switchToVariant` et `handleAiRegenerate` doivent être réécrits pour lire `selectedIndex.value`** (et non plus `currentEntry`/`currentIndex`) — sinon une auto-validation concurrente peut faire muter l'index sous leurs pieds (cf F11). Variante : passer l'index en argument explicite.
4. **Side panel sticky** : `position: sticky; top: 1rem;` dans une grid 2 colonnes (`grid-template-columns: minmax(0, 1fr) 360px; gap: 1rem;`). Pas de JS. **Largeur utile minimale `MoteurView` ≈ 1216px** (max-width 1280 - padding 2×2rem). Avec sidebar gauche `MoteurView` à ~280px, il reste ~920px pour le contenu de l'onglet. Le grid `1fr 360px` laisse ~544px à la liste. **Acceptable** mais à valider visuellement (cf Notes risque sticky vs `TabCachePanel`).
5. **Conflit avec `TabCachePanel` sticky** : `MoteurView.vue:614` a déjà un `TabCachePanel` sticky. Vérification : il est sticky-bottom, pas sticky-top. Les deux peuvent coexister. **Précaution** : `z-index: 5` sur la side panel pour éviter qu'un overlay sticky ne la masque, et `bottom: auto;` explicite.
6. **Lock-as-radio + check workflow propre** :
   - Si `lockedKeyword.value && lockedKeyword.value !== nouvelleEntry.card.keyword` :
     1. `emit('check-removed', 'capitaine_locked')` puis sur le tick suivant (`nextTick`) `emit('check-completed', 'capitaine_locked')` — pour forcer `MoteurView.refreshCapitainesMap()` à recharger (sinon ré-émettre `check-completed` est un no-op pour `articleProgressStore`, le map reste stale, cf F7).
     2. Appel **unique** `articleKeywordsStore.lockCaptain(nouvelleKw, aiMarkdownNouveau, articleId)`. **Important** : passer le `aiPanelMarkdown` du **nouveau** keyword (récupéré depuis `carouselAiCache`), sinon overwrite à `null` (cf F13).
   - Si pas de lock préalable : un seul `emit('check-completed', ...)`.
7. **Guard `entry.validation` requis avant lock** : `lockEntry(idx)` retourne tôt si `!entries[idx]?.validation` (idempotent avec `lockCarouselEntry()` actuel ligne 705).
8. **Click-to-select résolu explicitement** :
   - Wrapper `<div class="radar-list-item" @click="selectEntry(idx)">`.
   - Sur **chaque** zone interactive enfant (boutons mots dans `RadarKeywordCard.interactive-words`, modifier toggles, lock toggle), ajouter `@click.stop` à la racine HTML du composant enfant. **Côté `CaptainInteractiveWords`** : ajouter `@click.stop` sur le wrapper `.radar-card-section` est insuffisant (la sélection ne se déclencherait jamais). À la place : ne pas mettre `@click.stop` global ; vérifier au cas par cas que `RadarCardLockable` (déjà OK lignes 45, 63) et `RadarKeywordCard` (à auditer en dev) propagent bien le click neutre uniquement depuis les zones non-interactives. **Validation dev** : test manuel obligatoire — si conflit détecté, patcher en ajoutant `@click.stop` sur les boutons internes plutôt que sur le wrapper externe.
9. **`locked-captain-section` remplacé par bouton "Aller à la carte verrouillée"** dans la side panel (visible quand `lockedKeyword !== null && selectedEntry?.card.keyword !== lockedKeyword`). Click → `selectEntry(lockedIndex)` + `scrollIntoView({ behavior: 'smooth', block: 'center' })` sur l'item correspondant. Couvre F4 (régression UX longues listes) sans réintroduire le bandeau pinné.
10. **CSS de la carte sélectionnée / lockée** : ring `box-shadow: 0 0 0 2px var(--color-primary)` (sélection) ou `0 0 0 2px var(--color-success)` (lock). Combo lock+selected : `box-shadow: 0 0 0 2px var(--color-success), 0 0 0 4px var(--color-primary)`. Hover : ne PAS appliquer `background` au wrapper (cf F21 — leak vers RadarCardLockable). Utiliser `outline-offset` ou un changement de `border-color` plutôt.
11. **`CaptainCarousel.vue` supprimé** : aucun import dans `src/` (vérifié). Mention en commentaire dans `tests/unit/components/captain-sub-components.test.ts:25` à supprimer.
12. **Cloisonnement workflow vs libre** :
    - Template :
      ```vue
      <div v-if="mode === 'workflow'">
        <!-- Nouvelle UI : .captain-layout grid + radar-list + CaptainSidePanel -->
      </div>
      <div v-else class="manual-mode">
        <!-- Bloc actuel manual-mode INTÉGRALEMENT CONSERVÉ : table seuils, history chips, suggested-keywords, RadarKeywordCard, manual CaptainAiPanel/LockPanel -->
      </div>
      ```
    - L'input Capitaine (`<CaptainInput>`) reste **commun** au-dessus (pas dupliqué).
    - `useCapitaineValidation` (`currentResult`, `history`, `validateKeyword`, `navigateHistory`, etc.) **reste utilisé en mode libre uniquement**. Ne pas supprimer.
    - Le watcher du `currentResult` qui lance `aiStartStream` (lignes 245-260) reste. En workflow il ne s'active pas (puisque `validateKeyword` n'est jamais appelé — `handleValidate` du workflow appelle `carousel.addEntry`).
13. **Reset systématique de `selectedIndex`** : trois points (cf Décision #2). Évite pointeurs orphelins (F12).
14. **`selectedEntry` réactif aux mutations d'entries** : `carousel.entries` étant un `Ref<CarouselEntry[]>`, le `computed` se re-évalue automatiquement quand une entrée est patchée (validation arrive, root variant ajoutée). ✅ Pas de glue manuelle.
15. **Naming `data-testid` cohérent** : préfixe `side-panel-*` partout dans `CaptainSidePanel` (`side-panel`, `side-panel-empty`, `side-panel-content`, `side-panel-roots`, `side-panel-ai`, `side-panel-lock`, `side-panel-goto-locked`). Préfixe `radar-list-*` dans la liste (`radar-list`, `radar-list-empty`, `radar-list-item-{idx}`, `radar-list-item-loading`, `radar-list-item-error`).
16. **Accessibilité** :
    - `.radar-list-item` : `role="button"`, `tabindex="0"`, `@keydown.enter.space.prevent="selectEntry(idx)"`, `aria-pressed="selectedIndex === idx"`.
    - `<aside data-testid="side-panel" aria-live="polite" aria-label="Détails du mot-clé sélectionné">`.
    - L'état empty annoncé via `aria-live` (texte change → annonce automatique).

## Implementation Plan

### Tasks

> Ordre = dépendances bottom-up. Cocher au fur et à mesure.

#### Phase 1 — Création du composant side panel (autonome, testable seul)

1. **Créer [src/components/moteur/CaptainSidePanel.vue](src/components/moteur/CaptainSidePanel.vue)** (nouveau fichier).
   - **Props** : `entry: CarouselEntry | null`, `articleLevel: ArticleLevel`, `articleId: number | null`, `lockedKeyword: string | null`, `parsedMarkdown: string`, `aiIsStreaming: boolean`, `aiError: string | null`, `verdictSummary: { level, label, reason } | null`, `rootVariants: KeywordRootVariant[]`, `isLoadingRoots: boolean`, `failedRoots: string[]`, `activeVariantKeyword: string`, `lockedEntryExists: boolean` (pour afficher le bouton "Aller à la carte verrouillée"), `selectedIsLocked: boolean`.
   - **Emits** : `'lock'`, `'unlock'`, `'send-to-lieutenants'`, `'switch-variant': [variant]`, `'ai-regenerate'`, `'goto-locked'`.
   - **Template** :
     - Wrapper : `<aside data-testid="side-panel" aria-live="polite" aria-label="Détails du mot-clé sélectionné" class="captain-side-panel">`.
     - Si `entry === null` → état vide : `<div data-testid="side-panel-empty" class="side-panel-empty">Cliquez sur une carte pour voir l'analyse.</div>`. Si `lockedEntryExists` aussi → afficher le bouton `[data-testid="side-panel-goto-locked"]` qui `emit('goto-locked')`.
     - Sinon : `<div data-testid="side-panel-content">` contenant :
       - Header : keyword + badge verdict (`verdictSummary.level`).
       - Si `lockedEntryExists && !selectedIsLocked` → bouton "Aller à la carte verrouillée" (`emit('goto-locked')`).
       - `<CaptainRootsSidebar>` (mots racines en haut) avec `:variants="rootVariants"`, `:active-keyword="activeVariantKeyword"`, `:is-loading="isLoadingRoots"`, `:failed-roots="failedRoots"`, `@select="$emit('switch-variant', $event)"`.
       - `<CaptainAiPanel>` (analyse IA en dessous) avec `:parsed-html="parsedMarkdown"`, `:is-streaming="aiIsStreaming"`, `:error="aiError"`, `:verdict-summary="verdictSummary"`, `:can-regenerate="true"`, `@regenerate="$emit('ai-regenerate')"`.
       - `<CaptainLockPanel>` (actions en bas) avec `:is-locked="selectedIsLocked"`, `:can-lock="verdictSummary?.level === 'GO'"`, `:show-send-to-lieutenants="selectedIsLocked"`, `test-id-prefix="side-panel-"`, `@lock="$emit('lock')"`, `@unlock="$emit('unlock')"`, `@send-to-lieutenants="$emit('send-to-lieutenants')"`.
   - **Style** : `position: sticky; top: 1rem; bottom: auto; max-height: calc(100vh - 2rem); overflow-y: auto; z-index: 5;`. Largeur fixée par le parent (grid).

#### Phase 2 — Refonte du template `CaptainValidation.vue` (mode workflow uniquement)

2. **Ajouter dans `<script setup>`** :
   - `const selectedIndex = ref<number | null>(null)`.
   - `const selectedEntry = computed(() => selectedIndex.value !== null ? carousel.entries.value[selectedIndex.value] ?? null : null)`.
   - `const lockedIndex = computed(() => lockedKeyword.value === null ? -1 : carousel.entries.value.findIndex(e => e.card.keyword === lockedKeyword.value))`.
   - `const lockedEntryExists = computed(() => lockedIndex.value !== -1)`.
   - `const selectedIsLocked = computed(() => selectedEntry.value !== null && selectedEntry.value.card.keyword === lockedKeyword.value)`.
3. **Adapter les `computed` existants** pour pointer vers `selectedEntry` (au lieu de `carousel.currentEntry`) :
   - `carouselCurrentAiStreaming`, `carouselCurrentAiError`, `carouselParsedMarkdown`, `carouselVerdictSummary`, `currentRootVariants`, `activeVariantKeyword`, `carouselCurrentWarnings` : remplacer `carousel.currentEntry.value` par `selectedEntry.value`.
   - **Renommer** ces variables en `selected*` pour cohérence (`selectedAiStreaming`, etc.) — purement cosmétique mais évite la confusion.
   - **NE PAS toucher** aux watchers de persistance (ils itèrent sur `entries`, pas `currentEntry`).
4. **Réécrire `switchToVariant` et `handleAiRegenerate` pour utiliser `selectedIndex.value`** au lieu de `carousel.currentIndex.value` / `carousel.currentEntry.value`. Si `selectedIndex.value === null` → return tôt.
5. **Watchers de reset `selectedIndex`** :
   - Dans le watcher `props.selectedArticle?.id` (ligne 303) : ajouter `selectedIndex.value = null` dans le bloc `if (oldId && id !== oldId)` (avant `carousel.reset()`).
   - Nouveau watcher : `watch(() => carousel.entries.value.length, (len) => { if (selectedIndex.value !== null && selectedIndex.value >= len) selectedIndex.value = null })`.
6. **Remplacer le bloc `carousel-section` (lignes 861-926) et `locked-captain-section` (838-859)** par un wrapper `v-if="mode === 'workflow'"` :
   ```vue
   <div v-if="mode === 'workflow'" class="captain-layout">
     <div class="radar-list" data-testid="radar-list">
       <div
         v-if="carousel.entries.length === 0"
         class="radar-list-empty"
         data-testid="radar-list-empty"
       >
         Aucun mot-clé à valider pour cet article.
       </div>
       <div
         v-for="(entry, idx) in carousel.entries"
         :key="entry.originalCard.keyword"
         class="radar-list-item"
         :class="{
           'radar-list-item--selected': selectedIndex === idx,
           'radar-list-item--locked': lockedKeyword === entry.card.keyword,
         }"
         :data-testid="`radar-list-item-${idx}`"
         role="button"
         tabindex="0"
         :aria-pressed="selectedIndex === idx"
         @click="selectEntry(idx)"
         @keydown.enter.space.prevent="selectEntry(idx)"
       >
         <div
           v-if="entry.isLoading"
           class="captain-loading"
           :data-testid="`radar-list-item-${idx}-loading`"
         >
           <div class="captain-loading-spinner" />
           <p>Validation en cours...</p>
         </div>
         <div
           v-else-if="entry.error"
           class="captain-error"
           :data-testid="`radar-list-item-${idx}-error`"
         >
           <p>Erreur : {{ entry.error }}</p>
         </div>
         <CaptainInteractiveWords
           v-else-if="entry.validation"
           :entry="entry"
           :locked-keyword="lockedKeyword"
           :article-level="articleLevel"
           :article-id="props.selectedArticle?.id ?? null"
           @lock="lockEntry(idx)"
           @unlock="idx === lockedIndex && unlockEntry()"
           @word-toggle="(indices) => handleWordToggleAt(idx, indices)"
         />
       </div>
     </div>
     <CaptainSidePanel
       :entry="selectedEntry"
       :article-level="articleLevel"
       :article-id="props.selectedArticle?.id ?? null"
       :locked-keyword="lockedKeyword"
       :parsed-markdown="selectedParsedMarkdown"
       :ai-is-streaming="selectedAiStreaming"
       :ai-error="selectedAiError"
       :verdict-summary="selectedVerdictSummary"
       :root-variants="currentRootVariants"
       :is-loading-roots="selectedEntry?.isLoadingRoots ?? false"
       :failed-roots="selectedEntry?.failedRoots ?? []"
       :active-variant-keyword="activeVariantKeyword"
       :locked-entry-exists="lockedEntryExists"
       :selected-is-locked="selectedIsLocked"
       @lock="onSidePanelLock"
       @unlock="unlockEntry"
       @send-to-lieutenants="sendToLieutenants"
       @switch-variant="switchToVariant"
       @ai-regenerate="handleAiRegenerate"
       @goto-locked="gotoLocked"
     />
   </div>
   <!-- Mode libre : on conserve le bloc manual-mode ACTUEL tel quel (lignes 928-1046) -->
   <div v-else class="manual-mode">
     <!-- Contenu existant inchangé -->
   </div>
   ```
   **Note** : le bloc `manual-mode` actuel reste **strictement identique**, juste sa condition d'affichage passe de `v-if="!carousel.isActive.value"` à `v-else` (du `v-if="mode === 'workflow'"`). Le bloc `carousel-section` actuel et le bloc `locked-captain-section` sont supprimés.
7. **Implémenter les nouveaux handlers** :
   - `selectEntry(idx)` : `if (idx < 0 || idx >= carousel.entries.value.length) return; selectedIndex.value = idx; carousel.goTo(idx)`.
   - `onSidePanelLock()` : `if (selectedIndex.value !== null) lockEntry(selectedIndex.value)`.
   - `lockEntry(idx)` :
     ```ts
     const entry = carousel.entries.value[idx]
     if (!entry?.validation) return  // guard F8
     const newKw = entry.card.keyword
     const previousKw = lockedKeyword.value
     const isTransfer = previousKw !== null && previousKw !== newKw
     if (isTransfer) {
       log.info('CaptainValidation — lock transfert', { from: previousKw, to: newKw })
       if (props.mode !== 'libre') emit('check-removed', 'capitaine_locked')
       await nextTick()
     }
     selectedIndex.value = idx
     lockedKeyword.value = newKw
     isLocked.value = true
     if (props.mode !== 'libre') emit('check-completed', 'capitaine_locked')
     emit('validated', newKw)
     const aiMarkdown = carouselAiCache.value.get(newKw) ?? null  // F13 : récupérer le markdown du NOUVEAU keyword
     articleKeywordsStore.lockCaptain(newKw, aiMarkdown, props.selectedArticle?.id)
     const rootKeys = Array.from(entry.rootVariants.keys())
     articleKeywordsStore.setRootKeywords(rootKeys)
     if (props.selectedArticle?.id) articleKeywordsStore.saveKeywords(props.selectedArticle.id)
     ```
   - `unlockEntry()` : identique à l'actuel `unlockCarouselEntry()`.
   - `handleWordToggleAt(idx, indices)` : copie de `handleWordToggle` actuel mais opère sur `entries[idx]` (passé en param) au lieu de `carousel.currentEntry.value`. **Aussi** : set `carousel.currentIndex.value = idx` avant `addRootVariantToEntry(idx, ...)` pour cohérence interne du composable.
   - `gotoLocked()` : `if (lockedIndex.value !== -1) { selectEntry(lockedIndex.value); nextTick(() => document.querySelector(\`[data-testid="radar-list-item-${lockedIndex.value}"]\`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })) }`.
8. **Supprimer** : import `CaptainCarousel`, ref `lockedCarouselEntry`, fonctions `lockCarouselEntry` et `unlockCarouselEntry` (remplacés par `lockEntry`/`unlockEntry`).

#### Phase 3 — CSS & polish

9. **Styles `captain-layout`** (à ajouter dans `<style scoped>` de CaptainValidation) :
   ```css
   .captain-layout {
     display: grid;
     grid-template-columns: minmax(0, 1fr) 360px;
     gap: 1rem;
     align-items: start;
     margin-top: 1rem;
   }
   .radar-list { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
   .radar-list-empty {
     padding: 2rem;
     text-align: center;
     color: var(--color-text-muted, #64748b);
     border: 1px dashed var(--color-border, #e2e8f0);
     border-radius: 10px;
   }
   .radar-list-item {
     cursor: pointer;
     border-radius: 10px;
     transition: box-shadow 0.15s, outline 0.15s;
     outline: 2px solid transparent;
     outline-offset: 2px;
   }
   .radar-list-item:hover { outline-color: var(--color-border-strong, #cbd5e1); }
   .radar-list-item:focus-visible {
     outline-color: var(--color-primary, #3b82f6);
   }
   .radar-list-item--selected {
     box-shadow: 0 0 0 2px var(--color-primary, #3b82f6);
   }
   .radar-list-item--locked {
     box-shadow: 0 0 0 2px var(--color-success, #22c55e);
   }
   .radar-list-item--selected.radar-list-item--locked {
     box-shadow:
       0 0 0 2px var(--color-success, #22c55e),
       0 0 0 4px var(--color-primary, #3b82f6);
   }
   ```
   **Important** (cf F21) : pas de `background` sur `:hover` du wrapper — utiliser `outline` qui ne leak pas dans les enfants.

#### Phase 4 — Nettoyage

10. **Supprimer `src/components/moteur/CaptainCarousel.vue`** après vérification finale `grep -r CaptainCarousel src/` → 0 résultat.
11. **Nettoyer `tests/unit/components/captain-sub-components.test.ts:25`** : supprimer le commentaire stale référençant CaptainCarousel.
12. **Mettre à jour la documentation** :
    - `docs/ui-sections-guide.md` : remplacer la section CaptainCarousel par CaptainSidePanel + radar-list.
    - `docs/moteur-data-flow.md` : adapter les diagrammes / flow Capitaine.
    - `ARCHITECTURE_FLOWS.md` : mettre à jour les diagrammes Mermaid de l'onglet Capitaine.
    - **Ne pas toucher** à `_bmad-output/planning-artifacts/architecture.md` ni `epics.md` (archives historiques selon CLAUDE.md).
13. **NE PAS toucher au composable `useCapitaineValidation`** : il sert toujours en mode libre (`currentResult`, `history`, `validateKeyword`, `navigateHistory`, etc.) et exporte `extractRoots`, `articleTypeToLevel`, `FRENCH_STOPWORDS` utilisés par 4 autres modules.

#### Phase 5 — Tests

14. **Adapter `tests/unit/components/captain-validation.test.ts`** (ne pas réécrire from scratch) :
    - **Conserver** tous les tests métier : persistence `addCaptainValidation`, AI panel cache, `restoreFromHistory`, watchers, `lockCaptain` store mutations, mode libre tests (table seuils, history chips, suggested keywords, RadarKeywordCard standalone).
    - **Remplacer** sélecteurs : `[data-testid="carousel-section"]` → `[data-testid="radar-list"]`, `carousel-prev/next` supprimés, `carousel-results` → `radar-list-item-{idx}`, `locked-captain-section` supprimé. Tests dépendant de `carousel-prev/next` (navigation) supprimés (plus de navigation séquentielle).
    - **Ajouter** :
      - `selectedIndex` initial à `null` → `[data-testid="side-panel-empty"]` visible.
      - Liste vide (no entries) → `[data-testid="radar-list-empty"]` visible.
      - Click sur `radar-list-item-0` → side panel affiche le contenu de l'entrée 0, `[data-testid="side-panel-content"]` présent.
      - Click sur item 1 alors que 0 est sélectionné → side panel switch.
      - Lock sur item 0 puis lock sur item 1 → item 0 perd `--locked`, item 1 gagne `--locked`, store `richCaptain.keyword === "kw1"`, `richCaptain.aiPanelMarkdown` = markdown de kw1 (pas null), `check-removed` puis `check-completed` émis dans cet ordre.
      - Lock sur entry avec `validation === null` → no-op (guard F8).
      - Loading entry : `[data-testid="radar-list-item-0-loading"]` visible.
      - Error entry : `[data-testid="radar-list-item-0-error"]` visible.
      - Article switch (`selectedArticle.id` change) → `selectedIndex` redevient `null`.
      - `entries.length` shrink (passe de 5 à 2) avec `selectedIndex = 4` → `selectedIndex` passe à `null`.
      - `gotoLocked` : avec lockedIndex = 3 et selectedIndex = 0, click sur le bouton → selectedIndex = 3.
      - `aria-pressed="true"` sur item sélectionné, `"false"` sinon.
      - Click sur un mot interactif : à valider en dev (test e2e plus pertinent que unit).
15. **Lancer la suite complète** : `npm run test:unit`, `npm run type-check`, `npm run lint`, `npm run check:dead`. Cible : 100% green.

#### Phase 6 — Validation manuelle (UI golden path)

16. `npm run dev`, ouvrir un cocoon avec un article qui a `radarCards` peuplées et `validationHistory` non vide.
17. **Checklist visuelle** :
    - Liste verticale affichée à gauche, side panel vide à droite avec message "Cliquez sur une carte pour voir l'analyse".
    - Si une carte est déjà locked en DB : badge halo vert visible sur la carte dans la liste, bouton "Aller à la carte verrouillée" dans la side panel vide.
    - Click sur carte → side panel se remplit (sidebar racines en haut, IA en dessous, lock en bas), side panel sticky reste visible au scroll.
    - Click sur autre carte → side panel switch sans glitch.
    - Lock une carte → halo vert + check workflow émis.
    - Lock une seconde carte → première perd halo, seconde gagne halo, check workflow toujours émis, `capitainesMap` dans la nav reflète bien le NOUVEAU mot-clé (vérifier `MoteurView.refreshCapitainesMap` se déclenche bien sur le `check-removed`).
    - `richCaptain.aiPanelMarkdown` du NOUVEAU keyword est bien posé après lock-transfer (debug devtools store).
    - Click sur lock toggle interne d'une carte non sélectionnée : ne déclenche PAS la sélection (sinon ajouter `@click.stop` sur le toggle).
    - Click sur un mot interactif : déclenche bien `word-toggle` (validation variant) sans sélectionner la carte (ou la sélectionner avant — comportement à acter et documenter).
    - Tab + Enter sur une carte → la sélectionne (a11y clavier).
    - `aria-live` du side panel annonce le changement (test avec lecteur d'écran si dispo).
    - Mode libre dans `/labo` : ouvre `/labo`, onglet Capitaine → ancien manual-mode visible (table seuils, suggested-keywords, RadarKeywordCard standalone), pas de side panel, pas de radar-list. Input + valider fonctionne comme avant.
    - Empty state : article sans radarCards et sans validationHistory → `[data-testid="radar-list-empty"]` visible côté gauche.

### Acceptance Criteria

**AC1 — Affichage liste verticale (mode workflow, données présentes)**
- **Given** un article avec `radarCards` peuplées et `validationHistory` non vide en mode `workflow`,
- **When** l'utilisateur ouvre l'onglet Capitaine,
- **Then** toutes les entrées validées sont affichées en stack vertical (`[data-testid="radar-list"]`), scroll naturel, side panel vide visible à droite (`[data-testid="side-panel-empty"]`) avec le message « Cliquez sur une carte pour voir l'analyse ».

**AC2 — État empty (mode workflow, aucune entrée)**
- **Given** un article sans `radarCards` et sans `validationHistory` en mode `workflow`,
- **When** l'utilisateur ouvre l'onglet Capitaine,
- **Then** `[data-testid="radar-list-empty"]` est visible avec le message « Aucun mot-clé à valider pour cet article. », et `[data-testid="side-panel-empty"]` est visible.

**AC3 — Sélection et side panel**
- **Given** la liste affiche ≥ 2 cartes,
- **When** l'utilisateur clique sur la carte d'index 1,
- **Then** la carte 1 reçoit `radar-list-item--selected` + `aria-pressed="true"`, et `[data-testid="side-panel-content"]` affiche : header keyword + verdict, sidebar des racines, panneau IA streamé/cached, panneau lock.

**AC4 — Switch de sélection**
- **Given** la carte 0 est sélectionnée,
- **When** l'utilisateur clique sur la carte 2,
- **Then** la carte 0 perd `--selected` (`aria-pressed="false"`), la carte 2 reçoit `--selected`, side panel switche, caches IA des autres cartes préservés (cf `carouselAiCache`).

**AC5 — Lock radio (1 seul capitaine)**
- **Given** la carte 0 est lockée (`richCaptain.keyword === "kw0"`, `richCaptain.aiPanelMarkdown === "<md0>"`),
- **When** l'utilisateur clique sur lock de la carte 1 (depuis la side panel) alors que `kw1` a son markdown IA en cache,
- **Then** dans cet ordre : (1) `emit('check-removed', 'capitaine_locked')` est émis, (2) après nextTick `emit('check-completed', 'capitaine_locked')` est émis, (3) `lockCaptain('kw1', '<md1>', articleId)` est appelé une fois — `richCaptain.keyword === "kw1"`, `richCaptain.aiPanelMarkdown === "<md1>"` (PAS `null`), (4) la carte 0 perd `--locked`, la carte 1 reçoit `--locked`, (5) `MoteurView.capitainesMap` est rafraîchi (vérifié manuellement).

**AC6 — Lock guard (validation incomplète)**
- **Given** la carte 0 est en `isLoading: true` (pas de `validation` encore),
- **When** une tentative de lock est appelée sur la carte 0 (théoriquement impossible via UI puisque `<CaptainInteractiveWords>` n'est pas rendu sans `validation`, mais via `onSidePanelLock` si side panel ouverte sur cette carte),
- **Then** `lockEntry(0)` retourne tôt, aucun emit, aucun appel store.

**AC7 — Unlock**
- **Given** la carte 1 est lockée (UI + store),
- **When** l'utilisateur clique sur unlock,
- **Then** `lockedKeyword` UI redevient `null`, aucune carte n'a `--locked`, `emit('check-removed', 'capitaine_locked')` est émis. Le store `richCaptain.status` reste tel qu'il était (le composant n'efface pas le record DB) — comportement iso à `unlockCarouselEntry()` actuel.

**AC8 — Mots interactifs préservés**
- **Given** la carte 0 affiche des mots interactifs (rootVariants chargés) et n'est pas sélectionnée,
- **When** l'utilisateur clique sur un mot pour toggler une variante,
- **Then** `addRootVariantToEntry(0, ...)` est appelé via `handleWordToggleAt(0, ...)`, la variante est validée et la carte 0 affiche les KPIs de la variante. Effet de bord toléré : la carte peut aussi être sélectionnée (bubbling) — comportement validé en dev et documenté dans `ui-sections-guide.md`.

**AC9 — Aucune régression de persistance**
- **Given** une carte vient d'être validée par `addEntry`,
- **When** la validation API se termine,
- **Then** `addCaptainValidation` est appelé une fois (watcher entries), le PUT debounced part, et après reload page, `restoreFromHistory` reconstruit la liste à l'identique avec markdowns IA cachés restaurés.

**AC10 — Mode libre intact**
- **Given** l'utilisateur est sur `/labo` (`mode === 'libre'`),
- **When** il ouvre l'onglet Capitaine et valide un mot via l'input,
- **Then** l'ancien manual-mode est rendu : `[data-testid="captain-results"]`, `[data-testid="thresholds-table"]`, `[data-testid="suggested-keywords"]` (si présents), `[data-testid="captain-radar-card"]`. AUCUN élément `[data-testid="radar-list"]` ou `[data-testid="side-panel"]` n'est rendu.

**AC11 — Reset selectedIndex sur changement d'article**
- **Given** `selectedIndex.value === 2` sur l'article A,
- **When** l'utilisateur sélectionne l'article B (props `selectedArticle.id` change),
- **Then** `selectedIndex.value` redevient `null` et `[data-testid="side-panel-empty"]` est visible.

**AC12 — Reset selectedIndex sur shrink des entries**
- **Given** `selectedIndex.value === 4` avec 5 entries,
- **When** un événement réduit `entries.length` à 2 (ex. `restoreFromHistory` avec moins d'entrées),
- **Then** `selectedIndex.value` redevient `null`.

**AC13 — Bouton "Aller à la carte verrouillée"**
- **Given** une carte d'index 3 est lockée et `selectedIndex.value === 0`,
- **When** l'utilisateur clique sur `[data-testid="side-panel-goto-locked"]`,
- **Then** `selectedIndex.value === 3`, `scrollIntoView` est appelé sur l'item correspondant.

**AC14 — Suppression de CaptainCarousel.vue**
- **Given** la migration est terminée,
- **When** on cherche `CaptainCarousel` dans `src/`,
- **Then** 0 résultat (composant supprimé, plus aucun import dans `src/`).

**AC15 — Documentation à jour**
- **Given** la migration est mergée,
- **When** on lit `docs/ui-sections-guide.md`, `docs/moteur-data-flow.md`, `ARCHITECTURE_FLOWS.md`,
- **Then** aucune mention obsolète de CaptainCarousel ; le pattern radar-list + CaptainSidePanel est documenté.

**AC16 — Accessibilité clavier**
- **Given** la liste affiche ≥ 1 carte,
- **When** l'utilisateur navigue au clavier (Tab) jusqu'à une carte et appuie sur Enter (ou Espace),
- **Then** la carte est sélectionnée (`selectedIndex` mis à jour, side panel se remplit).

## Additional Context

### Dependencies

- **Aucune nouvelle dépendance npm**.
- Composants Vue réutilisés : `CaptainInteractiveWords`, `CaptainRootsSidebar`, `CaptainAiPanel`, `CaptainLockPanel`, `RadarCardLockable`, `RadarKeywordCard`.
- Composable réutilisé : `useRadarCarousel` (sans modification).
- Store réutilisé : `useArticleKeywordsStore` (sans modification).

### Testing Strategy

- **Unitaire (Vitest + @vue/test-utils)** : `tests/unit/components/captain-validation.test.ts` réécrit (voir tâche 11).
- **Manuel** : checklist tâche 13–14, à dérouler en dev sur un article réel.
- **Pas de e2e Playwright nouveau** dans ce sprint (l'existant ne couvre pas spécifiquement le carrousel — à vérifier par grep `CaptainCarousel|carousel-section` dans `tests/browser/`, et adapter si trouvé).
- **Pas de test d'accessibilité formel** mais : la carte cliquable doit être atteignable au clavier → ajouter `tabindex="0"` + `@keydown.enter="selectEntry(idx)"` sur `.radar-list-item`. À inclure dans tâche 4.

### Notes

- **Dette identifiée (hors scope)** : les strings de checks workflow (`'capitaine_locked'`) sont hardcodées dans `CaptainValidation.vue` au lieu d'utiliser `MOTEUR_*` du `shared/constants/workflow-checks.constants.ts`. À refactorer dans un autre ticket pour respecter la règle CLAUDE.md #3.

- **Risque résiduel — clic vs interactions internes** : `RadarCardLockable.vue:45,63` a déjà `@click.stop` sur ses toggles internes. À auditer en dev : `RadarKeywordCard` dans son sous-composant `interactive-words` (mots cliquables). Si bubbling vers `selectEntry` détecté ET indésirable, ajouter `@click.stop` sur les boutons mots à l'intérieur de `RadarKeywordCard`. Comportement par défaut toléré pour AC8.

- **Largeur side panel et coexistence sticky** :
  - `MoteurView` : `padding 2rem`, `max-width 1280px` → ~1216px utiles. Sidebar gauche ~280px → ~920px pour le contenu. Grid `1fr 360px + 1rem gap` → ~544px à la liste. **Acceptable** mais serré.
  - `TabCachePanel` (MoteurView.vue:614) est sticky-bottom, side panel sticky-top → coexistence OK. `z-index: 5` sur side panel pour priorité de pile.
  - Si après dev la largeur s'avère insuffisante (cartes RadarCard tronquées), passer la side panel à `320px` puis envisager un drawer slide-in dans une itération ultérieure (hors scope actuel).

- **Risque race condition watchers de persistance + lock-as-radio** :
  - Watcher 3 (lignes 637-653) écrit `updateCaptainValidationAiPanel(kw, markdown)` quand un AI stream se termine.
  - `lockCaptain` overwrite `richCaptain.aiPanelMarkdown` directement.
  - **Scenario à risque** : lock kw1 alors que stream IA de kw0 termine en parallèle → watcher 3 écrit le markdown de kw0 dans `validationHistory[kw0].aiPanelMarkdown` (OK, par entry) MAIS `lockCaptain('kw1', md1)` écrase `richCaptain.aiPanelMarkdown` à `md1` (OK aussi). Pas de write-write race **réelle** car les deux écritures touchent des champs différents (`validationHistory[kw].aiPanelMarkdown` vs `richCaptain.aiPanelMarkdown`).
  - **Cependant** : si on lock kw0 alors que son propre stream IA termine, l'ordre des deux writes est non-déterministe. Le pire cas : `richCaptain.aiPanelMarkdown` reçoit le markdown final correct. Pas de régression vs comportement actuel.
  - **Recommandation** : ajouter un test de stress dans la phase manuelle (lock pendant streaming actif) pour valider.

- **`useRadarCarousel.entries` est un Ref** : dans `<script setup>`, accéder via `carousel.entries.value`. Dans le `<template>`, l'auto-unwrap Vue ne fonctionne PAS sur les accès en chaîne (`carousel.entries`). **Solution** : destructurer `const { entries: carouselEntries } = carousel` dans `<script setup>` (où `carouselEntries` reste un ref auto-unwrappé en template) OU créer un computed `const entries = computed(() => carousel.entries.value)` puis utiliser `entries` dans le template. **Décision retenue** : créer un computed wrapper local pour rester explicite.

- **Dead code post-migration** : `CaptainCarousel.vue` (~150 LOC) supprimé. Composable `useCapitaineValidation` **conservé entièrement** (utilisé en mode libre + helpers exportés ailleurs).

- **Le composable `useRadarCarousel` reste l'API unique de l'état** : la liste UI et la side panel lisent toutes deux depuis `entries[]`, garantissant cohérence. La `selectedIndex` locale est un pointeur read-only sur cet état.

- **Mode libre garanti intact** : décision Décision #12 cloisonne strictement workflow vs libre par `v-if/v-else`. Le bloc manual-mode actuel n'est PAS modifié, juste sa condition d'affichage. Risque zéro de régression mode libre.

- **Validation manuelle obligatoire** avant merge sur les 4 points : (1) `capitainesMap` mis à jour après lock-transfer, (2) `aiPanelMarkdown` correct après lock-transfer, (3) bubbling click sur enfants interactifs, (4) coexistence sticky avec `TabCachePanel`.
