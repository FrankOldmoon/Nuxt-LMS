<template>
  <div v-if="course" class="flex gap-8">
    <!-- 左侧主内容 -->
    <div class="flex-1 min-w-0 max-w-none">
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
              <span class="text-sm text-muted">{{ $t('course.chapters', { count: course.chapters.length }) }}</span>
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
        {{ $t('course.chapterList') }}
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

    <!-- 右侧目录（桌面端显示，滚动时固定） -->
    <div class="hidden lg:block w-56 shrink-0">
      <div class="sticky top-20">
        <LayoutToc/>
      </div>
    </div>
  </div>

  <!-- 课程不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('course.notFound') }}</p>
    <UButton to="/" :label="$t('course.backToHome')" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
const { course, pending } = useCourseDetail()

// 颜色工具函数
const { t } = useI18n()

function levelColor(level: string) {
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    [t('home.levels.beginner')]: 'success',
    [t('home.levels.intermediate')]: 'warning',
    [t('home.levels.advanced')]: 'error',
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
