<template>
  <div
    ref="contentBox"
    class="relative border border-gray-200 rounded-md bg-white overflow-hidden"
  >
    <!-- 右上角全屏按钮 -->
    <button
      @click="toggleFullscreen"
      class="absolute top-2 right-2 text-xs px-2.5 py-1 bg-gray-100 text-green-600 rounded hover:bg-green-200 transition-colors cursor-pointer z-10"
    >
      {{ $t('common.fullscreen') }}
    </button>

    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400 text-sm">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
      {{ $t('pintora.loading') }}
    </div>
    <!-- 渲染失败 -->
    <div v-else-if="error" class="p-4 text-sm text-red-500 whitespace-pre-wrap">{{ error }}</div>
    <!-- 空内容：提示进入设置编写 DSL -->
    <div v-else-if="!code" class="flex items-center justify-center py-10 text-gray-400 text-sm">
      {{ $t('pintora.empty') }}
    </div>

    <!-- 图形容器（Pintora 将 SVG 渲染到这里） -->
    <div ref="pintoraContainer" class="pintora-container overflow-auto" :style="containerStyle" />
  </div>
</template>

<script setup>
import { usePintoraRender } from './usePintoraRender'

const props = defineProps({
  node: Object,
})

const { contentBox, pintoraContainer, loading, error, code, containerStyle, toggleFullscreen } = usePintoraRender(props)
</script>

<style scoped>
/* 全屏时容器撑满屏幕 */
div:fullscreen {
  background: #fff;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

/* 注入的 Pintora SVG：自适应容器宽度 */
.pintora-container :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
