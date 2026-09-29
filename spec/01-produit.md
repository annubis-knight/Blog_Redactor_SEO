---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Le produit

## Le produit en une page

**Blog Redactor SEO** transforme une idée d'article en article de blog prêt à publier, optimisé
pour Google (le SEO, l'art d'être bien classé dans les résultats de recherche).

**Pour qui.** Un seul utilisateur : un consultant SEO qui produit les articles d'un blog d'entreprise.
L'identité du site (nom, zone, offre, promesse) se règle dans la configuration du thème ; les
articles produits aujourd'hui sont ceux du blog de PropulSite, à Toulouse.

**Le problème.** Générer du texte est facile. Ce qui est difficile, c'est d'avoir **confiance** avant
d'écrire : le bon mot-clé, un plan qui couvre ce que Google attend, un article qui trouve sa place
dans une famille d'articles sans répéter ses voisins. Et ne pas payer deux fois la même donnée.

**Ce que fait l'outil.** Il fait traverser trois ateliers, toujours dans le même ordre :

| Atelier | Question | Ce qu'il produit |
|---|---|---|
| **Cerveau** | De quoi je parle, à qui, pourquoi ça l'intéresse, et où l'article se range ? | La stratégie du cocon, l'arbre de ses articles |
| **Moteur** | Quels mots les gens tapent-ils vraiment dans Google ? | Un capitaine, des lieutenants, une structure, un lexique, verrouillés |
| **Rédaction** | Comment j'écris tout ça ? | Le texte, son titre et sa description pour Google, l'article publié |

**Le résultat attendu.** Un article publié et exporté en HTML, rangé dans son cocon, relié à ses
voisins, dont chaque choix risqué a été vu et assumé par écrit.

**Trois principes traversent l'outil :**

- **L'utilisateur décide.** Aucun onglet n'agit seul à l'ouverture. L'IA conseille, elle ne tranche pas.
- **Rien de risqué ne passe en silence.** À chaque passage sensible, une porte de qualité vérifie.
  Elle alerte, et l'utilisateur peut passer outre en écrivant pourquoi, sauf pour un défaut objectif.
- **Rien n'est acheté deux fois.** Une donnée payante déjà obtenue est relue, pour tous les articles.

## Les utilisateurs et les deux façons de travailler

Un seul utilisateur, sur sa machine. Il n'y a ni compte, ni mot de passe, ni hébergement.

| | Application web | Mode automatique (le « robot ») |
|---|---|---|
| Rythme | Écran par écran, clic par clic | Tout s'enchaîne, avec deux pauses de validation |
| Contrôle | L'utilisateur choisit chaque mot-clé | Le robot choisit selon ses règles, l'utilisateur valide |
| Usage | Article important, sujet délicat | Production d'articles en série |

Les deux passent par le même serveur, les mêmes règles et la même base de données. Le robot est un
client du serveur, comme l'application : il ne contourne aucune porte.

## Les écrans

| Écran | À quoi il sert |
|---|---|
| Tableau de bord | Les silos, leurs cocons, les compteurs (« Silos », « Cocons », « Articles », « Progression ») ; accès à « Maillage » et « GSC » |
| Détail d'un silo | Les cocons d'un silo et leurs articles par statut |
| Page d'un cocon | « Choisissez une phase de travail : » les cartes « Cerveau », « Moteur », « Rédaction » |
| Cerveau | La stratégie du cocon et la construction de l'arbre de ses articles |
| Moteur | Les sept onglets de recherche et de validation des mots-clés d'un article |
| Rédaction | La liste des articles du cocon à rédiger et publiés |
| Article (rédaction guidée) | Brief, sommaire, premier jet, méta, acceptation du premier jet, panneaux d'analyse |
| Éditeur | Le texte de l'article, modifiable, avec score SEO en direct et actions sur la sélection |
| Aperçu | L'article au gabarit du site, et le bouton « Exporter HTML » qui le publie |
| Maillage | La matrice des liens internes entre articles |
| Post-publication (GSC) | Les performances réelles dans Google Search Console |
| Configuration du thème | L'identité du site : entreprise, zone, offre, cible |
| Page introuvable | Toute adresse inconnue ou incomplète |

La barre du haut porte, sur chaque écran sauf l'aperçu : le nom du site, la navigation de l'atelier
en cours, le bouton du mode (« MOCK » ou « RÉEL ») et l'accès à la configuration.

## Le parcours de bout en bout

### 1. Choisir le cocon

Le tableau de bord mène à un silo (un grand rayon du blog), puis à un cocon (une famille d'articles
sur un même thème). La page du cocon affiche son nombre d'articles, son avancement, et propose les
trois ateliers.

### 2. Cerveau — décider

Le Cerveau fixe la stratégie du cocon en six étapes : « Cible », « Douleur », « Angle »,
« Promesse », « CTA », « Articles ». À chaque étape, l'IA propose et l'utilisateur valide ou corrige.

À l'étape « Articles », deux outils cohabitent :

- **La carte indicative du cocon.** Le menu « Générer avec Claude » y pose le pilier, puis un
  intermédiaire, puis un spécialisé, un article à la fois, ou toute la carte d'un coup. La carte
  guide ; elle ne crée aucun article (« Sur la carte seulement : aucun article n’est créé. »).
- **« Construire le cocon ».** C'est lui qui crée les articles, dans l'arbre réel. Le pilier d'abord,
  seul. Ensuite, chaque article naît d'une section libre (un chapitre H2 sans article) d'un parent
  du niveau juste au-dessus, et seulement si le premier jet de ce parent est accepté. Son mot-clé
  se choisit parmi des candidats mesurés sur les vraies données de Google.

Un article peut aussi porter sa propre stratégie, en six étapes (cible, douleur, aiguillage, angle,
promesse, CTA). Le mode automatique l'écrit ; l'application la lit, mais aucun écran ne l'édite
aujourd'hui. Détail : [Cerveau](04-cerveau.md).

### 3. Moteur — chercher et valider les mots-clés

Le Moteur travaille sur un article choisi dans la liste du cocon. Il compte sept onglets en trois
phases, et l'utilisateur circule librement entre eux :

| Phase | Onglets | Rôle |
|---|---|---|
| ① « Générer » | « Discovery », « Radar » (facultatifs) | Récolter des idées de mots-clés et mesurer leur marché |
| ② « Valider » | « Capitaine », « Lieutenants », « Structure », « Lexique » | Verrouiller le mot-clé principal, les secondaires, le plan H1/H2/H3, le vocabulaire expert |
| ③ « Finaliser » | « Finalisation » | Relire les quatre décisions, puis « Aller à la Rédaction → » |

Six étapes se cochent en chemin : Discovery faite, Radar fait, capitaine verrouillé, lieutenants
verrouillés, structure validée, lexique validé. Quatre d'entre elles passent par une porte de
qualité (capitaine, lieutenants, structure, lexique). Le bouton « Aller à la Rédaction → » ne
s'active qu'avec les quatre verrous de la phase ② ; sinon son info-bulle liste ce qui manque
(« Étapes restantes : … »). Détail : § 10 à § 17 (Moteur).

### 4. Rédaction — écrire

La page Rédaction liste les articles du cocon. Un article ouvre sa page de rédaction guidée :

1. **Brief et sommaire.** Le sommaire part de la structure validée au Moteur.
2. **« Générer l'article ».** Le premier jet s'écrit en un seul appel, sans recherche web, et
   s'affiche chapitre par chapitre. Un chiffre sans source y est marqué « à sourcer ».
3. **Méta.** Le titre et la description pour Google.
4. **« Valider le premier jet ».** La porte du premier jet vérifie le texte. Acceptée, elle coche
   l'étape « Premier jet accepté » : l'article peut alors donner naissance à ses enfants dans le cocon.
5. **« Enrichir ».** Des passes proposent, chapitre par chapitre, des sources trouvées sur le web,
   des exemples, des tableaux, des images, une FAQ, des résumés. Chaque proposition est vérifiée,
   puis acceptée ou refusée.
6. **« Éditer l'article ».** L'éditeur montre le score SEO en direct et offre des actions sur la
   sélection (reformuler, simplifier, ajouter une statistique…).

Détail : [Rédaction](13-redaction.md).

### 5. Publier

« Visualiser l'article » (disponible quand le texte, le titre et la description existent) ouvre
l'aperçu au gabarit du site. « Exporter HTML » publie : la porte de publication rejoue les
vérifications ; si elle accepte, l'article passe au statut « Publié » et le fichier HTML se
télécharge. Si elle refuse, rien n'est publié ni exporté : « Publication annulée : corrigez les
points signalés, puis exportez à nouveau. »

Après la publication : « Maillage » montre les liens entre articles, « GSC » les performances dans
Google Search Console une fois le compte connecté.

### 6. Le mode automatique

Le robot déroule les trois ateliers à partir d'un sujet, même vague, et d'un cocon existant.

| Temps | Ce qu'il fait |
|---|---|
| Cerveau | Transforme l'idée en brief, propose un emplacement dans l'arbre et un niveau |
| Pause 1 — emplacement et brief | Rien n'est créé avant cette validation. `[Entrée]` valide, `[e]` change l'emplacement, `[r]` régénère, `[a]` abandonne |
| Moteur | Discovery, Radar, capitaine choisi à travers sa porte, lieutenants, structure, lexique ; chaque étape est demandée aux mêmes portes qu'à l'écran |
| Pause 2 — mots-clés | Capitaine, lieutenants, lexique, collisions de cannibalisation. `[Entrée]` valide, `[r]` relance le Moteur, `[a]` abandonne |
| Rédaction | Sommaire, premier jet, chapitres hors budget réécrits, méta, premier jet accepté, passe « sources », reformulation de ce qui reste sans source, liens vers les seuls articles publiés |
| Sortie | Article au statut « Brouillon » et fichier HTML écrit dans le dossier de sortie du robot |

Règles du robot :

- Il **ne déroge jamais** à une porte à la place de l'utilisateur : un refus arrête le run et dit pourquoi.
- Une cannibalisation forte (deux articles trop proches) demande de taper « oui ».
- Il sait reprendre un article interrompu, imposer un cocon, un niveau ou un capitaine, ou ne refaire
  que le maillage d'un article.
- Il n'affiche pas de score SEO : ce score se calcule à l'écran, à l'ouverture de l'article.

## Mode simulé et mode réel

Un seul interrupteur couvre toutes les sources payantes. Il se bascule par le bouton « MOCK » /
« RÉEL » de la barre du haut, ou par une option du robot.

| Source | Mode simulé (« MOCK ») | Mode réel (« RÉEL ») |
|---|---|---|
| IA (génération, analyses) | Réponses enregistrées d'avance, gratuites (recherche web imitée) | Claude, facturé (repli sur Gemini puis OpenRouter si Claude est à court de crédits, surchargé ou inutilisable ; voir § 20) |
| Données Google payantes (volumes, SERP, questions) | Bac à sable du fournisseur : gratuit, **données fausses** | Production, facturée, sous plafond de dépense |
| Suggestions Google, calculs locaux | Réels (gratuits) | Réels |

- Le mode simulé sert à tester la mécanique. Le texte produit n'a aucun rapport avec le sujet.
- Le robot démarre en mode simulé par défaut, et le dit en toutes lettres.
- Le mode est tenu par le serveur, pour tous ses clients : le dernier qui le change l'impose aux
  autres, jusqu'au redémarrage du serveur. Après un run réel du robot, l'application ouverte sur
  le même serveur travaille donc aussi en réel. À son chargement, l'application réimpose le mode
  dont elle se souvient, s'il diffère de celui du serveur.
- Sans choix explicite, le serveur suit sa configuration : simulé si l'IA simulée ou le bac à sable
  est configuré, réel sinon.
- En mode réel, un plafond de dépense sur une fenêtre de temps glissante bloque tout appel de
  données Google payant qui le dépasserait, **avant** l'appel. Le bac à sable n'est pas plafonné.

## Hors périmètre

- **Plusieurs utilisateurs, comptes, droits** : l'outil est mono-utilisateur, local.
- **Hébergement, déploiement** : tout tourne sur la machine de l'utilisateur.
- **Publication directe sur un site** : aucun CMS n'est branché. Publier = marquer l'article
  « Publié » et exporter son HTML ; la mise en ligne est manuelle.
- **Recherche libre de mots-clés hors d'un article** : le Labo et l'Explorateur ont été retirés.
  Le Moteur, sur un article, est la seule entrée.
- **SEO de l'application elle-même.**
