import { describe, it, expect } from 'vitest'
import { parseSseBuffer } from '../../../../scripts/auto-article/sse.js'

describe('auto:sse — parseSseBuffer', () => {
  it('décode une trame event + data JSON', () => {
    const { events, rest } = parseSseBuffer('event: chunk\ndata: {"content":"hi"}\n\n')
    expect(rest).toBe('')
    expect(events).toEqual([{ event: 'chunk', data: { content: 'hi' } }])
  })

  it('décode plusieurs trames dans un buffer', () => {
    const buf =
      'event: section-start\ndata: {"index":0}\n\n' +
      'event: chunk\ndata: {"content":"a"}\n\n'
    const { events } = parseSseBuffer(buf)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ event: 'section-start', data: { index: 0 } })
  })

  it('conserve le reliquat incomplet', () => {
    const { events, rest } = parseSseBuffer('event: chunk\ndata: {"content":"a"}\n\nevent: chunk\ndata: {"con')
    expect(events).toHaveLength(1)
    expect(rest).toBe('event: chunk\ndata: {"con')
  })

  it('event par défaut = "message" sans ligne event', () => {
    const { events } = parseSseBuffer('data: {"x":1}\n\n')
    expect(events[0]?.event).toBe('message')
  })

  it('garde la string brute si data non-JSON', () => {
    const { events } = parseSseBuffer('event: note\ndata: coucou\n\n')
    expect(events[0]).toEqual({ event: 'note', data: 'coucou' })
  })

  it('normalise les CRLF', () => {
    const { events } = parseSseBuffer('event: chunk\r\ndata: {"content":"x"}\r\n\r\n')
    expect(events[0]).toEqual({ event: 'chunk', data: { content: 'x' } })
  })

  it('ignore les lignes de commentaire SSE', () => {
    const { events } = parseSseBuffer(': keep-alive\nevent: ping\ndata: {}\n\n')
    expect(events[0]?.event).toBe('ping')
  })
})
