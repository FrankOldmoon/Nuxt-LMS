/**
 * 日期字段自动转换中间件
 *
 * 前端通过 JSON 传来的日期字段是字符串（ISO 格式或 datetime-local），
 * 但 Drizzle 的 timestamp 列要求 Date 对象，否则报 `value.toISOString is not a function`。
 *
 * 此中间件在所有 /api/** 写请求（POST/PUT/PATCH/DELETE）中，
 * 递归扫描 body，将日期字段名的字符串值转为 Date 对象，
 * 并写回 h3 的 body 缓存，使后续 readBody 拿到转换后的值。
 *
 * 日期字段识别规则：
 * - 字段名以 "At" 结尾（startAt, endAt, createdAt, updatedAt, deletedAt, loginAt, readAt...）
 * - 字段名以 "Date" 结尾
 * - 字段名为 "birthday"
 */

const ParsedBodySymbol = Symbol.for('h3ParsedBody')

const DATE_FIELDS = new Set(['birthday'])
const DATE_SUFFIXES = ['At', 'Date']        // camelCase: startAt, createdAt
const DATE_SNAKE_SUFFIXES = ['_at', '_date'] // snake_case: last_question_started_at, created_at

function isDateField(key: string): boolean {
  if (DATE_FIELDS.has(key)) return true
  if (DATE_SUFFIXES.some((s) => key.endsWith(s))) return true
  return DATE_SNAKE_SUFFIXES.some((s) => key.endsWith(s))
}

/** 递归转换：将匹配日期字段名的字符串值转为 Date */
function convertDateFields(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertDateFields)
  if (obj instanceof Date) return obj
  if (typeof obj === 'object') {
    const result: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (isDateField(key) && typeof val === 'string' && val) {
        const d = new Date(val)
        result[key] = isNaN(d.getTime()) ? val : d
      } else if (val !== null && typeof val === 'object') {
        result[key] = convertDateFields(val)
      } else {
        result[key] = val
      }
    }
    return result
  }
  return obj
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const path = getRequestPath(event)

  // 仅处理 /api/ 下的写请求
  if (!path.startsWith('/api/')) return
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return

  // 仅处理 JSON 请求
  const contentType = getRequestHeader(event, 'content-type') || ''
  if (!contentType.includes('application/json')) return

  try {
    // 读取 body（h3 会缓存到 request[ParsedBodySymbol]）
    const body = await readBody(event)
    if (body === null || body === undefined || typeof body !== 'object') return

    // 转换日期字段并写回缓存，使后续 readBody 调用拿到转换后的值
    const converted = convertDateFields(body)
    event.node.req[ParsedBodySymbol] = converted
  } catch {
    // body 解析失败时静默（交由 handler 处理错误）
  }
})
