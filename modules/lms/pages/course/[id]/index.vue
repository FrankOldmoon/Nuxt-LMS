<template>
  <CourseView
    :course="course"
    :pending="pending"
    :can-edit="canEdit"
    :has-content="hasContent"
    :chapter-tree="chapterTree"
    :first-chapter-url="firstChapterUrl"
    :exporting="exporting"
    :can-manage-teachers="canManageTeachers"
    :course-id="courseId"
    @saved="handleSaved"
    @export="exportCourse"
  >
    <!-- lms 扩展：学习进度条 -->
    <template #header-extra="{ course }">
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
    </template>

    <!-- lms 扩展：学生人数 -->
    <template #teachers-extra="{ course }">
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-users" class="size-4" />
        <span>{{ course.studentCount }} {{ $t('course.students') }}</span>
      </div>
    </template>

    <!-- lms 扩展：章节卡片含锁/通过图标 + 不可访问禁用 -->
    <template #chapter-item="{ item, index }">
      <NuxtLink
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
    </template>
  </CourseView>
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const apiUrl = computed(() => `/api/courses/show?id=${courseId.value}`)
const { courseBtnsConfig, chapterBtnsConfig } = useLayoutState()

// lms 公开配置：全局 courseBtns / chapterBtns 开关
// 用于在所有课程上统一关闭某些功能（如管理员禁用"得分"按钮）
const { courseBtns: courseBtnsPublic, chapterBtns: chapterBtnsPublic } = useLmsPublicConfig()

const { resp, pending, course, canEdit, hasContent, chapterTree: baseChapterTree,
        exporting, exportCourse, handleSaved, canManageTeachers } =
  useCourseDetailPage(courseId, apiUrl)

// lms 扩展：chapterTree 加 accessible / isOpen / isPass 字段
const chapterTree = computed(() => {
  const chapters = course.value?.chapters || []
  const chapterMap = new Map(chapters.map(ch => [ch.id, ch]))
  return baseChapterTree.value.map(item => {
    const ch = chapterMap.get(Number(item.id))
    return { ...item, accessible: ch?.accessible ?? true, isOpen: ch?.isOpen, isPass: ch?.isPass }
  })
})

// lms 扩展：firstChapterUrl 排除不可访问的章节
const firstChapterUrl = computed(() => {
  const first = chapterTree.value.find(ch => ch.accessible !== false && ch.to && !ch.to.includes('#'))
  return first?.to
})

// lms 扩展：学习进度（已通过章节数 / 总章节数）
const progressPercent = computed(() => {
  if (!course.value?.chapters?.length) return null
  const total = course.value.chapters.length
  const passed = course.value.chapters.filter(ch => ch.isPass).length
  return Math.round((passed / total) * 100)
})

// lms 扩展：数据变化时设置章节/课程按钮开关配置
// 优先级：course.config.lmsConfig.{chapterBtns|courseBtns} > 全局 lms_config > 硬编码默认
watch(resp, (detail) => {
  if (!detail) return
  const lmsCfg = (detail as any)?.config?.lmsConfig || {}
  courseBtnsConfig.value = {
    showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, showWrongBook: true,
    ...(courseBtnsPublic.value || {}),
    ...(lmsCfg.courseBtns || {}),
  }
  chapterBtnsConfig.value = {
    showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true,
    ...(chapterBtnsPublic.value || {}),
    ...(lmsCfg.chapterBtns || {}),
  }
}, { immediate: true })
</script>
