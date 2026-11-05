import { defineNuxtModule, createResolver, addComponentsDir, addServerScanDir, addLayout, addImportsDir } from '@nuxt/kit'

/**
 * chat module
 *
 * 通用 AI 对话工作台（/chat）：
 * - 左：会话记录（chat_conversations）
 * - 中：聊天框（复用 lms 的 useChatbox / AiChatboxMessageList / AiChatboxInputBar）
 * - 右：代码运行面板（复用 base 的 ide runners：python / javascript / cpp / java / pseudocode / sql + html 预览）
 *
 * 大模型配置来源：系统设置 → lms_config.ai（llmApiUrl / llmApiKey / model / mode / thinking），
 * 通过已有的服务端代理 /api/aichat/chat 走 SSE，前端不接触 Key。
 *
 * 依赖：base（cRequest、requireAuth、cResp、ide runners）、lms（useChatbox / useAiConfig）
 * 开关：NUXT_MODULE_CHAT=false 时跳过注册（默认开启）
 */
export default defineNuxtModule({
  meta: { name: 'module-chat', configKey: 'moduleChat' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const enabled = process.env.NUXT_MODULE_CHAT !== 'false'
    if (!enabled) return

    // 注册 db schema 片段（Table: chat_conversations / chat_messages）
    nuxt.hook('hub:db:schema:extend', async ({ paths }) => {
      paths.push(resolve(`./server/db/schema.ts`))
    })

    nuxt.options.runtimeConfig.public.moduleChat = true

    // 组件（pathPrefix: true → 子目录作为前缀，如 conversationList.vue → ChatConversationList）
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // composables（useAgentChat：工具循环编排）
    addImportsDir(resolve('./composables'))

    // /chat 专用布局：header + 全宽三栏（不走 lms Layout 的 UContainer 限宽）
    addLayout(resolve('./layouts/chat.vue'), 'chat')

    nuxt.hook('pages:extend', (pages) => {
      pages.push({
        name: 'chat',
        path: '/chat',
        file: resolve('./pages/chat.vue'),
      })
      // 分享出去的只读对话页（学生生成链接给老师看）
      pages.push({
        name: 'chat-share',
        path: '/share/:token',
        file: resolve('./pages/share/[token].vue'),
      })
    })

    addServerScanDir(resolve('./server'))

    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [
          { code: 'en', file: 'en.json' },
          { code: 'cn', file: 'cn.json' },
        ],
      })
    })
  },
})
