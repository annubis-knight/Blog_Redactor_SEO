#!/usr/bin/env node
/**
 * preview-article.mjs — sert les exports HTML PropulSite dans un aperçu local.
 *
 * Problème résolu : les exports (`_auto-output/*.html`) référencent le CSS et les
 * assets en chemins absolus (`/css/tailwindOut.css`, `/assets/...`) qui n'existent
 * que sur le site PropulSite déployé. Ouverts au double-clic ou via Live Server,
 * ils s'affichent sans style ; et un hub en `file://` ne peut pas charger ses
 * iframes (« file: URLs are treated as unique security origins »).
 *
 * Ce script génère, pour chaque export, une copie **autonome** (CSS PropulSite
 * inliné depuis `scripts/preview-assets/`, chrome cassé masqué), un **hub
 * `index.html`** avec un menu déroulant, puis démarre un **petit serveur HTTP
 * local** qui sert le tout — ce qui débloque les iframes et les assets. Aucune
 * dépendance externe, aucun argument requis.
 *
 * Les icônes FontAwesome viennent d'un CDN : elles peuvent être bloquées par la
 * « prévention du suivi » d'Edge/Chrome (cosmétique, sans effet sur la mise en
 * page). Les polices Google Fonts restent chargées via CDN.
 *
 * Usage :
 *   npm run auto:preview                # génère + sert + ouvre le navigateur
 *   npm run auto:preview -- --no-open   # sans ouvrir le navigateur
 *   npm run auto:preview -- --port=4600 # port du serveur (défaut 4599)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync, existsSync, statSync } from 'node:fs'
import { join, dirname, basename, resolve, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const OUTPUT_DIR = join(REPO_ROOT, '_auto-output')
const PREVIEW_DIR = join(OUTPUT_DIR, '_preview')
const ASSETS_SRC = join(__dirname, 'preview-assets')
const CSS_DIR = join(ASSETS_SRC, 'css')
const DEFAULT_PORT = 4599

/** CSS PropulSite à inliner, dans l'ordre du template (cascade respectée). */
const CSS_FILES = ['tailwindOut.css', 'globals.css', 'styles.css']

/** Neutralise le chrome qui pointe vers des assets absents en local. */
const PREVIEW_FIXES = `
    <style>
      /* preview: masque le chrome PropulSite non résolu hors du site déployé */
      [w3-include-html] { display: none !important; }
      img[src^="/assets/svg"], img[src^="/svg"] { display: none !important; }
    </style>`

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function loadInlineCss() {
  return CSS_FILES.map((name) => {
    const css = readFileSync(join(CSS_DIR, name), 'utf8')
    return `    <style data-inlined="${name}">\n${css}\n    </style>`
  }).join('\n')
}

function buildPreview(html, inlineCss) {
  // Remplace les <link href="/css/..."> par le CSS inliné.
  const cssLinkRe = /[ \t]*<link[^>]+href="\/css\/[^"]+"[^>]*>\s*/g
  let out = html.replace(cssLinkRe, '')
  // Retire le script w3-include (navbar/footer) : ses fetch échouent et polluent
  // la console. Les <div w3-include-html> restent, masqués par PREVIEW_FIXES.
  out = out.replace(/<script>\s*function includeHTML[\s\S]*?<\/script>/, '')
  const inject = `${inlineCss}\n${PREVIEW_FIXES}\n</head>`
  out = out.includes('</head>') ? out.replace('</head>', inject) : inject + out
  return out
}

function extractTitle(html, fallback) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : fallback
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Construit le hub avec dropdown + iframe. `items` = [{file, title}]. */
function buildIndex(items) {
  // it.title provient du <title> de l'export : déjà du HTML échappé, inséré tel quel.
  const options = items
    .map((it) => `        <option value="${escapeHtml(it.file)}">${it.title}</option>`)
    .join('\n')
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperçu articles — PropulSite</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { display: flex; flex-direction: column; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    header {
      display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
      padding: 0.75rem 1.25rem; background: #14151a; color: #f4f4f5;
      border-bottom: 1px solid #2a2b33; box-shadow: 0 1px 6px rgba(0,0,0,.15);
    }
    header .brand { font-weight: 700; font-size: 0.95rem; letter-spacing: .02em; }
    header .brand span { color: #7c8cff; }
    header label { font-size: 0.8rem; opacity: .7; }
    select {
      flex: 1; min-width: 240px; max-width: 640px; padding: 0.5rem 0.75rem;
      font-size: 0.95rem; border-radius: 8px; border: 1px solid #3a3b44;
      background: #1e1f26; color: #f4f4f5; cursor: pointer;
    }
    select:focus { outline: 2px solid #7c8cff; outline-offset: 1px; }
    .count { font-size: 0.75rem; opacity: .55; white-space: nowrap; }
    iframe { flex: 1; width: 100%; border: 0; background: #fff; }
  </style>
</head>
<body>
  <header>
    <div class="brand">Propul<span>Site</span> · aperçu articles</div>
    <label for="picker">Article :</label>
    <select id="picker">
${options}
    </select>
    <span class="count">${items.length} article${items.length > 1 ? 's' : ''}</span>
  </header>
  <iframe id="viewer" title="Aperçu de l'article"></iframe>
  <script>
    const picker = document.getElementById('picker');
    const viewer = document.getElementById('viewer');
    const KEY = 'propulsite-preview-last';
    function show(file) {
      viewer.src = '/' + file;
      picker.value = file;
      try { localStorage.setItem(KEY, file); } catch (e) {}
      history.replaceState(null, '', '#' + encodeURIComponent(file));
    }
    picker.addEventListener('change', () => show(picker.value));
    const fromHash = location.hash ? decodeURIComponent(location.hash.slice(1)) : null;
    const saved = (() => { try { return localStorage.getItem(KEY); } catch (e) { return null; } })();
    const opts = [...picker.options].map(o => o.value);
    const initial = [fromHash, saved].find(f => f && opts.includes(f)) || opts[0];
    if (initial) show(initial);
  </script>
</body>
</html>
`
}

function generate() {
  const sources = readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith('.html'))
    .sort()
  if (sources.length === 0) {
    console.error('Aucun export dans _auto-output/. Lance d’abord `npm run auto:article`.')
    process.exit(1)
  }

  mkdirSync(PREVIEW_DIR, { recursive: true })
  // Copie les assets (backgrounds référencés en url() du CSS) sous le root servi.
  if (existsSync(join(ASSETS_SRC, 'assets'))) {
    cpSync(join(ASSETS_SRC, 'assets'), join(PREVIEW_DIR, 'assets'), { recursive: true })
  }

  const inlineCss = loadInlineCss()
  const items = []
  for (const file of sources) {
    const html = readFileSync(join(OUTPUT_DIR, file), 'utf8')
    writeFileSync(join(PREVIEW_DIR, file), buildPreview(html, inlineCss), 'utf8')
    items.push({ file, title: extractTitle(html, basename(file, '.html')) })
    console.log(`✓ ${file}`)
  }
  writeFileSync(join(PREVIEW_DIR, 'index.html'), buildIndex(items), 'utf8')
  console.log(`\n${items.length} article(s) prêts.`)
  return items.length
}

function serve(port, open) {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
    // Empêche toute remontée hors du root servi.
    const filePath = normalize(join(PREVIEW_DIR, rel))
    if (!filePath.startsWith(PREVIEW_DIR)) {
      res.writeHead(403).end('Forbidden')
      return
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404).end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' })
    res.end(readFileSync(filePath))
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${port} déjà utilisé. Relance avec --port=<n>.`)
      process.exit(1)
    }
    throw err
  })

  server.listen(port, () => {
    const url = `http://localhost:${port}/`
    console.log(`\n▶ Aperçu servi sur ${url}`)
    console.log('  (Ctrl+C pour arrêter)')
    if (open) {
      execFile('cmd', ['/c', 'start', '', url], (e) => {
        if (e) console.warn(`  (ouverture auto impossible : ${e.message})`)
      })
    }
  })
}

function main() {
  const args = process.argv.slice(2)
  const noOpen = args.includes('--no-open')
  const portArg = args.find((a) => a.startsWith('--port='))
  const port = portArg ? Number(portArg.split('=')[1]) : DEFAULT_PORT
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`✗ Port invalide : ${portArg}`)
    process.exit(1)
  }
  generate()
  serve(port, !noOpen)
}

main()
