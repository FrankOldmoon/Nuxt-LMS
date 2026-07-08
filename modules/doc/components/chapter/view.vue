<template>
  <!-- 章节内容 -->
  <div v-if="data" class="flex gap-8">
    <!-- 左侧主内容 -->
    <div class="flex-1 min-w-0 max-w-none">
      <!-- 章节访问控制栏（lms 等模块通过 slot 注入） -->
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

    <!-- 右下角 AI 章节助教 + VRM 数字人（响应式：大屏并排，小屏数字人在下方） -->
    <div class="fixed bottom-16 right-6 z-50 flex flex-col items-end gap-3">
      <Transition enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 translate-y-4 scale-95">
        <div v-if="assistantOpen" class="flex flex-col lg:flex-row gap-3 items-end lg:items-start">
          <!-- VRM 数字人（大屏在左，小屏在下方） -->
          <ClientOnly>
            <AiVrm
              v-if="vrmVisible"
              class="order-2 lg:order-1"
              @close="vrmVisible = false"
            />
          </ClientOnly>
          <!-- 聊天框（大屏在右，小屏在上方） -->
          <div
            class="order-1 lg:order-2 w-[400px] max-w-[calc(100vw-3rem)] bg-default rounded-xl shadow-2xl border border-default overflow-hidden">
            <div class="p-3">
              <AiLlm
                :show-settings="false"
                :title="$t('ai.chapterAssistant')"
                :preset="assistantPreset"
                :opening="assistantOpening"
                :ai-config="data?.course?.ai"
                @chunk="onAssistantChunk"
                @user-message="onAssistantUserMessage"
              />
            </div>
          </div>
        </div>
      </Transition>
      <UButton
        :icon="assistantOpen ? 'i-lucide-x' : 'i-lucide-bot'"
        color="primary"
        size="xl"
        class="rounded-full shadow-lg size-14 flex items-center justify-center"
        :title="$t('ai.chapterAssistantHint')"
        :aria-label="$t('ai.chapterAssistant')"
        @click="toggleAssistant"
      />
    </div>
  </div>

  <!-- 章节不存在 -->
  <div v-else-if="!pending && notFound" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('chapter.notFound') }}</p>
    <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
  </div>

  <!-- 章节未开放（lms 等模块通过 extraCondition + #locked slot 注入内容） -->
  <div v-else-if="!pending && extraCondition" class="flex flex-col items-center justify-center py-20">
    <slot name="locked">
      <UIcon name="i-lucide-lock" class="size-12 text-muted mb-4" />
      <p class="text-lg text-muted mb-4">{{ $t('chapter.notOpen') }}</p>
      <UButton :to="`/course/${courseId}`" :label="$t('chapter.backToCourse')" color="primary" variant="outline" />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { feedVrmText, clearVrmSpeech } from '../../utils/vrm'

interface ChapterViewProps {
  data: any
  pending: boolean
  notFound: boolean
  prevChapter: any
  nextChapter: any
  chapterId: string | number
  courseId: string | number
  /** 额外的"未开放"条件（lms 通过 403 判断），触发 #locked slot 渲染 */
  extraCondition?: boolean
}

const props = withDefaults(defineProps<ChapterViewProps>(), {
  extraCondition: false,
})

const { siteTitle } = useSiteConfig()

// 设置页面标题
useHead(computed(() => ({
  title: props.data?.chapter?.title ? `${props.data.chapter.title} - ${siteTitle.value}` : siteTitle.value,
})))

// ===================== AI 章节助教 =====================
const assistantOpen = ref(false)
const vrmVisible = ref(true)

function toggleAssistant() {
  assistantOpen.value = !assistantOpen.value
  if (assistantOpen.value) {
    vrmVisible.value = true
  } else {
    clearVrmSpeech()
  }
}

function onAssistantChunk(content: string) {
  feedVrmText(content)
}

function onAssistantUserMessage() {
  clearVrmSpeech()
}

// 章节文本作为知识库（本地小模型上下文有限，截断至 6000 字符约 3-4k tokens）
const CHAPTER_KB_MAX_CHARS = 6000

const assistantPreset = computed(() => {
  const chapter = props.data?.chapter
  if (!chapter) return ''
  const title = chapter.title || ''
  const chapterText = extractPlainText(chapter.content, CHAPTER_KB_MAX_CHARS)
  return [
    `You are a professional lecturer for the chapter <${title}>, proficient in all knowledge points in this chapter.`,
    '',
    'Below is the full content of this chapter, which shall serve as the only basis for your answers:',
    '',
    chapterText,
    '',
    'Answer Specifications:',
    '1. Be concise and to the point, avoid lengthy elaboration.',
    '2. Use appropriate metaphors and analogies to visualize abstract concepts.',
    '3. Answer strictly based on the above chapter content; frankly inform the user and provide guidance if the question goes beyond the scope of this chapter.',
    '4. Respond in English; professional terminology may be retained.'
  ].join('\n')
})

const assistantOpening = computed(() => {
  const title = props.data?.chapter?.title || 'this chapter'
  return `Hello! I am your AI teaching assistant for <${title}>. I have loaded all content of this chapter. Feel free to ask me any questions about difficult knowledge points. I will help you understand relevant knowledge with concise explanations and vivid metaphors.`
})
</script>
