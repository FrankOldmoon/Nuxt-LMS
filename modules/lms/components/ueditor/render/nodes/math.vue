<template>
  <div v-if="isBlock" :class="containerClass" :data-type="dataType" :data-latex="latex" v-html="html"></div>
  <span v-else :class="containerClass" :data-type="dataType" :data-latex="latex" v-html="html"></span>
</template>

<script setup>
import katex from 'katex'

const props = defineProps({
  node: { type: Object, required: true },
})

/**
 * katex 公式样式按需加载：
 * 不用 `import 'katex/dist/katex.min.css'`（那会把约 23 KB 样式并进入口 CSS，
 * 因为本组件被 ueditor 节点分发器静态引用），改为渲染公式时用 useHead 挂上
 * public/vendor 里的静态副本（由 scripts/copy-vendor-assets.mjs 拷贝）。
 * 走 useHead 而非 DOM 注入：SSR 会一并输出 <link>，公式首屏不会无样式闪烁。
 */
useHead({
  link: [{ rel: 'stylesheet', href: '/vendor/katex/katex.min.css' }],
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