/**
 * Color and difficulty level mapping utility tests
 * @see modules/base/utils/colors.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'

// Must stub useI18n before importing colors (colors.ts calls it internally)
import {
  setMockI18n,
  resetAllStubs,
} from '../../../../test/setup/nuxt-stubs'

// Provide i18n stub
beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (key: string) => key,
    d: (v: any) => String(v),
  })
})

describe('utils/colors', () => {
  describe('levelColor', () => {
    it('返回 beginner 对应 success 颜色', async () => {
      const { levelColor } = await import('../../utils/colors')
      expect(levelColor('beginner')).toBe('success')
    })

    it('返回 intermediate 对应 warning 颜色', async () => {
      const { levelColor } = await import('../../utils/colors')
      expect(levelColor('intermediate')).toBe('warning')
    })

    it('返回 advanced 对应 error 颜色', async () => {
      const { levelColor } = await import('../../utils/colors')
      expect(levelColor('advanced')).toBe('error')
    })

    it('返回 i18n 翻译后的文本（中文 beginner）对应 success', async () => {
      setMockI18n({
        locale: { value: 'zh' },
        t: (key: string) => {
          if (key === 'home.levels.beginner') return '入门'
          if (key === 'home.levels.intermediate') return '进阶'
          if (key === 'home.levels.advanced') return '高级'
          return key
        },
        d: (v: any) => String(v),
      })
      const { levelColor } = await import('../../utils/colors')
      expect(levelColor('入门')).toBe('success')
      expect(levelColor('进阶')).toBe('warning')
      expect(levelColor('高级')).toBe('error')
    })

    it('未知难度返回 neutral', async () => {
      const { levelColor } = await import('../../utils/colors')
      expect(levelColor('xxx-unknown')).toBe('neutral')
    })
  })

  describe('colorTextClass', () => {
    it('为每个语义颜色返回对应 text class', async () => {
      const { colorTextClass } = await import('../../utils/colors')
      expect(colorTextClass('primary')).toBe('text-primary')
      expect(colorTextClass('success')).toBe('text-success')
      expect(colorTextClass('info')).toBe('text-info')
      expect(colorTextClass('warning')).toBe('text-warning')
      expect(colorTextClass('error')).toBe('text-error')
      expect(colorTextClass('neutral')).toBe('text-highlighted')
    })

    it('未知颜色回退为 text-primary', async () => {
      const { colorTextClass } = await import('../../utils/colors')
      expect(colorTextClass('unknown-color')).toBe('text-primary')
    })
  })

  describe('colorBgClass', () => {
    it('为每个语义颜色返回对应 bg class', async () => {
      const { colorBgClass } = await import('../../utils/colors')
      expect(colorBgClass('primary')).toBe('bg-primary/10')
      expect(colorBgClass('success')).toBe('bg-success/10')
      expect(colorBgClass('info')).toBe('bg-info/10')
      expect(colorBgClass('warning')).toBe('bg-warning/10')
      expect(colorBgClass('error')).toBe('bg-error/10')
      expect(colorBgClass('neutral')).toBe('bg-elevated')
    })

    it('未知颜色回退为 bg-primary/10', async () => {
      const { colorBgClass } = await import('../../utils/colors')
      expect(colorBgClass('xxx')).toBe('bg-primary/10')
    })
  })

  describe('colorHeroBgClass', () => {
    it('返回对应深色背景 class', async () => {
      const { colorHeroBgClass } = await import('../../utils/colors')
      expect(colorHeroBgClass('primary')).toBe('bg-primary')
      expect(colorHeroBgClass('error')).toBe('bg-error')
      expect(colorHeroBgClass('neutral')).toBe('bg-neutral-700')
    })

    it('未知颜色回退为 bg-primary', async () => {
      const { colorHeroBgClass } = await import('../../utils/colors')
      expect(colorHeroBgClass('nope')).toBe('bg-primary')
    })
  })

  describe('colorOptions / levelOptions', () => {
    it('colorOptions 返回 6 个颜色选项', async () => {
      const { colorOptions } = await import('../../utils/colors')
      const options = colorOptions()
      expect(options).toHaveLength(6)
      expect(options.find(o => o.value === 'primary')).toBeDefined()
      expect(options.find(o => o.value === 'error')).toBeDefined()
    })

    it('levelOptions 返回 3 个难度选项', async () => {
      const { levelOptions } = await import('../../utils/colors')
      const options = levelOptions()
      expect(options).toHaveLength(3)
      expect(options.every(o => typeof o.value === 'string')).toBe(true)
    })
  })
})
