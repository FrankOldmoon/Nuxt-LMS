import { describe, it, expect } from 'vitest'
import { formatTime, formatDate } from '../../app/utils/format'

describe('formatTime', () => {
  it('returns empty string for undefined', () => {
    expect(formatTime(undefined)).toBe('')
  })

  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatTime('')).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(formatTime('not-a-date')).toBe('')
  })

  it('formats a valid timestamp string', () => {
    const result = formatTime('2026-01-15T10:30:00Z')
    expect(result).not.toBe('')
    // Should contain year, month, day, hour, minute
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/1/)
    expect(result).toMatch(/15/)
  })

  it('formats a timestamp without Z suffix', () => {
    const result = formatTime('2026-01-15T10:30:00')
    expect(result).not.toBe('')
    expect(result).toMatch(/2026/)
  })

  it('parses Z-suffixed timestamp as local time (not UTC)', () => {
    // The function strips Z so the time is parsed as local, not UTC
    const withZ = formatTime('2026-01-15T10:30:00Z')
    const withoutZ = formatTime('2026-01-15T10:30:00')
    // Both should produce the same output since Z is stripped
    expect(withZ).toBe(withoutZ)
  })
})

describe('formatDate', () => {
  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('')
  })

  it('formats a valid timestamp string as date only', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    expect(result).not.toBe('')
    // Should contain year, month, day but not time
    expect(result).toMatch(/2026/)
    expect(result).not.toMatch(/\d{2}:\d{2}/)
  })

  it('formats a timestamp without Z suffix', () => {
    const result = formatDate('2026-06-15T08:00:00')
    expect(result).not.toBe('')
    expect(result).toMatch(/2026/)
  })

  it('parses Z-suffixed timestamp as local time', () => {
    const withZ = formatDate('2026-01-15T10:30:00Z')
    const withoutZ = formatDate('2026-01-15T10:30:00')
    expect(withZ).toBe(withoutZ)
  })
})
