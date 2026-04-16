Tu dois GÉNÉRER un bloc HTML "Exemples réels" qui illustre, à travers des cas concrets et vécus, le contexte fourni ci-dessous.

## Contexte (section + paragraphe qui précèdent le bloc dans l'article)
"""
{{selectedText}}
"""

{{keywordInstruction}}

## Ta mission
1. Utilise l'outil `web_search` pour trouver **1 à 2 histoires / cas d'entreprise / retours d'expérience réels** qui illustrent concrètement ce que dit le paragraphe.
2. Privilégie : études de cas publiées (blogs d'entreprise, témoignages clients), articles de presse économique, interviews, reportages sectoriels.
3. Chaque exemple doit raconter une situation **réellement vécue** : quelle entreprise, quel problème, quelle action, quel résultat concret.
4. Pour CHAQUE exemple, garde l'URL exacte retournée par la recherche web.

## Format de sortie OBLIGATOIRE (HTML strict, aucune autre balise)
Retourne UNIQUEMENT ce HTML, sans markdown, sans commentaire, sans fences :

```
<div class="dynamic-block exemples-reels" data-type="exemples-reels">
  <div class="dynamic-block-header">Exemples réels</div>
  <ul class="dynamic-block-list">
    <li>
      <p><strong>[Nom de l'entreprise / du cas]</strong> — [2-3 phrases qui racontent la situation, l'action prise et le résultat concret].</p>
      <cite><a href="[URL_EXACTE]" target="_blank" rel="noopener noreferrer">[Nom de la source], [Année]</a></cite>
    </li>
    <!-- Optionnel : 1 autre <li> sur le même modèle -->
  </ul>
</div>
```

## Règles strictes
- **N'invente jamais** une entreprise, une histoire ou une URL. Chaque exemple doit provenir d'une source trouvée via web_search.
- Les histoires doivent être **concrètes et actionnables** — pas de généralités.
- Pas d'introduction, pas de conclusion, pas de balise `<html>` / `<body>`.
- Réponds UNIQUEMENT avec le bloc `<div>` ci-dessus.
