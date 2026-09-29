/**
 * Porte « valider la structure » (FR-HN-LOCK-GATE).
 *
 * La structure H1/H2/H3 devient le sommaire de la rédaction : un défaut ici se
 * retrouve dans l'article. Le pilier 1013 avait un H1 sans son mot-clé et quinze
 * chapitres pour un article qui en demandait huit.
 *
 *   ⛔ structure sans aucun H2, H1 absent, titre vide, H3 sans H2 au-dessus ;
 *   🔴 aucune structure du tout (article rédigé sans l'onglet Structure :
 *      assumable, la publication rejoue cette porte), capitaine absent du H1,
 *      nombre de H2 de fond hors des règles du type,
 *      trop de H2 qui citent la ville, pour un pilier un H2 qui développe
 *      (H3) un sujet déjà traité par un autre article du cocon ;
 *   🟠 lieutenant retenu absent des titres, H2 qui recoupe un article du cocon,
 *      H2 d'introduction ou de conclusion (le sommaire les ajoute), trop de H3
 *      sous un H2.
 *
 * Les H2 « de fond » excluent l'introduction et la conclusion : le sommaire les
 * ajoute toujours (`hnToOutline`), et les règles du type les comptent à part.
 */
import { ARTICLE_TYPE_RULES } from '../constants/article-type-rules.js'
import { keywordCoverage } from '../seo-validators.js'
import type { ArticleLevel } from '../types/keyword-validate.types.js'
import type { GateIssue } from './gate.js'
import { distinctRules } from './publish.js'

export interface CocoonArticleRef {
  title: string
  captain: string | null
}

export interface StructureGateInput {
  level: ArticleLevel
  captain: string | null
  /** `article_keywords.hn_structure` : `{ level, text, children? }` (ou l'ancien `{ level: 'H2', title }`). */
  structure: unknown
  /** Lieutenants verrouillés de l'article. */
  lockedLieutenants: string[]
  /** Les AUTRES articles du cocon. */
  cocoonArticles: CocoonArticleRef[]
  /** Ville de la zone du client (« Toulouse, Occitanie » → Toulouse). */
  zone?: string | null
}

export interface StructureHeading {
  level: number
  text: string
}

const INTRODUCTION = /^\s*introduction\b/i
const CONCLUSION = /^\s*(conclusion|en conclusion|pour conclure|pour finir|en r[ée]sum[ée])\b/i

export const isIntroductionTitle = (title: string): boolean => INTRODUCTION.test(title)
export const isConclusionTitle = (title: string): boolean => CONCLUSION.test(title)

function readLevel(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') return Number(raw.trim().replace(/^h/i, ''))
  return Number.NaN
}

/** Titres dans l'ordre de lecture, titres vides compris (ils sont un défaut). */
export function structureHeadings(raw: unknown): StructureHeading[] {
  if (!Array.isArray(raw)) return []
  const out: StructureHeading[] = []
  for (const node of raw) {
    if (typeof node !== 'object' || node === null) continue
    const n = node as { level?: unknown; text?: unknown; title?: unknown; children?: unknown }
    const level = readLevel(n.level)
    const text = typeof n.text === 'string' ? n.text : typeof n.title === 'string' ? n.title : ''
    if (Number.isFinite(level)) out.push({ level, text: text.trim() })
    out.push(...structureHeadings(n.children))
  }
  return out
}

export function isIntroOrConclusion(title: string): boolean {
  return isIntroductionTitle(title) || isConclusionTitle(title)
}

/** H2 de fond : hors introduction et conclusion, que le sommaire ajoute. */
export function bodyH2(headings: StructureHeading[]): StructureHeading[] {
  return headings.filter(h => h.level === 2 && h.text && !isIntroOrConclusion(h.text))
}

export function verifyStructure(input: StructureGateInput): GateIssue[] {
  const rules = ARTICLE_TYPE_RULES[input.level]
  const headings = structureHeadings(input.structure)
  const issues: GateIssue[] = []

  // Aucune structure du tout : l'article n'est pas passé par l'onglet Structure
  // (ancien article, sommaire écrit à la Rédaction). La publication rejoue cette
  // porte : un ⛔ l'aurait bloqué pour toujours ; comme le lexique vide, c'est
  // un risque que l'utilisateur peut assumer (P6).
  if (headings.length === 0) {
    return [{
      rule: 'hn-missing',
      level: 'risque',
      message: 'Aucune structure enregistrée pour cet article.',
      risk: 'Sans structure validée, rien ne garantit le H1 avec le capitaine ni le nombre de chapitres attendu pour ce type d’article.',
    }]
  }

  if (!headings.some(h => h.level === 2 && h.text)) {
    return [{
      rule: 'hn-empty',
      level: 'technique',
      message: 'La structure n’a aucun H2.',
      risk: 'Sans chapitres, la rédaction n’a pas de sommaire à suivre.',
    }]
  }

  const h1 = headings.find(h => h.level === 1)
  if (!h1 || !h1.text) {
    issues.push({ rule: 'hn-h1-missing', level: 'technique', message: 'La structure n’a pas de titre H1.', risk: 'Le H1 est le titre de la page : c’est lui que Google et le lecteur lisent en premier.' })
  } else if (input.captain && keywordCoverage(input.captain, h1.text) < 1) {
    issues.push({
      rule: 'hn-captain-not-in-h1',
      level: 'risque',
      message: `Le H1 « ${h1.text} » ne contient pas le capitaine « ${input.captain} » en entier.`,
      risk: 'Le H1 est le signal le plus fort de la page : sans son mot-clé, elle se positionne mal sur la recherche visée.',
      excerpt: h1.text,
    })
  }

  if (headings.some(h => !h.text)) {
    issues.push({ rule: 'hn-empty-title', level: 'technique', message: 'Un titre de la structure est vide.' })
  }

  let seenH2 = false
  for (const h of headings) {
    if (h.level === 2) seenH2 = true
    if (h.level === 3 && !seenH2) {
      issues.push({ rule: 'hn-h3-without-h2', level: 'technique', message: `Le H3 « ${h.text} » n’a pas de H2 au-dessus.`, risk: 'Une hiérarchie qui saute un niveau est illisible pour Google et les lecteurs d’écran.', excerpt: h.text })
      break
    }
  }

  const body = bodyH2(headings)
  if (body.length < rules.h2Min || body.length > rules.h2Max) {
    issues.push({
      rule: 'hn-h2-count',
      level: 'risque',
      message: `${body.length} H2 de fond pour un ${rules.label.toLowerCase()} : ${rules.h2Min} à ${rules.h2Max} attendus (introduction et conclusion en plus).`,
      risk: body.length > rules.h2Max
        ? 'Trop de chapitres : l’article s’étale, chaque partie reste en surface et empiète sur les autres articles du cocon.'
        : 'Trop peu de chapitres : l’article ne couvre pas les questions que se pose le lecteur.',
    })
  }

  for (const h of headings.filter(x => x.level === 2 && isIntroOrConclusion(x.text))) {
    issues.push({ rule: 'hn-intro-conclusion', level: 'attention', message: `« ${h.text} » : l’introduction et la conclusion sont ajoutées par le sommaire, ce titre ferait doublon.`, excerpt: h.text })
  }

  // H3 par H2.
  let current: StructureHeading | null = null
  let h3Count = 0
  const flushH3 = () => {
    if (current && h3Count > rules.h3PerH2Max) {
      issues.push({ rule: 'hn-h3-too-many', level: 'attention', message: `${h3Count} H3 sous « ${current.text} » : ${rules.h3PerH2Max} au plus.`, excerpt: current.text })
    }
  }
  for (const h of headings) {
    if (h.level === 2) { flushH3(); current = h; h3Count = 0 } else if (h.level === 3) h3Count++
  }
  flushH3()

  const city = input.zone?.split(',')[0]?.trim()
  if (city) {
    const local = body.filter(h => keywordCoverage(city, h.text) >= 1)
    if (local.length > rules.localH2Max) {
      issues.push({
        rule: 'hn-local-overuse',
        level: 'risque',
        message: `${local.length} H2 citent ${city} : ${rules.localH2Max === 0 ? 'aucun' : `au plus ${rules.localH2Max}`} pour un ${rules.label.toLowerCase()}.`,
        risk: 'Répéter la ville dans les titres sent le bourrage : Google le repère, le lecteur aussi.',
      })
    }
  }

  const titles = headings.filter(h => h.level === 2 || h.level === 3).map(h => h.text)
  for (const lieutenant of input.lockedLieutenants) {
    if (!titles.some(t => keywordCoverage(lieutenant, t) >= 0.75)) {
      issues.push({ rule: `hn-lieutenant-missing:${lieutenant}`, level: 'attention', message: `Le lieutenant « ${lieutenant} » n’apparaît dans aucun titre.`, excerpt: lieutenant })
    }
  }

  if (input.level === 'pilier') {
    for (const [index, h2] of headings.entries()) {
      if (h2.level !== 2 || !h2.text) continue
      const child = input.cocoonArticles.find(a => a.captain && keywordCoverage(a.captain, h2.text) >= 1)
      if (!child) continue
      const next = headings.slice(index + 1)
      const end = next.findIndex(h => h.level <= 2)
      const developed = (end === -1 ? next : next.slice(0, end)).some(h => h.level === 3)
      issues.push(developed
        ? {
            rule: `hn-overlaps-article:${child.title}`,
            level: 'risque',
            message: `« ${h2.text} » développe un sujet que traite déjà l’article « ${child.title} ».`,
            risk: 'Deux pages qui creusent le même sujet se concurrencent dans Google. Le pilier résume ce chapitre et renvoie vers l’article.',
            alternatives: [`Garder ce H2 sans H3 : un résumé de 150 à 250 mots et un lien vers « ${child.title} »`],
          }
        : {
            rule: `hn-overlaps-article:${child.title}`,
            level: 'attention',
            message: `« ${h2.text} » recoupe l’article « ${child.title} » : résumez-le et liez-le.`,
          })
    }
  }

  return distinctRules(issues)
}
