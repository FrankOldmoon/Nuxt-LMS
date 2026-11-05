/**
 * OJ（在线评测）平台对接
 *
 * 基址只来自 LMS 系统设置「学习行为配置 → OJ 基础地址」（configs 表 lms:oj.url），
 * 不硬编码、也没有环境变量兜底；留空则不启用 OJ 题目拉取与判题状态查询。
 * getLmsConfigSync 通过 Nuxt auto-import 引入（不显式 import），与其它 server util 一致。
 *
 * 脚本侧要读同一份配置，用 scripts/lib/oj-config.cjs 的 getOjBase()。
 *
 * ── 稳定性约定（OJ 侧实测常见 8~20s 才响应、偶发 502）────────────────────
 * 题目正文在本进程内按 pid 缓存：
 *  - 单次 $fetch 必带 timeout，绝不无限等（默认 5s，可用 LMS_OJ_TIMEOUT_MS 覆盖）
 *  - 有过期缓存时**先返回旧内容**，后台再刷新（stale-while-revalidate）
 *  - 同一 pid 的并发请求合并成一次上游请求（一个班同时打开同一道题只打 OJ 一次）
 *  - 拉取失败退回过期缓存，实在没有才返回 null（前端才会显示「加载失败」）
 */

/** 单次上游请求超时（ms）。OJ 正常应在 200ms 内返回，超过 5s 基本等于挂了 */
const OJ_TIMEOUT_MS = Number(process.env.LMS_OJ_TIMEOUT_MS) || 5000
/** 缓存新鲜期：10 分钟内不重复打 OJ */
const OJ_CACHE_TTL_MS = 10 * 60 * 1000
/** 缓存条数上限（一个 OJ 站点一般几十~几百道题） */
const OJ_CACHE_MAX = 500

type OjCacheEntry = { text: string; at: number }

const ojCache = new Map<string, OjCacheEntry>()
const ojInflight = new Map<string, Promise<string | null>>()

/** 获取 OJ 平台基址（去掉末尾斜杠）；未配置时返回空串 */
export function getOjUrl(): string {
  const cfg = (typeof getLmsConfigSync === 'function') ? getLmsConfigSync() : null
  const url = (cfg?.oj?.url || '') as string
  return String(url).replace(/\/+$/, '')
}

/**
 * 解析题目记录对应的 OJ pid。
 *
 * pid 的权威来源是 `options.pid`（内容管理/编辑器写入）。
 * `content` 只在「题目正文尚未回填」时才是 pid——被 show.ts 用 OJ 题目正文替换后，
 * content 变成题目正文（含换行/空格），直接当 pid 会查不到提交记录。
 * 因此优先 options.pid，其次把「形如 pid 的短字符串」content 作为老数据回退。
 */
export function resolveOjPid(question: any): string {
    const opts = question?.options
    if (opts && typeof opts === 'object' && !Array.isArray(opts) && opts.pid) {
        return String(opts.pid)
    }
    const c = question?.content
    if (typeof c === 'string') {
        const s = c.trim()
        // 老数据 content 存 pid（如 P1001 / 2）；正文文本含换行/空格，不匹配
        if (/^[A-Za-z0-9_-]{1,32}$/.test(s)) return s
    }
    return ''
}

/** content 是否仍是 pid 占位（说明还没回填过正文） */
export function isOjPlaceholder(question: any, pid: string): boolean {
    const c = question?.content
    return typeof c === 'string' && !!pid && c.trim() === pid
}

function cacheKey(base: string, pid: string) {
    return `${base}|${pid}`
}

/** 读缓存并把该条挪到 Map 末尾（简易 LRU） */
function readCache(key: string): OjCacheEntry | null {
    const hit = ojCache.get(key)
    if (!hit) return null
    ojCache.delete(key)
    ojCache.set(key, hit)
    return hit
}

function writeCache(key: string, text: string) {
    ojCache.delete(key)
    ojCache.set(key, { text, at: Date.now() })
    while (ojCache.size > OJ_CACHE_MAX) {
        const oldest = ojCache.keys().next().value
        if (oldest === undefined) break
        ojCache.delete(oldest)
    }
}

/** 清空题目正文缓存（改 OJ 地址 / 需要强制重取时用） */
export function clearOjCache(pid?: string) {
    if (!pid) { ojCache.clear(); return }
    for (const key of [...ojCache.keys()]) {
        if (key.endsWith(`|${pid}`)) ojCache.delete(key)
    }
}

/**
 * 拉一次题目正文：不重试、带超时。
 * 返回 '' 表示上游响应里没有可用正文（交由调用方当作失败处理）。
 */
async function requestOjStatement(base: string, pid: string): Promise<string> {
    const data: any = await $fetch(`${base}/p/${pid}`, {
        headers: { 'Accept': 'application/json' },
        timeout: OJ_TIMEOUT_MS,
        retry: 0,
    })
    if (!data || !data.pdoc || !data.pdoc.content) return ''
    let parsed: any
    try {
        parsed = JSON.parse(data.pdoc.content)
    } catch {
        // 少数题目的 content 直接就是 markdown（不是 JSON），原样返回
        return String(data.pdoc.content)
    }
    if (typeof parsed === 'string') return parsed
    return parsed?.en || parsed?.zh || ''
}

/**
 * 拉取 OJ 题目正文
 *
 * @returns 题目正文（markdown 字符串）；拉取失败且没有历史缓存时返回 null
 */
export const fetchOj = async (pid: string): Promise<string | null> => {
    const base = getOjUrl()
    if (!base || !pid) return null
    const key = cacheKey(base, pid)
    const cached = readCache(key)
    if (cached && Date.now() - cached.at < OJ_CACHE_TTL_MS) return cached.text

    const running = ojInflight.get(key)
    if (running) return (await running) ?? cached?.text ?? null

    const task = (async (): Promise<string | null> => {
        try {
            const text = await requestOjStatement(base, pid)
            if (!text.trim()) throw new Error('empty statement')
            writeCache(key, text)
            return text
        } catch (e: any) {
            const reason = e?.statusMessage || e?.data?.message || e?.message || String(e)
            console.warn(`[oj] 拉取题目失败 pid=${pid} url=${base}/p/${pid} → ${reason}`)
            return null
        } finally {
            ojInflight.delete(key)
        }
    })()
    ojInflight.set(key, task)

    // 有过期缓存：立刻给旧内容，刷新放到后台跑，别让页面等 OJ
    if (cached) return cached.text
    return (await task) ?? null
}

/**
 * 查询用户在某道 OJ 题目上的通过状态
 *
 * @returns true 表示已通过（rdocs 中存在 status=1 的记录），false 表示未通过，null 表示查询失败
 */
export const getOjStatus = async (pid: string, username: string): Promise<boolean | null> => {
    const base = getOjUrl()
    if (!base || !pid || !username) return null
    const url = `${base}/record?uidOrName=${encodeURIComponent(username)}&pid=${encodeURIComponent(pid)}&status=1`
    const data: any = await $fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
        timeout: OJ_TIMEOUT_MS,
        retry: 0,
    })
    if (!data || !data.rdocs) {
        return null;
    }
    return data.rdocs.length > 0
}

/**
 * 查询某用户在指定 OJ 题目上的全部提交记录（列表字段，不含代码）。
 *
 * 用于教师在「题目记录」弹窗里查看学生的 OJ 提交：记录页地址为 `${base}/record/{_id}`，
 * 代码只在 OJ 侧已登录且有权查看时才会显示，故这里只返回提交列表供前端跳转。
 * 未配置 OJ / 无参数 / 查询失败均返回 []。
 */
export const fetchOjUserRecords = async (pid: string, username: string): Promise<any[]> => {
    const base = getOjUrl()
    if (!base || !pid || !username) return []
    const url = `${base}/record?uidOrName=${encodeURIComponent(username)}&pid=${encodeURIComponent(pid)}`
    const data: any = await $fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
        timeout: OJ_TIMEOUT_MS,
        retry: 0,
    })
    if (!data || !Array.isArray(data.rdocs)) return []
    return data.rdocs
}
