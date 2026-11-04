/**
 * 会话工作区（虚拟文件系统）
 *
 * 模型只能通过工具读写这里的文件，路径是逻辑路径（如 `main.py`、`data/raw.csv`），
 * 不对应服务器磁盘 —— 既避免给多用户系统开真实 fs 权限，也让文件可审计、可下载、可回滚。
 *
 * 配额：单会话 ≤ 60 个文件、单文件 ≤ 200KB、合计 ≤ 2MB（文本存 DB，因此卡得比较紧）。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, isNull, asc, sql } from 'drizzle-orm'

export const MAX_FILES = 60
export const MAX_FILE_SIZE = 200 * 1024
export const MAX_TOTAL_SIZE = 2 * 1024 * 1024

/** 允许的扩展名 → mime（其余一律拒绝，防止把工作区当任意文件仓库） */
const MIME_BY_EXT: Record<string, string> = {
  py: 'text/x-python',
  js: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/typescript',
  json: 'application/json',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  sql: 'text/x-sql',
  svg: 'image/svg+xml',
  xml: 'application/xml',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  java: 'text/x-java',
  cpp: 'text/x-c++src',
  c: 'text/x-csrc',
  sh: 'text/x-sh',
  log: 'text/plain',
  // 3D 模型里只有「文本格式」的能进工作区（内容是 text 列，二进制会损坏）。
  // ASCII STL / OBJ / PLY / DAE / OFF 都是纯文本，可直接写、可直接预览。
  stl: 'model/stl',
  obj: 'model/obj',
  ply: 'model/ply',
  dae: 'model/vnd.collada+xml',
  off: 'model/off',
}

export function mimeOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return MIME_BY_EXT[ext] || 'text/plain'
}

/** 是否允许写入该扩展名 */
export function isAllowedExt(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return ext in MIME_BY_EXT
}

/**
 * 路径规范化：去掉开头斜杠与多余层级，拒绝 `..`、绝对路径、控制字符。
 * 抛错由调用方转成工具错误信息回给模型。
 */
export function normalizePath(raw: string): string {
  let p = String(raw ?? '').trim().replace(/\\/g, '/')
  p = p.replace(/^\.\//, '').replace(/^\/+/, '')
  if (!p) throw new Error('路径不能为空')
  if (p.length > 300) throw new Error('路径过长')
  if (p.includes('..')) throw new Error('路径不能包含 ..')
  if (/[\u0000-\u001f]/.test(p)) throw new Error('路径包含控制字符')
  if (!/^[\w\-.\/\u4e00-\u9fa5 ]+$/.test(p)) throw new Error('路径只能包含字母、数字、中文、- _ . /')
  if (p.endsWith('/')) throw new Error('路径不能以 / 结尾')
  return p
}

/** 校验会话归属（返回会话行；不存在/非本人/已删除则抛错） */
export async function requireConversation(event: any, conversationId: number) {
  const user = await requireAuth(event)
  if (!conversationId) throw new Error('缺少 conversation_id')
  const [conv] = await db
    .select()
    .from(schema.chatConversations)
    .where(and(
      eq(schema.chatConversations.id, conversationId),
      eq(schema.chatConversations.userId, user.id),
      isNull(schema.chatConversations.deletedAt),
    ))
    .limit(1)
  if (!conv) throw new Error('会话不存在')
  return { user, conv }
}

export async function listWorkspaceFiles(conversationId: number) {
  return db
    .select({
      id: schema.chatFiles.id,
      path: schema.chatFiles.path,
      size: schema.chatFiles.size,
      mime: schema.chatFiles.mime,
      updatedAt: schema.chatFiles.updatedAt,
    })
    .from(schema.chatFiles)
    .where(eq(schema.chatFiles.conversationId, conversationId))
    .orderBy(asc(schema.chatFiles.path))
}

export async function readWorkspaceFile(conversationId: number, rawPath: string) {
  const path = normalizePath(rawPath)
  const [row] = await db
    .select()
    .from(schema.chatFiles)
    .where(and(
      eq(schema.chatFiles.conversationId, conversationId),
      eq(schema.chatFiles.path, path),
    ))
    .limit(1)
  return row || null
}

/**
 * 写入（upsert）。配额按「文件数 / 单文件 / 总量」三道卡。
 * 更新已有文件时不占用新的文件名额。
 */
export async function writeWorkspaceFile(
  conversationId: number,
  userId: number,
  rawPath: string,
  content: string,
  opts: { overwrite?: boolean } = {},
) {
  const path = normalizePath(rawPath)
  if (!isAllowedExt(path)) {
    throw new Error(`不支持的文件类型：${path.split('.').pop() || '(无扩展名)'}`)
  }
  const text = String(content ?? '')
  const size = Buffer.byteLength(text, 'utf8')
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件超过 ${Math.round(MAX_FILE_SIZE / 1024)}KB 上限（当前 ${Math.round(size / 1024)}KB）`)
  }

  const existing = await readWorkspaceFile(conversationId, path)

  if (!existing) {
    const [agg] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${schema.chatFiles.size}), 0)::int`,
      })
      .from(schema.chatFiles)
      .where(eq(schema.chatFiles.conversationId, conversationId))

    if ((agg?.count ?? 0) >= MAX_FILES) {
      throw new Error(`工作区文件数已达上限（${MAX_FILES} 个），请先删除不用的文件`)
    }
    if ((agg?.total ?? 0) + size > MAX_TOTAL_SIZE) {
      throw new Error(`工作区总大小已达上限（${Math.round(MAX_TOTAL_SIZE / 1024 / 1024)}MB）`)
    }
  } else if (opts.overwrite === false) {
    throw new Error(`文件已存在：${path}`)
  }

  const mime = mimeOf(path)

  if (existing) {
    const [row] = await db
      .update(schema.chatFiles)
      .set({ content: text, size, mime, updatedAt: new Date() })
      .where(eq(schema.chatFiles.id, existing.id))
      .returning()
    return { file: row, created: false }
  }

  const [row] = await db
    .insert(schema.chatFiles)
    .values({ conversationId, userId, path, content: text, size, mime })
    .returning()
  return { file: row, created: true }
}

export async function deleteWorkspaceFile(conversationId: number, rawPath: string) {
  const path = normalizePath(rawPath)
  const rows = await db
    .delete(schema.chatFiles)
    .where(and(
      eq(schema.chatFiles.conversationId, conversationId),
      eq(schema.chatFiles.path, path),
    ))
    .returning({ id: schema.chatFiles.id })
  return rows.length > 0
}
