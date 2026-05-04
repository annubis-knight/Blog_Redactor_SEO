---
name: {{NOM}}
description: {{DESCRIPTION}}
type: {{TYPE}}
last_updated: {{LAST_UPDATED}}
related_fr: [{{RELATED_FR}}]
---

# Data Flow — {{NOM}}

> **Description métier :** {{DESCRIPTION}}
> **Type/format :** `{{TYPE}}`

## Producteurs

Qui crée ou met à jour cette donnée :

{{PRODUCTEURS}}

## Persistance

{{PERSISTANCE}}

## Consommateurs

### Affichage (UI)

{{CONSOMMATEURS_AFFICHAGE}}

### Calcul / tri / filtre / agrégat

{{CONSOMMATEURS_CALCUL}}

> **Règle de cohérence affichage / calcul** — Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout (item placé en bas du tri, exclu de la moyenne).

## Cas d'usage à risque

{{CAS_USAGE}}

## Diagramme

```mermaid
{{MERMAID}}
```

## Régressions historiques

{{REGRESSIONS}}

## Tests de cohérence à écrire

{{TESTS_SUGGEREES}}

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
