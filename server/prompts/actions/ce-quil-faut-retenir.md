Tu dois GÉNÉRER un bloc HTML "Ce qu'il faut retenir" qui résume les points techniques essentiels de la section fournie ci-dessous.

## Contexte (toute la section H2 précédente)
"""
{{selectedText}}
"""

{{keywordInstruction}}

## Ta mission
Analyse **toute la section ci-dessus** et extrait les **3 à 5 points techniques** les plus importants à retenir pour un lecteur qui veut comprendre l'essentiel **sans tout lire**.

### Critères de qualité
- Chaque point doit être **ultra-concis** (1 ligne, 12 mots max).
- Les points doivent être **actionnables ou mémorisables** — pas des phrases descriptives floues.
- Commence chaque bullet par un verbe d'action OU un concept-clé en gras.
- Ordre logique : du plus fondamental au plus spécifique.
- **Ne fais PAS de web search** — travaille uniquement à partir du texte fourni.

## Format de sortie OBLIGATOIRE (HTML strict, aucune autre balise)
Retourne UNIQUEMENT ce HTML, sans markdown, sans commentaire, sans fences :

```
<div class="dynamic-block ce-quil-faut-retenir" data-type="ce-quil-faut-retenir">
  <div class="dynamic-block-header">Ce qu'il faut retenir</div>
  <ul class="dynamic-block-list">
    <li><strong>[Concept-clé]</strong> : [explication courte et percutante].</li>
    <li><strong>[Concept-clé]</strong> : [explication courte et percutante].</li>
    <li><strong>[Concept-clé]</strong> : [explication courte et percutante].</li>
    <!-- 3 à 5 bullets max -->
  </ul>
</div>
```

## Règles strictes
- Pas d'introduction, pas de conclusion, pas de balise `<html>` / `<body>`.
- Pas de `<cite>` ni de liens — ce bloc est un résumé interne.
- Réponds UNIQUEMENT avec le bloc `<div>` ci-dessus.
