// @vitest-environment node
/**
 * Tests fonctionnels du script scripts/kill-port.mjs (NFR-CFG-PORT-PREFLIGHT).
 *
 * On teste la fonction `freePort` exportée depuis le script. Les appels système
 * (`child_process.exec`) sont mockés pour rester déterministes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock child_process AVANT l'import du module testé
const execMock = vi.fn()
vi.mock('node:child_process', () => ({
  exec: (cmd: string, cb: (err: Error | null, out: { stdout: string; stderr: string }) => void) =>
    execMock(cmd, cb),
}))

// Mock os.platform pour piloter la plateforme
const platformMock = vi.fn<() => NodeJS.Platform>(() => 'linux')
vi.mock('node:os', () => ({
  platform: () => platformMock(),
  default: { platform: () => platformMock() },
}))

// Import dynamique APRES les mocks
const importScript = async () => {
  // bust cache
  return await import('../../../scripts/kill-port.mjs?v=' + Math.random())
}

describe('kill-port.mjs — freePort()', () => {
  beforeEach(() => {
    execMock.mockReset()
    platformMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('POSIX: lance `lsof -ti:PORT` puis `kill -9` quand un PID est trouvé', async () => {
    platformMock.mockReturnValue('linux')
    // 1er exec = lsof, 2e exec = kill
    execMock
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: '12345\n', stderr: '' }))
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: '', stderr: '' }))

    const { freePort } = await importScript()
    const result = await freePort(3400)

    expect(result.killed).toBe(true)
    expect(result.pids).toEqual(['12345'])
    expect(execMock).toHaveBeenCalledTimes(2)
    const lsofCall = execMock.mock.calls[0][0] as string
    const killCall = execMock.mock.calls[1][0] as string
    expect(lsofCall).toContain('lsof')
    expect(lsofCall).toContain('3400')
    expect(killCall).toContain('kill')
    expect(killCall).toContain('12345')
  })

  it('POSIX: si aucun PID retourné, idempotent (exit success, killed=false)', async () => {
    platformMock.mockReturnValue('linux')
    execMock.mockImplementationOnce((_cmd, cb) => cb(null, { stdout: '', stderr: '' }))

    const { freePort } = await importScript()
    const result = await freePort(3400)

    expect(result.killed).toBe(false)
    expect(result.pids).toEqual([])
    expect(execMock).toHaveBeenCalledTimes(1)
  })

  it('Windows: lance `netstat -ano` puis `taskkill /F /PID` quand un PID est trouvé', async () => {
    platformMock.mockReturnValue('win32')
    const netstatOutput = [
      '  TCP    0.0.0.0:3400           0.0.0.0:0              LISTENING       9876',
      '  TCP    [::]:3400              [::]:0                 LISTENING       9876',
    ].join('\r\n')
    execMock
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: netstatOutput, stderr: '' }))
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: '', stderr: '' }))

    const { freePort } = await importScript()
    const result = await freePort(3400)

    expect(result.killed).toBe(true)
    expect(result.pids).toEqual(['9876'])
    const netstatCall = execMock.mock.calls[0][0] as string
    const killCall = execMock.mock.calls[1][0] as string
    expect(netstatCall).toContain('netstat')
    expect(killCall).toContain('taskkill')
    expect(killCall).toContain('9876')
  })

  it('Windows: dédoublonne les PIDs identiques retournés par netstat sur IPv4 + IPv6', async () => {
    platformMock.mockReturnValue('win32')
    const netstatOutput = [
      '  TCP    0.0.0.0:3400           0.0.0.0:0              LISTENING       9876',
      '  TCP    [::]:3400              [::]:0                 LISTENING       9876',
    ].join('\r\n')
    execMock
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: netstatOutput, stderr: '' }))
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: '', stderr: '' }))

    const { freePort } = await importScript()
    const result = await freePort(3400)

    // Un seul taskkill pour 9876, pas deux
    expect(result.pids).toHaveLength(1)
    expect(execMock).toHaveBeenCalledTimes(2)
  })

  it('échec sur le kill: ne throw pas, retourne killed=false avec error remonté', async () => {
    platformMock.mockReturnValue('linux')
    execMock
      .mockImplementationOnce((_cmd, cb) => cb(null, { stdout: '12345\n', stderr: '' }))
      .mockImplementationOnce((_cmd, cb) => cb(new Error('permission denied'), { stdout: '', stderr: 'denied' }))

    const { freePort } = await importScript()
    const result = await freePort(3400)

    expect(result.killed).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('lsof exit 1 (port libre) est traité comme "rien à tuer", pas comme erreur', async () => {
    platformMock.mockReturnValue('linux')
    // lsof exit code 1 quand pas de match → exec callback reçoit une "erreur" avec code:1
    const lsofErr = Object.assign(new Error('Command failed'), { code: 1 })
    execMock.mockImplementationOnce((_cmd, cb) => cb(lsofErr, { stdout: '', stderr: '' }))

    const { freePort } = await importScript()
    const result = await freePort(3400)

    expect(result.killed).toBe(false)
    expect(result.pids).toEqual([])
    expect(result.error).toBeUndefined()
  })
})
