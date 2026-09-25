/**
 * Alarme graduée (FR-INFRA-GATE-WAIVER) — gestes d'un utilisateur face à une porte.
 *
 * Une porte refuse parfois un passage sur des données simulées (volume inconnu,
 * intention SERP différente…). Un test dont le sujet n'est PAS la porte y répond
 * comme un utilisateur qui assume : il coche « J'ai lu », choisit une catégorie
 * et écrit une vraie raison. Un défaut ⛔ n'a pas de réponse : le test échoue.
 *
 * Déterministe : on attend la réponse du serveur à la vérification de la porte,
 * pas un délai arbitraire.
 */
import { expect, type Page, type Response } from '@playwright/test'
import type { GateId } from '../../../shared/verifiers/gate'

/** Raison assez longue (≥ 20 caractères) pour être acceptée. */
export const GATE_TEST_REASON = 'Choix assumé pour ce test : données simulées, sans volume réel'

function isGateEvaluation(gateId: GateId) {
  return (r: Response) => r.request().method() === 'GET' && new RegExp(`/api/articles/\\d+/gates/${gateId}(\\?|$)`).test(r.url())
}

/** Répond à l'alarme ouverte ; renvoie les règles rencontrées (`niveau:règle`). */
export async function answerGateAlarm(page: Page): Promise<string[]> {
  const alarm = page.locator('[data-testid="gate-alarm"]')
  await expect(alarm, 'l’alarme s’ouvre').toBeVisible({ timeout: 10_000 })
  const issues = alarm.locator('[data-testid="gate-issue"]')
  const rules: string[] = []
  for (let i = 0; i < await issues.count(); i++) {
    const issue = issues.nth(i)
    const level = await issue.getAttribute('data-level')
    rules.push(`${level}:${await issue.getAttribute('data-rule')}`)
    if (level === 'attention') await issue.locator('[data-testid="gate-ack"]').check()
    if (level === 'risque') {
      await issue.locator('[data-testid="gate-category"]').selectOption('autre')
      await issue.locator('[data-testid="gate-reason"]').fill(GATE_TEST_REASON)
    }
  }
  if (rules.some(r => r.startsWith('technique:'))) {
    throw new Error(`Alarme ⛔ (aucune dérogation possible) : ${rules.join(', ')}`)
  }
  await alarm.locator('[data-testid="gate-accept"]').click()
  await expect(alarm, 'l’alarme se ferme une fois la responsabilité prise').toBeHidden({ timeout: 10_000 })
  return rules
}

/**
 * Joue un geste qui passe par une porte (verrouiller le capitaine, ouvrir
 * l'alarme des lieutenants…) et, si la porte refuse, y répond. Renvoie les
 * règles rencontrées — vide si la porte a laissé passer.
 */
export async function passThroughGate(page: Page, gateId: GateId, gesture: () => Promise<void>): Promise<string[]> {
  const evaluated = page.waitForResponse(isGateEvaluation(gateId), { timeout: 30_000 })
  await gesture()
  const response = await evaluated
  const body = await response.json() as { data?: { passed?: boolean } }
  if (body.data?.passed) return []
  return answerGateAlarm(page)
}

/**
 * Le premier jet accepté (C7, `redaction:draft_accepted`) : l'écran le demande
 * de lui-même après la génération, ou sur « Accepter le premier jet ». La
 * demande part d'abord ; un refus arrive en 422 `GATE_BLOCKED` et ouvre
 * l'alarme, à laquelle on répond. Renvoie les règles rencontrées.
 */
export async function acceptDraftThroughGate(page: Page, gesture: () => Promise<void>, timeout = 60_000): Promise<string[]> {
  const requested = page.waitForResponse(
    r => r.request().method() === 'POST' && /\/api\/articles\/\d+\/progress\/check$/.test(r.url())
      && (r.request().postData() ?? '').includes('redaction:draft_accepted'),
    { timeout },
  )
  await gesture()
  const response = await requested
  if (response.status() !== 422) return []
  return answerGateAlarm(page)
}

/**
 * Publie (clic sur « Exporter ») : la publication part d'abord, et un refus
 * arrive en 422 `GATE_BLOCKED` (FR-RED-PUBLISH-GATE). Si la porte refuse, on
 * répond à l'alarme ; l'écran rejoue alors la publication.
 */
export async function publishThroughGate(page: Page, gesture: () => Promise<void>): Promise<string[]> {
  const published = page.waitForResponse(
    r => r.request().method() === 'PUT' && /\/api\/articles\/\d+\/status$/.test(r.url()),
    { timeout: 60_000 },
  )
  await gesture()
  const response = await published
  if (response.status() !== 422) return []
  return answerGateAlarm(page)
}
