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

    <!-- 右侧目录（桌面端显示，滚动时固定）：chapterPage.showOutline 关闭时隐藏 -->
    <div v-if="chapterPageCfg.showOutline" class="hidden lg:block w-56 shrink-0">
      <div class="sticky top-20">
        <UPageAside>
          <LayoutToc />
        </UPageAside>
      </div>
    </div>

    <!-- 右下角 AI 章节助教 + VRM 数字人（响应式：大屏并排，小屏数字人在下方） -->
    <div v-if="aiEnabled" class="fixed bottom-16 right-6 z-50 flex flex-col items-end gap-3">
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
                ref="aiLlmRef"
                :show-settings="false"
                :title="$t('ai.chapterAssistant')"
                :preset="assistantPreset"
                :opening="assistantOpening"
                :ai-config="data?.course?.ai"
                @chunk="onAssistantChunk"
                @user-message="onAssistantUserMessage"
                @message="onAssistantMessage"
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
import { allPrompts } from '../ueditor/extensions/nodes/vue/question/edit/prompts.js'

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

// lms 公开配置：chapterPage.* 控制章节页显隐
// 教学/笔记/弹幕/全屏等开关在父页面 pages/course/[id]/[cid].vue 已应用到 layout state
// 此处 chapterPageCfg.showOutline 用于本地右侧目录（LayoutToc）显隐
const { chapterPage: chapterPageCfg } = useLmsPublicConfig()

// 设置页面标题
useHead(computed(() => ({
  title: props.data?.chapter?.title ? `${props.data.chapter.title} - ${siteTitle.value}` : siteTitle.value,
})))

// ===================== AI 章节助教 =====================
const assistantOpen = ref(false)
const vrmVisible = ref(false)
const aiLlmRef = ref<any>(null)

// AI 生成内容（tiptap JSON），从 user_chapters.record 加载
const aiRecord = ref<Record<string, any>>({ type: 'doc', content: [] })

/** 将 record 归一化为 tiptap JSON doc 对象（兼容旧 aicontent { content, messages } 格式） */
function normalizeRecord(raw: any): Record<string, any> {
  if (!raw) return { type: 'doc', content: [] }
  // 新格式：直接是 tiptap JSON doc
  if (raw.type === 'doc') return raw
  // 旧 aicontent 格式：{ content: tiptapJSON, messages: [] }
  if (raw.content && raw.content.type === 'doc') return raw.content
  return { type: 'doc', content: [] }
}

// 从服务端数据加载 record
watch(() => props.data?.chapter?.record, (raw) => {
  if (raw) aiRecord.value = normalizeRecord(raw)
}, { immediate: true })

// 全局 lms_config.ai.enabled 关闭时不渲染 AI 助教按钮与聊天框
// 默认 true（兼容未配置场景），只有显式 false 才视为关闭
const aiEnabled = computed(() => {
  return props.data?.course?.ai?.enabled !== false
})

function toggleAssistant() {
  assistantOpen.value = !assistantOpen.value
  if (assistantOpen.value) {
    vrmVisible.value = false
  } else {
    clearVrmSpeech()
  }
}

// 流式累积：完整 AI 响应（含 <notes> 标签），用于实时分离聊天/笔记内容
const streamingFullContent = ref('')
const lastNotesContent = ref<string | null>(null)

/** 将内容分离为聊天部分（<notes> 外）和笔记部分（<notes> 内） */
function splitNotesContent(content: string): { chat: string; notes: string | null } {
  // 优先匹配闭合的 <notes>...</notes> 块（取最后一个）
  const closedRegex = /<notes>\s*([\s\S]*?)<\/notes>/g
  const closedMatches = [...content.matchAll(closedRegex)]
  if (closedMatches.length > 0) {
    const notes = closedMatches[closedMatches.length - 1][1].trim()
    const chat = content.replace(/<notes>\s*[\s\S]*?<\/notes>/g, '').trim()
    return { chat, notes }
  }
  // 未闭合的 <notes> 块（流式中途或 AI 忘记关闭标签时容错）
  const openMatch = content.match(/<notes>\s*([\s\S]*)$/)
  if (openMatch) {
    const notes = openMatch[1].trim()
    const chat = content.replace(/<notes>\s*[\s\S]*$/, '').trim()
    return { chat, notes }
  }
  // 无 <notes> 块
  return { chat: content, notes: null }
}

function onAssistantChunk(content: string) {
  streamingFullContent.value += content

  // VRM 仅朗读 <notes> 外的口语化内容
  const full = streamingFullContent.value
  const lastOpen = full.lastIndexOf('<notes>')
  const lastClose = full.lastIndexOf('</notes>')
  const insideNotes = lastOpen !== -1 && lastOpen > lastClose
  if (!insideNotes && !content.includes('<notes>') && !content.includes('</notes>')) {
    feedVrmText(content)
  }

  // 实时分离：聊天框只显示口语化部分，<notes> 内容实时渲染到 AI Notes
  const { chat, notes } = splitNotesContent(full)

  // 更新聊天框消息（隐藏 <notes> 内容）
  const msgs = aiLlmRef.value?.getMessages()
  if (msgs) {
    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')
    if (lastAssistant) {
      const displayContent = chat || '...'
      if (lastAssistant.content !== displayContent) {
        lastAssistant.content = displayContent
        aiLlmRef.value?.refreshMessages()
      }
    }
  }

  // 更新 AI Notes 面板（仅在 notes 内容变化时，避免多余重渲染）
  if (notes !== null && notes !== lastNotesContent.value) {
    lastNotesContent.value = notes
    aiRecord.value = markdownToTiptap(notes)
    saveRecord()
  }
}

function onAssistantUserMessage() {
  clearVrmSpeech()
  streamingFullContent.value = ''
  lastNotesContent.value = null
}

// AI 助教消息处理：流式结束后最终保存
function onAssistantMessage(msg: any) {
  if (msg.role !== 'assistant') return

  try {
    // 最终提取（确保最后一块内容被处理，回退到 msg.content）
    const fullContent = streamingFullContent.value || (typeof msg.content === 'string' ? msg.content : '')
    const { chat, notes } = splitNotesContent(fullContent)
    if (notes !== null) {
      aiRecord.value = markdownToTiptap(notes)
      msg.content = chat || '...'
      aiLlmRef.value?.refreshMessages()
      saveRecord()
    }
  } catch (e) {
    console.error('[onAssistantMessage] error:', e)
  }

  // 重置流式累积
  streamingFullContent.value = ''
  lastNotesContent.value = null
}

// 防抖保存 record 到 user_chapters.record
let saveTimer: ReturnType<typeof setTimeout> | null = null
function saveRecord() {
  if (!import.meta.client || !props.chapterId) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    cRequest('/api/chapters/record', {
      method: 'POST',
      body: {
        chapter_id: Number(props.chapterId),
        record: aiRecord.value,
      },
    }).catch(() => {})
  }, 1000)
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
    '4. Respond in English; professional terminology may be retained.',
    '',
    '## Content Generation',
    'When the user asks you to generate, summarize, or organize content (notes, summaries, practice questions, etc.), split your response into two parts:',
    '1. A brief conversational reply (1-3 sentences) explaining what you generated.',
    '2. The document content wrapped in <notes> and </notes> tags.',
    '',
    'Example:',
    'Here are the key points summarized as notes:',
    '',
    '<notes>',
    '## Summary',
    'Your markdown content here...',
    '',
    '```question',
    '{ "type": "single", "name": "...", "content": "...", "options": [], "answer": [] }',
    '```',
    '</notes>',
    '',
    'Rules:',
    '- Text outside <notes> tags is shown as conversational chat in the chatbox.',
    '- Content inside <notes> tags replaces any previously generated document content in the AI Notes panel.',
    '- You may embed interactive questions inside the document using the `question` code-fence syntax (3 backticks). The fence content MUST be a single JSON object describing one question.',
    '',
    'Question JSON schema and per-type formats:',
    '',
    allPrompts(),
    '',
    'Important:',
    '- The `type` field must be one of the supported types listed above.',
    '- The `answer` field must be logically correct and consistent with the question.',
    '- The `content`, `options` and `explanation` fields may use markdown syntax for text-based types.',
    '- Keep prose concise and well-structured.',
  ].join('\n')
})

const assistantOpening = computed(() => {
  const title = props.data?.chapter?.title || 'this chapter'
  return `Hello! I am your AI teaching assistant for <${title}>. I have loaded all content of this chapter. Feel free to ask me any questions about difficult knowledge points. I will help you understand relevant knowledge with concise explanations and vivid metaphors.`
})
</script>
