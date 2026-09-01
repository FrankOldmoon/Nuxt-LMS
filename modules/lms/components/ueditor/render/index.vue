<template>
  <div class="umo-editor-render umo-page-content render" style="width:100%; min-height:30px">
    <div v-if="renderContent" class="umo-editor-content is-readonly" :style="{ lineHeight: defaultLineHeight }"
      :spellcheck="false">
      <div class="umo-editor" contenteditable="false" style="padding: 0px; min-height: 100%;" ref="renderNodeRef">
        <RenderNode :node="renderContent" :course-id="effectiveCourseId" :track-reading="trackReading" />
      </div>
    </div>

    <!-- 图片全屏预览 -->
    <UeditorRenderImageModal v-model:open="imageModalOpen" :images="imageList" :initial-index="imageModalIndex" />
  </div>
</template>

<script setup>
import RenderNode from './node.vue'
import { useRenderIndex } from './useRenderIndex'

const props = defineProps({
  json: {
    type: [Object, String, Number, Boolean],
    default: () => ({}),
  },
  // CDN 地址（用于文件图标、echarts、KaTeX 等资源加载）
  cdnUrl: {
    type: String,
    default: 'https://cdn.jsdelivr.net/npm/@umoteam/editor-external@latest',
  },
  // 默认行高
  lineHeight: {
    type: [Number, String],
    default: 1.75,
  },
  // 页面背景色
  background: {
    type: String,
    default: '#fff',
  },
  // 课程 ID：admin 后台复用本组件时传入，覆盖全局 editableCourseId
  // 使内部 vue 节点（如 question/homework 等）能获取正确的 course 上下文
  courseId: {
    type: [Number, String],
    default: undefined,
  },
  // 是否追踪 hover 阅读进度：仅章节主内容区（已登录）开启
  // 嵌套 ueditorRender（题目内容/作业说明等）不开启，避免误计入阅读进度
  trackReading: {
    type: Boolean,
    default: false,
  },
})

const {
  effectiveCourseId,
  renderNodeRef,
  defaultLineHeight,
  renderContent,
  imageModalOpen,
  imageModalIndex,
  imageList,
} = useRenderIndex(props, null)
</script>

<style lang="less">
@import './index.less';
</style>
