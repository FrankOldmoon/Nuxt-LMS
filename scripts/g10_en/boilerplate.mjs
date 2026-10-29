/**
 * Step 1 of the G10-G12 English pass: kill the Chinese boilerplate.
 *
 * Every chapter in these courses carries the same handful of Chinese template
 * sentences (activity intros, list steps, the glossary heading, module pages),
 * plus full-width punctuation left over from Chinese typesetting. This script
 * replaces those exact strings with English and normalises the punctuation,
 * and leaves the per-chapter lecture prose alone - that has to be rewritten by
 * hand (see lecture-en.mjs).
 *
 *   node boilerplate.mjs --dry
 *   node boilerplate.mjs
 */
import postgres from '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/node_modules/postgres/src/index.js'

const DRY = process.argv.includes('--dry')
const COURSES = [21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]

const EXACT = {
  '🔑 概念速览': '🔑 Key Concepts',

  // whole-chapter / activity intros
  '💡 本章的概念主线：先逐个理解，再用小结串起来。':
    '💡 How the concepts fit together: take them one at a time, then use the summary to join them.',
  '📖 按顺序读每个概念小节。': '📖 Read the concept sections in order.',
  '🔍 留意公式与代码里的关键假设。': '🔍 Watch for the assumptions hidden inside the formulas and the code.',
  '📝 读完用一句话概括本章讲什么。': '📝 When you finish, sum up the chapter in one sentence.',
  '🏆 用题目检验本章的掌握程度，错题回到对应小节重读。':
    '🏆 Use the questions to check what you understood; for anything you miss, go back to that section and read it again.',
  '📝 先独立作答，不要边看答案边做。': '📝 Answer on your own first - do not look at the answers while you work.',
  '🔍 错题回到对应概念小节重读。': '🔍 Every wrong answer points at one concept section: read that section again.',
  '✅ 全部答对后再进入下一章。': '✅ Move on to the next chapter once everything is correct.',
  '📝 用小结把零散知识点串成一条线。': '📝 Use the summary to turn the loose facts into one line of reasoning.',
  '🏆 完成课后练习检验掌握程度。': '🏆 Finish the practice questions to check how much you have taken in.',

  // module overview pages
  '📖 逐个完成本模块下的课时。': '📖 Work through the lessons in this module one by one.',
  '📝 每个课时都有概念讲解与练习。': '📝 Every lesson has a concept section and practice questions.',
  '🏆 全部完成后回到总目录继续下一模块。':
    '🏆 When all of them are done, go back to the contents and start the next module.',
}
const CONCEPT_COUNT = /^💡 掌握 (\d+) 个核心概念与它们的联系。$/
const MODULE_INTRO = /^📚 (.+?)：本模块包含若干课时，按顺序完成后进入下一个模块。$/

// Full-width punctuation → ASCII. Only applied to nodes that contain no CJK
// characters, so the Chinese lecture prose is never mangled.
const PUNCT = [
  [/：/g, ': '], [/，/g, ', '], [/。/g, '. '], [/；/g, '; '], [/！/g, '! '], [/？/g, '? '],
  [/「/g, '"'], [/」/g, '"'], [/『/g, '"'], [/』/g, '"'],
  [/（/g, ' ('], [/）/g, ') '], [/、/g, ', '],
  [/——/g, ' - '], [/…/g, '...'], [/·/g, '-'], [/\u3000/g, ' '],
]
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/

const txt = (n) => {
  if (!n || typeof n !== 'object') return ''
  if (n.type === 'text') return n.text || ''
  const c = n.content
  return Array.isArray(c) ? c.map(txt).join('') : ''
}

/** Rewrite one text node, return true if it changed. */
const fixNode = (n, stats) => {
  if (n.type !== 'text' || typeof n.text !== 'string') return false
  const before = n.text
  let t = before

  if (EXACT[t]) { t = EXACT[t]; stats.exact++ }
  else if (CONCEPT_COUNT.test(t)) {
    const k = t.match(CONCEPT_COUNT)[1]
    t = `💡 Get a grip on the ${k} core concepts and the way they connect.`
    stats.exact++
  } else if (MODULE_INTRO.test(t)) {
    const title = t.match(MODULE_INTRO)[1]
    t = `📚 ${title}: this module holds several lessons; finish them in order, then move on to the next module.`
    stats.exact++
  }

  if (!CJK.test(t)) {
    for (const [re, to] of PUNCT) t = t.replace(re, to)
    t = t.replace(/ {2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1')
    if (t !== before && !EXACT[before]) stats.punct++
  }

  if (t !== before) { n.text = t; return true }
  return false
}

const walk = (n, stats) => {
  if (!n || typeof n !== 'object') return
  fixNode(n, stats)
  const c = n.content
  if (Array.isArray(c)) c.forEach((k) => walk(k, stats))
}

const sql = postgres(process.env.PG, { idle_timeout: 10, max: 1 })
const rows = await sql`select id, name, content from chapters where course_id in ${sql(COURSES)} order by id`

let touched = 0
const total = { exact: 0, punct: 0 }
for (const r of rows) {
  const stats = { exact: 0, punct: 0 }
  walk(r.content, stats)
  if (!stats.exact && !stats.punct) continue
  touched++
  total.exact += stats.exact
  total.punct += stats.punct
  if (!DRY) await sql`update chapters set content=${sql.json(r.content)} where id=${r.id}`
  if (stats.exact > 5) console.log(`  ${r.id} ${String(r.name).slice(0, 40).padEnd(42)} exact=${stats.exact} punct=${stats.punct}`)
}

console.log(`\nchapters touched: ${touched} / ${rows.length}`)
console.log(`template strings replaced: ${total.exact}`)
console.log(`nodes with punctuation normalised: ${total.punct}${DRY ? '  (dry, nothing written)' : ''}`)
await sql.end()
