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
import { and, eq, isNull, asc, inArray } from 'drizzle-orm'
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  MAX_FILE_SIZE,
} from './workspace'

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
      description: '查询当前用户的课程与学习数据（只读，只能看到自己的数据）。',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['my_courses', 'course_chapters', 'my_progress'],
            description: 'my_courses=我参与的课程；course_chapters=某课程章节列表（需 course_id）；my_progress=我的章节完成情况（可选 course_id）',
          },
          course_id: { type: 'integer', description: '课程 ID，course_chapters 必填' },
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

// ===================== LMS 查询 =====================
async function lmsQuery(userId: number, args: any) {
  const kind = String(args?.kind || '')

  if (kind === 'my_courses') {
    const rows = await db
      .select({
        id: schema.courses.id,
        name: schema.courses.name,
        code: schema.courses.code,
        isTeacher: schema.userCourses.isTeacher,
        score: schema.userCourses.score,
      })
      .from(schema.userCourses)
      .innerJoin(schema.courses, eq(schema.userCourses.courseId, schema.courses.id))
      .where(eq(schema.userCourses.userId, userId))
    if (!rows.length) return '当前用户没有参与任何课程。'
    return rows.map((r) => `#${r.id} ${r.name}${r.code ? `（${r.code}）` : ''}${r.isTeacher ? ' [教师]' : ''}${r.score != null ? ` 分数 ${r.score}` : ''}`).join('\n')
  }

  if (kind === 'course_chapters') {
    const courseId = Number(args?.course_id) || 0
    if (!courseId) return '错误：course_chapters 需要 course_id'

    const [member] = await db
      .select({ isTeacher: schema.userCourses.isTeacher })
      .from(schema.userCourses)
      .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
      .limit(1)
    if (!member) return '错误：你没有参与该课程，无权查看'

    const rows = await db
      .select({ id: schema.chapters.id, name: schema.chapters.name, isOpen: schema.chapters.isOpen })
      .from(schema.chapters)
      .where(eq(schema.chapters.courseId, courseId))
      .orderBy(asc(schema.chapters.id))
    if (!rows.length) return '该课程还没有章节。'
    return rows.map((r) => `#${r.id} ${r.name}${r.isOpen ? '' : ' [未开放]'}`).join('\n')
  }

  if (kind === 'my_progress') {
    const courseId = Number(args?.course_id) || 0

    let chapterIds: number[] | null = null
    if (courseId) {
      const chapters = await db
        .select({ id: schema.chapters.id })
        .from(schema.chapters)
        .where(eq(schema.chapters.courseId, courseId))
      chapterIds = chapters.map((c) => c.id)
      if (!chapterIds.length) return '该课程没有章节。'
    }

    const conds: any[] = [eq(schema.userChapters.userId, userId)]
    if (chapterIds) conds.push(inArray(schema.userChapters.chapterId, chapterIds))

    const rows = await db
      .select({
        chapterId: schema.userChapters.chapterId,
        score: schema.userChapters.score,
        isPass: schema.userChapters.isPass,
        readTime: schema.userChapters.readTime,
        chapterName: schema.chapters.name,
      })
      .from(schema.userChapters)
      .leftJoin(schema.chapters, eq(schema.userChapters.chapterId, schema.chapters.id))
      .where(and(...conds))
      .orderBy(asc(schema.userChapters.chapterId))

    if (!rows.length) return '暂无学习记录。'
    return rows
      .map((r) => `#${r.chapterId} ${r.chapterName || '(未知章节)'}｜${r.isPass ? '已通过' : '未通过'}｜分数 ${r.score ?? '-'}｜阅读 ${r.readTime ?? 0}s`)
      .join('\n')
  }

  return `错误：未知的 kind=${kind}`
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
