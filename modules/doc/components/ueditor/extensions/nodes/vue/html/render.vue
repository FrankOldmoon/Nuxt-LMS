<template>
  <div 
    ref="contentBox" 
    class="relative border border-gray-200 rounded-md bg-white pt-4 box-border"
  >
    <!-- 右上角全屏按钮 -->
    <button
      @click="toggleFullscreen"
      class="absolute top-2 right-2 text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors cursor-pointer"
    >
      {{ $t('fullscreen') }}
    </button>

    <!-- 富文本内容区 -->
    <div 
      class="w-full break-words [&_img]:max-w-full [&_img]:h-auto" 
      v-html="props.node.attrs.content"
    ></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  node: Object,
})

const contentBox = ref(null)

// 切换全屏
const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    // 退出全屏
    document.exitFullscreen()
  } else {
    // 当前容器进入全屏
    contentBox.value?.requestFullscreen().catch(err => {
      console.warn('全屏切换失败:', err)
    })
  }
}
</script>