/**
 * 提交 API 统一 try/catch 错误边界
 *
 * 用法：
 *   export default withSubmitHandler('提交题目失败', async (event) => {
 *     const ctx = await parseSubmitContext(event, { cidField: 'question_cid', sectionKey: 'question' })
 *     // ...业务逻辑，返回 { data, success } 形式
 *     return cResp({ gainedExp: 5 })
 *   })
 *
 * 特性：
 *  - 业务校验错误（SubmitContextError）→ 返回 cResp(null, message, false)
 *  - 认证/权限错误（statusCode 4xx）→ 重新抛出，由 Nitro 自动转为 HTTP 响应
 *  - 其它异常（DB 错误、运行时 bug）→ 控制台打印完整错误，向客户端返回通用兜底文案，
 *    避免泄露 SQL 语句 / 表结构等内部信息（M1 安全加固）
 *  - 成功返回 → 直接透传 handler 的返回值
 */
import { SubmitContextError } from './context'

export type SubmitHandler<E = any> = (event: E) => Promise<any>

/**
 * 包装一个 submit 事件 handler，添加统一 try/catch + cResp 错误返回。
 *
 * @param fallbackMessage 异常时返回的兜底文案，如 '提交题目失败'
 * @param handler 业务处理函数，应返回 cResp(...) 形式
 */
export function withSubmitHandler<E = any>(
  fallbackMessage: string,
  handler: SubmitHandler<E>,
) {
  return async (event: E) => {
    try {
      return await handler(event)
    } catch (err: any) {
      // 业务校验错误
      if (err instanceof SubmitContextError) {
        return cResp(null, err.message, false)
      }
      // 认证/权限错误（4xx）：重新抛出，由 Nitro 转为 HTTP 响应
      if (err && typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
        throw err
      }
      // 其它异常：记录完整错误，仅向客户端返回通用兜底文案（不泄露 SQL/内部信息）
      console.error(`[${fallbackMessage}]`, err)
      return cResp(null, fallbackMessage, false)
    }
  }
}
