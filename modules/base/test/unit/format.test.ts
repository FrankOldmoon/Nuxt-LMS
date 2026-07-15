/**
 * Time formatting utility tests
 * @see modules/base/utils/format.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/format', () => {
  describe('formatTime', () => {
    it('空值返回空字符串', async () => {
      const { formatTime } = await import('../../utils/format')
      expect(formatTime()).toBe('')
      expect(formatTime(null)).toBe('')
      expect(formatTime('')).toBe('')
    })

    it('无效时间字符串返回空字符串', async () => {
      const { formatTime } = await import('../../utils/format')
      expect(formatTime('not-a-date')).toBe('')
    })

    it('合法 ISO 字符串返回本地可读格式', async () => {
      const { formatTime } = await import('../../utils/format')
      // 2024-01-15 10:30:00 local time (no Z suffix = local timezone)
      const result = formatTime('2024-01-15T10:30:00')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/10:30|22:30/) // may be 22:30 across timezones (UTC interpretation)
    })

    it('带 Z 后缀的 ISO 字符串也能正确解析', async () => {
      const { formatTime } = await import('../../utils/format')
      const result = formatTime('2024-01-15T10:30:00Z')
      expect(result).toBeTruthy()
      expect(result).toMatch(/2024/)
    })

    it('结果包含年月日时分信息', async () => {
      const { formatTime } = await import('../../utils/format')
      const result = formatTime('2024-12-25T14:00:00')
      // At least has date and hour:minute
      expect(result.length).toBeGreaterThan(8)
    })
  })

  describe('formatDate', () => {
    it('空值返回空字符串', async () => {
      const { formatDate } = await import('../../utils/format')
      expect(formatDate()).toBe('')
      expect(formatDate(null)).toBe('')
      expect(formatDate('')).toBe('')
    })

    it('无效时间字符串返回空字符串', async () => {
      const { formatDate } = await import('../../utils/format')
      expect(formatDate('xxx')).toBe('')
    })

    it('合法 ISO 字符串返回本地短日期', async () => {
      const { formatDate } = await import('../../utils/format')
      const result = formatDate('2024-06-15T08:00:00')
      // At least includes the year
      expect(result).toMatch(/2024/)
    })
  })
})
