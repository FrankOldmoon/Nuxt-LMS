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

onDanmaku((data) => {
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
