<template>
  <DocAside :transform-nav-items="transformNavItems">
    <template #top>
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
      </div>

      <!-- 班级选择器（教师/管理员可见） -->
      <div v-if="canEditCourse" class="mb-3">
        <UButton :label="selectedClassName || $t('classSelector.selectClass')"
          :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
          class="w-full justify-center" @click="classModalOpen = true" />
      </div>
    </template>

    <template #bottom>
      <ClassModal v-model:open="classModalOpen" />

      <!-- 课程面板弹窗 -->
      <CourseProgressModal v-model:open="progressOpen" :course-id="courseId" :navigation="indexedNavigation" />
      <CourseLeaderboardModal v-model:open="leaderboardOpen" :course-id="courseId"
        :class-id="user?.defaultClass?.id || ''" />
      <CourseGroupsModal v-model:open="groupsOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />
      <CourseGradesModal v-model:open="gradesOpen" :course-id="courseId" :class-id="user?.defaultClass?.id || ''" />
      <CourseAnnouncementsModal v-model:open="announcementsOpen" :course-id="courseId"
        :class-id="user?.defaultClass?.id || ''" />
    </template>
  </DocAside>
</template>

<script setup lang="ts">
/**
 * lms 侧边栏：import doc 的 DocAside，通过插槽注入 lms 专有内容。
 *
 * 核心逻辑（watch courseNavVersion / handleSaved / canEditCourse / NavEditor / 内容管理弹窗）
 * 由 DocAside 提供，改 doc 版本时 lms 自动同步。
 */
import DocAside from '../../../doc/components/layout/aside.vue'

const { hasRole, isCourseEditor, user } = useAuth()
const { navigation, courseId, accessibleChapterIds, passedChapterIds } = useSidebarNav()
const { courseBtnsConfig } = useLayoutState()

const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))

const classModalOpen = ref(false)
const progressOpen = ref(false)
const leaderboardOpen = ref(false)
const groupsOpen = ref(false)
const gradesOpen = ref(false)
const announcementsOpen = ref(false)

const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

// 导航项索引（带序号前缀），供弹窗组件使用
const indexedNavigation = computed(() => indexNavItems(navigation.value, '', true))

// 导航项转换：序号 → 标记未开放（🔒）→ 标记已完成（✓）
function transformNavItems(items: any[]): any[] {
  const indexed = indexNavItems(items, '', true)
  const base = canEditCourse.value ? indexed : markNavDisabled(indexed)
  return markPassed(base as any[])
}

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
