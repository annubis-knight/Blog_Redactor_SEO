import DOMPurify from 'dompurify'
import type { Directive } from 'vue'

/** Strict config for untrusted content (LLM output, user input, markdown) */
const strictConfig: DOMPurify.Config = {
  ADD_ATTR: ['class'],
}

/** Permissive config for trusted SVG (app-internal icon definitions) */
const svgConfig: DOMPurify.Config = {
  ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'g', 'defs', 'use'],
  ADD_ATTR: ['class', 'viewBox', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
    'transform', 'points', 'text-anchor', 'font-size', 'font-weight', 'width', 'height'],
}

/** Sanitize HTML with strict config (default — for LLM/user content) */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, strictConfig)
}

/** Sanitize SVG content with permissive config (for app-internal SVG only) */
export function sanitizeSvg(html: string): string {
  return DOMPurify.sanitize(html, svgConfig)
}

function updateContent(el: HTMLElement, value: unknown, mode: 'strict' | 'svg') {
  const sanitize = mode === 'svg' ? sanitizeSvg : sanitizeHtml
  el.innerHTML = value ? sanitize(String(value)) : ''
}

/** Default directive: strict sanitization (LLM/user content) */
export const safeHtmlDirective: Directive<HTMLElement, unknown> = {
  mounted(el, binding) {
    updateContent(el, binding.value, 'strict')
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      updateContent(el, binding.value, 'strict')
    }
  },
}

/** SVG-safe directive: permissive config for app-internal SVG icons */
export const safeSvgDirective: Directive<HTMLElement, unknown> = {
  mounted(el, binding) {
    updateContent(el, binding.value, 'svg')
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      updateContent(el, binding.value, 'svg')
    }
  },
}
