/**
 * Chapter countdown timer modal logic
 *
 * - setMinutes / setSeconds: user-set time (only adjustable in idle state)
 * - remaining: remaining seconds (displayed during running / paused / done)
 * - timerState: idle → running → paused / done
 * - Plays a beep when timer reaches zero (Web Audio API 880Hz sine wave)
 *
 * isOpen is passed in from timerModal.vue via v-model:open,
 * auto reset on modal close, clear timer on component unmount.
 */
export function useChapterTimer(isOpen: Ref<boolean>) {
  const setMinutes = ref(1)
  const setSeconds = ref(0)
  const remaining = ref(0)
  const timerState = ref<'idle' | 'running' | 'paused' | 'done'>('idle')
  let intervalId: ReturnType<typeof setInterval> | null = null

  const totalSeconds = computed(() => setMinutes.value * 60 + setSeconds.value)

  // Idle shows set value, running / paused / done shows remaining value
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

  // Red blinking within 10 seconds while running (Tailwind animate-pulse), constant red when done
  const timerTextClass = computed(() => {
    if (timerState.value === 'done') return 'text-error'
    if (timerState.value === 'running' && remaining.value <= 10) return 'text-error animate-pulse'
    if (timerState.value === 'running') return 'text-primary'
    return 'text-highlighted'
  })

  // Minute adjustment (range 0~180)
  function adjustMinutes(delta: number) {
    const newVal = setMinutes.value + delta
    if (newVal >= 0 && newVal <= 180) setMinutes.value = newVal
  }

  // Second adjustment (auto carry/borrow, range 0~59)
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
      // Ignore audio errors
    }
  }

  // Reset on modal close
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
