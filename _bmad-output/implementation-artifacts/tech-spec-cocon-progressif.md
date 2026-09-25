---
name: tech-spec-cocon-progressif
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C7 ; K6 ; FR-RED-LINKING-MANUAL)
  - _bmad-output/planning-artifacts/prd.md (à la livraison : FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE, FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-KEYWORD-REAL-DATA, FR-INFRA-COCOON-CONTEXT, FR-RED-LINKING-MANUAL ; FR-CER-BATCH-CREATE et FR-RED-INTERNAL-LINKING superseded)
  - _bmad-output/planning-artifacts/design-registry.md (entrées DESIGN-* miroirs)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (qualite-seo-c7-cocon-progressif)
  - server/db/schema.sql, server/db/bootstrap.sql (régénérés par `npm run db:snapshot`)
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
    les enfants à leur parent d'après `proposedArticles[].parentTitle` et un H2 du parent, et
    liste ceux sans correspondance ; il n'accorde `redaction:draft_accepted` qu'aux articles dont
    le premier jet passe la porte.

## Lots

| Lot | Contenu |
|---|---|
| L1 | Colonnes parent + types + lecture/écriture ; nettoyage des tests compatible `RESTRICT` |
| L2 | Étape `redaction:draft_accepted` : porte, écran (après génération + bouton), mode automatique |
| L3 | Vérificateur de hiérarchie + création unitaire + suppression de `batch-create` ; appelants et tests |
| L4 | Contexte du cocon + candidats mesurés + prompts |
| L5 | Écran du Cerveau : carte indicative, pilier, enfant depuis un H2 |
| L6 | Résumé dans le parent (règle de publication + passe « Résumer ») ; maillage manuel |
| L7 | Script de rattrapage ; parcours navigateur pilier → intermédiaire → spécialisé |
| L8 | Documentation (PRD, registre, épopée, docs) |
