/**
 * Submit API unified try/catch error boundary
 *
 * Usage:
 *   export default withSubmitHandler('Failed to submit question', async (event) => {
 *     const ctx = await parseSubmitContext(event, { cidField: 'question_cid', sectionKey: 'question' })
 *     // ...business logic, returns { data, success } form
 *     return cResp({ gainedExp: 5 })
 *   })
 *
 * Features:
 *  - Business validation errors (SubmitContextError) → returns cResp(null, message, false)
 *  - Auth/permission errors (statusCode 4xx) → re-thrown, automatically converted to HTTP response by Nitro
 *  - Other exceptions → console log + returns cResp(null, fallbackMessage, false)
 *  - Successful return → directly passes through the handler's return value
 */
import { SubmitContextError } from './context'

export type SubmitHandler<E = any> = (event: E) => Promise<any>

/**
 * Wraps a submit event handler, adding unified try/catch + cResp error return.
 *
 * @param fallbackMessage Fallback message returned on exception, e.g. 'Failed to submit question'
 * @param handler Business processing function, should return cResp(...) form
 */
export function withSubmitHandler<E = any>(
  fallbackMessage: string,
  handler: SubmitHandler<E>,
) {
  return async (event: E) => {
    try {
      return await handler(event)
    } catch (err: any) {
      // Business validation error
      if (err instanceof SubmitContextError) {
        return cResp(null, err.message, false)
      }
      // Auth/permission error (4xx): re-throw, converted to HTTP response by Nitro
      if (err && typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
        throw err
      }
      // Other exceptions: fallback
      console.error(`[${fallbackMessage}]`, err)
      return cResp(null, err?.message || fallbackMessage, false)
    }
  }
}
