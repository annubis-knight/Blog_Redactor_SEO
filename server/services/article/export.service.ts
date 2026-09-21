import { readFile } from 'fs/promises'
import { join } from 'path'
import { log } from '../../utils/logger.js'
import { splitByH2Regex } from '../../../shared/html-utils.js'
import { stripContentH1 } from '../../../shared/ai-text.js'
import { startsWithQuestionWord } from '../../../shared/french-text.js'
import { SITE_ORIGIN, blogUrl } from '../../../shared/constants/site.constants.js'
import { rewriteInternalLinks } from '../../../shared/internal-links.js'

const DOCS_DIR = join(process.cwd(), 'docs')

/** Origine du site : `.env` peut remplacer le domaine validé (pré-production). */
const siteOrigin = (): string => (process.env.SITE_URL ?? SITE_ORIGIN).replace(/\/+$/, '')

/** Read and concatenate the Propulsite CSS files for inline embedding */
async function loadPropulsiteCss(): Promise<string> {
  const files = ['tailwindOut.css', 'variables.css', 'styles.css']
  const parts: string[] = []
  for (const file of files) {
    try {
      const css = await readFile(join(DOCS_DIR, file), 'utf-8')
      parts.push(`/* --- ${file} --- */\n${css}`)
    } catch {
      log.warn(`loadPropulsiteCss: ${file} not found, skipping`)
    }
  }
  return parts.join('\n\n')
}

interface ExportOptions {
  title: string
  metaTitle: string
  metaDescription: string
  cocoonName: string
  content: string
  /** Optional JSON-LD script block to inject in <head> */
  jsonLd?: string
  /** When true, CSS is inlined as <style> instead of external <link> tags (for iframe preview) */
  embedCss?: boolean
  /** Slug de l'article — pose le lien canonique et les balises Open Graph. */
  slug?: string
  /** Slug de chaque article connu, par id : résout les liens `#article-<id>`. */
  linkSlugById?: Record<number, string>
  /** Slugs des articles rédigés : les liens vers le reste sont déballés. */
  publishedSlugs?: string[]
}

/** Parse TipTap HTML to extract structured sections (uses shared splitByH2Regex) */
function parseSections(html: string): { intro: string; chapters: { title: string; id: string; body: string }[]; conclusion: string } {
  const split = splitByH2Regex(html)

  // Intro sections (H2 "Introduction") get merged into intro text
  const introSections = split.sections.filter(s => s.isIntro)
  const introParts = [split.intro, ...introSections.map(s => s.bodyHtml)].filter(Boolean)

  return {
    intro: introParts.join('\n').trim(),
    chapters: split.sections
      .filter(s => !s.isIntro && !s.isConclusion)
      .map(s => ({ title: s.title, id: slugify(s.title), body: s.bodyHtml })),
    conclusion: split.sections.find(s => s.isConclusion)?.bodyHtml ?? '',
  }
}

/** Create a URL-friendly slug from text */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Lien canonique + balises Open Graph.
 *
 * Sans canonique, deux adresses menant au même article se font concurrence
 * dans Google. Sans Open Graph, un partage sur LinkedIn ou WhatsApp affiche
 * une vignette vide.
 */
function canonicalBlock(slug: string | undefined, metaTitle: string, metaDescription: string): string {
  if (!slug) return ''
  const url = blogUrl(slug, siteOrigin())
  return [
    `    <link rel="canonical" href="${url}">`,
    `    <meta property="og:type" content="article">`,
    `    <meta property="og:title" content="${escapeHtml(metaTitle)}">`,
    `    <meta property="og:description" content="${escapeHtml(metaDescription)}">`,
    `    <meta property="og:url" content="${url}">`,
    `    <meta property="og:locale" content="fr_FR">`,
    '',
  ].join('\n')
}

/** Build the sommaire (table of contents) HTML */
function buildSommaire(chapters: { title: string; id: string }[], hasConclusion: boolean): string {
  const items = chapters.map((ch) => `                                    <li><a href="#${ch.id}">${ch.title}</a></li>`)

  if (hasConclusion) {
    items.push('                                    <li><a href="#conclusion">Conclusion</a></li>')
  }

  return items.join('\n')
}

/** Build chapter HTML sections */
function buildChapters(chapters: { title: string; id: string; body: string }[]): string {
  return chapters.map((ch) => `
                        <!-- CHAPTER: ${ch.title} -->
                        <div id="${ch.id}" class="col-span-8 pad-y-small">
                            <h2>${ch.title}</h2>
                            ${ch.body}
                        </div>`).join('\n')
}

/** Generate full Propulsite-compliant HTML from article data */
export async function generateExportHtml(options: ExportOptions): Promise<string> {
  const { title, metaTitle, metaDescription, cocoonName, content, jsonLd, embedCss, slug } = options
  log.info(`generateExportHtml: ${title}`, { contentLength: content.length, hasJsonLd: !!jsonLd, embedCss: !!embedCss })

  // Les liens internes du contenu portent la forme de l'outil qui les a écrits
  // (`#article-<id>` côté éditeur, `/<slug>` côté robot). L'export les ramène à
  // `/blog/<slug>` et déballe ceux dont la cible n'est pas publiée.
  const linked = rewriteInternalLinks(content, {
    slugById: options.linkSlugById,
    knownSlugs: options.publishedSlugs,
  })
  if (linked.unwrapped.length > 0) {
    log.warn(`generateExportHtml: ${linked.unwrapped.length} lien(s) interne(s) déballé(s)`, {
      anchors: linked.unwrapped.slice(0, 5),
    })
  }

  // Le bandeau ci-dessous pose déjà le `<h1>` de la page. Le contenu généré en
  // porte un lui aussi (consigne d'intro du prompt) → deux H1 sur la page
  // exportée, constaté sur #455 (audit 2026-09-19). On retire celui du corps,
  // ce qui répare aussi les articles déjà en base au prochain export.
  const { intro, chapters, conclusion } = parseSections(stripContentH1(linked.html))
  log.debug(`generateExportHtml: parsed ${chapters.length} chapters, intro=${intro.length > 0}, conclusion=${conclusion.length > 0}`)
  const sommaire = buildSommaire(chapters, conclusion.length > 0)

  const breadcrumb = `Propulsite / Blog / ${cocoonName} / ${title}`

  const jsonLdBlock = jsonLd
    ? `    <script type="application/ld+json">\n${jsonLd}\n    </script>`
    : ''

  const conclusionHtml = conclusion
    ? `
                        <!-- CONCLUSION -->
                        <div id="conclusion" class="col-span-8 pad-y-small">
                            <h2>Conclusion</h2>
                            ${conclusion}
                        </div>`
    : ''

  // In preview mode (embedCss), assets are served from Vite public/ at root (e.g. /svg/, /images/)
  // In export mode, assets are at /assets/svg/, /assets/images/ on the Propulsite production site
  const assetPrefix = embedCss ? '' : '/assets'

  const cssBlock = embedCss
    ? `    <style>\n${(await loadPropulsiteCss()).replace(/\/assets\//g, '/')}\n    </style>`
    : `    <link href="/css/tailwindOut.css" rel="stylesheet">
    <link href="/css/globals.css" rel="stylesheet">
    <link href="/css/styles.css" rel="stylesheet">`

  const baseTag = embedCss ? '    <base href="/">\n' : ''

  const html = `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
${baseTag}    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDescription)}">
${canonicalBlock(slug, metaTitle, metaDescription)}    <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Text&family=Red+Hat+Text:wght@400;500;600;700&display=swap"
        rel="stylesheet">
    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Petrona:ital,wght@0,100..900;1,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
${cssBlock}
${jsonLdBlock}
</head>

<body>
    <div w3-include-html="/components/navbar.html"></div>
    <main class="mx-auto">
        <!-- Section Hero -->
        <section id="sectionHeroRealisation" class="pad-y-large">
            <div class="absoluteIcon2">
                <img src="${assetPrefix}/svg/NomIcone=outStr_Arrow.svg" alt="Image absolute" class="w-full">
            </div>
            <div class="containerMax mx-auto x-5">
                <div class="grid-tailwind py-20">
                    <div class="col-span-full flex flex-col">
                        <h1>${escapeHtml(title)}</h1>
                        <p class="text-large">${escapeHtml(metaDescription)}</p>
                    </div>
                </div>
            </div>
        </section>

        <article>
            <section class="pad-y-small">
                <div class="containerMax">
                    <div class="grid-tailwind">

                        <!-- SOMMAIRE -->
                        <div id="section-sommaire" class="col-span-8 pad-y-small">
                                <p class="text-small">${escapeHtml(breadcrumb)}</p>
                                <h2>Sommaire</h2>
                                <ul>
${sommaire}
                                </ul>
                        </div>

                        <!-- INTRODUCTION -->
                        <div class="col-span-8 pad-y-small">
                            <h2>Introduction</h2>
                            ${intro}
                        </div>
${buildChapters(chapters)}
${conclusionHtml}

                    </div>
                </div>
            </section>
        </article>
    </main>
    <div w3-include-html="/components/footer.html"></div>

    <script>
        function includeHTML() {
            let elements = document.querySelectorAll("[w3-include-html]");
            elements.forEach(el => {
                let file = el.getAttribute("w3-include-html");
                fetch(file)
                    .then(response => response.text())
                    .then(data => el.innerHTML = data);
            });
        }
        includeHTML();
    </script>
</body>

</html>`

  return html
}

/** Escape HTML special characters for attribute values */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Generate JSON-LD for Article, FAQPage, BreadcrumbList */
export function generateJsonLd(options: {
  title: string
  metaDescription: string
  cocoonName: string
  slug: string
  content: string
  datePublished?: string
}): string {
  const { title, metaDescription, cocoonName, slug, content, datePublished } = options
  log.info(`generateJsonLd: ${slug}`)
  const now = datePublished || new Date().toISOString()

  // Extract H2 questions for FAQPage (using shared splitter)
  const split = splitByH2Regex(content)
  const questions: { question: string; answer: string }[] = []

  for (const section of split.sections) {
    // Check if heading is a question
    // `startsWithQuestionWord` remplace un motif maison qui utilisait `\b` :
    // en JS, `où\b` ne matche jamais (« ù » n'est pas un caractère de mot),
    // donc les sections « Où … » n'entraient pas dans le FAQPage.
    if (section.title.includes('?') || startsWithQuestionWord(section.title)) {
      // Extract first paragraph as answer
      const pMatch = /<p[^>]*>(.*?)<\/p>/is.exec(section.bodyHtml)
      const answer = pMatch ? pMatch[1]!.replace(/<[^>]+>/g, '').trim() : ''
      if (answer) {
        questions.push({ question: section.title, answer })
      }
    }
  }

  const schemas: object[] = []

  // Article schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: metaDescription,
    author: {
      '@type': 'Organization',
      name: 'PropulSite',
    },
    datePublished: now,
    dateModified: now,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': blogUrl(slug, siteOrigin()),
    },
  })

  // FAQPage schema (if questions found)
  if (questions.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    })
  }

  // BreadcrumbList schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'PropulSite',
        item: siteOrigin(),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteOrigin()}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: cocoonName,
        item: `${siteOrigin()}/blog/${slugify(cocoonName)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: title,
        item: blogUrl(slug, siteOrigin()),
      },
    ],
  })

  log.debug(`generateJsonLd: ${schemas.length} schemas, ${questions.length} FAQ questions`)
  return JSON.stringify(schemas, null, 2)
}