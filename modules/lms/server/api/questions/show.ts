import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"  // 仅需导入 eq 和 and

// 简单加密密钥（不对外公开，仅做轻度混淆）
const ENC_KEY = 'lms_q_a_2026'

/**
 * 对字符串进行简单加密：XOR + Base64
 * 非字符串值（数字等）先转字符串，解密时由前端自行转换
 */
function encryptValue(val: any): string {
  const str = String(val)
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
  }
  // Base64 编码（兼容中文，先转 UTF-8 再编码）
  const utf8 = unescape(encodeURIComponent(result))
  let binary = ''
  for (let i = 0; i < utf8.length; i++) {
    binary += String.fromCharCode(utf8.charCodeAt(i))
  }
  return btoa(binary)
}

export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  // 从 schema 中获取 questions 表（根据实际导出结构调整）
  const { questions } = schema

  const data = await db.query.questions.findFirst({
    where: and(
      eq(questions.courseId, Number(course_id)),
      eq(questions.cid, Number(cid))
    )
  })

  // OJ 题型：content 存的是 pid，用 fetchOj 拉取题目内容替换 content 供前端展示；
  // 同时把 pid 放入 options，供编辑回填与渲染「前往 OJ」链接使用。
  if (data && data.type === 'oj') {
    const pid = String(data.content || '')
    if (pid) {
      const opts: any = data.options
      if (!opts || typeof opts !== 'object' || Array.isArray(opts) || !opts.pid) {
        data.options = { pid }
      }
      try {
        const ojContent = await fetchOj(pid)
        if (ojContent != null) data.content = ojContent
      } catch { /* OJ 拉取失败时保留原始 content（pid） */ }
    }
  }

  // 对 answer 数组加密，防止直接从前端源码查看正确答案
  if (data && Array.isArray(data.answer)) {
    data.answer = data.answer.map((ans: any) => 'enc:' + encryptValue(ans))
  }

  return cResp(data)
})