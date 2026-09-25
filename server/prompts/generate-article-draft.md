## Contexte de l'article

- **Titre** : {{articleTitle}}
- **Type** : {{articleType}}
- **Mot-clé pilier** : {{keyword}}
- **Mots-clés secondaires** : {{secondaryKeywords}}
- **Cocon sémantique** : {{cocoonName}}

{{strategyContext}}

{{keywordContext}}

{{microContext}}

{{type_rules}}

{{#cocoon_context}}
{{cocoon_context}}

Un sujet qui a son propre article dans le cocon se résume ici en quelques phrases et y renvoie : il ne se traite pas en profondeur. Si cet article naît d'une section de son parent, il développe ce qu'elle annonce sans la répéter.
{{/cocoon_context}}

## Plan de l'article et budget de chaque chapitre

L'article complet vise **{{wordCountBudget}} mots**. Chaque chapitre (H2) a son budget : c'est sa part de la cible, ni un minimum ni une invitation à déborder.

{{outlinePlan}}

{{#continuation}}
## Suite d'un premier jet coupé

Le début de l'article est déjà rédigé ; il s'arrête avant le chapitre « {{continuation}} ». Voici ses derniers paragraphes, pour enchaîner sans répéter :

{{previousText}}

Rédige UNIQUEMENT les chapitres à partir de « {{continuation}} », dans l'ordre du plan. Ne réécris ni le titre, ni l'introduction, ni les chapitres déjà rédigés.
{{/continuation}}

## Premier jet — article complet

Rédige l'article **en entier, d'un seul tenant** : c'est un premier jet solide, qui sera ensuite enrichi (sources, exemples, tableaux, FAQ) par des passes séparées.

1. **Titre** : commence par `<h1>` qui reprend le titre ; s'il ne contient pas le mot-clé pilier, intègre-le naturellement.
2. **Chapeau** : deux ou trois phrases après le H1, qui accrochent par la douleur du lecteur et citent le mot-clé pilier.
3. **Chapitres** : chaque H2 du plan, dans l'ordre, avec ses H3 ; aucun chapitre ajouté ni oublié. Respecte le budget de chaque chapitre à 15 % près.
4. **Une seule conclusion** : le dernier chapitre ; aucun autre chapitre ne conclut, ne résume ni ne répète ce qui a été dit.
5. **Aucun chiffre inventé** : tu n'as pas de recherche web. N'écris aucun pourcentage, prix, statistique, date d'étude ou nom de source que tu ne peux pas garantir. Quand un chiffre renforcerait le propos, pose un marqueur à sa place : `<mark data-a-sourcer>[à sourcer : ce qu'il faudrait trouver]</mark>`. La passe « sources » le remplacera par une donnée vérifiée.
6. **Langue** : 100 % français. Aucune phrase en anglais, hors noms de marques et termes métier d'usage courant.
7. **Pas de répétition** : chaque paragraphe apporte une idée nouvelle ; ne reformule pas un paragraphe d'un autre chapitre.

## Format de sortie

HTML structuré uniquement, sans bloc de code ni commentaire : `<h1>`, `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<blockquote>`, `<mark data-a-sourcer>`.
