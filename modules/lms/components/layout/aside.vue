<template>
  <DocAside :transform-nav-items="transformNavItems">
    <template #top>
      <!-- 课程按钮 -->
      <CourseBtns :course-id="courseId" :class-id="user?.defaultClass?.id || ''" :navigation="indexedNavigation" />

      <!-- 班级选择器（教师/管理员可见） -->
      <div v-if="isLoggedIn && canEditCourse" class="mb-3">
        <UButton :label="selectedClassName || $t('classSelector.selectClass')"
          :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
          class="w-full justify-center" @click="classModalOpen = true" />
      </div>
    </template>

    <template #bottom>
      <ClassModal v-model:open="classModalOpen" />
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

// 是否已登录
const isLoggedIn = computed(() => !!user.value)

const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))

const classModalOpen = ref(false)

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
