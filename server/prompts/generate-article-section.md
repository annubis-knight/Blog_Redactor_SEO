## Contexte de l'article

- **Titre** : {{articleTitle}}
- **Type** : {{articleType}}
- **Mot-clé pilier** : {{keyword}}
- **Mots-clés secondaires** : {{secondaryKeywords}}
- **Cocon sémantique** : {{cocoonName}}

<!-- Bloc Brain-First : cible, douleur, angle différenciateur, promesse, CTA -->
{{strategyContext}}

<!-- Bloc Capitaine/Lieutenants/Lexique sémantique avec zones de placement -->
{{keywordContext}}

<!-- Bloc micro-contexte : angle éditorial, ton, consignes spécifiques, word count cible -->
{{microContext}}

## Nombre de mots cible

L'article complet doit faire environ **{{wordCountBudget}} mots**. Tu rédiges la partie « {{sectionRole}} ». Calibre ta rédaction pour que l'ensemble de l'article atteigne cette cible une fois toutes les sections assemblées.

## Sommaire complet de l'article

{{fullOutline}}

## Section à rédiger

Tu rédiges UNIQUEMENT la section suivante. Ne génère rien d'autre.

{{sectionOutline}}

{{previousContext}}

{{positionDirectives}}

## Consignes

1. **Périmètre strict** : génère UNIQUEMENT le contenu de cette section — pas d'introduction générale, pas de conclusion globale, pas de sections adjacentes.

2. **Hiérarchie** : le H2 et ses H3 doivent apparaître dans l'ordre exact du sommaire.

3. **Continuité** : le contenu doit s'enchaîner naturellement avec ce qui précède. Ne répète pas d'idées, de formulations ni d'arguments déjà couverts dans les sections précédentes.

4. **Contenu riche et engageant** : rédige le fond du sujet avec explications, analyses, conseils et raisonnements. Illustre avec des exemples concrets (pattern grandes marques → PME) et intègre des données chiffrées sourcées quand c'est pertinent. Avant d'intégrer un exemple ou une statistique, fais une recherche web pour vérifier l'information.

5. **Engagement** : maintiens la tension tout au long de la section. Alterne narration, argumentation et interpellation directe du lecteur. Chaque section doit accrocher et relancer l'intérêt — jamais de ton « informatif neutre ».

6. **Complétude** : termine toujours proprement chaque section. Ne laisse jamais une phrase, une liste à puces ou un paragraphe inachevé. Chaque H2 et H3 doit être suivi de contenu substantiel.

7. **Densité** : chaque paragraphe doit apporter une idée, un argument ou un conseil nouveau. Ne reformule pas la même idée sous un angle différent pour remplir.

8. **Concision** : sois direct et concis. Chaque H3 fait 2 à 3 paragraphes. Un H2 sans H3 fait 3 à 4 paragraphes. Chaque paragraphe fait 2 à 3 phrases maximum. Privilégie la densité d'information à la longueur.

## Format de sortie

HTML structuré. Pour l'introduction, commence par `<h1>` (titre de l'article) puis enchaîne avec `<p>`. Pour les autres sections, commence directement par `<h2>`.

```html
<!-- Introduction -->
<h1>Titre de l'article</h1>
<p>Accroche...</p>

<!-- Sections suivantes -->
<h2>Titre de la section</h2>
<p>Contenu...</p>

<h3>Sous-section</h3>
<p>Contenu détaillé...</p>
```

NE génère PAS de meta title ni de meta description. Le `<h1>` ne doit apparaître QUE dans la section d'introduction.
