<template>
  <TextRenderer v-if="node.type === 'text'" :text="node.text" :marks="node.marks" />
  <template v-else-if="node.type === 'doc'">
    <template v-for="(child, index) in node.content" :key="index">
      <!-- codeBlock / blockquote 参与阅读追踪（hover 3s 已读） -->
      <ReadingBlock v-if="trackReading && (child.type === 'codeBlock' || child.type === 'blockquote')"
        :node="child" :block-key="String(index)">
        <RenderNode :node="child" :course-id="courseId" />
      </ReadingBlock>
      <!-- 无可监控块标题：hover 一瞬间即完成 -->
      <ReadingBlock v-else-if="trackReading && isAutoCompleteHeading(child, index)" :node="child"
        :block-key="String(index)" instant>
        <RenderNode :node="child" :course-id="courseId" />
      </ReadingBlock>
      <!-- 其余块级节点直接渲染不监控 -->
      <RenderNode v-else :node="child" :course-id="courseId" />
    </template>
  </template>

  <!-- 匹配到注册类型的节点：动态组件渲染（按需透传 blockKeyPrefix / blockKey） -->
  <component v-else-if="currentComponent" :is="currentComponent" v-bind="componentProps" />

  <!-- 未知节点类型：div 包裹降级渲染 -->
  <div v-else>
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" :course-id="courseId" />
  </div>
</template>

<script setup>
import { useNodeDispatcher, TextRenderer } from './useNodeDispatcher'
import ReadingBlock from './readingBlock.vue'

defineOptions({ name: 'RenderNode' })

const props = defineProps({
  node: { type: Object, required: true },
  courseId: { type: [Number, String], default: undefined },
  // 是否追踪 hover 阅读进度（仅章节主内容区开启，嵌套 ueditorRender 不开启）
  trackReading: { type: Boolean, default: false },
  // 列表节点专用：顶层块 index（字符串），列表组件据此为每个 <li> 生成 blockKey
  blockKeyPrefix: { type: String, default: undefined },
  // 列表项专用：由列表组件传入，list-item/task-item 据此在 <li> 上做 hover 追踪
  blockKey: { type: String, default: undefined },
})

const { currentComponent } = useNodeDispatcher(props)

// 带 id 的标题都作为可阅读块（instant：hover 标题即标记已读）。
// 无论其下是否有代码块/引用/互动任务，标题 hover 都会变绿并计入完成；
// 与 useChapterTask.blockLayout 一致（标题始终登记为 byHeading 可读块）。
function isAutoCompleteHeading(child, index) {
  if (child.type !== 'heading') return false
  if (!child.attrs?.id && !child.attrs?.['data-toc-id']) return false
  return true
}

// 仅在显式传入时透传 blockKeyPrefix / blockKey，避免非列表组件的属性穿透
const componentProps = computed(() => {
  const p = { node: props.node, courseId: props.courseId }
  if (props.blockKeyPrefix) p.blockKeyPrefix = props.blockKeyPrefix
  if (props.blockKey) p.blockKey = props.blockKey
  return p
})
</script>
