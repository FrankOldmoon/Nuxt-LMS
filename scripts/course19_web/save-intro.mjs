/** Rewrite the course 19 home intro to describe the full five-unit curriculum. */
const BASE = 'http://10.28.1.151'
let TOKEN = ''
async function api (p, method = 'GET', body) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Cookie: `auth_token=${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!d.success) throw new Error(`${method} ${p}: ${d.msg || r.status}`)
  return d.data
}

const intro = `> 📘 **Web Coding** teaches the three languages behind every website on the internet. You will write real code in a live editor and watch your page come alive as you type, then finish with two complete apps of your own.
> 1. 🏗️ Start with the structure of a page, then add images and layout.
> 2. 🎨 Control how everything looks — colour, fonts, spacing and the box model.
> 3. ⚡ Add logic: variables, decisions, loops and lists.
> 4. 🖱️ Make the page react to clicks, typing and form submissions.
> 5. 🏆 Build a quiz app and a to-do list from an empty editor.

## 🚀 What You Will Learn

- ✅ **HTML** for structure — headings, paragraphs, lists, links and images
- ✅ **CSS** for looks — colour, fonts, the box model, flexbox and wrapping
- ✅ **JavaScript** for logic — variables, conditions, loops, arrays and functions
- ✅ **The DOM** to find any element on a page and change it
- ✅ **Event handlers** to react to clicks, typing and form submissions
- ✅ (Extra) Two complete applications, built by you from an empty file

## 🧰 The Tool You Will Use

Every example in this course runs inside the **Web Maker**, a code editor built for this course.
It has three panes — HTML, CSS and JavaScript — and a preview that updates as you type. You can edit
and run all the code yourself, so nothing here is a screenshot.

:::callout icon=💡
You do not need to install anything, and you need no experience. If you can type a message into a
chat, you can start this course.
:::

## 🗺️ How the Course Is Built

The course is in five units, and each one builds on the last:

| Unit | Chapters | What you make |
| --- | --- | --- |
| 1. Getting Started | Web Basic · Text, Lists and Links · Images and Layout | 🏗️ Your first pages |
| 2. CSS Styling | Colours, Fonts and Text · The Box Model and Flexbox | 🎨 A page worth looking at |
| 3. JavaScript Basics | Variables and Decisions · Loops and Arrays | ⚡ Code that calculates and repeats |
| 4. Interactive Web | Functions and the DOM · Event Handlers | 🖱️ A page that answers back |
| 5. Projects | Quiz App · Todo List | 🏆 Two finished apps |

Each chapter follows the same rhythm: a short explanation, a live example you can edit, and a small
project to finish. Follow the order — later chapters reuse ideas from earlier ones.`

const login = await api('/api/auth/login', 'POST', { username: 'admin', password: 'REDACTED' })
TOKEN = login.token
await api('/api/courses/update', 'POST', { id: 19, content: intro })

// re-read and add bold marks
function boldHeadings (node, stats = { fixed: 0, total: 0 }) {
  if (!node || typeof node !== 'object') return stats
  if (node.type === 'heading') {
    for (const t of node.content || []) {
      if (t.type !== 'text') continue
      stats.total++
      const marks = Array.isArray(t.marks) ? t.marks : []
      if (!marks.some(m => m.type === 'bold')) { t.marks = [...marks, { type: 'bold' }]; stats.fixed++ }
    }
  }
  if (Array.isArray(node.content)) node.content.forEach(n => boldHeadings(n, stats))
  else if (node.content && typeof node.content === 'object') boldHeadings(node.content, stats)
  return stats
}

const c = await api('/api/courses/show?id=19')
const s = boldHeadings(c.content)
await api('/api/courses/update', 'POST', { id: 19, content: c.content })
console.log(`✔ course intro saved, bold ${s.fixed}/${s.total}`)
