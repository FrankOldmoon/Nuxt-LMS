<template>
  <component
    :is="tag"
    :id="anchorId || undefined"
    :style="styleStr"
    :data-word-wrap="dataWordWrap"
    ref="elRef"
    class="scroll-mt-20 umo-heading-anchor"
    @click="onHeadingClick"
  >
    <RenderNode v-for="(child, i) in content" :key="i" :node="child" />
  </component>
</template>

<script setup>
import RenderNode from '../node.vue'
import { computeNodeStyle } from '../helpers.js'
import { extractText } from '../../../../utils/tiptapText'

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
const content = computed(() => props.node.content || [])
const tag = computed(() => `h${attrs.value.level || 1}`)

const elRef = ref(null)

// 锚点 id：优先使用编辑器设置的 attrs.id，否则用标题文本作为 #title
const anchorId = computed(() => {
  if (attrs.value.id) return attrs.value.id
  const text = extractText(content.value).trim()
  return text || undefined
})

const styleObj = computed(() => computeNodeStyle(props.node))
const styleStr = computed(() => styleObj.value.style || undefined)
const dataWordWrap = computed(() => styleObj.value['data-word-wrap'])

function scrollToSelf(behavior = 'smooth') {
  elRef.value?.scrollIntoView({ behavior, block: 'start' })
}

function onHeadingClick() {
  if (!anchorId.value) return
  // 更新 URL hash（replaceState 不产生历史记录，便于连点多个标题）
  const hash = `#${encodeURIComponent(anchorId.value)}`
  if (window.location.hash !== hash) {
    try {
      history.replaceState(null, '', hash)
    } catch {
      window.location.hash = anchorId.value
    }
  }
  scrollToSelf('smooth')
}

// 直接访问带 #title 的 URL 时滚动到对应标题
onMounted(() => {
  if (!anchorId.value) return
  const hash = window.location.hash.slice(1)
  if (hash && decodeURIComponent(hash) === anchorId.value) {
    requestAnimationFrame(() => scrollToSelf('auto'))
  }
})
</script>

<style scoped>
.umo-heading-anchor {
  cursor: pointer;
  position: relative;
}

.umo-heading-anchor:hover::before {
  content: '#';
  position: absolute;
  left: -1.1em;
  color: var(--ui-text-dimmed);
  opacity: 0.7;
}
</style>
