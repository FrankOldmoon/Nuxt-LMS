/**
 * Agent 工具定义与「服务端工具」执行器
 *
 * 分工：
 * - 服务端工具（本文件 executeServerTool）：工作区文件、HTTP、LMS 查询
 * - 客户端工具（run_python）：由浏览器 Pyodide 执行，前端识别后本地跑，服务端只下发 schema
 *
 * 工具名一旦定下不要改，历史消息里的 tool_calls 会引用它。
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  MAX_FILE_SIZE,
} from './workspace'
import { lmsQuery } from './lmsQuery'

export const CLIENT_TOOLS = ['run_python'] as const

export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: '列出当前会话工作区的所有文件（路径、大小、更新时间）。工作区是用户能看到的虚拟磁盘，写入的文件会出现在右侧文件树里。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取工作区中指定文件的完整内容。用户上传或此前写入的文件都在这里。',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: '文件路径，如 main.py 或 data/a.csv' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '在工作区创建或覆盖文件。用户可直接在右侧文件树查看、预览和下载。适合输出报告、代码、CSV、HTML 等文本文件。',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径，带扩展名，如 report.md' },
          content: { type: 'string', description: '完整文件内容（会覆盖同名文件）' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: '删除工作区中的文件。',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'http_request',
      description: '向管理员白名单内的外部 API 发起 HTTP 请求，返回响应文本（最多 20KB）。仅 GET/POST/PUT/PATCH。',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '完整 URL，必须在白名单内' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH'], description: '默认 GET' },
          body: { type: 'string', description: '请求体（POST/PUT/PATCH），通常是 JSON 字符串' },
          content_type: { type: 'string', description: '默认 application/json' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lms_query',
      description: '查询当前用户的学习数据与学习资料（只读，只能看到自己的数据）。用户问「我学得怎么样」「我有哪些作业没交」「哪几题老做错」「这门课有什么材料」时用它。',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: [
              'overview',
              'my_courses',
              'course_chapters',
              'course_resources',
              'my_progress',
              'my_homeworks',
              'my_quizzes',
              'my_questions',
              'my_comments',
              'my_races',
              'my_files',
            ],
            description: [
              'overview=全部维度的总览（课程/章节/作业/测验/题目/竞赛/评论/网盘）',
              'my_courses=我参与的课程',
              'course_chapters=某课程的章节列表（需 course_id）',
              'course_resources=某课程有哪些作业/测验/题目/竞赛（需 course_id）',
              'my_progress=我的章节通过情况与分数（可选 course_id）',
              'my_homeworks=我的作业提交与得分（可选 course_id / only_unscored）',
              'my_quizzes=我的测验成绩（可选 course_id）',
              'my_questions=我的题目正确率与错题（可选 course_id / only_wrong）',
              'my_comments=我发表的讨论',
              'my_races=我的竞赛成绩',
              'my_files=我网盘里的资料',
            ].join('；'),
          },
          course_id: { type: 'integer', description: '课程 ID，用于按课程过滤' },
          only_wrong: { type: 'boolean', description: 'my_questions 专用：只列做错过的题' },
          only_unscored: { type: 'boolean', description: 'my_homeworks 专用：只列还没评分的作业' },
        },
        required: ['kind'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_chapter',
      description: '在界面中展示指定章节（正文由前端渲染给用户看，你只会拿到大纲）。用户说「给我看第几章」「这章讲了什么」「打开这一节」时用它。拿到返回后请只讲要点，不要把正文复述一遍。',
      parameters: {
        type: 'object',
        properties: {
          chapter_id: { type: 'integer', description: '章节 ID（用 lms_query 的 course_chapters 查到）' },
        },
        required: ['chapter_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_chapter',
      description: '在章节正文中搜索关键词，返回命中的段落。适合回答「这章有没有讲 X」「哪里提到 Y」这类需要正文细节的问题。',
      parameters: {
        type: 'object',
        properties: {
          chapter_id: { type: 'integer', description: '章节 ID' },
          keyword: { type: 'string', description: '要搜索的关键词或短语' },
        },
        required: ['chapter_id', 'keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_python',
      description: '在浏览器沙箱里执行 Python 代码并返回 stdout/stderr。工作区文件已挂载到 ./（当前目录），可直接 open() 读取；运行后新建或修改的文本文件会自动同步回工作区。可用 numpy / pandas / matplotlib（首次 import 会自动加载）。适合计算、数据处理、验证算法。',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string', description: '完整的 Python 代码' } },
        required: ['code'],
      },
    },
  },
] as const

// ===================== HTTP 白名单 =====================
function allowedHosts(): string[] {
  return String(process.env.NUXT_CHAT_HTTP_ALLOW || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

const HTTP_TIMEOUT_MS = 5000
const HTTP_MAX_RESPONSE = 20 * 1024

async function httpTool(args: any) {
  const hosts = allowedHosts()
  if (!hosts.length) {
    return '（管理员尚未配置外部 API 白名单 NUXT_CHAT_HTTP_ALLOW，http_request 不可用）'
  }

  let url: URL
  try {
    url = new URL(String(args?.url || ''))
  } catch {
    return '错误：url 不合法'
  }
  if (!['http:', 'https:'].includes(url.protocol)) return '错误：只支持 http/https'

  const host = url.host.toLowerCase()
  const ok = hosts.some((h) => host === h || host.endsWith(`.${h}`))
  if (!ok) return `错误：${host} 不在白名单内（允许：${hosts.join(', ')}）`

  const method = String(args?.method || 'GET').toUpperCase()
  if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method)) return '错误：不支持的 method'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
  try {
    const resp = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': String(args?.content_type || 'application/json') },
      body: method === 'GET' ? undefined : String(args?.body ?? ''),
      signal: controller.signal,
    })
    const text = await resp.text()
    const body = text.length > HTTP_MAX_RESPONSE
      ? text.slice(0, HTTP_MAX_RESPONSE) + `\n…（已截断，原始 ${text.length} 字节）`
      : text
    return `HTTP ${resp.status}\n${body}`
  } catch (e: any) {
    return `请求失败：${e?.name === 'AbortError' ? '超时（5s）' : e?.message || e}`
  } finally {
    clearTimeout(timer)
  }
}

// ===================== 章节内容（引用模式）=====================
/**
 * 章节正文不进上下文 —— 只回一个引用 + 大纲，正文由前端用 UeditorRender 渲染。
 * 这样模型知道这章讲什么（大纲几十 token），用户能直接在聊天里读全文。
 */
function extractOutline(content: any, limit = 24): string[] {
  const out: string[] = []
  const walk = (n: any) => {
    if (!n || typeof n !== 'object' || out.length >= limit) return
    if (Array.isArray(n)) {
      for (const x of n) walk(x)
      return
    }
    if (n.type === 'heading') {
      const text = (Array.isArray(n.content) ? n.content : [])
        .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
        .map((c: any) => c.text)
        .join('')
        .trim()
      if (text) out.push(text.slice(0, 80))
      return
    }
    if (Array.isArray(n.content)) n.content.forEach(walk)
  }
  walk(content)
  return out
}

/** 把 tiptap doc 压成纯文本（用于关键词搜索），max 限制防止超大章节撑爆内存 */
function flattenContent(content: any, max = 60000): string {
  const parts: string[] = []
  let total = 0
  const walk = (n: any) => {
    if (!n || typeof n !== 'object' || total > max) return
    if (Array.isArray(n)) {
      for (const x of n) walk(x)
      return
    }
    if (n.type === 'text' && typeof n.text === 'string') {
      parts.push(n.text)
      total += n.text.length
      return
    }
    if (n.type === 'codeBlock') {
      const code = (Array.isArray(n.content) ? n.content : []).map((c: any) => c?.text || '').join('')
      parts.push(`\n${code}\n`)
      total += code.length
      return
    }
    if (n.type === 'heading' || n.type === 'paragraph' || n.type === 'listItem' || n.type === 'blockquote') {
      parts.push('\n')
    }
    if (Array.isArray(n.content)) n.content.forEach(walk)
  }
  walk(content)
  return parts.join('').replace(/\n{2,}/g, '\n').trim()
}

/**
 * 取章节（只校验存在性）。
 *
 * 可见性不在这里判断 —— 正文由前端请求 /api/chapters/show 渲染，
 * 那里有完整的 gating（isOpen + 班级开放 + 教师/管理员），重复实现一份
 * 必然会和它走偏（比如「班级开放但章节本身未开放」这种情况）。
 * 工具只回大纲，不含正文。
 */
async function loadChapterForUser(_userId: number, chapterId: number) {
  const [ch] = await db
    .select({
      id: schema.chapters.id,
      name: schema.chapters.name,
      courseId: schema.chapters.courseId,
      content: schema.chapters.content,
      isOpen: schema.chapters.isOpen,
    })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, chapterId))
    .limit(1)
  return ch || null
}

// ===================== 执行入口 =====================
export interface ToolContext {
  conversationId: number
  userId: number
}

/** 执行服务端工具；返回给模型的字符串结果（失败也返回文本，让模型自己纠正） */
export async function executeServerTool(name: string, args: any, ctx: ToolContext): Promise<string> {
  try {
    switch (name) {
      case 'list_files': {
        const files = await listWorkspaceFiles(ctx.conversationId)
        if (!files.length) return '工作区是空的。'
        return files
          .map((f) => `${f.path}\t${f.size}B\t${new Date(f.updatedAt || Date.now()).toISOString().slice(0, 16).replace('T', ' ')}`)
          .join('\n')
      }

      case 'read_file': {
        const row = await readWorkspaceFile(ctx.conversationId, String(args?.path || ''))
        if (!row) return `错误：文件不存在 ${args?.path}`
        if (row.size > MAX_FILE_SIZE) return `错误：文件过大（${row.size}B）`
        return row.content || '（空文件）'
      }

      case 'write_file': {
        const content = String(args?.content ?? '')
        const r = await writeWorkspaceFile(ctx.conversationId, ctx.userId, String(args?.path || ''), content)
        return `${r.created ? '已创建' : '已覆盖'} ${r.file.path}（${r.file.size} 字节）`
      }

      case 'delete_file': {
        const ok = await deleteWorkspaceFile(ctx.conversationId, String(args?.path || ''))
        return ok ? `已删除 ${args?.path}` : `错误：文件不存在 ${args?.path}`
      }

      case 'http_request':
        return await httpTool(args)

      case 'lms_query':
        return await lmsQuery(ctx.userId, args)

      case 'show_chapter': {
        const id = Number(args?.chapter_id) || 0
        const ch = await loadChapterForUser(ctx.userId, id)
        if (!ch) return '错误：章节不存在，或你没有该课程的访问权限'
        const raw = JSON.stringify(ch.content || {})
        return JSON.stringify({
          ref: 'chapter',
          id: ch.id,
          name: ch.name,
          courseId: ch.courseId,
          chars: raw.length,
          outline: extractOutline(ch.content),
          note: '正文已由界面展示给用户，请只概述要点，不要复述全文。',
        })
      }

      case 'search_chapter': {
        const id = Number(args?.chapter_id) || 0
        const keyword = String(args?.keyword || '').trim()
        if (!keyword) return '错误：keyword 不能为空'
        const ch = await loadChapterForUser(ctx.userId, id)
        if (!ch) return '错误：章节不存在，或你没有该课程的访问权限'
        const text = flattenContent(ch.content)
        const hits = text
          .split('\n')
          .filter((line) => line.trim() && line.includes(keyword))
          .slice(0, 5)
        if (!hits.length) return `在《${ch.name}》中没有找到「${keyword}」`
        return `《${ch.name}》中与「${keyword}」相关的段落：\n\n`
          + hits.map((h, i) => `${i + 1}. ${h.trim().slice(0, 400)}`).join('\n\n')
      }

      default:
        return `错误：未知工具 ${name}`
    }
  } catch (e: any) {
    return `错误：${e?.message || e}`
  }
}
