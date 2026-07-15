import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * Hover reading tracking logic for a single readable block (shared by ReadingBlock / list-item / task-item)
 *
 * Visual feedback (caller maps classes based on returned state):
 * - hover enter: border turns yellow (isHovering=true and unread)
 * - hover stay 3s: call markBlockRead to mark as read, border turns green
 * - leave hover: yellow border disappears if not finished; green border retained as "read" mark if finished
 * - Parent heading completed (sticky): no longer highlight, no longer start timer
 *
 * @param blockKey block key, e.g. "3" (top-level block) or "3.1" (list item)
 */
export function useReadingTracker(blockKey: string) {
  const tracker = useChapterTask()

  const visited = computed(() => !!tracker?.isBlockRead(blockKey))
  const headingId = computed(() => tracker?.blockHeadingOf(blockKey) ?? null)
  const headingDone = computed(() => !!headingId.value && !!tracker?.isHeadingDone(headingId.value))
  /** Whether to keep "read" green highlight: read and parent heading not completed */
  const shouldHighlight = computed(() => visited.value && !headingDone.value)
  /** Whether currently hovering (for instant yellow border) */
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
