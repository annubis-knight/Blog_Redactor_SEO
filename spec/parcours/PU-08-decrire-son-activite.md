---
title: Parcours — Décrire son activité une fois
id: PU-08
last_updated: 2026-09-29
synced_with:
  - spec/requirements.md
  - spec/18-recette-manuelle.md
---

# PU-08 — « Je décris mon activité une fois, et l'IA en tient compte partout »

**But :** que chaque proposition de l'IA (stratégie, mots-clés, texte) parle de son métier, de sa zone et de ses clients, sans avoir à le retaper pour chaque cocon ni chaque article.
**Quand :** au premier démarrage de l'outil, ou quand PropulSite change d'offre ou de zone ; puis à chaque nouveau cocon, quand Arnaud pose sa stratégie au Cerveau avant d'aller au Moteur et à la Rédaction.
**Départ :** la configuration du thème est vide ou périmée ; le cocon n'a pas encore de stratégie.
**Arrivée :** une configuration enregistrée (entreprise, client type, communication) et une stratégie de cocon validée, visibles dans « Contexte envoyé à Claude » au Cerveau et à la Rédaction, et dans la barre « Contexte stratégique » du Moteur et de la Rédaction ; des textes générés qui citent la zone configurée.
**Recette :** module 02 (CER-26, CER-28, CER-R1, CER-R2, CER-R5), module 03 (MOT-R2), module 09 (INFRA-4, INFRA-5, INFRA-8, INFRA-R4).
**Test automatique :** aucun (manque)

## Les étapes

### 1. Ouvrir la configuration du thème
**Exigences :** FR-CER-THEME-CONFIG ⚠

Sur l'accueil, la roue dentée en haut à droite (info-bulle « Configuration du thème ») ouvre l'écran « Configuration du Thème ». Il n'existe qu'une configuration, pour tout l'outil et tous les cocons. Elle se lit en trois perspectives : « Votre entreprise » (« Positionnement », « Offres & Services »), « Votre client type » (« Profil », « Besoins & Douleurs ») et « Votre communication » (« Ton & Vocabulaire »).

### 2. Décrire son activité et laisser Claude remplir les champs
**Exigences :** FR-CER-THEME-CONFIG ⚠, FR-EXT-AI-MULTI-PROVIDER

Dans « Remplissage automatique par IA », tu décris ton entreprise en texte libre : métier, services, clientèle, ville, ton. « Remplir les champs avec Claude », grisé tant que le texte est vide, affiche « Analyse en cours... », puis remplit les champs, listes comprises, enregistre et vide le texte libre. Il remplace toute la configuration : si l'ancienne compte, fais d'abord sauvegarder la base. En MOCK, le remplissage est simulé à partir de ton texte, sans rien payer.

### 3. Relire et compléter champ par champ
**Exigences :** FR-CER-THEME-CONFIG ⚠, FR-INFRA-LOCAL-ENTITIES

Tu relis et corriges chaque champ : « Promesse principale », « Localisation », « Différenciateurs », « Services », « CTA principal », « Secteur d'activité », « Description de l'audience cible », « Points de douleur », « Style de communication », « Vocabulaire métier »… Les listes s'enrichissent par Entrée ou « + », et se vident par « × ». Tout s'enregistre seul 1,5 seconde après la dernière frappe ; « Sauvegarder » (« Sauvegarde... ») enregistre aussitôt. Soigne la « Localisation » : c'est elle qui donne à l'IA la zone du client et ses repères locaux.

### 4. Vérifier au Cerveau ce que l'IA reçoit
**Exigences :** FR-CER-THEME-CONFIG ⚠, FR-CER-STEPS-COCOON ⚠

Ouvre le Cerveau d'un cocon et déplie « Contexte envoyé à Claude » : les blocs « Entreprise » (« Promesse », « Lieu », « Services »…), « Client type » (« Audience », « Secteur », « Douleurs »…) et « Communication » (« Ton », « Vocable ») reprennent ta configuration. Chaque suggestion, fusion, sous-question ou enrichissement du Cerveau la reçoit, avec le silo, le cocon et les réponses déjà validées. Une valeur changée dans la configuration apparaît ici dès la prochaine ouverture du Cerveau.

### 5. Poser la stratégie du cocon
**Exigences :** FR-CER-STEPS-COCOON ⚠, FR-INFRA-COCOON-STRATEGIES ⚠, FR-CER-SAISIE-PRESERVEE ⚠

Aux étapes « Cible », « Douleur », « Angle », « Promesse » et « CTA », tu écris ta réponse, demandes au besoin « Demander une suggestion à Claude », puis valides par « Valider ▾ » (« Mon texte », « La suggestion » ou « Fusionner les deux »). C'est « Suivant » qui enregistre ; à l'étape « Articles », « Terminer le brainstorm » marque le Cerveau du cocon comme terminé. La stratégie vaut pour tous les articles du cocon, d'une session à l'autre.

### 6. La retrouver au Moteur
**Exigences :** FR-CER-CONTEXT-FOR-MOTEUR ⚠, FR-MOT-STRATEGY-INJECTION ⚠, FR-MOT-PAINPOINT-INJECTION ⚠, FR-CER-THEME-CONFIG ⚠

À l'ouverture du Moteur du cocon, la barre repliable « Contexte stratégique » montre, en lecture seule, « Cible », « Douleur », « Angle », « Promesse », « CTA » : rien à ressaisir. Les analyses de l'IA aux Lieutenants, à la Structure et au Lexique relisent cette stratégie à chaque appel, avec la douleur de l'article choisi. Discovery, lui, ne reçoit pas la stratégie, mais trie et analyse ses mots-clés avec le secteur, l'audience, les services et la promesse de ta configuration.

### 7. La retrouver à la Rédaction
**Exigences :** FR-CER-CONTEXT-FOR-MOTEUR ⚠, FR-CER-MICRO-CONTEXT ⚠, FR-INFRA-MICRO-CONTEXTS

La page Rédaction du cocon montre la même barre « Contexte stratégique ». Dans la rédaction guidée d'un article, « Contexte strategique » › « Contexte envoyé à Claude » affiche ta configuration et « Stratégie cocon validée ». Le sommaire, le premier jet et les passes d'enrichissement reçoivent la stratégie du cocon, ou celle de l'article quand le mode automatique en a écrit une. Pour un seul article, « Micro-contexte article » ajoute un angle, un ton et des consignes ; « Suggerer par IA » les propose à partir de toute ta configuration.

### 8. Vérifier dans un texte généré
**Exigences :** FR-INFRA-LOCAL-ENTITIES, FR-INFRA-COCOON-CONTEXT, FR-RED-ENRICH-SOURCES

En MOCK, les textes sont préparés d'avance : cette vérification n'a de sens qu'en RÉEL. Lis un premier jet : il s'adresse à la cible de la stratégie, accroche par sa douleur, et ses repères locaux appartiennent à la zone de la « Localisation » ; sans localisation, il n'en cite aucun. Un article enfant développe la section de son parent sans la recopier. La passe « Sources » cherche ses sources depuis la ville de ta zone.

## Ce qui peut mal tourner

### « Remplir les champs avec Claude » échoue, ou écrase tout
**Exigences :** FR-CER-THEME-CONFIG ⚠, NFR-OBS-KNOWN-ERRORS ⚠

Un échec s'affiche à côté du bouton, en anglais, sans dire quoi faire. Un succès remplace toute la configuration, sans retour possible depuis l'écran : ce que tu avais saisi à la main est perdu, sauf sauvegarde de la base.

### Le ton et les offres n'atteignent ni le Moteur ni la Rédaction
**Exigences :** FR-CER-THEME-CONFIG ⚠, FR-INFRA-PROMPT-LAYERS ⚠

Hors Discovery, les consignes du Moteur et de la Rédaction ne reçoivent ni le positionnement, ni les offres, ni le ton : seule la « Localisation » y parvient, comme zone du client. Pourtant, « Contexte envoyé à Claude », dans la rédaction guidée, affiche toute la configuration. Et les consignes de la Rédaction décrivent en dur l'identité de PropulSite (sites web sur mesure pour TPE et PME, vouvoiement) : décrire une autre activité dans la configuration ne change pas la voix du premier jet. Au Cerveau même, la configuration n'est envoyée que si l'audience, la promesse, le secteur ou le style est rempli.

### Une stratégie vide, incomplète, ou un micro-contexte sans angle
**Exigences :** FR-CER-CONTEXT-FOR-MOTEUR ⚠, NFR-INT-STRATEGY-OPTIONAL ⚠, FR-CER-SAISIE-PRESERVEE ⚠, FR-CER-MICRO-CONTEXT ⚠

Sans stratégie, l'IA travaille quand même, de façon générique ; mais une stratégie sans aucune valeur validée affiche une barre « Contexte stratégique » vide, et en passant d'un cocon à l'autre la barre du précédent reste affichée le temps du chargement. Une réponse tapée pendant un enregistrement reste à l'écran sans entrer dans la stratégie, et un texte validé puis abandonné sans « Suivant » est perdu au rechargement. Le micro-contexte n'est transmis que si « Angle differenciant » est rempli : un ton ou des consignes seuls sont ignorés.

### Une zone que le référentiel des lieux ne décrit pas
**Exigences :** FR-INFRA-LOCAL-ENTITIES

Le référentiel de lieux livré avec l'outil décrit aujourd'hui Toulouse, et il ne se modifie pas depuis l'écran. Avec une « Localisation » ailleurs, par exemple Bordeaux, l'IA reçoit la zone mais aucun repère local : mieux vaut aucun exemple qu'un quartier toulousain dans un article bordelais. Les entreprises du référentiel ne sont jamais proposées.

### Le mode automatique ne lit pas la configuration
**Exigences :** FR-CER-THEME-CONFIG ⚠, FR-INFRA-ARTICLE-STRATEGIES

Le robot demande à chaque run un « Contexte business (optionnel) » pour écrire son brief et choisir l'emplacement : ces deux temps ne lisent pas la configuration du thème. Retape ton activité à cette question, sinon le brief et l'emplacement se décident sans elle. Ce brief devient la stratégie de l'article, qui passe ensuite devant celle du cocon dans les consignes de la Rédaction.

## Défauts connus sur ce parcours

- FR-CER-THEME-CONFIG — hors Discovery, qui reçoit le secteur, l'audience, les services et la promesse, les consignes du Moteur et de la Rédaction ne reçoivent ni le positionnement, ni les offres, ni le ton : seule la localisation y parvient, comme zone du client ; au Cerveau, la configuration n'est envoyée que si l'audience, la promesse, le secteur ou le style est rempli.
- FR-CER-STEPS-COCOON — à l'étape CTA, « + » (approfondir) échoue sans rien afficher : aucune sous-question n'apparaît.
- FR-INFRA-COCOON-STRATEGIES — l'avis IA sur un candidat Capitaine ne la reçoit pas : l'écran n'envoie pas le cocon.
- FR-CER-SAISIE-PRESERVEE — une réponse tapée pendant un enregistrement reste affichée mais n'est plus dans la stratégie : le « Suivant » d'après enregistre un champ vide.
- FR-CER-CONTEXT-FOR-MOTEUR — une stratégie sans aucune valeur validée affiche une barre « Contexte stratégique » vide ; en passant d'un cocon à l'autre, la barre du cocon précédent reste affichée le temps du chargement.
- FR-MOT-STRATEGY-INJECTION — l'avis IA sur un candidat Capitaine et tout l'onglet Discovery travaillent sans la stratégie du cocon.
- FR-MOT-PAINPOINT-INJECTION — un article choisi dans « Articles publiés » arrive sans sa douleur : Discovery ne l'affiche ni ne l'utilise, et le Score Pertinence du Capitaine est calculé sans elle.
- FR-CER-MICRO-CONTEXT — le micro-contexte n'est transmis que si l'angle est rempli : un ton ou des consignes seuls sont ignorés ; et l'angle provisoire écrit d'office à la validation de la structure part tel quel à l'IA ; un échec d'enregistrement n'est jamais signalé.
- NFR-OBS-KNOWN-ERRORS — le dépassement du budget DataForSEO n'est pas inscrit dans la pile d'activité ; une erreur inconnue affiche son message brut, pas un message générique ; au Cerveau, l'échec d'une suggestion, d'une fusion, d'une sous-question, d'un enrichissement, d'une régénération ou de l'enregistrement par « Suivant » n'affiche rien ; l'échec de « Remplir les champs avec Claude » et un aperçu refusé s'expliquent en anglais.
- FR-INFRA-PROMPT-LAYERS — plusieurs consignes d'IA sont encore écrites dans le code et échappent aux couches, au contrôle des variables et à la référence des consignes : tri de pertinence et analyse stratégique de Discovery, classement du Radar, analyse d'écart de contenu, recommandation de longueur, consigne du juge des questions PAA ; la régénération du titre et du mot-clé d'une ligne de la carte écrit ses règles par niveau dans le code, et ne les envoie jamais.
- NFR-INT-STRATEGY-OPTIONAL — quand la douleur manque, Discovery envoie le mot-clé racine à sa place, et la suggestion de longues traînes envoie « (non defini) » sans accent.
