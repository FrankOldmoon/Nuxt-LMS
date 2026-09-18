/**
 * OJ（在线评测）平台对接
 *
 * 基址只来自 LMS 配置 oj.url（默认由环境变量 OJ 提供，可在管理后台覆盖），不硬编码。
 * getLmsConfigSync 通过 Nuxt auto-import 引入（不显式 import），与其它 server util 一致。
 */

/** 获取 OJ 平台基址（去掉末尾斜杠）；未配置时返回空串 */
function getOjUrl(): string {
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

export const fetchOj = async (pid: string) => {
    const base = getOjUrl()
    if (!base || !pid) return null
    const url = `${base}/p/${pid}`
    const data: any = await $fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
    })
    if (!data || !data.pdoc) {
        return null;
    }
    try {
        const result = JSON.parse(data.pdoc.content);
        return result ? result.en ? result.en : result.zh : null;
    } catch (error) {
        return null;
    }
}

/**
 * 查询用户在某道 OJ 题目上的通过状态
 *
 * @returns true 表示已通过（rdocs 中存在 status=1 的记录），false 表示未通过，null 表示查询失败
 */
export const getOjStatus = async (pid: string, username: string): Promise<boolean | null> => {
    const base = getOjUrl()
    if (!base || !pid || !username) return null
    const url = `${base}/record?uidOrName=${username}&pid=${pid}&status=1`
    const data: any = await $fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
    })
    if (!data || !data.rdocs) {
        return null;
    }
    return data.rdocs.length > 0
}
