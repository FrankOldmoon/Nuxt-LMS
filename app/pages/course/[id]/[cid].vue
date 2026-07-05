<template>

  <div v-if="data" class="flex gap-8">
    <!-- 左侧主内容 -->
    <div class="flex-1 min-w-0 max-w-none">
      <!-- 章节访问控制栏（教师/管理员可见） -->
      <ChapterAccessBar :chapter-id="Number(chapterId)" :course-id="Number(courseId)" :chapter-data="data?.chapter" />

      <!-- 章节头部 -->
      <div class="mb-8 pb-6 border-b border-default">
        <div class="flex items-center gap-2 text-sm text-muted mb-3">
          <UIcon :name="data.course.icon" class="size-4" />
          <span>{{ data.course.title }}</span>
          <!-- 移动端 toc 按钮 -->
          <UButton class="lg:hidden ml-auto" icon="i-lucide-panel-right"
            color="neutral" variant="outline" size="xs"
            :label="$t('layout.toc')" @click="tocOpen = true" />
        </div>
        <h1 :id="chapterId" class="text-3xl font-bold text-highlighted scroll-mt-20">
          {{ data.chapter.title }}
        </h1>
      </div>

      <!-- 章节内容 -->
      <UeditorRender :json="data.chapter.content" />

      <!-- 上一章/下一章导航 -->
      <div class="flex items-center justify-between gap-4 pt-8 mt-8 border-t border-default">
        <NuxtLink v-if="prevChapter" :to="prevChapter.to" class="flex-1">
          <UCard :ui="{ body: 'flex items-center gap-3' }" class="transition-all hover:ring-2 hover:ring-primary/30">
            <UIcon name="i-lucide-arrow-left" class="size-5 text-muted shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-muted mb-0.5">{{ $t('chapter.previous') }}</p>
              <p class="text-sm font-medium text-highlighted truncate">{{ prevChapter.label }}</p>
            </div>
          </UCard>
        </NuxtLink>
        <div v-else class="flex-1" />

        <NuxtLink v-if="nextChapter" :to="nextChapter.to" class="flex-1">
          <UCard :ui="{ body: 'flex items-center gap-3 justify-end text-right' }"
            class="transition-all hover:ring-2 hover:ring-primary/30">
            <div class="min-w-0">
              <p class="text-xs text-muted mb-0.5">{{ $t('chapter.next') }}</p>
              <p class="text-sm font-medium text-highlighted truncate">{{ nextChapter.label }}</p>
            </div>
            <UIcon name="i-lucide-arrow-right" class="size-5 text-muted shrink-0" />
          </UCard>
        </NuxtLink>
        <div v-else class="flex-1" />
      </div>
    </div>

    <!-- 右侧目录（桌面端显示，滚动时固定） -->
    <div class="hidden lg:block w-56 shrink-0">
      <div class="sticky top-20">
        <UPageAside>
          <LayoutToc />
        </UPageAside>
      </div>
    </div>
  </div>

  <!-- 章节不存在 -->
  <div v-else-if="!pending && notFound" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('chapter.notFound') }}</p>
    <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
  </div>

  <!-- 章节未开放 -->
  <div v-else-if="!pending && locked" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-lock" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('chapter.notOpen') }}</p>
    <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
  </div>

  <!-- 移动端目录弹窗 -->
  <USlideover v-model:open="tocOpen" :title="$t('layout.pageToc')" side="right">
    <template #body>
      <LayoutToc />
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const route = useRoute()
const chapterId = computed(() => route.params.cid as string)
const courseId = computed(() => route.params.id as string)
const { setToc, setEditableContent, setEditableMeta, contentVersion, showDanmaku, chapterBtnsConfig, courseBtnsConfig } = useLayoutState()
const { navigation } = useSidebarNav()

const tocOpen = ref(false)

// 路由变化时自动关闭弹窗
watch(() => route.fullPath, () => {
  tocOpen.value = false
})

const { data: resp, pending, refresh, error } = cRequest.use<import('#shared/types/lms').LmsChapterPageData | null>(
  () => chapterId.value ? `/api/lms/chapters/show?id=${chapterId.value}` : '',
  { default: () => null },
)

const data = computed(() => resp.value as import('#shared/types/lms').LmsChapterPageData | null)

// 章节任务完成状态上下文：提供给内容区组件（上报）与目录（打钩）
const chapterTaskCtx = setupChapterTask({
  content: computed(() => data.value?.chapter?.content),
  chapterId: computed(() => Number(chapterId.value)),
  courseId: computed(() => Number(courseId.value)),
})

// 区分"不存在"和"未开放"（403 错误 = 未开放，404/其他 = 不存在）
const locked = computed(() => !!error.value && (error.value as any)?.statusCode === 403)
const notFound = computed(() => !!error.value && (error.value as any)?.statusCode !== 403)

// 数据变化时设置 TOC + 可编辑内容
// flush: 'sync' 确保在 SSR Suspense 恢复时同步执行，
// 避免嵌套 Suspense 子组件（如 question）渲染时 editableCourseId 仍为初始值 0
let initedTaskChapterId = 0
watch(resp, (d) => {
  if (!d) return
  setToc(extractTocFromContent(d?.chapter?.content))
  setEditableContent(d?.chapter?.content ?? null)
  if (d?.chapter?.id) setEditableMeta('chapters', d.chapter.id, d.course.id)
  showDanmaku.value = d.course.showDanmaku ?? true
  // 设置章节/课程按钮开关配置
  chapterBtnsConfig.value = { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true, ...(d.course.chapterBtns || {}) }
  courseBtnsConfig.value = { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, ...(d.course.courseBtns || {}) }
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

// 监听内容版本号，保存成功后重新获取数据（flush: sync 确保每次变化都触发）
watch(contentVersion, () => refresh(), { flush: 'sync' })

// 扁平化侧边栏导航，得到按 orders 排序的线性列表（带序号前缀）
const flatNav = computed(() => {
  const result: { label: string; to: string }[] = []
  function walk(items: any[]) {
    for (const item of items) {
      if (item.to) result.push({ label: item.label, to: item.to })
      if (item.children) walk(item.children)
    }
  }
  walk(indexNavItems(navigation.value, '', true))
  return result
})

// 当前章节在导航中的索引
const currentNavIndex = computed(() =>
  flatNav.value.findIndex((item) => item.to === `/course/${courseId.value}/${chapterId.value}`)
)

const prevChapter = computed(() => {
  const idx = currentNavIndex.value
  return idx > 0 ? flatNav.value[idx - 1]! : null
})

const nextChapter = computed(() => {
  const idx = currentNavIndex.value
  return idx >= 0 && idx < flatNav.value.length - 1 ? flatNav.value[idx + 1]! : null
})
</script>
