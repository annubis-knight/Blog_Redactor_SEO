---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Composants d'interface partagés

Certaines briques d'écran servent à plusieurs endroits. L'outil les construit une seule fois : une retouche se voit partout où la brique apparaît.

## La carte de mot-clé du Radar et du Capitaine
*Exigences : FR-UI-RADAR-CARD*

| Où | Geste | Score affiché |
|---|---|---|
| Onglet Radar, résultats d'un scan | Case à cocher à gauche | « Score KPI » (marché) |
| Onglet Capitaine, liste des candidats | Cadenas, bouton de tag manuel, bouton de recalcul de la pertinence | « Score Pertinence » |
| Onglet Capitaine en mode libre (aucun écran ne l'affiche aujourd'hui) | Aucun | « Score Pertinence », valeur PAA jugée par l'IA |

Contenu, identique partout :
- En-tête : chevron, mot-clé (mots cliquables au Capitaine), pictogrammes d'intention (Informationnel, Commercial, Transactionnel, Navigationnel), ligne « vol · KD · CPC · PAA », anneau de score coloré du rouge (0) au vert (100) avec son libellé et le détail de ses composantes.
- Une carte sans mesure de marché (longue traîne) n'affiche ni intention ni ligne de mesures.
- Un score absent s'affiche « — ». En mode pertinence, l'outil en donne la raison : douleur manquante, longue traîne, questions PAA ou autocomplétion absentes, signaux nuls.
- Le chevron déplie le raisonnement et l'arbre des questions PAA (questions filles sous leur question mère, réponse dépliable). Sans question : « Aucune PAA trouvee ».

## Les panneaux d'assistance IA
*Exigences : FR-UI-AI-PANELS-PATTERN*

Structure commune (Discovery, Lexique, Capitaine) :
- Un en-tête cliquable (titre, sous-titre, chevron). Le panneau est replié par défaut : « Cliquez pour lancer l'analyse IA. » (ou « … voir les suggestions IA. » après un résultat).
- Déplié, il montre l'un des quatre états : au repos (phrase d'invitation), en cours (squelette ou texte qui s'écrit), résultat, erreur (« Une erreur est survenue pendant l'analyse. » ou le message reçu).
- Il se déplie seul pendant une analyse ou en cas d'erreur, et ne se replie pas seul ensuite.
- En pied, un bouton « Analyser avec l'IA » (libellé propre à chaque onglet), désactivé tant que le préalable manque. Après un résultat, il devient « Régénérer » et demande confirmation (« … Cela consommera un appel Claude. »).
- Un résultat ancien peut afficher « Ces résultats commencent à dater — pense à régénérer. ».

| Onglet | Panneau | Présence | Particularités |
|---|---|---|---|
| Discovery | « Analyse IA Discovery » | Toujours | Bouton « Analyser les N résultats pertinents », désactivé sans résultat ; invitation « Lance d'abord une découverte de mots-clés ci-dessus… » ; « Relancer l'analyse » |
| Radar | « Suggestions IA Radar » | Toujours | Aucun appel d'IA : classement local des 5 meilleurs candidats (score marché « M » et pertinence « P »), bouton « Marquer comme candidats Capitaine (N) » ; invitation « Lance un scan ci-dessus… » |
| Capitaine | « Avis expert IA » | Avec la fiche de la carte sélectionnée | Verdict en tête, puis avis rédigé qui s'écrit au fil de l'eau |
| Lieutenants | « Suggestions IA Lieutenants » | Après l'analyse des résultats Google | Structure propre : texte brut en cours, « Content-gap détecté », bouton « Lancer une suggestion IA » ou « Régénérer les suggestions », sans confirmation |
| Lexique | « Analyse IA Lexique » | Après le calcul TF-IDF | « N termes analysés — X recommandés · Y écartés. » |
| Rédaction guidée | « Analyse IA du Brief » | Via le bouton « IA Brief » | Hors structure commune : bouton « Relancer l'analyse », pas d'état « erreur » |

## Rédaction guidée et éditeur libre
*Exigences : FR-UI-ARTICLE-SHARED*

La vue de rédaction guidée (ouverte depuis la liste Rédaction du cocon) et l'éditeur libre (« Éditer l'article », ou son adresse ; voir § 18) partagent :
- la barre de panneaux « SEO », « GEO », « Maillage », « Enrichir » ; chaque bouton reste grisé tant que l'article n'a pas de texte (« Generez un article pour activer le scoring SEO », « Rédigez le premier jet pour l'enrichir »…) ;
- la zone de panneaux redimensionnable, qui contient le panneau « Enrichir » ;
- la barre de progression des sections ;
- la génération du premier jet (affichage chapitre par chapitre, sauvegarde, coût, porte « accepter le premier jet », voir [Rédaction](13-redaction.md)).

Propre à chaque vue :

| Brique | Rédaction guidée | Éditeur libre |
|---|---|---|
| Bouton « IA Brief » (jamais grisé) | Oui | Non |
| Bouton « Blocs » | Non | Oui |
| Badges de coût (« Article », « Meta », « Réduction », « Humanisation ») | Oui | Non |
| Compteur de mots | Oui | Non |
| Messages d'erreur des actions d'édition | Non | Oui |

## Briques communes du Moteur
*Exigences : FR-UI-MOTEUR-SHARED*

Au-dessus des onglets, montées une seule fois :
- **Récapitulatif du cocon** : les articles suggérés et publiés. Chaque article porte 6 points de progression en deux groupes, « Explorer » (Discovery, Radar) et « Valider » (Capitaine, Lieutenants, Structure, Lexique) ; le survol d'un point donne son étape. Le même récapitulatif figure aussi sur l'écran de rédaction du cocon.
- **« Résultats déjà calculés »** et l'invite **« Charger <onglet> »** : voir [Moteur — cadre commun](05-moteur.md) (« La barre « Résultats déjà calculés » »).

Dans les onglets Lieutenants et Lexique : **« 💡 Suggestions pour vos Lieutenants »** / **« 💡 Suggestions pour votre Lexique »**, dix mots-clés au plus tirés du Radar, bouton « Ajouter » ; le panneau se masque quand il n'a rien à proposer.
