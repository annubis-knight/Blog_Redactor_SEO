#!/usr/bin/env node
/**
 * One-shot script: updates all imports of @/composables/useX
 * to @/composables/<category>/useX after the #5 folder reorg.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

// Build mapping: composable name -> category folder
const COMPOSABLES_DIR = join(ROOT, 'src/composables')
const categories = ['ui', 'editor', 'seo', 'keyword', 'intent']
const map = new Map() // name -> category

for (const cat of categories) {
  const dir = join(COMPOSABLES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.ts')) {
      const name = file.replace(/\.ts$/, '')
      map.set(name, cat)
    }
  }
}

console.log(`Mapped ${map.size} composables across ${categories.length} folders`)

// Scan project files
const EXTS = /\.(ts|vue)$/
const IGNORED = new Set(['node_modules', 'dist', '_bmad-output', '_bmad', '.git', 'docs', 'dist-server'])
const filesToScan = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) continue
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) walk(p)
    else if (EXTS.test(entry)) filesToScan.push(p)
  }
}
walk(ROOT)

console.log(`Scanning ${filesToScan.length} files...`)

// Replace imports
let replacedCount = 0
let touchedFiles = 0

for (const file of filesToScan) {
  let content = readFileSync(file, 'utf8')
  const before = content

  // Match: from '@/composables/useX' OR from "@/composables/useX"
  content = content.replace(
    /(from\s+['"])@\/composables\/(use[A-Z]\w+)(['"])/g,
    (match, p1, name, p3) => {
      const cat = map.get(name)
      if (!cat) return match // not moved, leave as-is
      replacedCount++
      return `${p1}@/composables/${cat}/${name}${p3}`
    },
  )

  if (content !== before) {
    writeFileSync(file, content, 'utf8')
    touchedFiles++
    console.log(`  ✓ ${relative(ROOT, file)}`)
  }
}

console.log(`\nDone: ${replacedCount} imports updated in ${touchedFiles} files.`)
