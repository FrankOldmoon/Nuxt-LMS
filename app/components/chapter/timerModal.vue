<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div class="p-6 space-y-8">
        <h3 class="text-lg font-semibold text-center">{{ $t('chapter.timer') }}</h3>

        <!-- 时间调节与显示区 -->
        <div class="flex items-center justify-center gap-4">
          <!-- 分钟调节列 -->
          <div class="flex flex-col items-center gap-2">
            <UButton
              icon="i-lucide-chevron-up"
              size="sm"
              variant="ghost"
              :disabled="timerState !== 'idle'"
              @click="adjustMinutes(1)"
            />
            <div
              class="text-6xl font-mono font-bold tabular-nums w-20 text-center transition-colors"
              :class="timerTextClass"
            >
              {{ displayMinutes }}
            </div>
            <UButton
              icon="i-lucide-chevron-down"
              size="sm"
              variant="ghost"
              :disabled="timerState !== 'idle'"
              @click="adjustMinutes(-1)"
            />
            <span class="text-sm text-muted">{{ $t('chapter.minutes') }}</span>
          </div>

          <!-- 分隔冒号 -->
          <div class="text-6xl font-bold text-muted pb-10">:</div>

          <!-- 秒调节列 -->
          <div class="flex flex-col items-center gap-2">
            <UButton
              icon="i-lucide-chevron-up"
              size="sm"
              variant="ghost"
              :disabled="timerState !== 'idle'"
              @click="adjustSeconds(1)"
            />
            <div
              class="text-6xl font-mono font-bold tabular-nums w-20 text-center transition-colors"
              :class="timerTextClass"
            >
              {{ displaySeconds }}
            </div>
            <UButton
              icon="i-lucide-chevron-down"
              size="sm"
              variant="ghost"
              :disabled="timerState !== 'idle'"
              @click="adjustSeconds(-1)"
            />
            <span class="text-sm text-muted">{{ $t('chapter.seconds') }}</span>
          </div>
        </div>

        <!-- 控制按钮区 -->
        <div class="flex items-center justify-center gap-3">
          <UButton
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="outline"
            :label="$t('chapter.reset')"
            @click="reset"
          />
          <UButton
            v-if="timerState !== 'running'"
            icon="i-lucide-play"
            color="primary"
            :label="timerState === 'paused' ? $t('chapter.resume') : $t('chapter.start')"
            :disabled="totalSeconds <= 0 && timerState === 'idle'"
            @click="timerState === 'idle' ? start() : resume()"
          />
          <UButton
            v-else
            icon="i-lucide-pause"
            color="warning"
            :label="$t('chapter.pause')"
            @click="pause"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel('open', { default: false })

// 默认 1 分钟
const setMinutes = ref(1)
const setSeconds = ref(0)
const remaining = ref(0)
const timerState = ref<'idle' | 'running' | 'paused' | 'done'>('idle')
let intervalId: ReturnType<typeof setInterval> | null = null

const totalSeconds = computed(() => setMinutes.value * 60 + setSeconds.value)

// 修复：空闲状态显示设置值，运行/暂停/结束显示剩余值
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

// 数字样式：运行中10秒内红色闪烁，结束常红
const timerTextClass = computed(() => {
  if (timerState.value === 'done') return 'text-error'
  if (timerState.value === 'running' && remaining.value <= 10) return 'text-error animate-timer-blink'
  if (timerState.value === 'running') return 'text-primary'
  return 'text-highlighted'
})

// 分钟调节（范围 0~180）
function adjustMinutes(delta: number) {
  const newVal = setMinutes.value + delta
  if (newVal >= 0 && newVal <= 180) {
    setMinutes.value = newVal
  }
}

// 秒调节（自动进位/借位，范围 0~59）
function adjustSeconds(delta: number) {
  let newVal = setSeconds.value + delta
  if (newVal < 0) {
    if (setMinutes.value > 0) {
      setMinutes.value--
      newVal = 59
    } else {
      newVal = 0
    }
  } else if (newVal > 59) {
    if (setMinutes.value < 180) {
      setMinutes.value++
      newVal = 0
    } else {
      newVal = 59
    }
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
</script>

<style scoped>
@keyframes timerBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

.animate-timer-blink {
  animation: timerBlink 0.5s ease-in-out infinite;
}
</style>