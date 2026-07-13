import { shallowRef, type Ref } from 'vue'
import type { ChapterTaskMap } from '../utils/chapterTask'

/**
 * 章节任务完成状态上下文
 *
 * 完成标准（所有 heading 通用）：
 * 1. 该 heading 下方所有可提交互动组件（question/homework/comment/quiz/race）全部 submit 答对
 * 2. 该 heading 下方所有块级图文内容（段落/图片/codeBlock/列表/表格/callout 等）都被鼠标 hover 停留 3s
 *
 * - hover 已读状态不持久化，刷新页面后重新开始
 * - heading 完成状态（taskStatus）持久化，且为"sticky"——一旦完成不再回退
 * - 已完成的 heading 下的内容不再显示 hover 黄色高亮
 * - 未登录时不记录、不高亮（trackReading 由页面层根据登录态 gating）
 * - 最后一个 block 标黄后延迟 1s 再记录 heading 完成，并弹出 toast 提示
 */
export interface ChapterTaskContext {
  taskMap: Ref<ChapterTaskMap>
  taskStatus: Ref<Record<string, boolean>>
  nodeStatus: Ref<Record<string, boolean>>
  isPass: Ref<boolean>
  /** 互动组件提交后上报 */
  reportNodeDone: (type: string, cid: number, done: boolean) => void
  /** 某个可阅读块所属 heading id；无则 null。key 形如 "3" 或 "3.1"（列表项） */
  blockHeadingOf: (key: string) => string | null
  /** 该块是否已被 hover 阅读过 */
  isBlockRead: (key: string) => boolean
  /** 标记某块为已读（hover 停留 3s 后调用） */
  markBlockRead: (key: string) => void
  /** 某个 heading 是否已完成（sticky） */
  isHeadingDone: (headingId: string) => boolean
}

const CHAPTER_TASK_KEY = 'chapter-task-context'

/**
 * 模块级共享 ref：允许不在 provide/inject 子树内的组件访问当前章节任务上下文。
 * 典型场景：移动端 TOC 在 USlideover（layout 层，是页面的父组件）中渲染，
 * 无法通过 inject 获取页面内 setupChapterTask 提供的上下文。
 * setupChapterTask 设置此 ref，onBeforeUnmount 清除。
 */
const sharedChapterTaskCtx = shallowRef<ChapterTaskContext | null>(null)

/** 子组件注入上下文（无上下文时返回 null，如课程页或移动端 slideover 回退） */
export function useChapterTask(): ChapterTaskContext | null {
  const injected = inject<ChapterTaskContext | null>(CHAPTER_TASK_KEY, null)
  return injected || sharedChapterTaskCtx.value
}

/**
 * 在章节页初始化任务上下文：provide 给子组件，并设置 hover 阅读追踪与持久化
 */
export function setupChapterTask(opts: {
  content: Ref<Record<string, any> | null | undefined>
  chapterId: Ref<number | string>
  courseId: Ref<number | string>
  /** 章节标题（h1），作为第一个 heading 加入进度统计；id 取 chapterId */
  chapterTitle?: Ref<string>
  initialTaskStatus?: Record<string, boolean>
  initialIsPass?: boolean
}): ChapterTaskContext {
  const { notifyCourseNavUpdate } = useLayoutState()
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  // 引入 useUserCard：readingBlock 完成 heading 时调用 refresh() 触发 userCard 重新拉取积分
  const { refresh: refreshUserCard } = useUserCard()

  const taskMap = computed(() => {
    const map = extractChapterTasks(opts.content.value)
    // 将章节标题（h1）作为第一个 heading 加入任务列表，id 为 chapterId
    // 这样 TOC 进度汇总和 isPass 计算都会包含章节标题
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

  // ===== 顶层块布局：建立 blockKey → headingId 的映射 =====
  // 仅追踪需要 hover 阅读的块级内容（排除 heading 自身与 vue 互动节点）
  // vue 互动节点（question/homework/...）走 submit 上报路径，不计入阅读要求
  // 列表节点（bulletList/orderedList/taskList）按 listItem/taskItem 拆分，
  // 每个 <li> 单独作为一个可阅读块（逐行标黄），key 形如 "${topIndex}.${itemIndex}"
  // 空段落（无文字、仅有 hardBreak/空白）不纳入追踪，否则用户无法 hover 导致卡住
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
    const topBlocks = (opts.content.value?.content) || []
    // 章节标题 h1（合成）作为初始当前 heading，其下的顶层块归属它
    let curHeading = String(opts.chapterId.value)
    topBlocks.forEach((child: any, index: number) => {
      if (!child) return
      if (child.type === 'heading') {
        const id = child.attrs?.id || child.attrs?.['data-toc-id']
        if (id) curHeading = String(id)
        return
      }
      if (child.type === 'vue') return // 互动组件走 submit 路径
      if (isEmptyParagraph(child)) return // 空行不纳入 hover 追踪
      // 列表：每个 listItem/taskItem 单独作为一个可阅读块
      if (LIST_TYPES.has(child.type) && Array.isArray(child.content)) {
        child.content.forEach((_item: any, j: number) => {
          const key = `${index}.${j}`
          blockToHeading[key] = curHeading
          ;(byHeading[curHeading] ||= []).push(key)
        })
        return
      }
      // 其它块级内容（段落/图片/codeBlock/表格/callout 等）整体作为一个可阅读块
      const key = String(index)
      blockToHeading[key] = curHeading
      ;(byHeading[curHeading] ||= []).push(key)
    })
    return { byHeading, blockToHeading }
  })

  // hover 已读块集合（不持久化，刷新重置）
  const readBlocks = ref<Set<string>>(new Set())

  // 延迟完成的 heading 定时器（最后一个 block 标黄后 1s 再记录完成）
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

  // 反向索引：nodeKey → headingId，便于上报时定位所属 heading
  const nodeToHeading = computed<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const [hid, tasks] of Object.entries(taskMap.value.tasksByHeading)) {
      for (const t of tasks) m[t.key] = hid
    }
    return m
  })

  /** 检查 heading 是否满足完成条件（不实际标记，用于判断是否需要延迟） */
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
   * 重算某个 heading 的完成状态。
   * sticky：已完成的 heading 不再回退（避免刷新后未 hover 导致已完成任务回退）。
   * 完成条件：所有 submit 任务答对 AND 所有可阅读块已 hover。
   * @returns 是否刚把该 heading 置为完成
   */
  function recomputeHeading(headingId: string): boolean {
    if (taskStatus.value[headingId]) return false // sticky
    if (pendingCompletion.has(headingId)) return false // 正在延迟中，等待定时器触发
    const tasks = taskMap.value.tasksByHeading[headingId] || []
    const tasksDone = tasks.length === 0 || tasks.every(t => nodeStatus.value[t.key])
    if (!tasksDone) return false
    const blocks = blockLayout.value.byHeading[headingId] || []
    const blocksRead = blocks.length === 0 || blocks.every(idx => readBlocks.value.has(idx))
    if (!blocksRead) return false
    taskStatus.value = { ...taskStatus.value, [headingId]: true }
    return true
  }

  /** recomputeHeading 的包装：若状态翻转则重算 isPass 并安排持久化 */
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

  // ===== 持久化（防抖，仅客户端） =====
  let persistTimer: any = null
  let lastNotifiedPass = isPass.value

  function schedulePersist() {
    if (!import.meta.client) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(doPersist, 1500)
  }

  async function doPersist() {
    // 未登录时不记录学习进度
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
      // heading 完成：通知 userCard 重新拉取积分（章节分/经验/金币可能因完成而变化）
      refreshUserCard()
      // is_pass 变化时通知课程侧边栏刷新打钩
      if (isPass.value !== lastNotifiedPass) {
        lastNotifiedPass = isPass.value
        notifyCourseNavUpdate()
      }
    } catch {
      // 静默（网络错误）
    }
  }

  // ===== 上报接口 =====
  function reportNodeDone(type: string, cid: number, done: boolean) {
    const key = `${type}:${cid}`
    nodeStatus.value = { ...nodeStatus.value, [key]: done }
    const hid = nodeToHeading.value[key]
    if (hid) checkHeading(hid)
  }

  /** hover 停留 3s 后标记块已读 */
  function markBlockRead(key: string) {
    if (!user.value) return
    if (readBlocks.value.has(key)) return
    // 重新赋值以稳定触发响应式
    readBlocks.value = new Set([...readBlocks.value, key])
    const hid = blockLayout.value.blockToHeading[key]
    if (!hid) return

    // 最后一个 block 标黄后，延迟 1s 再记录完成（让用户看到黄色高亮 + toast 提示）
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
  // 同时通过模块级 ref 共享，供不在 provide 子树内的组件访问（如移动端 slideover 中的 TOC）
  sharedChapterTaskCtx.value = ctx

  // ===== 客户端：内容/布局变化时重算所有 heading =====
  if (import.meta.client) {
    // 内容加载后重算所有 heading 完成状态（sticky，已完成的不会回退）。
    // 覆盖时序问题：question 可能在 content 完全加载前就已答对上报，
    // 此时 nodeToHeading 尚未建立 → reportNodeDone 内的 checkHeading 未命中；
    // 此 watcher 在 taskMap 就绪后统一补救，让已答对的任务正确触发完成。
    // 同时覆盖空 heading（无任务且无可阅读块）自动完成的原始需求。
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
      // 清除延迟完成定时器，避免离开页面后触发 toast
      for (const timer of pendingCompletion.values()) clearTimeout(timer)
      pendingCompletion.clear()
      // 离开页面时立即持久化一次
      doPersist()
      // 清除模块级共享 ref，防止下一个页面读到旧的上下文
      sharedChapterTaskCtx.value = null
    })
  }

  return ctx
}
