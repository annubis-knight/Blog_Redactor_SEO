/**
 * dependency-cruiser configuration — Blog Redactor SEO
 *
 * Verrouille l'architecture du projet (CLAUDE.md §3.1).
 * Les règles ici sont actives via `npm run check:arch`.
 *
 * Pour ajouter une règle, lis CLAUDE.md §3.1 et le tech-spec
 * stabilisation-codebase (Sprint 1, S1.1).
 */
module.exports = {
  forbidden: [
    {
      name: 'no-server-in-src',
      severity: 'error',
      comment:
        "src/ ne doit JAMAIS importer depuis server/ (CLAUDE.md §3.1). " +
        "Si un type ou une constante doit être partagé, le mettre dans shared/.",
      from: { path: '^src/' },
      to: { path: '^server/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        "Cycle d'import détecté. Casser le cycle en extrayant les types/constantes " +
        "communs vers un module tiers (CLAUDE.md anti-patterns).",
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        "Fichier orphelin (jamais importé). Soit le supprimer, soit l'ajouter " +
        "comme entrée explicite dans knip.json.",
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // configs (.eslintrc, etc.)
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)package\\.json$',
          '(^|/)tests?/',
          '(^|/)server/index\\.ts$',
          '(^|/)src/main\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      severity: 'warn',
      comment: 'Module core Node.js déprécié.',
      from: {},
      to: { dependencyTypes: ['core'], path: '^(punycode|domain|constants|sys)$' },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', 'dist', '.git', '_bmad-output', 'docs', 'data'],
    },
    exclude: {
      path: ['\\.test\\.ts$', '__tests__', 'tests/', '\\.d\\.ts$'],
    },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
