## Contexte de l'article

- **Titre** : {{articleTitle}}
- **Type d'article** : {{articleType}}
- **Mot-clé pilier** : {{keyword}}
- **Mots-clés secondaires** : {{secondaryKeywords}}
- **Cocon sémantique** : {{cocoonName}}
- **Thématique** : {{theme}}

{{strategyContext}}

{{keywordContext}}

## Sommaire validé

{{outline}}

## Consignes de génération

Rédige l'article complet en suivant EXACTEMENT le sommaire ci-dessus. Pour chaque section :

1. **Respecte la hiérarchie** : Chaque `H2` et `H3` du sommaire doit être présent dans l'article, dans l'ordre exact.

2. **Answer capsules** : Après chaque `<h2>`, ajoute immédiatement un `<blockquote>` de 20-25 mots qui résume le point clé de la section. Ce bloc doit être auto-suffisant pour les moteurs IA.

3. **Intégration des mots-clés** :
   - Place le mot-clé pilier « {{keyword}} » dans l'introduction, au moins 2 H2, et la conclusion.
   - Répartis les mots-clés secondaires ({{secondaryKeywords}}) naturellement dans le texte.
   - L'intégration doit être indétectable à la lecture.

4. **Statistiques sourcées** : Inclus au minimum 3 statistiques vérifiables avec leur source (ex: « selon Forrester, 2024 »).

5. **Exemples concrets** : Pour chaque concept clé, illustre avec le pattern grandes marques → PME.

6. **Titres en questions** : Formule les H2/H3 sous forme de questions quand pertinent.

7. **Longueur des paragraphes** : Maximum 3 lignes par paragraphe. Privilégie les phrases courtes.

8. **Blocs Propulsite** :
   - Si une section a l'annotation `content-valeur`, génère un bloc pédagogique d'introduction.
   - Si une section a l'annotation `content-reminder`, génère un bloc de rappel avec les points clés.
   - Si une section a l'annotation `answer-capsule`, génère une réponse synthétique optimisée.

9. **Conclusion** : Termine par une conclusion actionnable avec des étapes concrètes que le lecteur peut appliquer.

10. **Longueur cible** : Si un nombre de mots cible est specifie dans le micro-contexte, vise ce nombre (±20%). Ne dilue pas pour atteindre le compte, et ne coupe pas court si le contenu le justifie.

## Format de sortie

Génère le contenu en HTML structuré. N'inclus PAS de balise `<h1>` (le H1 est géré séparément). Commence directement par le contenu de l'introduction.

Structure attendue :

```html
<p>Introduction de l'article...</p>

<h2>Titre de la première section</h2>
<blockquote>Answer capsule de 20-25 mots résumant le point clé.</blockquote>
<p>Contenu de la section...</p>

<h3>Sous-section</h3>
<p>Contenu détaillé...</p>
```

NE génère PAS de meta title ni meta description dans ce contenu — ils seront générés séparément.
