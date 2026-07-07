<template>
  <div>
    <!-- 上层模块注入：工具栏按钮 / 班级选择器等（lms 用） -->
    <slot name="top" />

    <!-- 内容管理弹窗（预览模式，教师/管理员可见） -->
    <div v-if="canEditCourse" class="mb-3">
      <UButton icon="i-lucide-database" color="neutral" variant="soft" size="xs"
        :label="$t('courseData.editor')" class="w-full justify-center"
        @click="contentPickerOpen = true" />
    </div>

    <!-- 第一项：课程首页 + 编辑导航按钮（左右分布） -->
    <div class="flex items-center justify-between mb-1">
      <NuxtLink :to="courseHomeUrl" class="text-sm font-medium text-highlighted hover:text-primary transition-colors">
        {{ firstNavLabel }}
      </NuxtLink>
      <NavEditor v-if="canEditCourse" mode="course" :course-id="courseId" :navigation="navigation.slice(1)" @saved="handleSaved" />
    </div>

    <UNavigationMenu :items="restNavItems" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <!-- 内容管理弹窗（预览模式） -->
    <UeditorContentPicker v-model="contentPickerOpen" preview-mode />

    <!-- 上层模块注入：课程面板弹窗等（lms 用） -->
    <slot name="bottom" />
  </div>
</template>

<script setup lang="ts">

/**
 * 课程侧边栏导航（doc 基础版）
 *
 * lms 模块通过 import 此组件 + #top/#bottom 插槽 + transformNavItems prop 扩展，
 * 避免复制 watch/handleSaved/canEditCourse 等核心逻辑。
 */
const props = defineProps<{
  /** 导航项转换函数（lms 用于 indexNavItems + markNavDisabled + markPassed） */
  transformNavItems?: (items: any[]) => any[]
}>()

const { hasRole, isCourseEditor } = useAuth()
const { navigation, courseId, refresh, courseApiUrl } = useSidebarNav()
const { courseNavVersion } = useLayoutState()

const contentPickerOpen = ref(false)

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

const canEditCourse = computed(() => hasRole('admin') || isCourseEditor(Number(courseId.value)))

// 导航项：默认直接用 navigation，lms 可通过 transformNavItems 注入序号/锁定/完成标记
const navItems = computed(() =>
  props.transformNavItems ? props.transformNavItems(navigation.value) : navigation.value,
)
const firstNavLabel = computed(() => navItems.value[0]?.label ?? '')
const courseHomeUrl = computed(() => navItems.value[0]?.to ?? `/course/${courseId.value}`)
const restNavItems = computed(() => navItems.value.slice(1))
</script>
