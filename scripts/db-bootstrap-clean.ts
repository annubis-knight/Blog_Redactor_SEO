/**
 * Nettoyage d'un dump `pg_dump --schema-only` (fonctions pures, sans I/O).
 * Séparé de db-bootstrap.ts pour être testé sans charger `.env` ni lancer
 * pg_dump.
 */

/** Retire ce que les clients psql plus anciens ne comprennent pas, et ce qui varie à chaque dump. */
export function cleanDump(dump: string): string {
  return dump
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => !/^\\(un)?restrict\b/.test(line))
    .filter(line => !/^-- Dumped (from|by) /.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n'
}

/** Empreinte du snapshot recopiée dans l'en-tête du bootstrap (`sha256:<hex>`), ou `null`. */
export function readFingerprint(sql: string): string | null {
  return sql.match(/^-- Empreinte schéma[^:]*:\s*sha256:([0-9a-f]+)/m)?.[1] ?? null
}
