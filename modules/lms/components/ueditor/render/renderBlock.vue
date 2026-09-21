<template>
  <!-- codeBlock / blockquote 参与阅读追踪（hover 3s 已读） -->
  <ReadingBlock v-if="trackReading && (node.type === 'codeBlock' || node.type === 'blockquote')"
    :node="node" :block-key="blockKey">
    <RenderNode :node="node" :course-id="courseId" />
  </ReadingBlock>
  <!-- 带 id 的标题：hover 一瞬间即完成 -->
  <ReadingBlock v-else-if="trackReading && isAutoCompleteHeading" :node="node" :block-key="blockKey" instant>
    <RenderNode :node="node" :course-id="courseId" />
  </ReadingBlock>
  <!-- 其余块级节点直接渲染不监控 -->
  <RenderNode v-else :node="node" :course-id="courseId" />
</template>

<script setup>
import RenderNode from './node.vue'
import ReadingBlock from './readingBlock.vue'
import { progressHeadingId } from '../../../utils/progressHeading'

defineOptions({ name: 'RenderBlock' })

const props = defineProps({
  node: { type: Object, required: true },
  // 顶层块在 doc.content 中的原始 index：blockKey 必须保持原始索引，
  // 与 useChapterTask.blockLayout 的映射一致（分组渲染后 index 不能重排）
  index: { type: Number, required: true },
  courseId: { type: [Number, String], default: undefined },
  // 是否追踪 hover 阅读进度（仅章节主内容区开启，嵌套 ueditorRender 不开启）
  trackReading: { type: Boolean, default: false },
})

const blockKey = computed(() => String(props.index))

// 「计入进度的标题」作为可阅读块（instant：hover 标题即标记已读）。
// 用 progressHeadingId 与 blockLayout / 服务端 is_pass 同口径：
// 空文本标题不计入，也就不该出现 hover 高亮。
const isAutoCompleteHeading = computed(() => !!progressHeadingId(props.node))
</script>
