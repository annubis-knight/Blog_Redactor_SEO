// Backwards-compat re-export. The implementation now lives in `./dataforseo/`
// (split by responsibility: client, cache, serp, keywords, brief, scoring).
// Existing callers keep importing from this path unchanged.
export * from './dataforseo/index.js'
