/**
 * Abstraction minimale de l'I/O terminal (readline). Injectable → les
 * consommateurs (prompts, gate interactif) restent testables avec un faux Io.
 */

import { createInterface } from 'node:readline/promises'

export interface Io {
  question: (prompt: string) => Promise<string>
  close: () => void
}

export function createStdIo(): Io {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return {
    question: (prompt) => rl.question(prompt),
    close: () => rl.close(),
  }
}
