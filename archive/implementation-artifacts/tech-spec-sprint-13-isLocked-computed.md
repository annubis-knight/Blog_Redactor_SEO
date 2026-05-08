---
name: Sprint 13 — Refonte verrou en computed (suppression Refs isLocked locales)
version: 1.0.0
last_updated: 2026-05-06
status: in-progress
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 13 : Refonte verrou en computed

## 1. Contexte

Décision produit (2026-05-06, suite discussion Sprint 10.5) :

> *« Il n'y a pas de raison qu'un container soit verrouillé ou pas, puisque le verrouillage c'est uniquement par rapport à des mots-clés. »*

Aujourd'hui dans Capitaine/Lieutenants/Lexique, `isLocked` est une **Ref locale** synchronisée manuellement avec le store via plusieurs `watch` et écritures impératives `isLocked.value = true/false`. Cette double source de vérité est fragile :
- Capitaine a un Sprint 16 hotfix watcher pour resyncher `isLocked` depuis `richCaptain.status` ([CaptainValidation.vue:170-186](src/components/moteur/CaptainValidation.vue#L170-L186)).
- Lieutenants n'a pas de hotfix équivalent — fragile au reload.

L'objectif est de **dériver `isLocked` directement de la donnée persistée** :
- Capitaine : `isLocked = computed(() => richCaptain?.status === 'locked')`
- Lieutenants : `isLocked = computed(() => richLieutenants?.some(l => l.status === 'locked'))` (si ≥1 lieutenant locké)
- Lexique : `isLocked = computed(() => keywords?.lexique?.length > 0 && lockedFlag)` — le store n'a pas encore de notion claire de lock pour le Lexique. À investiguer.

## 2. Périmètre

### Capitaine (CaptainValidation.vue)

**Avant** :
```typescript
const isLocked = ref(props.initialLocked)
// + 6 écritures impératives isLocked.value = true/false dispersées
// + 2 watchers de sync (lignes 135-148 et 167-186)
```

**Après** :
```typescript
const isLocked = computed(() => 
  articleKeywordsStore.keywords?.richCaptain?.status === 'locked' 
  && articleKeywordsStore.keywords?.articleId === props.selectedArticle?.id
)
```

**Impact** :
- La fonction `lockCaptaine()` n'écrit plus `isLocked.value = true` — c'est le store qui via `lockCaptain()` met `richCaptain.status = 'locked'` et le computed se réactive.
- La fonction `performUnlock()` n'écrit plus `isLocked.value = false` — le store fait `richCaptain.status = 'suggested'` → computed se réactive.
- Le watcher Sprint 16 hotfix (lignes 167-186) **disparaît** (computed le remplace).
- La prop `initialLocked` devient inutile mais on la garde pour compat tests.

### Lieutenants (LieutenantsSelection.vue)

**Avant** :
```typescript
const isLocked = ref(props.initialLocked)
// + 3 écritures impératives
// + 1 watcher reset au changement d'article
```

**Après** :
```typescript
const isLocked = computed(() =>
  (articleKeywordsStore.keywords?.richLieutenants?.some(l => l.status === 'locked') ?? false)
  && articleKeywordsStore.keywords?.articleId === props.selectedArticle?.id
)
```

### Lexique (LexiqueExtraction.vue)

**À investiguer** : aujourd'hui `isLocked` n'a pas de pendant DB clair — il y a juste `keywords?.lexique` (array de termes) qui est rempli au lock. La logique `lockLexique` met `isLocked.value = true` mais ne change pas le store dans un état "locked".

**Décision Sprint 13** : pour Lexique, on ne refond PAS le verrou — il faut d'abord clarifier la sémantique côté DB (sprint dédié futur). Sprint 13 garde la Ref locale Lexique inchangée. **Réduction de périmètre vs plan initial.**

## 3. FRs

### FR-MOT-LOCK-DERIVED (nouvelle)
L'état "verrouillé" d'un container Moteur (Capitaine, Lieutenants) est **dérivé** de la donnée persistée (statut DB), pas stocké dans une Ref locale. La double source de vérité (Ref + store) qui demandait des watchers de synchronisation manuelle est supprimée. Le store est la source unique.

**Critères d'acceptation testables** :
- `isLocked` dans CaptainValidation.vue est un `computed`, pas une `ref`.
- `isLocked` dans LieutenantsSelection.vue est un `computed`, pas une `ref`.
- Aucune écriture impérative `isLocked.value = true/false` ne subsiste dans ces 2 fichiers.
- Le watcher Sprint 16 hotfix de CaptainValidation.vue est supprimé (sa raison d'être disparaît avec le computed).
- Tests existants passent (le comportement observable est identique).

**Hors scope** : Lexique reste en Ref locale tant que la sémantique de lock côté DB n'est pas clarifiée.

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-13-isLocked-computed.

## 4. Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Tests qui mockent `articleKeywordsStore.keywords` sans `articleId`/`richCaptain` cassent | Élevée | Identifier et ajuster un par un |
| Computed re-évalué trop souvent (perf) | Faible | computed est mémoisé par défaut dans Vue 3 |
| Modal UnlockLieutenants qui s'appuie sur `isLocked.value = false` impératif | Moyenne | Le flow `performUnlock` appelle `unlockCaptain` du store qui met `status = 'suggested'`, puis le computed se réactive |
| Tests E2E (Playwright) qui dépendent du timing | Faible | Vue 3 reactivity sync sur computed |

## 5. Plan

1. Capitaine : remplacer Ref par computed, supprimer écritures + watcher hotfix.
2. Tests Capitaine : ajuster les mocks pour fournir `richCaptain.status` cohérent.
3. Lieutenants : idem.
4. Tests Lieutenants : ajuster.
5. Lexique : **inchangé** (out of scope).
6. Validation : `npm run test:unit` complet + `npm run build`.
