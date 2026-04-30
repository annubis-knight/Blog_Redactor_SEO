# Améliorations UI/UX du Capitaine — avril 2026

> Ce document trace les évolutions UX livrées entre fin avril 2026 sur l'onglet
> **Capitaine** du Moteur (radar list + side-panel). Chaque amélioration est
> couverte par des tests anti-régression listés en fin de chaque section.

---

## 1. Side-panel masqué quand aucune carte sélectionnée

### Avant
Le `<aside>` du `CaptainSidePanel` était **toujours rendu**, même sans carte sélectionnée. Un drawer vide de 300px occupait toute la hauteur de la viewport, parasitant le visuel et la sensation de "panel fermé".

### Après
Le panel utilise un `v-if="entry !== null"` : tant qu'aucune carte n'est sélectionnée, **rien n'est rendu dans le DOM**. La radar list reprend toute la largeur disponible.

### Code
- [src/components/moteur/CaptainSidePanel.vue](../src/components/moteur/CaptainSidePanel.vue) — `v-if` sur le `<aside>` racine
- Suppression du bloc `side-panel-disabled` et de son CSS associé

### Tests
- [tests/unit/components/captain-side-panel.test.ts](../tests/unit/components/captain-side-panel.test.ts) :
  - `REGRESSION GUARD : entry=null → panel ABSENT du DOM (pas de drawer vide)`
  - `entry défini → panel rendu avec le keyword visible`

---

## 2. Fermeture du panel par croix + clic extérieur

### Avant
- L'événement `@close` du side-panel **n'avait aucun listener** côté parent → la croix ne fonctionnait plus
- Aucune fermeture par clic extérieur

### Après
- `@close` câblé sur `selectedIndex = null` côté `CaptainValidation` → la croix referme le panel
- Détection click-outside via `useEventListener('pointerdown')` :
  - Skip si panel déjà fermé (`!props.entry`)
  - Skip pendant un resize (`isResizing.value`) — sinon le pointerup qui termine l'étirement de la poignée fermerait le panel juste après
  - Skip sur les `[data-testid^="radar-list-item"]` — le parent gère la nouvelle sélection sans qu'on parasite avec un close prématuré

### Code
- [src/components/moteur/CaptainSidePanel.vue](../src/components/moteur/CaptainSidePanel.vue) — `useEventListener` + 3 garde-fous
- [src/components/moteur/CaptainValidation.vue](../src/components/moteur/CaptainValidation.vue) — `@close="selectedIndex = null"`

### Tests
- [tests/unit/components/captain-side-panel.test.ts](../tests/unit/components/captain-side-panel.test.ts) :
  - `clic sur la croix de fermeture → emit("close")`
  - `clic en dehors du panel → emit("close")`
  - `REGRESSION GUARD : clic à l'intérieur du panel → AUCUN emit("close")`
  - `REGRESSION GUARD : clic sur un radar-list-item → AUCUN emit("close")`

---

## 3. Sélection : effet "bouton enfoncé"

### Avant
Une **border bleue extérieure** (`box-shadow: 0 0 0 2px primary`) tranchante autour de la carte sélectionnée. Visuellement agressif.

### Après
Effet *bouton enfoncé* :
- `background` gris clair (5% d'opacité noire)
- `box-shadow: inset` (creux interne) qui simule un enfoncement
- `transform: translateY(1px)` pour le mouvement vertical
- Hover plus prononcé sur l'état sélectionné

### Code
- [src/components/moteur/CaptainValidation.vue](../src/components/moteur/CaptainValidation.vue) → CSS `.radar-list-item`, `.radar-list-item--selected`

```css
.radar-list-item--selected {
  background: rgba(15, 23, 42, 0.05);
  box-shadow:
    inset 0 2px 4px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  transform: translateY(1px);
}
```

---

## 4. Verrouillage : suppression des borders vertes doublées

### Avant
Deux bordures vertes superposées :
1. `radar-list-item--locked` côté **parent** (`box-shadow: 0 0 0 2px success`)
2. `radar-card-lockable.locked` côté **enfant** (`border: 2px solid success`)

Visuellement lourd et redondant.

### Après
- Aucune border verte. Le seul indicateur de verrouillage reste le **bouton cadenas** qui passe en **vert plein** quand actif (déjà en place dans `RadarCardLockable`)
- Optionnel : tint background discret (`rgba(34, 197, 94, 0.04)`) sur la card pour un indice visuel subtil
- La classe `radar-list-item--locked` reste appliquée pour la sémantique (utile pour tests / sélecteurs CSS futurs) mais n'a plus de style associé

### Code
- [src/components/intent/RadarCardLockable.vue](../src/components/intent/RadarCardLockable.vue) → suppression de la border verte parent
- [src/components/moteur/CaptainValidation.vue](../src/components/moteur/CaptainValidation.vue) → suppression des règles `.radar-list-item--locked` et `.radar-list-item--selected.radar-list-item--locked`

---

## 5. Side-panel flottant + redimensionnement sans limite

### Avant
- `PANEL_MAX_WIDTH = 480` (puis viewport - 320 dans une révision intermédiaire) → le panel ne pouvait pas dépasser cette largeur
- `captain-layout` en grid `1fr + 360px` réservait une colonne fixe à droite, même quand le panel était `position: fixed` (donc hors flux du grid). Résultat : un trou de 360px à droite quand le panel ne l'occupait pas réellement.

### Après
- `PANEL_MAX_WIDTH` complètement supprimé du composable. Plus aucune borne haute — l'utilisateur peut étirer le panel autant qu'il veut. Seul le floor minimum (`PANEL_MIN_WIDTH = 240`) est conservé.
- `captain-layout` passe de `display: grid` à `display: block`. Le panel étant `position: fixed` (purement flottant), il vit en surimpression et n'impacte plus le layout. La radar list reprend toute la largeur du container parent **en permanence**, qu'une carte soit sélectionnée ou non.

### Code
- [src/composables/ui/useResizablePanel.ts](../src/composables/ui/useResizablePanel.ts) → suppression de toute borne haute
- [src/components/moteur/CaptainValidation.vue](../src/components/moteur/CaptainValidation.vue) → `.captain-layout { display: block }`

### Tests
- [tests/unit/composables/useResizablePanel.test.ts](../tests/unit/composables/useResizablePanel.test.ts) :
  - `panelWidth accepte n'importe quelle valeur élevée (pas de borne haute)`
  - `expose la borne PANEL_MIN_WIDTH (PANEL_MAX_WIDTH supprimé)`
  - `drag énorme à gauche : aucune borne haute, le panel s'étire sans limite` (5300px accepté sans clamp)

---

## 6. TabCachePanel : vrais comptes DB (et non flags binaires)

### Avant
`dbCount` pour chaque onglet (Capitaine, Lieutenants, Lexique, Radar) était calculé sur des **flags d'état métier** :
```ts
dbCount: isCaptaineLocked.value ? 1 : 0
```
Conséquence : un article avec **10 captain_explorations** affichait `DB 0` tant que le capitaine n'était pas verrouillé. L'endpoint `/articles/:id/explorations/counts` existait pourtant déjà côté backend mais n'était plus consommé.

### Après
- Ajout d'une `ref<ExplorationCounts>` dans `MoteurView`
- `refreshExplorationCounts()` appelle l'endpoint backend
- Watch `immediate` sur `selectedArticle?.id` → recharge automatique au mount + à chaque changement d'article
- Recharge aussi à chaque `emitCheckCompleted` / `handleCheckRemoved` (mutations DB)
- Extraction de la logique de mapping en utilitaire pur **`buildTabCacheEntries(counts, ui)`** dans [src/utils/tab-cache-entries.ts](../src/utils/tab-cache-entries.ts) — testable sans Pinia/Router/mounts complexes
- Hints enrichis : *« 8 mots-clés testés »*, *« 12 propositions en base · 5 verrouillés »*, etc.

### Pourquoi extraire en utilitaire pur ?
Ce bug avait déjà été *« réglé »* en commentaire dans un commit antérieur sans que l'implémentation suive. La fonction pure permet :
- Des tests sans mounter MoteurView (qui nécessite Pinia + Router + plein de stores)
- Une couverture rapide des cas critiques (REGRESSION GUARDs)
- Un blocage CI si quelqu'un re-câble `dbCount` sur un flag binaire

### Code
- [src/utils/tab-cache-entries.ts](../src/utils/tab-cache-entries.ts) — fonction pure
- [src/views/MoteurView.vue](../src/views/MoteurView.vue) → délègue à `buildTabCacheEntries`
- [server/routes/article-explorations.routes.ts](../server/routes/article-explorations.routes.ts) → endpoint déjà existant, désormais consommé

### Tests
- [tests/unit/utils/tab-cache-entries.test.ts](../tests/unit/utils/tab-cache-entries.test.ts) (14 tests) :
  - `REGRESSION GUARD : capitaine NON verrouillé + 10 explorations DB → dbCount = 10`
  - `REGRESSION GUARD : lieutenants NON verrouillés + 12 propositions DB → dbCount = 12`
  - `multi-articles : appels séparés produisent des résultats indépendants`
  - protection contre payload partiel (counts undefined → 0, pas NaN)
  - hints pluralisés correctement
- [tests/contract-api/article-explorations-counts.contract.test.ts](../tests/contract-api/article-explorations-counts.contract.test.ts) (4 tests) :
  - shape stable de la réponse
  - article vide → tous counts à 0
  - id invalide → 400
  - multi-articles : pas de fuite côté serveur

---

## Récap des commits

```
54e6dfd  feat(captain): fermeture du side-panel sur click extérieur + reconnexion croix
1cc6b0c  fix(captain): aligne props CaptainSidePanel + retire handlers orphelins
bea9e4f  fix(moteur): TabCachePanel affiche le vrai compte DB des explorations
03eb81e  test(moteur): garde-fous anti-régression TabCachePanel
9a7f49e  fix(captain): masque le side-panel quand aucune carte sélectionnée
acc127e  style(captain): refonte sélection + verrouillage radar-list-item
7fe8390  fix(captain): side-panel flottant + redimensionnement sans borne haute
```

## Couverture totale anti-régression

- **CaptainSidePanel** : 7 tests (visibilité conditionnelle, close croix, click-outside, garde-fous internes/list-items, KPIs lecture seule)
- **useResizablePanel** : 14 tests (floor min, pas de borne haute, drag dans tous les sens)
- **buildTabCacheEntries** : 14 tests (vrais counts DB, multi-articles, fallbacks)
- **Endpoint /explorations/counts** : 4 tests contract (shape, multi-articles, edge cases)

Total : **39 tests** sur ces 6 améliorations. Aucun n'utilise d'appel IA réel — tous sont mockés.

## Voir aussi

- [docs/scoring-kpi-vs-relevance.md](./scoring-kpi-vs-relevance.md) — Score KPI / Pertinence
- [docs/pain-point-editorial-backbone.md](./pain-point-editorial-backbone.md) — painPoint comme colonne vertébrale
- [docs/moteur-data-flow.md](./moteur-data-flow.md) — Flux complet du Moteur
