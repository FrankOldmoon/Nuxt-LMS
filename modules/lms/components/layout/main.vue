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
/* 全屏播放模式：字体整体再放大一号 + 标题间距增大（h1 章节标题不参与间距推移） */
.chapter-play-mode h2,
.chapter-play-mode h3 {
  margin-top: 1000px !important;
}

.chapter-play-mode {
  font-size: 1.5rem;
  line-height: 1.9;
}

/* 覆盖 UMO 自带的 14px 基准字号（.umo-editor{font-size:var(--umo-font-size)}）：
   否则只有 p/li/标题被放大，表格、引用、题目等继承基准字号的节点不会跟着变大 */
.chapter-play-mode .umo-editor {
  font-size: 1rem;
}

.chapter-play-mode p,
.chapter-play-mode li {
  font-size: 1.5rem;
  line-height: 1.9;
}

.chapter-play-mode h1 {
  font-size: 3rem;
}

.chapter-play-mode h2 {
  font-size: 2.4rem;
}

.chapter-play-mode h3 {
  font-size: 2rem;
}

/* ─────────────────────────────────────────────────────────
   全屏播放：每个 heading 及其下方内容聚合为一张「知识卡片」
   —— 边框 + 背景色 + 阴影，形成明确的层次感
   —— 卡片之间沿用超大间距，保证放映时「一屏一卡片」
   ───────────────────────────────────────────────────────── */
.chapter-play-mode .chapter-play-card {
  position: relative;
  /* 必须 !important：UMO 自带 `.umo-editor>*+*{margin-top:var(--umo-content-node-bottom)}`
     优先级为 (0,3,0)，高于本选择器 (0,2,0)，否则卡片间距会被压成 ~0.75em，
     导致一屏出现多张卡片（放映时标题之间需要保留原有 1000px 大间距） */
  margin-top: 1000px !important;
  padding: 1.75rem 2.25rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) * 2);
  background-color: var(--ui-bg-elevated);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 16px 40px -16px rgba(0, 0, 0, 0.22);
}

/* 卡片正文：复刻 UMO 对 .umo-editor 直接子元素的块间距
   （原标题/段落/题目之间的间距来自 `.umo-editor>*+*{margin-top:var(--umo-content-node-bottom)}`，
   分组进卡片后正文块不再是 .umo-editor 的直接子元素，必须在此补回，否则题目等会挤在一起） */
.chapter-play-mode .chapter-play-card__body>*+*:not(.umo-floating-node) {
  margin-top: var(--umo-content-node-bottom);
}

/* 顶部主色渐变高光条：强化卡片层次与品牌感 */
.chapter-play-mode .chapter-play-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-top-left-radius: calc(var(--ui-radius) * 2);
  border-top-right-radius: calc(var(--ui-radius) * 2);
  background: linear-gradient(90deg, var(--ui-primary, #4f8cff), transparent 70%);
}

/* 卡片内标题不再用 1000px 间距（间距改由卡片容器承担，否则标题会被推到卡片中部） */
.chapter-play-mode .chapter-play-card h1,
.chapter-play-mode .chapter-play-card h2,
.chapter-play-mode .chapter-play-card h3,
.chapter-play-mode .chapter-play-card h4,
.chapter-play-mode .chapter-play-card h5,
.chapter-play-mode .chapter-play-card h6 {
  margin-top: 0 !important;
}

/* 卡片标题区与正文区用虚线分隔，形成"卡头 + 卡身"结构 */
.chapter-play-mode .chapter-play-card__head {
  margin-bottom: 1.25rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px dashed var(--ui-border-accented);
}

/* 章节标题封面卡片：与内容卡片统一视觉语言 */
.chapter-play-mode .chapter-play-cover {
  margin-bottom: 0;
  padding: 2rem 2.25rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) * 2);
  background-color: var(--ui-bg-elevated);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 16px 40px -16px rgba(0, 0, 0, 0.22);
}
</style>
