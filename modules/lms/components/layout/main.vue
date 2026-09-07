<template>
  <!-- import base 的 main，通过 #default 插槽注入 doc 的侧边栏/目录/全屏播放 -->
  <BaseMain>
    <template #default>
      <!-- 移动端工具栏：menu + toc 按钮同一行 -->
      <div v-if="showSidebar" class="lg:hidden flex items-center justify-between gap-2 mb-4">
        <UButton icon="i-lucide-panel-left" color="neutral" variant="outline"
          :label="$t('layout.menu')" @click="asideOpen = true" />
        <UButton icon="i-lucide-panel-right" color="neutral" variant="outline"
          :label="$t('layout.toc')" @click="mobileTocOpen = true" />
      </div>

      <!-- 页面内容 -->
      <div :class="{ 'chapter-play-mode': playFullscreen }">
        <slot />
      </div>

      <!-- 移动端左侧导航弹窗 -->
      <USlideover v-if="showSidebar" v-model:open="asideOpen" :title="$t('layout.navigation')" side="left">
        <template #body>
          <LayoutAside />
        </template>
      </USlideover>

      <!-- 移动端右侧目录弹窗 -->
      <USlideover v-if="showSidebar" v-model:open="mobileTocOpen" :title="$t('layout.pageToc')" side="right">
        <template #body>
          <LayoutToc />
        </template>
      </USlideover>
    </template>
  </BaseMain>

  <!--
    班级弹幕覆盖层（仅客户端，仅教师/管理员接收）：
    - 监听 WebSocket { type: 'danmaku' } 消息，渲染漂浮弹幕
    - 由 question/homework/quiz/comment 等提交后服务端广播触发
    - position: fixed 覆盖全屏，不影响布局流
    - 学生端不再渲染本覆盖层，仅教师/管理员可见；课程配置 showDanmaku=false 时全局关闭
  -->
  <ClientOnly>
    <ChapterDanmaku v-if="canReceiveDanmaku && showDanmaku" />
  </ClientOnly>
</template>

<script setup lang="ts">
import BaseMain from '../../../base/components/layout/main.vue'

const { showSidebar, mobileTocOpen, showDanmaku } = useLayoutState()
const { hasRole } = useAuth()
// 仅教师/管理员接收弹幕（学生端不渲染覆盖层、不订阅弹幕广播）
const canReceiveDanmaku = computed(() => hasRole('teacher') || hasRole('admin'))
const { playFullscreen } = useChapterBtns()
const asideOpen = ref(false)

const route = useRoute()
watch(() => route.fullPath, () => {
  asideOpen.value = false
  mobileTocOpen.value = false
})
</script>

<style>
/* 全屏播放模式：字体放大 + 标题间距增大（h1 章节标题不参与间距推移） */
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
