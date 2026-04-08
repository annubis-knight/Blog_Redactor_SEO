## Contexte de l'article

- **Titre** : {{articleTitle}}
- **Type d'article** : {{articleType}}
- **Mot-clé pilier** : {{keyword}}
- **Mots-clés secondaires** : {{secondaryKeywords}}
- **Cocon sémantique** : {{cocoonName}}

{{strategyContext}}

{{keywordContext}}

{{microContext}}

## Sommaire complet de l'article

{{fullOutline}}

## Section à rédiger

Tu rédiges UNIQUEMENT la section suivante de l'article. Ne génère RIEN d'autre.

{{sectionOutline}}

{{previousContext}}

## Consignes de rédaction

1. **Génère UNIQUEMENT le contenu de cette section** — pas d'introduction générale, pas de conclusion globale, pas de sections adjacentes.

2. **Respecte la hiérarchie** : le H2 et ses H3 doivent apparaître dans l'ordre exact du sommaire ci-dessus.

3. **Intégration des mots-clés** :
   - Intègre le mot-clé pilier « {{keyword}} » naturellement si pertinent pour cette section.
   - Répartis les mots-clés secondaires de manière naturelle et indétectable.

4. **Answer capsule** : Après le `<h2>`, ajoute immédiatement un `<blockquote>` de 20-25 mots résumant le point clé. Ce bloc doit être auto-suffisant pour les moteurs IA.

5. **Statistiques sourcées** : Inclus au moins 1 statistique vérifiable avec sa source (ex: « selon Forrester, 2024 »).

6. **Exemples concrets** : Illustre avec le pattern grandes marques → PME.

7. **Paragraphes courts** : Maximum 3 lignes par paragraphe. Phrases courtes et directes.

8. **Blocs Propulsite** :
   - Si la section a l'annotation `content-valeur`, génère un bloc pédagogique d'introduction.
   - Si la section a l'annotation `content-reminder`, génère un bloc de rappel avec les points clés.

9. **Continuité** : Le contenu doit s'enchaîner naturellement avec ce qui précède. Pas de formule de transition artificielle comme "Passons maintenant à..." ou "Dans cette section...".

{{positionDirectives}}

## Format de sortie

Génère le contenu en HTML structuré. Commence directement par la balise `<h2>` de la section (ou par `<p>` si c'est l'introduction).

```html
<h2>Titre de la section</h2>
<blockquote>Answer capsule de 20-25 mots.</blockquote>
<p>Contenu...</p>

<h3>Sous-section</h3>
<p>Contenu détaillé...</p>
```

NE génère PAS de meta title, meta description, ni de balise `<h1>`.
