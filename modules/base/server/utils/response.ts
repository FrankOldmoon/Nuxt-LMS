/**
 * 统一响应包装
 * 所有 API 返回 { data, msg, success } 格式
 */
export const cResp = (data: any, msg: string = '', success: boolean = true) => {
  return { data, msg, success }
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
