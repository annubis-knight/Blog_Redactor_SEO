---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Infrastructure transversale

Cette partie ne correspond à aucun onglet. Elle décrit ce qui se passe « sous » tous les écrans, du Cerveau à la publication : la mémoire de l'outil (ce qu'il garde pour ne pas repayer un appel), la bascule simulé / réel, la pile des coûts, la façon d'afficher une donnée absente, les consignes données à l'IA, et les portes de qualité avec leur alarme graduée. Les portes vues depuis la Rédaction (premier jet, publication) sont décrites dans [Rédaction](13-redaction.md) ; ici, on décrit le mécanisme commun.

## Ce que l'outil garde en mémoire, et pour combien de temps
*Exigences : FR-INFRA-API-CACHE, FR-INFRA-API-CACHE-PURGE, FR-INFRA-EXTERNAL-API-CACHE, FR-INFRA-GET-OR-FETCH, FR-INFRA-KEYWORD-METRICS, FR-INFRA-PAA-CACHE, FR-INFRA-SCRAPE-CORPUS-NEUTRE*

Un cache (une mémoire temporaire des réponses déjà obtenues) évite de payer deux fois la même question à un service externe. Avant chaque appel payant, l'outil regarde s'il a déjà la réponse ; il n'appelle le service qu'en cas d'absence ou d'expiration, puis garde la nouvelle réponse. Tout ce qui est gardé ici est commun à tous les articles et à tous les cocons.

| Ce qui est gardé | Durée de validité |
|---|---|
| Mesures de marché d'un mot-clé (volume, difficulté, CPC, concurrence, intention, suggestions Google, questions PAA) | Permanente ; remesurée au prochain besoin au-delà de 7 jours |
| Questions PAA d'un mot-clé | 1 jour ; une liste vide n'est jamais gardée |
| Données DataForSEO d'un mot-clé (brief) | 7 jours |
| Relevé des 10 premières pages Google (titres, texte) | 1 heure en mémoire, 7 jours une fois enregistré |
| Relevé des trois premiers résultats (mots-clés candidats du Cerveau) | 7 jours |
| Suggestions longue traîne, scan Radar | 7 jours |
| Découverte de mots-clés (sources) | 24 heures pour le relevé brut ; reprise d'une découverte sauvegardée : voir § 11 |
| Discussions de communautés | 48 heures |
| Validation de douleur, Search Console | 1 jour |
| Suggestions Google (alphabet, questions, intentions, prépositions) | 1 heure |

Règles :
- Une réponse expirée n'est jamais resservie. Une purge supprime les réponses expirées toutes les heures, en arrière-plan.
- Une nouvelle mesure partielle d'un mot-clé ne remplace pas une valeur connue par « absent ».
- Les questions PAA gardées sont resservies seulement si elles vont assez profond ; sinon, l'outil interroge de nouveau Google.
- Les Lieutenants et le Lexique lisent le même relevé des pages concurrentes. Une page en erreur (404, délai de 10 secondes dépassé) est notée vide ; les autres pages du même relevé sont gardées.
- Le brief DataForSEO et l'audit des mots-clés du cocon proposent de rafraîchir : l'outil ignore alors ce qu'il a gardé et refait l'appel.

> **En situation.** Arnaud a mesuré « audit site web » pour un article la semaine dernière. Il ouvre le Capitaine d'un autre article qui le propose : le volume, le CPC et la difficulté s'affichent sans appel DataForSEO. Huit jours après la mesure, le prochain besoin déclenche une nouvelle mesure.

## Reprendre une découverte de mots-clés
*Exigences : FR-INFRA-KEYWORD-DISCOVERIES*

Le bandeau de reprise (« Charger », « Rafraichir ») est décrit dans [Moteur — Discovery](06-discovery.md) (« Sauvegarde et reprise »). La découverte gardée est commune à tous les articles et n'expire pas : seul « Rafraichir » l'efface, et la découverte suivante est alors facturée.

## Retrouver son travail d'une session à l'autre
*Exigences : FR-INFRA-ARTICLE-STRATEGIES, FR-INFRA-COCOON-STRATEGIES, FR-INFRA-MICRO-CONTEXTS, FR-INFRA-KEYWORDS-SEO, FR-INFRA-PAA-EXPLORATIONS, FR-INFRA-LIEUTENANT-EXPLORATIONS, FR-INFRA-LOCAL-ENTITIES*

Tout ce que l'utilisateur décide est enregistré aussitôt, sans bouton « Sauvegarder ».

| Travail | Portée | Ce qui est gardé |
|---|---|---|
| Stratégie d'un article (écrite par le mode automatique ; aucun écran ne l'édite, voir § 9) | L'article | Les réponses validées et le nombre d'étapes faites |
| Stratégie d'un cocon (Cerveau) | Le cocon, partagée par ses articles | Cible, douleur, angle, promesse, appel à l'action |
| Micro-contexte | L'article | Angle, ton, consignes, longueur visée |
| Pool de mots-clés | Le cocon | Mot-clé, type, statut (suggéré, validé, écarté) |
| Questions PAA jugées au Capitaine | L'article | Question, réponse, correspondance avec la douleur, qualité |
| Propositions de lieutenants | L'article | Mot-clé, raisonnement, sources, niveau de titre suggéré, score, indicateurs du moment, statut (proposé, verrouillé, écarté, archivé) |

Règles :
- Rejuger une même question PAA remplace l'ancien résultat, sans doublon. À la réouverture du Capitaine, les questions déjà jugées s'affichent annotées.
- Les propositions de lieutenants reviennent triées par score décroissant, les scores absents (« — ») en bas.
- Le pool de mots-clés n'accepte que les types Pilier, Intermédiaire, Spécialisé, Moyenne traine et Longue traine. Un autre type est refusé : « Type de mot-clé inconnu : « … ». Attendus : Pilier, Intermédiaire, Spécialisé, Moyenne traine, Longue traine. » Un ancien niveau écrit en minuscules (« pilier ») est compris à la lecture.
- Ajouter au pool un mot-clé déjà visé par un autre cocon est refusé : « Le mot-clé « X » est déjà utilisé dans le cocon « Y » : deux cocons qui visent le même mot-clé se font concurrence. Choisissez-en un autre au Moteur. » Le remplacement d'un mot-clé, lui, ne fait pas cette vérification.
- Quand l'utilisateur n'a pas choisi de longueur, celle que vise le premier jet est enregistrée dans le micro-contexte ; un choix déjà fait n'est jamais écrasé.
- Le référentiel des lieux locaux (régions et autres noms de la zone, quartiers et communes, lieux connus, entreprises) est livré avec l'outil. Il décrit aujourd'hui Toulouse et ne se modifie pas depuis l'interface.

## La bascule « MOCK » / « RÉEL »
*Exigences : FR-INFRA-RUNTIME-MODE*

Le bouton « MOCK » / « RÉEL », ce qu'il bascule et ses limites sont décrits dans [Intégrations externes](14-integrations.md) (« Le bouton « MOCK / RÉEL » ») ; la vue d'ensemble est au § 5.

## La pile d'activité « Coûts API »
*Exigences : FR-INFRA-COST-LOG-STORE, FR-INFRA-API-WRAPPER, FR-INFRA-API-STREAM*

Une pastille flottante, présente sur tous les écrans, affiche le coût cumulé de la session et le nombre d'appels. Déployée, elle devient le panneau « Coûts API » : total, bouton « Effacer », et la liste des entrées, les plus récentes en haut.
- Chaque appel IA ajoute une ligne : action, coût estimé, modèle, jetons entrés → sortis, heure. Chaque ligne se retire par sa croix « × ».
- Les lectures et écritures des mots-clés d'un article et des explorations Capitaine et Lieutenants ajoutent une ligne (type d'opération, table, nombre de lignes, durée). Les autres opérations en base n'y apparaissent pas.
- Une erreur connue ajoute une ligne rouge : « Quota DataForSEO atteint » (« Rechargez vos crédits sur dataforseo.com, puis relancez votre action. »), « Quota IA atteint » (« Attendez quelques secondes ou basculez AI_PROVIDER dans votre .env (claude, gemini, openrouter). »), « Modèle IA surchargé » (« Le modèle est temporairement indisponible. Nouvelle tentative dans quelques instants. »).
- Le panneau montre aussi la dépense DataForSEO de la fenêtre en cours face à son plafond, relue toutes les 15 secondes (voir § 20) ; un refus du plafond n'y est pas inscrit.
- La pile vit dans le navigateur : un rechargement de la page la vide. Elle ne contient pas le contenu des requêtes ; elle n'a ni filtre, ni durée des appels DataForSEO, ni seuil d'alerte sur les opérations en base.

Les textes longs de l'IA (premier jet, sommaire, panneaux d'avis, actions contextuelles) s'affichent au fil de l'eau. Le coût final arrive dans la pile à la fin du flux. Si l'utilisateur annule, l'affichage s'arrête sans message d'erreur ; la génération continue toutefois côté serveur jusqu'à son terme.

## Une donnée absente n'est jamais un zéro
*Exigences : FR-INFRA-SCORE-MODULE, FR-INFRA-NO-SCORE-FALLBACK, FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-DISPLAY-DASH, FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-SCORING-NULLSAFE*

Un indicateur que DataForSEO n'a pas fourni, ou un score non calculable, reste « absent » jusqu'à l'écran.

| Valeur | Affichage |
|---|---|
| Absente | « — » (tiret cadratin) |
| Score 84 | « 84 » |
| Volume 1 234 | « 1.2k » |
| CPC 1,5 | « 1.50 € » |
| Difficulté 42,4 | « 42 » |
| Pourcentage 0,42 (ratio) | « 42 % » |

Règles :
- Un volume mesuré à 0 s'affiche « 0 » ; un volume inconnu s'affiche « — ».
- Dans un tri, une valeur absente est toujours placée en bas, que le tri soit croissant ou décroissant.
- Une moyenne ignore les valeurs absentes : la moyenne de 10, absent et 30 vaut 20. Sans aucune valeur, la moyenne est absente.
- Le score composite d'un mot-clé (volume, difficulté, CPC, concurrence) se calcule sur les indicateurs connus, leurs poids étant répartis entre eux. Sans aucun indicateur, il est absent.
- Sans volume, ni PAA, ni suggestion Google, le verdict du Capitaine est « GRAY » (« Données insuffisantes »), pas « NO-GO ». « NO-GO » (« Aucun signal détecté ») exige des mesures qui valent toutes zéro.
- La validation d'une douleur sans aucune source exploitable classe le mot-clé « incertaine », pas « froide ».
- Écart connu : le tableau des mots-clés associés du brief de rédaction et l'audit du cocon reçoivent encore 0 quand DataForSEO ne dit rien.

## Messages d'erreur du serveur
*Exigences : FR-INFRA-ERROR-HANDLER*

Quand le serveur reconnaît l'erreur, il la signale avec un message en français (les codes techniques sont dans le design, [Conventions](../design/01-architecture.md)) :

| Situation | Message |
|---|---|
| Quota DataForSEO épuisé | « Quota DataForSEO atteint. Rechargez vos crédits puis relancez. » |
| Plafond de dépense DataForSEO atteint | « Plafond de dépense DataForSEO atteint ($x / $y sur n min)… » |
| Quota du fournisseur d'IA | le message du fournisseur |
| IA surchargée | « Le modèle IA (…) est surchargé. Nouvelle tentative dans quelques instants. » |
| Autre erreur | un message, jamais une trace technique |

Cette traduction s'applique au brief DataForSEO, à l'audit du cocon, au scan d'un mot-clé, à l'analyse SERP, aux PAA et à toute erreur non interceptée. Les autres actions interceptent leurs erreurs et renvoient une erreur générique : un quota y apparaît comme une erreur ordinaire. Avant d'en arriver là, une saturation de l'IA déclenche d'abord le repli vers un autre fournisseur.

Une demande incomplète ou mal formée est en général refusée avec un message qui dit ce qui manque ; certaines actions du Moteur et du Cerveau lisent encore leur demande sans la vérifier.

## Les étapes de progression d'un article
*Exigences : FR-INFRA-WORKFLOW-CHECKS-CONSTANTS*

Un article avance par sept étapes nommées, toujours les mêmes partout :

| Étape | Accordée quand | Gardée par une porte |
|---|---|---|
| Discovery faite | une sélection est envoyée au Radar | non |
| Radar fait | un scan Radar renvoie un résultat | non |
| Capitaine verrouillé | le capitaine est verrouillé | « verrouiller le capitaine » |
| Lieutenants verrouillés | un premier lieutenant est retenu | « valider les lieutenants » |
| Structure validée | la structure H1/H2/H3 est validée | « valider la structure » |
| Lexique validé | un premier terme est retenu | « valider le lexique » |
| Premier jet accepté | le premier jet passe sa porte | « accepter le premier jet » |

Règles :
- Les pastilles de progression ne comptent que les six premières étapes (le Moteur).
- Une étape gardée par une porte n'est enregistrée que si la porte passe (ou si chaque point est dérogé). Enregistrer toute la progression d'un coup n'y échappe pas : chaque étape nouvelle passe par sa porte.
- Retirer « Capitaine verrouillé » ou « Lieutenants verrouillés » retire aussi « Structure validée » : la structure repose sur eux.
- « Premier jet accepté » est collante : enrichir le texte ne la retire pas. C'est elle qui rend un article « rédigé ».
- Un ancien nom d'étape (des familles retirées du Cerveau et de la Rédaction) est toléré à la lecture et ignoré à l'affichage ; il ne peut plus être écrit.

## Ce qu'est un pilier, un intermédiaire, un spécialisé
*Exigences : FR-INFRA-TYPE-RULES-SSOT*

Le type d'un article fixe ses règles. Une seule définition les porte ; le brief, la recommandation de longueur, la rédaction, les consignes d'IA, les alertes SEO, les portes et le mode automatique la lisent.

| Règle | Pilier | Intermédiaire | Spécialisé |
|---|---|---|---|
| Longueur visée (mots) | 2 500 | 1 800 | 1 200 |
| Longueur admise | 1 800 à 3 500 | 1 200 à 2 500 | 800 à 1 500 |
| Seuil « contenu trop mince » | 1 500 | 900 | 500 |
| H2 de fond (hors introduction et conclusion) | 6 à 8 | 4 à 6 | 3 à 5 |
| Seuil « trop peu de chapitres » (tous les H2) | 5 | 3 | 2 |
| H3 par H2 | 2 à 3 | 2 à 3 | 2 à 3 |
| Lieutenants candidats proposés | 8 à 12 | 6 à 10 | 4 à 8 |
| Lieutenants retenus : au moins – au plus (le minimum couvre les recherches voisines ; le maximum est ce que l'IA garde après son tri) | 3 – 5 | 2 – 5 | 1 – 4 |
| Questions de FAQ | 4 à 6 | 3 à 5 | 3 à 4 |
| H2 qui peuvent citer la ville | 2 au plus | aucun | aucun |

Règles :
- Sans données concurrentes, la longueur recommandée est la longueur visée : celle qui s'affiche est celle que la rédaction vise. Un type inconnu vise 2 000 mots.
- Le sommaire ajoute toujours l'introduction et la conclusion aux H2 de fond ; l'alerte « trop peu de chapitres » compte, elle, tous les H2 de l'article rédigé.
- Une section de parent qui résume un article enfant compte 150 à 250 mots.

> **En situation.** Arnaud décide qu'un pilier vise 3 000 mots. Il change cette seule valeur : le brief, la recommandation, le budget de rédaction et les règles données à l'IA disent tous 3 000.

## Les consignes données à l'IA
*Exigences : FR-INFRA-PROMPT-LOADER, FR-INFRA-PROMPT-LAYERS, FR-INFRA-COCOON-STRATEGIES, FR-INFRA-MICRO-CONTEXTS, FR-INFRA-LOCAL-ENTITIES*

Une consigne (un « prompt ») ressemble au brief d'un chef à un pigiste. L'outil en compte une cinquantaine, bâties en cinq couches :

| Couche | Contenu |
|---|---|
| 1. Identité | Qui écrit, pour qui, avec quel ton |
| 2. Contexte | Date du jour, zone du client, repères locaux, stratégie, état du cocon, article, mots-clés, micro-contexte |
| 3. Règles du type | Le texte des règles du tableau ci-dessus |
| 4. Tâche | Ce qu'on attend |
| 5. Contrat de sortie | La forme attendue, vérifiée à la réception |

Limite connue : six consignes courtes, écrites directement dans le code, échappent encore à ces couches et à leurs contrôles (le tri de pertinence et l'analyse stratégique de Discovery, le classement du Radar, l'analyse d'écart de contenu, la recommandation de longueur, le juge des questions PAA).

Règles :
- Aucune consigne n'écrit une année ou un lieu. La date arrive sous la forme « 25 septembre 2026 » (heure de Paris), avec l'année ; la zone est celle de la configuration du client.
- Les repères locaux (« Autres noms de la zone », « Quartiers et communes », « Lieux connus ») ne sont donnés que s'ils décrivent la zone du client : un lieu rattaché à une région n'est proposé que si la zone la nomme (accents, majuscules et tirets ignorés) ; les lieux sans région (aujourd'hui, Toulouse) seulement si la zone nomme l'une de leurs régions. Les entreprises ne sont jamais proposées. Une zone vide ou une base illisible retire le bloc, sans erreur.
- Un bloc facultatif disparaît, titre compris, quand l'information qu'il annonce est vide.
- Le texte de l'utilisateur (article, section, chapitre, sélection, consigne libre) entre tel quel mais neutralisé : ce qui ressemble à une instruction (« Human: », balise système, accolades doubles) est désamorcé, et le texte est encadré comme contenu utilisateur. Les réponses de stratégie tapées au Cerveau ne sont pas encadrées, mais un `{{…}}` ou un `$1` qu'elles contiennent reste du texte.
- La stratégie du cocon arrive une seule fois dans les consignes des panneaux IA du Moteur (sauf l'avis sur un candidat Capitaine) et des mots-clés candidats. Le sommaire, le premier jet, les passes d'enrichissement et la réécriture reçoivent la stratégie de l'article, à défaut celle du cocon. La réduction ne reçoit que la stratégie de l'article, souvent vide. Les actions contextuelles, la méta, la relecture de la langue et Discovery ne reçoivent aucune stratégie.
- Le micro-contexte (angle, ton, consignes) arrive dans le sommaire, l'explication du brief et le premier jet ; le premier jet reçoit aussi la longueur visée. Sans angle, il n'est pas transmis.
- Une consigne qui attend une information absente, ou reçoit une information qu'elle n'utilise pas, arrête l'appel pendant le développement et les tests ; en production, l'écart est journalisé et l'appel continue.

## L'état du cocon dans les consignes
*Exigences : FR-INFRA-COCOON-CONTEXT*

Trois consignes reçoivent l'état du cocon, lu au moment de l'appel : les mots-clés candidats d'un nouvel article (Cerveau), la structure H2/H3 (Moteur) et le premier jet (Rédaction). Exemple pour l'intermédiaire « Auditer son site web » :

```
## Cocon « Croissance digitale »
- Pilier « Le guide de la croissance digitale » (mot-clé « croissance digitale pme ») — rédigé
  - Section « Audit de site » → intermédiaire « Auditer son site web » (mot-clé « audit site web ») — à rédiger
  - Section « Choisir son hébergeur » → pas encore d'article

## Cet article dans le cocon
- Il naît de la section « Audit de site » de « Le guide de la croissance digitale » (pilier).
  Ce que « Le guide de la croissance digitale » en dit déjà :
  > Un audit repère les pages lentes et les contenus en double…
  Cet article développe en profondeur ce que cette section résume : il ne la répète pas.
```

Règles :
- Le mot-clé d'un article est son capitaine verrouillé, sinon son mot-clé suggéré. « rédigé » veut dire « Premier jet accepté ».
- Les articles non-piliers sans parent sont listés sous « Articles sans parent dans l'arbre (créés avant lui) ». Un cocon vide dit : « Le cocon est vide : cet article en sera le pilier… ».
- L'extrait de la section du parent est coupé à 1 200 caractères environ.
- Un article dont des sections ont déjà leur article reçoit « Ses sections qui ont déjà leur propre article : … », à résumer et à relier.
- Si l'état est illisible, la structure et le premier jet partent sans lui ; la proposition de mots-clés candidats échoue.
- Limites : les lieutenants et structures des autres articles ne sont pas décrits ; un spécialisé rattaché à un intermédiaire lui-même sans parent n'apparaît pas ; les passes d'enrichissement, la méta et les actions contextuelles ne reçoivent pas l'état du cocon.

## Les portes de qualité et l'alarme graduée
*Exigences : FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER*

Une porte juge les données au moment d'un geste. Il y en a six : « verrouiller le capitaine », « valider les lieutenants », « valider la structure », « valider le lexique », « accepter le premier jet », « publier ». Le serveur est le seul juge ; l'écran affiche son verdict. Chaque point relevé porte un niveau :

| Niveau | Libellé | Pour passer |
|---|---|---|
| 🟠 attention | « Attention » | cocher « J'ai lu » |
| 🔴 risque | « Risque » | choisir « Pourquoi passer outre ? » (« Longue traîne assumée », « Donnée manquante dans l'outil », « Mot-clé de marque », « Autre ») et écrire « Votre raison » (au moins 20 caractères) |
| ⛔ technique | « À corriger » | rien : « Ce point doit être corrigé : il ne se déroge pas. » |

L'alarme s'ouvre au-dessus de tout, une seule à la fois :
- Titre : « Avant de verrouiller le capitaine », « Avant d'accepter le premier jet », « Avant de publier »…
- Introduction selon le pire niveau : « n points à regarder. Un défaut ⛔ se corrige avant de continuer : aucune dérogation n'est possible. » ; « … Lisez-les : une case cochée suffit pour continuer. » ; « … Vous pouvez passer outre, mais en expliquant pourquoi : votre raison est enregistrée. »
- Pour chaque point : message, « Le risque : … », l'extrait concerné, « À la place : » et des pistes quand l'outil en a. Un compteur « n / 20 » suit la raison.
- Boutons : « Revenir corriger » (n'enregistre rien ; Échap fait de même) et « J'ai lu, je continue » (que des 🟠), « Je prends la responsabilité et je continue » (au moins un 🔴) ou « Correction nécessaire » (au moins un ⛔, toujours grisé). Le bouton reste grisé tant qu'un point n'a pas sa réponse ; il affiche « Enregistrement… » pendant l'envoi.
- Un clic à côté de l'alarme ne la ferme pas : une raison en cours de saisie ne se perd pas. Le focus reste dans l'alarme et revient ensuite à l'élément de départ.
- Les dérogations déjà posées sur la porte sont rappelées dans « 🛡 n dérogation(s) déjà posée(s) ».

Le serveur revérifie chaque dérogation et peut la refuser ; le motif s'affiche sous le point : « Choisissez pourquoi vous passez outre. », « Expliquez votre choix en au moins 20 caractères (n pour l'instant). », « Un défaut technique ne se déroge pas : il faut le corriger. », « Cette alerte n'existe plus : les données ont changé, relancez la vérification. ». Quand tout est accepté, l'alarme se ferme et le geste reprend (une seule fois).

Règles :
- Une dérogation vaut pour un point et pour les données examinées à ce moment. Si ces données changent (autre capitaine, lieutenants, structure, lexique, texte ou méta modifiés), elle tombe et le point revient.
- Un point qui vise plusieurs éléments (plusieurs lieutenants en conflit, plusieurs termes génériques, plusieurs lieutenants absents de la structure, plusieurs articles recoupés) se déroge élément par élément.
- Un voisin du cocon sans rapport, créé après coup, ne fait pas tomber une dérogation ; un voisin qui prend l'un de nos mots-clés, si. Explorer un nouveau candidat capitaine ne la fait pas tomber non plus.
- Chaque dérogation est enregistrée : moment, porte, point, niveau, catégorie, raison. L'auteur n'est pas enregistré (outil à un seul utilisateur). Une dérogation tombée reste enregistrée comme historique.
- Une étape refusée n'est pas enregistrée (« Étape non validée : n point(s) à traiter. ») ; une publication refusée ne change pas le statut (« Publication refusée : n point(s) à traiter avant de publier. »). Le refus vaut aussi pour une demande qui ne passe pas par l'écran.
- À la publication, les dérogations encore valables des portes Capitaine, Lieutenants, Structure et Lexique reviennent en 🟠 pour être reconfirmées ; celles du premier jet ne reviennent pas (la publication rejuge le texte). Le détail de la porte du premier jet et de la porte de publication est décrit dans [Rédaction](13-redaction.md).
- Le mode automatique demande les mêmes étapes. Sur un refus, il s'arrête : « Étape « … » refusée par la porte … : », un point par ligne avec son icône, puis « Décidez dans le Moteur (corriger, ou déroger en expliquant pourquoi), puis relancez le run. » (« la Rédaction » pour le premier jet). Il ne déroge jamais.
- L'audit du projet rejoue la porte de publication sur chaque article rédigé. Un refus donne un avertissement, pas une erreur : « La porte de publication refuserait cet article : n point(s) (⛔ a 🔴 b 🟠 c). ». Chaque dérogation est listée : « 🛡 [porte · point] verrouiller le capitaine : Longue traîne assumée — « raison » » (« lu » pour un accusé 🟠).

> **En situation.** Arnaud verrouille « rénovation grange pierre Gers », jamais mesuré. L'alarme dit en 🔴 « Aucun volume de recherche mesuré ». Il tape « peu » : le compteur affiche 3 / 20 et le bouton reste grisé. Il choisit « Longue traîne assumée » et écrit « demandes réelles reçues par téléphone chaque mois » : le capitaine est verrouillé. À la publication, cette dérogation revient pour être reconfirmée. S'il avait changé de capitaine entre-temps, elle serait tombée.

## Les garde-fous du développement
*Exigences : FR-INFRA-CHECK-HEALTH, FR-INFRA-DEPENDENCY-CRUISER, FR-INFRA-NO-SCORE-FALLBACK, FR-INFRA-LOGGER, FR-INFRA-HEALTH-CHECK, FR-INFRA-DB-CONNECTION-CHECK, FR-INFRA-ZOD-SHARED*

Ces garanties servent le développeur ; l'utilisateur en voit seulement l'effet (moins de régressions).
- L'audit du projet (lancé avant chaque livraison) enchaîne le lint rapide, les types, les tests purs, l'audit du contenu et la fraîcheur du schéma de la base. Une commande d'hygiène complète enchaîne lint, types, cycles d'import, code mort et règles d'architecture ; un contrôle rouge la rend rouge.
- Les règles d'architecture interdisent au code de l'interface d'importer le code du serveur, au module de scores d'être importé autrement que par son point d'entrée, et tout cycle d'import.
- Écrire « valeur absente ⇒ 0 » sur un score ou un indicateur de marché (volume, difficulté, CPC, concurrence, densité) est refusé au commit et par l'audit complet.
- Le serveur tient un journal à quatre niveaux (DEBUG, INFO, WARN, ERROR), avec heure, fichier d'origine et icône, réglable dans un fichier de configuration.
- Le serveur répond à une question de santé (« ok ») dès qu'il écoute ; les tests d'intégration l'attendent avant de démarrer.
- Au démarrage, le serveur teste la base. Succès : « PostgreSQL connected ». Échec : une piste adaptée (service arrêté et commande pour le lancer sous Windows, identifiants refusés, base absente à créer). Le serveur démarre quand même.
