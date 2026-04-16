Tu dois GÉNÉRER un bloc HTML "Sources chiffrées" qui appuie avec des chiffres réels et vérifiables le contexte fourni ci-dessous.

## Contexte (section + paragraphe qui précèdent le bloc dans l'article)
"""
{{selectedText}}
"""

{{keywordInstruction}}

## Ta mission
1. Utilise l'outil `web_search` pour trouver **2 à 3 sources récentes (2023-2026)** qui contiennent des statistiques, chiffres ou données vérifiables en lien direct avec le contexte ci-dessus.
2. Privilégie des sources de qualité : instituts (INSEE, Eurostat, OCDE), études sectorielles (McKinsey, BCG, Deloitte), baromètres reconnus (HubSpot, Statista, Semrush), médias économiques sérieux.
3. Extrait les chiffres les plus pertinents qui **viennent valider quantitativement** ce que dit le paragraphe.
4. Pour CHAQUE source, garde l'URL exacte retournée par la recherche web.

## Format de sortie OBLIGATOIRE (HTML strict, aucune autre balise)
Retourne UNIQUEMENT ce HTML, sans markdown, sans commentaire, sans fences :

```
<div class="dynamic-block sources-chiffrees" data-type="sources-chiffrees">
  <div class="dynamic-block-header">Sources chiffrées</div>
  <ul class="dynamic-block-list">
    <li>
      <p><strong>[Chiffre clé]</strong> — [Phrase courte qui explique le chiffre et son lien avec le paragraphe].</p>
      <cite><a href="[URL_EXACTE]" target="_blank" rel="noopener noreferrer">[Nom de la source], [Année]</a></cite>
    </li>
    <!-- 1 à 2 autres <li> sur le même modèle -->
  </ul>
</div>
```

## Règles strictes
- **N'invente jamais** de chiffre ou d'URL. Si aucune source fiable n'est trouvée, retourne une seule `<li>` avec un message d'absence de donnée.
- Chaque `<li>` doit contenir UN chiffre clé en `<strong>` + 1 phrase d'explication + 1 `<cite>` avec l'URL cliquable.
- Pas d'introduction, pas de conclusion, pas de balise `<html>` / `<body>`.
- Réponds UNIQUEMENT avec le bloc `<div>` ci-dessus.
