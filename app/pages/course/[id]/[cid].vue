<template>
  <div v-if="data" class="max-w-none">
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
        :to="`/course/${data.course.id}/${prevChapter.id}`"
        class="flex-1"
      >
        <UCard :ui="{ body: 'flex items-center gap-3' }" class="transition-all hover:ring-2 hover:ring-primary/30">
          <UIcon name="i-lucide-arrow-left" class="size-5 text-muted shrink-0" />
          <div class="min-w-0">
            <p class="text-xs text-muted mb-0.5">上一章</p>
            <p class="text-sm font-medium text-highlighted truncate">{{ prevChapter.title }}</p>
          </div>
        </UCard>
      </NuxtLink>
      <div v-else class="flex-1" />

      <NuxtLink
        v-if="nextChapter"
        :to="`/course/${data.course.id}/${nextChapter.id}`"
        class="flex-1"
      >
        <UCard :ui="{ body: 'flex items-center gap-3 justify-end text-right' }" class="transition-all hover:ring-2 hover:ring-primary/30">
          <div class="min-w-0">
            <p class="text-xs text-muted mb-0.5">下一章</p>
            <p class="text-sm font-medium text-highlighted truncate">{{ nextChapter.title }}</p>
          </div>
          <UIcon name="i-lucide-arrow-right" class="size-5 text-muted shrink-0" />
        </UCard>
      </NuxtLink>
      <div v-else class="flex-1" />
    </div>
  </div>

  <!-- 章节不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">章节不存在</p>
    <UButton :to="`/course/${courseId}`" label="返回课程" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
import type { LmsChapterPageData } from '#shared/types/lms'

const route = useRoute()
const courseId = computed(() => route.params.id as string)
const chapterId = computed(() => route.params.cid as string)

// SSR: useFetch 在服务端执行并序列化数据到客户端
const { data: resp, pending } = useFetch<{ data: LmsChapterPageData | null }>(
  () => `/api/lms/chapter/${chapterId.value}`,
)

const data = computed(() => resp.value?.data ?? null)

// 从章节内容的 tiptap JSON 中提取 heading 节点生成 TOC
const { setToc } = useLayoutState()
const tocLinks = computed(() => extractTocFromContent(data.value?.chapter.content))
watch(tocLinks, (links) => setToc(links), { immediate: true })

// 上一章 / 下一章
const prevChapter = computed(() => {
  if (!data.value) return null
  const chapters = data.value.course.chapters
  const index = chapters.findIndex((ch) => ch.id === data.value!.chapter.id)
  return index > 0 ? chapters[index - 1] : null
})

const nextChapter = computed(() => {
  if (!data.value) return null
  const chapters = data.value.course.chapters
  const index = chapters.findIndex((ch) => ch.id === data.value!.chapter.id)
  return index < chapters.length - 1 ? chapters[index + 1] : null
})
</script>
