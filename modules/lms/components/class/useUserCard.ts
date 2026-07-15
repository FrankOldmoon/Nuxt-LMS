import { ref, computed, watch } from 'vue'

type MyStats = {
    courseScore: number
    exp: number
    coin: number
    chapterScore: number | null
}

/**
 * Composable logic for class/userCard.vue.
 *
 * Note: function named useUserCardSetup (not useUserCard) to avoid
 * same-name recursive call with composables/useUserCard.ts's globally auto-imported useUserCard().
 * Nuxt auto-import works in .ts: internal calls to useUserCard() resolve to the global composable.
 */
export function useUserCardSetup() {
    const { user } = useAuth()
    const route = useRoute()
    const { myMedals, fetchMyMedals, checkMedals } = useMedals()

    // Course/chapter ID in route
    const courseId = computed(() => Number(route.params.id) || 0)
    const chapterId = computed(() => Number(route.params.cid) || 0)

    const hasCourse = computed(() => courseId.value > 0)
    const hasChapter = computed(() => chapterId.value > 0)

    /**
     * Single data source (useState global state)
     *
     * Does not use cRequest.use (useFetch path) because it would hit nuxtApp.payload.data cache,
     * causing refresh() to actually get stale SSR data, unable to update in real-time after answering questions/submitting homework.
     * Here we use imperative cRequest + write to useState, every time is a real request.
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
            // Silently ignored, keep old value
        }
    }

    // Refetch on route change (entering/switching course/chapter)
    watch([courseId, chapterId], () => { fetchStats() }, { immediate: true })

    // Listen to global trigger: auto refresh + check medals after scoring actions like answering questions / submitting homework / commenting
    const { refreshTrigger } = useUserCard()
    watch(refreshTrigger, () => {
        fetchStats()
        if (courseId.value) checkMedals(courseId.value)
    })

    // Fetch earned medals on entering course
    watch(courseId, () => { fetchMyMedals() }, { immediate: true })

    // Medal icon color mapping
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

    // Experience → level conversion
    // Cumulative experience threshold for level n = 50 * (n-1) * n
    // Lv.1: 0   Lv.2: 100   Lv.3: 300   Lv.4: 600   Lv.5: 1000 ...
    const levelInfo = computed(() => {
        const total = Math.max(0, exp.value)
        // Solve 50*(l-1)*l = total → l = (1 + sqrt(1 + 8*total/100)) / 2
        const raw = (1 + Math.sqrt(1 + (8 * total) / 100)) / 2
        const level = Math.max(1, Math.floor(raw))
        const currentThreshold = 50 * (level - 1) * level
        const nextThreshold = 50 * level * (level + 1)
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

    // Score display (keep 1 decimal place)
    const courseScoreDisplay = computed(() => courseScore.value.toFixed(1))
    const coinDisplay = computed(() => String(coin.value))
    const chapterScoreDisplay = computed(() =>
        chapterScore.value == null ? '—' : chapterScore.value.toFixed(1),
    )

    /** Active refresh entry (exposed to parent component) */
    async function refresh() {
        await fetchStats()
    }

    return {
        user, myMedals, medalIconColor, hasCourse, levelInfo, hasChapter,
        courseScoreDisplay, coinDisplay, chapterScoreDisplay, refresh,
    }
}
