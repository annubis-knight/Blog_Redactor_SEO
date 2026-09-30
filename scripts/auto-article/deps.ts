/** Dépendances communes injectées dans chaque phase du pipeline. */

import type { GateReader } from './checks.js'
import type { HttpClient } from './http-client.js'
import type { CliLogger } from './logger.js'
import type { RunReport } from './report.js'

export interface PhaseDeps {
  client: HttpClient
  logger: CliLogger
  report: RunReport
  /**
   * L'utilisateur devant le terminal (run interactif seulement) : lui seul peut
   * dire « J'ai lu » à une porte toute 🟠. Absent → toute porte refusée arrête le run.
   */
  gateReader?: GateReader
}
