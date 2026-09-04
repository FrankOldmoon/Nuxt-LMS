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

// lms 扩展：切换章节的数据流（每次切换固定 1 次 task-status POST（无变更则 0 次）+ 1 次 me）：
// 1. flushPersist()：落库旧章节（POST body 在调用时同步快照，仍是旧章节状态；无未落库变更则跳过）
// 2. resetProgress()：清空本地进度（含 hover 已读块），等 me 填充
// 3. refreshStatsOnly()：flush 完成后拉一次 /api/courses/me ——
//    既拿到旧章节刚结算的奖励（经验/金币/积分），也拿到新章节最新 taskStatus 填充 TOC 进度
// /api/chapters/show 只提供章节内容（客户端有缓存则不发请求）。
// 同一章节内容保存刷新（cid 不变）不触发，进度不重置。
const { refreshStatsOnly } = useUserCard()

// me 响应的最新章节进度走全局状态（useState），页面上直接应用到自己的 chapterTaskCtx。
// 不依赖 useChapterTask 的模块级 shared ctx —— 路由切换时页面 remount 的时序是
// 「新页面 setup 设置 → 旧页面 unmount」，旧逻辑无条件清空会抹掉新页面的 ctx，
// 导致 me 响应到达时进度无处可填（TOC 显示旧数据/空数据）
const serverProgress = useState<{ chapterId: number | string, taskStatus: Record<string, boolean>, isPass: boolean } | null>(
  'server-chapter-progress', () => null)
watch(serverProgress, (p) => {
  if (!p || Number(p.chapterId) !== Number(chapterId.value)) return
  chapterTaskCtx.applyServerTaskStatus(p.taskStatus, p.isPass)
}, { immediate: true })

watch(() => Number(chapterId.value), async (newCid, oldCid) => {
  if (!newCid || newCid === oldCid) return
  // 落库旧章节：此刻 taskStatus 仍是旧章节状态、flushPersist 用快照的旧章节 id，
  // 避免 1500ms 防抖定时器在章节切换后把旧章节的完成状态误存到新章节。
  const flushed = chapterTaskCtx.flushPersist()
  // 立即重置（不等 POST 完成，新章节内容可能已开始加载）
  chapterTaskCtx.resetProgress()
  await flushed
  // flush 结束（服务端奖励已结算）后再拉唯一一次 me，保证 userCard/TOC 显示最新数据
  refreshStatsOnly()
})
</script>
