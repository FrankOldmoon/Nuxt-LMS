<template>
  <TextRenderer v-if="node.type === 'text'" :text="node.text" :marks="node.marks" />
  <template v-else-if="node.type === 'doc'">
    <template v-for="(child, index) in node.content" :key="index">
      <RenderNode
        v-if="!trackReading || child.type === 'heading' || child.type === 'vue'"
        :node="child"
        :course-id="courseId"
      />
      <RenderNode
        v-else-if="isListType(child.type)"
        :node="child"
        :course-id="courseId"
        :block-key-prefix="String(index)"
      />
      <ReadingBlock v-else :node="child" :block-key="String(index)">
        <RenderNode :node="child" :course-id="courseId" />
      </ReadingBlock>
    </template>
  </template>

  <!-- Matched registered node type: dynamic component rendering (pass-through blockKeyPrefix / blockKey as needed) -->
  <component v-else-if="currentComponent" :is="currentComponent" v-bind="componentProps" />

  <!-- Unknown node type: div-wrapped fallback rendering -->
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
  // Whether to track hover reading progress (only enabled in chapter main content area, not in nested ueditorRender)
  trackReading: { type: Boolean, default: false },
  // List node only: top-level block index (string), list component generates blockKey for each <li> based on this
  blockKeyPrefix: { type: String, default: undefined },
  // List item only: passed in by list component, list-item/task-item use this for hover tracking on <li>
  blockKey: { type: String, default: undefined },
})

const { currentComponent } = useNodeDispatcher(props)

const LIST_TYPES = new Set(['bulletList', 'orderedList', 'taskList'])
function isListType(type) {
  return LIST_TYPES.has(type)
}

// Only pass through blockKeyPrefix / blockKey when explicitly provided, to avoid prop leakage to non-list components
const componentProps = computed(() => {
  const p = { node: props.node, courseId: props.courseId }
  if (props.blockKeyPrefix) p.blockKeyPrefix = props.blockKeyPrefix
  if (props.blockKey) p.blockKey = props.blockKey
  return p
})
</script>
