/**
 * Tidy the question names: the widget already shows a "Single Choice" /
 * "Matching" badge, so the type word inside the name is noise.
 */
const BASE = process.env.LMS || 'http://10.28.1.151'
const USER = process.env.LMS_USER || 'admin'
if (!process.env.LMS_PASS) throw new Error('请设置 LMS_PASS 环境变量（LMS 管理员密码）')
const PASS = process.env.LMS_PASS
const DRY = process.argv.includes('--dry')

const NAMES = {
  21: 'ARVR Q1 nine tasks into AR, VR or MR',
  22: 'ARVR Q2 four key technologies of AR',
  23: 'ARVR Q3 three steps of an AR frame',
  24: 'ARVR Q4 real difference between AR and VR',
  25: 'ARVR Q5 dinosaur on the classroom floor',
  26: 'ARVR Q6 four abilities AI brings to XR',
  27: 'ARVR Q7 Quest 3 can only do VR',
  28: 'ARVR Q8 two parts of a VR system',
  29: 'ARVR Q9 order of one AR frame',
}

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
if (!login.ok || !cookie) { console.error('login failed'); process.exit(1) }

for (const [cid, name] of Object.entries(NAMES)) {
  if (DRY) { console.log(`cid ${cid} -> ${name}`); continue }
  const res = await fetch(`${BASE}/api/questions/update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ course_id: 4, id: Number(cid), name }),
  })
  const body = await res.text()
  console.log(`cid ${cid}: ${res.status} ${body.slice(0, 80)}`)
}
