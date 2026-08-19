import { ref, computed, watch } from 'vue'

type MyStats = {
    courseScore: number
    exp: number
    coin: number
    chapterScore: number | null
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
    const { myMedals, fetchMyMedals, checkMedals } = useMedals()

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

    async function fetchStats() {
        if (!courseId.value) {
            stats.value = { courseScore: 0, exp: 0, coin: 0, chapterScore: null }
            return
        }
        try {
            const data = await cRequest<MyStats>('/api/courses/me', {
                query: {
                    courseId: courseId.value,
                    chapterId: chapterId.value || undefined,
                },
            })
            stats.value = data
        } catch {
            // 静默忽略，保持旧值
        }
    }

    // 路由变化时（进入/切换课程/章节）重新拉取
    watch([courseId, chapterId], () => { fetchStats() }, { immediate: true })

    // 监听全局 trigger：答题 / 交作业 / 评论等加分操作后自动刷新 + 检查奖章
    const { refreshTrigger } = useUserCard()
    watch(refreshTrigger, () => {
        fetchStats()
        if (courseId.value) checkMedals(courseId.value)
    })

    // 进入课程时拉取已获奖章
    watch(courseId, () => { fetchMyMedals() }, { immediate: true })

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
        const base = Math.max(1, Number(levelStep.value) || 100) / 2
        const total = Math.max(0, exp.value)
        // 解 base*(l-1)*l = total → l = (1 + sqrt(1 + 4*total/base)) / 2
        const raw = (1 + Math.sqrt(1 + (4 * total) / base)) / 2
        const level = Math.max(1, Math.floor(raw))
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
