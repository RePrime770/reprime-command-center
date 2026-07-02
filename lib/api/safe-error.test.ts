import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeError } from './safe-error'

describe('safeError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 500 internal_error by default', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = safeError('test/route', new Error('secret upstream detail'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'internal_error' })
  })

  it('never echoes the error message to the client', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = safeError('test/route', new Error('https://internal.example/token?k=v'))
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('internal.example')
    expect(JSON.stringify(body)).not.toContain('token')
  })

  it('honors custom code and status', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = safeError('test/route', new Error('x'), { code: 'db_select_failed', status: 502 })
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body).toEqual({ error: 'db_select_failed' })
  })

  it('logs the full error server-side with the route tag', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    safeError('whatsapp/threads', err)
    expect(spy).toHaveBeenCalledWith('[whatsapp/threads]', err)
  })

  it('tolerates non-Error throwables', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = safeError('test/route', 'string-throw')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'internal_error' })
  })
})
