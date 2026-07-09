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
const { showDanmaku, chapterBtnsConfig, courseBtnsConfig } = useLayoutState()

// lms 公开配置：全局 courseBtns / chapterBtns 开关（管理员在 settings 中统一关闭某些功能时生效）
const { courseBtns: courseBtnsPublic, chapterBtns: chapterBtnsPublic } = useLmsPublicConfig()

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

// lms 扩展：数据变化时设置弹幕/按钮配置 + 初始化任务状态
// 优先级：course.config.lmsConfig > 全局 lms_config > 硬编码默认
let initedTaskChapterId = 0
watch(resp, (d) => {
  if (!d) return
  showDanmaku.value = d.course.showDanmaku ?? true
  chapterBtnsConfig.value = {
    showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true,
    ...(chapterBtnsPublic.value || {}),
    ...(d.course.chapterBtns || {}),
  }
  courseBtnsConfig.value = {
    showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, showWrongBook: true,
    ...(courseBtnsPublic.value || {}),
    ...(d.course.courseBtns || {}),
  }
  // 切换章节时用服务端数据初始化任务状态（同一章节内容保存刷新不重置）
  if (d?.chapter?.id && d.chapter.id !== initedTaskChapterId) {
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
  }
}, { immediate: true, flush: 'sync' })
</script>
