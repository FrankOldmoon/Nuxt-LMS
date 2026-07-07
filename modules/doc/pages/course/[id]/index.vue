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
  />
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const apiUrl = computed(() => `/api/courses/show?id=${courseId.value}`)

const { pending, course, canEdit, hasContent, chapterTree, firstChapterUrl,
        exporting, exportCourse, handleSaved, canManageTeachers } =
  useCourseDetailPage(courseId, apiUrl)
</script>
