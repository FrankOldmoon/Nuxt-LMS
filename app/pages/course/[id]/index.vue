<template>
  <div v-if="course" class="flex flex-col gap-10">
    <!-- 课程头部：左图 + 右信息 -->
    <div class="flex flex-col sm:flex-row gap-6 relative">
      <!-- 右上角编辑按钮 -->
      <div v-if="canEdit" class="absolute top-0 right-0 z-10">
        <CourseEditor :course-id="Number(courseId)" @saved="refresh" />
      </div>

      <!-- 左侧：课程封面 -->
      <div class="w-full sm:w-80 shrink-0">
        <div class="aspect-16/10 rounded-2xl overflow-hidden bg-elevated">
          <img
            v-if="course.coverImg"
            :src="course.coverImg"
            :alt="course.title"
            class="w-full h-full object-cover"
          />
          <img
            v-else
            :src="`https://picsum.photos/seed/course${course.id}/640/400`"
            :alt="course.title"
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      <!-- 右侧：课程信息 -->
      <div class="flex-1 min-w-0 flex flex-col gap-4">
        <!-- 标题行 -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <UBadge :label="course.level" :color="levelColor(course.level)" variant="subtle" size="sm" />
            <span class="text-sm text-muted">{{ $t('course.chapters', { count: course.chapters.length }) }}</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-highlighted">
            {{ course.title }}
          </h1>
        </div>

        <!-- 标签 -->
        <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="tag in course.tags"
            :key="tag"
            :label="tag"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>

        <!-- 学习进度 -->
        <div v-if="progressPercent !== null" class="flex items-center gap-3">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-muted">{{ $t('coursePanel.progress') }}</span>
              <span class="text-sm font-semibold text-primary">{{ progressPercent }}%</span>
            </div>
            <div class="w-full h-2.5 bg-elevated rounded-full overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all duration-500"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>
        </div>

        <!-- 教师 + 学生人数 -->
        <div class="flex items-center gap-4 text-sm text-muted">
          <div v-if="course.teachers?.length" class="flex items-center gap-2">
            <UIcon name="i-lucide-chalkboard-teacher" class="size-4" />
            <div class="flex -space-x-2">
              <img
                v-for="teacher in course.teachers.slice(0, 5)"
                :key="teacher.userId"
                :src="teacher.avatarImg || ''"
                :alt="teacher.name"
                class="size-6 rounded-full border-2 border-default object-cover bg-elevated"
              />
              <div
                v-if="course.teachers.length > 5"
                class="size-6 rounded-full border-2 border-default bg-elevated flex items-center justify-center text-xs text-muted"
              >
                +{{ course.teachers.length - 5 }}
              </div>
            </div>
            <span>{{ course.teachers.map(t => t.name).join('、') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
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

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <NuxtLink
          v-for="(item, index) in chapterTree"
          :key="item.id"
          :to="item.accessible === false ? undefined : item.to"
          class="group block"
          :class="item.accessible === false ? 'cursor-not-allowed opacity-60' : ''"
        >
          <UCard
            class="transition-all h-full"
            :class="item.accessible === false ? '' : 'hover:ring-2 hover:ring-primary/30'"
            :ui="{ body: 'flex items-center gap-4' }"
          >
            <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
              {{ String(index + 1).padStart(2, '0') }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-medium text-highlighted flex items-center gap-2">
                <UIcon v-if="item.accessible === false" name="i-lucide-lock" class="size-4 text-muted" />
                <UIcon v-if="item.isPass" name="i-lucide-circle-check" class="size-4 text-success" />
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
const { hasRole, isCourseTeacher } = useAuth()

const { data: resp, pending, refresh } = cRequest.use<import('#shared/types/lms').LmsCourseDetail | null>(
  () => `/api/lms/courses/show?id=${courseId.value}`,
  { default: () => null },
)

const course = computed(() => resp.value as import('#shared/types/lms').LmsCourseDetail | null)

const canEdit = computed(() => {
  if (!courseId.value) return false
  return hasRole('admin') || isCourseTeacher(Number(courseId.value))
})

const hasContent = computed(() => {
  if (!course.value?.content) return false
  return Object.keys(course.value.content).length > 0
})

// 学习进度：已通过章节数 / 总章节数
const progressPercent = computed(() => {
  if (!course.value?.chapters?.length) return null
  const total = course.value.chapters.length
  const passed = course.value.chapters.filter(ch => ch.isPass).length
  return Math.round((passed / total) * 100)
})

// 构建章节树：优先使用 orders，否则用 chapters 默认顺序
interface ChapterNode {
  id: number | string
  label: string
  to?: string
  accessible: boolean
  isOpen?: boolean
  isPass?: boolean
  children?: ChapterNode[]
}

const chapterTree = computed<ChapterNode[]>(() => {
  if (!course.value) return []
  const chapters = course.value.chapters || []
  const orders = course.value.orders || []
  const cid = course.value.id
  const chapterMap = new Map(chapters.map(ch => [ch.id, ch]))

  // 从 orders 构建树（仅取一级节点）
  if (orders.length > 0) {
    const sorted = [...orders].sort((a, b) => a.order - b.order)
    const rootItems = sorted.filter(o => !o.parentId)
    return rootItems.map(o => {
      const isChapter = o.id && !o.id.startsWith('custom-') && !isNaN(Number(o.id))
      const ch = isChapter ? chapterMap.get(Number(o.id)) : undefined
      return {
        id: isChapter ? Number(o.id) : o.id,
        label: o.label,
        to: isChapter ? `/course/${cid}/${o.id}` : (o.id === 'course' ? `/course/${cid}` : `/course/${cid}#${o.label}`),
        accessible: ch?.accessible ?? true,
        isOpen: ch?.isOpen,
        isPass: ch?.isPass,
      }
    })
  }

  // 默认：用 chapters（无层级）
  return chapters.map(ch => ({
    id: ch.id,
    label: ch.title,
    to: `/course/${cid}/${ch.id}`,
    accessible: ch.accessible ?? true,
    isOpen: ch.isOpen,
    isPass: ch.isPass,
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
