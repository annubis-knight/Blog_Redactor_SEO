/**
 * Accumulateur de rapport de run : coûts + journal des étapes.
 * Pur (pas de console) — le rendu est une string, l'affichage est du ressort
 * de l'appelant. Testable directement.
 *
 * Deux postes de coût distincts (cf. audit défaut n°23 : le rapport ne comptait
 * que l'IA et sous-estimait la dépense d'un facteur ~3,5) :
 *   - **IA** : agrégé depuis les `usage` renvoyés par les endpoints.
 *   - **SEO (DataForSEO)** : delta de la fenêtre glissante du cost-guard entre
 *     le début et la fin du run (estimation tarifaire, pas la facturation).
 */

import type { ApiUsageLike } from './types.js'

export interface ReportStep {
  label: string
  ms?: number
}

export class RunReport {
  private readonly steps: ReportStep[] = []
  private aiCostUsd = 0
  private seoBaselineUsd: number | null = null
  private seoCostUsd = 0

  addStep(label: string, ms?: number): void {
    this.steps.push({ label, ms })
  }

  /** Additionne le coût estimé d'un objet `usage` renvoyé par l'API (tolérant au null). */
  addUsage(usage?: ApiUsageLike | null): void {
    const cost = usage?.estimatedCost
    if (typeof cost === 'number' && Number.isFinite(cost)) {
      this.aiCostUsd += cost
    }
  }

  /** Photo du compteur DataForSEO au démarrage du run. */
  setSeoBaseline(spentUsd: number): void {
    if (Number.isFinite(spentUsd)) this.seoBaselineUsd = spentUsd
  }

  /** Photo finale : le delta depuis la baseline devient le coût SEO du run. */
  setSeoFinal(spentUsd: number): void {
    if (!Number.isFinite(spentUsd) || this.seoBaselineUsd == null) return
    this.seoCostUsd = Math.max(0, spentUsd - this.seoBaselineUsd)
  }

  get aiCost(): number {
    return this.aiCostUsd
  }

  get seoCost(): number {
    return this.seoCostUsd
  }

  get totalCostUsd(): number {
    return this.aiCostUsd + this.seoCostUsd
  }

  get stepCount(): number {
    return this.steps.length
  }

  render(): string {
    const lines: string[] = []
    lines.push('── Récap du run ──')
    for (const step of this.steps) {
      const ms = step.ms != null ? ` (${step.ms} ms)` : ''
      lines.push(`  • ${step.label}${ms}`)
    }
    lines.push(`  Coût IA           : $${this.aiCostUsd.toFixed(4)}`)
    lines.push(`  Coût SEO (estim.) : $${this.seoCostUsd.toFixed(4)}`)
    lines.push(`  ─ Total           : $${this.totalCostUsd.toFixed(4)}`)
    return lines.join('\n')
  }
}
