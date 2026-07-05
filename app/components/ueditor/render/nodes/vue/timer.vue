<template>
    <div class="flex items-center justify-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 select-none">
        <!-- 分钟列 -->
        <div class="flex flex-col items-center gap-1">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustMinutes(1)" />
            <div class="text-4xl font-mono font-bold tabular-nums w-14 text-center transition-colors"
                :class="timerTextClass">
                {{ displayMinutes }}
            </div>
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustMinutes(-1)" />
            <span class="text-xs text-muted">{{ $t('chapter.minutes') }}</span>
        </div>

        <div class="text-4xl font-bold text-muted pb-6">:</div>

        <!-- 秒列 -->
        <div class="flex flex-col items-center gap-1">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustSeconds(1)" />
            <div class="text-4xl font-mono font-bold tabular-nums w-14 text-center transition-colors"
                :class="timerTextClass">
                {{ displaySeconds }}
            </div>
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" :disabled="timerState !== 'idle'"
                @click="adjustSeconds(-1)" />
            <span class="text-xs text-muted">{{ $t('chapter.seconds') }}</span>
        </div>

        <!-- 控制按钮 -->
        <div class="flex flex-col gap-1 ml-2">
            <UButton v-if="timerState !== 'running'" icon="i-lucide-play" color="primary" variant="soft" size="xs"
                :disabled="totalSeconds <= 0 && timerState === 'idle'"
                @click="timerState === 'idle' ? start() : resume()" />
            <UButton v-else icon="i-lucide-pause" color="warning" variant="soft" size="xs" @click="pause" />
            <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" size="xs" @click="reset" />
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const { t } = useI18n()

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
let intervalId = null

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

function adjustMinutes(delta) {
    const newVal = setMinutes.value + delta
    if (newVal >= 0 && newVal <= 180) setMinutes.value = newVal
}

function adjustSeconds(delta) {
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
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
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
</script>
