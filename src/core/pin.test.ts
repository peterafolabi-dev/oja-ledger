import { describe, expect, it } from 'vitest'
import { checkPin, makePin } from './pin'

describe('PIN lock', () => {
  it('accepts the right PIN and rejects wrong ones', async () => {
    const rec = await makePin('2580')
    expect(await checkPin('2580', rec)).toBe(true)
    expect(await checkPin('2581', rec)).toBe(false)
    expect(await checkPin('', rec)).toBe(false)
    expect(await checkPin('25800', rec)).toBe(false)
  })

  it('never stores the PIN itself, and salts every record', async () => {
    const a = await makePin('123456')
    const b = await makePin('123456')
    expect(JSON.stringify(a)).not.toContain('123456')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('rejects PINs that are not 4 to 6 digits', async () => {
    await expect(makePin('12')).rejects.toThrow()
    await expect(makePin('abcd')).rejects.toThrow()
    await expect(makePin('1234567')).rejects.toThrow()
  })
})
