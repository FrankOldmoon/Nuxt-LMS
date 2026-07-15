<template>
  <div class="pt-4">
    <div class="sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
      <CourseBtns :course-id="courseId" :navigation="indexedNavigation" />
      <div v-if="isLoggedIn" class="mb-3">
        <UButton :label="selectedClassName || $t('classSelector.selectClass')"
          :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
          class="w-full justify-center" @click="classModalOpen = true" />
      </div>

      <!-- Content management button (shown when editing course) -->
      <div v-if="canEditCourse" class="mb-3">
        <UButton icon="i-lucide-database" color="neutral" variant="soft" size="xs" :label="$t('courseData.editor')"
          class="w-full justify-center" @click="contentPickerOpen = true" />
      </div>
    </div>

    <!-- First navigation item and edit entry -->
    <div class="flex items-center justify-between mb-1">
      <NuxtLink :to="courseHomeUrl" class="text-sm font-medium text-highlighted hover:text-primary transition-colors">
        {{ firstNavLabel }}
      </NuxtLink>
      <NavEditor v-if="canEditCourse" mode="course" :course-id="courseId" :navigation="navigation.slice(1)"
        @saved="handle saved" />
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
  firstNavLabel, navigation, handle saved, restNavItems,
} = useAside()
</script>