// @vitest-environment node
/**
 * Tests de coherence pour completed-checks data flow.
 * Verifie que les checks utilisent les constantes (pas de strings hardcodees)
 * et que les producteurs ecrivent avec les memes prefixes que les consommateurs lisent.
 *
 * Voir docs/data-flows/completed-checks.md pour la cartographie complete.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import {
  MOTEUR_CHECKS,
  CERVEAU_CHECKS,
  REDACTION_CHECKS,
  ALL_WORKFLOW_CHECKS,
  MOTEUR_DISCOVERY_DONE,
  MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
  CERVEAU_STRATEGY_DEFINED,
  CERVEAU_HIERARCHY_BUILT,
  CERVEAU_ARTICLES_PROPOSED,
  REDACTION_BRIEF_VALIDATED,
  REDACTION_OUTLINE_VALIDATED,
  REDACTION_CONTENT_WRITTEN,
  REDACTION_SEO_VALIDATED,
  REDACTION_PUBLISHED,
} from '../../../shared/constants/workflow-checks.constants.js'
import { addCheckSchema } from '../../../shared/schemas/article-progress.schema.js'

// =====================================================
// FR-MOT-CHECKS — namespace par workflow
// =====================================================

describe('FR-MOT-CHECKS / FR-CER-CHECKS / FR-RED-CHECKS — namespace par workflow', () => {
  it('tous les checks Moteur ont le prefixe "moteur:"', () => {
    MOTEUR_CHECKS.forEach(check => {
      expect(check.startsWith('moteur:')).toBe(true)
    })
  })

  it('tous les checks Cerveau ont le prefixe "cerveau:"', () => {
    CERVEAU_CHECKS.forEach(check => {
      expect(check.startsWith('cerveau:')).toBe(true)
    })
  })

  it('tous les checks Redaction ont le prefixe "redaction:"', () => {
    REDACTION_CHECKS.forEach(check => {
      expect(check.startsWith('redaction:')).toBe(true)
    })
  })

  it('aucune collision de noms entre workflows (namespaces disjoints)', () => {
    const all = ALL_WORKFLOW_CHECKS
    const unique = new Set(all)
    expect(unique.size).toBe(all.length)
  })

  it('les 3 listes couvrent ALL_WORKFLOW_CHECKS', () => {
    const sum = MOTEUR_CHECKS.length + CERVEAU_CHECKS.length + REDACTION_CHECKS.length
    expect(ALL_WORKFLOW_CHECKS.length).toBe(sum)
  })
})

// =====================================================
// FR-MOT-CHECKS-CONSTANTS — constantes vs strings
// =====================================================

describe('FR-MOT-CHECKS-CONSTANTS — valeurs canoniques attendues', () => {
  it('MOTEUR_DISCOVERY_DONE = "moteur:discovery_done"', () => {
    expect(MOTEUR_DISCOVERY_DONE).toBe('moteur:discovery_done')
  })

  it('MOTEUR_RADAR_DONE = "moteur:radar_done"', () => {
    expect(MOTEUR_RADAR_DONE).toBe('moteur:radar_done')
  })

  it('MOTEUR_CAPITAINE_LOCKED = "moteur:capitaine_locked"', () => {
    expect(MOTEUR_CAPITAINE_LOCKED).toBe('moteur:capitaine_locked')
  })

  it('MOTEUR_LIEUTENANTS_LOCKED = "moteur:lieutenants_locked"', () => {
    expect(MOTEUR_LIEUTENANTS_LOCKED).toBe('moteur:lieutenants_locked')
  })

  it('MOTEUR_LEXIQUE_VALIDATED = "moteur:lexique_validated"', () => {
    expect(MOTEUR_LEXIQUE_VALIDATED).toBe('moteur:lexique_validated')
  })

  it('CERVEAU_STRATEGY_DEFINED = "cerveau:strategy_defined"', () => {
    expect(CERVEAU_STRATEGY_DEFINED).toBe('cerveau:strategy_defined')
  })

  it('CERVEAU_HIERARCHY_BUILT = "cerveau:hierarchy_built"', () => {
    expect(CERVEAU_HIERARCHY_BUILT).toBe('cerveau:hierarchy_built')
  })

  it('CERVEAU_ARTICLES_PROPOSED = "cerveau:articles_proposed"', () => {
    expect(CERVEAU_ARTICLES_PROPOSED).toBe('cerveau:articles_proposed')
  })

  it('REDACTION_BRIEF_VALIDATED = "redaction:brief_validated"', () => {
    expect(REDACTION_BRIEF_VALIDATED).toBe('redaction:brief_validated')
  })

  it('REDACTION_OUTLINE_VALIDATED = "redaction:outline_validated"', () => {
    expect(REDACTION_OUTLINE_VALIDATED).toBe('redaction:outline_validated')
  })

  it('REDACTION_CONTENT_WRITTEN = "redaction:content_written"', () => {
    expect(REDACTION_CONTENT_WRITTEN).toBe('redaction:content_written')
  })

  it('REDACTION_SEO_VALIDATED = "redaction:seo_validated"', () => {
    expect(REDACTION_SEO_VALIDATED).toBe('redaction:seo_validated')
  })

  it('REDACTION_PUBLISHED = "redaction:published"', () => {
    expect(REDACTION_PUBLISHED).toBe('redaction:published')
  })
})

// =====================================================
// NFR-INT-COMPLETED-CHECKS-SSOT — source unique de verite
// =====================================================

describe('NFR-INT-COMPLETED-CHECKS-SSOT — TEXT[] unique flat', () => {
  it('tous les workflows partagent la meme structure (string[])', () => {
    const all: readonly string[] = ALL_WORKFLOW_CHECKS
    all.forEach(check => {
      expect(typeof check).toBe('string')
      expect(check).toMatch(/^(moteur|cerveau|redaction):[a-z_]+$/)
    })
  })

  it('format snake_case apres le prefixe', () => {
    ALL_WORKFLOW_CHECKS.forEach(check => {
      const [, suffix] = check.split(':')
      expect(suffix).toMatch(/^[a-z]+(_[a-z]+)*$/)
    })
  })
})

// =====================================================
// Reload coherence (placeholder)
// =====================================================

// =====================================================
// FR-MOT-CHECKS-CONSTANTS — anti-regression "no legacy strings"
// 2026-05-08 — Apres detection de checks 'capitaine_locked' /
// 'brief-validated' / etc. en DB faute de constante prefixee utilisee a
// l'emit cote frontend.
// =====================================================

describe('FR-MOT-CHECKS-CONSTANTS — schema Zod rejette tout check non-prefixe', () => {
  it('refuse "capitaine_locked" (legacy sans prefixe)', () => {
    const result = addCheckSchema.safeParse({ check: 'capitaine_locked' })
    expect(result.success).toBe(false)
  })

  it('refuse "brief-validated" (mauvais format avec tiret)', () => {
    const result = addCheckSchema.safeParse({ check: 'brief-validated' })
    expect(result.success).toBe(false)
  })

  it('refuse "moteur:CapitaineLocked" (camelCase)', () => {
    const result = addCheckSchema.safeParse({ check: 'moteur:CapitaineLocked' })
    expect(result.success).toBe(false)
  })

  it('accepte "moteur:capitaine_locked"', () => {
    const result = addCheckSchema.safeParse({ check: MOTEUR_CAPITAINE_LOCKED })
    expect(result.success).toBe(true)
  })

  it('accepte tous les checks de ALL_WORKFLOW_CHECKS', () => {
    for (const check of ALL_WORKFLOW_CHECKS) {
      const result = addCheckSchema.safeParse({ check })
      expect(result.success, `check ${check} doit passer`).toBe(true)
    }
  })
})

describe('FR-MOT-CHECKS-CONSTANTS — aucune string en dur dans src/', () => {
  // Liste des checks legacy interdits (forme sans prefixe ou variante incorrecte).
  // Si le code emit "'capitaine_locked'" ou "'brief-validated'" en string en dur,
  // on retombe sur le bug fix 2026-05-08.
  const FORBIDDEN_LITERALS = [
    "'capitaine_locked'", "\"capitaine_locked\"",
    "'lieutenants_locked'", "\"lieutenants_locked\"",
    "'discovery_done'", "\"discovery_done\"",
    "'radar_done'", "\"radar_done\"",
    "'lexique_validated'", "\"lexique_validated\"",
    "'brief-validated'", "\"brief-validated\"",
    "'brief_validated'", "\"brief_validated\"",
  ]

  function listSourceFiles(dir: string, exts = ['.ts', '.vue']): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) out.push(...listSourceFiles(full, exts))
      else if (exts.some(e => entry.endsWith(e))) out.push(full)
    }
    return out
  }

  it('aucun fichier .ts ou .vue de src/ ne contient un litteral check legacy', () => {
    const srcRoot = resolve(__dirname, '../../../src')
    const files = listSourceFiles(srcRoot)
    const offenders: { file: string; literal: string }[] = []
    for (const file of files) {
      // On exclut le fichier de definition des constantes lui-meme.
      if (file.includes('workflow-checks.constants')) continue
      const content = readFileSync(file, 'utf8')
      // Strip commentaires + signatures defineEmits (les noms d'events Vue
      // peuvent ressembler a des checks legacy mais n'ont rien a voir).
      const code = content
        .split('\n')
        .filter(line => {
          const t = line.trim()
          if (t.startsWith('//') || t.startsWith('*')) return false
          // Exclut "(e: 'brief-validated'): void" et autres event signatures.
          if (/\(e:\s*['"][a-z-]+['"]/.test(t)) return false
          return true
        })
        .join('\n')
      for (const lit of FORBIDDEN_LITERALS) {
        if (code.includes(lit)) {
          offenders.push({ file: file.replace(srcRoot, 'src'), literal: lit })
        }
      }
    }
    if (offenders.length > 0) {
      const msg = offenders.map(o => `  - ${o.file}: ${o.literal}`).join('\n')
      throw new Error(`Checks legacy hardcodes detectes (utiliser les constantes de workflow-checks.constants.ts) :\n${msg}`)
    }
    expect(offenders).toEqual([])
  })
})

describe('FR-MOT-CHECKS — reload coherence (placeholder)', () => {
  it.todo('store Pinia article-progress refleche exactement DB articles.completed_checks')
  it.todo('addCheck idempotent : ajouter 2x le meme check ne le duplique pas')
  it.todo('removeCheck idempotent : retirer un check absent ne genere pas erreur')
})
