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
  /** hover 章节标题（一级标题）即完成该标题 */
  completeChapterHeading: () => void
  /**
   * 用 /api/courses/me 返回的服务端最新章节进度填充本地状态（sticky 合并）。
   * 进度数据源已统一为 me（show 允许缓存旧值），me 每次实时拉取。
   */
  applyServerTaskStatus: (status: Record<string, boolean> | null | undefined, isPass?: boolean) => void
  /** 切换章节时重置本地进度（旧章节已由 flushPersist 落库），等 me 填充 */
  resetProgress: () => void
  /** 立即持久化当前章节任务状态（切章节/离开前调用，防止防抖定时器在切换后误存） */
  flushPersist: () => Promise<void>
}

const CHAPTER_TASK_KEY = 'chapter-task-context'

// shared ctx 版本号：页面 remount 时序是「新 ctx 先 set → 旧 ctx 后 unmount」，
// 若 unmount 无条件置 null 会把新 ctx 抹掉；仅当自己仍是最新版本时才清除
let ctxVersion = 0

/**
 * 模块级共享 ref：允许不在 provide/inject 子树内的组件访问当前章节任务上下文。
 * 典型场景：移动端 TOC 在 USlideover（layout 层，是页面的父组件）中渲染，
 * 无法通过 inject 获取页面内 setupChapterTask 提供的上下文。
 * setupChapterTask 设置此 ref，onBeforeUnmount 清除（版本守卫）。
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
  // 引入 useUserCard：heading 完成时刷新积分显示（仅刷新，不做奖章检查）
  const { refreshStatsOnly: refreshUserCardStats } = useUserCard()
  // 章节首次通过时显式检查奖章授予
  const { checkMedals } = useMedals()

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
  // 阅读追踪范围与渲染端 node.vue 的 ReadingBlock 保持一致：
  //   仅 codeBlock / blockquote 参与 hover 追踪；
  //   其余块级内容（段落/图片/列表/表格/callout 等）直接渲染、不监控，
  //   也不计入 heading 完成条件——否则这些无法被标记已读的块会卡住 heading 无法完成。
  const blockLayout = computed(() => {
    const byHeading: Record<string, string[]> = {}
    const blockToHeading: Record<string, string> = {}
    // 必须用 Array.isArray 校验：|| 会被 truthy 非数组值（如 {}、字符串）绕过，
    // 导致 topBlocks.forEach 抛 TypeError。兼容 content=null/content.content={} 的脏数据。
    const topBlocks: any[] = Array.isArray(opts.content.value?.content)
      ? opts.content.value.content
      : []
    // 预先扫描：每个带 id 的顶层 heading，其之后（直到下一个 heading）的内容情况
    // - hasTracked：是否有 codeBlock/blockquote（这类块需 hover 3s 才能读完）
    // - hasAny：是否还有任何内容块（含段落 / 互动 vue / 代码块 / 引用等）
    const belowInfo = new Map<number, { hasTracked: boolean, hasAny: boolean }>()
    let lastHIndex = -1
    for (let i = 0; i < topBlocks.length; i++) {
      const c = topBlocks[i]
      if (!c) continue
      if (c.type === 'heading') {
        const id = c.attrs?.id || c.attrs?.['data-toc-id']
        lastHIndex = id ? i : lastHIndex
      } else if (lastHIndex >= 0) {
        const info = belowInfo.get(lastHIndex) || { hasTracked: false, hasAny: false }
        info.hasAny = true
        if (c.type === 'codeBlock' || c.type === 'blockquote') info.hasTracked = true
        belowInfo.set(lastHIndex, info)
      }
    }
    // 章节标题 h1（合成）作为初始当前 heading，其下的顶层块归属它
    let curHeading = String(opts.chapterId.value)
    topBlocks.forEach((child: any, index: number) => {
      if (!child) return
      if (child.type === 'heading') {
        const id = child.attrs?.id || child.attrs?.['data-toc-id']
        if (id) curHeading = String(id)
        const info = belowInfo.get(index)
        // 标题下无受监控阅读块但仍存在其他内容（段落/互动 vue 等）：
        //   标题自身作为可阅读块，hover 标题即完成
        // 标题下完全无任何内容：不作为可阅读块 → 空标题进章节自动完成
        if (id && info && info.hasTracked === false && info.hasAny === true) {
          const key = String(index)
          blockToHeading[key] = curHeading
          ;(byHeading[curHeading] ||= []).push(key)
        }
        return
      }
      if (child.type === 'vue') return // 互动组件走 submit 路径
      // 仅 codeBlock / blockquote 作为可阅读块
      if (child.type !== 'codeBlock' && child.type !== 'blockquote') return
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

  // ===== 服务端进度同步门控 =====
  // resetProgress / 首次挂载后需等 /api/courses/me 填充服务端进度，
  // 才允许 watcher 自动完成空 heading —— 否则重访已完成章节时会
  // 触发多余的 task-status POST + me 请求。
  // 3s 兜底：me 请求失败/超时后放行，保证离线/异常时进度追踪仍可用。
  const serverSynced = ref(!!opts.initialTaskStatus)
  let syncFallbackTimer: any = null
  function armSyncFallback() {
    if (!import.meta.client) return
    if (syncFallbackTimer) clearTimeout(syncFallbackTimer)
    syncFallbackTimer = setTimeout(() => { serverSynced.value = true }, 3000)
  }
  function markServerSynced() {
    serverSynced.value = true
    if (syncFallbackTimer) {
      clearTimeout(syncFallbackTimer)
      syncFallbackTimer = null
    }
  }
  if (!serverSynced.value) armSyncFallback()

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

  /**
   * hover 章节标题（一级标题）即完成该标题。
   * 与"自动完成"并存：sticky，一旦完成不再回退。
   */
  function completeChapterHeading() {
    const hid = String(opts.chapterId.value)
    if (taskStatus.value[hid]) return
    taskStatus.value = { ...taskStatus.value, [hid]: true }
    recomputePass()
    schedulePersist()
  }

  /**
   * 用 me 返回的服务端最新章节进度填充本地状态（sticky 合并，只补 true 不回退）。
   * 附带反推 nodeStatus，避免后续 recompute 丢失已完成任务。
   */
  function applyServerTaskStatus(status: Record<string, boolean> | null | undefined, serverIsPass?: boolean) {
    if (!status || typeof status !== 'object') return
    const merged = { ...taskStatus.value }
    for (const [k, v] of Object.entries(status)) {
      if (v === true) merged[k] = true
    }
    taskStatus.value = merged
    if (serverIsPass && !isPass.value) isPass.value = true
    // 服务端状态已同步：同步通知水位，避免下次 persist 重复 notify/checkMedals
    lastNotifiedPass = isPass.value
    // 用已完成的 heading 反推 node 级状态，避免后续 recompute 丢失已完成任务
    const map = taskMap.value
    const ns: Record<string, boolean> = {}
    for (const h of map.headings) {
      if (merged[h.id]) {
        for (const t of (map.tasksByHeading[h.id] || [])) ns[t.key] = true
      }
    }
    nodeStatus.value = ns
    markServerSynced()
  }

  /** 切换章节时重置本地进度（旧章节已由 flushPersist 落库），等 me 填充 */
  function resetProgress() {
    taskStatus.value = {}
    nodeStatus.value = {}
    isPass.value = false
    // 旧章节的 hover 已读块对 新章节内容索引无意义，一并清空
    readBlocks.value = new Set()
    // 旧章节延迟完成的定时器不再有意义，清掉避免切换后误弹 toast / 误标记
    for (const timer of pendingCompletion.values()) clearTimeout(timer)
    pendingCompletion.clear()
    // 等待新章节的 me 填充后才允许自动完成（配合 3s 兜底）
    serverSynced.value = false
    armSyncFallback()
  }

  // ===== 持久化（防抖，仅客户端） =====
  let persistTimer: any = null
  let lastNotifiedPass = isPass.value
  // 记录触发持久化时的章节 id：防抖定时器可能在章节切换后才触发，
  // 若实时读取 opts.chapterId.value，会把旧章节的完成状态误存到新章节
  let persistChapterId = 0
  // 自上次成功落库后是否有变更：无变更时 flushPersist 跳过 POST（切章节/离开页面不再发空请求）
  let dirty = false

  function schedulePersist() {
    if (!import.meta.client) return
    persistChapterId = Number(opts.chapterId.value)
    dirty = true
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(doPersist, 1500)
  }

  async function doPersist(persistOpts: { silent?: boolean } = {}) {
    // 定时器已触发本函数：清掉句柄，避免 flushPersist 误判有挂起定时器而重复 POST
    persistTimer = null
    // 未登录时不记录学习进度
    if (!user.value) return

    const chId = persistChapterId
    if (!chId) return
    try {
      const res = await cRequest<{ isPass: boolean; newMedals: number[]; gainedExp: number; gainedCoin: number; gainedScore: number }>('/api/chapters/task-status', {
        method: 'POST',
        body: {
          chapter_id: chId,
          task_status: taskStatus.value,
          is_pass: isPass.value,
        },
      })
      dirty = false

      const passChanged = isPass.value !== lastNotifiedPass
      if (passChanged) {
        lastNotifiedPass = isPass.value
        // is_pass 变化时通知课程侧边栏刷新打钩；章节首次通过时检查奖章授予
        notifyCourseNavUpdate()
        if (isPass.value && Number(opts.courseId.value)) {
          await checkMedals(Number(opts.courseId.value))
        }
      }
      // heading 完成：刷新积分显示（章节分/经验/金币可能因完成而变化）。
      // 仅在服务端实际发放了奖励/奖章或通关状态变化时才刷新；
      // silent（章节切换 flush）：由 [cid].vue 切换流程在 flush 结束后统一拉一次 me，
      // 此处不重复触发，保证每次切换只有一次 me 请求。
      const gained = res?.gainedExp || res?.gainedCoin || res?.gainedScore || res?.newMedals?.length || passChanged
      if (!persistOpts.silent && gained) {
        refreshUserCardStats()
      }
    } catch {
      // 静默（网络错误）：保持 dirty，下次 flush 重试
    }
  }

  /**
   * 立即持久化（切章节前调用）。
   * 调用时机：taskStatus 仍为旧章节状态、persistChapterId 仍为旧章节 id 时。
   * 无未落库变更时跳过 POST；落库成功后由调用方（[cid].vue）拉一次 me 刷新展示。
   */
  async function flushPersist() {
    if (!import.meta.client) return
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
      // 挂起的防抖定时器代表未落库的变更
      dirty = true
    }
    if (!dirty) return
    await doPersist({ silent: true })
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
    completeChapterHeading,
    applyServerTaskStatus,
    resetProgress,
    flushPersist,
  }

  provide(CHAPTER_TASK_KEY, ctx)
  // 同时通过模块级 ref 共享，供不在 provide 子树内的组件访问（如移动端 slideover 中的 TOC）
  const myVersion = ++ctxVersion
  sharedChapterTaskCtx.value = ctx

  // ===== 客户端：内容/布局变化时重算所有 heading =====
  if (import.meta.client) {
    // 内容加载后重算所有 heading 完成状态（sticky，已完成的不会回退）。
    // 覆盖时序问题：question 可能在 content 完全加载前就已答对上报，
    // 此时 nodeToHeading 尚未建立 → reportNodeDone 内的 checkHeading 未命中；
    // 此 watcher 在 taskMap 就绪后统一补救，让已答对的任务正确触发完成。
    // 同时覆盖空 heading（无任务且无可阅读块）自动完成的原始需求。
    // 门控 serverSynced：等 /api/courses/me 填充服务端进度后才自动完成，
    // 避免重访已完成章节时立即触发多余的 task-status POST（3s 兜底放行）。
    watch(
      [taskMap, blockLayout, serverSynced],
      () => {
        if (!user.value || !serverSynced.value) return
        for (const h of taskMap.value.headings) {
          checkHeading(h.id)
        }
      },
      { flush: 'post', immediate: true },
    )

    onBeforeUnmount(() => {
      // 清除延迟完成定时器，避免离开页面后触发 toast
      for (const timer of pendingCompletion.values()) clearTimeout(timer)
      pendingCompletion.clear()
      // 清除 me 兜底定时器
      if (syncFallbackTimer) {
        clearTimeout(syncFallbackTimer)
        syncFallbackTimer = null
      }
      // 离开页面时立即持久化一次（使用快照的章节 id，避免误存到其它章节）
      flushPersist()
      // 清除模块级共享 ref：仅当自己仍是最新版本时才清除
      // （页面 remount 时新 ctx 已先行 set，无条件清空会误杀新 ctx）
      if (ctxVersion === myVersion) {
        sharedChapterTaskCtx.value = null
      }
    })
  }

  return ctx
}
