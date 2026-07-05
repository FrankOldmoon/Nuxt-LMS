<template>
  <div v-if="course" class="flex flex-col gap-10">
    <!-- Hero 区域 -->
    <div class="relative rounded-2xl overflow-hidden">
      <!-- 背景图/色 -->
      <div class="h-64 sm:h-80">
        <img
          v-if="course.coverImg"
          :src="course.coverImg"
          :alt="course.title"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full"
          :class="colorHeroBgClass(course.color)"
        />
      </div>
      <!-- 渐变遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <!-- 内容叠加 -->
      <div class="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <div class="flex items-center gap-2 mb-2">
          <UBadge :label="course.level" :color="levelColor(course.level)" variant="subtle" size="sm" />
          <span class="text-sm text-white/80">{{ $t('course.chapters', { count: course.chapters.length }) }}</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold text-white mb-3">
          {{ course.title }}
        </h1>
        <!-- 标签 -->
        <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5 mb-4">
          <UBadge
            v-for="tag in course.tags"
            :key="tag"
            :label="tag"
            variant="subtle"
            size="sm"
            class="bg-white/20 text-white border-white/30"
          />
        </div>
        <!-- 教师 + 学生人数 -->
        <div class="flex items-center gap-4 text-white/90 text-sm">
          <div v-if="course.teachers?.length" class="flex items-center gap-2">
            <UIcon name="i-lucide-chalkboard-teacher" class="size-4" />
            <div class="flex -space-x-2">
              <img
                v-for="teacher in course.teachers.slice(0, 5)"
                :key="teacher.userId"
                :src="teacher.avatarImg || ''"
                :alt="teacher.name"
                class="size-7 rounded-full border-2 border-white/50 object-cover bg-elevated"
              />
              <div
                v-if="course.teachers.length > 5"
                class="size-7 rounded-full border-2 border-white/50 bg-white/30 flex items-center justify-center text-xs"
              >
                +{{ course.teachers.length - 5 }}
              </div>
            </div>
            <span>{{ course.teachers.map(t => t.name).join('、') }}</span>
          </div>
          <div v-if="course.studentCount > 0" class="flex items-center gap-1.5">
            <UIcon name="i-lucide-users" class="size-4" />
            <span>{{ course.studentCount }} {{ $t('course.students') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 课程内容 -->
    <div v-if="hasContent">
      <h2 class="text-2xl font-semibold text-highlighted mb-6">
        {{ $t('course.aboutCourse') }}
      </h2>
      <UeditorRender :json="course.content" />
    </div>

    <!-- 章节目录（仅一级） -->
    <div>
      <h2 id="chapters" class="text-2xl font-semibold text-highlighted mb-6 scroll-mt-20">
        {{ $t('course.chapterList') }}
      </h2>

      <div class="flex flex-col gap-2">
        <NuxtLink
          v-for="(item, index) in chapterTree"
          :key="item.id"
          :to="item.accessible === false ? undefined : item.to"
          class="group block"
          :class="item.accessible === false ? 'cursor-not-allowed opacity-60' : ''"
        >
          <UCard
            class="transition-all"
            :class="item.accessible === false ? '' : 'hover:ring-2 hover:ring-primary/30'"
            :ui="{ body: 'flex items-center gap-4' }"
          >
            <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
              {{ String(index + 1).padStart(2, '0') }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-medium text-highlighted flex items-center gap-2">
                <UIcon v-if="item.accessible === false" name="i-lucide-lock" class="size-4 text-muted" />
                {{ item.label }}
              </h3>
            </div>
            <UIcon v-if="item.accessible !== false" name="i-lucide-arrow-right" class="size-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </UCard>
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- 课程不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('course.notFound') }}</p>
    <UButton to="/" :label="$t('course.backToHome')" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const { setEditableContent, setEditableMeta, contentVersion, courseBtnsConfig, chapterBtnsConfig } = useLayoutState()

const { data: resp, pending, refresh } = cRequest.use<import('#shared/types/lms').LmsCourseDetail | null>(
  () => `/api/lms/courses/show?id=${courseId.value}`,
  { default: () => null },
)

const course = computed(() => resp.value as import('#shared/types/lms').LmsCourseDetail | null)

const hasContent = computed(() => {
  if (!course.value?.content) return false
  return Object.keys(course.value.content).length > 0
})

// 构建章节树：优先使用 orders，否则用 chapters 默认顺序
interface ChapterNode {
  id: number | string
  label: string
  to?: string
  accessible: boolean
  children?: ChapterNode[]
}

const chapterTree = computed<ChapterNode[]>(() => {
  if (!course.value) return []
  const chapters = course.value.chapters || []
  const orders = course.value.orders || []
  const cid = course.value.id
  const accessMap = new Map(chapters.map(ch => [ch.id, ch.accessible]))

  // 从 orders 构建树（仅取一级节点）
  if (orders.length > 0) {
    const sorted = [...orders].sort((a, b) => a.order - b.order)
    const rootItems = sorted.filter(o => !o.parentId)
    return rootItems.map(o => {
      const isChapter = o.id && !o.id.startsWith('custom-') && !isNaN(Number(o.id))
      const accessible = isChapter ? (accessMap.get(Number(o.id)) ?? true) : true
      return {
        id: isChapter ? Number(o.id) : o.id,
        label: o.label,
        to: isChapter ? `/course/${cid}/${o.id}` : (o.id === 'course' ? `/course/${cid}` : `/course/${cid}#${o.label}`),
        accessible,
      }
    })
  }

  // 默认：用 chapters（无层级）
  return chapters.map(ch => ({
    id: ch.id,
    label: ch.title,
    to: `/course/${cid}/${ch.id}`,
    accessible: ch.accessible ?? true,
  }))
})

// 数据变化时设置 TOC + 可编辑内容
watch(resp, (detail) => {
  if (!detail) return
  const content = detail?.content
  setEditableContent(content ?? null)
  if (detail?.id) setEditableMeta('courses', detail.id, detail.id)
  const lmsCfg = (detail as any)?.config?.lmsConfig || {}
  courseBtnsConfig.value = { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, ...(lmsCfg.courseBtns || {}) }
  chapterBtnsConfig.value = { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true, ...(lmsCfg.chapterBtns || {}) }
}, { immediate: true })

// 监听内容版本号，保存成功后重新获取数据
watch(contentVersion, () => refresh(), { flush: 'sync' })
</script>
