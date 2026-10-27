/**
 * 冒烟测试：按"全对"提交一份答卷，看自动判分是否满分
 *
 * 为什么要测：exam 模式的判分靠 option 节点上的 examCorrectAnswer，
 * 结构错了卷子照样能建成功、但判分永远 0 分 —— 那等于白建。
 * 顺带验证答案提交格式：值是 **对象 Map**（键 = 选项/空的 id），
 * 这是 AnswerScoreEvaluator 里 `(Map) answer.get(qId)` 要求的。
 *
 * 用法：node scripts/exam-course5/smoke-answer.mjs --id khsjLN
 * 测完会自动删掉这份测试答卷。
 */
import { createClient, SK } from './sk-client.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(n)
  return i >= 0 ? argv[i + 1] : d
}
const projectId = opt('--id', '')
if (!projectId) {
  console.error('用法: node scripts/exam-course5/smoke-answer.mjs --id <projectId>')
  process.exit(1)
}

const TYPES = ['Radio', 'Checkbox', 'FillBlank']
const client = await createClient()
let answerId = ''
try {
  const project = (await (await client.step(`${SK}/api/project?id=${projectId}`)).json())?.data
  const qs = (project.survey?.children || []).filter((c) => TYPES.includes(c.type))
  console.log(`试卷 ${projectId}：${qs.length} 题`)

  // 按正确答案构造答卷：每题一个 Map，键是选中选项 / 空的 id
  const answer = {}
  for (const q of qs) {
    const picked = {}
    if (q.type === 'FillBlank') {
      const blank = q.children?.[0]
      if (blank && blank.attribute?.examCorrectAnswer) picked[blank.id] = blank.attribute.examCorrectAnswer
    } else {
      for (const o of q.children || []) {
        if (o.attribute?.examCorrectAnswer != null) picked[o.id] = true
      }
    }
    answer[q.id] = picked
  }

  const res = await client.step(`${SK}/api/answer/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ projectId, answer, tempSave: 1 }),
  })
  const body = await res.json().catch(() => ({}))
  if (body?.code !== 200) throw new Error(`提交答卷失败：HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`)
  console.log('  答卷已提交 ✓')

  const list = await (
    await client.step(`${SK}/api/answer/list?projectId=${projectId}&pageSize=5&current=1`)
  ).json()
  const rows = list?.data?.list || list?.data?.records || list?.data || []
  const latest = Array.isArray(rows) ? rows[0] : null
  if (!latest) throw new Error(`答卷列表读不到：${JSON.stringify(list).slice(0, 200)}`)
  answerId = latest.id

  const total = qs.reduce(
    (s, q) =>
      s + (q.type === 'FillBlank' ? q.children?.[0]?.attribute?.examScore || 0 : q.attribute?.examScore || 0),
    0,
  )
  const got = latest.examScore ?? latest.score
  console.log(`  得分：${got} / ${total}`)
  const perQ = Object.values(latest.examInfo?.questionScore || {})
  if (perQ.length) {
    const zero = Object.entries(latest.examInfo.questionScore).filter(([, v]) => !v).map(([k]) => k)
    if (zero.length) console.log(`  得 0 分的题（${zero.length} 道）:`, zero.slice(0, 10).join(', '))
  }
  if (Number(got) === Number(total)) console.log('\n✅ 自动判分正确（全对 = 满分）')
  else {
    console.log('\n⚠️ 判分不等于满分')
    process.exitCode = 1
  }
} catch (e) {
  console.error('\n❌', e.message)
  process.exitCode = 1
} finally {
  if (answerId) {
    const del = await client.step(`${SK}/api/answer/delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, ids: [answerId] }),
    })
    const d = await del.json().catch(() => ({}))
    console.log(d?.code === 200 ? '  测试答卷已删除' : `  测试答卷删除失败（可手动删）：${JSON.stringify(d).slice(0, 120)}`)
  }
  await client.close()
}
