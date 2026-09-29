---
name: tech-spec-cocon-progressif
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C7 ; K6 soldée, D5 soldée ; découverts en documentant : K8, K9 ouverts — soldés depuis sur `fix/restes-qualite-seo` ; D7, T14 soldés)
  - _bmad-output/planning-artifacts/prd.md (FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-KEYWORD-REAL-DATA, FR-INFRA-COCOON-CONTEXT, FR-RED-LINKING-MANUAL versées ; FR-CER-BATCH-CREATE et FR-RED-INTERNAL-LINKING superseded ; amendées : FR-RED-PUBLISH-GATE, FR-RED-ENRICH-PASSES, FR-RED-DRAFT-SINGLE-PASS, FR-RED-CONTEXTUAL-ACTIONS, FR-INFRA-VERIFIER-SHARED, FR-HN-TAB, FR-MOT-CHECKS, FR-MOT-CHECKS-CONSTANTS, FR-INFRA-WORKFLOW-CHECKS-CONSTANTS, NFR-INT-COMPLETED-CHECKS-SSOT, NFR-INT-CHECKS-NAMESPACE, FR-CER-STEPS-COCOON, FR-CER-AIGUILLAGE, FR-CER-CREATION-HONNETE, FR-INFRA-PROMPT-LAYERS, NFR-INT-SERP-ONCE, FR-EXT-DATAFORSEO-SANDBOX)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-CER-COCOON-PROGRESSIVE, DESIGN-CER-PARENT-WRITTEN-GATE, DESIGN-CER-CHILD-FROM-PILLAR-H2, DESIGN-CER-KEYWORD-REAL-DATA, DESIGN-INFRA-COCOON-CONTEXT, DESIGN-RED-LINKING-MANUAL ; DESIGN-CER-BATCH-CREATE et DESIGN-RED-INTERNAL-LINKING superseded)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (qualite-seo-c7-cocon-progressif)
  - server/db/schema.sql, server/db/bootstrap.sql (régénérés par `npm run db:snapshot`)
  - docs/data-flows/articles.md, docs/data-flows/completed-checks.md, docs/data-flows/lexique.md, docs/data-flows/lieutenants.md, docs/article-id-reference.md, docs/ai-usage-map.md, docs/prompts-architecture.md, docs/moteur-data-flow.md, docs/ARCHITECTURE_FLOWS.md, docs/auto-article-cli.md, docs/ui-sections-guide.md
  - _bmad-output/planning-artifacts/architecture.md (checks par workflow, portes, décision « cocon né du pilier »)
  - docs/prompts-reference.md (généré)
---

# Tech-spec — Cocon né du pilier (C7)

## Contexte (cartographie du 2026-09-25)

| Constat | Où |
|---|---|
| Aucune relation parent/enfant en base ; l'arbre n'existe que dans le JSON de stratégie (`proposedArticles[].parentTitle`, rapproché par titre normalisé) | `schema.sql:61-87`, `cocoon_strategies.data` |
| Un seul chemin de création, en lot, sans aucune règle : un intermédiaire ou un spécialisé naît avant son pilier, sans parent | `POST /articles/batch-create` → `addArticlesToCocoon` (`data.service.ts:464-544`) |
| Rien ne dit qu'un article est « rédigé » : la porte du premier jet est consultée une fois après la génération, jamais enregistrée ; `phase = 'redaction'` dès qu'un contenu non vide est enregistré | `useArticleGeneration.ts:89-96`, `article-content.service.ts:72-79` |
| Le mot-clé d'un nouvel article est proposé par l'IA sans aucune mesure | `cocoon-add-article.md`, `useArticleProposals.addSmartArticle` |
| Chaque génération ne voit du cocon qu'une liste de voisins (titres, capitaines) | `cocoon-siblings.service.ts`, `{{cocoon_articles}}` |
| Le maillage suggère par recoupement de mots dans les titres ; l'action « lien interne » n'écrit pas dans `internal_links` | `linking.service.ts:158-231`, `useContextualActions.ts:43-88` |
| Le mode automatique crée un intermédiaire ou un spécialisé sans parent | `scripts/auto-article/phases/cerveau.ts:184-212`, `tree.ts:4-10` |

## Objectif

Un cocon se construit **article par article, à partir du pilier** : dans un cocon vide, seul le
pilier se crée ; un enfant naît d'une section (H2) de son parent, une fois le parent rédigé
(premier jet accepté) ; son mot-clé se choisit parmi 3 à 5 candidats **mesurés** (volume, SERP).
Chaque génération reçoit le même contexte du cocon.

## Décisions

1. **Colonnes** `articles.parent_id INTEGER REFERENCES articles(id) ON DELETE RESTRICT` et
   `articles.parent_section TEXT` (le titre du H2 du parent qui annonce l'enfant), index sur
   `parent_id`. Changement daté `server/db/changes/2026-09-25-article-parent.sql` (idempotent),
   appliqué puis capturé par `npm run db:snapshot`.
2. **« Rédigé » = étape enregistrée** `redaction:draft_accepted` (`REDACTION_DRAFT_ACCEPTED`),
   accordée par la porte `draft` (`CHECK_GATES`). La famille `redaction:*` revient pour cette seule
   étape (le format d'écriture l'accepte). L'écran la demande après le premier jet (au lieu de la
   simple consultation), et un bouton la redemande plus tard ; le mode automatique aussi. L'étape
   est collante : enrichir l'article ensuite (qui l'éloigne de ±15 %) ne la retire pas.
3. **Vérificateur pur** `shared/verifiers/cocoon-hierarchy.ts` — tout est ⛔ (structurel) :
   pilier d'abord, un seul pilier, parent obligatoire hors pilier, niveau du parent (intermédiaire
   ← pilier, spécialisé ← intermédiaire), même cocon, section obligatoire, section connue du
   parent, section pas déjà prise par un autre enfant.
4. **Création unitaire** `POST /api/cocoons/:cocoonId/articles` (Zod) : 409
   `HIERARCHY_VIOLATION` si le vérificateur refuse ; parent sans l'étape → la porte `draft` du
   parent est jouée : refusée → 409 `GATE_BLOCKED` (l'écran ouvre l'alarme sur le **parent**, ses
   dérogations y sont enregistrées, puis la création est rejouée) ; accordée → l'étape est posée
   sur le parent et l'enfant créé. Un mot-clé fourni doit avoir été mesuré (`keyword_metrics`),
   sinon 422 `KEYWORD_NOT_MEASURED`. `batch-create` et `addArticlesToCocoon` sont supprimés (K6).
5. **Candidats mesurés** `POST /api/cocoons/:cocoonId/child-candidates { parentId?, parentSection? }` :
   l'IA propose 3 à 5 mots-clés (prompt `cocoon-child-keywords.md`, contexte du cocon, texte de
   la section du parent) ; chacun est mesuré, base d'abord (`keyword_metrics` frais, sinon un
   seul appel DataForSEO groupé), avec les 3 premiers résultats de sa SERP (base d'abord). Action
   payante derrière un clic.
6. **Contexte du cocon** `server/services/strategy/cocoon-context.service.ts` →
   `{{cocoon_context}}` (arbre : articles, niveaux, capitaines, sections parentes, rédigé ou non ;
   pour l'article visé : son parent et le texte de la section qui l'annonce, ses enfants). Branché
   sur la proposition des candidats (Cerveau), la structure (Moteur, remplace `{{cocoon_articles}}`)
   et le premier jet (Rédaction).
7. **Résumé dans le parent** : à la publication du parent, un chapitre dont est né un enfant et
   qui dépasse 250 mots → 🔴 `child-section-too-long` ; la passe d'enrichissement « Résumer »
   propose, chapitre par chapitre, un résumé de 150 à 250 mots qui annonce l'enfant.
8. **Maillage manuel** (FR-RED-LINKING-MANUAL) : les suggestions proposent d'office le parent et
   chaque enfant (ancre : la section parente) ; un lien vers un article non publié est signalé
   🟠 à la publication.
9. **Écran du Cerveau** : la proposition complète de plan devient une **carte indicative** en
   lecture seule. On crée le pilier (candidats mesurés), puis chaque enfant depuis un H2 d'un parent
   rédigé.
10. **Articles existants** : `npm run db:backfill-cocoon` (simulation par défaut, `--apply`) relie
    les enfants à leur parent d'après `proposedArticles[].parentTitle` (à défaut, pour un
    intermédiaire, le pilier unique du cocon) et un H2 du parent (mots propres à la section,
    hors sujet du parent : au moins deux et au moins la moitié), et liste ceux sans
    correspondance ; il accorde `redaction:draft_accepted` aux articles **publiés** (ils ont passé
    la porte de publication ; la porte du premier jet, ±15 % d'une cible, refuserait leur longueur
    enrichie) et aux articles dont le premier jet passe la porte. *(Corrigé le 2026-09-25 : cette
    décision ne mentionnait pas les articles publiés, que le script livré — commit `e738f99` —
    tient pour rédigés.)*

## Lots

| Lot | Contenu | Livré |
|---|---|---|
| L1 | Colonnes parent + types + lecture/écriture ; nettoyage des tests compatible `RESTRICT` | `f02fbbf` |
| L2 | Étape `redaction:draft_accepted` : porte, écran (après génération + bouton), mode automatique | `749d8c5` |
| L3 | Vérificateur de hiérarchie + création unitaire + suppression de `batch-create` ; appelants et tests | `d22ea8e` |
| L4 | Contexte du cocon + candidats mesurés + prompts | `04d90a2` |
| L5 | Écran du Cerveau : carte indicative, pilier, enfant depuis un H2 | `fb92b46` (avec le refus de retirer un parent : 409 `HAS_CHILDREN`) |
| L6 | Résumé dans le parent (règle de publication + passe « Résumer ») ; maillage manuel | `1882030` |
| L7 | Script de rattrapage ; parcours navigateur pilier → intermédiaire → spécialisé | rattrapage : `e738f99`, `1550555` ; parcours navigateur : `2d39345` |
| L8 | Documentation (PRD, registre, épopée, docs) | commit de clôture (docs), en-têtes `AUTHORITY:` (D7) |

Correctifs livrés sur la branche : `f16cab5` (bac à sable DataForSEO : les mesures groupées sont
rattachées aux mots-clés demandés — sans lui, aucun candidat n'était mesuré en mode simulé),
`1062072` (la mesure des candidats écrivait dans `keyword_serp_results` et passait pour une
analyse des concurrents : relevé désormais en cache `serp-top`, et une analyse n'est relue que si
des pages ont été lues), `3638d00` (checklist D5 de l'épopée : les repères locaux suivent la zone
du client).

## Écarts avec les décisions (constatés en documentant, le code fait foi)

- **Décision 8** : l'ancre proposée pour un enfant est prise dans le texte du parent (morceau du
  titre de l'enfant, sinon son mot-clé), pas la section ; la section n'est citée que dans la
  raison de la suggestion. Les suggestions par mots communs restent, après la famille.
- **Décision 9** : la carte indicative n'est pas en lecture seule au sens strict — on peut encore
  la générer et la retoucher ; elle ne crée plus rien (plus de « Valider » ni de « Tout valider »).
  C'est le constructeur de l'arbre réel (`CocoonTreeBuilder`) qui crée.
- **Décision 5** : la SERP d'un candidat se relève mot-clé par mot-clé (pas d'appel groupé), et
  depuis `1062072` elle est mise en cache dans `external_api_cache` (`serp-top`), jamais dans
  `keyword_serp_results`.
- **Décision 4** : l'écran grise la création d'un enfant sous un parent non rédigé ; le chemin
  « porte du parent jouée à la création » (409 `GATE_BLOCKED`) sert quand l'état a changé
  entre-temps, et au mode automatique (qui s'arrête).
- **Découverts** : K8 (le parent d'un article existant ne se change pas), K9 (l'intention
  éditoriale n'est plus proposée avec les candidats), D7 (en-têtes `AUTHORITY:`), T14 (deux
  parcours navigateur attendent encore `batch-create`) — cf. épopée, checklist. *K8 et K9
  soldés le 2026-09-25 sur `fix/restes-qualite-seo` (commits `1cbc921` : rattacher un article
  hors de l'arbre ; `f2ec990` : intention éditoriale de chaque candidat).*
