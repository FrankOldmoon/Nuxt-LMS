<template>
  <UPageAside>
    <!-- 编辑导航组件（管理员或课程编辑者可见） -->
    <div v-if="hasRole('admin') || isCourseEditor(Number(courseId))" class="flex items-center gap-1 mb-2">
      <LayoutNavigationEditor
        mode="course"
        :course-id="courseId"
        :navigation="navigation.slice(1)"
        @saved="handleSaved"
      />
      <LayoutCourseEditor :course-id="Number(courseId)" @saved="handleSaved" />
    </div>

    <div v-else />

    <UNavigationMenu
      :items="navigation"
      orientation="vertical"
      :highlight="true"
      color="primary"
      class="w-full"
    />

    <template #bottom>
      
    </template>
  </UPageAside>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor } = useAuth()
const { navigation, courseId, refresh } = useSidebarNav()

// 保存成功后的处理
async function handleSaved() {
  // 刷新数据以重新加载导航
  if (refresh) {
    await refresh()
  }
}
</script>
