<template>
  <div class="umo-editor-render umo-page-content render" style="width:100%; min-height:30px">
    <div v-if="renderContent" class="umo-editor-content is-readonly" :style="{ lineHeight: defaultLineHeight }"
      :spellcheck="false">
      <div class="umo-editor" contenteditable="false" style="padding: 0px; min-height: 100%;" ref="renderNodeRef">
        <RenderNode :node="renderContent" :course-id="effectiveCourseId" :track-reading="trackReading" />
      </div>
    </div>

    <!-- Image fullscreen preview -->
    <UeditorRenderImageModal v-model:open="imageModalOpen" :images="image list" :initial-index="imageModalIndex" />
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
  // CDN URL (for loading resources like file icons, echarts, KaTeX, etc.)
  cdnUrl: {
    type: String,
    default: 'https://unpkg.com/@umoteam/editor-external@latest',
  },
  // Default line height
  lineHeight: {
    type: [Number, String],
    default: 1.75,
  },
  // Page background color
  background: {
    type: String,
    default: '#fff',
  },
  // Course ID: passed in when admin backend reuses this component, overrides global editableCourseId
  // So that internal vue nodes (like question/homework, etc.) can get the correct course context
  courseId: {
    type: [Number, String],
    default: undefined,
  },
  // Whether to track hover reading progress: only enabled in chapter main content area (logged in)
  // Nested ueditorRender (question content/homework instructions, etc.) is not enabled, to avoid miscounting reading progress
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
  image list,
} = useRenderIndex(props, null)
</script>

<style lang="less">
@import './index.less';
</style>
