---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Finalisation

Un seul composant en lecture seule, qui lit deux stores et reprend la règle pure des quatre verrous.

## Récapitulatif
*Exigences : FR-FIN-RECAP, FR-FIN-CHECK · Design : DESIGN-FIN-RECAP, DESIGN-FIN-CHECK*

- **Code :** [`src/components/moteur/FinalisationPanel.vue`](../src/components/moteur/FinalisationPanel.vue) — `captain` (`richCaptain.keyword || capitaine || '—'`), `lieutenants` (`richLieutenants` au statut `locked`, niveau = `suggestedHnLevel`), `structure` (`structureHeadings(hnStructure)`, [`shared/verifiers/structure.ts`](../shared/verifiers/structure.ts)), `lexique`, `checks`, `ready`, `ctaTitle`. [`src/components/shared/CollapsableSection.vue`](../src/components/shared/CollapsableSection.vue) (`default-open`).
- **Données :** `useArticleKeywordsStore.keywords` (déjà hydraté par la sélection d'article) ; `useArticleProgressStore` pour les verrous.
- **API :** aucune.
- **Règles et décisions :** pas de lecture propre pour ne pas diverger des autres onglets ; aucun `check-completed` ni `check-removed` émis. Pas de repli sur la liste plate des lieutenants.
- **Tests :** [`tests/unit/components/finalisation-panel.test.ts`](../tests/unit/components/finalisation-panel.test.ts).

## Transition vers la Rédaction
*Exigences : FR-FIN-LINK-REDACTION · Design : DESIGN-FIN-LINK-REDACTION*

- **Code :** `FinalisationPanel.vue` émet `navigate-redaction` ; `MoteurView.vue` — `navigateToRedaction` : `router.push('/cocoon/:cocoonId/redaction?articleId=:id')` (sans `articleId` si aucun article) ; `cta-redaction` avec `:disabled="!finalisationUnlocked"` et `:title="finalisationButtonTitle"`.
- **Règles et décisions :** deux entrées, une règle (`isFinalisationUnlocked`). La navigation n'écrit rien : l'état « prêt » reste porté par `articles.completed_checks`.
- **Tests :** [`tests/browser-e2e/finalisation-gate.browser.test.ts`](../tests/browser-e2e/finalisation-gate.browser.test.ts).
