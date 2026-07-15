<template>
    <component v-if="comp" :is="comp" :node="node" :course-id="effectiveCourseId" />
</template>

<script setup>
// unifyLoad ../../vue/*/render.vue（AllRender Component）
// if：../../vue/question/render.vue, ../../vue/aichat/render.vue
const compModules = import.meta.glob('../../extensions/nodes/vue/*/render.vue', { eager: true })

// AutoGenerate「Componentname → Component Instance」Map
const compMap = Object.fromEntries(
  Object.entries(compModules).map(([filePath, module]) => {
    // extractTable of Contentsname：../../extensions/nodes/vue/question/render.vue → question
    const match = filePath.match(/\/extensions\/nodes\/vue\/([^/]+)\/render\.vue$/)
    return match ? [match[1], module.default] : []
  }).filter(([key]) => key)
)

const props = defineProps({
  node: Object,
  courseId: { type: [Number, String], default: undefined },
})

// prioritymakeuse props.courseId，then fallback to useLmsContext  courseId
const { courseId: ctxCourseId } = useLmsContext()
const effectiveCourseId = computed(() => {
  if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
    return Number(props.courseId) || 0
  }
  return ctxCourseId.value
})

const comp = computed(() => {
  const type = props.node?.attrs?.type
  // makeuseunifyMap（AllComponentgo vue/*/render.vue）
  if (type && compMap[type]) return compMap[type]
  return null
})
</script>