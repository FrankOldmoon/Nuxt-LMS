/**
 * 章节倒计时弹窗逻辑
 *
 * - setMinutes / setSeconds：用户设置的时间（仅 idle 可调）
 * - remaining：剩余秒数（运行 / 暂停 / 结束时显示）
 * - timerState：idle → running → paused / done
 * - 计时归零时播放提示音（Web Audio API 880Hz 正弦波）
 *
 * 由 timerModal.vue 通过 v-model:open 传入 isOpen，
 * 关闭弹窗时自动 reset，组件卸载时清理定时器。
 */
export function useChapterTimer(isOpen: Ref<boolean>) {
  const setMinutes = ref(1)
  const setSeconds = ref(0)
  const remaining = ref(0)
  const timerState = ref<'idle' | 'running' | 'paused' | 'done'>('idle')
  let intervalId: ReturnType<typeof setInterval> | null = null

  const totalSeconds = computed(() => setMinutes.value * 60 + setSeconds.value)

  // 空闲显示设置值，运行 / 暂停 / 结束显示剩余值
  const displayMinutes = computed(() => {
    const total = timerState.value === 'idle'
      ? setMinutes.value
      : Math.max(0, Math.floor(remaining.value / 60))
    return String(total).padStart(2, '0')
  })

  const displaySeconds = computed(() => {
    const total = timerState.value === 'idle'
      ? setSeconds.value
      : Math.max(0, remaining.value % 60)
    return String(total).padStart(2, '0')
  })

  // 运行中 10 秒内红色闪烁（Tailwind animate-pulse），结束常红
  const timerTextClass = computed(() => {
    if (timerState.value === 'done') return 'text-error'
    if (timerState.value === 'running' && remaining.value <= 10) return 'text-error animate-pulse'
    if (timerState.value === 'running') return 'text-primary'
    return 'text-highlighted'
  })

  // 分钟调节（范围 0~180）
  function adjustMinutes(delta: number) {
    const newVal = setMinutes.value + delta
    if (newVal >= 0 && newVal <= 180) setMinutes.value = newVal
  }

  // 秒调节（自动进位 / 借位，范围 0~59）
  function adjustSeconds(delta: number) {
    let newVal = setSeconds.value + delta
    if (newVal < 0) {
      if (setMinutes.value > 0) { setMinutes.value--; newVal = 59 }
      else newVal = 0
    } else if (newVal > 59) {
      if (setMinutes.value < 180) { setMinutes.value++; newVal = 0 }
      else newVal = 59
    }
    setSeconds.value = newVal
  }

  function start() {
    remaining.value = totalSeconds.value
    if (remaining.value <= 0) return
    timerState.value = 'running'
    tick()
  }

  function pause() {
    timerState.value = 'paused'
    clearTimer()
  }

  function resume() {
    timerState.value = 'running'
    tick()
  }

  function reset() {
    clearTimer()
    timerState.value = 'idle'
    remaining.value = 0
  }

  function tick() {
    clearTimer()
    intervalId = setInterval(() => {
      if (remaining.value <= 0) {
        clearTimer()
        timerState.value = 'done'
        playBeep()
        return
      }
      remaining.value--
    }, 1000)
  }

  function clearTimer() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 880
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 1)
    } catch {
      // 忽略音频错误
    }
  }

  // 关闭弹窗时重置
  watch(isOpen, (val) => {
    if (!val) reset()
  })

  onBeforeUnmount(() => {
    clearTimer()
  })

  return {
    timerState, totalSeconds, displayMinutes, displaySeconds, timerTextClass,
    adjustMinutes, adjustSeconds, start, pause, resume, reset,
  }
}
