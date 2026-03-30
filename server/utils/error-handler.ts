import type { Request, Response, NextFunction } from 'express'
import { log } from './logger.js'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  log.error(`${req.method} ${req.path} — ${err.message}`)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: err.message },
  })
}
