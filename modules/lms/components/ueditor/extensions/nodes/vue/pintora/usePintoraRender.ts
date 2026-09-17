import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

// Pintora 从本地 /vendor 动态加载（ESM，由 scripts/copy-vendor-assets.mjs 从 @pintora/standalone 拷贝），
// 内网/无外网可直接用；保持懒加载，不进主 bundle。
const PINTORA_URL = '/vendor/pintora/pintora-standalone.esm.mjs'

let pintoraPromise: Promise<any> | null = null

/** 懒加载 Pintora（模块级缓存，同一会话只加载一次） */
function loadPintora() {
  if (!pintoraPromise) {
    pintoraPromise = import(/* @vite-ignore */ PINTORA_URL).then((mod: any) => {
      // 打包产物的 default 可能即导出对象本身
      const p = mod?.default?.renderTo ? mod.default : mod
      if (!p?.renderTo) throw new Error('Pintora 加载失败：找不到 renderTo API')
      return p
    })
  }
  return pintoraPromise
}

export interface PintoraRenderProps {
  node?: any
}

export function usePintoraRender(props: PintoraRenderProps) {
  const contentBox = ref<any>(null)
  const pintoraContainer = ref<any>(null)
  const loading = ref(false)
  const error = ref('')
  const isFullscreen = ref(false)

  // 节点内容 = Pintora DSL 源码
  const code = computed(() => props.node?.attrs?.content || '')
  // 手动设置的高度：>0 时作为容器最小高度
  const fixedHeight = computed(() => {
    const h = Number(props.node?.attrs?.height)
    return h > 0 ? h : 0
  })
  const containerStyle = computed(() =>
    fixedHeight.value ? { minHeight: `${fixedHeight.value}px` } : {},
  )

  // 渲染序号：防止 code 快速变化时旧渲染结果覆盖新结果
  let renderSeq = 0

  async function renderDiagram() {
    const el = pintoraContainer.value
    if (!el) return
    const c = String(code.value || '').trim()
    if (!c) {
      el.innerHTML = ''
      error.value = ''
      loading.value = false
      return
    }
    const seq = ++renderSeq
    loading.value = true
    error.value = ''
    try {
      const pintora = await loadPintora()
      if (seq !== renderSeq || !pintoraContainer.value) return
      const el = pintoraContainer.value
      el.innerHTML = ''
      // 正确 API（官方文档）：renderTo(code, { container, ... }) ——
      // code 在前、容器在 options 中。若按 (container, code) 调用，pintora 会把
      // 容器当 code、code 当 options，取 e.container 为 undefined 而抛
      // "Cannot read properties of undefined (reading 'clientWidth')"。
      pintora.renderTo(c, {
        container: el,
        config: { core: { useMaxWidth: true } },
        onError: (err: any) => {
          if (seq === renderSeq) error.value = err?.message || String(err)
        },
      })
    } catch (e: any) {
      if (seq !== renderSeq) return
      error.value = e?.message || String(e)
    } finally {
      if (seq === renderSeq) loading.value = false
    }
  }

  // 内容变化时自动重渲染（编辑时实时预览 / 读取不同节点时更新）
  watch(code, () => {
    if (import.meta.client) renderDiagram()
  })

  function onFullscreenChange() {
    isFullscreen.value = document.fullscreenElement === contentBox.value
  }

  const toggleFullscreen = () => {
    if (!import.meta.client) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      contentBox.value?.requestFullscreen().catch(() => {})
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    renderDiagram()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    if (import.meta.client && document.fullscreenElement === contentBox.value) {
      document.exitFullscreen().catch(() => {})
    }
  })

  return {
    contentBox, pintoraContainer, loading, error, isFullscreen, code,
    containerStyle, toggleFullscreen,
  }
}
