/**
 * 校验 SurveyKing 上已创建的试卷是否与本地 exam.json 一致
 *
 * 检查项：题目数量与顺序、题型、分值、题干、选项、正确答案标记、总分
 *
 * 注意 schema 里答案的位置（照 AnswerScoreEvaluator）：
 *   选择：正确答案在**选项**节点的 attribute.examCorrectAnswer，分值在**题目**上
 *   填空：答案与分值都在**空子节点**上
 *
 * 用法：node scripts/exam-course5/verify.mjs --id khsjLN
 */
import { readFileSync } from 'node:fs'
import { createClient, SK } from './sk-client.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : d
}
const projectId = opt('--id', '')
if (!projectId) {
  console.error('用法: node scripts/exam-course5/verify.mjs --id <projectId>')
  process.exit(1)
}

const local = JSON.parse(readFileSync(new URL('./exam.json', import.meta.url), 'utf8'))
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim()
const TYPES = ['Radio', 'Checkbox', 'FillBlank']

/** 一道题的可比特征（与 schema 里答案/分值的位置对齐） */
function fingerprint(q) {
  const marked = (q.children || [])
    .map((o, i) => (o.attribute?.examCorrectAnswer != null ? i : -1))
    .filter((i) => i >= 0)
  if (q.type === 'FillBlank') {
    const blank = q.children?.[0]
    return {
      type: q.type,
      stem: norm(q.title),
      mode: q.attribute?.examAnswerMode,
      score: blank?.attribute?.examScore,
      answer: norm(blank?.attribute?.examCorrectAnswer),
      options: (q.children || []).length,
    }
  }
  return {
    type: q.type,
    stem: norm(q.title),
    mode: q.attribute?.examAnswerMode,
    score: q.attribute?.examScore,
    answer: marked.join(','),
    options: (q.children || []).map((o) => norm(o.title)).join(' | '),
  }
}

const client = await createClient()
try {
  const body = await (await client.step(`${SK}/api/project?id=${projectId}`)).json()
  const p = body?.data
  if (!p) throw new Error(`读取失败：${JSON.stringify(body).slice(0, 300)}`)

  const remoteQs = (p.survey?.children || []).filter((c) => TYPES.includes(c.type))
  const localQs = local.survey.children.filter((c) => TYPES.includes(c.type))

  console.log(`试卷名: ${p.name}`)
  console.log(`模式  : ${p.mode}   状态: ${p.status}（1=已发布）`)
  console.log(`题数  : 远端 ${remoteQs.length} / 本地 ${localQs.length}`)
  console.log('题型  :', remoteQs.reduce((a, c) => ((a[c.type] = (a[c.type] || 0) + 1), a), {}))

  const total = remoteQs.reduce(
    (s, q) =>
      s + (q.type === 'FillBlank' ? q.children?.[0]?.attribute?.examScore || 0 : q.attribute?.examScore || 0),
    0,
  )
  console.log('总分  :', total)

  const problems = []
  localQs.forEach((lq, i) => {
    const rq = remoteQs[i]
    if (!rq) return problems.push(`第 ${i + 1} 题缺失`)
    const a = fingerprint(lq)
    const b = fingerprint(rq)
    for (const k of Object.keys(a)) {
      if (String(a[k]) !== String(b[k])) {
        problems.push(`第 ${i + 1} 题 ${k} 不一致\n      本地: ${String(a[k]).slice(0, 90)}\n      远端: ${String(b[k]).slice(0, 90)}`)
      }
    }
  })

  if (problems.length) {
    console.log(`\n❌ 发现 ${problems.length} 处差异：`)
    problems.slice(0, 8).forEach((x) => console.log('  -', x))
    if (problems.length > 8) console.log(`  ...还有 ${problems.length - 8} 处`)
    process.exitCode = 1
  } else {
    console.log('\n✅ 题干、选项、正确答案标记、分值与本地完全一致')
  }
  console.log(`\n编辑页: ${SK}/project/${projectId}`)
  console.log(`填写页: ${SK}/s/${projectId}`)
} finally {
  await client.close()
}
