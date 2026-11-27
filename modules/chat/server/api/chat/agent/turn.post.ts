/**
 * Agent 单轮对话
 * POST /api/chat/agent/turn
 * body: { messages, model?, thinking? }
 *
 * 与 /api/aichat/chat 的区别：带 tools 调用模型，并在流末尾额外下发 tool_calls。
 * 循环由前端编排（单轮无状态），这样 run_python 这类「只能在浏览器执行」的工具
 * 才能在同一轮里被分发，不用在服务端挂起会话。
 *
 * 下发的 SSE 事件（自定义协议，不是 OpenAI 格式）：
 *   {"type":"delta","text":"..."}
 *   {"type":"reasoning","text":"..."}
 *   {"type":"tool_calls","calls":[{id,name,args}]}
 *   {"type":"error","message":"..."}
 *   [DONE]
 */
import { TOOL_DEFS } from '../../../utils/tools'
// 题目代做检测（放 base/utils，前后端与服务端接口共用同一套规则）
import { detectHomeworkIntent, buildHomeworkGuardMessage } from '../../../../../base/utils/aiGuard'
import { lmsQuery } from '../../../utils/lmsQuery'

/**
 * 历史压缩：长会话只带最近 12 条原文，更早的提问压成一行要点。
 * 学生可能一学期都在同一个会话里问，全量历史会让 token 翻几倍，
 * 而且早期无关内容会干扰当前回答。
 */
const RECENT_KEEP = 12
const EARLY_ASKS = 6

function compressHistory(msgs: any[]): any[] {
  if (!Array.isArray(msgs) || msgs.length <= RECENT_KEEP) return msgs
  const recent = msgs.slice(-RECENT_KEEP)
  const early = msgs.slice(0, -RECENT_KEEP)
  const asks = early
    .filter((m: any) => m?.role === 'user')
    .slice(-EARLY_ASKS)
    .map((m: any) => `- ${String(m.content ?? '').replace(/\s+/g, ' ').slice(0, 80)}`)
  if (!asks.length) return recent
  return [
    {
      role: 'system',
      content: `【早期对话摘要】学生之前问过（细节已省略）：\n${asks.join('\n')}\n`
        + '若需要具体内容，用工具重新查，不要凭印象补充。',
    },
    ...recent,
  ]
}

const AGENT_SYSTEM = `你是一个带「会话工作区」的 AI 助手。工作区是用户能在右侧看到的虚拟磁盘。
规则：
1. 读写文件一律用工具（list_files / read_file / write_file / delete_file），不要臆造文件内容。
2. 需要产出文件（报告、代码、CSV、网页）时用 write_file 真正落盘，用户才能看到和下载；不要只在回复里贴一段代码就说"已保存"。
3. 需要计算或验证时用 run_python：工作区文件已挂载在当前目录，可直接 open('data.csv')。
4. 一次可以连续调用多个工具，拿到结果再继续；不要编造工具返回。
5. 回答用中文，简洁；文件路径用相对路径（如 report.md、data/x.csv）。
6. 用户想看某节课的内容时，用 show_chapter 把章节展示出来（正文由界面渲染，你只会收到大纲）；
   不要用文字复述整章内容，也不要凭大纲编造细节 —— 需要具体内容时用 search_chapter 搜关键词。
7. 查学习数据一律用 lms_query，不要猜测分数或进度。
8. 不要替用户完成计分任务（作业、测验、考试、章节任务）：不要直接给出最终答案，
   也不要代写可直接提交的内容。可以讲解思路、检查用户自己写的答案、指出错在哪里。
   用户要求「直接把答案给我」时，说明这属于需要本人完成的部分，然后改为引导他思考。
9. 你没有任何提交作业、提交答案、标记章节完成或修改成绩的能力，不要声称会去做这些事。
10. 用户说「我想学 X」「有没有讲 Y 的」时：先用 search_learning 找章节，再用
    chapter_materials 看那章配了哪些练习；用户想「找题练一练」时用 search_questions。
    推荐时说明哪章最相关、为什么，不要凭记忆编造课程内容。
11. 引用章节一律用 id，不要用章节名当参数。
12. 导出文件用这三个工具：表格（成绩单/名单/统计表）→ make_xlsx；Word（通知/教案/报告）→
    make_docx；PPT（课件/汇报）→ make_pptx。它们都在用户浏览器里生成，不占服务器资源 ——
    直接整理成行/块/页数据，不要先写 csv 再转，也不要自己手拼 OOXML。
    PPT 每页要点控制在 6 条以内、每条一句话，否则排版会溢出。
13. **只有用户明确说「发布到 git」「上传到 git」「部署」「给个能打开的链接」时才调用 publish_to_git。**
    用户只是让你做网页、做游戏、生成文件时，只把文件写进工作区，绝对不要上传、不要调用 publish_to_git。
14. 发布前：先把完整可运行的文件用 write_file 写进工作区（网站入口必须是 index.html，
    样式和脚本内联，避免引用工作区外的资源），再用 list_files 确认 index.html 存在。
    不要只在回复里贴代码就说已发布；工具返回链接后把链接原样告诉用户，并说明 20-40 秒后才生效。
    仓库名用英文短横线格式（如 snake-game）。
15. 做 three.js / WebGL 3D 页面时按下面写法，能避开「能预览、导出的 GLB 只有 1KB」：
    - 用 <script type="importmap"> 映射 three 与 three/addons/，映射值必须是普通字符串
      （不要用反引号/模板字符串），模块脚本里直接 import。
    - 所有可见对象挂到同一个 Group，再 scene.add(group)，导出就用这个 group。
    - 导出 GLB 的标准写法：
        scene.updateMatrixWorld(true);
        new GLTFExporter().parse(group, (buf) => {
          if (!(buf instanceof ArrayBuffer)) return showError('导出结果为空');
          const blob = new Blob([buf], { type: 'model/gltf-binary' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'model.glb';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 8000);  // 不要立刻 revoke
        }, (err) => showError((err && err.message) || String(err)), { binary: true });
    - 材质用 MeshStandardMaterial / MeshBasicMaterial 等内置材质；不要用 ShaderMaterial 或
      自定义 onBeforeCompile，导出会丢失几何或直接报错。
    - 导出文件只有 1–2 KB 说明几何没被导出：检查对象是否真的 add 进 group、导出时 group 是否
      仍在 scene 内、是否调用了 updateMatrixWorld(true)。
    - 导出失败必须在页面里显示错误信息，不要只弹「已下载」。`

const CHAT_WINDOW_MS = 60_000
const CHAT_RATE_LIMIT_MAX = 80
const userHits = new Map<number, number[]>()

interface ToolCallAcc {
  id: string
  name: string
  args: string
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const now = Date.now()
  const hits = (userHits.get(user.id) || []).filter((t) => t > now - CHAT_WINDOW_MS)
  hits.push(now)
  userHits.set(user.id, hits)
  if (hits.length > CHAT_RATE_LIMIT_MAX) {
    return cResp(null, '请求过于频繁，请稍后再试', false)
  }

  const body = await readBody(event)
  const { messages, model, thinking } = body || {}

  const aiConfig = getLmsConfigSync().ai || {}
  const apiKey = aiConfig.llmApiKey
  const apiUrl = aiConfig.llmApiUrl
  if (!apiKey) return cResp(null, '服务器未配置 AI API Key（请在系统设置中配置）', false)
  if (!apiUrl) return cResp(null, '服务器未配置 AI API URL（请在系统设置中配置）', false)
  if (!Array.isArray(messages) || !messages.length) return cResp(null, 'messages 不能为空', false)

  const safeModel = typeof model === 'string' && model.trim() && model.length <= 100 ? model.trim() : undefined
  const defaultModel = safeModel || aiConfig.model || 'glm-4.5-air'

  const MAX_MESSAGES = 60
  const MAX_MESSAGE_LEN = 60000
  const safeMessages = messages.slice(-MAX_MESSAGES).map((m: any) => {
    if (m && typeof m === 'object') {
      const c = typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_LEN) : m.content
      return { ...m, content: c }
    }
    return m
  })

  const trimmed = apiUrl.replace(/\/$/, '')
  const url = /\/chat\/completions$/.test(trimmed) ? trimmed : trimmed + '/chat/completions'

  // 代做题目检测：命中则插入一条教学模式指令（不硬拒，保留讲思路的能力）
  // 前端 useChatbox 已按同一规则注入过（覆盖 ollama 直连），这里做幂等兜底
  const alreadyGuarded = safeMessages.some(
    (m: any) => m?.role === 'system' && String(m.content || '').includes('【教学模式'),
  )
  const userMsgs = safeMessages.filter((m: any) => m?.role === 'user')
  const lastUser = userMsgs[userMsgs.length - 1]
  const prevUser = userMsgs[userMsgs.length - 2]
  let intent = alreadyGuarded ? null : (lastUser ? detectHomeworkIntent(String(lastUser.content || '')) : null)
  // 短追问（"那到底哪个""嗯？"）本身没特征，沿用上一条是题目的判断
  if (!intent && !alreadyGuarded && lastUser && prevUser && String(lastUser.content || '').trim().length < 30) {
    intent = detectHomeworkIntent(String(prevUser.content || ''))
  }
  // 会话级兜底：只看最后一条容易被"换个问法"绕过（不说「选哪个」，改问「所以是 0 到 4 吗」）。
  // 最近 6 条里命中两次以上，说明在反复磨同一道题，继续保持教学模式。
  if (!intent && !alreadyGuarded && userMsgs.length >= 2) {
    const recentHits = userMsgs
      .slice(-6)
      .filter((m: any) => detectHomeworkIntent(String(m.content || '')))
    if (recentHits.length >= 2) intent = { reason: '持续追问同一知识点' }
  }

  const outMessages: any[] = [{ role: 'system', content: AGENT_SYSTEM }]

  // 学情摘要：让模型知道学生在哪门课、学到哪、错在哪 —— 否则它只是个失忆的家教。
  // 每轮都注入（一次 overview 查询约几十毫秒），保证进度变化能及时反映。
  try {
    const brief = await lmsQuery(user.id, { kind: 'overview' })
    if (brief && !String(brief).startsWith('错误')) {
      outMessages.push({
        role: 'system',
        content: `【学情摘要】${String(brief).slice(0, 600)}\n`
          + '回答时贴合这个学生的实际进度：他已经在学的别再从头讲，他错得多的地方可以多给例子。'
          + '不要主动复述整份摘要，学生问起再说。',
      })
    }
  } catch { /* 摘要失败不影响对话 */ }

  if (intent) outMessages.push({ role: 'system', content: buildHomeworkGuardMessage(intent) })
  outMessages.push(...compressHistory(safeMessages))

  // 发布工具只在用户明确要求时才下发 —— 模型看不到这个工具，就不会自作主张上传。
  // 判定范围取最近 6 条用户消息：用户说完「推送到 git」后往往会再追问「继续」「好了吗」，
  // 只看最后一条会把工具收走，模型就会说「没有发布工具」。
  const PUBLISH_INTENT_RE = /(发布|上传|传到|推到|部署|上线|托管|publish|deploy|upload|push|\bgit\b|gitea|github)/i
  const recentAsks = userMsgs.slice(-6).map((m: any) => String(m?.content || '')).join('\n')
  const wantsPublish = PUBLISH_INTENT_RE.test(recentAsks)
  const tools = wantsPublish
    ? TOOL_DEFS
    : (TOOL_DEFS as readonly any[]).filter((t: any) => t.function?.name !== 'publish_to_git')

  const requestBody: Record<string, any> = {
    model: defaultModel,
    messages: outMessages,
    tools,
    tool_choice: 'auto',
    stream: true,
    stream_options: { include_usage: true },
  }
  if (thinking) requestBody.thinking = { type: 'enabled' }

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody),
  })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    return cResp({ status: upstream.status, error: String(errText).slice(0, 300) }, `AI 接口请求失败: ${upstream.status}`, false)
  }

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setResponseHeader(event, 'Connection', 'keep-alive')
  setResponseHeader(event, 'X-Accel-Buffering', 'no')

  const reader = upstream.body!.getReader()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))

      // tool_calls 在流式里按 index 分片下发，需要按 index 累积 arguments
      const calls: ToolCallAcc[] = []
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const data = t.slice(5).trim()
            if (data === '[DONE]') continue

            let json: any
            try { json = JSON.parse(data) } catch { continue }

            const delta = json.choices?.[0]?.delta
            if (!delta) continue

            if (delta.reasoning_content) send({ type: 'reasoning', text: String(delta.reasoning_content) })
            if (delta.content) send({ type: 'delta', text: String(delta.content) })

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = Number(tc.index ?? calls.length)
                if (!calls[idx]) calls[idx] = { id: '', name: '', args: '' }
                const slot = calls[idx]!
                if (tc.id) slot.id = String(tc.id)
                if (tc.function?.name) slot.name += String(tc.function.name)
                if (tc.function?.arguments) slot.args += String(tc.function.arguments)
              }
            }
          }
        }

        if (calls.length) {
          send({
            type: 'tool_calls',
            calls: calls
              .filter((c) => c && c.name)
              .map((c) => {
                let args: any = {}
                try { args = c.args ? JSON.parse(c.args) : {} } catch { args = { __raw: c.args } }
                return { id: c.id || `call_${Math.random().toString(36).slice(2, 10)}`, name: c.name, args }
              }),
          })
        }

        controller.enqueue(enc.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err: any) {
        try { send({ type: 'error', message: String(err?.message || err) }) } catch { /* noop */ }
        controller.close()
      } finally {
        try { reader.releaseLock() } catch { /* noop */ }
      }
    },
  })

  return sendStream(event, stream)
})
