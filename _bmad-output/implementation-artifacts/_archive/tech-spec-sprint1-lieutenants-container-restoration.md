---
name: Sprint 1 — Restauration containers principaux Lieutenants
description: Corrige la régression Sprint C-1 qui a absorbé les containers principaux Lieutenants dans le panel IA. Suppression `lieutenants-header` legacy. Auto-load DB Radar reporté à un sprint dédié pour garder ce commit ciblé.
type: tech-spec
status: ARCHIVED
version: 1.1.0
created: 2026-05-04
last_updated: 2026-05-04
synced_with:
  - docs/ui-sections-guide.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
---

> **🗄️ ARCHIVED — 2026-05-04**
> Sprint livré et stable. Tests verts : 129/129 (5 fichiers Lieutenants).
> Auto-load Radar (#6) déplacé hors-scope sprint 1 pour garder ce commit
> ciblé sur la cause racine identifiée (régression Sprint C-1).
> À planifier dans un sprint dédié si toujours pertinent après tests utilisateur.

# Sprint 1 — Restauration containers principaux Lieutenants

> **Contexte** : audit utilisateur du 2026-05-03 a identifié 14 frictions dans le workflow Moteur. Ce sprint adresse les frictions **#13** (chargement DB pollue panel IA), **#6** (chargement DB inégal entre onglets) et **#14** (`lieutenants-header` inutile).
>
> **Cause racine identifiée** : Sprint C-1 (commit `890b285`, 2026-05-02) a unifié les panels IA et a, ce faisant, **absorbé les containers principaux Lieutenants** (`LieutenantProposals` + `LieutenantH2Structure`) dans le wrapper visuel `LieutenantsAiPanel`. Les tests existants n'ont pas attrapé la régression parce qu'ils sont **comportementaux** (le store contient bien les données, l'event est bien émis) et pas **architecturaux** (les cards Lieutenants vivent-elles dans la bonne section sémantique ?).

## 1. Acceptance Criteria

### AC1 — Containers principaux Lieutenants restaurés en sections distinctes

`src/components/moteur/LieutenantsSelection.vue` doit afficher **trois sections visuelles distinctes** :

- **Section "Propositions Lieutenants"** (container principal #1) — sans coque purple "IA". Affiche `LieutenantProposals` (cards + éliminés) avec son propre header. C'est l'endroit où l'utilisateur sélectionne ses Lieutenants.
- **Section "Structure Hn"** (container principal #2) — sans coque purple "IA". Affiche `LieutenantH2Structure`. C'est l'endroit où l'utilisateur valide la structure.
- **Section "Suggestions IA"** (panel IA pur) — coque purple. Contient UNIQUEMENT les éléments IA-spécifiques : chunk streaming brut, CTA "Régénérer", erreurs, content-gap insights. **Aucune card Lieutenant ni Hn dedans.**

**Test architectural anti-régression** : `[data-testid="lieutenants-container"]` ne doit JAMAIS être descendant DOM de `[data-testid="ai-panel-suggestion"]`. Idem pour `[data-testid="lieutenant-h2-structure"]`.

### AC2 — `lieutenants-header` supprimé

Le bloc `<div class="lieutenants-header">` ([LieutenantsSelection.vue:730-740](../../src/components/moteur/LieutenantsSelection.vue#L730)) doit être supprimé. Justification (cartographie 1.bis) : ne porte qu'un rappel Capitaine (pense-bête redondant avec le Capitaine déjà visible dans `MoteurContextRecap`) + un badge level article.

Migration du badge level : intégré dans le header de la nouvelle section Propositions (sous-titre).

### AC3 — Auto-load DB sur Radar au mount + changement d'article

À l'arrivée sur l'onglet Radar (mount initial OU changement d'article), si `dbCount > 0` (cache DB des cartes Radar non vide), le merger `mergeFromRadarSource(articleId)` est appelé automatiquement et peuple le container principal de cards Radar.

**Pas de double-load** : si l'auto-load réussit, le `TabLoadPrompt` ne propose que le bouton "Charger Cache" (et plus "Charger DB"), ou se masque entièrement si Cache est vide aussi.

**Idempotence** : un changement d'onglet rapide (Radar → Capitaine → Radar) ne doit pas relancer un load si la dernière hydratation pour cet article est encore valide en mémoire.

### AC4 — Auto-load préservé sur Capitaine et Lexique

L'auto-load existant sur Capitaine ([MoteurView.vue:389](../../src/views/MoteurView.vue#L389) `fetchKeywordsMerge`) et Lexique ([LexiqueExtraction.vue:362](../../src/components/moteur/LexiqueExtraction.vue#L362) `hydrateFromDb`) reste fonctionnel. Pas de régression.

### AC5 — TabLoadPrompt reste utilisable comme filet manuel

Après auto-load, l'utilisateur doit toujours pouvoir cliquer "Charger DB" / "Charger Cache" via `TabLoadPrompt` pour forcer un re-merge (ex: après modification externe). Le composable `useTabLoadPrompt` reste inchangé dans son contrat public.

### AC6 — Aucune régression sur les 4 onglets éligibles

`npm run test:unit && npm run test:browser && npm run lint && npm run type-check` tous verts.

## 2. Hors-scope (autres sprints)

- Friction #5 + #12 (panels IA collapse par défaut) — **sprint 3**
- Friction #11 (chevron PAA vs sidebar) — **sprint 3**
- Friction #10 (Pertinence ne s'affiche pas + recalcul manuel) — **sprint 2**
- Frictions #1 à #4 (cache-bar + recap-toggle + computeSmartTab) — **sprint 4**
- Frictions #7 #8 (`scanner-inputs`, `radar-ai-score-pill`) — **sprint 5**

## 3. Approche technique

### 3.1 Refonte `LieutenantsAiPanel.vue`

**Avant (problème)** :
```
LieutenantsAiPanel
├── tab Propositions → LieutenantProposals  ← container principal #1 AVALÉ
└── tab Structure Hn → LieutenantH2Structure ← container principal #2 AVALÉ
```

**Après (cible)** :
```
LieutenantsAiPanel  (purement IA — coque purple conservée)
├── streaming chunk
├── CTA "Régénérer"
├── erreur
└── content-gap insights
```

Et dans `LieutenantsSelection.vue`, restauration de 3 sections de premier niveau :

```vue
<section class="lieutenant-proposals-container" data-testid="lieutenants-container">
  <LieutenantProposals ... />
</section>

<section class="lieutenant-hn-container" data-testid="lieutenant-h2-structure">
  <LieutenantH2Structure ... />
</section>

<LieutenantsAiPanel data-testid="ai-panel-suggestion" />  <!-- inchangé en data-testid -->
```

### 3.2 Auto-load Radar

Dans `DouleurIntentScanner.vue`, ajouter un hook au mount + watcher sur `articleId` qui :
1. lit le `dbCount` correspondant via `tabCacheEntries` (fourni en prop par `MoteurView` ou via composable dédié)
2. si `dbCount > 0`, appelle `mergeFromRadarSource(articleId)` (déjà exposé via `defineExpose`)

**Alternative architecturale** : centraliser dans `MoteurView` un `watchEffect` qui orchestre l'auto-load par onglet visité avec dispatch sur les refs `radarRef.value.mergeFromRadarSource(...)`. Cette option garde la logique cross-onglet au même endroit (MoteurView est déjà l'orchestrateur).

→ **Décision** : centraliser dans `MoteurView` pour cohérence avec la logique TabLoadPrompt déjà présente.

### 3.3 Suppression `lieutenants-header`

Supprimer le bloc DOM + les styles CSS associés ([LieutenantsSelection.vue:867-897](../../src/components/moteur/LieutenantsSelection.vue#L867)). Le badge level (`level-badge` purple) migre comme sous-titre du nouveau header de section Propositions.

## 4. Tests à écrire (TDD Red puis Green)

### 4.1 Tests architecturaux (anti-régression Sprint C-1)

**Fichier** : `tests/unit/components/lieutenants-selection-architecture.test.ts` (nouveau)

- ✅ `lieutenants-container` n'est PAS descendant de `ai-panel-suggestion`
- ✅ `lieutenant-h2-structure` n'est PAS descendant de `ai-panel-suggestion`
- ✅ `LieutenantProposals` est rendu en section de premier niveau dans `LieutenantsSelection`
- ✅ `lieutenants-header` (legacy) n'existe plus dans le DOM rendu
- ✅ Le badge level (level-badge) reste affiché quelque part dans le DOM (regression check)

### 4.2 Tests auto-load Radar

**Fichier** : `tests/unit/components/douleur-intent-scanner-autoload.test.ts` (nouveau)

- ✅ Au mount avec `dbCount > 0`, `mergeFromRadarSource(articleId)` est appelé une fois
- ✅ Au changement d'`articleId`, `mergeFromRadarSource(newId)` est appelé une fois
- ✅ Avec `dbCount === 0`, aucun appel `mergeFromRadarSource` au mount
- ✅ Idempotence : 2 mounts successifs avec même articleId → 2 appels (le composant est neuf, idempotence garantie par le merger côté store, pas par le composant)

### 4.3 Tests fonctionnels existants à vérifier

- `tests/unit/components/lieutenants-selection.test.ts` : adapter les sélecteurs si nécessaire (suppression du tab interne `lieutenants-tab-proposals` / `lieutenants-tab-hn`)
- `tests/unit/components/lieutenants-selection.gaps.test.ts` : vérifier que les stubs `LieutenantProposals` / `LieutenantH2Structure` sont toujours résolus (ils étaient déjà stubs séparés dans les tests existants → faible impact)
- Mon test P1 `tests/unit/components/lieutenants-selection-isolation.test.ts` : doit continuer de passer (4/4)

### 4.4 Test E2E Playwright

**Fichier** : `tests/browser-e2e/moteur-lieutenants-architecture.browser.test.ts` (nouveau, léger)

- ✅ Au chargement de l'onglet Lieutenants sur un article avec lieutenants en DB, `[data-testid="lieutenants-container"]` est visible et n'est pas dans `[data-testid="ai-panel-suggestion"]`.

## 5. Plan d'exécution (ordre)

1. Écrire les tests Red (4.1 + 4.2) → ils doivent ÉCHOUER aujourd'hui (preuve qu'ils détectent bien la régression).
2. Refactor `LieutenantsAiPanel.vue` : retirer les tabs Propositions / Structure Hn, ne garder que la coque IA pure.
3. Refactor `LieutenantsSelection.vue` : sortir `LieutenantProposals` et `LieutenantH2Structure` en sections de premier niveau, supprimer `lieutenants-header`.
4. Ajouter auto-load Radar dans `MoteurView.vue` (watch activeTab/articleId).
5. Faire passer les tests existants impactés.
6. Self-review (CLAUDE.md §5.1 + §5.2).
7. Validation : `npm run lint && npm run type-check && npm run test:unit && npm run test:browser && npm run check:dead && npm run check:cycles`.
8. Maj doc : ajouter une note dans `docs/ui-sections-guide.md` §3 Lieutenants pour clarifier la séparation des 3 sections + maj `docs/moteur-data-flow.md` §5.

## 6. Risques

- **Tests existants modifiés par C-1** : Sprint C-1 a adapté `lieutenants-selection.test.ts` pour traverser les tabs internes du wrapper. La refonte va casser ces sélecteurs → adaptation nécessaire (faible risque, sélecteurs simples).
- **Régression visuelle** : la coque purple "Suggestions IA" disparaît autour des cards. C'est l'effet voulu, mais à valider visuellement avant push.
- **Charge auto-load Radar** : ne pas auto-load si l'utilisateur n'a jamais visité l'onglet (économise du compute). Vérifier que `tabCacheEntries[radar].dbCount` est bien la bonne source de vérité.

## 7. Done = ?

- [ ] AC1 à AC6 tous verts.
- [ ] Aucun test rouge dans `npm run test:unit` ni `npm run test:browser`.
- [ ] `npm run lint` et `npm run type-check` propres.
- [ ] `docs/ui-sections-guide.md` §3 et `docs/moteur-data-flow.md` §5 mis à jour.
- [ ] `_bmad-output/implementation-artifacts/sprint-status.yaml` mis à jour : `sprint-1-lieutenants-container-restoration: done`.
- [ ] Commit + push.
- [ ] Cette tech-spec archivée dans `_archive/` avec bandeau ARCHIVED.
