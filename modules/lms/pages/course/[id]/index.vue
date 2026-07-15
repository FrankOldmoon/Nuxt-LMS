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
    <!-- lms extension: learning progress bar -->
    <template #header-extra>
      <CourseProgressBar v-if="progressPercent !== null" :percent="progressPercent" />
    </template>

    <!-- lms extension: student count -->
    <template #teachers-extra="{ course }">
      <CourseStudentCount :count="course.studentCount" />
    </template>

    <!-- lms extension: chapter card with lock/passed icon + inaccessible disabled -->
    <template #chapter-item="{ item, index }">
      <CourseChapterCard :item="item" :index="index" />
    </template>
  </CourseView>
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const apiUrl = computed(() => `/api/courses/show?id=${courseId.value}`)

// Provide course context to subtree (including modal components)
provideLmsContext(courseId)

const {
  resp, pending, course, canEdit, hasContent,
  chapterTree, firstChapterUrl, progressPercent,
  exporting, exportCourse, handleSaved, canManageTeachers,
} = useLmsCourseDetail(courseId, apiUrl)

// lms button toggle config: course.config.lmsConfig > global lms_config > default
const btnsSource = computed(() => (resp.value as any)?.config?.lmsConfig || null)
useLmsBtnsConfig(btnsSource)
</script>
