<template>
  <UPageAside>
    <!-- 工具栏按钮行 -->
    <div class="flex items-center gap-1 mb-3 flex-wrap">
      <UTooltip :text="$t('coursePanel.progress')">
        <UButton icon="i-lucide-trending-up" color="neutral" variant="outline" size="xs" @click="() => { progressOpen = true }" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.leaderboard')">
        <UButton icon="i-lucide-trophy" color="neutral" variant="outline" size="xs" @click="() => { leaderboardOpen = true }" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.groups')">
        <UButton icon="i-lucide-users" color="neutral" variant="outline" size="xs" @click="() => { groupsOpen = true }" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.grades')">
        <UButton icon="i-lucide-graduation-cap" color="neutral" variant="outline" size="xs" @click="() => { gradesOpen = true }" />
      </UTooltip>
    </div>

    <!-- 编辑导航组件（管理员或课程编辑者可见） -->
    <div v-if="hasRole('admin') || isCourseEditor(Number(courseId))">
      <div class="flex items-center gap-1 mb-2">
        <NavEditor mode="course" :course-id="courseId" :navigation="navigation.slice(1)"
          @saved="handleSaved" />
        <CourseEditor :course-id="Number(courseId)" @saved="handleSaved" />
        <CourseDataEditor :course-id="Number(courseId)" />
      </div>
      <div class="mt-4 space-y-3">
        <UButton :label="selectedClassName || $t('classSelector.selectClass')"
          :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
          class="w-full justify-center" @click="() => { classModalOpen = true }" />
      </div>
    </div>

    <div v-else />

    <UNavigationMenu :items="indexedNavigation" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <ClassModal v-model:open="classModalOpen" />

    <!-- 课程面板弹窗 -->
    <CourseProgressModal v-model:open="progressOpen" :course-id="courseId" :navigation="indexedNavigation" />
    <CourseLeaderboardModal v-model:open="leaderboardOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />
    <CourseGroupsModal v-model:open="groupsOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />
    <CourseGradesModal v-model:open="gradesOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />

    <template #bottom>

    </template>
  </UPageAside>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor, user } = useAuth()
const { navigation, courseId, refresh } = useSidebarNav()

const classModalOpen = ref(false)
const progressOpen = ref(false)
const leaderboardOpen = ref(false)
const groupsOpen = ref(false)
const gradesOpen = ref(false)

const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

const indexedNavigation = computed(() => indexNavItems(navigation.value, '', true))

async function handleSaved() {
  if (refresh) {
    const key = `/api/lms/courses/show?id=${courseId.value}`
    const nuxtApp = useNuxtApp()
    if (nuxtApp.payload.data[key]) {
      delete nuxtApp.payload.data[key]
    }
    await refresh()
  }
}
</script>
