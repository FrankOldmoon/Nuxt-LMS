import { computed, onBeforeUnmount } from 'vue'

/**
 * 单个可阅读块的 hover 阅读追踪逻辑（供 ReadingBlock / list-item / task-item 共用）
 *
 * - hover 停留 3s 标记已读
 * - 已读后高亮（文字/代码→背景；图片→边框；列表项→背景），由调用方按需取 shouldHighlight
 * - 所属 heading 已完成（sticky）时不再高亮、也不再启动计时
 *
 * @param blockKey 块 key，形如 "3"（顶层块）或 "3.1"（列表项）
 */
export function useReadingTracker(blockKey: string) {
  const tracker = useChapterTask()

  const visited = computed(() => !!tracker?.isBlockRead(blockKey))
  const headingId = computed(() => tracker?.blockHeadingOf(blockKey) ?? null)
  const headingDone = computed(() => !!headingId.value && !!tracker?.isHeadingDone(headingId.value))
  /** 是否应高亮：已读且所属 heading 未完成 */
  const shouldHighlight = computed(() => visited.value && !headingDone.value)

  let timer: any = null
  function onEnter() {
    if (!tracker || headingDone.value || visited.value) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      tracker.markBlockRead(blockKey)
      timer = null
    }, 3000)
  }

  function onLeave() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { visited, headingDone, shouldHighlight, onEnter, onLeave }
}
