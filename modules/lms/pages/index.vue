<template>
  <div class="max-w-none">
    <!-- 页面标题（hero）：home.showHero 关闭时隐藏 -->
    <HomeHero v-if="homeCfg.showHero" />

    <!--
      课程列表
      - home.showRecentCourses=false 隐藏
      - home.showStats / home.showLeaderboard 由调用方按需在此模板中插入对应区块
      - courseList.defaultView / showSearch / showFilter / showSort
        预留给课程列表页 / 搜索页：当前首页只有 grid 展示
    -->
    <div v-if="homeCfg.showRecentCourses" class="flex flex-col gap-16">
      <HomeCourseSection
        v-for="s in categories"
        :key="s.id"
        :section="s"
        :courses="getCoursesByCategory(s.id)"
        :view-mode="courseListCfg.defaultView"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { siteTitle } = useSiteConfig()

useHead(() => ({
  title: siteTitle.value || 'AI LMS',
}))

// 首页数据（分类 + 课程）通过 useHome 单例共享
const { categories, getCoursesByCategory } = useHomeCourses()

// lms 公开配置：home.* / courseList.* 显隐与视图
const { home: homeCfg, courseList: courseListCfg } = useLmsPublicConfig()
</script>
