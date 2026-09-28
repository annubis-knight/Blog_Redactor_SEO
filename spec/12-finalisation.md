---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Finalisation

La Finalisation est l'unique onglet de « 3 Finaliser ». On y relit, sans pouvoir les modifier, les quatre choix de la phase Valider, avant de passer à la Rédaction. L'onglet est toujours accessible. Il dit ce qui manque au lieu de bloquer.

## Le récapitulatif
*Exigences : FR-FIN-RECAP, FR-FIN-CHECK*

En-tête :
- « ✅ Prêt pour la Rédaction » si les quatre verrous sont posés, sinon « ⏳ Préparation en cours » ;
- « Récapitulatif des décisions validées pour {titre}. » ;
- s'il manque un verrou : « Étapes restantes : … ».

Quatre sections repliables, ouvertes par défaut :

| Section | Contenu | Si vide |
|---|---|---|
| Capitaine | le mot-clé Capitaine enregistré | « — » |
| Lieutenants (N) | chaque Lieutenant retenu, son niveau de titre suggéré (H2, H3) et, s'il existe, le raisonnement de l'IA | « Aucun lieutenant verrouillé. » |
| Structure (N H2) | les titres H1, H2 et H3 dans l'ordre de lecture, avec leur niveau ; les H3 en retrait ; N compte les H2, introduction et conclusion comprises | « Aucune structure validée. » |
| Lexique (N termes) | les termes retenus, en pastilles | « Aucun terme validé. » |

La section Structure montre la structure enregistrée, validée ou non. C'est l'en-tête et le point « Structure » qui disent si elle est validée. Le récapitulatif suit les autres onglets en direct : un Capitaine changé ailleurs apparaît ici sans rechargement. Aucune action de l'onglet n'ajoute ni ne retire d'étape.

## Passer à la Rédaction
*Exigences : FR-FIN-LINK-REDACTION, FR-MOT-SOFT-GATING, FR-FIN-CHECK*

Deux boutons mènent à la Rédaction et obéissent à la même règle :
- « Aller à la Rédaction → », en bas du récapitulatif ;
- « Continuer vers la Rédaction → », en bas du Moteur quand l'onglet Finalisation est affiché.

Tant qu'un des quatre verrous manque (Capitaine, Lieutenants, Structure, Lexique), les deux sont grisés. Leur infobulle liste ce qui manque, dans cet ordre : « Étapes restantes : Capitaine à verrouiller, Lieutenants à verrouiller, Structure à valider, Lexique à valider ». Le dernier verrou posé les active dans la même seconde. Actifs, leur infobulle dit « Continuer vers la Rédaction ». Un clic ouvre la Rédaction du cocon sur l'article choisi. De retour au Moteur, rien n'est perdu.

> **En situation.** Sur un article où seul le Capitaine est verrouillé, le bouton du bas reste grisé. Son infobulle dit « Étapes restantes : Lieutenants à verrouiller, Structure à valider, Lexique à valider ». Quand le dernier terme du Lexique est retenu, le sixième point se remplit et les deux boutons s'activent, sans passer par l'onglet Finalisation.
