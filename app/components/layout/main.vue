<template>
  <UPageBody>
    <!-- 移动端工具栏：按钮弹开 aside -->
    <div v-if="showSidebar" class="lg:hidden flex items-center gap-2 mb-4">
      <UButton icon="i-lucide-panel-left" color="neutral" variant="outline"
        :label="$t('layout.menu')" @click="asideOpen = true" />
    </div>

    <!-- 页面内容 -->
    <div :class="{ 'chapter-play-mode': playFullscreen }">
      <slot />
    </div>

    <!-- WebSocket 连接 + 弹幕飘动层 -->
    <LayoutWs />

    <!-- 移动端左侧导航弹窗 -->
    <USlideover v-if="showSidebar" v-model:open="asideOpen" :title="$t('layout.navigation')" side="left">
      <template #body>
        <LayoutAside />
      </template>
    </USlideover>
  </UPageBody>
</template>

<script setup lang="ts">
const { showSidebar } = useLayoutState()
const { playFullscreen } = useChapterBtns()
const asideOpen = ref(false)

// 路由变化时自动关闭弹窗
const route = useRoute()
watch(() => route.fullPath, () => {
  asideOpen.value = false
})
</script>

<style>

  /* 全屏播放模式：字体放大 + 标题间距增大 */
  .chapter-play-mode h1,
  .chapter-play-mode h2,
  .chapter-play-mode h3 {
    margin-top: 1000px !important;
  }

  .chapter-play-mode {
    font-size: 1.3rem;
    line-height: 1.9;
  }

  .chapter-play-mode p,
  .chapter-play-mode li {
    font-size: 1.3rem;
    line-height: 1.9;
  }

  .chapter-play-mode h1 {
    font-size: 2.5rem;
  }

  .chapter-play-mode h2 {
    font-size: 2rem;
  }

  .chapter-play-mode h3 {
    font-size: 1.7rem;
  }
</style>
