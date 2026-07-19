/** Dépendances communes injectées dans chaque phase du pipeline. */

import type { HttpClient } from './http-client.js'
import type { CliLogger } from './logger.js'
import type { RunReport } from './report.js'

export interface PhaseDeps {
  client: HttpClient
  logger: CliLogger
  report: RunReport
}
