/**
 * Unified response wrapper
 * All APIs return { data, msg, success } format
 */
export const cResp = (data: any, msg: string = '', success: boolean = true) => {
  return { data, msg, success }
}

/** Get id param from query, return 0 if invalid */
export function getQueryId(event: any): number {
  return Number(getQuery(event).id)
}

/** Get and validate id param from query, return null if invalid */
export function requireQueryId(event: any): number | null {
  const id = Number(getQuery(event).id)
  return id || null
}
