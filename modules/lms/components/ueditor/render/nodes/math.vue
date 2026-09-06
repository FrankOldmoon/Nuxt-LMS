<template>
  <div v-if="isBlock" :class="containerClass" :data-type="dataType" :data-latex="latex" v-html="html"></div>
  <span v-else :class="containerClass" :data-type="dataType" :data-latex="latex" v-html="html"></span>
</template>

<script setup>
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps({
  node: { type: Object, required: true },
})

const isBlock = computed(() => props.node.type === 'blockMath')
const latex = computed(() => props.node.attrs?.latex || '')

function renderKatex(source) {
  return katex.renderToString(source, {
    throwOnError: false,
    displayMode: isBlock.value,
  })
}

const html = computed(() => {
  if (!latex.value) return ''
  try {
    return renderKatex(latex.value)
  } catch (e) {
    // 渲染出错时回退：若内容是已转义的 HTML，直接原样输出
    if (latex.value.includes('&') && latex.value.includes(';')) return latex.value
    return e?.message || ''
  }
})

const hasError = computed(() => !html.value)

const containerClass = computed(() =>
  hasError.value
    ? `tiptap-mathematics ${isBlock.value ? 'block' : 'inline'}-math-error`
    : 'tiptap-mathematics-render',
)
const dataType = computed(() => (isBlock.value ? 'block-math' : 'inline-math'))
</script>

<style scoped>
.tiptap-mathematics-render :deep(.katex-display) {
  margin: 0;
}
</style>