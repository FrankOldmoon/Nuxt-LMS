/**
 * useAgentChat — Agent 工具循环编排（前端）
 *
 * 为什么循环放前端：run_python 必须在浏览器 Pyodide 里跑，若循环在服务端，
 * 就要把这轮挂起等前端回传结果再续跑，SSE 双向很别扭。放前端后每轮都是
 * 一次无状态请求：发 messages → 拿 tool_calls → 分发执行 → 结果塞回 messages 再来一轮。
 *
 * 用法（接 useChatbox 的 customSend）：
 *   const agent = useAgentChat({ conversationId, model, thinking, onToolCall, onFilesChanged })
 *   useChatbox({ customSend: agent.customSend, ... })
 */
import { getPyodide } from '../../base/components/ide/runners/pyodide'

export interface AgentToolCall {
  id: string
  name: string
  args: any
}

export interface AgentTurnResult {
  content: string
  reasoning: string
  toolCalls: AgentToolCall[]
}

interface AgentOptions {
  /** 当前会话 id（0 表示尚未创建） */
  conversationId: () => number
  model: () => string | undefined
  thinking: () => boolean
  /** 工具调用进度（start / done），供 UI 展示 */
  onToolCall?: (call: AgentToolCall, status: 'start' | 'done', result?: string) => void
  /** 工作区文件发生变化（写完/删完），供文件树刷新 */
  onFilesChanged?: () => void
}

const MAX_ROUNDS = 8
const MAX_TOOL_RESULT = 12000
const WORKDIR = '/home/pyodide'

export function useAgentChat(opts: AgentOptions) {
  const running = ref(false)
  /** 本轮的工具调用轨迹（用于落库 / 回看） */
  const trace = ref<{ name: string; args: any; result: string }[]>([])

  // ===================== 单轮请求 =====================
  async function turn(messages: any[], onDelta: (content: string, reasoning?: string) => void): Promise<AgentTurnResult> {
    const resp = await fetch('/api/chat/agent/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: opts.model() || undefined,
        thinking: opts.thinking(),
      }),
    })

    const ctype = resp.headers.get('content-type') || ''
    if (!ctype.includes('text/event-stream')) {
      // 参数错误 / 未配置 Key 等走的是 JSON 包装
      const j = await resp.json().catch(() => ({} as any))
      throw new Error(j.msg || `请求失败 ${resp.status}`)
    }

    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let reasoning = ''
    let toolCalls: AgentToolCall[] = []

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

        let ev: any
        try { ev = JSON.parse(data) } catch { continue }
        if (ev.type === 'delta') {
          content += ev.text
          onDelta(ev.text)
        } else if (ev.type === 'reasoning') {
          reasoning += ev.text
          onDelta('', ev.text)
        } else if (ev.type === 'tool_calls') {
          toolCalls = Array.isArray(ev.calls) ? ev.calls : []
        } else if (ev.type === 'error') {
          throw new Error(ev.message || '流式错误')
        }
      }
    }

    return { content, reasoning, toolCalls }
  }

  // ===================== 客户端工具：run_python =====================
  async function runPython(code: string, conversationId: number): Promise<string> {
    if (typeof window === 'undefined') return '错误：不在浏览器环境'

    const py = await getPyodide()

    // 1) 挂载工作区文件到当前目录，让 open('data.csv') 能读到
    if (conversationId) {
      try {
        const files = await cRequest<any[]>(`/api/chat/workspace/files?conversation_id=${conversationId}`)
        for (const f of files || []) {
          const row = await cRequest<any>(`/api/chat/workspace/file?conversation_id=${conversationId}&path=${encodeURIComponent(f.path)}`)
          writeToFs(py, f.path, String(row?.content ?? ''))
        }
      } catch (e) {
        console.warn('[agent] 挂载工作区失败', e)
      }
    }

    // 2) 按 import 语句尝试加载第三方包（本地没有 wheel 时回落到 CDN，失败由 import 自己报错）
    const pkgs = ['numpy', 'pandas', 'matplotlib', 'scipy', 'sympy']
    const need = pkgs.filter((p) => new RegExp(`^\\s*(import|from)\\s+${p}\\b`, 'm').test(code))
    if (need.length) {
      try { await py.loadPackage(need) } catch { /* 让用户代码自己抛 ImportError */ }
    }

    // 3) 执行前拍快照（用于识别本次真正被创建/修改的文件，避免把 Pyodide 自带文件也回收上传）
    const baseline = listFs(py)

    let out = ''
    try {
      py.setStdout({ batched: (s: string) => { out += s + '\n' } })
      py.setStderr({ batched: (s: string) => { out += s + '\n' } })
      await py.runPythonAsync(code)
    } catch (e: any) {
      out += `\n${e?.message || e}\n`
    }

    // 4) 回收新增/修改的文本文件（让 Python 产出的结果能落回工作区）
    if (conversationId) {
      try {
        const after = listFs(py)
        for (const [path, text] of Object.entries(after)) {
          if (baseline[path] === text) continue
          await cRequest('/api/chat/workspace/file', {
            method: 'POST',
            body: { conversation_id: conversationId, path, content: text },
          })
          opts.onFilesChanged?.()
        }
      } catch (e) {
        console.warn('[agent] 回收文件失败', e)
      }
    }

    return out.trim() || '（无输出）'
  }

  /** 写文件到 Pyodide 的 /home/pyodide 下，自动建父目录 */
  function writeToFs(py: any, path: string, content: string) {
    const full = `${WORKDIR}/${path}`
    const parts = full.split('/').filter(Boolean)
    let cur = ''
    for (let i = 0; i < parts.length - 1; i++) {
      cur += '/' + parts[i]
      try { py.FS.mkdir(cur) } catch { /* 已存在 */ }
    }
    try { py.FS.writeFile(full, content) } catch (e) { console.warn('[agent] writeFile 失败', path, e) }
  }

  /** 列出 /home/pyodide 下的文本文件全文（用于对比回收） */
  function listFs(py: any): Record<string, string> {
    const out: Record<string, string> = {}
    const walk = (dir: string, prefix: string) => {
      let entries: string[] = []
      try { entries = py.FS.readdir(dir) } catch { return }
      for (const name of entries) {
        if (name === '.' || name === '..') continue
        const full = `${dir}/${name}`
        const rel = prefix ? `${prefix}/${name}` : name
        let stat: any
        try { stat = py.FS.stat(full) } catch { continue }
        if (py.FS.isDir(stat.mode)) {
          if (name === '__pycache__' || name.startsWith('.')) continue
          walk(full, rel)
        } else if (stat.size <= 200 * 1024) {
          try {
            const buf = py.FS.readFile(full)
            // 只收文本：含大量 0 字节的当二进制跳过
            const text = new TextDecoder('utf-8', { fatal: false }).decode(buf)
            if (text.includes('\u0000')) continue
            out[rel] = text
          } catch { /* skip */ }
        }
      }
    }
    walk(WORKDIR, '')
    return out
  }

  // ===================== 工具分发 =====================
  async function execTool(call: AgentToolCall, conversationId: number): Promise<string> {
    opts.onToolCall?.(call, 'start')
    let result = ''
    try {
      if (call.name === 'run_python') {
        result = await runPython(String(call.args?.code || ''), conversationId)
      } else {
        const r = await cRequest<{ result: string }>('/api/chat/workspace/tool', {
          method: 'POST',
          body: { conversation_id: conversationId, name: call.name, args: call.args || {} },
        })
        result = String(r?.result ?? '')
        if (['write_file', 'delete_file'].includes(call.name)) opts.onFilesChanged?.()
      }
    } catch (e: any) {
      result = `错误：${e?.message || e}`
    }
    if (result.length > MAX_TOOL_RESULT) result = result.slice(0, MAX_TOOL_RESULT) + '\n…（结果过长已截断）'
    opts.onToolCall?.(call, 'done', result)
    return result
  }

  // ===================== 主循环（作为 useChatbox 的 customSend）=====================
  async function customSend(
    messages: { role: string; content: string }[],
    onChunk: (content: string, reasoning?: string) => void,
  ): Promise<{ content: string; reasoning: string }> {
    running.value = true
    trace.value = []

    // 只保留 role/content，避免把 UI 字段发给模型
    const history: any[] = messages.map((m) => ({ role: m.role, content: m.content }))

    let fullContent = ''
    let fullReasoning = ''

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const r = await turn(history, onChunk)
        fullContent += r.content
        fullReasoning += r.reasoning

        if (!r.toolCalls.length) break

        // 把「带 tool_calls 的 assistant 消息」压进历史，模型才知道自己调过什么
        history.push({
          role: 'assistant',
          content: r.content || '',
          tool_calls: r.toolCalls.map((c) => ({
            id: c.id,
            type: 'function',
            function: { name: c.name, arguments: JSON.stringify(c.args || {}) },
          })),
        })

        const convId = opts.conversationId()
        for (const call of r.toolCalls) {
          const result = await execTool(call, convId)
          trace.value.push({ name: call.name, args: call.args, result })
          history.push({ role: 'tool', tool_call_id: call.id, content: result })
        }
      }
    } finally {
      running.value = false
    }

    return { content: fullContent, reasoning: fullReasoning }
  }

  return { customSend, running, trace }
}
