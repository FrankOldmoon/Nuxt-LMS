<template>
  <!-- 未登录时不显示按钮 -->
  <div v-if="isLoggedIn" class="flex items-center gap-1 mb-3 flex-wrap">
    <UTooltip v-if="courseBtnsConfig.showProgress" :text="$t('coursePanel.progress')">
      <UButton icon="i-lucide-trending-up" color="primary" variant="soft" size="xs" @click="progressOpen = true" />
    </UTooltip>
    <UTooltip v-if="courseBtnsConfig.showLeaderboard" :text="$t('coursePanel.leaderboard')">
      <UButton icon="i-lucide-trophy" color="info" variant="soft" size="xs" @click="leaderboardOpen = true" />
    </UTooltip>
    <UTooltip v-if="courseBtnsConfig.showGroups" :text="$t('coursePanel.groups')">
      <UButton icon="i-lucide-users" color="warning" variant="soft" size="xs" @click="groupsOpen = true" />
    </UTooltip>
    <UTooltip v-if="courseBtnsConfig.showGrades" :text="$t('coursePanel.grades')">
      <UButton icon="i-lucide-graduation-cap" color="error" variant="soft" size="xs" @click="gradesOpen = true" />
    </UTooltip>
    <UTooltip v-if="courseBtnsConfig.showAnnouncements" :text="$t('coursePanel.announcements')">
      <UButton icon="i-lucide-bell" color="secondary" variant="soft" size="xs" @click="announcementsOpen = true" />
    </UTooltip>
  </div>

  <!-- 课程面板弹窗 -->
  <CourseProgressModal v-model:open="progressOpen" :course-id="courseId" :navigation="navigation" />
  <CourseLeaderboardModal v-model:open="leaderboardOpen" :course-id="courseId" :class-id="classId" />
  <CourseGroupsModal v-model:open="groupsOpen" :course-id="courseId" :class-id="classId" />
  <CourseGradesModal v-model:open="gradesOpen" :course-id="courseId" :class-id="classId" />
  <CourseAnnouncementsModal v-model:open="announcementsOpen" :course-id="courseId" :class-id="classId" />
</template>

<script setup lang="ts">
const { user } = useAuth()
const { courseBtnsConfig } = useLayoutState()

const props = defineProps<{
  courseId: string
  classId: string
  navigation: any[]
}>()

// 是否已登录
const isLoggedIn = computed(() => !!user.value)

const progressOpen = ref(false)
const leaderboardOpen = ref(false)
const groupsOpen = ref(false)
const gradesOpen = ref(false)
const announcementsOpen = ref(false)
</script>