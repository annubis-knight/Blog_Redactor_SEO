---
name: {{NOM}}
description: {{DESCRIPTION — une phrase : quelle donnée, où elle vit, qui s'en sert}}
type: "{{TYPE — colonne(s) et type en base ; type TypeScript côté écran}}"
last_updated: {{AAAA-MM-JJ}}
related_fr: [{{FR-… et NFR-… existants dans spec/requirements.md — n'en inventez pas}}]
---

# Data Flow — {{NOM}}

> **En clair :** {{la donnée en deux ou trois phrases, avec un exemple concret, sans jargon}}
>
> **Type/format :** {{colonnes, types, valeurs possibles ; ce que vaut une absence}}
>
> **Chapitres :** {{liens vers les chapitres de design/ qui décrivent le domaine ; cette fiche n'en recopie pas le détail}}

## Producteurs

{{Qui crée ou modifie la donnée, jusqu'à la base : écran (composant, store, composable) → route → service → table. Un tableau « route | fonction | effet » si plusieurs chemins écrivent. N'oubliez pas les scripts (mode automatique, rattrapages) ni les écritures faites par le serveur sans l'écran.}}

## Persistance

{{Où vit la donnée entre deux sessions (table, colonnes, contraintes), et chaque copie qu'en gardent les stores : qui la remplit, quand elle est relue, ce qui l'invalide. Dire ce qui n'est lu par personne.}}

## Consommateurs

### Affichage (UI)

{{Composants qui la montrent, et comment une absence s'affiche (« — », badge, message).}}

### Calcul / tri / filtre / agrégat

{{Tout ce qui décide avec elle : verrous, tris, moyennes, portes, consignes de l'IA, scripts.}}

## Règles de cohérence

> Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de repli différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout (en bas du tri, hors de la moyenne).

{{Les règles propres à cette donnée : quelle expression unique, quelle source unique, ce que vaut une absence.}}

## Cas d'usage à risque

| Cas | Lecture | Écriture | Risque |
|---|---|---|---|
| {{premier chargement, rechargement, changement d'article, deux onglets, écriture refusée, donnée absente…}} | | | {{couvert (par quoi) ou non (conséquence)}} |

## Limites connues

{{Écarts actuels entre le code et une exigence ou une règle de cohérence : l'état d'aujourd'hui, sans historique. Citez l'exigence non tenue.}}

## Tests de cohérence

{{Les tests de `tests/unit/coherence/` qui gardent cette donnée, et ce qu'ils vérifient réellement (un test qui recopie la logique sans importer le code ne garde rien : dites-le). Puis les autres tests utiles, et ce qui reste à écrire. Préfixez chaque `describe()` par l'identifiant de l'exigence.}}

---

*Fiche de la discipline des flux de données. Méthode et index : [README](./README.md).*
