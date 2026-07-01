<template>
  <UPageAside>
    <!-- 编辑导航组件（教师/管理员可见） -->
    <LayoutNavigationEditor
      v-if="hasAnyRole(['teacher', 'admin'])"
      mode="course"
      :course-id="courseId"
      :navigation="navigation.slice(1)"
      @saved="handleSaved"
    />

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

const { hasAnyRole } = useAuth()
const { navigation, courseId, refresh } = useSidebarNav()

// 保存成功后的处理
async function handleSaved() {
  // 刷新数据以重新加载导航
  if (refresh) {
    await refresh()
  }
}
</script>
