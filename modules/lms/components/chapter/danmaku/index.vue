<template>
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
    <div
      v-for="item in danmakuList"
      :key="item.id"
      class="absolute whitespace-nowrap font-bold text-lg drop-shadow-md danmaku-float"
      :style="{ top: item.top + '%', color: '#22c55e' }"
    >
      {{ item.from }}：{{ item.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface DanmakuItem {
  id: number
  text: string
  from: string
  top: number
}

const danmakuList = ref<DanmakuItem[]>([])
let idCounter = 0

const { onDanmaku } = useWebSocket()

// 去重窗口：同一 (text|from) 在窗口内只渲染一次，防止
// 组件多次挂载/重复订阅导致同一条记录重复 push
const seenCache = new Map<string, number>()
const DEDUP_WINDOW_MS = 10000

const unregisterDanmaku = onDanmaku((data) => {
  const key = `${data.from}|${data.text}`
  const now = Date.now()
  const lastSeen = seenCache.get(key)
  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return
  seenCache.set(key, now)
  // 定期清理过期的去重记录，避免无限增长
  if (seenCache.size > 200) {
    for (const [k, t] of seenCache) {
      if (now - t >= DEDUP_WINDOW_MS) seenCache.delete(k)
    }
  }

  const item: DanmakuItem = {
    id: idCounter++,
    text: data.text,
    from: data.from,
    top: 5 + Math.random() * 75,
  }
  danmakuList.value.push(item)
  setTimeout(() => {
    danmakuList.value = danmakuList.value.filter(d => d.id !== item.id)
  }, 8000)
})

// 卸载时注销回调，避免回调在全局 handler 表中累积导致同一条广播被多次渲染
onUnmounted(() => {
  unregisterDanmaku()
})
</script>

<style scoped>
.danmaku-float {
  animation: danmaku-slide 8s linear forwards;
}

@keyframes danmaku-slide {
  from {
    left: 100%;
    transform: translateX(0);
  }
  to {
    left: 0;
    transform: translateX(-100%);
  }
}
</style>
