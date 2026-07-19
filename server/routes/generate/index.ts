import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import outlineRouter from './outline.routes.js'
import articleRouter from './article.routes.js'
import reduceSectionRouter from './reduce-section.routes.js'
import humanizeSectionRouter from './humanize-section.routes.js'
import metaRouter from './meta.routes.js'
import actionRouter from './action.routes.js'
import microContextSuggestRouter from './micro-context-suggest.routes.js'
import briefExplainRouter from './brief-explain.routes.js'
import autoIntakeRouter from './auto-intake.routes.js'
import placementSuggestRouter from './placement-suggest.routes.js'

const router = Router()

/**
 * Merge each sub-router's stack into the parent so that all routes appear at
 * the top level (vs nested behind `router.use(subRouter)` layers). This keeps
 * the public Router shape identical to the pre-split monolithic file: tests
 * (and any other introspection) can still walk `router.stack` and find every
 * route via `layer.route.path`.
 */
function mergeRouter(parent: ExpressRouter, child: ExpressRouter): void {
  const parentStack = (parent as unknown as { stack: unknown[] }).stack
  const childStack = (child as unknown as { stack: unknown[] }).stack
  for (const layer of childStack) {
    parentStack.push(layer)
  }
}

mergeRouter(router, outlineRouter)
mergeRouter(router, articleRouter)
mergeRouter(router, reduceSectionRouter)
mergeRouter(router, humanizeSectionRouter)
mergeRouter(router, metaRouter)
mergeRouter(router, actionRouter)
mergeRouter(router, microContextSuggestRouter)
mergeRouter(router, briefExplainRouter)
mergeRouter(router, autoIntakeRouter)
mergeRouter(router, placementSuggestRouter)

export default router
