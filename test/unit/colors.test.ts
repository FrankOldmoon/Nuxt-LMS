import { describe, it, expect, vi, beforeEach } from 'vitest'
import { colorBgClass, colorHeroBgClass, colorTextClass, levelColor } from '../../app/utils/colors'

describe('colorBgClass', () => {
  it('returns correct bg class for primary', () => {
    expect(colorBgClass('primary')).toBe('bg-primary/10')
  })

  it('returns correct bg class for success', () => {
    expect(colorBgClass('success')).toBe('bg-success/10')
  })

  it('returns correct bg class for info', () => {
    expect(colorBgClass('info')).toBe('bg-info/10')
  })

  it('returns correct bg class for warning', () => {
    expect(colorBgClass('warning')).toBe('bg-warning/10')
  })

  it('returns correct bg class for error', () => {
    expect(colorBgClass('error')).toBe('bg-error/10')
  })

  it('returns elevated bg for neutral', () => {
    expect(colorBgClass('neutral')).toBe('bg-elevated')
  })

  it('defaults to bg-primary/10 for unknown color', () => {
    expect(colorBgClass('unknown')).toBe('bg-primary/10')
    expect(colorBgClass('')).toBe('bg-primary/10')
  })
})

describe('colorHeroBgClass', () => {
  it('returns solid bg for primary', () => {
    expect(colorHeroBgClass('primary')).toBe('bg-primary')
  })

  it('returns solid bg for success', () => {
    expect(colorHeroBgClass('success')).toBe('bg-success')
  })

  it('returns solid bg for info', () => {
    expect(colorHeroBgClass('info')).toBe('bg-info')
  })

  it('returns solid bg for warning', () => {
    expect(colorHeroBgClass('warning')).toBe('bg-warning')
  })

  it('returns solid bg for error', () => {
    expect(colorHeroBgClass('error')).toBe('bg-error')
  })

  it('returns neutral-700 for neutral', () => {
    expect(colorHeroBgClass('neutral')).toBe('bg-neutral-700')
  })

  it('defaults to bg-primary for unknown color', () => {
    expect(colorHeroBgClass('unknown')).toBe('bg-primary')
    expect(colorHeroBgClass('')).toBe('bg-primary')
  })
})

describe('colorTextClass', () => {
  it('returns correct text class for primary', () => {
    expect(colorTextClass('primary')).toBe('text-primary')
  })

  it('returns correct text class for success', () => {
    expect(colorTextClass('success')).toBe('text-success')
  })

  it('returns correct text class for info', () => {
    expect(colorTextClass('info')).toBe('text-info')
  })

  it('returns correct text class for warning', () => {
    expect(colorTextClass('warning')).toBe('text-warning')
  })

  it('returns correct text class for error', () => {
    expect(colorTextClass('error')).toBe('text-error')
  })

  it('returns highlighted text for neutral', () => {
    expect(colorTextClass('neutral')).toBe('text-highlighted')
  })

  it('defaults to text-primary for unknown color', () => {
    expect(colorTextClass('unknown')).toBe('text-primary')
    expect(colorTextClass('')).toBe('text-primary')
  })
})

describe('levelColor', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    // Default stub: returns key as-is (no translation)
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key,
    }))
  })

  it('returns success for beginner (direct key)', () => {
    expect(levelColor('beginner')).toBe('success')
  })

  it('returns warning for intermediate (direct key)', () => {
    expect(levelColor('intermediate')).toBe('warning')
  })

  it('returns error for advanced (direct key)', () => {
    expect(levelColor('advanced')).toBe('error')
  })

  it('returns neutral for unknown level', () => {
    expect(levelColor('unknown')).toBe('neutral')
  })

  it('returns neutral for empty string', () => {
    expect(levelColor('')).toBe('neutral')
  })

  it('matches i18n translated level text via useI18n fallback', () => {
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => {
        const map: Record<string, string> = {
          'home.levels.beginner': '入门',
          'home.levels.intermediate': '中级',
          'home.levels.advanced': '高级',
        }
        return map[key] || key
      },
    }))

    expect(levelColor('入门')).toBe('success')
    expect(levelColor('中级')).toBe('warning')
    expect(levelColor('高级')).toBe('error')
  })

  it('returns neutral for translated text not in map', () => {
    expect(levelColor('专家级')).toBe('neutral')
  })
})
