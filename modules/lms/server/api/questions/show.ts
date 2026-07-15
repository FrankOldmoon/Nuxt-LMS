import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"  // Only need to import eq and and

// Simple encryption key (not for public exposure, only for light obfuscation)
const ENC_KEY = 'lms_q_a_2026'

/**
 * Simple string encryption: XOR + Base64
 * Non-string values (numbers, etc.) are converted to string first,
 * and the frontend will convert them back when decrypting
 */
function encryptValue(val: any): string {
  const str = String(val)
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
  }
  // Base64 encoding (compatible with Chinese characters, convert to UTF-8 first)
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
    return cResp(null, 'Missing id parameter', false)
  }

  // Get questions table from schema (adjust according to actual export structure)
  const { questions } = schema

  const data = await db.query.questions.findFirst({
    where: and(
      eq(questions.courseId, Number(course_id)),
      eq(questions.cid, Number(cid))
    )
  })

  // Encrypt the answer array to prevent the correct answer from being directly read from frontend source
  if (data && Array.isArray(data.answer)) {
    data.answer = data.answer.map((ans: any) => 'enc:' + encryptValue(ans))
  }

  return cResp(data)
})