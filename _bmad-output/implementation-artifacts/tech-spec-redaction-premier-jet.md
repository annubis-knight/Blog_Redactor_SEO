---
name: tech-spec-redaction-premier-jet
type: tech-spec
status: in-progress
version: 0.1.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C5, premier temps ; R1, R7, R9 en partie)
  - _bmad-output/planning-artifacts/prd.md (FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE ; FR-RED-ARTICLE superseded)
  - _bmad-output/planning-artifacts/design-registry.md
  - docs/prompts-reference.md (généré)
---

# Tech-spec — Rédaction en deux temps : le premier jet (C5a)

## Contexte

Le pilier 1013 : 15 601 mots pour 2 650 visés, une conclusion par section, des phrases en anglais,
des chiffres de 2024 sans source. La rédaction faisait **un appel par H2** (15 appels), chacun sans
mémoire du reste (500 derniers caractères seulement), avec la recherche web imposée par le prompt.

Cartographie du 2026-09-25 (`server/routes/generate/article.routes.ts`) :

| Constat | Où |
|---|---|
| Un appel IA par groupe H2, 15 s d'attente entre deux, budget de section enfin transmis en C4 | `article.routes.ts:133-243`, `_helpers.ts:37` |
| La raison d'arrêt (`max_tokens`) n'est lue nulle part : une coupure ne se voit qu'après coup | `claude.service.ts:179-197`, `ApiUsage` |
| La branche « 429 » de la route n'est jamais atteinte (le fournisseur convertit l'erreur) | `_helpers.ts:7-12`, `ai-provider.service.ts:154-165` |
| La porte `draft` est déclarée, sans vérificateur ; aucun générateur ne pose de marqueur « à sourcer » | `shared/verifiers/gate.ts:23,32`, `publish.ts:84-86` |
| Aucun contrôle de langue (hors « let me… »), de paragraphe répété, de chiffre sans source | `content-validators.ts` |
| La simulation écrit le même texte à chaque section, sous le titre du premier H2 | `mock-fixtures/auto-section-priority.ts` |

## Objectif (décision d'Arnaud du 2026-09-24)

1. **Premier jet en un seul appel**, sans recherche web : tout le sommaire, un budget par H2, la
   stratégie, les mots-clés et les règles du type, envoyés une fois.
2. **Aucun chiffre inventé** : un chiffre à sourcer est posé dans `<mark data-a-sourcer>` ; la passe
   « sources » (C5b) les remplacera.
3. **Progression inchangée à l'écran** : le serveur repère les `<h2>` dans le flux et réémet
   `section-start` / `section-done` ; le client, l'éditeur et la sauvegarde au fil ne changent pas.
4. **Coupure** : la raison d'arrêt est lue ; une coupure au plafond déclenche une continuation à
   partir du dernier H2 incomplet (2 au plus).
5. **Porte « premier jet »** (`draft`) : ⛔ capitaine absent du H1 ; 🔴 longueur hors ±15 % ;
   🔴 section hors de son budget ; 🔴 capitaine absent de l'introduction ; 🔴 phrase non française ;
   🔴 paragraphe répété ; 🔴 chiffre sans source hors marqueur. Évaluée après la génération ;
   l'alarme s'ouvre si elle ne passe pas.

## Lots

- **L1 — détecteurs purs** (`shared/verifiers/draft.ts` + `shared/text-quality.ts`) : langue,
  répétition, chiffres sans source, budgets de section (déplacés de `_helpers.ts` vers `shared/`).
- **L2 — raison d'arrêt** : `ApiUsage.stopReason` (`end` | `max_tokens` | `other`) pour Claude,
  Gemini, OpenRouter et la simulation.
- **L3 — suivi des H2 dans le flux** (`shared/html-stream.ts`) : un `<h2` coupé entre deux paquets.
- **L4 — route `POST /generate/article-draft`** + prompt `generate-article-draft.md` ; continuation ;
  l'ancienne boucle (`/generate/article`, `generate-article-section.md`) est retirée.
- **L5 — porte `draft`** côté serveur (`gate.service.ts`) ; publication : chiffres sans source,
  langue et répétition rejoints à ses règles de contenu.
- **L6 — client et mode automatique** : `editor.store` appelle le premier jet, puis la porte ;
  `scripts/auto-article/phases/redaction.ts` migré.
- **L7 — simulation réaliste** : un premier jet complet, un H2 par entrée du sommaire, au budget,
  texte varié, chiffres dans des marqueurs.

## Hors périmètre (C5b)

Réécriture d'une section (`/generate/section-rewrite`), passes d'enrichissement (sources avec URL,
exemples, tableaux, images, FAQ, relecture), extensions TipTap Table et Image.
