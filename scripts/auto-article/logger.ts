/**
 * Logger CLI coloré (chalk, déjà dépendance projet). Minimal et sans état
 * autre que le compteur d'étapes du pipeline.
 */

import chalk from 'chalk'

export interface CliLogger {
  step: (msg: string) => void
  info: (msg: string) => void
  dim: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  success: (msg: string) => void
  phase: (title: string) => void
}

export function createLogger(verbose = false): CliLogger {
  return {
    step: (msg) => console.log(`${chalk.cyan('▸')} ${msg}`),
    info: (msg) => console.log(msg),
    dim: (msg) => {
      if (verbose) console.log(chalk.dim(msg))
    },
    warn: (msg) => console.warn(`${chalk.yellow('⚠')}  ${msg}`),
    error: (msg) => console.error(`${chalk.red('✗')} ${msg}`),
    success: (msg) => console.log(`${chalk.green('✓')} ${msg}`),
    phase: (title) => console.log(`\n${chalk.bold.magenta(`━━ ${title} ━━`)}`),
  }
}
