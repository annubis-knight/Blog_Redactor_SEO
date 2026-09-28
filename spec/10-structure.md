---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Structure

L'onglet « Structure » vient entre Lieutenants et Lexique. Il bâtit le plan de l'article : son titre H1, ses chapitres H2 et leurs sous-parties H3. Une fois validé, ce plan devient le sommaire de la Rédaction.

## Ouvrir l'onglet
*Exigences : FR-HN-TAB*

- En tête : « Structure de l'article » et une aide (« … L'introduction et la conclusion s'ajoutent d'elles-mêmes. »).
- Sans lieutenant retenu : « Retenez d'abord au moins un lieutenant dans l'onglet Lieutenants : la structure se construit à partir d'eux. » Aucune structure ne peut être demandée. Sinon, les lieutenants retenus s'affichent en pastilles.
- La structure enregistrée devient la copie de travail.
- L'analyse des concurrents du capitaine n'est que relue en base, même ancienne. Pendant la lecture : « Lecture de la structure des concurrents… ». Si elle manque : « Les concurrents n'ont pas encore été analysés : l'analyse partira avec « Générer la structure ». » Si elle échoue : « Structure des concurrents indisponible : … ».
- Statut : « ✅ Structure validée : elle sert de sommaire à la rédaction. » quand l'étape est accordée et la copie inchangée ; « La structure a changé depuis sa validation : enregistrez-la puis validez-la de nouveau. » quand la copie diffère.
- Changer d'article recharge la copie de travail et relit l'analyse des concurrents.

## Générer, verrouiller, régénérer
*Exigences : FR-HN-TAB, FR-LIE-EXTRACT-HEADINGS*

- Sans structure : « Aucune structure pour cet article. Générez-la : l'IA part des lieutenants retenus. » et le bouton « Générer la structure ». Avec une structure : la liste H1/H2/H3 et « Régénérer la structure ». Les deux boutons sont grisés sans lieutenant retenu ou pendant une génération.
- Si l'analyse des concurrents manque, un clic sur ces boutons la lance d'abord (payante si elle n'a pas été faite depuis 7 jours).
- L'IA reçoit : les lieutenants retenus, les titres concurrents vus sur au moins deux pages (« H2: texte (nx) »), les titres verrouillés, la douleur, les règles du type, la stratégie et l'état du cocon (ses autres articles et ce qu'ils traitent).
- Consignes données à l'IA : H1 contenant le capitaine en entier ; chapitres de fond seulement, sans introduction ni conclusion ; chaque lieutenant retenu dans un H2 ou un H3 ; titres verrouillés repris tels quels ; un chapitre qui touche un sujet déjà traité par un autre article du cocon le résume et y renvoie.
- La réponse doit contenir une liste de titres. Sinon, l'erreur s'affiche et la structure affichée reste en place. Les titres vides ou sans niveau lisible sont écartés.
- Chaque titre a un cadenas (« Verrouiller — l'IA conservera ce titre tel quel »). Un H3 verrouillé sous un H2 non verrouillé est transmis comme titre isolé. Les verrous qui ne correspondent plus à aucun titre tombent. Les verrous ne sont pas enregistrés : ils sont perdus au rechargement.
- La section repliée « Structure Hn concurrents » liste la récurrence des titres du capitaine : « H2 texte n/total (x%) » et une barre proportionnelle ; sans titre : « Aucun heading extrait des concurrents. »
- Les titres ne se retouchent pas à la main dans l'onglet ; la retouche fine se fait dans le sommaire de la Rédaction.

## Enregistrer et valider
*Exigences : FR-HN-TAB*

- « Sauvegarder la structure » enregistre la copie sans la valider (« Sauvegardée » pendant 2 secondes). Si l'étape était accordée, elle est retirée, même si rien n'a changé.
- « Valider la structure » (grisé sans structure ou pendant une opération ; info-bulle « Générez d'abord une structure ») enchaîne :
  1. enregistrer la structure ; en cas d'échec, tout s'arrête, sans message à l'écran ;
  2. écrire le sommaire de la Rédaction : H1 de la structure en tête (sinon le titre de l'article), une « Introduction » et une « Conclusion » ajoutées sauf si la structure en porte déjà, niveaux ramenés à H2 ou H3 ;
  3. si le sommaire en place a été retouché depuis la dernière structure validée, une confirmation demande « Le sommaire de la Rédaction a été retouché depuis la dernière structure validée. Le remplacer par cette structure ? ». Refusé : le sommaire est gardé, la pile d'activité note « Sommaire de la Rédaction conservé », et la validation continue ;
  4. si le sommaire ne peut pas être enregistré : « Le sommaire de la Rédaction n'a pas pu être enregistré : la structure n'est pas validée. » et arrêt ;
  5. recalculer la longueur conseillée : elle n'est écrite que si aucune longueur n'a été choisie ; la pile d'activité note « 💡 Longueur conseillée : N mots » (« Valeur choisie conservée » sinon) ;
  6. demander l'étape « Structure validée » à la porte.
- Refus de la porte : l'alarme « Avant de valider la structure » s'ouvre. La porte ne vérifie rien en continu : elle juge au clic.

## La porte de la structure
*Exigences : FR-HN-LOCK-GATE*

La porte juge la structure enregistrée, avec les règles du type d'article.

| Point | Niveau |
|---|---|
| Aucune structure enregistrée (article rédigé sans l'onglet) — seule alerte | 🔴 |
| Des titres mais aucun H2 — seule alerte | ⛔ |
| Pas de H1, ou H1 vide | ⛔ |
| Un titre vide | ⛔ |
| Un H3 avant tout H2 | ⛔ |
| H1 sans le capitaine en entier (tous ses mots, pluriel et variantes admis) | 🔴 |
| Nombre de H2 de fond hors du type : pilier 6-8, intermédiaire 4-6, spécialisé 3-5 ; message « n H2 de fond … (introduction et conclusion en plus) », avec « trop de chapitres » ou « trop peu » | 🔴 |
| Plus de H2 de fond citant la ville du client que le type n'en admet (pilier 2, sinon 0) | 🔴 |
| Pilier : un H2 contient le capitaine d'un autre article du cocon et le développe en H3 ; piste « Garder ce H2 sans H3 : un résumé de 150 à 250 mots et un lien vers « … » » | 🔴 |
| Pilier : même recoupement sans H3 — « résumez-le et liez-le » | 🟠 |
| Lieutenant retenu absent de tous les H2 et H3 (moins des trois quarts de ses mots) | 🟠 |
| H2 « Introduction » ou « Conclusion » écrit dans la structure | 🟠 |
| Plus de 3 H3 sous un H2 | 🟠 |

- Les H2 de fond excluent l'introduction et la conclusion, reconnues à leurs premiers mots (« Introduction », « Conclusion », « En conclusion », « Pour conclure », « Pour finir », « En résumé »).
- La ville est le premier segment de la zone du client (« Toulouse, Occitanie » → Toulouse).
- Chaque lieutenant absent et chaque article recoupé se déroge séparément. Une dérogation tombe si les titres, le type, le capitaine, les lieutenants, la ville ou les articles recoupés changent.
- La porte est rejouée à la publication.

## Cascade, articles anciens, mode automatique
*Exigences : FR-HN-TAB, FR-HN-LOCK-GATE*

- Retirer l'étape Capitaine ou Lieutenants retire aussi l'étape « Structure validée ».
- Enregistrer les lieutenants ou le lexique ne touche pas la structure enregistrée.
- Une structure envoyée au serveur doit avoir la forme « niveau 1 à 6, texte » ; sinon elle est refusée. Un titre vide passe l'enregistrement : c'est la porte qui le refuse.
- Le mode automatique demande une structure à l'IA à partir des lieutenants qu'il a retenus, l'enregistre, demande l'étape à la même porte et s'arrête sur un refus sans déroger. Son sommaire est tiré de cette structure. Une reprise relit la structure enregistrée ; le Moteur n'est sauté que si la structure et le lexique sont validés.
- Pour les articles aux lieutenants validés sans étape « Structure validée », une réconciliation (en simulation par défaut) liste ceux sans structure et n'accorde l'étape qu'aux structures qui passent la porte.

> **En situation.** Pour son pilier « création site internet », Arnaud a retenu 4 lieutenants. Il ouvre Structure, clique « Générer la structure » : le H1 contient le capitaine, 6 H2 reprennent ses lieutenants, sans introduction ni conclusion. Il verrouille deux H2, régénère, puis clique « Valider la structure ». L'alarme signale en 🟠 que « Audit de site » recoupe un article du cocon : il le lit et passe. Dans la Rédaction, le sommaire commence par le H1, puis « Introduction », les chapitres et « Conclusion ».

## Limites connues (Structure)

- Remplacer directement le capitaine verrouillé par un autre ne retire pas l'étape « Structure validée » : la publication, qui rejoue la porte, voit alors un H1 sans le nouveau capitaine.
- Un recoupement n'est détecté que pour un pilier, et seulement si le H2 contient le capitaine de l'autre article en entier.
- Seule la ville de la zone du client est comptée.
- Un échec d'enregistrement de la structure à la validation n'est pas annoncé à l'écran.
