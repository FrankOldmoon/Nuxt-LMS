<template>
  <div class="pt-4">
    <div class="sticky top-0 bg-white dark:bg-[#1a1a1a] z-10">
      <!-- Lazy：课程按钮组会牵出导出（docx/pptx）、数据编辑器等重依赖，侧边栏全站可见，
           静态引用会让这些依赖进入首屏阻塞路径 -->
      <LazyCourseBtns :course-id="courseId" :navigation="indexedNavigation" />
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
    </div>

    <!-- 导航首项与编辑入口 -->
    <div class="flex items-center justify-between mb-1">
      <NuxtLink :to="courseHomeUrl" class="text-sm font-medium text-highlighted hover:text-primary transition-colors">
        {{ firstNavLabel }}
      </NuxtLink>
      <LazyNavEditor v-if="canEditCourse" mode="course" :course-id="courseId" :navigation="navigation.slice(1)"
        @saved="handleSaved" />
    </div>

    <UNavigationMenu :items="restNavItems" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <!-- Lazy + v-if：内容选择器内部会 import 各节点编辑器 + ueditorRender（→ 富文本内核/节点渲染器）。
         侧边栏是全站常驻的，仅 Lazy 不够：组件若在 SSR 期间照常渲染，chunk 仍会被 modulepreload
         阻塞首屏；未打开时不参与 SSR 渲染才真正移出关键路径。 -->
    <LazyUeditorContentPicker v-if="contentPickerOpen" v-model="contentPickerOpen" preview-mode />
    <LazyClassModal v-if="classModalOpen" v-model:open="classModalOpen" />
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