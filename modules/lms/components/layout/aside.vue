<template>
  <div>
    <CourseBtns :course-id="courseId" :navigation="indexedNavigation" />
    <div v-if="isLoggedIn" class="mb-3">
      <UButton :label="selectedClassName || $t('classSelector.selectClass')"
        :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
        class="w-full justify-center" @click="classModalOpen = true" />
    </div>


    <!-- 内容管理按钮（编辑课程时显示） -->
    <div v-if="canEditCourse" class="mb-3">
      <UButton icon="i-lucide-database" color="neutral" variant="soft" size="xs" :label="$t('courseData.editor')"
        class="w-full justify-center" @click="contentPickerOpen = true" />
    </div>

    <!-- 导航首项与编辑入口 -->
    <div class="flex items-center justify-between mb-1">
      <NuxtLink :to="courseHomeUrl" class="text-sm font-medium text-highlighted hover:text-primary transition-colors">
        {{ firstNavLabel }}
      </NuxtLink>
      <NavEditor v-if="canEditCourse" mode="course" :course-id="courseId" :navigation="navigation.slice(1)"
        @saved="handleSaved" />
    </div>

    <UNavigationMenu :items="restNavItems" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <UeditorContentPicker v-model="contentPickerOpen" preview-mode />
    <ClassModal v-model:open="classModalOpen" />
  </div>
</template>

<script setup lang="ts">
const { hasRole, user } = useAuth()
const { isCourseEditor } = useAuthLms()
const nav = useSidebarNav()
const { navigation, courseId, refresh, courseApiUrl } = nav
// lms 扩展字段，doc 环境下可能为 undefined，使用可选链保护
const accessibleChapterIds: ComputedRef<Set<number>> | undefined = (nav as any).accessibleChapterIds
const passedChapterIds: ComputedRef<Set<number>> | undefined = (nav as any).passedChapterIds

const { courseNavVersion } = useLayoutState()

const contentPickerOpen = ref(false)
const classModalOpen = ref(false)

// 监听导航版本变化，清除缓存并刷新
watch(courseNavVersion, () => {
  const nuxtApp = useNuxtApp()
  const key = courseApiUrl.value
  if (nuxtApp.payload.data[key]) {
    delete nuxtApp.payload.data[key]
  }
  refresh()
})

async function handleSaved() {
  const nuxtApp = useNuxtApp()
  const key = courseApiUrl.value
  if (nuxtApp.payload.data[key]) {
    delete nuxtApp.payload.data[key]
  }
  await refresh()
}

// 权限与登录状态
const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))
const isLoggedIn = computed(() => !!user.value)
const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

// lms 专属：带序号前缀的导航（供 CourseBtns 等使用）
const indexedNavigation = computed(() => {
  return indexNavItems(navigation.value, '', true)
})

// -------------- 导航项转换逻辑 --------------
// 默认转换：lms 模式下自动加上序号、锁定、完成标记；否则直接透传
const navItems = computed(() => {
  return transformNavItems(navigation.value)
})

function defaultLmsTransform(items: any[]): any[] {
  const indexed = indexNavItems(items, '', true)
  const base = canEditCourse.value ? indexed : markNavDisabled(indexed)
  return markPassed(base)
}

// 递归标记已完成章节
function markPassed(items: any[]): any[] {
  return items.map((item) => {
    const newItem: any = { ...item }
    if (item.to) {
      const match = String(item.to).match(/\/course\/[^/]+\/(\d+)$/)
      if (match && passedChapterIds?.value.has(Number(match[1]))) {
        newItem.badge = { label: '✓', color: 'success' }
      }
    }
    if (item.children?.length) {
      newItem.children = markPassed(item.children)
    }
    return newItem
  })
}

function transformNavItems(items: any[]): any[] {
  const indexed = indexNavItems(items, '', true)
  const base = canEditCourse.value ? indexed : markNavDisabled(indexed)
  return markPassed(base as any[])
}

// 递归标记未开放章节为 disabled
function markNavDisabled(items: any[]): any[] {
  return items.map((item) => {
    const newItem: any = { ...item }
    if (item.to) {
      const match = String(item.to).match(/\/course\/[^/]+\/(\d+)$/)
      if (match && accessibleChapterIds && !accessibleChapterIds.value.has(Number(match[1]))) {
        newItem.disabled = true
        newItem.label = '🔒 ' + (item.label || '')
      }
    }
    if (item.children?.length) {
      newItem.children = markNavDisabled(item.children)
    }
    return newItem
  })
}

// 计算首项标签和链接
const firstNavLabel = computed(() => navItems.value[0]?.label ?? '')
const courseHomeUrl = computed(() => navItems.value[0]?.to ?? `/course/${courseId.value}`)
const restNavItems = computed(() => navItems.value.slice(1))
</script>