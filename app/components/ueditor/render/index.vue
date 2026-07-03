<template>
  <div class="umo-editor-render umo-page-content render" style="width:100%; min-height:30px">
    <div v-if="renderContent" class="umo-editor-content is-readonly" :style="{ lineHeight: defaultLineHeight }"
      :spellcheck="false">
      <div class="umo-editor" contenteditable="false" style="padding: 0px; min-height: 100%;" ref="renderNodeRef">
        <RenderNode :node="renderContent" />
      </div>
    </div>

    <!-- 图片全屏预览 -->
    <UeditorRenderImageModal v-model:open="imageModalOpen" :images="imageList" :initial-index="imageModalIndex" />
  </div>
</template>

<script setup>

import RenderNode from './node.vue'

const props = defineProps({
  json: {
    type: Object,
    default: () => ({}),
  },
  // CDN 地址（用于文件图标、echarts、KaTeX 等资源加载）
  cdnUrl: {
    type: String,
    default: 'https://unpkg.com/@umoteam/editor-external@latest',
  },
  // 默认行高
  lineHeight: {
    type: [Number, String],
    default: 1.75,
  },
  // 页面背景色
  background: {
    type: String,
    default: '#fff',
  },
})

const renderNodeRef = ref(null)
const defaultLineHeight = computed(() => props.lineHeight)

const renderContent = computed(() => {
  if (!props.json || !Object.keys(props.json).length) {
    return null
  } else if (typeof props.json == 'string') {
    return markdownToTiptap(props.json)
  }
  return props.json
})

// ========== 图片全屏预览 ==========
const imageModalOpen = ref(false)
const imageModalIndex = ref(0)
const imageList = ref([])

// 从渲染 DOM 中提取所有图片和 canvas 并绑定点击事件
function bindImageClicks() {
  const comp = renderNodeRef.value
  if (!comp) return
  const el = comp.$el || comp
  if (!el || typeof el.querySelectorAll !== 'function') return

  // 收集所有可预览的图片 URL（img 标签 + canvas 转 dataURL）
  const urls = []

  // 1. 收集 img 标签
  const imgs = el.querySelectorAll('img')
  imgs.forEach((img) => {
    const src = img.src || img.getAttribute('data-src') || ''
    if (src) {
      urls.push(src)
      img.style.cursor = 'pointer'
      img.onclick = (e) => {
        e.stopPropagation()
        imageList.value = urls
        imageModalIndex.value = urls.indexOf(src)
        imageModalOpen.value = true
      }
    }
  })

  // 2. 收集 canvas（PDF 页面等），转为 dataURL
  const canvases = el.querySelectorAll('canvas')
  canvases.forEach((canvas) => {
    try {
      const dataUrl = canvas.toDataURL('image/png')
      if (dataUrl && dataUrl.length > 100) {
        const urlRef = dataUrl
        urls.push(urlRef)
        canvas.style.cursor = 'pointer'
        // 双击触发预览，保留文字选择的单击行为
        canvas.ondblclick = (e) => {
          e.stopPropagation()
          imageList.value = urls
          imageModalIndex.value = urls.indexOf(urlRef)
          imageModalOpen.value = true
        }

        // text-layer 也绑定双击（覆盖在 canvas 上方）
        const wrapper = canvas.closest('.pdf-page-wrapper, .pdf-node-preview')
        if (wrapper) {
          const textLayer = wrapper.querySelector('.pdf-text-layer')
          if (textLayer) {
            textLayer.ondblclick = (e) => {
              e.stopPropagation()
              imageList.value = urls
              imageModalIndex.value = urls.indexOf(urlRef)
              imageModalOpen.value = true
            }
          }
        }
      }
    } catch (e) {
      console.warn('[imageModal] canvas toDataURL failed:', e.message)
    }
  })
}

let mutationObserver = null

onMounted(() => {
  nextTick(() => {
    setTimeout(bindImageClicks, 1000)
  })

  // 监听 DOM 变化，PDF/异步渲染完成后自动绑定
  const comp = renderNodeRef.value
  const el = comp?.$el || comp
  if (el && typeof el.querySelectorAll === 'function') {
    mutationObserver = new MutationObserver(() => {
      bindImageClicks()
    })
    mutationObserver.observe(el, { childList: true, subtree: true })
  }
})

watch(renderContent, () => {
  nextTick(() => {
    setTimeout(bindImageClicks, 1000)
  })
})

onBeforeUnmount(() => {
  mutationObserver?.disconnect()
})


</script>

<style lang="less">
@import "../../../../node_modules/@umoteam/editor/dist/umo-editor.css";

.umo-page-content .render {
  min-height: 100% !important
}

.umo-editor-render-container {
  //width: 100%;

  // 重置段落和列表的默认 margin/padding（与编辑器容器保持一致）
  p,
  ul,
  ol {
    margin: 0;
    padding: 0;
  }
}

.umo-editor-render {
  transform-origin: 0 0;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--umo-page-background);
  min-height: 100px;
  overflow: visible !important;
  color: var(--umo-text-color);

  .umo-page-node-content {
    position: relative;
    box-sizing: border-box;
    min-height: 100px;
    //width: 100%;
  }

  // 渲染模式下允许 iframe 内容可交互（滚动/点击）
  .umo-node-iframe iframe {
    pointer-events: auto !important;
  }
}
</style>
