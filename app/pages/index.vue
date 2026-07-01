<template>
  <div class="max-w-none">
    <!-- 页面标题 -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-highlighted mb-3">
        {{ $t('home.title') }}
      </h1>
      <p class="text-lg text-muted">
        {{ $t('home.subtitle') }}
      </p>
    </div>

    <!-- 按系列分组展示课程 -->
    <div class="flex flex-col gap-16">
      <section
        v-for="s in categories"
        :key="s.id"
        :id="s.id"
      >
        <!-- 系列标题 -->
        <div class="flex items-center gap-3 mb-6 scroll-mt-20">
          <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10">
            <UIcon :name="s.icon" class="size-5 text-primary" />
          </div>
          <h2 class="text-2xl font-semibold text-highlighted">
            {{ s.title }}
          </h2>
          <span class="text-sm text-muted">
            {{ $t('home.courses', { count: getCoursesByCategory(s.id).length }) }}
          </span>
        </div>

        <!-- 课程卡片网格 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="course in getCoursesByCategory(s.id)"
            :key="course.id"
            :to="`/course/${course.id}`"
            class="group block relative"
          >
            <UCard
              class="h-full transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-lg"
              :class="isMyCourse(course.id) ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/10' : ''"
              :ui="{ body: 'flex flex-col h-full' }"
            >
              <!-- 右上角设置按钮（管理员或课程编辑者可见） -->
              <div
                v-if="hasRole('admin') || isCourseTeacher(course.id)"
                class="absolute top-3 right-3 z-10"
              >
                <LayoutCourseEditor :course-id="course.id" @saved="handleCourseSaved" />
              </div>

              <!-- 图标 + 难度 -->
              <div class="flex items-start justify-between mb-4">
                <div
                  class="flex items-center justify-center size-12 rounded-lg"
                  :class="colorBgClass(course.color)"
                >
                  <UIcon :name="course.icon" class="size-6" :class="colorTextClass(course.color)" />
                </div>
                <UBadge
                  :label="course.level"
                  :color="levelColor(course.level)"
                  variant="subtle"
                  size="sm"
                />
              </div>

              <!-- 标题 -->
              <h3 class="text-lg font-semibold text-highlighted mb-2 group-hover:text-primary transition-colors">
                {{ course.title }}
              </h3>

              <!-- 标签 -->
              <div class="flex flex-wrap gap-1.5 mb-4">
                <UBadge
                  v-for="tag in course.tags"
                  :key="tag"
                  :label="tag"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
              </div>

              <!-- 底部信息 -->
              <div class="flex items-center justify-between pt-4 border-t border-default">
                <span class="flex items-center gap-1.5 text-sm text-muted">
                  <UIcon name="i-lucide-list-video" class="size-4" />
                  {{ $t('home.chapters', { count: course.chapterCount }) }}
                </span>
                <span class="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                  {{ $t('home.startLearning') }}
                  <UIcon name="i-lucide-arrow-right" class="size-4" />
                </span>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: home, refresh: refreshHome } = useHome()
const { isCourseTeacher, hasRole } = useAuth()

const categories = computed(() => home.value?.categories ?? [])
const courses = computed(() => home.value?.courses ?? [])

function getCoursesByCategory(categoryId: number) {
  const cat = categories.value.find((c) => c.id === categoryId)
  const catCourses = courses.value.filter((c) => c.categoryId === categoryId)

  // 如果分类有 orders 配置，按 orders 中的 order 排序显示
  if (cat?.orders && cat.orders.length > 0) {
    const courseMap = new Map(catCourses.map((c) => [String(c.id), c]))
    const sorted = [...cat.orders].sort((a, b) => a.order - b.order)
    return sorted.filter((o) => courseMap.has(o.id)).map((o) => courseMap.get(o.id)!)
  }

  return catCourses
}

/** 当前用户是否是某课程的教师或编辑者（用于首页高亮） */
function isMyCourse(courseId: number): boolean {
  return isCourseTeacher(courseId)
}

/** 课程设置保存后刷新首页数据 */
async function handleCourseSaved() {
  await refreshHome()
}

const { t } = useI18n()

function levelColor(level: string) {
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    [t('home.levels.beginner')]: 'success',
    [t('home.levels.intermediate')]: 'warning',
    [t('home.levels.advanced')]: 'error',
  }
  return map[level] || 'neutral'
}

function colorTextClass(color: string) {
  const map: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    info: 'text-info',
    warning: 'text-warning',
    error: 'text-error',
    neutral: 'text-highlighted',
  }
  return map[color] || 'text-primary'
}

function colorBgClass(color: string) {
  const map: Record<string, string> = {
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    info: 'bg-info/10',
    warning: 'bg-warning/10',
    error: 'bg-error/10',
    neutral: 'bg-elevated',
  }
  return map[color] || 'bg-primary/10'
}
</script>
