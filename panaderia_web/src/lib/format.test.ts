import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

// Use a noon-UTC timestamp so the displayed date is stable across timezones:
// UTC noon → Argentina (UTC-3) 09:00 → both show 15/01/2025
const JAN_15_NOON_UTC = '2025-01-15T12:00:00Z'

describe('formatCurrency', () => {
  it('returns a string', () => {
    expect(typeof formatCurrency(850)).toBe('string')
  })

  it('includes the ARS peso symbol', () => {
    expect(formatCurrency(1000)).toContain('$')
  })

  it('uses comma as decimal separator (es-AR convention)', () => {
    expect(formatCurrency(1.5)).toContain(',')
  })

  it('formats two decimal places for zero', () => {
    expect(formatCurrency(0)).toContain('0,00')
  })

  it('uses dot as thousands separator for large amounts', () => {
    // 1.000 in es-AR grouping
    expect(formatCurrency(1000)).toContain('1.000')
  })

  it('accepts a plain number — no parseFloat needed', () => {
    expect(() => formatCurrency(850)).not.toThrow()
    // Verify the value is incorporated correctly
    expect(formatCurrency(850)).toContain('850')
  })

  it('handles negative values', () => {
    const result = formatCurrency(-100)
    expect(result).toContain('100')
    expect(result).toContain('-')
  })
})

describe('formatDate', () => {
  it('formats ISO timestamp as dd/mm/yyyy', () => {
    expect(formatDate(JAN_15_NOON_UTC)).toBe('15/01/2025')
  })

  it('returns a string', () => {
    expect(typeof formatDate(JAN_15_NOON_UTC)).toBe('string')
  })

  it('formats end-of-month dates correctly', () => {
    // 31 march noon UTC
    expect(formatDate('2025-03-31T12:00:00Z')).toBe('31/03/2025')
  })
})

describe('formatDateTime', () => {
  it('includes the date portion', () => {
    expect(formatDateTime(JAN_15_NOON_UTC)).toContain('15/01/2025')
  })

  it('includes a HH:MM time component', () => {
    expect(formatDateTime(JAN_15_NOON_UTC)).toMatch(/\d{2}:\d{2}/)
  })

  it('returns a string longer than formatDate', () => {
    const date = formatDate(JAN_15_NOON_UTC)
    const dateTime = formatDateTime(JAN_15_NOON_UTC)
    expect(dateTime.length).toBeGreaterThan(date.length)
  })
})
