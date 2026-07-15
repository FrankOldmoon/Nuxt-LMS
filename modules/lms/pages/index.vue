<template>
  <div class="max-w-none">
    <!-- Page title (hero): hidden when home.showHero is off -->
    <HomeHero v-if="homeCfg.showHero" />

    <!--
      Course list
      - Hidden when home.showRecentCourses=false
      - home.showStats / home.showLeaderboard: caller inserts corresponding sections into this template as needed
      - courseList.defaultView / showSearch / showFilter / showSort
        Reserved for course list / search pages: current home page only shows grid view
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

// Home page data (categories + courses) shared through useHome singleton
const { categories, getCoursesByCategory } = useHomeCourses()

// lms public config: home.* / courseList.* visibility and view
const { home: homeCfg, courseList: courseListCfg } = useLmsPublicConfig()
</script>
