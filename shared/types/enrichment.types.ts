/**
 * Proposition d'une passe d'enrichissement ou d'une réécriture de chapitre
 * (FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE).
 */
import type { GateIssue } from '../verifiers/gate.js'
import type { EnrichmentPass, WebSource } from '../verifiers/enrichment.js'
import type { ApiUsage } from './api.types.js'

export interface EnrichmentProposal {
  pass: EnrichmentPass | 'reecriture'
  /** Chapitre visé (-1 = chapeau). Pour la FAQ : chapitre avant lequel elle s'insère. */
  chapterIndex: number
  /** Le chapitre tel qu'il était (vide pour la FAQ). */
  before: string
  /** La proposition, liens inventés déjà retirés. */
  html: string
  issues: GateIssue[]
  /** Résultats réels de la recherche web (passe sources). */
  webSources: WebSource[]
  /** Au moins un défaut ⛔ : la proposition ne s'accepte pas. */
  blocked: boolean
  usage: ApiUsage | null
}
