<template>
  <div v-if="course" class="max-w-none">
    <!-- 课程头部 -->
    <div class="mb-10 pb-8 border-b border-default">
      <div class="flex items-start gap-4 mb-4">
        <div
          class="flex items-center justify-center size-14 rounded-lg shrink-0"
          :class="colorBgClass(course.color)"
        >
          <UIcon :name="course.icon" class="size-7" :class="colorTextClass(course.color)" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <UBadge :label="course.level" :color="levelColor(course.level)" variant="subtle" size="sm" />
            <span class="text-sm text-muted">{{ course.chapters.length }} 章节</span>
          </div>
          <h1 class="text-3xl font-bold text-highlighted mb-2">
            {{ course.title }}
          </h1>
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="tag in course.tags"
          :key="tag"
          :label="tag"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </div>
    </div>

    <!-- 课程内容 -->
     
    <UeditorRender :json="course.content" />

    <!-- 章节列表 -->
    <h2 id="chapters" class="text-2xl font-semibold text-highlighted mb-6 mt-12 scroll-mt-20">
      课程章节
    </h2>

    <div class="flex flex-col gap-3">
      <NuxtLink
        v-for="(chapter, index) in course.chapters"
        :key="chapter.id"
        :to="`/course/${course.id}/${chapter.id}`"
        class="group block"
      >
        <UCard
          class="transition-all hover:ring-2 hover:ring-primary/30"
          :ui="{ body: 'flex items-center gap-4' }"
        >
          <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
            {{ String(index + 1).padStart(2, '0') }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-medium text-highlighted group-hover:text-primary transition-colors">
              {{ chapter.title }}
            </h3>
          </div>
          <UIcon name="i-lucide-arrow-right" class="size-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
        </UCard>
      </NuxtLink>
    </div>
  </div>

  <!-- 课程不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">课程不存在</p>
    <UButton to="/" label="返回首页" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
import type { LmsCourseDetail } from '#shared/types/lms'

const route = useRoute()
const courseId = computed(() => route.params.id as string)

// SSR: useFetch 在服务端执行并序列化数据到客户端
const { data: resp, pending } = useFetch<{ data: LmsCourseDetail | null }>(
  () => `/api/lms/course/${courseId.value}`,
)

const course = computed(() => resp.value?.data ?? null)

// 从 tiptap JSON content 中提取 heading 节点生成 TOC，并追加「课程章节」锚点
const { setToc } = useLayoutState()
const tocLinks = computed(() => {
  const content = course.value?.content
  if (!content) return [{ id: 'chapters', text: '课程章节' }]
  return [...extractTocFromContent(content), { id: 'chapters', text: '课程章节' }]
})
watch(tocLinks, (links) => setToc(links), { immediate: true })

// 颜色工具函数
function levelColor(level: string) {
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    '入门': 'success',
    '进阶': 'warning',
    '高级': 'error',
  }
  return map[level] || 'neutral'
}

function colorTextClass(color: string) {
  const map: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    info: 'text-info',
    warning: 'text-warning',
    error: 'text-error',
    neutral: 'text-highlighted',
  }
  return map[color] || 'text-primary'
}

function colorBgClass(color: string) {
  const map: Record<string, string> = {
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    info: 'bg-info/10',
    warning: 'bg-warning/10',
    error: 'bg-error/10',
    neutral: 'bg-elevated',
  }
  return map[color] || 'bg-primary/10'
}
</script>
