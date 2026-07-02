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
          <CourseCard
            v-for="course in getCoursesByCategory(s.id)"
            :key="course.id"
            :course="course"
            :highlight="isCourseTeacher(course.id)"
            :can-edit="hasRole('admin') || isCourseTeacher(course.id)"
            @saved="handleCourseSaved"
          />
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

/** 课程设置保存后刷新首页数据 */
async function handleCourseSaved() {
  await refreshHome()
}
</script>
