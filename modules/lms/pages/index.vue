<template>
  <div class="max-w-none">
    <!-- 页面标题（hero）：home.showHero 关闭时隐藏 -->
    <div v-if="homeCfg.showHero" class="mb-12">
      <h1 class="text-4xl font-bold text-highlighted mb-3">
        {{ $t('home.title') }}
      </h1>
      <p class="text-lg text-muted">
        {{ $t('home.subtitle') }}
      </p>
    </div>

    <!--
      课程列表
      - home.showRecentCourses=false 隐藏（占位，暂无该 section 时等同通过 hero 隐藏）
      - home.showStats / home.showLeaderboard 由调用方按需在此模板中插入对应区块
      - courseList.defaultView / showSearch / showFilter / showSort
        预留给课程列表页 / 搜索页：当前首页只有 grid 展示
    -->
    <div v-if="homeCfg.showRecentCourses" class="flex flex-col gap-16">
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

        <!-- 课程卡片网格（grid 模式固定 3 列；list 模式预留 CourseCard 后续扩展） -->
        <div
          v-if="courseListCfg.defaultView === 'list'"
          class="flex flex-col gap-3"
        >
          <CourseCard
            v-for="course in getCoursesByCategory(s.id)"
            :key="course.id"
            :course="course"
            :highlight="isCourseTeacher(course.id)"
          />
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <CourseCard
            v-for="course in getCoursesByCategory(s.id)"
            :key="course.id"
            :course="course"
            :highlight="isCourseTeacher(course.id)"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { siteTitle } = useSiteConfig()

useHead(() => ({
  title: siteTitle.value || 'AI LMS',
}))
const { data: homeData } = useHome()
const { isCourseTeacher } = useAuthLms()



// lms 公开配置：home.* / courseList.* 显隐与视图
// 别名以避免与 useHome() 变量冲突
const { home: homeCfg, courseList: courseListCfg } = useLmsPublicConfig()

const categories = computed(() => homeData.value?.categories ?? [])

function getCoursesByCategory(categoryId: number) {
  const cat = categories.value.find((c) => c.id === categoryId)
  const catCourses = (homeData.value?.courses ?? []).filter((c) => c.categoryId === categoryId)

  // 如果分类有 orders 配置，按 orders 中的 order 排序显示
  if (cat?.orders && cat.orders.length > 0) {
    const courseMap = new Map(catCourses.map((c) => [String(c.id), c]))
    const sorted = [...cat.orders].sort((a, b) => a.order - b.order)
    return sorted.filter((o) => courseMap.has(o.id)).map((o) => courseMap.get(o.id)!)
  }

  return catCourses
}
</script>
