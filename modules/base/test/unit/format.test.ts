/**
 * 时间格式化工具测试
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
      // 2024-01-15 10:30:00 本地时间（无 Z 后缀 = 本地时区）
      const result = formatTime('2024-01-15T10:30:00')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/10:30|22:30/) // 跨时区可能 22:30（UTC 解读）
    })

    it('带 Z 后缀的 ISO 字符串也能正确解析', async () => {
      const { formatTime } = await import('../../utils/format')
      const result = formatTime('2024-01-15T10:30:00Z')
      expect(result).toBeTruthy()
      expect(result).toMatch(/2024/)
    })

    it('带 Z 字符串按 UTC 解析、按浏览器本地时区显示（与 new Date 一致）', async () => {
      const { formatTime } = await import('../../utils/format')
      // 后端返回带 Z 的 UTC 字符串（timestamp without time zone 被驱动序列化为 UTC）
      const result = formatTime('2024-01-15T10:30:00Z')
      const expected = new Date('2024-01-15T10:30:00Z').toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      expect(result).toBe(expected)
    })

    it('指定 timeZone 时按该时区渲染（与浏览器时区无关）', async () => {
      const { formatTime } = await import('../../utils/format')
      // 2024-01-15T10:30:00Z = 北京时间 18:30
      const result = formatTime('2024-01-15T10:30:00Z', 'Asia/Shanghai')
      const expected = new Date('2024-01-15T10:30:00Z').toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai',
      })
      expect(result).toBe(expected)
      // 北京 18:30 与 UTC 10:30 分属不同时区：两者应不一致（证明按北京渲染而非浏览器时区）
      const utcDisplay = new Date('2024-01-15T10:30:00Z').toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
      })
      expect(result).not.toBe(utcDisplay)
    })

    it('结果包含年月日时分信息', async () => {
      const { formatTime } = await import('../../utils/format')
      const result = formatTime('2024-12-25T14:00:00')
      // 至少有日期和时分
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
      // 至少包含年份
      expect(result).toMatch(/2024/)
    })
  })
})
