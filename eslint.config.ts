import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '.claude/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  // Project-wide rule overrides — voir tech-spec stabilisation-codebase §S1.2
  {
    name: 'app/rule-overrides',
    rules: {
      // Vue <script setup>: defineProps() retourne `props` qu'on lit via template — faux positif courant
      // Préfixer par _ pour silencer (ex: const _props = defineProps<...>())
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|props$|emit$)', // props/emit dans <script setup> Vue
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // `any` en warn — chantier de typage à mener séparément (cf. tech-spec)
      '@typescript-eslint/no-explicit-any': 'warn',

      // S3.3 — Anti-régression CLAUDE.md §2.0 : interdit le fallback silencieux
      // `?? 0` sur une variable représentant un score ou un KPI marché.
      // Symptôme typique : l'affichage montre "—" mais le tri traite la valeur
      // comme 0, ce qui mélange les cartes "pas mesuré" avec les vraies "mesuré
      // à 0".
      // Périmètre :
      //   - Score (générique : relevanceScore, compositeScore, marketScore…)
      //   - KPI marché : Volume, Cpc, Difficulty, Density, Competition.
      // Solution : utiliser compareScores/averageScores de shared/score/ pour
      // les Score, ou laisser null + afficher "—" pour les KPI.
      'no-restricted-syntax': [
        'error',
        {
          // Matche : `xxxScore ?? 0`, `searchVolume ?? 0`, `keywordDifficulty ?? 0`, etc. (Identifier direct)
          selector:
            "LogicalExpression[operator='??'][left.type='Identifier'][left.name=/[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity/][right.type='Literal'][right.value=0]",
          message:
            'Fallback silencieux interdit sur un score ou un KPI marché (CLAUDE.md §2.0). ' +
            'Utiliser compareScores/averageScores de shared/score/ pour les Score, ou laisser null + afficher "—" pour les KPI.',
        },
        {
          // Matche : `obj.someScore ?? 0`, `card.kpis.searchVolume ?? 0`, etc. (MemberExpression, dernière propriété)
          selector:
            "LogicalExpression[operator='??'][left.type='MemberExpression'][left.property.name=/[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity/][right.type='Literal'][right.value=0]",
          message:
            'Fallback silencieux interdit sur un score ou un KPI marché (CLAUDE.md §2.0). ' +
            'Utiliser compareScores/averageScores de shared/score/ pour les Score, ou laisser null + afficher "—" pour les KPI.',
        },
        {
          // Matche : `obj.something.score?.total ?? 0`, `obj.kpis.volume?.normalized ?? 0`, etc. (penultième est le KPI)
          selector:
            "LogicalExpression[operator='??'][left.type='MemberExpression'][left.object.property.name=/[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity/][right.type='Literal'][right.value=0]",
          message:
            'Fallback silencieux interdit sur un score ou un KPI marché (CLAUDE.md §2.0). ' +
            'Utiliser compareScores/averageScores de shared/score/ pour les Score, ou laisser null + afficher "—" pour les KPI.',
        },
      ],
    },
  },

  // S3.3 — Module shared/score/ : autoriser les imports internes via le sens
  // unique (l'index.ts est l'unique point d'entrée pour les consommateurs externes).
  // Cf. .dependency-cruiser.cjs pour la règle d'archi.
  {
    name: 'app/score-module-internal',
    files: ['shared/score/**/*.ts', 'tests/unit/shared/score.test.ts'],
    rules: {
      'no-restricted-syntax': 'off', // l'implémentation a le droit aux 0 dans les calculs
    },
  },

  // Scripts CJS Node : require() autorisé
  {
    name: 'app/scripts-cjs',
    files: ['scripts/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  skipFormatting,
)
