/**
 * Vitest config dédié à `npm run verify` — le filet RAPIDE.
 *
 * Ne garde que les tests purs, qui n'ont besoin ni du serveur, ni de la base,
 * ni d'un navigateur simulé : la logique métier partagée, les heuristiques du
 * robot, les règles d'architecture, et les services testés sans I/O.
 * Environnement `node` : on évite les ~25 s de démarrage de jsdom par worker.
 *
 * Mesuré le 2026-09-21 : ~540 tests en ~10 s.
 * La suite complète reste disponible via `npm run verify:full`.
 */
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: [
        'tests/unit/shared/**/*.test.ts',
        'tests/unit/scripts/**/*.test.ts',
        'tests/unit/architecture/**/*.test.ts',
        'tests/unit/services/export-page-structure.test.ts',
        'tests/unit/services/claude-stream-filter.test.ts',
        'tests/unit/services/linking.service.test.ts',
        'tests/unit/services/linking-anchor.test.ts',
        'tests/unit/services/cocoon-add-article-prompt.test.ts',
        // Réponses simulées (NFR-COST-AI-MOCK) : consigne réelle, bon choix de
        // réponse, forme acceptée par le contrat ou le parseur consommateur.
        'tests/unit/services/mock-captain-ai-panel.test.ts',
        'tests/unit/services/mock-moteur-panneaux.test.ts',
        'tests/unit/services/mock-propose-lieutenants.test.ts',
        'tests/unit/services/mock-redaction.test.ts',
        'tests/unit/services/mock-cerveau.test.ts',
        'tests/unit/infra/test-fixtures-cleanup.test.ts',
        // Textes à l'écran sans nom du code (NFR-UX-SCREEN-TEXT, recette du 2026-09-30).
        'tests/unit/composables/article-proposals-warnings.test.ts',
        // Pertes et mélanges de données (recette du 2026-09-30, lot 2) :
        // choisir un article ne fait que relire, rien d'un article ne passe à un autre.
        'tests/unit/stores/article-keywords.loading.test.ts',
        'tests/unit/composables/useMoteurArticleSync.test.ts',
        'tests/unit/stores/editor-score-persist.test.ts',
        'tests/unit/stores/editor-delete-content.test.ts',
        'tests/unit/services/article-content.service.test.ts',
        'tests/unit/routes/articles.routes.test.ts',
        'tests/unit/composables/useResonanceScore.save.test.ts',
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
