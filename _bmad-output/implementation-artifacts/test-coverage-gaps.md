---
title: 'Couverture de tests composants — gaps et roadmap'
slug: 'test-coverage-gaps'
created: '2026-05-01'
status: 'in-progress'
---

# Couverture tests composants — gaps et roadmap

## Contexte

Audit demandé par l'utilisateur : *« tous les composants macro ou micro devraient avoir des tests sur les fonctionnalités qu'ils embarquent »*.

**Volumétrie projet** :
- 158 composants Vue dans `src/components/`
- 15 vues dans `src/views/`
- 169 fichiers de tests unitaires existants
- 61 fichiers de tests composants existants

**Approche retenue** : audit ciblé pour identifier les vrais gaps (composants user-facing critiques sans test), pas une couverture exhaustive à 158/158.

---

## ✅ Sprint actuel — 5 composants prioritaires couverts

| Composant | Workflow | Tests | Fichier |
|---|---|---|---|
| [BasketStrip.vue](../../src/components/moteur/BasketStrip.vue) | Moteur (panier keywords) | 9 | [basket-strip.test.ts](../../tests/unit/components/basket-strip.test.ts) |
| [FinalisationRecap.vue](../../src/components/moteur/FinalisationRecap.vue) | Moteur (gate Rédaction) | 11 | [finalisation-recap.test.ts](../../tests/unit/components/finalisation-recap.test.ts) |
| [SelectedArticlePanel.vue](../../src/components/moteur/SelectedArticlePanel.vue) | Moteur (édition titre + progress) | 12 | [selected-article-panel.test.ts](../../tests/unit/components/selected-article-panel.test.ts) |
| [ArticleList.vue](../../src/components/dashboard/ArticleList.vue) | Rédaction (3 colonnes) | 8 | [article-list.test.ts](../../tests/unit/components/article-list.test.ts) |
| [OrphanDetector.vue](../../src/components/linking/OrphanDetector.vue) | Linking (SEO orphelins) | 7 | [orphan-detector.test.ts](../../tests/unit/components/orphan-detector.test.ts) |

**Total nouveau** : **47 tests** ajoutés. Tous mockés (zéro crédit API).

Combinés avec les tests anti-régression de la session précédente (CaptainSidePanel + TabCachePanel + useResizablePanel) → **82 tests** sur les composants Capitaine/Moteur dans cette série.

---

## 🟡 Gaps restants — Priorité MOYENNE (à traiter prochaine session)

### Composants

| Composant | Workflow | Effort estimé | Justification |
|---|---|---|---|
| [LinkingMatrix.vue](../../src/components/linking/LinkingMatrix.vue) | Linking | 3h | 241 lignes, logique matrice + cache, page LinkingMatrixView |
| [WorkflowChoice.vue](../../src/components/dashboard/WorkflowChoice.vue) | Navigation | 1h | 3 cartes Cerveau/Moteur/Rédaction, hub central, mais très presentational |
| [AddArticleMenu.vue](../../src/components/production/AddArticleMenu.vue) | Production | 1.5h | Menu 3 modes + positioning dynamique, logique complexe |
| [TopicSuggestions.vue](../../src/components/production/TopicSuggestions.vue) | Production | 1h | Affichage suggestions topics, logique déléguée au composable |

### Composables

| Composable | Loc | Effort | Justification |
|---|---|---|---|
| [useKeywordDiscoveryTab.ts](../../src/composables/keyword/useKeywordDiscoveryTab.ts) | 512 | 4h | Core onglet Discovery, logique filtre/sort/cache complexe |
| [useArticleProposals.ts](../../src/composables/editor/useArticleProposals.ts) | 985 | 8h | Logique brainstorm articles, **985 lignes**, nombreux paths |
| [usePainValidation.ts](../../src/composables/intent/usePainValidation.ts) | ? | 3h | 4 sources checks (social/search/intent/local), agrégation |
| [useMultiSourceVerdict.ts](../../src/composables/intent/useMultiSourceVerdict.ts) | 419 | 3h | Verdict agrégé multi-sources, logique scoring |
| [useResonanceScore.ts](../../src/composables/keyword/useResonanceScore.ts) | 407 | 3h | Cache + scoring, utilisé par DouleurIntentScanner |

**Effort total restant** : ~28h pour la couverture MOYENNE complète.

---

## ⚫ Gaps Priorité BASSE — peuvent attendre

Composants principalement presentational (peu de logique) ou rarement utilisés :
- Composants UI atomiques (Breadcrumb, LoadingSpinner, ScoreGauge, etc.) — testés indirectement par les composants parents
- Composants Cerveau historiques (TopicSuggestions, etc.) — refactor probable à venir
- Composants legacy mentionnés dans les archives BMAD

---

## Stratégie de test recommandée

### Ce qui doit être testé en priorité

1. **Composants avec interactions utilisateur fréquentes** (clics, inputs, drag) → tests unitaires de comportement
2. **Composants avec logique computed complexe** (filtrage, tri, agrégation) → tests sur les outputs
3. **Composants avec appels API** (PATCH, POST) → tests avec API mockée + vérification des emits
4. **Composants émettant des events** (lock, close, navigate, etc.) → tests d'émission
5. **Composables avec algorithme métier** (scoring, validation, cache) → extraction en fonction pure si possible

### Patterns à éviter

❌ Tester les styles CSS (sauf si critique pour la sémantique : couleur verdict, état locked visuel)
❌ Tester les transitions / animations
❌ Tester les routes Vue Router (couvert par e2e)
❌ Tester les store mutations triviales (déjà testées par les composables qui les consomment)

### Pattern à privilégier : extraction en utilitaire pur

Quand un composant a une logique complexe difficile à tester (Pinia + Router + plein de stores), **extraire en utilitaire pur** dans `src/utils/`. Exemple : `buildTabCacheEntries` extrait de MoteurView. Permet 100 % de couverture sans mount complet.

---

## Métriques globales

- **Tests unitaires totaux** : 169 fichiers
- **Tests composants** : 61 fichiers (initial) + 5 (cette session) = **66 fichiers**
- **Couverture user-facing critique** : 13/13 composants Moteur principaux ✅, 5/5 nouveaux composants prioritaires ✅
- **Crédits API consommés pour les tests** : 0 (tous mocks)

## Voir aussi

- [docs/captain-ui-improvements.md](../../docs/captain-ui-improvements.md) — Améliorations Capitaine + tests anti-régression
- [tests/unit/components/](../../tests/unit/components/) — Index des tests composants
