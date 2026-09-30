/**
 * La phrase de coût d'une demande à l'IA, pour la confirmation affichée avant
 * une régénération : elle dit ce qui va vraiment se passer (FR-CAP-AI-PANEL).
 *
 * - Mode simulé (badge « MOCK ») ou IA simulée : aucun appel payant.
 * - Réel : le fournisseur d'IA du moment, tel que le serveur le choisit
 *   (`getProvider`, renvoyé par GET /api/runtime-mode).
 * - Fournisseur inconnu : « un appel à l'IA », sans nom inventé.
 *
 * Recette du 2026-09-30 : « Cela consommera un appel Claude » s'affichait en
 * mode simulé comme avec Gemini.
 */

const PROVIDER_NAMES: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
}

export function paidAiCallNotice(mode: 'mock' | 'real', provider: string | null | undefined): string {
  if (mode === 'mock' || provider === 'mock') return 'Mode simulé : la réponse sera simulée, sans appel payant.'
  const name = provider ? PROVIDER_NAMES[provider] : undefined
  return name ? `Cela consommera un appel ${name}.` : "Cela consommera un appel à l'IA."
}
