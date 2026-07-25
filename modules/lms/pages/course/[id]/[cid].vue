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
    <!-- lms 扩展：章节访问控制栏（教师/管理员可见） -->
    <template #access-bar>
      <ChapterAccessBar :chapter-id="Number(chapterId)" :course-id="Number(courseId)" :chapter-data="data?.chapter" />
    </template>
  </ChapterView>
</template>

<script setup lang="ts">
const route = useRoute()
const chapterId = computed(() => route.params.cid as string)
const courseId = computed(() => route.params.id as string)

// 为子树（含弹窗内组件）提供 course/chapter 上下文
provideLmsContext(courseId, chapterId)

const { resp, pending, error, data, notFound, prevChapter, nextChapter } =
  useChapterPage(chapterId, courseId)

// lms 扩展：区分"不存在"和"未开放"（403 = 未开放，其他 = 不存在）
const locked = computed(() => !!error.value && (error.value as any)?.statusCode === 403)

// lms 扩展：章节任务完成状态上下文（提供给内容区组件上报，目录打钩）
const chapterTaskCtx = setupChapterTask({
  content: computed(() => data.value?.chapter?.content),
  chapterId: computed(() => Number(chapterId.value)),
  courseId: computed(() => Number(courseId.value)),
  chapterTitle: computed(() => data.value?.chapter?.title ?? ''),
})

// lms 按钮开关配置：course.chapterBtns/courseBtns/showDanmaku > 全局 lms_config > 默认
const btnsSource = computed(() => resp.value?.course ? {
  courseBtns: resp.value.course.courseBtns,
  chapterBtns: resp.value.course.chapterBtns,
  showDanmaku: resp.value.course.showDanmaku,
} : null)
useLmsBtnsConfig(btnsSource, { flush: 'sync' })

// lms 扩展：切换章节时用服务端数据初始化任务状态（同一章节内容保存刷新不重置）
let initedTaskChapterId = 0
watch(resp, (d) => {
  if (!d?.chapter?.id) return
  if (d.chapter.id === initedTaskChapterId) return
  initedTaskChapterId = d.chapter.id
  chapterTaskCtx.taskStatus.value = { ...(d.chapter.taskStatus || {}) }
  chapterTaskCtx.isPass.value = !!d.chapter.isPass
  // 用已完成的 heading 反推 node 级状态，避免后续 recompute 丢失已完成任务
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
