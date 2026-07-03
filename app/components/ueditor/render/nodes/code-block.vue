<template>
  <div class="cb-wrapper" :class="`cb-theme-${theme}`">
    <div class="cb-header">
      <span class="cb-lang">{{ language }}</span>
      <div class="flex items-center gap-2">
        <button v-if="isPython" class="cb-run" @click="ideOpen = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button class="cb-copy" :class="{ copied }" @click="copyCode" v-html="copied ? checkIcon : copyIcon"></button>
      </div>
    </div>
    <div class="cb-main">
      <pre class="cb-lines" aria-hidden="true"><span v-for="n in lineCount" :key="n">{{ n }}</span></pre>
      <pre class="cb-code"><code v-html="highlightedHtml"></code></pre>
    </div>

    <!-- Python IDE 弹窗 -->
    <IdeModal v-model:open="ideOpen" :code="codeText" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)

const props = defineProps({
  node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
const language = computed(() => attrs.value.language || 'plaintext')
const theme = computed(() => attrs.value.theme || 'light')
const textWrap = computed(() => attrs.value.textWrap)
const isPython = computed(() => ['python', 'py'].includes(language.value))
const ideOpen = ref(false)

const codeText = computed(() =>
  (props.node.content || []).map((c) => c.text || '').join(''),
)

const lineCount = computed(() => {
  const text = codeText.value
  if (!text) return 1
  return text.split('\n').length
})

const escapeHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const astToHtml = (node) => {
  if (!node) return ''
  if (node.type === 'text') return escapeHtml(node.value)
  if (node.type === 'element' || node.type === 'root') {
    const className = node.properties?.className?.join(' ') || ''
    const tag = node.tagName || 'span'
    const attrs = className ? ` class="${className}"` : ''
    const children = (node.children || []).map(astToHtml).join('')
    return `<${tag}${attrs}>${children}</${tag}>`
  }
  return ''
}

const highlightedHtml = computed(() => {
  const text = codeText.value || ''
  const lang = language.value
  try {
    const langs = lowlight.listLanguages()
    if (langs.includes(lang)) {
      const tree = lowlight.highlight(lang, text)
      return astToHtml(tree)
    }
    return escapeHtml(text)
  } catch (e) {
    console.error('[code-block] highlight error:', e)
    return escapeHtml(text)
  }
})

const copied = ref(false)
let copyTimer = null

const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(codeText.value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = codeText.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style lang="less">
// 非 scoped，用 cb- 前缀避免与 editor.less 冲突

.cb-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;

  &.cb-theme-dark {
    background: #1e293b;
    .cb-header { background: #0f172a; border-bottom-color: #334155; }
    .cb-lang { color: #94a3b8; }
    .cb-copy { color: #94a3b8; border-color: #334155; &:hover { color: #e2e8f0; background: rgba(255,255,255,0.1); } }
    .cb-lines { color: #475569; border-right-color: #334155; }
    .cb-code { color: #e2e8f0; }
    .cb-code .hljs-keyword { color: #ff7b72; }
    .cb-code .hljs-built_in { color: #ffa657; }
    .cb-code .hljs-type { color: #ff7b72; }
    .cb-code .hljs-literal { color: #79c0ff; }
    .cb-code .hljs-number { color: #79c0ff; }
    .cb-code .hljs-operator { color: #79c0ff; }
    .cb-code .hljs-variable { color: #79c0ff; }
    .cb-code .hljs-attr { color: #79c0ff; }
    .cb-code .hljs-attribute { color: #79c0ff; }
    .cb-code .hljs-meta { color: #79c0ff; }
    .cb-code .hljs-string { color: #a5d6ff; }
    .cb-code .hljs-regexp { color: #a5d6ff; }
    .cb-code .hljs-title { color: #d2a8ff; }
    .cb-code .hljs-title.function_ { color: #d2a8ff; }
    .cb-code .hljs-title.class_ { color: #d2a8ff; }
    .cb-code .hljs-comment { color: #8b949e; font-style: italic; }
    .cb-code .hljs-doctag { color: #ff7b72; }
    .cb-code .hljs-name { color: #7ee787; }
    .cb-code .hljs-tag { color: #7ee787; }
    .cb-code .hljs-symbol { color: #ffa657; }
    .cb-code .hljs-bullet { color: #f2cc60; }
    .cb-code .hljs-code { color: #8b949e; }
    .cb-code .hljs-formula { color: #8b949e; }
    .cb-code .hljs-quote { color: #7ee787; }
    .cb-code .hljs-section { color: #1f6feb; }
    .cb-code .hljs-subst { color: #c9d1d9; }
    .cb-code .hljs-addition { color: #aff5b4; background: #033a16; }
    .cb-code .hljs-deletion { color: #ffdcd7; background: #67060c; }
    .cb-code .hljs-template-tag { color: #ff7b72; }
    .cb-code .hljs-template-variable { color: #ff7b72; }
    .cb-code .hljs-variable.language_ { color: #ff7b72; }
  }

  &.cb-theme-light {
    background: #f8fafc;
    .cb-header { background: #f1f5f9; border-bottom-color: #e2e8f0; }
    .cb-lang { color: #64748b; }
    .cb-copy { color: #64748b; border-color: #e2e8f0; &:hover { color: #1e293b; background: rgba(0,0,0,0.05); } }
    .cb-lines { color: #cbd5e1; border-right-color: #e2e8f0; }
    .cb-code { color: #1e293b; }
    .cb-code .hljs-keyword { color: #d73a49; }
    .cb-code .hljs-built_in { color: #e36209; }
    .cb-code .hljs-type { color: #d73a49; }
    .cb-code .hljs-literal { color: #005cc5; }
    .cb-code .hljs-number { color: #005cc5; }
    .cb-code .hljs-operator { color: #005cc5; }
    .cb-code .hljs-variable { color: #005cc5; }
    .cb-code .hljs-attr { color: #005cc5; }
    .cb-code .hljs-attribute { color: #005cc5; }
    .cb-code .hljs-meta { color: #005cc5; }
    .cb-code .hljs-string { color: #032f62; }
    .cb-code .hljs-regexp { color: #032f62; }
    .cb-code .hljs-title { color: #6f42c1; }
    .cb-code .hljs-title.function_ { color: #6f42c1; }
    .cb-code .hljs-title.class_ { color: #6f42c1; }
    .cb-code .hljs-comment { color: #6a737d; font-style: italic; }
    .cb-code .hljs-doctag { color: #d73a49; }
    .cb-code .hljs-name { color: #22863a; }
    .cb-code .hljs-tag { color: #22863a; }
    .cb-code .hljs-symbol { color: #e36209; }
    .cb-code .hljs-bullet { color: #735c0f; }
    .cb-code .hljs-code { color: #6a737d; }
    .cb-code .hljs-formula { color: #6a737d; }
    .cb-code .hljs-quote { color: #22863a; }
    .cb-code .hljs-section { color: #005cc5; font-weight: bold; }
    .cb-code .hljs-subst { color: #24292e; }
    .cb-code .hljs-addition { color: #22863a; background: #f0fff4; }
    .cb-code .hljs-deletion { color: #b31d28; background: #ffeef0; }
    .cb-code .hljs-template-tag { color: #d73a49; }
    .cb-code .hljs-template-variable { color: #d73a49; }
    .cb-code .hljs-variable.language_ { color: #d73a49; }
  }
}

.cb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid;
}

.cb-lang {
  font-size: 12px;
  font-weight: 500;
}

.cb-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 0;

  &.copied {
    color: #22c55e !important;
    border-color: #22c55e !important;
  }
}

.cb-run {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 0;
  color: #22c55e;
  border-color: #22c55e;

  &:hover {
    background: #22c55e;
    color: #fff;
  }
}

.cb-main {
  display: flex;
  overflow: hidden;
  max-height: 500px;
}

.cb-lines {
  margin: 0;
  padding: 12px 10px;
  text-align: right;
  user-select: none;
  font-size: 13px;
  line-height: 1.6;
  border-right: 1px solid;
  flex-shrink: 0;
  font-family: inherit;

  span {
    display: block;
  }
}

.cb-code {
  flex: 1;
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
  font-family: inherit;

  code {
    display: block;
    font-family: inherit !important;
    background: none !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    color: inherit !important;
    font-size: inherit !important;
    white-space: inherit !important;
  }
}
</style>
