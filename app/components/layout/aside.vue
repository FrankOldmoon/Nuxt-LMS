<template>
  <UPageAside>
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

    <template #bottom>

    </template>
  </UPageAside>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor, user } = useAuth()
const { navigation, courseId, refresh } = useSidebarNav()

const classModalOpen = ref(false)

const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

const indexedNavigation = computed(() => indexNavItems(navigation.value, '', true))

async function handleSaved() {
  if (refresh) await refresh()
}
</script>
