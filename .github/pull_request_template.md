## Pourquoi

<!-- Le besoin, en une ou deux phrases, dans les mots de l'utilisateur. -->

## Exigences

<!-- IDs FR-/NFR-/DESIGN- livrés ou touchés. Une exigence réservée dans l'épopée
     entre dans prd.md et design-registry.md dans CETTE PR (statut « active »). -->

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
- [ ] Documentation à jour (PRD, registre, tech-spec, sprint-status, épopée)
