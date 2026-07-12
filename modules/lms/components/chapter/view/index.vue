<template>
  <!-- 章节内容 -->
  <div v-if="data" class="flex gap-8">
    <!-- 左侧主内容 -->
    <div class="flex-1 min-w-0 max-w-none">
      <slot name="access-bar" />

      <!-- 章节头部 -->
      <div class="mb-8 pb-6 border-b border-default">
        <div class="flex items-center gap-2 text-sm text-muted mb-3">
          <UIcon :name="data.course.icon" class="size-4" />
          <span>{{ data.course.title }}</span>
        </div>
        <div class="flex items-center justify-between gap-4">
          <h1 :id="String(chapterId)" class="text-3xl font-bold text-highlighted scroll-mt-20">
            {{ data.chapter.title }}
          </h1>
        </div>
      </div>

      <UeditorRender :json="data.chapter.content" :course-id="courseId" />

      <!-- AI 生成内容（用户可编辑，禁止切换纯文本模式） -->
      <div class="mt-8 pt-6 border-t border-default">
        <h2 class="text-lg font-semibold mb-3">{{ $t('chapter.aiContent') }}</h2>
        <RichEditor v-model="aiRecord" :allow-text-mode="false" @update:model-value="saveRecord" />
      </div>

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

    <!-- 右侧目录（chapterPage.showOutline 关闭时隐藏） -->
    <div v-if="chapterPageCfg.showOutline" class="hidden lg:block w-56 shrink-0">
      <div class="sticky top-20"><UPageAside><LayoutToc /></UPageAside></div>
    </div>

    <!-- AI 章节助教 + VRM 数字人 -->
    <ChapterViewAiAssistant />
  </div>

  <!-- 章节不存在 -->
  <div v-else-if="!pending && notFound" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('chapter.notFound') }}</p>
    <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
  </div>

  <!-- 章节未开放 -->
  <div v-else-if="!pending && extraCondition" class="flex flex-col items-center justify-center py-20">
    <slot name="locked">
      <UIcon name="i-lucide-lock" class="size-12 text-muted mb-4" />
      <p class="text-lg text-muted mb-4">{{ $t('chapter.notOpen') }}</p>
      <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
    </slot>
  </div>
</template>

<script setup lang="ts">
import type { ChapterViewProps } from '../../../composables/useChapterView'

const props = withDefaults(defineProps<ChapterViewProps>(), { extraCondition: false })
const { chapterPageCfg, aiRecord, saveRecord } = useChapterView(props)
</script>
