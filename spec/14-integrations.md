---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Intégrations externes

L'outil s'appuie sur des services tiers que l'utilisateur ne manipule jamais directement. Il les voit à travers trois choses : le bouton « MOCK / RÉEL » de la barre de navigation, la pile d'activité (le petit panneau flottant « Coûts API », en bas à gauche de l'écran) et les messages d'erreur. Cette partie décrit ce que ces services apportent, ce qu'ils coûtent et comment l'outil se comporte quand ils tombent.

| Service | Ce qu'il apporte | Coût |
|---|---|---|
| DataForSEO | Données de marché Google : volume, CPC (coût par clic), difficulté, concurrence, intention, dix premiers résultats, questions PAA (« Autres questions posées ») | Payant à l'appel, sous plafond ; bac à sable gratuit |
| Autocomplétion Google | Ce que Google suggère pendant la saisie d'un mot-clé | Gratuit |
| Tavily | Les pages concurrentes lues par l'analyse d'écart de contenu | Service à clé, facturé par Tavily |
| Google Search Console | Clics, impressions, positions réelles d'un site publié | Gratuit |
| Claude, Gemini, OpenRouter | L'IA de toute l'application | Claude payant ; Gemini gratuit sur ses modèles Flash ; OpenRouter limité aux modèles gratuits |
| Modèle local de similarité | Proximité de sens entre un sujet et des textes | Gratuit, calculé sur le serveur |

## Le bouton « MOCK / RÉEL »
*Exigences : FR-EXT-AI-MULTI-PROVIDER, FR-EXT-DATAFORSEO-SANDBOX (voir aussi FR-INFRA-RUNTIME-MODE)*

Le bouton, à droite de la barre de navigation, affiche « MOCK » ou « RÉEL ». Son info-bulle dit « Sources : MOCK (cliquer pour passer en réel) » ou l'inverse. Un clic bascule le serveur sans le redémarrer.

| Service | En « MOCK » | En « RÉEL » |
|---|---|---|
| IA | Simulation locale : jeux d'exemples, coût 0, aucune requête réseau | Claude, quel que soit le fournisseur réglé dans la configuration, avec sa chaîne de secours |
| DataForSEO | Bac à sable : données factices, gratuit, mais une vraie requête réseau avec de vrais identifiants | Production facturée, sous plafond |
| Autocomplétion Google | Réelle (gratuite) | Réelle |
| Tavily | **Réel**, avec la clé configurée | Réel |
| Lecture des pages des résultats Google | Réelle (gratuite) | Réelle |
| Search Console, modèle local | Inchangés | Inchangés |

Règles :
- Tant que personne n'a cliqué, le serveur suit sa configuration : il est « MOCK » si l'IA y est réglée en simulation ou si le bac à sable DataForSEO y est activé, « RÉEL » sinon.
- Le choix est gardé dans le navigateur. Au chargement de la page, s'il diffère de celui du serveur (serveur redémarré), le navigateur le lui renvoie.
- Si le serveur refuse la bascule, le bouton revient à son état précédent.
- Une fois le bouton cliqué, l'écran n'offre aucun moyen de revenir à « suivre la configuration » : le choix du navigateur l'emporte à chaque chargement.
- Si le serveur redémarre pendant que la page reste ouverte, il reprend sa configuration jusqu'au prochain chargement de la page ; le bouton peut alors afficher un mode qui n'est plus le bon. La mention « SANDBOX » / « PROD » de la pile d'activité, relue toutes les 15 secondes, dit toujours l'état réel de DataForSEO.
- Le fournisseur d'IA « de tous les jours » (Claude, Gemini, OpenRouter ou simulation) se choisit dans la configuration du serveur ; changer ce réglage exige que le serveur le relise.

> **En situation.** Arnaud prépare une démo. Il clique sur « RÉEL » : le bouton passe à « MOCK ». Il lance un scan Radar : les cartes se remplissent de mesures factices et la pile d'activité affiche « DataForSEO SANDBOX $0.00 ». Tavily, lui, n'est jamais simulé : une analyse d'écart de contenu l'interrogerait avec sa clé (aucun écran ne la lance aujourd'hui, voir § 19).

## Qui paie quand les tests tournent
*Exigences : FR-EXT-TESTS-NO-COST*

| Où tournent les tests | IA | DataForSEO | Payant ? |
|---|---|---|---|
| Intégration continue | Simulée (imposée par la configuration) | Bac à sable | Non. Sans identifiants DataForSEO, les tests qui mesurent un mot-clé se déclarent ignorés, et les tests navigateur ne sont pas lancés (un avertissement le dit). |
| Poste local, suites unitaires et d'API | La suite bascule le serveur en « MOCK » au départ, puis rend le réglage d'origine | Bac à sable | Non, sauf Tavily (ci-dessous). |
| Poste local, tests navigateur | Basculés en « MOCK » ; serveur et base dédiés | Bac à sable | Non, sauf Tavily. |
| Drapeau « tests réels » | Réelle | Production | Oui, un avertissement l'annonce. |
| Drapeau « parcours réel » | Réelle | Production | Oui ; le parcours travaille sur la base de développement et y laisse ses données. |
| Mode automatique lancé en réel | Réelle | Production | Oui ; le récapitulatif additionne le coût IA et la dépense DataForSEO estimée. |

Règles :
- Un serveur que quelqu'un a forcé en « RÉEL » n'est jamais basculé par les tests : ils le traitent comme indisponible et le disent.
- Tavily n'a pas de mode simulé : le test d'API de l'analyse d'écart de contenu l'interroge avec la clé du serveur local, sur un mot-clé nouveau à chaque passage.

## Données de marché DataForSEO
*Exigences : FR-EXT-DATAFORSEO*

L'utilisateur voit ces données sur les cartes de mots-clés du Moteur et dans le panneau SEO de la rédaction (onglet des résultats Google). Il n'interagit jamais avec DataForSEO.

Réutilisation avant tout nouvel appel :
- Un mot-clé mesuré depuis moins de 7 jours est resservi depuis la base, partagée par tous les articles.
- Faute de mesure en base, une ancienne réponse encore valable (7 jours) est resservie.
- Dans le panneau SEO de la rédaction, « Rafraîchir » (ou « Lancer l'analyse SERP » quand rien n'est affiché) ignore base et cache et relance la mesure.

Pannes :
- Une limite de débit est retentée jusqu'à 3 fois, avec des attentes d'environ 1, 2 puis 4 secondes. Si elle persiste, les fonctions qui transmettent l'erreur (scan et validation de mots-clés, questions PAA, analyse des résultats Google) affichent « Quota DataForSEO atteint. Rechargez vos crédits puis relancez. », aussi inscrit dans la pile d'activité ; les autres affichent leur propre message.
- Une erreur interne du fournisseur n'est retentée qu'une fois, pour ne pas payer une boucle d'erreurs.
- La fiche SEO d'un mot-clé (résultats, questions, mots liés, volumes) lance ses quatre demandes en parallèle : une demande qui échoue laisse sa partie vide, sans message.
- Une mesure demandée en groupe (jusqu'à 700 mots-clés par envoi pour les volumes, 1 000 pour l'intention) qui échoue laisse ses mots-clés « non mesurés », sans message — même quand l'échec vient du plafond de dépense.
- Une donnée absente s'affiche « — », jamais 0.

## Plafond de dépense DataForSEO
*Exigences : FR-EXT-DATAFORSEO-COSTGUARD*

Avant chaque appel payant, l'outil estime son prix (selon le service appelé et le nombre de mots-clés envoyés) et l'ajoute aux dépenses de la fenêtre glissante (par défaut, les 30 dernières minutes). Si le total dépasse le plafond (par défaut 0,50 $), l'appel n'est pas émis. Le plafond ne vaut qu'en mode réel.

- Plafond et fenêtre se règlent dans la configuration ; une valeur absente ou invalide ramène au défaut.
- Dès que les dépenses les plus anciennes sortent de la fenêtre, les appels repassent, sans intervention.
- Sur les fonctions qui transmettent l'erreur, le refus arrive à l'écran avec « Plafond de dépense DataForSEO atteint ($0.4900 / $0.50 sur 30min). », suivi pour certaines actions d'une invitation à attendre ou à relever le plafond ; il ne s'inscrit pas dans la pile d'activité.
- L'estimation est volontairement haute (un prix de sécurité), pas une facture ; un service inconnu est compté 0,005 $.
- Un appel est compté dès sa réservation, même s'il échoue ensuite.
- En bac à sable, rien n'est compté ni bloqué.
- La pile d'activité, une fois dépliée, affiche « DataForSEO », la mention « SANDBOX » ou « PROD », « dépensé / plafond (30min) » et une barre qui passe en alerte au-delà de 80 %. Elle se met à jour toutes les 15 secondes.
- Le compteur vit dans la mémoire du serveur : un redémarrage le remet à zéro.

> **En situation.** Arnaud a dépensé 0,49 $ en vingt minutes. Il lance un scan Radar. Les volumes arrivent vides : la mesure groupée a été refusée par le plafond, sans message. En dépliant la pile d'activité, il voit la barre DataForSEO en alerte à « $0.49 / $0.50 ». Il attend que la fenêtre glisse.

## Bac à sable DataForSEO
*Exigences : FR-EXT-DATAFORSEO-SANDBOX*

- Le bac à sable s'active par la configuration ou par le mode « MOCK ». Rien ne l'active par défaut : sans réglage, l'outil appelle la production.
- Au premier appel après son démarrage, le serveur écrit dans son journal lequel des deux il utilise (« using SANDBOX (free, fake data) » ou un avertissement « using PRODUCTION — calls will be billed »). Il ne le répète pas après une bascule.
- Le bac à sable répond par ses propres mots-clés factices. Pour une mesure groupée, l'outil attribue ses réponses, dans l'ordre, aux mots-clés demandés : chaque candidat reçoit une mesure, ce qui permet de créer un article en mode simulé.
- Le bac à sable exige de vrais identifiants DataForSEO.

## Autocomplétion Google
*Exigences : FR-EXT-AUTOCOMPLETE-GOOGLE*

- Sert au Radar et au Capitaine (§ 12, § 13). La validation d'une douleur s'en sert aussi, mais aucun écran ne la lance aujourd'hui.
- Pour une saisie, l'outil récupère les suggestions de Google en français et note si le mot-clé figure dans ses propres suggestions, et à quel rang.
- Au plus une demande par seconde ; délai de 3 secondes. Si Google limite le débit, un seul nouvel essai 1,5 seconde plus tard.
- Tout échec rend une liste vide, sans message : l'utilisateur voit seulement qu'il n'y a pas de suggestion.
- Une liste est réutilisée 24 heures, une liste vide 30 minutes.

## Pages concurrentes (Tavily)
*Exigences : FR-EXT-TAVILY*

- L'analyse d'écart de contenu (voir § 19 ; aucun écran ne la lance aujourd'hui) lit jusqu'à 5 pages concurrentes, en recherche approfondie.
- Une analyse de moins de 7 jours est resservie sans nouvel appel.
- Sans clé Tavily, l'analyse échoue avec un message qui le dit.
- Le mode « MOCK » ne coupe pas Tavily ; seule la lecture de ces pages par l'IA est simulée.

## Google Search Console
*Exigences : FR-EXT-GSC-OAUTH, FR-EXT-GSC-PERFORMANCE*

On y accède par le bouton « GSC » du tableau de bord. L'écran s'intitule « Post-Publication — Google Search Console ».

Connexion :
- Non connecté, l'écran affiche « Connectez votre Google Search Console pour voir les performances post-publication. » et deux boutons : « Connecter Google Search Console » et « Vérifier la connexion ».
- Le premier ouvre la page d'autorisation Google dans un nouvel onglet. L'accès demandé est en lecture seule. Au retour, cet onglet affiche « Google Search Console connecte ! Vous pouvez fermer cette page. ».
- « Vérifier la connexion » relit l'état. L'accès est conservé sur le serveur et renouvelé automatiquement moins d'une minute avant son expiration.
- « Connecté » signifie seulement qu'un accès a été enregistré. Si Google refuse le renouvellement (accès révoqué), l'écran reste en mode connecté et affiche l'erreur « Google OAuth refresh error: <code HTTP> » avec un bouton de nouvel essai, sans proposer de refaire la connexion.

Performances :
- Contrôles : « Propriété GSC » (mémorisée dans le navigateur), « Période » (« 7 jours », « 30 jours », « 90 jours »), bouton « Actualiser ». Changer la période recharge les données.
- Si la propriété est connue, les données se chargent seules à l'ouverture.
- Tableau « Performance par page » : Page, Clics, Impressions, CTR (taux de clic), Position moy. ; trié par clics décroissants ; 1 000 lignes au plus par demande.
- La position est colorée : orange jusqu'à 30, rouge au-delà.
- Une même demande refaite le même jour est servie depuis le cache, sans appel à Google.
- Sans données : « Saisissez votre propriété GSC et cliquez sur Actualiser pour voir les données. ».

## Fournisseurs d'IA et bascule
*Exigences : FR-EXT-AI-MULTI-PROVIDER, FR-EXT-AI-FALLBACK, FR-EXT-CLAUDE, FR-EXT-GEMINI*

Chaque fonction d'IA de l'outil passe par un même aiguillage. Deux formes de demande existent : un texte écrit au fil de l'eau (affiché morceau par morceau) et une réponse structurée (un objet rempli selon un schéma).

| Fournisseur | Modèle | Réponse structurée | Coût affiché |
|---|---|---|---|
| Claude | Texte : réglable, Sonnet 4.6 par défaut. Structuré : Haiku 4.5, sauf si la fonction en demande un autre | Claude est obligé de remplir le schéma | Tarif du modèle ; lecture du cache de prompt −90 %, écriture +25 % ; modèle inconnu = tarif Sonnet |
| Gemini | Réglable ; 2.0 Flash par défaut, que Google ne sert plus | JSON natif exigé | 0 sur Flash 2.0 et Flash Lite ; payant sur 2.5 Flash et 2.5 Pro |
| OpenRouter | Réglable, modèles gratuits seulement ; un modèle payant est refusé | JSON demandé | 0 |
| Simulation | Jeux d'exemples locaux, latence simulée de 200 ms | Exemple dédié, sinon objet minimal tiré du schéma | 0 |

Bascule :
- Une erreur de quota, de surcharge ou de serveur est retentée jusqu'à 2 fois, après 1 puis 2 secondes.
- Quota épuisé (y compris crédits Anthropic), surcharge, modèle retiré ou clé refusée : la demande passe au fournisseur suivant. Ordre : le principal, puis Claude, Gemini, OpenRouter.
- Toute autre erreur (demande mal formée, réseau, JSON invalide) remonte telle quelle, sans bascule.
- Un réglage de la configuration désactive la chaîne, pour voir les vraies erreurs d'un fournisseur. La simulation n'a jamais de repli.
- Pour un texte, la bascule n'a lieu qu'avant le premier morceau ; une coupure en cours d'écriture remonte l'erreur.
- Une demande qui utilise la recherche web (passe « Sources », actions « sources chiffrées » et « exemples réels », voir [Rédaction](13-redaction.md)) n'est confiée qu'à Claude, ou à la simulation en « MOCK ». Si Claude échoue, elle échoue : « La recherche web exige Claude : aucun autre fournisseur ne sait chercher et citer ses sources. » quand aucun fournisseur capable n'est disponible.
- La bascule n'est visible que dans le journal du serveur (« fallback to <fournisseur> (primary exhausted) »). Dans la pile d'activité, l'utilisateur voit seulement le nom du modèle qui a répondu.

Messages :
- Quota : « Quota Claude atteint ou crédits Anthropic insuffisants. Rechargez vos crédits. », « Quota Gemini atteint (requêtes/minute ou tokens/jour)… », « Quota OpenRouter atteint (20 req/min ou 50 req/jour sur free tier)… ».
- Surcharge : « Le modèle IA (<fournisseur>) est surchargé. Nouvelle tentative dans quelques instants. ».
- Fournisseur inutilisable : « Modèle <fournisseur> introuvable ou retiré — vérifiez … » ou « Accès <fournisseur> refusé — vérifiez la clé d'API. ».
- Où ces messages arrivent : un texte écrit au fil de l'eau les reçoit dans le panneau qui l'a demandé. Pour une réponse structurée, seules quelques fonctions (audit et validation de mots-clés, scan de mots-clés, questions PAA, analyse des résultats Google) les transmettent, avec une ligne dans la pile d'activité (« Quota IA atteint », « Modèle IA surchargé ») ; les autres affichent leur propre message générique (par exemple « Failed to classify keyword relevance »).

Coût :
- Chaque réponse porte le modèle utilisé, les jetons (tokens) lus et écrits, et un coût estimé en dollars, inscrit dans la pile d'activité.
- Le coût ne compte que les jetons : les frais propres à la recherche web ne sont pas comptés.

> **En situation.** Les crédits Anthropic d'Arnaud sont épuisés. Il demande le classement de pertinence de ses mots-clés Discovery. Claude refuse ; la demande passe à Gemini, dont le modèle par défaut n'existe plus ; elle passe à OpenRouter, qui répond. La pile d'activité affiche une ligne avec le modèle OpenRouter et « < $0.001 ». Rien ne lui dit que deux fournisseurs ont échoué avant.

## Similarité de sens (modèle local)
*Exigences : FR-EXT-EMBEDDINGS*

- Sert au scan du Radar (voir [Moteur — Radar](07-radar.md)) pour noter la proximité de sens entre un sujet et des questions ou suggestions.
- Le modèle, multilingue, se charge au premier usage : attente de 60 secondes au plus, téléchargement la première fois. Il reste ensuite en mémoire jusqu'au redémarrage du serveur.
- Aucun coût, aucun fournisseur payant.
- Si le chargement échoue, la mesure vaut « indisponible » jusqu'au redémarrage, sans nouvel essai ; les écrans continuent sans elle.
