<template>
    <component v-if="comp" :is="comp" :node="node" :course-id="effectiveCourseId" />
</template>

<script setup>
// 统一加载 ../../vue/*/render.vue（所有渲染组件）
// 如：../../vue/question/render.vue, ../../vue/aichat/render.vue
const compModules = import.meta.glob('../../extensions/nodes/vue/*/render.vue', { eager: true })

// 自动生成「组件名 → 组件实例」的映射
const compMap = Object.fromEntries(
  Object.entries(compModules).map(([filePath, module]) => {
    // 提取目录名：../../extensions/nodes/vue/question/render.vue → question
    const match = filePath.match(/\/extensions\/nodes\/vue\/([^/]+)\/render\.vue$/)
    return match ? [match[1], module.default] : []
  }).filter(([key]) => key)
)

const props = defineProps({
  node: Object,
  courseId: { type: [Number, String], default: undefined },
})

// 优先使用 props.courseId，再 fallback 到 RenderNode 注入的 renderCourseId，最后到全局 editableCourseId
import { inject } from 'vue'
const { editableCourseId } = useLayoutState()
const injectedCourseId = inject('renderCourseId', undefined)
const effectiveCourseId = computed(() => {
  if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
    return Number(props.courseId) || 0
  }
  if (injectedCourseId !== undefined && injectedCourseId !== null && injectedCourseId !== '') {
    return Number(injectedCourseId) || 0
  }
  return editableCourseId.value
})

const comp = computed(() => {
  const type = props.node?.attrs?.type
  // 使用统一映射（所有组件走 vue/*/render.vue）
  if (type && compMap[type]) return compMap[type]
  return null
})
</script>