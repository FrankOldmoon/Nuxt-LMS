<template>
  <CourseView
    :course="course"
    :pending="pending"
    :can-edit="canEdit"
    :has-content="hasContent"
    :chapter-tree="chapterTree"
    :first-chapter-url="firstChapterUrl"
    :exporting="exporting"
    :can-manage-teachers="canManageTeachers"
    :course-id="courseId"
    @saved="handleSaved"
    @export="exportCourse"
  >
    <!-- lms 扩展：学习进度条 -->
    <template #header-extra>
      <CourseProgressBar v-if="progressPercent !== null" :percent="progressPercent" />
    </template>

    <!-- lms 扩展：学生人数 -->
    <template #teachers-extra="{ course }">
      <CourseStudentCount :count="course.studentCount" />
    </template>

    <!-- lms 扩展：章节卡片含锁/通过图标 + 不可访问禁用 -->
    <template #chapter-item="{ item, index }">
      <CourseChapterCard :item="item" :index="index" />
    </template>
  </CourseView>
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const apiUrl = computed(() => `/api/courses/show?id=${courseId.value}`)

// 为子树（含弹窗内组件）提供 course 上下文
provideLmsContext(courseId)

const {
  resp, pending, course, canEdit, hasContent,
  chapterTree, firstChapterUrl, progressPercent,
  exporting, exportCourse, handleSaved, canManageTeachers,
} = useLmsCourseDetail(courseId, apiUrl)

// lms 按钮开关配置：course.config.lmsConfig > 全局 lms_config > 默认
const btnsSource = computed(() => (resp.value as any)?.config?.lmsConfig || null)
useLmsBtnsConfig(btnsSource)
</script>
