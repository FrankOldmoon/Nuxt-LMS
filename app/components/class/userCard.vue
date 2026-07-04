<template>
  <UCard v-if="user" :ui="{ body: 'p-3 sm:p-4', root: 'rounded-lg' }">
    <!-- 用户基本信息：头像 / 姓名 / 学号 -->
    <div class="flex items-center gap-3">
      <UAvatar
        :src="user.avatarImg || undefined"
        :alt="user.name"
        :text="user.name?.charAt(0)"
        size="xl"
      />
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-highlighted truncate">
          {{ user.preferName || user.name }}
        </div>
        <div v-if="user.rollNumber" class="text-xs text-muted truncate font-mono mt-0.5">
          {{ user.rollNumber }}
        </div>
      </div>
    </div>

    <!-- 等级 + 经验（仅在课程上下文中显示） -->
    <div v-if="hasCourse" class="mt-3 pt-3 border-t border-default">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-sparkles" class="size-3.5 text-primary" />
          <span class="text-xs font-semibold text-highlighted">Lv.{{ levelInfo.level }}</span>
        </div>
        <span class="text-xs text-muted font-mono">
          EXP {{ levelInfo.current }} / {{ levelInfo.next }}
        </span>
      </div>
      <div class="w-full h-1.5 bg-elevated rounded overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-500"
          :style="{ width: `${levelInfo.percent}%` }"
        />
      </div>
    </div>

    <!-- 积分信息 -->
    <div v-if="hasCourse" class="mt-3 pt-3 border-t border-default space-y-1.5 text-sm">
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-trophy" class="size-3.5" />
          {{ $t('userCard.courseScore') }}
        </span>
        <span class="font-mono font-medium text-highlighted">
          {{ courseScoreDisplay }}
        </span>
      </div>
      <div v-if="hasChapter" class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-book-open" class="size-3.5" />
          {{ $t('userCard.chapterScore') }}
        </span>
        <span class="font-mono font-medium text-highlighted">
          {{ chapterScoreDisplay }}
        </span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const { user } = useAuth()
const route = useRoute()

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
type MyStats = {
  courseScore: number
  exp: number
  chapterScore: number | null
  notifyUnread?: number
  msgUnread?: number
}
const stats = useState<MyStats>('user-card-stats', () => ({
  courseScore: 0,
  exp: 0,
  chapterScore: null,
}))

const { counts: unreadCounts } = useUnreadCounts()

async function fetchStats() {
  if (!courseId.value) {
    stats.value = { courseScore: 0, exp: 0, chapterScore: null }
    return
  }
  try {
    const data = await cRequest<MyStats>('/api/lms/courses/me', {
      query: {
        courseId: courseId.value,
        chapterId: chapterId.value || undefined,
      },
    })
    stats.value = data
    // 同步未读数到全局状态
    unreadCounts.value = {
      notifyUnread: data.notifyUnread ?? 0,
      msgUnread: data.msgUnread ?? 0,
    }
  } catch {
    // 静默忽略，保持旧值
  }
}

// 路由变化时（进入/切换课程/章节）重新拉取
watch([courseId, chapterId], () => { fetchStats() }, { immediate: true })

// 监听全局 trigger：答题 / 交作业 / 评论等加分操作后自动刷新
const { refreshTrigger } = useUserCard()
watch(refreshTrigger, () => { fetchStats() })

const courseScore = computed(() => stats.value.courseScore)
const exp = computed(() => stats.value.exp)
const chapterScore = computed(() => stats.value.chapterScore)

// 经验 → 等级换算
// 等级 n 的累计经验阈值 = 50 * (n-1) * n
// Lv.1: 0   Lv.2: 100   Lv.3: 300   Lv.4: 600   Lv.5: 1000 ...
const levelInfo = computed(() => {
  const total = Math.max(0, exp.value)
  // 解 50*(l-1)*l = total → l = (1 + sqrt(1 + 8*total/100)) / 2
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

// 积分显示（保留 1 位小数）
const courseScoreDisplay = computed(() => courseScore.value.toFixed(1))
const chapterScoreDisplay = computed(() =>
  chapterScore.value == null ? '—' : chapterScore.value.toFixed(1),
)

/** 主动刷新入口（暴露给父组件） */
async function refresh() {
  await fetchStats()
}
defineExpose({ refresh })
</script>
