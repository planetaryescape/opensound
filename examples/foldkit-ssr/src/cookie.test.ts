import { describe, expect, test } from 'vitest'

import { readCountCookie } from './cookie'

describe('readCountCookie', () => {
  test.each([
    { header: 'count=7', count: 7 },
    { header: 'count=-3', count: -3 },
    { header: 'other=8; count=42', count: 42 },
    { header: 'count=9007199254740991', count: 9007199254740991 },
  ])('reads a safe integer from $header', ({ header, count }) => {
    expect(readCountCookie(header)).toBe(count)
  })

  test.each([
    '',
    'other=8',
    'count=7junk',
    'count=1.5',
    'count=Infinity',
    'count=9007199254740992',
    'count=%3Cscript%3E',
  ])('defaults to zero for an absent or invalid count: %s', header => {
    expect(readCountCookie(header)).toBe(0)
  })
})
