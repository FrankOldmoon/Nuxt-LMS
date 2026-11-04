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
import { and, eq, inArray } from 'drizzle-orm'
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
      name: 'search_learning',
      description: '按关键词在「我参与的课程」里找相关章节。用户说「我想学 X」「有没有讲 Y 的」「哪一章讲 Z」时用它。返回章节引用和命中片段，正文由界面渲染给用户。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '知识点或主题关键词，如「循环」「列表」「函数」' },
          course_id: { type: 'integer', description: '限定在某门课程里搜（可选）' },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_questions',
      description: '按关键词在「我参与的课程」的题库里找练习题，返回题目引用（题干和选项由界面渲染给用户）。用户说「有没有练 X 的题」「找几道 Y 的题做做」时用它。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '知识点关键词' },
          course_id: { type: 'integer', description: '限定在某门课程里搜（可选）' },
          type: {
            type: 'string',
            description: '题型过滤（可选）：single/multiple/judge/fill/sort/match/classify',
          },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'chapter_materials',
      description: '查某个章节配套的练习题、作业与测验清单（只有名称和分值，不含答案）。告诉用户「学完这章可以练什么」时用它。',
      parameters: {
        type: 'object',
        properties: {
          chapter_id: { type: 'integer', description: '章节 ID' },
        },
        required: ['chapter_id'],
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
      questionIds: schema.chapters.questionIds,
      homeworkIds: schema.chapters.homeworkIds,
      quizIds: schema.chapters.quizIds,
    })
    .from(schema.chapters)
    .where(eq(schema.chapters.id, chapterId))
    .limit(1)
  return ch || null
}

// ===================== 按知识点找章节 =====================
// 章节正文压文本比较费时（最大 57 万字符），缓存起来；章节不常改，
// 容量上限只是防止长期运行时无界增长。
const chapterTextCache = new Map<number, string>()

function cachedChapterText(ch: any): string {
  const hit = chapterTextCache.get(ch.id)
  if (hit !== undefined) return hit
  const text = flattenContent(ch.content, 30000)
  if (chapterTextCache.size > 200) chapterTextCache.clear()
  chapterTextCache.set(ch.id, text)
  return text
}

/** 取关键词前后一小段，作为「命中在这里」的证据给模型看 */
function snippetOf(text: string, keyword: string, width = 60): string {
  const i = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (i < 0) return ''
  const start = Math.max(0, i - width)
  const end = Math.min(text.length, i + keyword.length + width)
  return (start > 0 ? '…' : '')
    + text.slice(start, end).replace(/\s+/g, ' ')
    + (end < text.length ? '…' : '')
}

/** 课内/全部课程里按关键词找章节（只返回引用与片段，正文交给前端渲染） */
async function searchLearning(userId: number, args: any): Promise<string> {
  const keyword = String(args?.keyword || '').trim()
  if (!keyword) return '错误：keyword 不能为空'
  const courseId = Number(args?.course_id) || 0

  // 只搜用户参与过的课程，避免把没选的课暴露出去
  const mine = await db
    .select({ courseId: schema.userCourses.courseId })
    .from(schema.userCourses)
    .where(eq(schema.userCourses.userId, userId))
  const courseIds = mine.map((r) => r.courseId).filter((id) => !courseId || id === courseId)
  if (!courseIds.length) return '你还没有参与任何课程，暂时搜不到内容。'

  const rows = await db
    .select({
      id: schema.chapters.id,
      name: schema.chapters.name,
      courseId: schema.chapters.courseId,
      content: schema.chapters.content,
      tags: schema.chapters.tags,
      questionIds: schema.chapters.questionIds,
    })
    .from(schema.chapters)
    .where(inArray(schema.chapters.courseId, courseIds))

  const kw = keyword.toLowerCase()
  const hits: { ch: any; score: number; snippet: string }[] = []
  for (const ch of rows) {
    const nameHit = String(ch.name || '').toLowerCase().includes(kw)
    const tagHit = JSON.stringify(ch.tags ?? []).toLowerCase().includes(kw)
    const text = cachedChapterText(ch)
    const bodyHit = text.toLowerCase().includes(kw)
    if (!nameHit && !tagHit && !bodyHit) continue
    hits.push({
      ch,
      // 章节名命中比正文命中更可信
      score: (nameHit ? 3 : 0) + (tagHit ? 2 : 0) + (bodyHit ? 1 : 0),
      snippet: bodyHit ? snippetOf(text, keyword) : '',
    })
  }

  if (!hits.length) return `在你参与的课程里没有找到和「${keyword}」相关的章节。`

  hits.sort((a, b) => b.score - a.score)
  const top = hits.slice(0, 5)

  const courseRows = await db
    .select({ id: schema.courses.id, name: schema.courses.name })
    .from(schema.courses)
    .where(inArray(schema.courses.id, [...new Set(top.map((h) => h.ch.courseId))]))
  const courseName = new Map(courseRows.map((c) => [c.id, c.name]))

  return JSON.stringify({
    keyword,
    total: hits.length,
    refs: top.map((h) => ({
      ref: 'chapter',
      id: h.ch.id,
      name: h.ch.name,
      courseId: h.ch.courseId,
      courseName: courseName.get(h.ch.courseId) || '',
      questionCount: Array.isArray(h.ch.questionIds) ? h.ch.questionIds.length : 0,
      snippet: h.snippet,
    })),
    note: '章节正文已由界面展示给用户。回答时说清哪章最相关、为什么，不要复述全文；需要细节再用 search_chapter 查。',
  })
}

/** 题干纯文本（content 可能是字符串、也可能是 tiptap doc；options 里也有文本） */
function questionText(q: any): string {
  const parts: string[] = [String(q.name || '')]
  if (typeof q.content === 'string') parts.push(q.content)
  else if (q.content) parts.push(flattenContent(q.content, 4000))
  if (q.options) {
    try { parts.push(JSON.stringify(q.options)) } catch { /* 忽略 */ }
  }
  if (q.tags) {
    try { parts.push(JSON.stringify(q.tags)) } catch { /* 忽略 */ }
  }
  return parts.join(' ')
}

/** 按关键词搜题目（只返回引用，题干与选项由前端渲染 —— 答案不会进上下文） */
async function searchQuestions(userId: number, args: any): Promise<string> {
  const keyword = String(args?.keyword || '').trim()
  if (!keyword) return '错误：keyword 不能为空'
  const courseId = Number(args?.course_id) || 0
  const typeFilter = String(args?.type || '').trim()

  const mine = await db
    .select({ courseId: schema.userCourses.courseId })
    .from(schema.userCourses)
    .where(eq(schema.userCourses.userId, userId))
  const courseIds = mine.map((r) => r.courseId).filter((id) => !courseId || id === courseId)
  if (!courseIds.length) return '你还没有参与任何课程，暂时搜不到题目。'

  const rows = await db
    .select({
      courseId: schema.questions.courseId,
      cid: schema.questions.cid,
      name: schema.questions.name,
      type: schema.questions.type,
      point: schema.questions.point,
      difficulty: schema.questions.difficulty,
      tags: schema.questions.tags,
      content: schema.questions.content,
      options: schema.questions.options,
    })
    .from(schema.questions)
    .where(inArray(schema.questions.courseId, courseIds))

  const kw = keyword.toLowerCase()
  const hits: { q: any; score: number }[] = []
  for (const q of rows) {
    if (typeFilter && q.type !== typeFilter) continue
    const nameHit = String(q.name || '').toLowerCase().includes(kw)
    const tagHit = JSON.stringify(q.tags ?? []).toLowerCase().includes(kw)
    const text = questionText(q).toLowerCase()
    const bodyHit = text.includes(kw)
    if (!nameHit && !tagHit && !bodyHit) continue
    hits.push({ q, score: (nameHit ? 3 : 0) + (tagHit ? 2 : 0) + (bodyHit ? 1 : 0) })
  }

  if (!hits.length) return `题库里没有找到和「${keyword}」相关的题目。`

  hits.sort((a, b) => b.score - a.score)
  const top = hits.slice(0, 8)

  const courseRows = await db
    .select({ id: schema.courses.id, name: schema.courses.name })
    .from(schema.courses)
    .where(inArray(schema.courses.id, [...new Set(top.map((h) => h.q.courseId))]))
  const courseName = new Map(courseRows.map((c) => [c.id, c.name]))

  return JSON.stringify({
    keyword,
    total: hits.length,
    refs: top.map((h) => ({
      ref: 'question',
      courseId: h.q.courseId,
      courseName: courseName.get(h.q.courseId) || '',
      cid: h.q.cid,
      name: h.q.name,
      type: h.q.type,
      point: h.q.point,
      difficulty: h.q.difficulty,
    })),
    note: '题干与选项已由界面渲染给用户，你没有题目内容。请引导用户自己作答，不要猜测题意或给答案。',
  })
}

/** 章节配套的练习题 / 作业 / 测验清单（只给名称与分值，绝不给答案） */
async function chapterMaterials(_userId: number, args: any): Promise<string> {
  const id = Number(args?.chapter_id) || 0
  const ch = await loadChapterForUser(_userId, id)
  if (!ch) return '错误：章节不存在'

  const qIds: number[] = Array.isArray(ch.questionIds) ? ch.questionIds.map(Number) : []
  const hIds: number[] = Array.isArray(ch.homeworkIds) ? ch.homeworkIds.map(Number) : []
  const zIds: number[] = Array.isArray(ch.quizIds) ? ch.quizIds.map(Number) : []

  const [qs, hws, qzs] = await Promise.all([
    qIds.length
      ? db.select({
        cid: schema.questions.cid,
        name: schema.questions.name,
        type: schema.questions.type,
        point: schema.questions.point,
      }).from(schema.questions).where(and(
        eq(schema.questions.courseId, ch.courseId),
        inArray(schema.questions.cid, qIds),
      ))
      : Promise.resolve([]),
    hIds.length
      ? db.select({
        cid: schema.homeworks.cid,
        name: schema.homeworks.name,
        point: schema.homeworks.point,
      }).from(schema.homeworks).where(and(
        eq(schema.homeworks.courseId, ch.courseId),
        inArray(schema.homeworks.cid, hIds),
      ))
      : Promise.resolve([]),
    zIds.length
      ? db.select({
        cid: schema.quizzes.cid,
        name: schema.quizzes.name,
        point: schema.quizzes.point,
      }).from(schema.quizzes).where(and(
        eq(schema.quizzes.courseId, ch.courseId),
        inArray(schema.quizzes.cid, zIds),
      ))
      : Promise.resolve([]),
  ])

  const TYPE_CN: Record<string, string> = {
    single: '单选', multiple: '多选', judge: '判断', fill: '填空',
    sort: '排序', match: '匹配', classify: '分类',
  }

  const lines = [`《${ch.name}》配套学习材料：`]
  lines.push(qs.length
    ? `练习题 ${qs.length} 道：\n` + qs.map((q: any) =>
      `  第${q.cid}题 ${q.name}（${TYPE_CN[q.type] || q.type || '题'}，${q.point ?? '-'} 分）`).join('\n')
    : '练习题：无')
  lines.push(hws.length
    ? `作业 ${hws.length} 份：\n` + hws.map((h: any) => `  第${h.cid}份 ${h.name}（${h.point ?? '-'} 分）`).join('\n')
    : '作业：无')
  lines.push(qzs.length
    ? `测验 ${qzs.length} 次：\n` + qzs.map((z: any) => `  第${z.cid}次 ${z.name}（${z.point ?? '-'} 分）`).join('\n')
    : '测验：无')

  return lines.join('\n\n')
}

// ===================== 执行入口 =====================
export interface ToolContext {
  conversationId: number
  userId: number
}

/**
 * 禁止注册的写操作类工具（护栏）。
 *
 * 学习数据必须由本人通过页面流程产生并记名，任何「提交 / 答题 / 标记完成 / 改分」
 * 的能力都不能做成 agent 工具 —— 否则模型一句话就能批量刷进度、代交作业，
 * 而且这些操作在服务端无法区分「学生本人点的」还是「agent 代做的」。
 *
 * 现在所有工具都是只读（LMS 数据）+ 只写会话自己的 chat_files，
 * 这条判断是给以后加工具时的显式拦截，避免有人顺手加个 submit_homework。
 */
const FORBIDDEN_PREFIXES = ['submit', 'grade', 'score', 'answer', 'complete', 'finish', 'enroll', 'mark']

function assertNotWriteTool(name: string) {
  const lower = name.toLowerCase()
  if (FORBIDDEN_PREFIXES.some((p) => lower.startsWith(p))) {
    throw new Error(`工具 ${name} 被禁止：学习数据只能由用户本人通过页面提交`)
  }
}

/** 执行服务端工具；返回给模型的字符串结果（失败也返回文本，让模型自己纠正） */
export async function executeServerTool(name: string, args: any, ctx: ToolContext): Promise<string> {
  try {
    assertNotWriteTool(name)
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

      case 'search_learning':
        return await searchLearning(ctx.userId, args)

      case 'search_questions':
        return await searchQuestions(ctx.userId, args)

      case 'chapter_materials':
        return await chapterMaterials(ctx.userId, args)

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
