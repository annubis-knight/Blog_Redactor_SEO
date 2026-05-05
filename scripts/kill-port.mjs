#!/usr/bin/env node
/**
 * AUTHORITY: scripts/kill-port.mjs (preflight ports applicatifs 3400 / 5400)
 * READS FROM: process.argv (ports positional args), os.platform()
 * WRITES TO: child_process.exec (lsof+kill sur POSIX, netstat+taskkill sur Win32)
 * CONSUMERS: package.json hooks predev / prebuild / pretest:browser
 * RELATED FR: NFR-CFG-APP-PORTS, NFR-CFG-PORT-PREFLIGHT
 *
 * Idempotent : exit 0 même si rien n'écoute. Cross-platform (win32 + posix).
 * Usage : node scripts/kill-port.mjs [port1] [port2] ... (défaut: 3400 5400)
 */
import { exec } from 'node:child_process'
import os from 'node:os'

const DEFAULT_PORTS = [3400, 5400]

/**
 * Exécute une commande shell et résout avec { stdout, stderr } ou rejette.
 * Le code 1 de lsof (= "pas de match") est NORMALISÉ en succès vide,
 * pour que `freePort` puisse traiter "port libre" comme un cas non-erreur.
 */
function execAsync(cmd, { tolerateExitCode1 = false } = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      // exec callback: on gère les 2 signatures (string ou objet)
      const out = typeof stdout === 'string' ? stdout : (stdout?.stdout ?? '')
      const errOut = typeof stderr === 'string' ? stderr : (stderr?.stderr ?? stdout?.stderr ?? '')
      if (err) {
        if (tolerateExitCode1 && err.code === 1) {
          resolve({ stdout: '', stderr: errOut })
          return
        }
        reject(err)
        return
      }
      resolve({ stdout: out, stderr: errOut })
    })
  })
}

/**
 * Libère un port donné. Idempotent :
 *  - port libre → { killed: false, pids: [] }
 *  - port occupé → tue les PIDs → { killed: true, pids: [...] }
 *  - erreur sur kill → { killed: false, pids: [...], error: '...' }
 */
export async function freePort(port) {
  const isWin = os.platform() === 'win32'

  let pids = []
  try {
    if (isWin) {
      // netstat -ano renvoie des lignes du type :
      //   TCP    0.0.0.0:3400      0.0.0.0:0      LISTENING       9876
      // On prend les LISTENING dont la colonne "Local Address" se termine par :PORT.
      const { stdout } = await execAsync(`netstat -ano -p TCP`)
      const found = new Set()
      const lineRe = new RegExp(`:${port}\\b\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'i')
      for (const line of stdout.split(/\r?\n/)) {
        const m = line.match(lineRe)
        if (m) found.add(m[1])
      }
      pids = [...found]
    } else {
      // lsof -ti retourne juste les PIDs, un par ligne. Exit 1 = aucun match.
      const { stdout } = await execAsync(`lsof -ti:${port}`, { tolerateExitCode1: true })
      pids = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      // déduplication
      pids = [...new Set(pids)]
    }
  } catch (err) {
    // Probe a échoué (commande absente, etc.) → on ne casse pas le hook.
    return { killed: false, pids: [], error: String(err.message ?? err) }
  }

  if (pids.length === 0) {
    return { killed: false, pids: [] }
  }

  const killCmd = isWin
    ? `taskkill /F ${pids.map(p => `/PID ${p}`).join(' ')}`
    : `kill -9 ${pids.join(' ')}`

  try {
    await execAsync(killCmd)
    return { killed: true, pids }
  } catch (err) {
    return { killed: false, pids, error: String(err.message ?? err) }
  }
}

/**
 * Libère plusieurs ports en parallèle, log un résumé compact.
 */
export async function freePorts(ports) {
  const results = await Promise.all(
    ports.map(async (p) => ({ port: p, ...(await freePort(p)) }))
  )
  for (const r of results) {
    if (r.error) {
       
      console.warn(`[kill-port] ⚠  port ${r.port}: ${r.error}`)
    } else if (r.killed) {
       
      console.log(`[kill-port] ✓ port ${r.port} libéré (PID ${r.pids.join(', ')})`)
    }
    // port déjà libre → silencieux
  }
  return results
}

/**
 * CLI entry point. N'exécute que si le script est lancé directement.
 */
async function main() {
  const argv = process.argv.slice(2)
  const ports = argv.length > 0
    ? argv.map(Number).filter(n => Number.isInteger(n) && n > 0 && n < 65536)
    : DEFAULT_PORTS
  if (ports.length === 0) {
     
    console.error('[kill-port] aucun port valide fourni')
    process.exit(0) // idempotent : pas de sortie en erreur
  }
  await freePorts(ports)
}

// Détection ESM "this file was run directly" — évite l'exécution lors de l'import test
const isMain = (() => {
  try {
    const argv1 = process.argv[1] ? process.argv[1].replace(/\\/g, '/') : ''
    const here = import.meta.url.replace(/^file:\/{2,3}/, '').replace(/\\/g, '/')
    return argv1 && here.endsWith(argv1.split('/').pop() ?? '')
  } catch {
    return false
  }
})()

if (isMain) {
  main().catch((err) => {
     
    console.warn('[kill-port] erreur non bloquante:', err?.message ?? err)
    process.exit(0)
  })
}
