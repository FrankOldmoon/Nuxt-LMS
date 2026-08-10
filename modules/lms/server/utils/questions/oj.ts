/**
 * OJ（在线评测）平台对接
 *
 * 基址来自 LMS 配置 oj.url（默认 http://10.22.99.130），可在管理后台覆盖。
 * getLmsConfigSync 通过 Nuxt auto-import 引入（不显式 import），与其它 server util 一致。
 */

/** 获取 OJ 平台基址（去掉末尾斜杠） */
function getOjUrl(): string {
  const cfg = (typeof getLmsConfigSync === 'function') ? getLmsConfigSync() : null
  const url = (cfg?.oj?.url || 'http://10.22.99.130') as string
  return String(url).replace(/\/+$/, '')
}

export const fetchOj = async (pid: string) => {
    const url = `${getOjUrl()}/p/${pid}`
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
    const url = `${getOjUrl()}/record?uidOrName=${username}&pid=${pid}&status=1`
    const data: any = await $fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
    })
    if (!data || !data.rdocs) {
        return null;
    }
    console.log(pid, username, data.rdocs.length)
    return data.rdocs.length > 0
}
