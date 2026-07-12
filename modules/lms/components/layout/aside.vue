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
import { useAside } from './useAside'

const {
  courseId, indexedNavigation, isLoggedIn, selectedClassName,
  classModalOpen, canEditCourse, contentPickerOpen, courseHomeUrl,
  firstNavLabel, navigation, handleSaved, restNavItems,
} = useAside()
</script>