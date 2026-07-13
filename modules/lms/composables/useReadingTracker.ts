import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * 单个可阅读块的 hover 阅读追踪逻辑（供 ReadingBlock / list-item / task-item 共用）
 *
 * 视觉反馈（由调用方根据返回的状态映射 class）：
 * - hover 进入：边框变黄（isHovering=true 且未读）
 * - hover 停留 3s：调用 markBlockRead 标记已读，边框变绿
 * - 离开 hover：未读完则黄边消失；已读完则保留绿边作为"已读"标记
 * - 所属 heading 已完成（sticky）：不再高亮、也不再启动计时
 *
 * @param blockKey 块 key，形如 "3"（顶层块）或 "3.1"（列表项）
 */
export function useReadingTracker(blockKey: string) {
  const tracker = useChapterTask()

  const visited = computed(() => !!tracker?.isBlockRead(blockKey))
  const headingId = computed(() => tracker?.blockHeadingOf(blockKey) ?? null)
  const headingDone = computed(() => !!headingId.value && !!tracker?.isHeadingDone(headingId.value))
  /** 是否应保持"已读"绿色高亮：已读且所属 heading 未完成 */
  const shouldHighlight = computed(() => visited.value && !headingDone.value)
  /** 是否当前正在 hover（用于瞬时黄色边框） */
  const isHovering = ref(false)

  let timer: any = null
  function onEnter() {
    isHovering.value = true
    if (!tracker || headingDone.value || visited.value) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      tracker.markBlockRead(blockKey)
      timer = null
    }, 3000)
  }

  function onLeave() {
    isHovering.value = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { visited, headingDone, shouldHighlight, isHovering, onEnter, onLeave }
}
