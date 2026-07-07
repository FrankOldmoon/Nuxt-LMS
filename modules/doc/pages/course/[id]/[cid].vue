<template>
  <ChapterView
    :data="data"
    :pending="pending"
    :not-found="notFound"
    :prev-chapter="prevChapter"
    :next-chapter="nextChapter"
    :chapter-id="chapterId"
    :course-id="courseId"
  />
</template>

<script setup lang="ts">
const route = useRoute()
const chapterId = computed(() => route.params.cid as string)
const courseId = computed(() => route.params.id as string)

const { data, pending, notFound, prevChapter, nextChapter } = useChapterPage(chapterId, courseId)
</script>
