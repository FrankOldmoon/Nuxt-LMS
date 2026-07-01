<template>
  <component :is="tag" :class="containerClass" :data-type="dataType" :data-latex="latex" v-html="html"></component>
</template>

<script setup>
const CDN_URL = 'https://unpkg.com/@umoteam/editor-external@latest'

const props = defineProps({
  node: { type: Object, required: true },
})

const isBlock = computed(() => props.node.type === 'blockMath')
const latex = computed(() => props.node.attrs?.latex || '')
const tag = computed(() => (isBlock.value ? 'div' : 'span'))

// ---- CDN 资源加载 ----
const loadCss = (url, id) =>
  new Promise((resolve) => {
    if (document.getElementById(id)) return resolve()
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    link.id = id
    link.onload = resolve
    link.onerror = resolve
    document.head.appendChild(link)
  })

const loadScript = (url, id) =>
  new Promise((resolve) => {
    if (document.getElementById(id)) return resolve()
    const script = document.createElement('script')
    script.src = url
    script.id = id
    script.type = 'text/javascript'
    script.onload = resolve
    script.onerror = resolve
    document.head.appendChild(script)
  })

const katexReady = ref(false)
const checkKatex = () => {
  if (typeof window !== 'undefined' && window.katex) {
    katexReady.value = true
    return true
  }
  return false
}

onMounted(async () => {
  if (checkKatex()) return
  await loadCss(`${CDN_URL}/libs/katex/katex.min.css`, 'katex-style')
  await loadScript(`${CDN_URL}/libs/katex/katex.min.js`, 'katex-script')
  if (checkKatex()) return
  const interval = setInterval(() => {
    if (checkKatex()) clearInterval(interval)
  }, 200)
  setTimeout(() => clearInterval(interval), 15000)
})

const html = computed(() => {
  katexReady.value
  if (typeof window !== 'undefined' && window.katex) {
    try {
      return window.katex.renderToString(latex.value, {
        throwOnError: false,
        displayMode: isBlock.value,
      })
    } catch {
      /* ignore */
    }
  }
  return ''
})

const hasError = computed(() => !html.value)

const containerClass = computed(() =>
  hasError.value
    ? `tiptap-mathematics ${isBlock.value ? 'block' : 'inline'}-math-error`
    : 'tiptap-mathematics-render',
)
const dataType = computed(() => (isBlock.value ? 'block-math' : 'inline-math'))
</script>
