Tu dois générer le meta title et la meta description pour un article de blog Propulsite.

## Informations sur l'article

- **Titre** : {{articleTitle}}
- **Mot-clé pilier** : {{keyword}}

## Contenu de l'article

{{articleContent}}

## Consignes

### Meta Title
- Maximum 60 caractères (espaces compris)
- Inclure le mot-clé pilier "{{keyword}}" naturellement
- Doit donner envie de cliquer
- Ne pas commencer par le mot-clé brut — préférer une formulation engageante

### Meta Description
- Maximum 160 caractères (espaces compris)
- Inclure le mot-clé pilier "{{keyword}}" naturellement
- Résumer la valeur de l'article pour le lecteur
- Inclure un call-to-action implicite

## Format de réponse

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans code fence :

{"metaTitle": "...", "metaDescription": "..."}
