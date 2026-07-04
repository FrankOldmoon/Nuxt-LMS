<template>
  <div>
    <!-- 工具栏按钮行 -->
    <div class="flex items-center gap-1 mb-3 flex-wrap">
      <UTooltip :text="$t('coursePanel.progress')">
        <UButton icon="i-lucide-trending-up" color="primary" variant="soft" size="xs" @click="progressOpen = true" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.leaderboard')">
        <UButton icon="i-lucide-trophy" color="info" variant="soft" size="xs" @click="leaderboardOpen = true" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.groups')">
        <UButton icon="i-lucide-users" color="warning" variant="soft" size="xs" @click="groupsOpen = true" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.grades')">
        <UButton icon="i-lucide-graduation-cap" color="error" variant="soft" size="xs" @click="gradesOpen = true" />
      </UTooltip>
      <UTooltip :text="$t('coursePanel.announcements')">
        <UButton icon="i-lucide-bell" color="success" variant="soft" size="xs" @click="announcementsOpen = true" />
      </UTooltip>
    </div>

    <!-- 编辑导航组件（管理员或课程编辑者可见） -->
    <div v-if="hasRole('admin') || isCourseEditor(Number(courseId))">
      <div class="flex items-center gap-1 mb-2">
        <NavEditor mode="course" :course-id="courseId" :navigation="navigation.slice(1)" @saved="handleSaved" />
        <CourseEditor :course-id="Number(courseId)" @saved="handleSaved" />
        <CourseDataEditor :course-id="Number(courseId)" />
        <UTooltip :text="$t('coursePanel.export')">
          <UButton icon="i-lucide-download" color="success" variant="soft" size="xs" :loading="exporting"
            @click="exportCourse" />
        </UTooltip>
      </div>
      <div class="mt-4 space-y-3">
        <UButton :label="selectedClassName || $t('classSelector.selectClass')"
          :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
          class="w-full justify-center" @click="() => { classModalOpen = true }" />
      </div>
    </div>

    

    <UNavigationMenu :items="navItems" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <ClassModal v-model:open="classModalOpen" />

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
const { courseNavVersion } = useLayoutState()

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
const progressOpen = ref(false)
const leaderboardOpen = ref(false)
const groupsOpen = ref(false)
const gradesOpen = ref(false)
const announcementsOpen = ref(false)
const exporting = ref(false)

const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

const indexedNavigation = computed(() => indexNavItems(navigation.value, '', true))

const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))

// 导航项：非教师/管理员时，未开放章节禁用点击；已完成章节右侧打钩
const navItems = computed(() => {
  const base = canEditCourse.value
    ? indexedNavigation.value
    : (markNavDisabled(indexedNavigation.value) as typeof indexedNavigation.value)
  return markPassed(base as any[])
})

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

/**
 * 导出当前课程（含全部章节 / 题目 / 作业 / 评论 / 测验 / 竞赛）到 JSON 文件
 * - 调用 /api/lms/courses/export
 * - 用 Blob 触发浏览器下载
 * - 文件名：<courseCode 或 name>-<timestamp>.json
 */
async function exportCourse() {
  if (!courseId.value || exporting.value) return
  exporting.value = true
  try {
    const data = await cRequest<any>('/api/lms/courses/export', {
      query: { id: courseId.value },
    })
    const courseName = data?.course?.name || 'course'
    const courseCode = data?.course?.code
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safe = (s: string) => String(s).replace(/[\\/:*?"<>|]/g, '_')
    const fileName = `${safe(courseCode || courseName)}-${ts}.json`

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('export course failed', err)
  } finally {
    exporting.value = false
  }
}
</script>
