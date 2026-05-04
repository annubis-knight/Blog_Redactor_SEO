/**
 * Types partagés pour la feature "Radar — Suggestions longue-traîne".
 *
 * Source de vérité : shared/schemas/long-tail-suggestions.schema.ts
 * (les types sont inférés via z.infer pour rester en cohérence stricte avec
 * la validation runtime).
 */
export type {
  LongTailSuggestion,
  LongTailSuggestionsResponse,
  LongTailSuggestRequest,
  LongTailSelectionPatch,
} from '../schemas/long-tail-suggestions.schema.js'
