import type { Ref } from 'vue'
import type { ChapterTaskMap } from '~/utils/chapterTask'

/**
 * 章节任务完成状态上下文
 * - taskStatus: headingId → 是否完成
 * - nodeStatus: "type:cid" → 是否完成（可提交任务的实时状态）
 * - reportNodeDone: 子组件（question/homework/comment/quiz/race）提交后上报
 * - markHeadingDone: 纯文字 heading 停留 5s 后标记完成
 */
export interface ChapterTaskContext {
  taskMap: Ref<ChapterTaskMap>
  taskStatus: Ref<Record<string, boolean>>
  nodeStatus: Ref<Record<string, boolean>>
  isPass: Ref<boolean>
  reportNodeDone: (type: string, cid: number, done: boolean) => void
  markHeadingDone: (headingId: string, done: boolean) => void
}

const CHAPTER_TASK_KEY = 'chapter-task-context'

/** 子组件注入上下文（无上下文时返回 null，如课程页） */
export function useChapterTask(): ChapterTaskContext | null {
  return inject<ChapterTaskContext | null>(CHAPTER_TASK_KEY, null)
}

/**
 * 在章节页初始化任务上下文：provide 给子组件，并设置停留计时与持久化
 */
export function setupChapterTask(opts: {
  content: Ref<Record<string, any> | null | undefined>
  chapterId: Ref<number | string>
  courseId: Ref<number | string>
  initialTaskStatus?: Record<string, boolean>
  initialIsPass?: boolean
}): ChapterTaskContext {
  const { notifyCourseNavUpdate } = useLayoutState()

  const taskMap = computed(() => extractChapterTasks(opts.content.value))
  const taskStatus = ref<Record<string, boolean>>({ ...(opts.initialTaskStatus || {}) })
  const nodeStatus = ref<Record<string, boolean>>({})
  const isPass = ref(!!opts.initialIsPass)

  // 反向索引：nodeKey → headingId，便于上报时定位所属 heading
  const nodeToHeading = computed<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const [hid, tasks] of Object.entries(taskMap.value.tasksByHeading)) {
      for (const t of tasks) m[t.key] = hid
    }
    return m
  })

  // 重算某个 heading 的完成状态（仅对有任务的 heading）
  function recomputeHeading(headingId: string) {
    const tasks = taskMap.value.tasksByHeading[headingId] || []
    if (tasks.length === 0) return // 纯文字 heading 由停留计时处理
    const allDone = tasks.every(t => nodeStatus.value[t.key])
    taskStatus.value = { ...taskStatus.value, [headingId]: allDone }
  }

  function recomputePass() {
    const hs = taskMap.value.headings
    isPass.value = hs.length > 0 && hs.every(h => taskStatus.value[h.id])
  }

  // ===== 持久化（防抖，仅客户端） =====
  let persistTimer: any = null
  let lastNotifiedPass = isPass.value

  function schedulePersist() {
    if (!import.meta.client) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(doPersist, 1500)
  }

  async function doPersist() {
    const chId = Number(opts.chapterId.value)
    if (!chId) return
    try {
      await cRequest('/api/lms/chapters/task-status', {
        method: 'POST',
        body: {
          chapter_id: chId,
          task_status: taskStatus.value,
          is_pass: isPass.value,
        },
      })
      // is_pass 变化时通知课程侧边栏刷新打钩
      if (isPass.value !== lastNotifiedPass) {
        lastNotifiedPass = isPass.value
        notifyCourseNavUpdate()
      }
    } catch {
      // 静默（未登录或网络错误）
    }
  }

  // ===== 上报接口 =====
  function reportNodeDone(type: string, cid: number, done: boolean) {
    const key = `${type}:${cid}`
    nodeStatus.value = { ...nodeStatus.value, [key]: done }
    const hid = nodeToHeading.value[key]
    if (hid) {
      recomputeHeading(hid)
      recomputePass()
      schedulePersist()
    }
  }

  function markHeadingDone(headingId: string, done: boolean) {
    if (taskStatus.value[headingId] === done) return
    taskStatus.value = { ...taskStatus.value, [headingId]: done }
    recomputePass()
    schedulePersist()
  }

  const ctx: ChapterTaskContext = {
    taskMap,
    taskStatus,
    nodeStatus,
    isPass,
    reportNodeDone,
    markHeadingDone,
  }

  provide(CHAPTER_TASK_KEY, ctx)

  // ===== 纯文字 heading 停留计时（客户端） =====
  if (import.meta.client) {
    let observer: IntersectionObserver | null = null
    let dwellTimer: any = null
    let activeId: string | null = null

    function setActive(id: string) {
      if (id === activeId) return
      activeId = id
      if (dwellTimer) {
        clearTimeout(dwellTimer)
        dwellTimer = null
      }
      // 仅纯文字 heading 且未完成时启动 5s 计时
      const tasks = taskMap.value.tasksByHeading[id] || []
      if (tasks.length === 0 && !taskStatus.value[id]) {
        dwellTimer = setTimeout(() => {
          markHeadingDone(id, true)
          dwellTimer = null
        }, 5000)
      }
    }

    function setupDwell() {
      observer?.disconnect()
      observer = null
      const ids = taskMap.value.headings.map(h => h.id)
      if (!ids.length) return

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          if (visible.length && visible[0]?.target?.id) {
            setActive(visible[0].target.id)
          }
        },
        { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] },
      )

      // 等 heading DOM 渲染完成
      nextTick(() => {
        ids.forEach(id => {
          const el = document.getElementById(id)
          if (el) observer?.observe(el)
        })
      })
    }

    onMounted(() => {
      nextTick(() => setupDwell())
    })

    // 内容变化时重建观察
    watch(taskMap, () => {
      nextTick(() => setupDwell())
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
      observer = null
      if (dwellTimer) clearTimeout(dwellTimer)
      if (persistTimer) clearTimeout(persistTimer)
      // 离开页面时立即持久化一次
      doPersist()
    })
  }

  return ctx
}
