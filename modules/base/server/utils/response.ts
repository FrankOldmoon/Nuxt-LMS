/**
 * 统一响应包装
 * 所有 API 返回 { data, msg, success, code } 格式
 *
 * code：可选的机器可读错误码（仅失败时使用），供前端做"不可重试"等分支判断，
 * 避免依赖易变的中文 msg 文案做字符串匹配。
 */
export const cResp = (data: any, msg: string = '', success: boolean = true, code?: string) => {
  return code ? { data, msg, success, code } : { data, msg, success }
}

/** 从 query 中获取 id 参数，无效则返回 0 */
export function getQueryId(event: any): number {
  return Number(getQuery(event).id)
}

/** 从 query 中获取并校验 id 参数，无效则返回 null */
export function requireQueryId(event: any): number | null {
  const id = Number(getQuery(event).id)
  return id || null
}
