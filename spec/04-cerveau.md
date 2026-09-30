---
status: référence
last_updated: 2026-09-30
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Cerveau

Le Cerveau est le premier atelier d'un cocon. On y pose, une fois pour tout le cocon, sa stratégie : à qui il parle, quelle douleur il soulage, son angle, sa promesse, son appel à l'action (CTA). Puis on y construit le cocon, un article à la fois, à partir de son pilier (l'article principal, qui présente tout le sujet).

On y entre par la carte « Cerveau » de la page du cocon. Deux réglages d'article décrits plus bas se font hors du Cerveau :
- le micro-contexte et la longueur visée, dans la Rédaction ;
- la configuration du thème, depuis l'accueil.

## Se repérer dans le Cerveau
*Exigences : FR-CER-STEPS-COCOON*

- **La barre d'étapes**, en haut de l'application : « Cible », « Douleur », « Angle », « Promesse », « CTA », « Articles ».
  - Une étape déjà atteinte se rouvre d'un clic ; les suivantes restent fermées.
  - Une étape passée par « Suivant » est marquée faite.
- **« Contexte envoyé à Claude »**, un encadré repliable. Il montre tout ce que l'IA reçoit : thème, silo, cocon, configuration du thème, réponses déjà validées. Un second encadré, « Articles du cocon (N) », liste les articles déjà créés du cocon, rangés par niveau (« Pilier », « Intermédiaire », « Spécialisé ») ; les propositions de la carte indicative n'y figurent pas.
- **En bas** : « Précédent », puis « Suivant ». À l'étape Articles, « Suivant » devient « Terminer le brainstorm ».
- **Messages** : « Chargement de la stratégie... » pendant le chargement ; « Cocon introuvable. » pour un cocon inconnu.

**Terminer.** « Terminer le brainstorm » marque le Cerveau du cocon comme terminé, enregistre la stratégie, puis ramène à la page du cocon. C'est ce qui ouvre, dans la Rédaction, l'étape de génération des articles.

**Progression.** Le Cerveau compte les étapes franchies par « Suivant », validées ou non. À la réouverture, il reprend sur la dernière étape atteinte.

**Enregistrement.** La stratégie s'enregistre à chaque « Suivant », à « Terminer le brainstorm », et à chaque action de l'étape Articles qui touche la carte.
- « Précédent » et un clic dans la barre d'étapes n'enregistrent pas.
- Un texte validé puis abandonné sans aucun de ces gestes est perdu au rechargement.

## Les cinq étapes de stratégie
*Exigences : FR-CER-STEPS-COCOON, FR-CER-SAISIE-PRESERVEE*

Chaque étape pose une question, accompagnée d'une courte explication :

| Étape | Question |
|---|---|
| Cible | « À qui parlez-vous ? » |
| Douleur | « Quelle douleur adressez-vous ? » |
| Angle | « Quel est votre angle ? » |
| Promesse | « Quelle promesse faites-vous ? » |
| CTA | « Call-to-Action » |

**Répondre et valider.**
1. On écrit dans « Votre réponse » (« Décrivez... »). La réponse est gardée quand on quitte le champ.
2. « Demander une suggestion à Claude » (« Chargement... » pendant l'appel) affiche une « Suggestion Claude : », modifiable (crayon) et régénérable (flèches).
3. « Valider ▾ » ouvre trois choix :
   - « Mon texte », si la réponse n'est pas vide ;
   - « La suggestion », s'il y en a une ;
   - « Fusionner les deux », s'il y a les deux : l'IA fusionne les deux textes, et le résultat devient le texte validé.
4. « Valider » reste grisé sans réponse ni suggestion, et pendant qu'une suggestion arrive.

**Une fois l'étape validée :**
- le texte validé s'affiche au-dessus de la carte, avec une coche et un crayon « Modifier le texte validé » ;
- la carte se replie sous « Modifier ma réponse ».

**Approfondir.** Le bouton « + » (« Approfondir ») sous la carte ajoute une sous-question générée par l'IA, sans remplacer les précédentes.
- Chaque sous-question a sa réponse, sa suggestion et sa validation, et se supprime (« Supprimer cette sous-question »).
- Une sous-réponse validée enrichit le texte validé de l'étape : l'IA l'y intègre. Sans texte validé, elle le devient directement.
- Les sous-réponses validées accompagnent aussi l'étape dans le contexte envoyé à l'IA.

**Saisie préservée.** La stratégie enregistrée se charge après l'ouverture de l'écran.
- Si l'utilisateur a déjà commencé à écrire et que la valeur enregistrée est vide, sa saisie reste.
- Changer d'étape recrée le champ : rien ne passe d'une étape à l'autre.

**Ce que l'IA reçoit.** À chaque suggestion, fusion, sous-question ou enrichissement, l'IA reçoit :
- le cocon, le silo, les réponses déjà validées ;
- la configuration du thème ;
- la liste des articles déjà créés du cocon ; les propositions de la carte n'y figurent pas.

## L'étape Articles : construire le cocon, et sa carte indicative
*Exigences : FR-CER-COCOON-PROGRESSIVE, FR-CER-STEPS-COCOON*

L'étape Articles montre deux blocs, l'un sous l'autre :

1. **« Construire le cocon »** : l'arbre réel des articles. C'est lui, et lui seul, qui crée les articles.
2. **« Carte indicative du cocon »** : la proposition de plan de l'IA. Elle guide, se retouche, et ne crée aucun article.

La carte et l'arbre sont deux listes distinctes. Un pilier créé sous un autre titre que celui de la carte y apparaît en plus : la carte montre alors deux piliers.

## Construire le cocon : l'arbre réel
*Exigences : FR-CER-COCOON-PROGRESSIVE, FR-CER-AIGUILLAGE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-PARENT-WRITTEN-GATE*

**En tête** : « Un cocon grandit depuis son pilier… », puis, le temps du chargement, « Chargement de l'arbre du cocon… ». Si l'arbre ne se charge pas : « L'arbre du cocon n'a pas pu être chargé : … » et « Réessayer ».

**Cocon sans pilier.** Seule action possible : « Ce cocon n'a pas encore de pilier. Commencez par lui : les autres articles naîtront de ses sections. » et le bouton « Créer le pilier ».

**L'arbre.** Chaque pilier, puis ses intermédiaires dans l'ordre de ses sections.
- **Chaque article** montre :
  - son niveau (« Pilier », « Intermédiaire », « Spécialisé ») et son titre ;
  - son état, « Rédigé » ou « À rédiger » ;
  - un lien vers sa rédaction, « Ouvrir sa rédaction » ou « Le rédiger ».
- **Ses sections** sont les chapitres (titres H2) de son texte, hors introduction, conclusion et FAQ. Sans texte, ce sont ceux de sa structure validée au Moteur. Sans aucun des deux : « Pas encore de section : elles apparaissent quand sa structure est validée ou son texte rédigé. »
- **Chaque section** montre, au choix :
  - l'article qui en est né : un lien, et son état ;
  - ou le bouton « Créer l'article de cette section ».
- **Un spécialisé** n'a pas de section à offrir : il n'a pas d'enfant.
- **Parent non rédigé** : ses boutons de section sont grisés, et un message dit « Validez d'abord le premier jet de « … » : un article ne naît que d'un parent rédigé. »
- **Un enfant dont la section a disparu du parent** (chapitre renommé ou supprimé) reste affiché sous son parent.

**Le niveau d'un article découle de sa place.**
- Un pilier naît dans un cocon vide.
- Un intermédiaire naît d'une section du pilier.
- Un spécialisé naît d'une section d'un intermédiaire.

On ne choisit pas le niveau, et il ne se change pas ensuite. Il règle les seuils de mots-clés au Moteur et la longueur visée en Rédaction :

| Niveau | Longueur visée | Fourchette |
|---|---|---|
| Pilier | 2 500 mots | 1 800 à 3 500 |
| Intermédiaire | 1 800 mots | 1 200 à 2 500 |
| Spécialisé | 1 200 mots | 800 à 1 500 |

**Les règles de construction** sont toutes bloquantes (⛔), sans dérogation. Chaque refus s'affiche avec son message :

| Situation | Message |
|---|---|
| Un second pilier | « Ce cocon a déjà son pilier : « … ». » |
| Un pilier avec un parent | « Un pilier n'a pas d'article parent : il est la tête du cocon. » |
| Un autre article avant le pilier | « Un cocon commence par son pilier : créez-le d'abord. » |
| Un enfant sans parent | « Un article intermédiaire naît d'une section de son parent : choisissez-la. » (ou « spécialisé ») |
| Un parent hors du cocon | « Le parent choisi n'est pas dans ce cocon. » |
| Un parent du mauvais niveau | « Un article spécialisé naît d'un intermédiaire, pas d'un pilier (« … »). » |
| Pas de section | « Choisissez la section de « … » dont naît cet article. » |
| Une section que le parent n'a pas | « « … » n'est pas une section de « … ». » |
| Une section déjà prise | « La section « … » a déjà donné l'article « … ». » |
| Un parent pas encore rédigé | « « … » n'est pas encore rédigé : son premier jet doit passer sa porte avant de donner naissance à un article. » (l'alarme s'ouvre sur le parent) |

Deux titres de section se comparent sans tenir compte de la casse, des espaces ni de la ponctuation finale.

> **En situation.** Arnaud démarre un cocon « Rénovation énergétique ». Seul « Créer le pilier » est proposé. Une fois le pilier créé puis rédigé, ses sections apparaissent. Sous la section « Isolation des combles », « Créer l'article de cette section » fera naître un intermédiaire.

## Choisir le mot-clé d'un nouvel article
*Exigences : FR-CER-KEYWORD-REAL-DATA, FR-PIE-AI-GENERATION, FR-CER-CREATION-HONNETE*

Un clic sur « Créer le pilier » ou sur « Créer l'article de cette section » ouvre un panneau :
- « Le pilier du cocon » pour le pilier ;
- « Créer l'article intermédiaire né de la section « … » de « … » » pour un enfant (ou « l'article spécialisé »).

Demander des candidats est payant (IA et DataForSEO) : cela n'arrive que sur ce clic.

**Avant l'appel payant**, l'outil vérifie ce qui empêcherait la création : l'ordre du cocon, un parent non rédigé, une section inconnue ou prise, un parent spécialisé. Il refuse alors avec le message, par exemple : « « … » n'est pas encore rédigé : validez d'abord son premier jet, puis créez ses articles enfants. »

**La proposition.** Pendant l'attente : « Recherche de mots-clés candidats, puis mesure de leurs données réelles (quelques secondes)… ».
- L'IA propose 3 à 5 candidats. Elle reçoit :
  - la stratégie du cocon et l'état de son arbre ;
  - pour un enfant, la section du parent et ce qu'elle en dit ;
  - les règles du niveau.
- Chaque candidat a :
  - un mot-clé ;
  - un titre d'article qui le contient ;
  - une raison ;
  - la difficulté du lecteur qu'il règle ;
  - l'intention éditoriale attendue : informationnelle, commerciale, transactionnelle ou navigationnelle.
- Un candidat qui reprend le mot-clé d'un article du cocon, ou celui d'un autre candidat, est écarté ; 5 au plus sont gardés.
- Sans candidat exploitable : « L'IA n'a proposé aucun candidat exploitable : relancez la proposition. », avec « Relancer la proposition ».

**La mesure.** Chaque candidat est mesuré avant d'être montré.
- **Volume** : « N recherches par mois ».
- **Difficulté** : « N/100 ».
- **Intention** de recherche : « Informationnelle (on cherche à comprendre) », « Commerciale (on compare des prestataires) », « Transactionnelle (on veut acheter ou contacter) », « De navigation (on cherche un site précis) ».
- **« En tête de Google »** : les trois premiers résultats (position, site, titre).
- L'outil relit d'abord ses mesures de moins de 7 jours. Il ne paie que les volumes manquants, en une seule demande groupée, puis les premiers résultats manquants, mot-clé par mot-clé.
- Une valeur absente s'affiche « — », jamais un zéro inventé.
- Un candidat que l'outil n'a pas pu mesurer est marqué « Non mesuré : ses données n'ont pas pu être récupérées, il ne peut pas être choisi. », et sa case est grisée.
- L'aide « Comment lire ces chiffres ? » explique le volume, la difficulté, l'intention et les premiers résultats.
- En mode simulé, les candidats sont mesurés comme en réel, par le bac à sable de DataForSEO.

**Choisir et créer.**
1. Rien n'est choisi d'office.
2. Choisir un candidat préremplit « Titre de l'article » avec son titre. Le titre reste modifiable (3 caractères au moins, 200 au plus) ; l'adresse de la page en est tirée.
3. « Créer l'article » (« Création… ») reste grisé sans candidat mesuré choisi ou avec un titre trop court.

**Ce que reçoit l'article créé :**
- le mot-clé choisi ;
- la difficulté du lecteur du candidat, sinon celle d'une proposition de même titre sur la carte ;
- l'intention éditoriale d'une proposition de même titre sur la carte, sinon celle du candidat.

L'intention éditoriale du candidat n'est pas affichée dans le panneau : la ligne « Intention » montre l'intention mesurée chez Google.

**Après la création :**
- « « … » est créé. » ;
- le mot-clé rejoint le pool du cocon, avec son niveau ;
- l'article s'inscrit sur la carte indicative, marqué « Créé », sur la proposition de même titre s'il y en a une ;
- l'arbre se recharge.

**Refus et avertissements :**
- Création refusée : « « … » n'a pas été créé : » suivi de la raison. Par exemple « L'adresse /… est déjà prise par un autre article : changez le titre ou l'adresse. », ou « Le mot-clé « … » n'a jamais été mesuré : choisissez-le parmi les candidats mesurés. ».
- Parent non rédigé, alarme refermée sans l'assumer : « « … » n'a pas été créé : « … » doit d'abord être rédigé (son premier jet doit passer sa porte). »
- Mot-clé refusé par le pool, l'article restant créé : « « … » est créé, mais son mot-clé n'a pas rejoint le pool du cocon : Le mot-clé « … » est déjà utilisé dans le cocon « … » : deux cocons qui visent le même mot-clé se font concurrence. Choisissez-en un autre au Moteur. »
- Carte non enregistrée, l'article restant créé : « « … » est créé, mais la carte du cocon n'a pas été enregistrée (…) : il n'apparaîtra au Moteur qu'après un nouvel enregistrement. »

## Rattacher un article hors de l'arbre
*Exigences : FR-CER-COCOON-PROGRESSIVE*

Sous l'arbre, « Articles hors de l'arbre » liste les articles sans place dans l'arbre, créés avant la construction progressive. Chacun montre son niveau, son titre (un lien vers sa rédaction) et son état.

1. « Rattacher » (absent pour un pilier) ouvre « Section qui annonce son sujet ».
2. On choisit une section dans la liste « Choisir une section… ». Elle ne propose que les sections libres des parents rédigés du niveau juste au-dessus, sous la forme « « section » — parent ».
3. « Rattacher ici » (« Rattachement… ») confirme ; « Annuler » referme.

Sans aucune section libre possible, « Rattacher » est grisé : « Aucune section libre d'un parent rédigé du bon niveau ».

Les règles sont celles d'une création. Un refus s'affiche sous le formulaire, « L'article n'a pas été rattaché : … », et rien ne change.

En cas de succès :
- « L'article est rattaché à la section « … ». » ;
- l'article rejoint l'arbre ;
- sa ligne sur la carte prend son nouveau parent.

**Limite connue.** Un article déjà placé ne change pas de parent depuis l'écran.

## La carte indicative du cocon
*Exigences : FR-CER-STEPS-COCOON, FR-CER-COCOON-PROGRESSIVE, FR-CER-TYPE-TOLERANT, FR-CER-AIGUILLAGE, FR-PIE-AI-GENERATION, FR-PIE-CERVEAU-OVERRIDE*

En tête : « Carte indicative du cocon », puis « Carte indicative : elle guide les articles à créer, elle n'en crée aucun. On crée le pilier, puis chaque article depuis une section de son parent rédigé. »

**« Générer avec Claude ▾ ».** Ce menu fait grandir la carte. Il commence par « Sur la carte seulement : aucun article n'est créé. » :

| Choix | Quand | Effet |
|---|---|---|
| « Le pilier » | toujours affiché ; grisé si la carte a déjà un pilier titré (« Déjà sur la carte : un seul pilier par cocon. ») | Claude pose le pilier fondateur, qui couvre le sujet principal du cocon |
| « 1 article intermédiaire » | seulement si la carte a un pilier titré | Claude en ajoute un sous le pilier |
| « 1 article spécialisé » | seulement si la carte a un intermédiaire titré | Claude en ajoute un sous l'intermédiaire qui en a le plus besoin |
| « La carte complète du cocon » | toujours affiché | tous les articles d'un coup, à la place de la carte actuelle |

- Pendant une génération, le bouton affiche « Génération... » et reste désactivé.
- Échap ou un clic à côté referme le menu.
- Le mot-clé de chaque article ajouté est proposé par Claude, sans mesure.

**La carte complète** se construit en trois temps, suivis par une barre :
1. « Structure (Pilier + Inter) » : le pilier et les intermédiaires.
2. « Recherche PAA » : les questions que Google affiche sous « Autres questions posées », sur des recherches proposées par l'IA pour chaque intermédiaire. À défaut, celles du nom du cocon.
3. « Articles Spécialisés » : les spécialisés, nourris de ces questions.

Messages possibles :
- « Erreur lors de la génération des articles. Réessayez. » ;
- « Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés. » ;
- « N articles Spécialisés tronqués — seuls les articles complets sont affichés. ».

La carte complète est payante (plusieurs appels d'IA, plus la recherche des questions) : elle ne part que sur un clic.

**« Sujets suggérés ».** Un encadré replié propose des sujets à couvrir.
- Ils sont générés d'office à la première arrivée à l'étape Articles, si la carte n'en a aucun. Il faut au moins une réponse validée, sinon : « Complétez au moins les premières étapes stratégiques avant de générer les sujets. »
- On les coche, les retire, en ajoute (« Ajouter un sujet… »), les régénère.
- Un « Contexte additionnel (optionnel) » accompagne les sujets.
- Les sujets cochés et le contexte orientent la première phase de la carte complète.

**Trois colonnes** : « Pilier », « Intermédiaire », « Spécialisé ». Les spécialisés sont groupés par intermédiaire parent ; ceux sans parent reconnu sont dans « Non rattachés ».

**Chaque ligne** montre :
- son titre (« Sans titre » s'il est vide) et la marque « Créé » pour un article déjà créé ;
- une pastille « ⚠ N » ou « ✓ » : la composition du mot-clé et les alertes de structure, détaillées au survol, en phrases (« Ce spécialisé n’est rattaché à aucun intermédiaire : rattachez-le avec « Lien ». ») ;
- des flèches pour revenir aux titres déjà proposés ;
- son adresse « /… ».

Un clic déplie la ligne, qui montre :
- le « Titre », le « Mot-clé suggéré » et le « Slug » (l'adresse), chacun modifiable au crayon, avec son historique ;
- la « Douleur » et la raison ;
- le sélecteur « Intention éditoriale » : « Non défini », « Informationnelle (explique, guide, éduque) », « Commerciale (comparatif, sélection) », « Transactionnelle (achat, conversion) », « Navigationnelle (page produit/marque) ». Le choix s'enregistre aussitôt ; pour un article créé, il est aussi écrit sur l'article.

Les actions de la ligne :
- « Régénérer ▾ » : « Titre », « Mot-clé » ou « Slug », par l'IA ;
- « Lien » (« Rattacher à un intermédiaire », sur un spécialisé seulement) : change son parent, sur la carte seulement ;
- « Supprimer ».

**Retoucher.** Renommer un article déjà créé le renomme aussi dans l'outil. Le mot-clé et l'adresse ne changent que sur la carte.

**Retirer** un article créé le détache du cocon ; il reste dans l'outil. S'il a encore des enfants, le retrait est refusé : « « … » n'a pas été retiré : Des articles sont nés de ses sections : retirez-les d'abord du cocon, sinon ils perdraient leur parent. », et la carte le garde.

**Ajouter à la main.** Sous chaque colonne, « + Ajouter un pilier / un intermédiaire / un spécialisé » propose :
- « Article vide » ;
- « Article complémentaire » : Claude l'écrit ;
- « Article guidé... » : Claude l'écrit à partir d'une consigne (« Sujet ou contexte... »).

Ces ajouts n'exigent pas de parent sur la carte.

**Alertes de la carte :**
- une carte sans pilier : « Aucun article Pilier dans la liste. » ;
- un intermédiaire sans lien vers un pilier existant ;
- un intermédiaire avec moins de 2 ou plus de 3 spécialisés ;
- un spécialisé sans lien vers un intermédiaire existant.

**Le niveau rendu par l'IA** est compris quelle que soit son écriture : « Pilier », « pilier », « PILIER », avec ou sans accent. La consigne d'un « Article guidé... » part telle quelle, caractères spéciaux compris.

**Limites connues.**
- La carte complète, les régénérations et le choix dans un historique ne s'enregistrent qu'à la prochaine action qui enregistre la carte. Recharger la page avant les perd.
- La carte complète remplace aussi les articles déjà créés qui y étaient inscrits. Or le Moteur tire sa liste d'articles de la carte : une fois la carte enregistrée, ils en disparaissent.
- Un ajout que Claude ne réussit pas laisse une ligne vide, sans message.
- Un niveau illisible rendu par l'IA devient « Spécialisé » (ou le niveau demandé, pour un ajout), sans message.
- La carte et l'arbre ne se synchronisent pas : retoucher une proposition ne change rien dans l'arbre.

## « Rédigé » : le premier jet accepté
*Exigences : FR-CER-PARENT-WRITTEN-GATE*

Un article est « rédigé » quand il porte l'étape « premier jet accepté ».

**Comment l'étape s'obtient.** Elle s'obtient par la porte du premier jet :
- elle est accordée si la porte passe ;
- ou si l'utilisateur assume par écrit ses alertes 🔴 ;
- un défaut ⛔ (texte vide, titre principal absent…) ne se déroge pas.

La porte elle-même est décrite dans [Rédaction](13-redaction.md).

**Quand elle est demandée.**
- D'office, à la fin du premier jet, une fois le texte et sa méta enregistrés. Elle n'est pas demandée si la génération ou la méta échoue.
- Dans les deux vues de rédaction, un bandeau dit « ✓ Premier jet accepté : l'article peut donner naissance à ses articles enfants dans le cocon. ».
- Sinon, le bandeau dit « Premier jet pas encore accepté : les articles enfants de celui-ci ne peuvent pas être créés. », avec « Valider le premier jet ». Le bandeau n'apparaît pas tant que l'article n'a pas de texte.

**Ce qui la retire.** Rien : enrichir ou réécrire l'article ensuite ne la retire pas. Elle n'ajoute aucun point de progression.

**À la création d'un enfant.** Si le parent n'a pas encore l'étape, sa porte est rejouée.
- Si elle passe, l'étape est posée sur le parent, puis l'enfant est créé.
- Sinon, l'alarme s'ouvre sur le parent. L'utilisateur corrige, ou assume, et la création reprend d'elle-même. « Revenir corriger » ne crée rien.

## Mode automatique et rattrapage des anciens cocons
*Exigences : FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE, FR-CER-KEYWORD-REAL-DATA, FR-CER-CREATION-HONNETE*

**Le mode automatique** (outil en ligne de commande) suit les mêmes règles.
- Le cocon qu'on lui nomme à la question « Cocon cible » (majuscules et espaces ne comptent pas) impose l'emplacement, comme `--cocoon` ; un nom qui ne désigne aucun cocon est dit, et la question revient. Sans réponse, il propose un emplacement, soumis à la pause 1.
- Il crée l'article dans la section libre d'un parent du bon niveau dont le titre parle le plus de son sujet ; à égalité, sous un parent déjà rédigé.
- Sans parent du bon niveau, ou sans section libre, il s'arrête en le disant.
- Si le parent n'est pas rédigé, il s'arrête, sans jamais déroger à la place de l'utilisateur.
- Il ne pose aucun mot-clé à la création : le Moteur le mesure, puis le verrouille.
- Si l'adresse est déjà prise, il reprend l'article existant.
- Il enregistre une stratégie propre à l'article.
- Après le premier jet, il demande l'étape « premier jet accepté ». Sur un refus, il s'arrête et renvoie à la Rédaction — sauf une porte dont tous les points sont 🟠, que l'utilisateur peut dire avoir lue (« J’ai lu, continuer ? [o/N] »).

**Le rattrapage** des cocons d'avant la construction progressive se lance à la main.
- Par défaut, il simule ; il n'écrit qu'à la demande.
- Chaque article sans parent est rapproché du parent que désigne la carte, à défaut (pour un intermédiaire) du pilier unique du cocon.
- Puis il est rapproché de la section de ce parent qui parle de son sujet : au moins deux mots propres à la section, et au moins la moitié d'entre eux. Les mots du sujet du parent ne comptent pas.
- Une section ne donne qu'un article. Ce qui ne se rapproche pas sûrement est listé, jamais deviné.
- Il pose l'étape « premier jet accepté » sur les articles publiés, et sur ceux dont le premier jet passe la porte ; il liste les défauts des autres.

## La stratégie du cocon, au Moteur et à la Rédaction
*Exigences : FR-CER-CONTEXT-FOR-MOTEUR*

**La barre « Contexte stratégique ».** À l'ouverture du Moteur et de la Rédaction d'un cocon, cette barre repliable montre en lecture les valeurs validées du cocon : « Cible », « Douleur », « Angle », « Promesse », « CTA ».
- Une valeur vide n'est pas affichée.
- Sans stratégie enregistrée, la barre n'apparaît pas.
- La barre est lue à l'ouverture de l'écran : une modification faite au Cerveau y apparaît à la prochaine ouverture.

**Les consignes de l'IA.** Celles du Moteur et de la Rédaction qui portent la stratégie du cocon la relisent à chaque appel. Sans stratégie, elles fonctionnent quand même.

**Pas de stratégie d'article.** Aucun écran ne propose de stratégie propre à un article. Le Cerveau travaille au niveau du cocon ; seul le mode automatique enregistre une stratégie d'article.

## La douleur, fil rouge des articles
*Exigences : FR-MOT-PAINPOINT-INJECTION, FR-PAIN-IMMUTABLE-AFTER-CEREVEAU, FR-PIE-AI-GENERATION, FR-PIE-CERVEAU-OVERRIDE, FR-CAP-RELEVANCE-INTENT-SIGNAL, FR-CAP-PAINPOINT-FALLBACK*

La **douleur** est le problème concret du lecteur : ce qui le pousse à taper sa recherche dans Google. Elle se dit à la première personne, du point de vue du lecteur. Ce n'est ni un mot-clé, ni une offre.

> **En situation.** Pour l'article « Comment choisir son agence SEO locale », la douleur peut être : « Les agences me proposent des prestations standardisées sans comprendre mon secteur. » Un mot-clé comme « agence seo spécialisée immobilier » la sert ; « définition seo » ne la sert pas.

**Trois douleurs, trois portées.**

| Où | Portée | Qui la pose |
|---|---|---|
| « Points de douleur » de la configuration du thème | Le client type de l'entreprise | L'utilisateur |
| Étape « Douleur » du Cerveau | Tout le cocon | L'utilisateur, aidé de l'IA |
| La douleur de l'article | Un seul article | L'IA, avec la proposition de l'article |

**La douleur de l'article.**
- Elle naît avec la proposition. Chaque article de la carte indicative, et chaque candidat du constructeur, arrive avec la sienne.
- L'article créé reçoit celle du candidat choisi, sinon celle de la proposition de même titre sur la carte. Le mode automatique la tire du brief qu'il écrit.
- Elle se lit dans la ligne dépliée de la carte, sous « Douleur ». Le panneau des candidats ne l'affiche pas.
- Elle est fixée à la création. Aucun écran ne la modifie : ni le Moteur, ni la Rédaction, ni le Cerveau.

**Ce qu'elle oriente, au Moteur.**
- Discovery : dès 10 caractères, le tri de pertinence écarte un mot-clé qu'une personne vivant cette douleur ne taperait pas ; l'« Analyse IA Discovery » en tient compte.
- La source « Courte-traîne IA » de Discovery et les « Suggestions longue traîne » du Radar partent d'elle.
- Le Capitaine : l'avis de l'IA la garde comme fil rouge, et le Score Pertinence mesure combien un mot-clé la sert ([Capitaine](08-capitaine.md)).
- Les Lieutenants : l'IA écarte ceux qui n'éclairent pas la douleur.
- La Structure : au moins deux chapitres sur cinq y répondent.
- Le Lexique : l'IA privilégie les mots qu'emploient ceux qui la vivent, et la barre de tri propose « Pertinence douleur ».
- Le Radar, lui, l'ignore : il ne mesure que le marché.

Sans douleur, ces analyses la reçoivent comme « (non défini) » et travaillent comme d'ordinaire. Le Score Pertinence, lui, ne se calcule pas : il affiche « — ». Détail par onglet : [Moteur](05-moteur.md), « Le contexte donné à l'IA ».

**À la Rédaction**, c'est la douleur de la stratégie qui compte : celle de l'article s'il a sa propre stratégie (mode automatique), sinon celle du cocon. Le sommaire, le premier jet, l'enrichissement et l'explication du brief la reçoivent. Le premier jet ouvre sur un chapeau qui accroche par elle.

**L'intention éditoriale attendue** accompagne la douleur. Elle dit quel type de réponse l'article apporte : informationnelle, commerciale, transactionnelle ou navigationnelle. L'IA la propose avec l'article ; l'utilisateur la corrige dans la ligne dépliée de la carte (« Intention éditoriale », voir « La carte indicative du cocon »). Elle sert deux fois au Capitaine :
- dans le Score Pertinence, un écart avec l'intention que Google prête à la requête retire 10 points au signal « intention » ;
- à la porte du capitaine, l'écart déclenche une alerte : 🔴 si l'article veut informer et que Google traite la requête comme commerciale ou transactionnelle, 🟠 sinon. Sans intention choisie, un pilier est jugé comme informationnel.

**Limites connues.**
- La douleur d'un article ne se corrige nulle part, même au Cerveau. Une douleur mal proposée reste celle de l'article.
- Un article né sans douleur reste sans Score Pertinence. L'infobulle invite alors à définir une douleur, mais aucun écran ne permet de la saisir.

## Micro-contexte et longueur visée d'un article
*Exigences : FR-CER-MICRO-CONTEXT, FR-CER-WORD-COUNT-RECOMMEND*

Ces deux réglages se font dans la Rédaction, à l'étape « Brief & Structure ».

**Le micro-contexte** se trouve dans l'encadré « Micro-contexte article » :

| Champ | Saisie |
|---|---|
| « Angle différenciant » | marqué obligatoire |
| « Ton / Style » | « (optionnel) » |
| « Consignes spécifiques » | « (optionnel) » |

- Chaque champ s'enregistre quand on le quitte ; « Sauvegardé » s'affiche brièvement.
- « Suggérer par IA » (« Suggestion en cours... ») propose les trois champs. S'ils sont déjà remplis, un aperçu « Suggestion IA » montre l'avant et l'après, avec « Appliquer » ou « Annuler ». Sans capitaine, le titre de l'article sert de sujet ; un échec affiche « La suggestion n’a pas abouti. Réessayez dans un instant. ».
- Le sommaire, le premier jet et l'explication du brief reçoivent le micro-contexte. Le premier jet reçoit aussi la longueur visée.
- Le modifier ne relance aucune génération.

**La longueur visée.**
- **Au Moteur.** Valider la structure demande une recommandation :
  - elle devient la longueur de l'article si aucune n'est choisie ;
  - une valeur déjà choisie est gardée ;
  - la pile d'activité affiche « 💡 Longueur conseillée : N mots », avec sa raison et « Modifiable dans la Rédaction. » (ou « Valeur choisie conservée (N mots). »).
- **Dans la Rédaction**, « Recommandation de contenu » montre une fourchette de ±20 % autour de la longueur visée (« min – max mots »), puis « Cible : » avec « − » et « + ».
  - Les boutons changent la longueur par pas de 100 mots, de 500 à 10 000.
  - « Réinitialiser » revient à la recommandation.
  - Une valeur modifiée porte « ajusté » ; la ligne « Base : ~N mots (type …) » rappelle la recommandation.
- À l'ouverture du brief, la longueur visée du niveau s'affiche d'abord, puis la recommandation la remplace quand elle arrive.

**Le calcul de la recommandation :**

| Données disponibles | Recommandation |
|---|---|
| Ni moyenne des concurrents, ni structure | la longueur visée du niveau |
| Moyenne des concurrents | 60 % de la moyenne + 40 % de la longueur visée, dans la fourchette du niveau |
| Moyenne des concurrents et structure | l'avis de l'IA, qui tient compte de la profondeur du sommaire, ramené dans la fourchette |

**Limites connues.**
- Le micro-contexte n'est transmis que si l'angle est rempli : un ton ou des consignes seuls sont ignorés.
- Quand la validation de la structure écrit la longueur d'un article sans micro-contexte, elle écrit aussi l'angle provisoire « Angle à préciser (suggéré à la validation de la structure) ». Il part tel quel à l'IA.
- Aucun bouton ne redemande une recommandation.

## La configuration du thème
*Exigences : FR-CER-THEME-CONFIG*

On l'ouvre par la roue dentée de l'accueil. L'écran s'appelle « Configuration du Thème », avec un bouton « Sauvegarder » (« Sauvegarde... »).

**Remplir avec l'IA.** « Remplissage automatique par IA » : on décrit l'entreprise en texte libre, puis « Remplir les champs avec Claude » (« Analyse en cours... ») remplit les champs et enregistre.

**Les champs**, en trois perspectives :

| Perspective | Bloc | Champs |
|---|---|---|
| « Votre entreprise » | « Positionnement » | « Promesse principale », « Localisation », « Différenciateurs » |
| « Votre entreprise » | « Offres & Services » | « Services », « CTA principal », « Cible du CTA » |
| « Votre client type » | « Profil » | « Secteur d'activité », « Taille de l'entreprise », « Budget SEO », « Maturité digitale » |
| « Votre client type » | « Besoins & Douleurs » | « Description de l'audience cible », « Points de douleur » |
| « Votre communication » | « Ton & Vocabulaire » | « Style de communication », « Vocabulaire métier » |

- Les listes s'enrichissent par Entrée ou « + », et se vident par « × ».
- Tout s'enregistre de soi-même 1,5 seconde après la dernière saisie.
- Une seule configuration existe pour tout l'outil. Elle ne se supprime pas ; vider ses champs revient à ne pas en avoir, et aucune consigne de l'IA ne casse.

**Où va la configuration :**

| Destinataire | Ce qu'il reçoit |
|---|---|
| Consignes du Cerveau | l'entreprise, le client type et la communication (tous les champs sauf « Cible du CTA ») |
| Suggestion du micro-contexte | toute la configuration |
| Tri et analyse des mots-clés découverts (Discovery) | le secteur, l'audience, les services et la promesse |
| Toute consigne qui cite la zone du client | la « Localisation » |

**Limite connue.** Les autres consignes du Moteur et de la Rédaction (Capitaine, Lieutenants, Lexique, premier jet…) ne reçoivent ni le positionnement, ni les offres, ni le ton.
