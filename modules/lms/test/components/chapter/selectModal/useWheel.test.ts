/**
 * selectModal/useWheel.ts 单元测试
 * @see modules/lms/components/chapter/selectModal/useWheel.ts
 *
 * 转盘几何（扇区角度 / 旋转落点 / 取色）与中奖音效。
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  sectorAngles, rotationForIndex, colorAt, playWinSound, WHEEL_COLORS,
} from '../../../../components/chapter/selectModal/useWheel'

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  currentTime = 0
  destination = {}
  closed = false
  startedAt: number[] = []
  constructor() {
    FakeAudioContext.instances.push(this)
  }
  createOscillator() {
    return {
      type: '',
      frequency: { value: 0 },
      connect() {},
      start: (t: number) => { this.startedAt.push(t) },
      stop() {},
    }
  }
  createGain() {
    return {
      connect() {},
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    }
  }
  close() { this.closed = true }
}

afterEach(() => {
  delete (window as any).AudioContext
  delete (window as any).webkitAudioContext
  FakeAudioContext.instances = []
  vi.useRealTimers()
})

describe('useWheel', () => {
  it('sectorAngles：0° 为正上方顺时针等分', () => {
    expect(sectorAngles(0, 4)).toEqual({ start: 0, end: 90, mid: 45 })
    expect(sectorAngles(2, 4)).toEqual({ start: 180, end: 270, mid: 225 })
    expect(sectorAngles(3, 4)).toEqual({ start: 270, end: 360, mid: 315 })
  })

  it('sectorAngles：单人时扇区覆盖整圈', () => {
    expect(sectorAngles(0, 1)).toEqual({ start: 0, end: 360, mid: 180 })
  })

  it('rotationForIndex：目标扇区中心停在指针（正上方）', () => {
    // total=4 index=1 → mid=135 → 目标角 225
    const rot = rotationForIndex(1, 4, 0)
    expect(rot % 360).toBe(225)
    expect((sectorAngles(1, 4).mid + rot) % 360).toBe(0)
  })

  it('rotationForIndex：任意人数下均把所选扇区对准指针且至少转一圈', () => {
    for (const total of [1, 3, 8, 20]) {
      for (let i = 0; i < total; i++) {
        const rot = rotationForIndex(i, total, 0)
        expect(Math.abs(((sectorAngles(i, total).mid + rot) % 360 + 360) % 360)).toBeLessThan(1e-9)
        expect(rot).toBeGreaterThanOrEqual(360 * 5)
      }
    }
  })

  it('rotationForIndex：在已有角度基础上继续递增', () => {
    const first = rotationForIndex(0, 6, 0)
    const second = rotationForIndex(3, 6, first)
    expect(second).toBeGreaterThan(first)
    expect((sectorAngles(3, 6).mid + second) % 360).toBe(0)
  })

  it('colorAt：按调色板循环取色', () => {
    expect(colorAt(0)).toBe(WHEEL_COLORS[0])
    expect(colorAt(WHEEL_COLORS.length)).toBe(WHEEL_COLORS[0])
    expect(colorAt(1)).toBe(WHEEL_COLORS[1])
  })

  it('playWinSound：合成 4 个上行音符并在结束后释放音频上下文', () => {
    vi.useFakeTimers()
    ;(window as any).AudioContext = FakeAudioContext
    playWinSound()
    expect(FakeAudioContext.instances.length).toBe(1)
    const ctx = FakeAudioContext.instances[0]!
    expect(ctx.startedAt.length).toBe(4)
    // 音高递增
    expect(ctx.startedAt[1]!).toBeGreaterThan(ctx.startedAt[0]!)
    vi.advanceTimersByTime(1300)
    expect(ctx.closed).toBe(true)
  })

  it('playWinSound：无 AudioContext 时不抛错', () => {
    expect(() => playWinSound()).not.toThrow()
  })
})
