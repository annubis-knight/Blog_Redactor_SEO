# tests/

**Guide complet** : [../docs/testing-guide.md](../docs/testing-guide.md)

## Structure rapide

| Dossier | Quoi | Quand écrire ici |
|---------|------|------------------|
| `unit/` | Unités pures (pas de réseau, pas de DB) | Fonction utilitaire, helper, calcul |
| `functional/` | Logique métier sans I/O | Règle produit (smart-nav, verdict) |
| `contract-api/` | 1 endpoint HTTP isolé | Nouvel endpoint → shape + erreurs |
| `integration-tabs/` | 1 onglet UI de bout en bout | Nouvelle fonctionnalité dans un onglet |
| `e2e-workflows/` | **Parcours utilisateur complets** | Parcours qui traverse plusieurs onglets |
| `browser-e2e/` | Playwright (DOM + navigation) | Comportement qui n'existe qu'en navigateur |
| `helpers/` | `setupTestContext()` + API client + DB fixtures | — (ne pas modifier sans précaution) |

## Lancer

```bash
# Pré-requis : serveur dev up (AI_PROVIDER=mock recommandé)
npm run dev:server           # pour tout sauf browser-e2e
npm run dev:client           # aussi pour browser-e2e

# Dans un autre terminal :
npm run test:unit            # vitest (unit + functional + contract + integration + e2e)
npm run test:browser         # playwright (browser-e2e)
```

## Philosophie

**Les tests priorisent le parcours utilisateur réel, pas la couverture de code.**

Les 2 parcours à garantir en priorité :
- **Parcours A** : créer un article de A à Z (Cerveau → Moteur → Rédaction)
- **Parcours B** : revenir sur un article en cours + hydrater l'état exact

Voir [testing-guide.md §3.4](../docs/testing-guide.md#34-les-parcours-représentatifs-à-toujours-garder-verts) pour les 8 scénarios P0 obligatoires.
