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
  // pass through courseId tochild nodePoint（provide letdeep Vue nodePointalso canRead）
  const { courseId: ctxCourseId } = useLmsContext()
  const effectiveCourseId = computed(() => {
    if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
      return Number(props.courseId) || 0
    }
    return ctxCourseId.value
  })

  // provide tochild tree（replaceOld setEditableMeta temporarySettings/alsooriginal）
  provideLmsCourseId(effectiveCourseId)

  const renderNodeRef = ref<any>(null)
  const defaultLineHeight = computed(() => props.lineHeight)

  const renderContent = computed(() => {
    if (props.json === null || props.json === undefined || props.json === '') {
      return null
    }
    // charactersstring：convert TipTap JSON（supportPlain Text / markdown）
    if (typeof props.json === 'string') {
      return markdownToTiptap(props.json)
    }
    // Number / boolean：jsonb pureNumbercharactersstringwilldrivenAnalysis number，need to convert backcharactersstring
    if (typeof props.json === 'number' || typeof props.json === 'boolean') {
      return markdownToTiptap(String(props.json))
    }
    // Object：EmptyObjectnoRender
    if (!Object.keys(props.json).length) {
      return null
    }
    return props.json
  })

  // ========== ImageFullscreenPreview ==========
  const imageModalOpen = ref(false)
  const imageModalIndex = ref(0)
  const image list = ref<any[]>([])

  // fromRender DOM MiddleextractAllImageand canvas andbindClick event
  function bindImageClicks() {
    const comp = renderNodeRef.value
    if (!comp) return
    const el = comp.$el || comp
    if (!el || typeof el.querySelectorAll !== 'function') return

    // collectAllcanPreviewImage URL（img Tag + canvas convert dataURL）
    const urls: string[] = []

    // 1. collect img Tag
    const imgs = el.querySelectorAll('img')
    imgs.forEach((img: any) => {
      const src = img.src || img.getAttribute('data-src') || ''
      if (src) {
        urls.push(src)
        img.style.cursor = 'pointer'
        img.onclick = (e: any) => {
          e.stopPropagation()
          image list.value = urls
          imageModalIndex.value = urls.indexOf(src)
          imageModalOpen.value = true
        }
      }
    })

    // 2. collect canvas（PDF Pageetc.），convert dataURL
    const canvases = el.querySelectorAll('canvas')
    canvases.forEach((canvas: any) => {
      try {
        const dataUrl = canvas.toDataURL('image/png')
        if (dataUrl && dataUrl.length > 100) {
          const urlRef = dataUrl
          urls.push(urlRef)
          canvas.style.cursor = 'pointer'
          // double-clickTriggerPreview，preserve textcharactersSelectsingle-clicklines
          canvas.ondblclick = (e: any) => {
            e.stopPropagation()
            image list.value = urls
            imageModalIndex.value = urls.indexOf(urlRef)
            imageModalOpen.value = true
          }

          // text-layer alsobind double-click（overlay canvas Upside）
          const wrapper = canvas.closest('.pdf-page-wrapper, .pdf-node-preview')
          if (wrapper) {
            const textLayer = wrapper.querySelector('.pdf-text-layer')
            if (textLayer) {
              textLayer.ondblclick = (e: any) => {
                e.stopPropagation()
                image list.value = urls
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

    // listen DOM change，PDF/AsyncRenderCompleteBackAutobind
    const comp = renderNodeRef.value
    const el = comp?.$el || comp
    if (el && typeof el.querySelectorAll === 'function') {
      mutationObserver = new MutationObserver(() => {
        bindImageClicks()
      })
      mutationObserver.observe(el, { child list: true, sub-tree: true })
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
    image list,
  }
}
