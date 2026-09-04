import { ref, computed, watch } from 'vue'

type MyStats = {
    courseScore: number
    exp: number
    coin: number
    chapterScore: number | null
    medals?: MyMedal[]
    chapterTaskStatus?: Record<string, boolean> | null
    chapterIsPass?: boolean
}

/**
 * class/userCard.vue 的组合式逻辑。
 *
 * 注意：函数命名为 useUserCardSetup（而非 useUserCard），避免与
 * composables/useUserCard.ts 的全局自动导入 useUserCard() 产生同名递归调用。
 * Nuxt 自动导入在 .ts 中生效：内部调用 useUserCard() 解析为全局 composable。
 */
export function useUserCardSetup() {
    const { user } = useAuth()
    const route = useRoute()
    const { myMedals, checkMedals } = useMedals()

    // 路由中的课程/章节 ID
    const courseId = computed(() => Number(route.params.id) || 0)
    const chapterId = computed(() => Number(route.params.cid) || 0)

    const hasCourse = computed(() => courseId.value > 0)
    const hasChapter = computed(() => chapterId.value > 0)

    /**
     * 单一数据源（useState 全局状态）
     *
     * 不使用 cRequest.use（useFetch 路径），因为它会命中 nuxtApp.payload.data 缓存，
     * 导致 refresh() 实际拿到 SSR 时的旧数据，做题/交作业后无法实时更新。
     * 这里改用命令式 cRequest + 写入 useState，每次都是真实请求。
     */
    const stats = useState<MyStats>('user-card-stats', () => ({
        courseScore: 0,
        exp: 0,
        coin: 0,
        chapterScore: null,
    }))

    // fetchStats 的乱序保护 + 并发去重
    let fetchSeq = 0
    let inFlightKey = ''

    // me 返回的最新章节进度写入全局状态（useState 走 Nuxt 运行时，跨组件可靠），
    // 由章节页 [cid].vue watch 后应用到自己的 chapterTaskCtx（TOC progress 数据源）。
    // 不再直接调 useChapterTask 的模块级 shared ctx：路由切换页面 remount 时，
    // 「新页面 setup 设置 → 旧页面 unmount」的时序会让该 ref 不可靠。
    const serverProgress = useState<{ chapterId: number, taskStatus: Record<string, boolean>, isPass: boolean } | null>(
        'server-chapter-progress', () => null)

    async function fetchStats() {
        if (!courseId.value) {
            stats.value = { courseScore: 0, exp: 0, coin: 0, chapterScore: null }
            return
        }
        // 章节竞态防护：记录请求时的章节 id，响应到达时若已切换章节则丢弃
        const reqChapterId = chapterId.value
        // 并发去重：同课程同章节的并发请求只发一次
        const flightKey = `${courseId.value}:${reqChapterId}`
        if (inFlightKey === flightKey) return
        // 乱序保护：仅接受最新一次请求的响应（慢的旧响应到达时已被更新请求取代，直接丢弃），
        // 否则切换章节时多个 me 并发，慢的旧响应最后落地会把 userCard 覆盖回旧数据
        const seq = ++fetchSeq
        inFlightKey = flightKey
        try {
            const data = await cRequest<MyStats>('/api/courses/me', {
                query: {
                    courseId: courseId.value,
                    chapterId: reqChapterId || undefined,
                },
            })
            if (seq !== fetchSeq || chapterId.value !== reqChapterId) return // 已被更新请求取代 / 已切换章节
            stats.value = data
            // me 已附带已获奖章，直接更新显示（章节页不再单独请求 /api/medals/my）
            if (Array.isArray(data?.medals)) {
                myMedals.value = data.medals
            }
            // 把 me 拉到的最新章节任务进度写入全局状态（TOC progress 数据源），
            // 由章节页 [cid].vue watch 后应用到自己的 chapterTaskCtx。
            // 进度数据源统一为 me（实时请求）；/api/chapters/show 允许缓存旧值，不再使用其 taskStatus。
            syncServerTaskStatus(data)
        } catch {
            // 静默忽略，保持旧值
        } finally {
            if (inFlightKey === flightKey) inFlightKey = ''
        }
    }

    // 将 me 返回的最新章节进度写入全局状态，[cid].vue watch 后应用到 chapterTaskCtx
    function syncServerTaskStatus(data: MyStats | undefined) {
        const taskStatus = data?.chapterTaskStatus
        if (!taskStatus || typeof taskStatus !== 'object') return
        if (chapterId.value <= 0) return
        serverProgress.value = { chapterId: chapterId.value, taskStatus, isPass: !!data?.chapterIsPass }
    }

    // 路由课程变化（进入课程/首次挂载）时拉取；
    // 章节切换由 [cid].vue 的切换流程统一触发（flush 旧章节后拉一次 me），此处不监听 chapterId
    watch(courseId, () => { fetchStats() }, { immediate: true })

    // 监听全局 trigger：
    // - refresh()：答题/交作业/评论等提交操作后 → 刷新积分 + 检查奖章授予
    // - refreshStatsOnly()：章节切换流程（flush 旧章节后）/保存进度 → 仅刷新积分/奖章
    const { refreshTrigger, statsOnlyTrigger } = useUserCard()
    watch(refreshTrigger, () => {
        fetchStats()
        if (courseId.value) checkMedals(courseId.value)
    })
    watch(statsOnlyTrigger, () => { fetchStats() })

    // 已获奖章由 me 响应附带更新（fetchStats 内），不再单独请求 /api/medals/my

    // 奖章图标颜色映射
    function medalIconColor(color: any) {
        const map: Record<string, string> = {
            bronze: 'text-amber-700',
            silver: 'text-gray-400',
            gold: 'text-amber-400',
            diamond: 'text-cyan-400',
            primary: 'text-primary',
            success: 'text-success',
            warning: 'text-warning',
            error: 'text-error',
            info: 'text-info',
        }
        return map[color] || 'text-primary'
    }

    const courseScore = computed(() => stats.value.courseScore)
    const exp = computed(() => stats.value.exp)
    const coin = computed(() => stats.value.coin)
    const chapterScore = computed(() => stats.value.chapterScore)

    // 经验 → 等级换算（不存库，按 exp 动态计算）
    // 曲线系数 base = levelStep / 2：等级 n 的累计经验阈值 = base * (n-1) * n
    // Lv.1: 0   Lv.2: 100   Lv.3: 300   Lv.4: 600   Lv.5: 1000 ...（levelStep 默认 100）
    // levelStep 越大升级越慢，由配置 general.levelStep 驱动（lms-public 公开配置）
    const levelInfo = computed(() => {
        const { levelStep } = useLmsPublicConfig()
        const total = Math.max(0, exp.value)
        const level = expToLevel(total, Number(levelStep.value) || 100)
        const base = Math.max(1, Number(levelStep.value) || 100) / 2
        const currentThreshold = base * (level - 1) * level
        const nextThreshold = base * level * (level + 1)
        const span = nextThreshold - currentThreshold
        const into = total - currentThreshold
        const percent = span > 0 ? Math.min(100, Math.max(0, (into / span) * 100)) : 100
        return {
            level,
            current: total,
            next: nextThreshold,
            percent: Math.round(percent),
        }
    })

    // 积分显示（保留 1 位小数）
    const courseScoreDisplay = computed(() => courseScore.value.toFixed(1))
    const coinDisplay = computed(() => String(coin.value))
    const chapterScoreDisplay = computed(() =>
        chapterScore.value == null ? '—' : chapterScore.value.toFixed(1),
    )

    /** 主动刷新入口（暴露给父组件） */
    async function refresh() {
        await fetchStats()
    }

    return {
        user, myMedals, medalIconColor, hasCourse, levelInfo, hasChapter,
        courseScoreDisplay, coinDisplay, chapterScoreDisplay, refresh,
    }
}
