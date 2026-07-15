<template>
  <ChapterView
    :data="data"
    :pending="pending"
    :not-found="notFound"
    :prev-chapter="prevChapter"
    :next-chapter="nextChapter"
    :chapter-id="chapterId"
    :course-id="courseId"
    :extra-condition="locked"
  >
    <!-- lms extension: chapter access control bar (visible to teachers/admins) -->
    <template #access-bar>
      <ChapterAccessBar :chapter-id="Number(chapterId)" :course-id="Number(courseId)" :chapter-data="data?.chapter" />
    </template>
  </ChapterView>
</template>

<script setup lang="ts">
const route = useRoute()
const chapterId = computed(() => route.params.cid as string)
const courseId = computed(() => route.params.id as string)

// Provide course/chapter context to subtree (including modal components)
provideLmsContext(courseId, chapterId)

const { resp, pending, error, data, notFound, prevChapter, nextChapter } =
  useChapterPage(chapterId, courseId)

// lms extension: distinguish "not exists" and "not open" (403 = not open, others = not exists)
const locked = computed(() => !!error.value && (error.value as any)?.statusCode === 403)

// lms extension: chapter task completion state context (provided to content area components for reporting, toc checkmark)
const chapterTaskCtx = setupChapterTask({
  content: computed(() => data.value?.chapter?.content),
  chapterId: computed(() => Number(chapterId.value)),
  courseId: computed(() => Number(courseId.value)),
  chapterTitle: computed(() => data.value?.chapter?.title ?? ''),
})

// lms button toggle config: course.chapterBtns/courseBtns/showDanmaku > global lms_config > default
const btnsSource = computed(() => resp.value?.course ? {
  courseBtns: resp.value.course.courseBtns,
  chapterBtns: resp.value.course.chapterBtns,
  showDanmaku: resp.value.course.showDanmaku,
} : null)
useLmsBtnsConfig(btnsSource, { flush: 'sync' })

// lms extension: use server data to initialize task state when switching chapter (same chapter content save refresh does not reset)
let initedTaskChapterId = 0
watch(resp, (d) => {
  if (!d?.chapter?.id) return
  if (d.chapter.id === initedTaskChapterId) return
  initedTaskChapterId = d.chapter.id
  chapterTaskCtx.taskStatus.value = { ...(d.chapter.taskStatus || {}) }
  chapterTaskCtx.isPass.value = !!d.chapter.isPass
  // Use completed heading to derive node-level state, avoid subsequent recompute losing completed tasks
  const map = chapterTaskCtx.taskMap.value
  const ns: Record<string, boolean> = {}
  for (const h of map.headings) {
    if (chapterTaskCtx.taskStatus.value[h.id]) {
      for (const t of (map.tasksByHeading[h.id] || [])) ns[t.key] = true
    }
  }
  chapterTaskCtx.nodeStatus.value = ns
}, { immediate: true, flush: 'sync' })
</script>
