/**
 * Question (vue question node) support utilities
 */

import { extractPlainText } from './textUtils'

/** Question type → display label */
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  single: 'Single Choice', judge: 'True/False', multiple: 'Multiple Choice',
  fill: 'Fill in Blank', select: 'Dropdown', sort: 'Sort',
  classify: 'Classify', puzzle: 'Puzzle', html: 'HTML',
  'short-answer': 'Short Answer', match: 'Match', composite: 'Composite',
  video: 'Video', evaluation: 'Evaluation',
}

/** Decrypt the encrypted answer value returned by the API (corresponds to backend encryptValue) */
export function decryptAnswerValue(val: any): any {
  if (typeof val !== 'string' || !val.startsWith('enc:')) return val
  const encStr = val.slice(4)
  try {
    const ENC_KEY = 'lms_q_a_2026'
    const binary = atob(encStr)
    const decoded = decodeURIComponent(escape(binary))
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
    }
    if (result !== '' && !isNaN(Number(result))) return Number(result)
    return result
  } catch {
    return val
  }
}

/** Recursively scan Tiptap JSON, collecting cids of all vue question nodes */
export function collectVueQuestionCids(nodes: any[], cids: number[]): void {
  for (const node of nodes || []) {
    if (!node) continue
    if (node.type === 'vue' && node.attrs?.type === 'question') {
      const c = node.attrs.content
      // String/number type content is a cid; object type is an inline question (no API needed)
      if (c != null && typeof c !== 'object') {
        const cid = Number(c)
        if (cid > 0 && !cids.includes(cid)) {
          cids.push(cid)
        }
      }
    }
    // Recursively scan child nodes
    if (Array.isArray(node.content)) {
      collectVueQuestionCids(node.content, cids)
    }
  }
}

/** Format answer as readable text (automatically decrypts encrypted values) */
export function formatQuestionAnswer(questionData: any): string {
  const answer = questionData.answer
  if (!Array.isArray(answer) || answer.length === 0) return ''
  const decrypted = answer.map(decryptAnswerValue)
  const type = questionData.type
  const options = questionData.options || []

  if (type === 'single' || type === 'multiple') {
    return decrypted.map((idx: any) => String.fromCharCode(65 + Number(idx))).join(', ')
  }
  if (type === 'judge') {
    return decrypted.map((idx: any) => Number(idx) === 0 ? 'Correct' : 'Wrong').join(', ')
  }
  if (type === 'sort') {
    return decrypted.map((idx: any, i: number) => {
      const opt = options[idx]
      const optText = typeof opt === 'string'
        ? opt
        : (opt && typeof opt === 'object' ? extractPlainText(opt) : '#')
      return `${i + 1}. ${optText}`
    }).join('  ')
  }
  if (type === 'fill' || type === 'select') {
    return decrypted.map((ans: any, i: number) => {
      const isRegex = options[i] === 'regex'
      return isRegex ? `${ans} (regex)` : String(ans)
    }).join('  |  ')
  }
  if (type === 'short-answer') {
    return `Regex: ${decrypted[0] || ''}`
  }
  if (type === 'match') {
    return decrypted.map((_: any, i: number) =>
      `${options[i]?.left || ''} ↔ ${options[i]?.right || ''}`).join('  ')
  }
  if (type === 'classify') {
    return decrypted.map((idx: any, i: number) =>
      `${options[i]?.name || `#${i + 1}`}: ${options[i]?.items?.[idx] || ''}`).join('  ')
  }
  return decrypted.map(String).join(', ')
}
