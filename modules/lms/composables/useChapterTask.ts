import { shallowRef, type Ref } from 'vue'
import type { ChapterTaskMap } from '../utils/chapterTask'

/**
 * Chapter task completion status context
 *
 * Completion criteria (common for all headings):
 * 1. All submittable interactive components under the heading (question/homework/comment/quiz/race) must be correctly submitted
 * 2. All block-level text/image content under the heading (paragraphs/images/codeBlock/lists/tables/callouts, etc.) must be hovered by the mouse for 3s
 *
 * - Hover read state is not persisted, restarts after page refresh
 * - Heading completion state (taskStatus) is persisted and is "sticky" — once completed it does not regress
 * - Content under completed headings no longer shows hover yellow highlight
 * - When not logged in, does not record or highlight (trackReading is gated by the page layer based on login state)
 * - After the last block is highlighted, delays 1s before recording heading completion and shows a toast prompt
 */
export interface ChapterTaskContext {
  taskMap: Ref<ChapterTaskMap>
  taskStatus: Ref<Record<string, boolean>>
  nodeStatus: Ref<Record<string, boolean>>
  isPass: Ref<boolean>
  /** Report after interactive component submission */
  reportNodeDone: (type: string, cid: number, done: boolean) => void
  /** The heading id that a readable block belongs to; null if none. The key is like "3" or "3.1" (for list items) */
  blockHeadingOf: (key: string) => string | null
  /** Whether the block has already been hover-read */
  isBlockRead: (key: string) => boolean
  /** Mark a block as read (called after hover stays for 3s) */
  markBlockRead: (key: string) => void
  /** Whether a heading is completed (sticky) */
  isHeadingDone: (headingId: string) => boolean
}

const CHAPTER_TASK_KEY = 'chapter-task-context'

/**
 * Module-level shared ref: allows components outside the provide/inject subtree to access the current chapter task context.
 * Typical scenario: mobile TOC is rendered in USlideover (layout layer, is the page's parent component),
 * and cannot get the context provided by setupChapterTask within the page via inject.
 * setupChapterTask sets this ref, onBeforeUnmount clears it.
 */
const sharedChapterTaskCtx = shallowRef<ChapterTaskContext | null>(null)

/** Child component injects the context (returns null when there is no context, e.g. course page or mobile slideover fallback) */
export function useChapterTask(): ChapterTaskContext | null {
  const injected = inject<ChapterTaskContext | null>(CHAPTER_TASK_KEY, null)
  return injected || sharedChapterTaskCtx.value
}

/**
 * Initialize the task context on the chapter page: provide to child components, and set up hover reading tracking and persistence
 */
export function setupChapterTask(opts: {
  content: Ref<Record<string, any> | null | undefined>
  chapterId: Ref<number | string>
  courseId: Ref<number | string>
  /** Chapter title (h1), added as the first heading in progress statistics; id is chapterId */
  chapterTitle?: Ref<string>
  initialTaskStatus?: Record<string, boolean>
  initialIsPass?: boolean
}): ChapterTaskContext {
  const { notifyCourseNavUpdate } = useLayoutState()
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  // Import useUserCard: when readingBlock completes a heading, call refresh() to trigger userCard to re-fetch points
  const { refresh: refreshUserCard } = useUserCard()

  const taskMap = computed(() => {
    const map = extractChapterTasks(opts.content.value)
    // Add the chapter title (h1) as the first heading in the task list, with id as chapterId
    // This way TOC progress aggregation and isPass calculation will include the chapter title
    if (opts.chapterTitle?.value) {
      const chId = String(opts.chapterId.value)
      map.headings.unshift({ id: chId, level: 1, text: opts.chapterTitle.value })
      if (!map.tasksByHeading[chId]) map.tasksByHeading[chId] = []
    }
    return map
  })
  const taskStatus = ref<Record<string, boolean>>({ ...(opts.initialTaskStatus || {}) })
  const nodeStatus = ref<Record<string, boolean>>({})
  const isPass = ref(!!opts.initialIsPass)

  // ===== Top-level block layout: build blockKey → headingId mapping =====
  // Only tracks block-level content that needs hover reading (excluding headings themselves and vue interactive nodes)
  // Vue interactive nodes (question/homework/...) go through the submit reporting path and are not counted in reading requirements
  // List nodes (bulletList/orderedList/taskList) are split by listItem/taskItem,
  // each <li> is a separate readable block (highlighted line by line), with key like "${topIndex}.${itemIndex}"
  // Empty paragraphs (no text, only hardBreak/whitespace) are not tracked, otherwise users cannot hover and get stuck
  const LIST_TYPES = new Set(['bulletList', 'orderedList', 'taskList'])
  function isEmptyParagraph(node: any): boolean {
    if (node.type !== 'paragraph') return false
    if (!node.content || node.content.length === 0) return true
    return node.content.every((child: any) => {
      if (child.type === 'text') return !child.text || !child.text.trim()
      if (child.type === 'hardBreak') return true
      return false
    })
  }
  const blockLayout = computed(() => {
    const byHeading: Record<string, string[]> = {}
    const blockToHeading: Record<string, string> = {}
    // Must use Array.isArray check: || would be bypassed by truthy non-array values (e.g. {}, string),
    // causing topBlocks.forEach to throw TypeError. Compatible with dirty data like content=null/content.content={}.
    const topBlocks: any[] = Array.isArray(opts.content.value?.content)
      ? opts.content.value.content
      : []
    // Chapter title h1 (synthesized) as the initial current heading, top-level blocks under it belong to it
    let curHeading = String(opts.chapterId.value)
    topBlocks.forEach((child: any, index: number) => {
      if (!child) return
      if (child.type === 'heading') {
        const id = child.attrs?.id || child.attrs?.['data-toc-id']
        if (id) curHeading = String(id)
        return
      }
      if (child.type === 'vue') return // Interactive components go through the submit path
      if (isEmptyParagraph(child)) return // Empty lines are not included in hover tracking
      // List: each listItem/taskItem is a separate readable block
      if (LIST_TYPES.has(child.type) && Array.isArray(child.content)) {
        child.content.forEach((_item: any, j: number) => {
          const key = `${index}.${j}`
          blockToHeading[key] = curHeading
          ;(byHeading[curHeading] ||= []).push(key)
        })
        return
      }
      // Other block-level content (paragraphs/images/codeBlock/tables/callouts, etc.) as a whole readable block
      const key = String(index)
      blockToHeading[key] = curHeading
      ;(byHeading[curHeading] ||= []).push(key)
    })
    return { byHeading, blockToHeading }
  })

  // Hover read block set (not persisted, reset on refresh)
  const readBlocks = ref<Set<string>>(new Set())

  // Delayed completion heading timers (records completion 1s after the last block is highlighted)
  const pendingCompletion = new Map<string, ReturnType<typeof setTimeout>>()

  function isBlockRead(key: string): boolean {
    return readBlocks.value.has(key)
  }

  function blockHeadingOf(key: string): string | null {
    return blockLayout.value.blockToHeading[key] ?? null
  }

  function isHeadingDone(headingId: string): boolean {
    return !!taskStatus.value[headingId]
  }

  // Reverse index: nodeKey → headingId, convenient for locating the parent heading during reporting
  const nodeToHeading = computed<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const [hid, tasks] of Object.entries(taskMap.value.tasksByHeading)) {
      for (const t of tasks) m[t.key] = hid
    }
    return m
  })

  /** Check whether a heading meets the completion conditions (does not actually mark, used to determine whether to delay) */
  function wouldCompleteHeading(headingId: string): boolean {
    if (taskStatus.value[headingId]) return false
    const tasks = taskMap.value.tasksByHeading[headingId] || []
    const tasksDone = tasks.length === 0 || tasks.every(t => nodeStatus.value[t.key])
    if (!tasksDone) return false
    const blocks = blockLayout.value.byHeading[headingId] || []
    const blocksRead = blocks.length === 0 || blocks.every(idx => readBlocks.value.has(idx))
    return blocksRead
  }

  /**
   * Recompute the completion status of a heading.
   * Sticky: completed headings do not regress (avoids completed tasks regressing after refresh due to no hover).
   * Completion conditions: all submit tasks answered correctly AND all readable blocks have been hovered.
   * @returns Whether the heading was just set to completed
   */
  function recomputeHeading(headingId: string): boolean {
    if (taskStatus.value[headingId]) return false // sticky
    if (pendingCompletion.has(headingId)) return false // Currently delaying, waiting for the timer to trigger
    const tasks = taskMap.value.tasksByHeading[headingId] || []
    const tasksDone = tasks.length === 0 || tasks.every(t => nodeStatus.value[t.key])
    if (!tasksDone) return false
    const blocks = blockLayout.value.byHeading[headingId] || []
    const blocksRead = blocks.length === 0 || blocks.every(idx => readBlocks.value.has(idx))
    if (!blocksRead) return false
    taskStatus.value = { ...taskStatus.value, [headingId]: true }
    return true
  }

  /** Wrapper for recomputeHeading: if the state flips, recompute isPass and schedule persistence */
  function checkHeading(headingId: string) {
    if (recomputeHeading(headingId)) {
      recomputePass()
      schedulePersist()
    }
  }

  function recomputePass() {
    const hs = taskMap.value.headings
    isPass.value = hs.length > 0 && hs.every(h => taskStatus.value[h.id])
  }

  // ===== Persistence (debounced, client-side only) =====
  let persistTimer: any = null
  let lastNotifiedPass = isPass.value

  function schedulePersist() {
    if (!import.meta.client) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(doPersist, 1500)
  }

  async function doPersist() {
    // Do not record learning progress when not logged in
    if (!user.value) return

    const chId = Number(opts.chapterId.value)
    if (!chId) return
    try {
      await cRequest('/api/chapters/task-status', {
        method: 'POST',
        body: {
          chapter_id: chId,
          task_status: taskStatus.value,
          is_pass: isPass.value,
        },
      })
      // Heading completed: notify userCard to re-fetch points (chapter score/experience/coins may change due to completion)
      refreshUserCard()
      // When is_pass changes, notify the course sidebar to refresh the checkmark
      if (isPass.value !== lastNotifiedPass) {
        lastNotifiedPass = isPass.value
        notifyCourseNavUpdate()
      }
    } catch {
      // Silent (network error)
    }
  }

  // ===== Reporting interface =====
  function reportNodeDone(type: string, cid: number, done: boolean) {
    const key = `${type}:${cid}`
    nodeStatus.value = { ...nodeStatus.value, [key]: done }
    const hid = nodeToHeading.value[key]
    if (hid) checkHeading(hid)
  }

  /** Mark a block as read after hover stays for 3s */
  function markBlockRead(key: string) {
    if (!user.value) return
    if (readBlocks.value.has(key)) return
    // Reassign to stably trigger reactivity
    readBlocks.value = new Set([...readBlocks.value, key])
    const hid = blockLayout.value.blockToHeading[key]
    if (!hid) return

    // After the last block is highlighted, delay 1s before recording completion (let the user see the yellow highlight + toast prompt)
    if (wouldCompleteHeading(hid) && !pendingCompletion.has(hid)) {
      const timer = setTimeout(() => {
        pendingCompletion.delete(hid)
        checkHeading(hid)
        if (taskStatus.value[hid]) {
          const heading = taskMap.value.headings.find(h => h.id === hid)
          toast.add({
            title: t('chapter.headingCompleted', { name: heading?.text || hid }),
            color: 'success',
            icon: 'i-lucide-check-circle',
          })
        }
      }, 1000)
      pendingCompletion.set(hid, timer)
    } else {
      checkHeading(hid)
    }
  }

  const ctx: ChapterTaskContext = {
    taskMap,
    taskStatus,
    nodeStatus,
    isPass,
    reportNodeDone,
    blockHeadingOf,
    isBlockRead,
    markBlockRead,
    isHeadingDone,
  }

  provide(CHAPTER_TASK_KEY, ctx)
  // Also share via module-level ref, for components outside the provide subtree to access (e.g. TOC in mobile slideover)
  sharedChapterTaskCtx.value = ctx

  // ===== Client side: recompute all headings when content/layout changes =====
  if (import.meta.client) {
    // Recompute all heading completion states after content is loaded (sticky, completed ones do not regress).
    // Covers timing issues: question may have been answered and reported before content is fully loaded,
    // at which point nodeToHeading is not yet established → checkHeading inside reportNodeDone misses;
    // this watcher remedies this after taskMap is ready, letting correctly answered tasks trigger completion.
    // Also covers the original requirement of auto-completing empty headings (no tasks and no readable blocks).
    watch(
      [taskMap, blockLayout],
      () => {
        if (!user.value) return
        for (const h of taskMap.value.headings) {
          checkHeading(h.id)
        }
      },
      { flush: 'post', immediate: true },
    )

    onBeforeUnmount(() => {
      if (persistTimer) clearTimeout(persistTimer)
      // Clear delayed completion timers to avoid triggering toast after leaving the page
      for (const timer of pendingCompletion.values()) clearTimeout(timer)
      pendingCompletion.clear()
      // Persist once immediately when leaving the page
      doPersist()
      // Clear the module-level shared ref to prevent the next page from reading the stale context
      sharedChapterTaskCtx.value = null
    })
  }

  return ctx
}
