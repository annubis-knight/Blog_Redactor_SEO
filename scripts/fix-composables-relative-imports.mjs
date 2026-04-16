#!/usr/bin/env node
/**
 * One-shot script: converts relative imports inside moved composables
 * to use the @/ and @shared/ aliases (more robust to relocation).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const COMPOSABLES_DIR = join(ROOT, 'src/composables')
const categories = ['ui', 'editor', 'seo', 'keyword', 'intent']

const filesToFix = []
for (const cat of categories) {
  const dir = join(COMPOSABLES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.ts')) filesToFix.push(join(dir, file))
  }
}

console.log(`Fixing relative imports in ${filesToFix.length} composable files...`)

let totalReplacements = 0

for (const file of filesToFix) {
  let content = readFileSync(file, 'utf8')
  const before = content

  // Map of replacements:
  // ../../shared/...  =>  @shared/...
  // ../../../shared/... => @shared/... (in case already broken)
  // ../stores/...   =>  @/stores/...
  // ../utils/...    =>  @/utils/...
  // ../components/... => @/components/...
  // ../types/... (dead) skipped
  // ./X (same folder) kept as-is
  // ../X (sibling composable) needs to be evaluated: likely re-categorized

  content = content
    .replace(
      /(from\s+['"])(?:\.\.\/){2,}shared\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@shared/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/stores\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/stores/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/utils\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/utils/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/components\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/components/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/services\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/services/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/directives\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/directives/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/assets\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/assets/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/router\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/router/${path}${p3}`,
    )
    .replace(
      /(from\s+['"])\.\.\/constants\/([^'"]+)(['"])/g,
      (_m, p1, path, p3) => `${p1}@/constants/${path}${p3}`,
    )

  // Sibling composables: ../useX   =>  @/composables/<cat>/useX  (we don't know cat; let's keep them relative and fix manually if needed)
  // Actually better: rewrite ../useX => @/composables/?? — but we don't know the cat for useX.
  // Solution: build a global map of composable -> cat and rewrite.
  // We'll do this in a second pass.

  if (content !== before) {
    writeFileSync(file, content, 'utf8')
    const count = (before.match(/(from\s+['"])(?:\.\.\/)+/g) || []).length
      - (content.match(/(from\s+['"])(?:\.\.\/)+/g) || []).length
    totalReplacements += count
    console.log(`  ✓ ${relative(ROOT, file)} (${count} imports)`)
  }
}

// Second pass: fix sibling composable imports (../useX)
const composableCat = new Map() // name -> cat
for (const cat of categories) {
  const dir = join(COMPOSABLES_DIR, cat)
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.ts')) {
      composableCat.set(file.replace(/\.ts$/, ''), cat)
    }
  }
}

console.log(`\nPass 2: fixing sibling composable imports...`)
let pass2 = 0
for (const file of filesToFix) {
  let content = readFileSync(file, 'utf8')
  const before = content

  content = content.replace(
    /(from\s+['"])\.\.\/(use[A-Z]\w+)(['"])/g,
    (match, p1, name, p3) => {
      const cat = composableCat.get(name)
      if (!cat) return match
      return `${p1}@/composables/${cat}/${name}${p3}`
    },
  )

  if (content !== before) {
    writeFileSync(file, content, 'utf8')
    pass2++
    console.log(`  ✓ ${relative(ROOT, file)}`)
  }
}

console.log(`\nPass 1: ${totalReplacements} imports | Pass 2: ${pass2} sibling imports fixed.`)
