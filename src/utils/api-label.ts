/**
 * Labels humains pour les URLs d'endpoints IA. Utilisé par :
 * - useStreaming (SSE) → costLogStore.addEntry(labelFromUrl, usage)
 * - api.service (JSON) → pushCostIfPresent({ data: { ..., usage } })
 *
 * Centralisé ici pour qu'on ait un seul endroit à maintenir quand on ajoute
 * une nouvelle route IA.
 */

const URL_LABELS: [RegExp, string][] = [
  // Génération de contenu
  [/\/generate\/outline/, 'Génération sommaire'],
  [/\/generate\/article/, 'Génération article'],
  [/\/generate\/reduce/, 'Réduction article'],
  [/\/generate\/humanize-section/, 'Humanisation section'],
  [/\/generate\/action/, 'Action IA'],
  [/\/generate\/micro-context-suggest/, 'Suggestion micro-contexte'],
  [/\/generate\/brief-explain/, 'Analyse brief IA'],
  [/\/generate\/meta/, 'Génération meta'],

  // Keyword-specific AI panels (SSE)
  [/\/keywords\/[^/]+\/ai-lexique-upfront/, 'Pré-analyse lexique'],
  [/\/keywords\/[^/]+\/ai-lexique/, 'Analyse lexique'],
  [/\/keywords\/[^/]+\/ai-hn-structure/, 'Structure Hn'],
  [/\/keywords\/[^/]+\/ai-panel/, 'Analyse IA capitaine'],
  [/\/keywords\/[^/]+\/propose-lieutenants/, 'Proposition lieutenants'],

  // Stratégie cocon (JSON wrappé)
  [/\/strategy\/.*\/suggest/, 'Suggestion stratégie'],
  [/\/strategy\/.*\/deepen/, 'Approfondissement stratégie'],
  [/\/strategy\/.*\/consolidate/, 'Consolidation stratégie'],
  [/\/strategy\/.*\/enrich/, 'Enrichissement stratégie'],

  // Thème / parsing
  [/\/theme\/config\/parse/, 'Parsing thème'],

  // Keywords (JSON wrappé)
  [/\/keywords\/translate-pain/, 'Traduction douleur → mots-clés'],
  [/\/keywords\/lexique-suggest/, 'Suggestion lexique'],
  [/\/keywords\/relevance-score/, 'Score pertinence'],
  [/\/keywords\/analyze-discovery/, 'Analyse discovery'],
  [/\/keywords\/radar\/generate/, 'Génération keywords radar'],
  [/\/keywords\/[^/]+\/validate/, 'Validation mot-clé'],

  // Services transverses
  [/\/content-gap\/analyze/, 'Analyse content gap'],
  [/\/articles\/\d+\/recommend-word-count/, 'Conseil longueur article'],
  [/\/intent\/analyze/, 'Analyse intent'],
]

export function labelFromUrl(url: string): string {
  for (const [re, label] of URL_LABELS) {
    if (re.test(url)) return label
  }
  const withoutQuery = url.split('?')[0] ?? url
  return withoutQuery.split('/').pop() ?? 'Appel API'
}
