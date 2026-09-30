---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Lexique

Le lexique est la liste des mots du métier que l'article doit employer. L'onglet « Lexique » est le dernier de la phase « Valider ». L'outil mesure les mots des pages concurrentes, l'IA donne son avis, l'utilisateur coche ses termes. Le lexique retenu nourrit ensuite la Rédaction et le score SEO.

## Ouvrir l'onglet
*Exigences : FR-LEX-PRECHECK-SERP, FR-LEX-SCRAPE-DEDIE, FR-LEX-AI-PANEL*

- En tête : le capitaine (« — » s'il manque), les lieutenants retenus et le type d'article.
- Capitaine non verrouillé : « Verrouillez d'abord le Capitaine pour débloquer les actions Lexique. » « Extraire le Lexique » reste grisé, sauf si l'article a déjà des termes retenus.
- L'outil vérifie, sans appel payant, si les pages concurrentes du capitaine ont déjà été lues :
  - lues, ou vérification sans réponse : le bouton « Extraire le Lexique » ;
  - jamais lues : « Le scrape SERP n'est pas encore disponible pour ce mot-clé. » et « Lancer l'analyse SERP (~$0.003 DataForSEO) ». Ce bouton ouvre « Lancer l'analyse SERP DataForSEO ? » (« Le scrape récupère les pages Top 10 Google et leur contenu pour calculer le TF-IDF. Coût estimé : $0.003. »), avec « Confirmer (~$0.003) » et « Annuler ». Seule la confirmation lance l'analyse, puis l'extraction.
- Capitaine verrouillé : l'extraction déjà enregistrée pour le capitaine est relue avec l'avis de l'IA. S'il n'y en a pas, rien ne part seul : « Extraire le Lexique » attend ton clic.
- L'analyse de l'IA ne part que sur un clic (« Analyser avec l'IA », « Régénérer l'analyse », « Relancer l'analyse IA ») : ni l'ouverture de l'onglet, ni une extraction, ni un changement d'onglet d'exploration ne la lancent.

## Extraire le lexique
*Exigences : FR-LEX-TFIDF, FR-LEX-METIER-ONLY*

Le TF-IDF est ici une mesure simple : sur combien de pages concurrentes un mot apparaît, et combien de fois par page.

- Seul le contenu principal de chaque page compte (sa zone principale, sinon ses articles, sinon la page), sans menus, en-têtes, pieds de page, encarts, formulaires ni bandeaux de cookies ou d'inscription. Dans un article, le titre est gardé.
- Sont écartés : les mots de moins de 3 lettres, les nombres, les mots vides (articles, pronoms, possessifs, prépositions, adverbes, verbes génériques comme « être », « voir », « permet ») et le décor de page (« cookies », « mentions », « newsletter », « panier », réseaux sociaux, « cliquez »…), avec ou sans accent. Le mot proposé garde son accent. « site », « blog », « article », « recherche » restent.
- Trois listes : « Obligatoire (70%+) — N termes » (ouverte), « Différenciateur (30-70%) — N termes » (ouverte), « Optionnel (<30%) — N termes » (repliée). Au plus 50 termes par liste, triés par densité décroissante.
- Chaque ligne : une case, le terme, le badge de l'IA s'il existe, « ×densité/page », le pourcentage de pages.
- Les termes sont des mots isolés.
- Sans page lue, l'extraction échoue avec « Lancez d'abord l'analyse SERP dans l'onglet Lieutenants ».
- L'extraction est enregistrée comme exploration de l'article, au nom du mot-clé extrait.

## L'avis de l'IA
*Exigences : FR-LEX-AI-PANEL, FR-LEX-METIER-ONLY*

- L'IA reçoit tous les termes des trois niveaux, la douleur de l'article et la stratégie du cocon. Pour chaque terme, elle dit « recommandé » ou non, avec une raison ; elle cite au plus 5 termes manquants et résume la couverture.
- Pendant l'analyse : « Analyse IA en cours... ». Ensuite, au-dessus des listes : le résumé et « Termes manquants : … ». En cas d'erreur : le message et « Relancer l'analyse IA ».
- Chaque terme analysé porte « IA recommandé » ou « IA optionnel », la raison en info-bulle. Un terme sans décision lisible n'a pas de badge.
- Le panneau « Analyse IA Lexique » compte « N termes analysés — n recommandés · m écartés ». Il propose « Analyser avec l'IA » ou « Régénérer l'analyse » ; la régénération demande confirmation (« Régénérer l'analyse IA Lexique ? Cela consommera un appel Claude. »).
- L'avis de l'IA ne coche aucun terme. Il est enregistré avec l'exploration.

## Trier
*Exigences : FR-LEX-SORT*

- La barre de tri propose « A-Z », « Densité », et « Pertinence douleur » si l'article a une douleur. Ce dernier tri classe les termes selon les mots qu'ils partagent avec la douleur.
- Sans tri choisi, l'ordre est celui de la densité décroissante. Le tri s'applique aux trois listes ; un terme sans valeur va en bas.
- Le tri reste tant que la page du Moteur est ouverte, même en changeant d'article ; il est perdu au rechargement.

## Retenir des termes
*Exigences : FR-LEX-SELECT, FR-LEX-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-PRECHECK-PERSISTE*

- Aucune case n'est cochée d'office. Cocher un terme l'ajoute au lexique de l'article et l'enregistre aussitôt ; décocher le retire aussitôt. Il n'y a pas de bouton de validation.
- La barre de tri affiche « N terme(s) sélectionné(s) (xO / yD / zOp) », le détail par niveau pour l'exploration affichée. Sous les listes, « N terme(s) verrouillé(s) » rappelle le total.
- Les cases reflètent toujours le lexique enregistré : après une extraction, un rechargement ou un changement d'onglet d'exploration, les termes retenus sont cochés, et cliquer l'un d'eux le décoche et le retire.
- Le panneau « 💡 Suggestions pour votre Lexique » propose au plus 10 mots-clés du scan Radar ; « Ajouter » les ajoute au lexique et les enregistre.

> **En situation.** Sur « isolation combles perdus », l'utilisateur extrait son lexique : « laine », « soufflée », « pare-vapeur », « combles »… jamais « vos » ni « cookies ». Aucune case n'est cochée ; des badges « IA recommandé » guident. Il coche trois termes : le compteur passe à 3 et l'étape « Lexique validé » est accordée.

## Explorer d'autres mots-clés
*Exigences : FR-LEX-MULTI-KEYWORD, FR-LEX-MULTI-KEYWORD-TABS, FR-LEX-LECTURE-VS-VERROUILLAGE*

- Une barre d'onglets montre une exploration par mot-clé déjà extrait pour l'article, libellée exactement comme le mot-clé, plus « Tester un mot-clé » (« + Tester un mot-clé » quand il y a déjà des explorations).
- « Tester un mot-clé » ouvre un champ (« Ex: coach sportif Paris ») et « Extraire ». Le champ n'est grisé que pendant une extraction, jamais parce que des termes sont retenus.
- Extraire un autre mot-clé lit ses pages concurrentes, en lançant l'analyse si elles n'ont jamais été lues (sans confirmation ni rappel du coût), crée un onglet à son nom, le sélectionne, et lance l'avis de l'IA.
- Changer d'onglet affiche les termes et l'avis enregistrés, sans nouvel appel et sans rien enregistrer.
- Les cases cochées sont celles du lexique unique de l'article : cocher un terme dans n'importe quel onglet l'ajoute au même lexique.
- Une exploration enregistrée avant le filtre des mots génériques est relue filtrée : ses mots génériques ne s'affichent plus, ni extraits, ni recommandés, ni manquants.

## L'étape « Lexique validé » et sa porte
*Exigences : FR-LEX-CHECK, FR-LEX-METIER-ONLY*

- Le premier terme retenu demande l'étape. Le lexique est enregistré, puis la porte le juge sans ouvrir d'alarme.
- La porte passe : l'étape est accordée. Elle refuse : bandeau « Étape non validée. » avec la première raison et « (+n autres) », bouton « Voir pourquoi / décider » qui ouvre l'alarme « Avant de valider le lexique ». Si la vérification est impossible, l'étape est demandée quand même : le serveur tranche, et l'alarme s'ouvre s'il refuse.
- Chaque changement du lexique relance la vérification : un terme générique ajouté retire l'étape, le retirer la rend. Deux cases cochées vite ne doublent pas la demande.
- Retirer le dernier terme retire l'étape et efface le bandeau.
- À l'ouverture : étape présente sans terme → retirée ; termes sans étape → la porte décide.

| Point | Niveau | Message |
|---|---|---|
| Aucun terme retenu | 🔴 | « Aucun terme retenu : le lexique est vide. » |
| Terme générique (tous ses mots sont des mots vides ou du décor de page) — une alerte par terme | 🔴 | « « … » n'est pas un mot du métier. » |

- Une dérogation tombe dès que le lexique change (ajout, retrait, réécriture d'un terme).
- La porte est rejouée à la publication : un lexique vide ou un terme générique encore présent y revient en 🔴 sans dérogation.

## Le lexique hors de l'onglet
*Exigences : FR-LEX-METIER-ONLY*

- Dans la Rédaction, section « Mots-clés » : un terme générique ajouté à la main est refusé (« « … » est un mot générique : il n'aide pas le référencement, il n'est pas ajouté. ») ; « Suggérer le Lexique via Claude » remplace le lexique par la suggestion, sans ses termes génériques, et les nomme (« Termes génériques écartés de la suggestion : … »). La Rédaction n'a pas d'étape « Lexique validé » : c'est la publication qui rejoue la porte.
- Le mode automatique garde les obligatoires et les différenciateurs de densité au moins médiane, sans mot générique ni mot déjà porté par le capitaine ou les lieutenants, 30 au plus. Il enregistre le lexique, puis demande l'étape à la même porte, et s'arrête sur un refus.

## Limites connues (Lexique)

- « Tester un mot-clé » peut payer une analyse des concurrents sans l'annoncer.
- Capitaine déverrouillé : les explorations enregistrées ne sont pas relues d'elles-mêmes à l'ouverture de l'onglet.
- Les termes manquants cités par l'IA à chaud ne passent pas le filtre des mots génériques ; ils le passent à la relecture.
- Des pages lues avant le nettoyage du contenu principal gardent leurs menus jusqu'à une nouvelle analyse (au-delà de 7 jours) ; le filtre des mots écarte de toute façon le décor de page.
- Un terme générique retenu avant la règle n'est pas retiré du lexique : la porte le refuse jusqu'à ce que l'utilisateur le décoche.
