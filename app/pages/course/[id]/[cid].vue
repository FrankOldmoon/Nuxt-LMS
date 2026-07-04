<template>
  
  <div v-if="data" class="flex gap-8">
    <!-- 左侧主内容 -->
    <div class="flex-1 min-w-0 max-w-none">
      <!-- 章节访问控制栏（教师/管理员可见） -->
      <ChapterAccessBar :chapter-id="Number(chapterId)" :course-id="Number(courseId)" />

      <!-- 章节头部 -->
      <div class="mb-8 pb-6 border-b border-default">
        <div class="flex items-center gap-2 text-sm text-muted mb-3">
          <UIcon :name="data.course.icon" class="size-4" />
          <span>{{ data.course.title }}</span>
        </div>
        <h1 :id="chapterId" class="text-3xl font-bold text-highlighted scroll-mt-20">
          {{ data.chapter.title }}
        </h1>
      </div>

      <!-- 章节内容 -->
      <UeditorRender :json="data.chapter.content" />

      <!-- 上一章/下一章导航 -->
      <div class="flex items-center justify-between gap-4 pt-8 mt-8 border-t border-default">
        <NuxtLink
          v-if="prevChapter"
          :to="prevChapter.to"
          class="flex-1"
        >
          <UCard :ui="{ body: 'flex items-center gap-3' }" class="transition-all hover:ring-2 hover:ring-primary/30">
            <UIcon name="i-lucide-arrow-left" class="size-5 text-muted shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-muted mb-0.5">{{ $t('chapter.previous') }}</p>
              <p class="text-sm font-medium text-highlighted truncate">{{ prevChapter.label }}</p>
            </div>
          </UCard>
        </NuxtLink>
        <div v-else class="flex-1" />

        <NuxtLink
          v-if="nextChapter"
          :to="nextChapter.to"
          class="flex-1"
        >
          <UCard :ui="{ body: 'flex items-center gap-3 justify-end text-right' }" class="transition-all hover:ring-2 hover:ring-primary/30">
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
        <LayoutToc/>
      </div>
    </div>
  </div>

  <!-- 章节不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('chapter.notFound') }}</p>
    <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const chapterId = computed(() => route.params.cid as string)
const courseId = computed(() => route.params.id as string)
const { setToc, setEditableContent, setEditableMeta, contentVersion } = useLayoutState()
const { navigation } = useSidebarNav()

const { data: resp, pending, refresh } = cRequest.use<import('#shared/types/lms').LmsChapterPageData | null>(
  () => chapterId.value ? `/api/lms/chapters/show?id=${chapterId.value}` : '',
  { default: () => null },
)

const data = computed(() => resp.value as import('#shared/types/lms').LmsChapterPageData | null)

// 数据变化时设置 TOC + 可编辑内容
// flush: 'sync' 确保在 SSR Suspense 恢复时同步执行，
// 避免嵌套 Suspense 子组件（如 question）渲染时 editableCourseId 仍为初始值 0
watch(resp, (d) => {
  if (!d) return
  setToc(extractTocFromContent(d?.chapter?.content))
  setEditableContent(d?.chapter?.content ?? null)
  if (d?.chapter?.id) setEditableMeta('chapters', d.chapter.id, d.course.id)
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
