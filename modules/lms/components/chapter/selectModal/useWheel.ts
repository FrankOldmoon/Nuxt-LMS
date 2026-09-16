/**
 * 彩色大转盘选人：扇区几何、旋转落点与中奖音效
 *
 * - sectorAngles：扇区起止与中心角度（0° 指向正上方，顺时针递增）
 * - rotationForIndex：让指定扇区的中心停在指针正下方所需的目标旋转角
 * - useWheelPicker：旋转角度状态 + spinTo / rotateTo
 * - playWinSound：Web Audio 现场合成的中奖音效（与 useChapterTimer 提示音同思路，不依赖音频文件）
 */

// 转盘配色：高饱和循环取色，保证相邻扇区颜色不同
export const WHEEL_COLORS = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c',
  '#38d9a9', '#4dabf7', '#748ffc', '#da77f2',
  '#f783ac', '#20c997', '#f06595', '#fab005',
]

/** 随机抽取的旋转时长（ms），需与 wheel.vue 的 transition 时长保持一致 */
export const WHEEL_SPIN_MS = 3600
/** 手动点选扇区时的旋转时长（ms） */
export const WHEEL_TURN_MS = 700

export interface SectorAngles {
  /** 扇区起始角度（0° 为正上方，顺时针） */
  start: number
  /** 扇区结束角度 */
  end: number
  /** 扇区中心角度 */
  mid: number
}

/** 第 index 个扇区的角度区间（total 为扇区总数） */
export function sectorAngles(index: number, total: number): SectorAngles {
  const count = Math.max(1, total)
  const step = 360 / count
  const start = index * step
  return { start, end: start + step, mid: start + step / 2 }
}

/**
 * 让第 index 个扇区的中心正对指针（正上方）时，转盘应处的绝对角度。
 *
 * 扇区中心角 mid 会随转盘一起旋转 rot，落到 mid + rot；要求 mid + rot ≡ 0 (mod 360)，
 * 即 rot ≡ -mid。这里在 current 基础上至少再多转 turns 圈，保证每次都有旋转过程。
 */
export function rotationForIndex(index: number, total: number, current = 0, turns = 5): number {
  const target = (360 - (sectorAngles(index, total).mid % 360)) % 360
  const base = ((current % 360) + 360) % 360
  let delta = target - base
  while (delta <= 0) delta += 360
  return current + turns * 360 + delta
}

/** 扇区配色（循环取色） */
export function colorAt(index: number): string {
  return WHEEL_COLORS[((index % WHEEL_COLORS.length) + WHEEL_COLORS.length) % WHEEL_COLORS.length] as string
}

/** 转盘旋转状态：角度 + 本次旋转时长 */
export function useWheelPicker(spinMs: number = WHEEL_SPIN_MS) {
  const rotation = ref(0)
  const duration = ref(spinMs)
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingResolve: (() => void) | null = null

  /** 清理定时器并立即结束未完成的旋转（组件卸载时不会留下悬挂的 Promise） */
  function stop() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (pendingResolve) {
      const resolve = pendingResolve
      pendingResolve = null
      resolve()
    }
  }

  /** 随机抽取：转到第 index 个扇区，动画结束后 resolve */
  function spinTo(index: number, total: number, ms: number = spinMs): Promise<void> {
    stop()
    duration.value = ms
    rotation.value = rotationForIndex(index, total, rotation.value)
    return new Promise<void>((resolve) => {
      pendingResolve = resolve
      timer = setTimeout(() => {
        timer = null
        pendingResolve = null
        resolve()
      }, ms)
    })
  }

  /** 手动点选：短动画转向第 index 个扇区 */
  function rotateTo(index: number, total: number, ms: number = WHEEL_TURN_MS) {
    stop()
    duration.value = ms
    rotation.value = rotationForIndex(index, total, rotation.value, 1)
  }

  onBeforeUnmount(stop)

  return { rotation, duration, spinTo, rotateTo, stop }
}

/** 中奖音效：上行大三和弦琶音（C5-E5-G5-C6） */
export function playWinSound() {
  try {
    const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtor) return
    const ctx = new AudioCtor()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq: number, i: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      const at = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
      osc.start(at)
      osc.stop(at + 0.4)
    })
    // 播放结束后释放音频通道
    setTimeout(() => { ctx.close?.() }, 1200)
  } catch {
    // 忽略音频错误（浏览器自动播放策略 / 无音频设备）
  }
}
