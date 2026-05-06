---
name: Sprint 17 — Bugs comportementaux Capitaine + checkbox=lock immédiat
version: 1.0.0
last_updated: 2026-05-06
status: in-progress
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 17 : Bugs comportementaux Capitaine + suppression boutons batch

## 1. Contexte

Suite à l'analyse approfondie post-Sprint 16, deux bugs comportementaux sont
identifiés dans le Capitaine, et la décision produit Sprint 10.5 de supprimer
les boutons "Verrouiller la sélection" en bloc côté Lieutenants/Lexique est
mise en œuvre.

## 2. Bug A — Réorganisation de la liste au clic sur un terme du mot-clé

### Symptôme observé
L'utilisateur clique sur un mot souligné (`kw-word--active`) d'une RadarCard
pour activer/désactiver une racine. La card change de position dans la liste
triée — typiquement parce que `entry.card.keyword` change avec la racine active.

### Cause racine
[CaptainPanel.vue:430-435](src/components/moteur/CaptainPanel.vue#L430-L435)
utilise `entry.card.keyword` dans les `getValue` du tri (A-Z, score) et dans
le `pinnedPredicate`. Or `entry.card` est remplacé dynamiquement par
`entry.rootVariants[X].card` quand l'utilisateur active une racine
(cf. [useExploredKeywords.ts:311-318](src/composables/keyword/useExploredKeywords.ts#L311-L318)).

### Correctif
Utiliser **`entry.originalCard.keyword`** dans le tri et le predicate. La
position de la card dans la liste reste stable même si l'utilisateur change
la racine active. Le score Pertinence affiché continue de venir de
`entry.card.relevanceScore` (la racine active), mais le tri se fait sur
`originalCard.relevanceScore` pour la stabilité.

### Tests régression
- AC.17.A.1 : Activer/désactiver un mot dans une RadarCard ne change pas l'index
  de la card dans `sortedEntries` (tri A-Z et tri score, et tri neutre).
- AC.17.A.2 : Le `pinnedPredicate` matche par `originalCard.keyword`, pas
  `card.keyword`.

## 3. Bug B — Duplication de la card verrouillée à chaque toggle

### Symptôme observé (screenshot utilisateur)
3 cards `"vitesse chargement site web"` dans la liste, dont 2 verrouillées et
1 non verrouillée, après plusieurs clics consécutifs sur le toggle lock.

### Cause racine
[CaptainPanel.vue:164-179](src/components/moteur/CaptainPanel.vue#L164-L179) — watcher
sur `articleKeywordsStore.keywords?.capitaine` :

```js
watch(
  () => articleKeywordsStore.keywords?.capitaine,
  (persisted) => {
    if (!persisted) return
    if (isLocked.value) {
      const currentKw = carousel.currentEntry.value?.card.keyword
      if (currentKw !== persisted) {
        carousel.addEntry(persisted, ...)  // ⚠️ Ajoute une entry sans dédoublonnage
      }
    }
  }, { immediate: true },
)
```

À chaque lock/unlock/relock, `keywords.capitaine` mute, le watcher se déclenche,
et si `currentEntry` ne pointe pas exactement sur l'entry lockée,
`addEntry(persisted, ...)` est appelé. **`addEntry` n'a aucune déduplication** —
il fait `entries.value = [...entries.value, newEntry]`
([useExploredKeywords.ts:236](src/composables/keyword/useExploredKeywords.ts#L236)).

Combiné avec le `pinnedPredicate` qui épingle **toutes** les entries dont
`card.keyword === lockedKeyword` (Bug A racine), les duplications remontent
toutes en haut visuellement.

### Correctif (3 lignes de défense)
1. **`addEntry` doit dédoublonner** : si `entries.value.some(e => e.originalCard.keyword === keyword)` → ne pas ajouter, juste mettre à jour `currentIndex` sur l'entry existante.
2. **`loadCards` doit dédoublonner** ses inputs (Map par keyword).
3. **`restoreFromHistory` doit dédoublonner** l'historique reçu (Map par keyword).
4. **Watcher `keywords.capitaine`** : ne plus appeler `addEntry`. Si l'entry n'existe pas dans `entries`, c'est une erreur de cohérence à logger (pas à patcher en ajoutant une dup).

### Tests régression
- AC.17.B.1 : `addEntry("X")` 3 fois ne produit qu'une seule entry dans `entries.value`.
- AC.17.B.2 : `loadCards([X, X, Y])` produit 2 entries (dédup par keyword).
- AC.17.B.3 : `restoreFromHistory([X, X])` produit 1 entry.
- AC.17.B.4 : Cliquer le toggle lock 3 fois sur la même card ne crée pas de duplication.
- AC.17.B.5 : Locker une card A puis déverrouiller puis locker une card B ne dupplique aucune card.

## 4. Suppression boutons batch Lieutenants/Lexique

### Décision produit (Sprint 10.5)
> *« Le verrouillage c'est par mot-clé, pas par container. Supprimer les boutons
> "Verrouiller les Lieutenants" et "Verrouiller le Lexique" en bloc — la checkbox
> de chaque mot-clé fait le verrouillage immédiat. »*

### Périmètre Lieutenants

**Avant** :
- Checkbox sur `LieutenantCard` toggle un état mémoire local (`selectedCards: Map`)
- Bouton "Verrouiller les Lieutenants" appelle `lockLieutenants()` qui persiste tout en bloc

**Après** :
- Checkbox sur `LieutenantCard` appelle `lockLieutenant(keyword)` (nouvelle méthode store) qui passe le statut DB de ce lieutenant à `'locked'` immédiatement
- Décocher = passer le statut à `'eliminated'` (ou `'suggested'` selon convention)
- Le bouton "Verrouiller les Lieutenants" est **supprimé**
- Le check workflow `MOTEUR_LIEUTENANTS_LOCKED` est émis automatiquement dès que `richLieutenants.some(l => l.status === 'locked')`

### Périmètre Lexique

**Avant** :
- Checkbox sur chaque terme TF-IDF toggle `selectedTerms` (mémoire locale)
- Bouton "Verrouiller le Lexique" persiste tout en bloc dans `keywords.lexique`

**Après** :
- Checkbox terme TF-IDF appelle `addLexiqueTerm(value)` / `removeLexiqueTerm(value)` immédiatement (méthodes déjà existantes dans le store)
- Le bouton "Verrouiller le Lexique" est **supprimé**
- Le check workflow `MOTEUR_LEXIQUE_VALIDATED` est émis automatiquement dès que `keywords.lexique.length > 0`

### Préservé (cas Capitaine)
Le bouton "Verrouiller ce mot-clé" du Capitaine reste — c'est une décision UNIQUE
sur un mot-clé pilier, pas une sélection multiple en bloc.

### Tests régression
- AC.17.C.1 : Cocher une checkbox Lieutenant → `richLieutenants[i].status === 'locked'` immédiatement en store.
- AC.17.C.2 : Décocher une checkbox Lieutenant → `richLieutenants[i].status === 'suggested'`.
- AC.17.C.3 : Cocher 1 lieutenant → check `MOTEUR_LIEUTENANTS_LOCKED` émis.
- AC.17.C.4 : Décocher tous les lieutenants → check `MOTEUR_LIEUTENANTS_LOCKED` retiré.
- AC.17.C.5 : Cocher un terme Lexique → ajout dans `keywords.lexique` immédiat.
- AC.17.C.6 : Le bouton "Verrouiller les Lieutenants" / "Verrouiller le Lexique" n'existe plus dans le DOM.
- AC.17.C.7 : Le bouton "Verrouiller ce mot-clé" du Capitaine reste fonctionnel.

## 5. FRs

### FR-CAP-LOCK-NO-DUPLICATE (Bug B)
Quand l'utilisateur lock/unlock/relock une RadarCard du Capitaine, **aucune
entry n'est dupliquée** dans `entries.value`. La déduplication est appliquée
au niveau de `addEntry` (ne crée jamais une 2e entry pour le même
`originalCard.keyword`), `loadCards` (dédup des inputs), `restoreFromHistory`
(dédup de l'historique).
**Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

### FR-CAP-SORT-STABLE-ON-ROOT-VARIANT (Bug A)
Activer/désactiver une racine d'une RadarCard du Capitaine (clic sur un mot
souligné) **ne change pas la position** de la card dans la liste triée. Le tri
A-Z et le tri score utilisent `entry.originalCard.keyword` /
`entry.originalCard.relevanceScore` au lieu de `entry.card.*`.
**Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

### FR-LIE-CHECKBOX-LOCK-IMMEDIATE
Cocher la checkbox d'un lieutenant verrouille IMMÉDIATEMENT ce lieutenant en
DB (`status = 'locked'`, `lockedAt` setté). Le décochage le déverrouille
(`status = 'suggested'`). Aucun bouton "Verrouiller la sélection" en bloc.
Le check workflow `MOTEUR_LIEUTENANTS_LOCKED` est dérivé : émis dès que
≥1 lieutenant a `status === 'locked'`.
**Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

### FR-LEX-CHECKBOX-LOCK-IMMEDIATE
Cocher la checkbox d'un terme TF-IDF du Lexique l'ajoute IMMÉDIATEMENT à
`keywords.lexique`. Le décochage le retire. Aucun bouton "Verrouiller le
Lexique" en bloc. Le check workflow `MOTEUR_LEXIQUE_VALIDATED` est dérivé :
émis dès que `keywords.lexique.length > 0`.
**Source :** tech-spec-sprint-17-bugs-comportementaux-capitaine.

## 6. Plan d'implémentation

### Phase 1 — Bug A (1 fichier)
- `CaptainPanel.vue` : `getValue` et `pinnedPredicate` lisent `originalCard.keyword`
- Test régression : `tests/unit/components/captain-panel-sort-stable.test.ts`

### Phase 2 — Bug B (2 fichiers)
- `useExploredKeywords.ts` : déduplication dans `addEntry`, `loadCards`, `restoreFromHistory`
- `CaptainPanel.vue` : watcher `keywords.capitaine` ne fait plus `addEntry` (juste `lockedKeyword.value = persisted` et un log si entry manquante)
- Tests régression : `tests/unit/composables/useExploredKeywords-dedup.test.ts` (étendu)

### Phase 3 — Suppression boutons batch (5-7 fichiers)
- Store : ajout `lockLieutenant(keyword)` / `unlockLieutenant(keyword)` au store article-keywords
- `LieutenantsResultsLayout.vue` : suppression du bouton + checkbox = lock immédiat
- `LieutenantCard.vue` : `update:checked` appelle directement `lockLieutenant`
- `LexiquePanel.vue` : suppression du bouton + checkbox = ajout/retrait immédiat dans `keywords.lexique`
- Émission des checks `MOTEUR_*_LOCKED` dérivée par computed dans MoteurView
- Tests régression : `lieutenants-checkbox-lock.test.ts`, `lexique-checkbox-lock.test.ts`

### Phase 4 — Validation
- `npm run type-check`
- `npm run test:unit` complet
- `npm run build`

## 7. Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Suppression bouton batch casse un workflow utilisateur | Moyenne | Tests E2E sur le flow complet, vérifier que le check workflow émet bien |
| Dédup `loadCards` casse un cas où Radar envoie 2 fois le même par design | Faible | Vérifier l'usage actuel de `loadCards` |
| Watcher `keywords.capitaine` qui ne fait plus `addEntry` casse un cas legacy | Moyenne | Logger les cas où l'entry serait manquante pour identifier les régressions |
