---
name: Sprint 18 — Lock sur originalCard.keyword UNIQUEMENT
version: 1.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-18-22-cleanup-and-investigations
---

# Tech-Spec — Sprint 18 : Lock sur originalCard UNIQUEMENT

## 1. Décision produit

> *« On lock l'original, ça a été dit plusieurs fois. Je ne veux aucune hésitation
> là-dessus. On a pas de raison de lock un mot-clé racine sur une RadarCard qui
> affiche un mot-clé plus long. Si ça devait se faire, l'utilisateur rechercherait
> une RadarCard avec le mot-clé en question comme original keyword, ou bien
> ajouterait cette RadarCard via l'input text dédié à l'onglet capitaine. »*

Sprint 17 avait introduit un compromis défensif : `pinnedPredicate` matchait
`originalCard.keyword OR card.keyword` pour gérer le cas où l'utilisateur lockait
une racine active (`lockEntry` capturait `entry.card.keyword`). Sprint 18 supprime
cette ambiguïté.

## 2. Périmètre

### Comportement avant Sprint 18
```typescript
// lockEntry — capturait la racine active si une était sélectionnée
const newKw = entry.card.keyword

// pinnedPredicate — matchait l'un OU l'autre
return entry.originalCard.keyword === lockedKeyword.value
    || entry.card.keyword === lockedKeyword.value
```

### Comportement après Sprint 18
```typescript
// lockEntry — capture TOUJOURS le mot-clé d'origine
const newKw = entry.originalCard.keyword

// pinnedPredicate — match UNIQUEMENT sur originalCard
return entry.originalCard.keyword === lockedKeyword.value
```

### Fichiers modifiés
- `src/components/moteur/CaptainPanel.vue` : `lockEntry`, `pinnedPredicate`,
  `lockedIndex`, `selectedIsLocked`.
- `src/components/moteur/captain/CaptainRadarList.vue` : classe `radar-list-item--locked`.
- `src/components/moteur/CaptainInteractiveWords.vue` : computed `isLocked`.
- `tests/unit/composables/captain-sort-stable-sprint17.test.ts` : test AC.17.A.2
  mis à jour pour vérifier match UNIQUEMENT sur originalCard.

### Tests régression
- AC.17.A.2 (mis à jour) : pinnedPredicate match UNIQUEMENT sur `originalCard.keyword`.
  Lock sur la racine active ne doit pas pin la card.

## 3. FR

### FR-CAP-LOCK-ORIGINAL-ONLY (nouvelle, supersede partiellement Sprint 17)
Le mot-clé verrouillé du Capitaine est **toujours** l'`originalCard.keyword` de la
RadarCard sélectionnée, jamais une racine active. Si l'utilisateur veut verrouiller
une racine, il doit la chercher explicitement (input text Capitaine ou recherche
d'une RadarCard ayant ce mot-clé comme original).

**Justification** :
- Cohérence DB : 1 RadarCard = 1 entrée stable dans `captain_explorations`.
- Cohérence UI : `pinnedPredicate` simplifié (1 seul critère de match).
- Cohérence sémantique : le verrouillage agit sur la card identifiée par son
  mot-clé d'origine, peu importe la racine active.
- Anti-bug : élimine les cas où locker une racine + désactiver la racine
  laisserait une card "verrouillée" mais avec un mot-clé d'affichage différent.

**Critères d'acceptation testables** :
- `lockEntry(idx)` capture toujours `entry.originalCard.keyword`, jamais
  `entry.card.keyword` (test verrouillé).
- Le `pinnedPredicate` match UNIQUEMENT sur `originalCard.keyword` (AC.17.A.2 mis à jour).
- Le `lockedIndex` cherche par `originalCard.keyword`.

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-18-lock-on-original-card.

## 4. Validation

- `npm run type-check` ✅
- `npm run test:unit` : 3962 tests verts (2 sanity E2E pré-existants requièrent serveur dev,
  1 test gaps obsolète skippé post-Sprint 13)
- `npm run build` : 9.14s ✅
