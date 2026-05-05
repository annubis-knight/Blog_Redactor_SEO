// @vitest-environment node
/**
 * Tests NFR-CFG-APP-PORTS — vérifie que les ports applicatifs (3400 back / 5400 front)
 * sont bien gravés dans les configs et défauts du repo.
 *
 * Voir _bmad-output/planning-artifacts/prd.md §9.8 NFR-CFG-APP-PORTS / NFR-CFG-PORT-PREFLIGHT.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../../..')
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8')

describe('NFR-CFG-APP-PORTS — ports figés (3400 / 5400)', () => {
  it('AC1: .env.example annonce PORT=3400 et VITE_PORT=5400', () => {
    const content = read('.env.example')
    expect(content).toMatch(/^PORT=3400\s*$/m)
    expect(content).toMatch(/^VITE_PORT=5400\s*$/m)
  })

  it('AC2: server/index.ts utilise 3400 comme fallback', () => {
    const content = read('server/index.ts')
    // Tolère "process.env.PORT || 3400" ou "process.env.PORT ?? 3400" ou Number(...)
    expect(content).toMatch(/process\.env\.PORT\s*[|?]{1,2}\s*3400/)
    expect(content).not.toContain('|| 3005')
    expect(content).not.toContain('?? 3005')
  })

  it('AC3: vite.config.ts configure server.port=5400 et proxy vers 3400', () => {
    const content = read('vite.config.ts')
    // Le défaut frontend doit être 5400 (via constante ou littéral)
    expect(content).toMatch(/VITE_PORT\)?\s*\)?\s*\|\|\s*5400|port:\s*5400/)
    // Le défaut backend doit être 3400 (utilisé dans le proxy)
    expect(content).toMatch(/process\.env\.PORT\)?\s*\|\|\s*3400|localhost:3400/)
    expect(content).not.toContain('localhost:3005')
    // server.port doit être défini (qu'il soit littéral ou via constante)
    expect(content).toMatch(/server:\s*\{[^}]*port:/s)
  })

  it('AC4: playwright.config.ts utilise 5400 (baseURL/front) et 3400 (back)', () => {
    const content = read('playwright.config.ts')
    expect(content).toContain('http://localhost:5400')
    expect(content).toMatch(/port:\s*3400/)
    expect(content).toMatch(/port:\s*5400/)
    expect(content).not.toContain('localhost:5173')
    expect(content).not.toContain('localhost:3005')
  })
})

describe('NFR-CFG-PORT-PREFLIGHT — hooks kill-port câblés', () => {
  const pkg = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>
  }

  it('AC3: package.json contient predev / prebuild / pretest:browser', () => {
    expect(pkg.scripts.predev).toBeDefined()
    expect(pkg.scripts.prebuild).toBeDefined()
    expect(pkg.scripts['pretest:browser']).toBeDefined()
  })

  it('AC3 (suite): chaque hook invoque scripts/kill-port.mjs avec 3400 et 5400', () => {
    for (const hook of ['predev', 'prebuild', 'pretest:browser'] as const) {
      const cmd = pkg.scripts[hook]
      expect(cmd, `${hook} doit invoquer kill-port.mjs`).toContain('scripts/kill-port.mjs')
      expect(cmd, `${hook} doit cibler le port 3400`).toContain('3400')
      expect(cmd, `${hook} doit cibler le port 5400`).toContain('5400')
    }
  })

  it('AC1: scripts/kill-port.mjs existe et est lisible', () => {
    const content = read('scripts/kill-port.mjs')
    expect(content.length).toBeGreaterThan(0)
    expect(content).toContain('freePort')
  })
})
