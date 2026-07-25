import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface RenderIndexProps {
  json: {
    type: [Object, String, Number, Boolean],
    default: () => ({})
  },
  cdnUrl: {
    type: String,
    default: string
  },
  lineHeight: {
    type: [Number, String],
    default: number
  },
  background: {
    type: String,
    default: string
  },
  courseId: {
    type: [Number, String],
    default: undefined
  }
}

export function useRenderIndex(props: any, emit: any) {
  // 透传 courseId 给子节点（provide 让深层 Vue 节点也能读取）
  const { courseId: ctxCourseId } = useLmsContext()
  const effectiveCourseId = computed(() => {
    if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
      return Number(props.courseId) || 0
    }
    return ctxCourseId.value
  })

  // provide 给子树（替代旧的 setEditableMeta 临时设置/还原）
  provideLmsCourseId(effectiveCourseId)

  const renderNodeRef = ref<any>(null)
  const defaultLineHeight = computed(() => props.lineHeight)

  const renderContent = computed(() => {
    if (props.json === null || props.json === undefined || props.json === '') {
      return null
    }
    // 字符串：转 TipTap JSON（支持纯文本 / markdown）
    if (typeof props.json === 'string') {
      return markdownToTiptap(props.json)
    }
    // 数字 / 布尔：jsonb 纯数字字符串会被驱动解析为 number，需转回字符串
    if (typeof props.json === 'number' || typeof props.json === 'boolean') {
      return markdownToTiptap(String(props.json))
    }
    // 对象：空对象不渲染
    if (!Object.keys(props.json).length) {
      return null
    }
    return props.json
  })

  // ========== 图片全屏预览 ==========
  const imageModalOpen = ref(false)
  const imageModalIndex = ref(0)
  const imageList = ref<any[]>([])

  // 从渲染 DOM 中提取所有图片和 canvas 并绑定点击事件
  function bindImageClicks() {
    const comp = renderNodeRef.value
    if (!comp) return
    const el = comp.$el || comp
    if (!el || typeof el.querySelectorAll !== 'function') return

    // 收集所有可预览的图片 URL（img 标签 + canvas 转 dataURL）
    const urls: string[] = []

    // 1. 收集 img 标签
    const imgs = el.querySelectorAll('img')
    imgs.forEach((img: any) => {
      const src = img.src || img.getAttribute('data-src') || ''
      if (src) {
        urls.push(src)
        img.style.cursor = 'pointer'
        img.onclick = (e: any) => {
          e.stopPropagation()
          imageList.value = urls
          imageModalIndex.value = urls.indexOf(src)
          imageModalOpen.value = true
        }
      }
    })

    // 2. 收集 canvas（PDF 页面等），转为 dataURL
    const canvases = el.querySelectorAll('canvas')
    canvases.forEach((canvas: any) => {
      try {
        const dataUrl = canvas.toDataURL('image/png')
        if (dataUrl && dataUrl.length > 100) {
          const urlRef = dataUrl
          urls.push(urlRef)
          canvas.style.cursor = 'pointer'
          // 双击触发预览，保留文字选择的单击行为
          canvas.ondblclick = (e: any) => {
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
              textLayer.ondblclick = (e: any) => {
                e.stopPropagation()
                imageList.value = urls
                imageModalIndex.value = urls.indexOf(urlRef)
                imageModalOpen.value = true
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('[imageModal] canvas toDataURL failed:', e.message)
      }
    })
  }

  let mutationObserver: any = null

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

  return {
    effectiveCourseId,
    renderNodeRef,
    defaultLineHeight,
    renderContent,
    imageModalOpen,
    imageModalIndex,
    imageList,
  }
}
