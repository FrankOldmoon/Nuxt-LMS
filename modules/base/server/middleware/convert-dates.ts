/**
 * Date field auto-conversion middleware
 *
 * Date fields sent from the frontend via JSON are strings (ISO format or datetime-local),
 * but Drizzle's timestamp column requires Date objects, otherwise it throws `value.toISOString is not a function`.
 *
 * This middleware runs in all /api/** write requests (POST/PUT/PATCH/DELETE),
 * recursively scans the body, converts string values of date field names to Date objects,
 * and writes back to h3's body cache so subsequent readBody calls get the converted values.
 *
 * Date field identification rules:
 * - Field name ends with "At" (startAt, endAt, createdAt, updatedAt, deletedAt, loginAt, readAt...)
 * - Field name ends with "Date"
 * - Field name is "birthday"
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

/** Recursive conversion: convert string values matching date field names to Date */
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

  // Only process write requests under /api/
  if (!path.startsWith('/api/')) return
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return

  // Only process JSON requests
  const contentType = getRequestHeader(event, 'content-type') || ''
  if (!contentType.includes('application/json')) return

  try {
    // Read body (h3 caches to request[ParsedBodySymbol])
    const body = await readBody(event)
    if (body === null || body === undefined || typeof body !== 'object') return

    // Convert date fields and write back to cache so subsequent readBody calls get the converted values
    const converted = convertDateFields(body)
    event.node.req[ParsedBodySymbol] = converted
  } catch {
    // Silent on body parse failure (let the handler handle the error)
  }
})
