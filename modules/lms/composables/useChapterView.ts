import { provide, inject, type InjectionKey } from 'vue'
import { feedVrmText, clearVrmSpeech } from '../utils/vrm'
import { allPrompts } from '../components/ueditor/extensions/nodes/vue/question/edit/prompts.js'

export interface ChapterViewProps {
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

type ChapterViewCtx = ReturnType<typeof useChapterView>

const ChapterViewKey: InjectionKey<ChapterViewCtx> = Symbol('ChapterView')

/** 章节详情视图：页面标题 + AI 章节助教（流式聊天 + VRM + AI Notes 自动保存） */
export function useChapterView(props: ChapterViewProps) {
  const { siteTitle } = useSiteConfig()
  const { chapterPage: chapterPageCfg } = useLmsPublicConfig()

  useHead(computed(() => ({
    title: props.data?.chapter?.title ? `${props.data.chapter.title} - ${siteTitle.value}` : siteTitle.value,
  })))

  // ===================== AI 章节助教 =====================
  const assistantOpen = ref(false)
  const vrmVisible = ref(false)
  const aiLlmRef = ref<any>(null)

  const aiRecord = ref<Record<string, any>>({ type: 'doc', content: [] })

  function normalizeRecord(raw: any): Record<string, any> {
    if (!raw) return { type: 'doc', content: [] }
    if (raw.type === 'doc') return raw
    if (raw.content && raw.content.type === 'doc') return raw.content
    return { type: 'doc', content: [] }
  }

  watch(() => props.data?.chapter?.record, (raw) => {
    if (raw) aiRecord.value = normalizeRecord(raw)
  }, { immediate: true })

  const aiEnabled = computed(() => props.data?.course?.ai?.enabled !== false)

  function toggleAssistant() {
    assistantOpen.value = !assistantOpen.value
    if (assistantOpen.value) {
      vrmVisible.value = false
    } else {
      clearVrmSpeech()
    }
  }

  const streamingFullContent = ref('')
  const lastNotesContent = ref<string | null>(null)

  function splitNotesContent(content: string): { chat: string; notes: string | null } {
    const closedRegex = /<notes>\s*([\s\S]*?)<\/notes>/g
    const closedMatches = [...content.matchAll(closedRegex)]
    if (closedMatches.length > 0) {
      const notes = closedMatches[closedMatches.length - 1]![1].trim()
      const chat = content.replace(/<notes>\s*[\s\S]*?<\/notes>/g, '').trim()
      return { chat, notes }
    }
    const openMatch = content.match(/<notes>\s*([\s\S]*)$/)
    if (openMatch) {
      const notes = openMatch[1]!.trim()
      const chat = content.replace(/<notes>\s*[\s\S]*$/, '').trim()
      return { chat, notes }
    }
    return { chat: content, notes: null }
  }

  function onAssistantChunk(content: string) {
    streamingFullContent.value += content
    const full = streamingFullContent.value
    const lastOpen = full.lastIndexOf('<notes>')
    const lastClose = full.lastIndexOf('</notes>')
    const insideNotes = lastOpen !== -1 && lastOpen > lastClose
    if (!insideNotes && !content.includes('<notes>') && !content.includes('</notes>')) {
      feedVrmText(content)
    }

    const { chat, notes } = splitNotesContent(full)
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

  function onAssistantMessage(msg: any) {
    if (msg.role !== 'assistant') return
    try {
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
    streamingFullContent.value = ''
    lastNotesContent.value = null
  }

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

  const assistantPreset = computed(() => {
    const chapter = props.data?.chapter
    if (!chapter) return ''
    const title = chapter.title || ''
    return [
      `You are a professional lecturer for the chapter <${title}>, proficient in all knowledge points in this chapter.`,
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
      '2. The document content wrapped in <notes> and </notes> tags. Normally, <notes> should includes only one ##Summary and paragraph, and one Question.',
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

  const aiConfig = computed(() => props.data?.course?.ai)

  const ctx = {
    chapterPageCfg, aiEnabled, aiConfig, assistantOpen, vrmVisible, aiLlmRef, aiRecord,
    toggleAssistant, onAssistantChunk, onAssistantUserMessage, onAssistantMessage,
    saveRecord, assistantPreset, assistantOpening,
  }
  provide(ChapterViewKey, ctx)
  return ctx
}

export function useChapterViewContext(): ChapterViewCtx {
  const ctx = inject(ChapterViewKey)
  if (!ctx) throw new Error('useChapterViewContext must be used within ChapterView')
  return ctx
}
