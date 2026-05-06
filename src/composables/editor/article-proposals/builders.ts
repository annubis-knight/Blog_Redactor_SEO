import type { ProposedArticle } from '@shared/types/index.js'
import type { PainIntentExpected } from '@shared/types/scoring.types.js'
import { PAIN_INTENT_EXPECTED_VALUES } from '@shared/types/scoring.types.js'
import type { ArticleType } from './types'

/**
 * Normalise une valeur arbitraire en `PainIntentExpected | null`. Utilisé pour
 * accepter ce que l'IA renvoie : si la valeur est dans les 4 attendues, on la
 * garde ; sinon `null` (5e signal Pertinence neutralisé à 50/100).
 */
function coercePainIntentExpected(value: unknown): PainIntentExpected | null {
  if (typeof value !== 'string') return null
  return (PAIN_INTENT_EXPECTED_VALUES as readonly string[]).includes(value)
    ? (value as PainIntentExpected)
    : null
}

/**
 * Couleurs de fond utilisées pour distinguer les groupes d'articles Spécialisés
 * rattachés à un même Intermédiaire (cycle si plus de 6 groupes).
 */
export const GROUP_COLORS = ['#f59e0b', '#d97706', '#b45309', '#ea580c', '#c2410c', '#92400e']

/**
 * Normalise un titre pour comparaison insensible à la casse / aux accents.
 * Utilisée pour les regroupements (Spécialisés sous Intermédiaires) et
 * pour la détection de doublons entre articles.
 */
export function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Derive a URL-friendly slug from a keyword (fallback when AI doesn't provide one).
 * Pure : pas d'effet de bord, dépend uniquement de l'entrée.
 */
export function keywordToSlug(keyword: string): string {
  if (!keyword.trim()) return ''
  return keyword
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9\s-]/g, '')      // remove special chars
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '')             // trim leading/trailing hyphens
}

/**
 * Construit un `ProposedArticle` complet à partir d'un objet brut issu d'une réponse IA.
 * Pure : ne touche ni store, ni Vue, ni I/O. Utilisée par les parsers JSON.
 */
export function buildSingleArticle(
  obj: Record<string, unknown>,
  fallbackType: ArticleType,
): ProposedArticle {
  const validTypes = ['Pilier', 'Intermédiaire', 'Spécialisé'] as const
  const type = validTypes.includes(obj.type as typeof validTypes[number])
    ? (obj.type as typeof validTypes[number])
    : fallbackType
  const title = String(obj.title ?? '').trim()
  const keyword = String(obj.suggestedKeyword ?? '')
  const slug = String(obj.suggestedSlug ?? '') || keywordToSlug(keyword)
  return {
    id: crypto.randomUUID(),
    title,
    suggestedTitles: title ? [title] : [],
    type,
    parentTitle: (obj.parentTitle as string) ?? null,
    rationale: String(obj.rationale ?? ''),
    painPoint: String(obj.painPoint ?? ''),
    painIntentExpected: coercePainIntentExpected(obj.painIntentExpected),
    suggestedKeyword: keyword,
    suggestedKeywords: keyword ? [keyword] : [],
    suggestedSlug: slug,
    suggestedSlugs: slug ? [slug] : [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
    dbId: 0,
  }
}

/**
 * Construit un `ProposedArticle` vide (utilisé par "ajouter manuellement").
 * Pure : pas d'effet de bord.
 */
export function buildEmptyArticle(type: ArticleType): ProposedArticle {
  return {
    id: crypto.randomUUID(),
    title: '',
    suggestedTitles: [],
    type,
    parentTitle: null,
    rationale: '',
    painPoint: '',
    painIntentExpected: null,
    suggestedKeyword: '',
    suggestedKeywords: [],
    suggestedSlug: '',
    suggestedSlugs: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
    dbId: 0,
  }
}

/**
 * Génère un identifiant local pour un sujet suggéré (`suggestedTopics`).
 * Court et lisible, suffisant pour distinguer des items côté client (pas un UUID).
 */
export function generateTopicId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
