## Pourquoi

<!-- Le besoin, en une ou deux phrases, dans les mots de l'utilisateur. -->

## Exigences

<!-- IDs FR-/NFR-/DESIGN- livrés ou touchés, avec leur statut dans spec/requirements.md
     (active, ou « non tenue » + ce qui manque). Une exigence nouvelle entre dans
     spec/requirements.md dans CETTE PR ; sa conception dans le chapitre de design/ du domaine.
     prd.md et design-registry.md sont des archives : on ne les met plus à jour. -->

-

## Chantier

<!-- Ex. : C1 — correctifs rapides.
     Épopée : _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md
     Tech-spec : _bmad-output/implementation-artifacts/tech-spec-….md -->

## Test Red

<!-- Le test qui échouait avant cette PR et qui passe après. -->

## Valideur ajouté

<!-- Règle « un valideur par correction » : quel contrôle empêche le retour du défaut ? -->

## Vérification

- [ ] `npm run verify` vert
- [ ] `npm run test:check` : aucun nouveau rouge par rapport à la baseline
- [ ] `npm run test:browser` (si l'interface est touchée)
- [ ] `npm run db:check` (si le schéma est touché)
- [ ] Documentation à jour (`spec/requirements.md` et statuts, chapitres de `spec/` et `design/`, fiche `design/data-flows/` si une donnée partagée change, tech-spec, sprint-status)
