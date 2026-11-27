<template>
  <div class="flex gap-2" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
    <!-- 自己的消息用本人头像（带头像框）；AI 消息保留机器人图标 -->
    <AvatarWithFrame
      v-if="msg.role === 'user'"
      :src="user?.avatarImg || undefined"
      :alt="userName"
      :text="userInitial"
      size="28px"
    />
    <div v-else class="shrink-0 size-7 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
      <UIcon name="i-lucide-bot" class="size-4" />
    </div>
    <div class="max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed"
      :class="msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'">
      <!-- 思考过程（可折叠） -->
      <div v-if="msg.reasoning" class="mb-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
        <div class="flex items-center gap-1 cursor-pointer select-none hover:opacity-70" @click="toggleReasoning(idx)">
          <UIcon :name="msg._reasoningExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-gray-400" />
          <span class="text-xs text-gray-400 dark:text-gray-500">{{ t('ueditor.aichatReasoning') }}</span>
        </div>
        <div v-if="msg._reasoningExpanded" class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed" v-html="renderContent(msg.reasoning)" />
      </div>
      <!-- 消息内容：用户消息按纯文本渲染（保留换行），assistant 才走富文本 -->
      <p v-if="msg.role === 'user'" class="whitespace-pre-wrap break-words">{{ textOf(msg) }}</p>
      <ueditorRender v-else :json="contentForRender(msg)" :markdown="!msg._streaming" />
      <!-- 朗读按钮（仅 assistant 文本消息） -->
      <div v-if="canSpeak(msg)" class="flex justify-end mt-1">
        <button type="button" class="text-xs flex items-center gap-1 transition-colors"
          :class="speakingIdx === idx ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'"
          @click="toggleSpeakMessage(idx)">
          <UIcon :name="speakingIdx === idx ? 'i-lucide-square' : 'i-lucide-volume-2'" class="size-3" />
          <span>{{ speakingIdx === idx ? t('ai.stopSpeaking') : t('ai.speak') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ msg: ChatMessage; idx: number }>()

const { t } = useI18n()
const { renderContent, toggleReasoning, canSpeak, toggleSpeakMessage, speakingIdx } = useChatboxContext()

// 用户消息头像：优先真实头像，无图时退回首字母
const { user } = useAuth()
const userName = computed(() => user.value?.name || user.value?.username || '')
const userInitial = computed(() => userName.value.trim().slice(0, 1).toUpperCase() || '?')

/** 用户消息一律是字符串；兜底防止非字符串内容渲染成 [object Object] */
function textOf(msg: ChatMessage) {
  return typeof msg.content === 'string' ? msg.content : String(msg.content ?? '')
}

/**
 * 裸 URL → markdown 链接
 *
 * 模型偶尔会把地址写成纯文本，渲染前兜底一次，保证回复里的 http(s) 地址都可点击。
 * 代码块、行内代码、已有链接/图片先用占位符保护，避免被二次包裹。
 */
function linkifyUrls(text: string): string {
  const stash: string[] = []
  const keep = (s: string) => `\u0000${stash.push(s) - 1}\u0000`
  const out = text
    .replace(/```[\s\S]*?```/g, keep)
    .replace(/`[^`\n]*`/g, keep)
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, keep)
    // 只匹配 URL 合法字符：中文/全角标点会自然截断，避免把「，请访问」吞进链接
    .replace(/https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g, (m) => {
      // 句末标点留在链接外，避免把「。」「，」也变成链接的一部分
      const hit = m.match(/^(.*?)([.,;:!?。，；：！？)\]】]*)$/)
      const url = hit ? hit[1] : m
      const tail = hit ? hit[2] : ''
      return `[${url}](${url})${tail}`
    })
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)] ?? '')
}

/** 只有非流式的 markdown 字符串需要兜底；tiptap JSON 原样交给渲染器 */
function contentForRender(msg: ChatMessage) {
  const c: any = msg.content
  return typeof c === 'string' && !msg._streaming ? linkifyUrls(c) : c
}
</script>
