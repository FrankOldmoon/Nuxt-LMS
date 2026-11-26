/**
 * 把会话工作区发布到 MINXIN Git（10.28.1.160）
 *
 * 学生在 /chat 里说「发布到 git」，模型先 write_file 生成 index.html 等文件，
 * 再调用 publish_to_git —— 这里负责：建仓库 → 提交全部文件 → 触发发布 → 返回公开地址。
 *
 * 为什么用管理员 token：
 * agent-* token（/agent/login 签发）只有 write:repository，建仓库需要 write:user；
 * 而管理员 token 可以代任意用户建库，且不需要学生再输一次密码。
 * 仓库归属仍是学生本人（/api/v1/admin/users/<login>/repos），老师看提交记录也是学生。
 *
 * 配置（.env）：
 *   NUXT_GITEA_BASE=http://10.28.1.160
 *   NUXT_GITEA_ADMIN_TOKEN=<Gitea 管理员 token>
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  isBinaryContent,
  B64_PREFIX,
} from './workspace'

const BASE = (process.env.NUXT_GITEA_BASE || 'http://10.28.1.160').replace(/\/+$/, '')
const ADMIN = String(process.env.NUXT_GITEA_ADMIN_TOKEN || '').trim()
/** Gitea 里 LMS OIDC 登录源的 id（默认 2，见 docs/identity-architecture.md 9.6） */
const LOGIN_SOURCE_ID = Number(process.env.NUXT_GITEA_LOGIN_SOURCE_ID || 2) || 2

/** Gitea 仓库名/所有者的合法字符（与 portal 的 NAME_RE 一致） */
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

const FILE_TIMEOUT = 20_000
const PUBLISH_TIMEOUT = 30_000

interface GiteaResp {
  status: number
  json: any
  text: string
}

async function gitea(
  path: string,
  opts: { method?: string; body?: any; form?: boolean; timeout?: number } = {},
): Promise<GiteaResp> {
  const headers: Record<string, string> = {
    Authorization: 'token ' + ADMIN,
    Accept: 'application/json',
  }
  let body: string | undefined
  if (opts.body !== undefined) {
    if (opts.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(opts.body).toString()
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(opts.body)
    }
  }

  const resp = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers,
    body,
    signal: AbortSignal.timeout(opts.timeout ?? FILE_TIMEOUT),
  })
  const text = await resp.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { /* 非 JSON 响应 */ }
  return { status: resp.status, json, text }
}

/** 把任意标题压成合法仓库名（中文会被清掉，需要调用方给英文名兜底） */
export function repoSlug(raw: string): string {
  const s = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/-+$/, '')
    .slice(0, 60)
  return s || ''
}

/** 与 portal 的 slug() 保持一致：小写、非法字符折成 - */
function siteSlug(owner: string, repo: string): string {
  return (owner + '-' + repo)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function errText(r: GiteaResp): string {
  const msg = r.json?.message || r.json?.error || r.text
  return String(msg || '').slice(0, 200)
}

/** 文件路径逐段编码（保留 /） */
function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export interface PublishResult {
  ok: boolean
  url?: string
  repoUrl?: string
  commit?: string
  files?: number
  skipped?: string[]
  error?: string
}

export async function publishWorkspaceToGit(
  userId: number,
  conversationId: number,
  args: { repo?: string; message?: string } = {},
): Promise<PublishResult> {
  if (!ADMIN) {
    return { ok: false, error: '服务器未配置 NUXT_GITEA_ADMIN_TOKEN，无法发布到 Git' }
  }

  // 1) 当前用户 → Gitea 登录名（LMS username 与 Gitea login 一致，由 SSO 绑定）
  const [u] = await db
    .select({ username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
  const owner = String(u?.username || '').trim()
  if (!owner || !NAME_RE.test(owner)) {
    return { ok: false, error: '当前账号没有可用的 Git 用户名，无法发布' }
  }

  // 2) 工作区文件（至少一个）
  const files = await listWorkspaceFiles(conversationId)
  if (!files.length) {
    return { ok: false, error: '工作区还没有文件：请先生成网页/游戏文件（如 index.html）再发布' }
  }

  const repo = repoSlug(String(args.repo || '')) || 'my-site'
  if (!NAME_RE.test(repo)) return { ok: false, error: `仓库名不合法：${repo}` }

  // 3) 建仓库：Gitea 里还没有该账号时自动开通，已存在则复用（409）
  const repoPath = `/api/v1/admin/users/${encodeURIComponent(owner)}/repos`
  let created = await gitea(repoPath, {
    method: 'POST',
    body: { name: repo, private: false, auto_init: true },
  })

  if (created.status === 404) {
    // 自动开通：source_id + login_name 让这个账号等同于「用 LMS 登录过一次」，
    // 之后学生自己点 Gitea 登录也能直接命中，不会掉进关联账号页。
    const made = await gitea('/api/v1/admin/users', {
      method: 'POST',
      body: {
        username: owner,
        email: `${owner}@students.local`,
        // 密码登录在 Gitea 侧已关闭，这里只是满足建号必填项
        password: randomUUID() + randomUUID(),
        source_id: LOGIN_SOURCE_ID,
        login_name: String(userId),
        must_change_password: false,
        send_notify: false,
      },
    })
    if (!(made.status === 201 || /already exists/i.test(made.text))) {
      return { ok: false, error: `自动开通 Git 账号失败（HTTP ${made.status}）：${errText(made)}` }
    }
    created = await gitea(repoPath, {
      method: 'POST',
      body: { name: repo, private: false, auto_init: true },
    })
  }

  const repoExists = created.status === 201 || created.status === 409
    || /already exists/i.test(created.text)
  if (!repoExists) {
    return { ok: false, error: `创建仓库失败（HTTP ${created.status}）：${errText(created)}` }
  }

  // 4) 默认分支 + 现有文件 sha（更新已有文件必须带 sha）
  const repoInfo = await gitea(`/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
  const branch = String(repoInfo.json?.default_branch || 'main')
  const oldSha = new Map<string, string>()
  const tree = await gitea(
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=true`,
  )
  if (tree.status === 200 && Array.isArray(tree.json?.tree)) {
    for (const node of tree.json.tree) {
      if (node?.type === 'blob' && node.path && node.sha) oldSha.set(String(node.path), String(node.sha))
    }
  }

  // 5) 逐个文件提交（并发 4，避免 60 个文件排队过久）
  const skipped: string[] = []
  let done = 0
  const queue = [...files]
  const commitMessage = String(args.message || '').trim().slice(0, 200)
    || `Update from LMS chat (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`

  async function uploadOne(f: { path: string; size: number }): Promise<void> {
    const path = String(f.path || '')
    if (!path) return
    const row = await readWorkspaceFile(conversationId, path)
    if (!row) { skipped.push(path); return }

    const content = String(row.content ?? '')
    // 文本按 UTF-8；二进制（base64: 前缀）解码后仍是 base64，两者都直接给 Gitea
    const b64 = isBinaryContent(content)
      ? content.slice(B64_PREFIX.length)
      : Buffer.from(content, 'utf8').toString('base64')

    const body: any = {
      content: b64,
      message: commitMessage,
      // 用管理员 token 代提交时，默认 author 会变成 Admin —— 显式写成学生本人，
      // 老师看提交记录才是学生（与 assist.html 的约定一致）
      author: { name: owner, email: `${owner}@minxinnansha.org.cn` },
      committer: { name: owner, email: `${owner}@minxinnansha.org.cn` },
    }
    const sha = oldSha.get(path)
    if (sha) body.sha = sha

    const r = await gitea(
      `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`,
      { method: 'PUT', body },
    )
    // 409/422：同名文件内容没变或存在冲突，不算整体失败
    if (r.status === 200 || r.status === 201) { done++ } else if (r.status !== 422) {
      skipped.push(`${path}（HTTP ${r.status}）`)
    }
  }

  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const f = queue.shift()!
      try { await uploadOne(f) } catch (e: any) { skipped.push(`${f.path}（${e?.message || e}）`) }
    }
  })
  await Promise.all(workers)

  if (!done && skipped.length) {
    return { ok: false, error: `文件提交失败：${skipped.slice(0, 3).join('；')}` }
  }

  // 6) 触发发布（portal 已支持 agent/管理员 token）
  const pub = await gitea('/portal/publish', {
    method: 'POST',
    body: { owner, repo },
    form: true,
    timeout: PUBLISH_TIMEOUT,
  })
  const url = `${BASE}/${siteSlug(owner, repo)}/`
  const repoUrl = `${BASE}/${owner}/${repo}`

  if (pub.status !== 200 || !pub.json?.ok) {
    return {
      ok: false,
      url,
      repoUrl,
      files: done,
      skipped,
      error: `文件已提交，但发布失败（HTTP ${pub.status}）：${errText(pub)}。`
        + `可到 ${BASE}/portal/ 手动点一次 Publish`,
    }
  }

  return {
    ok: true,
    url,
    repoUrl,
    commit: String(pub.json?.commit || '').slice(0, 8),
    files: done,
    skipped,
  }
}
