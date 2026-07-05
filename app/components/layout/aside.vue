<template>
  <div>
    <!-- 工具栏按钮行 -->
    <div class="flex items-center gap-1 mb-3 flex-wrap">
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
      <template v-if="canEditCourse">
        <UTooltip :text="$t('courseData.editor')">
          <UButton icon="i-lucide-database" color="neutral" variant="soft" size="xs"
            @click="contentPickerOpen = true" />
        </UTooltip>
      </template>
    </div>

    <!-- 班级选择器（教师/管理员可见） -->
    <div v-if="canEditCourse" class="mb-3">
      <UButton :label="selectedClassName || $t('classSelector.selectClass')"
        :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
        class="w-full justify-center" @click="classModalOpen = true" />
    </div>

    <!-- 第一项：课程首页 + 编辑导航按钮（左右分布） -->
    <div class="flex items-center justify-between mb-1">
      <NuxtLink :to="courseHomeUrl" class="text-sm font-medium text-highlighted hover:text-primary transition-colors">
        {{ firstNavLabel }}
      </NuxtLink>
      <NavEditor v-if="canEditCourse" mode="course" :course-id="courseId" :navigation="navigation.slice(1)" @saved="handleSaved" />
    </div>

    <UNavigationMenu :items="restNavItems" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <ClassModal v-model:open="classModalOpen" />

    <!-- 内容管理弹窗（预览模式） -->
    <UeditorContentPicker v-model="contentPickerOpen" preview-mode />

    <!-- 课程面板弹窗 -->
    <CourseProgressModal v-model:open="progressOpen" :course-id="courseId" :navigation="indexedNavigation" />
    <CourseLeaderboardModal v-model:open="leaderboardOpen" :course-id="courseId"
      :class-id="user?.defaultClass?.id || ''" />
    <CourseGroupsModal v-model:open="groupsOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />
    <CourseGradesModal v-model:open="gradesOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />
    <CourseAnnouncementsModal v-model:open="announcementsOpen" :course-id="courseId"
      :class-id="user?.defaultClass?.id || ''" />
  </div>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor, user } = useAuth()
const { navigation, courseId, refresh, accessibleChapterIds, passedChapterIds } = useSidebarNav()
const { courseNavVersion, courseBtnsConfig } = useLayoutState()

// 章节完成状态变化时刷新课程数据，让侧边栏打钩实时更新
// 必须先清除 Nuxt payload 缓存，否则 getCachedData 会返回旧数据导致 refresh 无效
watch(courseNavVersion, () => {
  const nuxtApp = useNuxtApp()
  const key = `/api/lms/courses/show?id=${courseId.value}`
  if (nuxtApp.payload.data[key]) {
    delete nuxtApp.payload.data[key]
  }
  refresh()
})

const classModalOpen = ref(false)
const contentPickerOpen = ref(false)
const progressOpen = ref(false)
const leaderboardOpen = ref(false)
const groupsOpen = ref(false)
const gradesOpen = ref(false)
const announcementsOpen = ref(false)

const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

// NavEditor 保存后刷新课程数据 + 侧边栏导航
async function handleSaved() {
  const nuxtApp = useNuxtApp()
  const key = `/api/lms/courses/show?id=${courseId.value}`
  if (nuxtApp.payload.data[key]) {
    delete nuxtApp.payload.data[key]
  }
  await refresh()
}

const indexedNavigation = computed(() => indexNavItems(navigation.value, '', true))

const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))

// 导航项：非教师/管理员时，未开放章节禁用点击；已完成章节右侧打钩
const navItems = computed(() => {
  const base = canEditCourse.value
    ? indexedNavigation.value
    : (markNavDisabled(indexedNavigation.value) as typeof indexedNavigation.value)
  return markPassed(base as any[])
})

// 第一项（课程首页）单独渲染，与 NavEditor 左右分布
const firstNavLabel = computed(() => navItems.value[0]?.label ?? '')
const courseHomeUrl = computed(() => navItems.value[0]?.to ?? `/course/${courseId.value}`)
const restNavItems = computed(() => navItems.value.slice(1))

// 递归标记已完成（is_pass）章节右侧显示 ✓ 徽标
function markPassed(items: any[]): any[] {
  return items.map(item => {
    const newItem: any = { ...item }
    if (item.to) {
      const match = String(item.to).match(/\/course\/[^/]+\/(\d+)$/)
      if (match) {
        const chId = Number(match[1])
        if (passedChapterIds.value.has(chId)) {
          newItem.badge = { label: '✓', color: 'success' }
        }
      }
    }
    if (item.children?.length) {
      newItem.children = markPassed(item.children)
    }
    return newItem
  })
}

// 递归标记未开放章节为 disabled
function markNavDisabled(items: any[]): any[] {
  return items.map(item => {
    const newItem: any = { ...item }
    // 从 to 中提取 chapterId：/course/:id/:cid
    if (item.to) {
      const match = String(item.to).match(/\/course\/[^/]+\/(\d+)$/)
      if (match) {
        const chId = Number(match[1])
        if (!accessibleChapterIds.value.has(chId)) {
          newItem.disabled = true
          newItem.label = '🔒 ' + (item.label || '')
        }
      }
    }
    if (item.children?.length) {
      newItem.children = markNavDisabled(item.children)
    }
    return newItem
  })
}
</script>
