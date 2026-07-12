import { ref, computed, onBeforeUnmount } from 'vue'

export interface TimerRenderProps {
    node?: any
}

export type TimerRenderEmit = (event: 'update', payload: { minutes: number, seconds: number }) => void

export function useTimerRender(props: TimerRenderProps, emit: TimerRenderEmit) {
    const config = computed(() => {
        try {
            const raw = props.node?.attrs?.content
            if (raw) return JSON.parse(raw)
        } catch (_) { /* noop */ }
        return { minutes: 1, seconds: 0 }
    })

    const setMinutes = ref(config.value.minutes ?? 1)
    const setSeconds = ref(config.value.seconds ?? 0)
    const remaining = ref(0)
    const timerState = ref('idle')
    let intervalId: any = null

    const totalSeconds = computed(() => setMinutes.value * 60 + setSeconds.value)

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

    const timerTextClass = computed(() => {
        if (timerState.value === 'done') return 'text-error'
        if (timerState.value === 'running' && remaining.value <= 10) return 'text-error animate-pulse'
        if (timerState.value === 'running') return 'text-primary'
        return 'text-highlighted'
    })

    function adjustMinutes(delta: number) {
        const newVal = setMinutes.value + delta
        if (newVal >= 0 && newVal <= 180) setMinutes.value = newVal
        emit('update', { minutes: newVal, seconds: setSeconds.value })
    }

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
        emit('update', { minutes: setMinutes.value, seconds: newVal })
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
        } catch { /* noop */ }
    }

    onBeforeUnmount(() => clearTimer())

    return {
        timerState, displayMinutes, displaySeconds, timerTextClass,
        totalSeconds, adjustMinutes, adjustSeconds, start, pause, resume, reset,
    }
}
