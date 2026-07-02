import { describe, expect, test } from 'vitest'
import {
  DEEP_LINK_ID_MAX_LENGTH,
  cockpitEmailLink,
  cockpitThreadLink,
  isValidDeepLinkId,
  parseCockpitParams,
} from './deep-links'

describe('cockpitThreadLink', () => {
  test('builds a /cockpit URL with openThread param', () => {
    // Arrange
    const threadId = 'th-001'

    // Act
    const link = cockpitThreadLink(threadId)

    // Assert
    expect(link).toBe('/cockpit?openThread=th-001')
  })

  test('accepts real-world id shapes (colon, dot, at, uuid)', () => {
    expect(cockpitThreadLink('no-thread:inv_7')).toBe(
      '/cockpit?openThread=no-thread%3Ainv_7'
    )
    expect(cockpitThreadLink('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      '/cockpit?openThread=a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    )
  })

  test('falls back to bare /cockpit for invalid ids', () => {
    expect(cockpitThreadLink('')).toBe('/cockpit')
    expect(cockpitThreadLink('has spaces')).toBe('/cockpit')
    expect(cockpitThreadLink('<script>')).toBe('/cockpit')
    expect(cockpitThreadLink('a/b?c=d')).toBe('/cockpit')
    expect(cockpitThreadLink('x'.repeat(DEEP_LINK_ID_MAX_LENGTH + 1))).toBe(
      '/cockpit'
    )
  })
})

describe('cockpitEmailLink', () => {
  test('builds a /cockpit URL with openEmail param', () => {
    expect(cockpitEmailLink('18f2ab9cde34')).toBe(
      '/cockpit?openEmail=18f2ab9cde34'
    )
  })

  test('falls back to bare /cockpit for invalid ids', () => {
    expect(cockpitEmailLink('')).toBe('/cockpit')
    expect(cockpitEmailLink('"onmouseover="x')).toBe('/cockpit')
  })
})

describe('isValidDeepLinkId', () => {
  test('accepts ids up to the length cap', () => {
    expect(isValidDeepLinkId('a'.repeat(DEEP_LINK_ID_MAX_LENGTH))).toBe(true)
  })

  test('rejects non-strings, empty, over-long, and unsafe charsets', () => {
    expect(isValidDeepLinkId(null)).toBe(false)
    expect(isValidDeepLinkId(undefined)).toBe(false)
    expect(isValidDeepLinkId(42)).toBe(false)
    expect(isValidDeepLinkId('')).toBe(false)
    expect(isValidDeepLinkId('a'.repeat(DEEP_LINK_ID_MAX_LENGTH + 1))).toBe(false)
    expect(isValidDeepLinkId('-leading-separator')).toBe(false)
    expect(isValidDeepLinkId('a&b')).toBe(false)
    expect(isValidDeepLinkId('a#b')).toBe(false)
  })
})

describe('parseCockpitParams', () => {
  test('parses openThread from a search string with leading ?', () => {
    expect(parseCockpitParams('?openThread=th-001')).toEqual({
      openThread: 'th-001',
    })
  })

  test('parses openEmail from a search string without leading ?', () => {
    expect(parseCockpitParams('openEmail=18f2ab9cde34')).toEqual({
      openEmail: '18f2ab9cde34',
    })
  })

  test('parses both params together and ignores unrelated params', () => {
    expect(
      parseCockpitParams('?openThread=th-001&openEmail=abc123&utm_source=x')
    ).toEqual({ openThread: 'th-001', openEmail: 'abc123' })
  })

  test('accepts URLSearchParams input', () => {
    const params = new URLSearchParams({ openThread: 'no-thread:inv_7' })
    expect(parseCockpitParams(params)).toEqual({ openThread: 'no-thread:inv_7' })
  })

  test('round-trips ids produced by the link builders', () => {
    const link = cockpitThreadLink('no-thread:inv_7')
    const search = link.split('?')[1] ?? ''
    expect(parseCockpitParams(search)).toEqual({ openThread: 'no-thread:inv_7' })
  })

  test('returns {} for empty, null, undefined, or param-less input', () => {
    expect(parseCockpitParams('')).toEqual({})
    expect(parseCockpitParams(null)).toEqual({})
    expect(parseCockpitParams(undefined)).toEqual({})
    expect(parseCockpitParams('?foo=bar')).toEqual({})
  })

  test('omits invalid ids instead of throwing', () => {
    expect(parseCockpitParams('?openThread=%3Cscript%3E')).toEqual({})
    expect(parseCockpitParams('?openEmail=a b')).toEqual({})
    expect(
      parseCockpitParams(`?openThread=${'x'.repeat(DEEP_LINK_ID_MAX_LENGTH + 1)}`)
    ).toEqual({})
  })

  test('keeps the valid param when the other is invalid', () => {
    expect(parseCockpitParams('?openThread=th-001&openEmail=<bad>')).toEqual({
      openThread: 'th-001',
    })
  })
})
