---
name: Sprint 10.5 — Nettoyage legacy painPoint
version: 1.0.0
last_updated: 2026-05-06
status: in-progress
branch: chore/sprint-10.5-cleanup-painpoint-legacy
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - docs/pain-point-editorial-backbone.md
  - docs/data-flows/relevance-score-live-computation.md
  - docs/data-flows/score-capitaine.md
  - docs/data-flows/lexique.md
  - docs/data-flows/strategy-context.md
---

# Tech-Spec — Sprint 10.5 : Nettoyage legacy painPoint

## 1. Contexte

Le commit `5b849df` (Sprint 8 du Chantier A) a introduit un watcher dans `CaptainValidation.vue` qui détecte les changements de `painPoint` et déclenche un recompute du Score Pertinence. Le commit `e13a330` (Sprint 6 du Chantier A) a introduit le store dédié `captain-relevance.store.ts` pour gérer ce mécanisme.

**Décision produit (2026-05-06)** : le `painPoint` est désormais considéré comme **figé après la sortie du Cerveau**. Toute la logique de détection de changement devient legacy.

> Citation utilisateur : *« Le pain point ne doit pas changer à partir du moment où l'utilisateur est dans le workflow Moteur ou Rédaction. Il n'y a que à la fin du Cerveau qu'on peut changer le pain point. Et encore, l'utilisateur ne va pas retourner dans Cerveau à partir du moment où il a validé les mots-clés. »*

## 2. Cartographie de la donnée `painPoint` (Phase 1.bis CLAUDE.md §2.0)

### Producteurs

| Producteur | Action | Quand |
|-----------|--------|-------|
| Cerveau — création article | Insertion `articles.pain_point` | Lors de la création d'article via `cocoon-articles.md`, `cocoon-articles-spe.md`, `cocoon-add-article.md` |
| Cerveau — édition manuelle | UPDATE `articles.pain_point` | Dropdown radio `painIntentExpected` dans `ProposedArticleRow.vue` (concerne `painIntentExpected`, pas `painPoint` lui-même) |

**Aucun producteur dans Moteur / Rédaction** — confirmé par grep.

### Consommateurs

| Consommateur | Usage | Lecture |
|--------------|-------|---------|
| Capitaine — calcul Pertinence backend | Live (à chaque hydratation onglet) | `captain-relevance.service.ts` |
| Capitaine — affichage RadarKeywordCard | Score Pertinence affiché | `RadarKeywordCard.vue` |
| Lieutenants — prompts IA | Injection `{{painPoint}}` | `propose-lieutenants.md`, `lieutenants-hn-structure.md` |
| Lexique — prompts IA + tri Jaccard | Injection + alignement | `lexique-suggest.md`, `lexique-ai-panel.md`, `LexiqueExtraction.vue` (sortByPainAlignmentJaccard) |
| Radar — scan + scoring | Injection prompt + KPI | `radar-long-tail-suggest.md`, `useResonanceScore.ts` |

### Persistance

- **Source unique** : `articles.pain_point` (TEXT, nullable) — table PostgreSQL
- **Pas de cache** front spécifique au painPoint
- **Pas de localStorage**

### Cas d'usage

| Cas | Comportement attendu après Sprint 10.5 |
|-----|----------------------------------------|
| Premier load article | Lecture `articles.pain_point` → injection dans calculs/prompts |
| Reload (F5) sur Capitaine | Idem premier load |
| Switch d'onglet dans Moteur | Pas de re-fetch, le painPoint ne peut pas avoir changé |
| Switch d'article | Reset des stores, lecture du nouveau `pain_point` |
| Modification depuis Cerveau (cas rare) | Cerveau est sorti → si l'utilisateur revient au Capitaine, le scoring sera recalculé au prochain mount. **Pas de watcher live**. |

## 3. Périmètre du nettoyage

### À supprimer

#### Code de production
- `src/stores/article/captain-relevance.store.ts` — **fichier entier** (121 lignes)
- `src/components/moteur/CaptainValidation.vue` lignes 14, 56, 478, 508-547 — import + instanciation + reset + watcher Sprint 8 (~50 lignes)

#### Tests
- Tests qui valident le watcher painPoint et le store recompute :
  - `tests/unit/components/captain-validation-architecture.test.ts` — vérifier les sections concernées (suppression sélective ou globale)
  - `tests/unit/components/radar-card-lockable-recompute.test.ts` — fichier entier si dédié au recompute manuel

#### Documentation
- À mettre à jour (corriger les phrases qui décrivent painPoint comme mutable) :
  - `docs/pain-point-editorial-backbone.md` ligne 41 : *« Modifiable à tout moment »* → *« Figé après validation Cerveau »*
  - `docs/data-flows/relevance-score-live-computation.md` lignes 34, 547 : retirer mention `painPoint peut changer`
  - `docs/data-flows/score-capitaine.md` ligne 67 : retirer le risque mentionné
  - `docs/data-flows/lexique.md` lignes 71, 148, 162 : retirer le « risque CRITIQUE » et le test placeholder
  - `docs/data-flows/strategy-context.md` ligne 94, 96 : retirer la mention du risque de changement

### À conserver

- `articleKeywordsStore.mergeCaptainHistory()` — utilisée par l'hydratation initiale (ligne 75 du store), pas seulement par le watcher supprimé
- Toute la propagation `painPoint` dans les signatures (`carousel.addEntry(..., painPoint)`, `validateKeyword(..., painPoint, ...)`) — le painPoint reste **lu** au moment des calculs, juste plus surveillé pour détection de changement
- `captain-relevance.service.ts` (backend) — calcul live indépendant du watcher
- Les FRs `FR-CAP-RELEVANCE-COMPUTED-LIVE`, `FR-CAP-RELEVANCE-NO-DB-WRITE`, etc. — toujours valides

## 4. Exigences fonctionnelles (FRs)

### Nouvelles FRs

- **FR-PAIN-IMMUTABLE-AFTER-CEREVEAU** : Le `painPoint` d'un article ne peut être modifié qu'à partir de l'interface Cerveau. Aucun composant Moteur ou Rédaction ne déclenche de mutation du painPoint.
- **FR-CAP-NO-PAINPOINT-WATCHER** : Le composant `CaptainValidation.vue` ne surveille pas les changements de `painPoint`. Le calcul du Score Pertinence est figé pour la durée d'une session sur l'onglet Capitaine.
- **FR-CAP-RELEVANCE-STORE-REMOVED** : Le store `captain-relevance.store.ts` est supprimé. Sa responsabilité (recompute Pertinence) est entièrement assumée par le calcul live au montage de l'onglet via `article-keywords.store.fetchKeywords()` qui appelle `getCaptainExplorations` côté backend.

### FRs invalidées (à retirer du PRD si présentes)

- Toute FR qui mentionnait explicitement le recompute Pertinence sur changement painPoint en runtime (à vérifier dans le PRD)

## 5. Critères d'acceptation (ACs testables)

1. **AC-1** : Modifier `articles.pain_point` en DB pendant que l'utilisateur est sur l'onglet Capitaine ne déclenche **aucun** appel HTTP `/captain-explorations` ni recompute frontend.
2. **AC-2** : Le fichier `src/stores/article/captain-relevance.store.ts` n'existe plus dans le repo.
3. **AC-3** : Aucun import de `useCaptainRelevanceStore` ne subsiste dans `src/`.
4. **AC-4** : `npm run lint` est vert.
5. **AC-5** : `npm run type-check` est vert.
6. **AC-6** : `npm run test:unit` est vert (les tests obsolètes sont supprimés, pas désactivés).
7. **AC-7** : `npm run check:dead` ne signale pas de nouveau code mort introduit par cette suppression.
8. **AC-8** : Le PRD mentionne explicitement que le `painPoint` est figé après le Cerveau.
9. **AC-9** : Au moins un test de régression existe : « modifier `selectedArticle.painPoint` pendant que CaptainValidation est monté ne déclenche aucun fetch ».

## 6. Plan d'implémentation (TDD)

### Phase RED
1. Créer `tests/unit/components/captain-validation-painpoint-frozen.test.ts` qui :
   - Mount CaptainValidation avec un selectedArticle
   - Modifie `selectedArticle.painPoint` via prop reactive
   - Vérifie qu'aucun appel `/captain-explorations` n'est fait (mock `apiGet`)

### Phase GREEN
2. Supprimer le watcher Sprint 8 dans CaptainValidation.vue (lignes 508-547)
3. Supprimer l'import + instanciation + reset (lignes 14, 56, 478)
4. Supprimer le fichier `src/stores/article/captain-relevance.store.ts`
5. Supprimer ou nettoyer les tests obsolètes

### Phase REFACTOR
6. Vérifier qu'aucun export mort n'apparaît (`npm run check:dead`)
7. Vérifier les cycles d'import (`npm run check:cycles`)

### Phase VALIDATION
8. `npm run check:health` (lint + type-check + cycles + dead + arch)
9. `npm run test:unit` complet
10. Visuel : démarrer le serveur dev et vérifier que l'onglet Capitaine charge correctement avec un article ayant un painPoint défini

### Phase MAJ DOC
11. Mettre à jour le PRD (ajouter FR-PAIN-IMMUTABLE-AFTER-CEREVEAU, etc.)
12. Mettre à jour les 5 docs `docs/data-flows/` concernées
13. Mettre à jour `sprint-status.yaml`
14. Ajouter règle CLAUDE.md §11.1 « Format de réponse analytique »

## 7. Risques et mitigation

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Un test existant repose sur le watcher → cassé après suppression | Moyenne | Ajuster les tests (objectif inversé : tester l'absence de watcher) |
| Le store `captain-relevance` a un usage caché ailleurs | Très faible | Vérifié par grep — un seul consommateur (CaptainValidation.vue) |
| `mergeCaptainHistory` deviendrait sans usage | Très faible | Vérifié — encore utilisée à la ligne 75 du store article-keywords pour l'hydratation initiale |
| Régression scoring Pertinence (calcul live) | Très faible | Le service backend `captain-relevance.service.ts` n'est pas touché |
| Doc figée 2026-05-05 contredite par le code | Faible | Mettre à jour la doc dans le même sprint |

## 8. Out of scope

- **Pas dans ce sprint** : alignement TTL Capitaine ↔ Lieutenants (Sprint 11+)
- **Pas dans ce sprint** : renommage variables/fonctions de "validation" vers "scan" (Sprint 12)
- **Pas dans ce sprint** : suppression des boutons "Valider" (Sprint 11)
