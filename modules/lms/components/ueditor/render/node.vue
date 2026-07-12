<template>
  <!-- 文本节点：保留原有 marks 渲染逻辑 -->
  <TextRenderer v-if="node.type === 'text'" :text="node.text" :marks="node.marks" />

  <!-- Doc 根节点：无包裹直接渲染子节点 -->
  <template v-else-if="node.type === 'doc'">
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" :course-id="courseId" />
  </template>

  <!-- 匹配到注册类型的节点：动态组件渲染 -->
  <component v-else-if="currentComponent" :is="currentComponent" :node="node" :course-id="courseId" />

  <!-- 未知节点类型：div 包裹降级渲染 -->
  <div v-else>
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" :course-id="courseId" />
  </div>
</template>

<script setup>
import { useNodeDispatcher, TextRenderer } from './useNodeDispatcher'

defineOptions({ name: 'RenderNode' })

const props = defineProps({
  node: { type: Object, required: true },
  courseId: { type: [Number, String], default: undefined },
})

const { currentComponent } = useNodeDispatcher(props)
</script>
