/**
 * 头像文件访问控制（服务端）
 *
 * 头像（users.avatar_img）存储为 `/api/files/serve?pathname=<dayDir>/<hash>.ext`。
 * 上传文件是内容寻址的（路径含 64 位十六进制 hash，不可枚举），因此 serve 端点历史上
 * 是**公开只读**的；但头像属于个人隐私：学生 / 访客即使拿到 URL 也不应能直接打开。
 *
 * 这里在 serve 端点做二次校验：仅教师及以上（admin / teacher / observer）**或头像本人**可读，
 * 与前端 useAuth().canViewAvatars 的口径保持一致（前端另允许本人看自己的头像）。
 *
 * 判定方式：把 pathname 是否被任一 users.avatar_img 引用（以及属于哪些用户）作为依据，
 * 用 20s TTL 的进程内映射缓存，避免每个文件请求都扫库。
 */
import { db, schema } from '@nuxthub/db'
import { isNotNull } from 'drizzle-orm'

/** 可查看任意用户真实头像的角色（与前端 useAuth().canViewAvatars 一致） */
export const AVATAR_VIEWER_ROLES = ['admin', 'teacher', 'observer'] as const

const CACHE_TTL_MS = 20_000

/** pathname → 头像所属用户 id 集合（同一图片被多人使用时为多个 id） */
let cache: { at: number; owners: Map<string, Set<number>> } | null = null

/** 从 avatarImg URL 解析出 serve 端使用的 pathname（非本 API 的 URL 返回 null） */
export function avatarPathnameOf(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  const q = url.indexOf('?')
  if (q < 0) return null
  try {
    const p = new URLSearchParams(url.slice(q + 1)).get('pathname')
    return p ? p.replace(/^\/+/, '') : null
  } catch {
    return null
  }
}

/** 收集所有被用户头像引用的 pathname → 所有者集合 */
async function loadAvatarOwners(): Promise<Map<string, Set<number>>> {
  const rows: Array<{ userId: number | null; avatarImg: string | null }> = await db
    .select({ userId: schema.users.id, avatarImg: schema.users.avatarImg })
    .from(schema.users)
    .where(isNotNull(schema.users.avatarImg))
  const owners = new Map<string, Set<number>>()
  for (const r of rows || []) {
    const p = avatarPathnameOf(r?.avatarImg)
    if (!p) continue
    let set = owners.get(p)
    if (!set) { set = new Set<number>(); owners.set(p, set) }
    if (r?.userId != null) set.add(r.userId)
  }
  return owners
}

async function ensureCache() {
  const now = Date.now()
  if (!cache || now - cache.at > CACHE_TTL_MS) {
    try {
      cache = { at: now, owners: await loadAvatarOwners() }
    } catch (e) {
      // 读库失败：保留旧缓存（可能为空）但不阻断文件服务
      console.error('[avatarGuard] 头像路径加载失败', e)
    }
  }
}

/** 该 pathname 对应的头像所有者集合；不是头像则返回 null */
export async function avatarOwnersOf(pathname: string): Promise<Set<number> | null> {
  if (!pathname) return null
  await ensureCache()
  return cache?.owners.get(pathname) || null
}

/** 该 pathname 是否是「某用户的头像」 */
export async function isAvatarPath(pathname: string): Promise<boolean> {
  return !!(await avatarOwnersOf(pathname))
}

/** 头像变更后调用，立即失效缓存（避免新头像在 TTL 内被当作普通文件公开） */
export function invalidateAvatarCache() {
  cache = null
}

/**
 * serve / file 端点共用的头像访问守卫。
 * 放行条件：非头像文件 / 教师及以上角色 / 头像本人。
 * @returns 是否为头像文件（调用方据此改用私有缓存头）
 * @throws 403 无权限访问他人头像
 */
export async function guardAvatarAccess(event: any, pathname: string): Promise<boolean> {
  const owners = await avatarOwnersOf(pathname)
  if (!owners) return false
  const user = await getCurrentUser(event)
  const byRole = !!user && Array.isArray(user.roles)
    && user.roles.some((r) => (AVATAR_VIEWER_ROLES as readonly string[]).includes(r))
  const bySelf = !!user && owners.has(user.id)
  if (!byRole && !bySelf) throw createError({ statusCode: 403, message: '头像仅教师及以上角色或本人可查看' })
  return true
}
