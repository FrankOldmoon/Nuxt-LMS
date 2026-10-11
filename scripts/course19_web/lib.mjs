/**
 * Shared builder that emits the skills/03 locked chapter layout as markdown.
 * Every chapter and unit intro in course 19 is generated through this, so the
 * skeleton stays identical across the whole course.
 */

const MAKER = 'http://10.28.1.154:8095/create/'

/** Web Maker URL that pre-fills the HTML / CSS / JS editor panes. */
export function maker ({ html = '', css = '', js = '', layout = 1 }) {
  const q = new URLSearchParams()
  q.set('layout', String(layout))
  if (html) q.set('html', html)
  if (css) q.set('css', css)
  if (js) q.set('js', js)
  return MAKER + '?' + q.toString()
}

/** Live Web Maker embed. The src is URL-encoded, so it never contains spaces. */
export const embed = (url, height = 600) => `:::iframe src=${url} height=${height}\n:::`

/* ------------------------------------------------------------ block helpers */

export const p = (...parts) => parts.map(x => typeof x === 'string' ? x : x.md).join('')
export const bold = (t) => ({ md: `**${t}**` })
export const code = (t) => ({ md: `\`${t}\`` })

export function h3 (title) { return `### ${title}\n` }
export function para (text) { return `${text}\n` }

/** Fenced code block; the language is mandatory (skills/03 rule ③). */
export function block (lang, text) { return '```' + lang + '\n' + text + '\n```\n' }

export function bullets (items) {
  return items.map(i => `- ${i}`).join('\n') + '\n'
}

/** Callout. The icon renders once from the fence, so never repeat it in the body. */
export function callout (icon, text) { return `:::callout icon=${icon}\n${text}\n:::\n` }

/** Two-column table. First row is the header. */
export function table (headers, rows) {
  const out = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`]
  for (const r of rows) out.push(`| ${r.join(' | ')} |`)
  return out.join('\n') + '\n'
}

/** Glossary: Term cells carry a semantic emoji, definitions use technical prose. */
export function glossary (terms) {
  return table(
    ['Term', 'Definition'],
    terms.map(([term, def]) => [`${term}`, def])
  )
}

/** Ordered list of steps, used inside the Activity intro blockquote. */
export const steps = (items) => items.map((s, i) => `${i + 1}. ${s}`).join('\n')

/* ------------------------------------------------------------- chapter build */

/**
 * Assemble a full chapter.
 * @param {object} spec
 * @param {string} spec.overview  one 📘 sentence for the chapter-intro blockquote
 * @param {string[]} spec.points  one bullet per Activity
 * @param {string[]} spec.objectives 4–5 objectives, last one starts with (Extra)
 * @param {[string,string][]} spec.glossary ~6 terms
 * @param {{title,summary,steps,body}[]} spec.activities
 * @param {boolean} [spec.isUnitIntro] unit group pages use "What this unit covers" h2s
 */
export function chapter (spec) {
  const out = []

  // ⑪ chapter intro blockquote: overview paragraph + orderedList of points
  out.push(`> 📘 ${spec.overview}`)
  out.push(spec.points.map((x, i) => `> ${i + 1}. ${x}`).join('\n'))
  out.push('')

  // Learning Objectives
  out.push('## 🎯 Learning Objectives')
  out.push('')
  out.push(bullets(spec.objectives))
  out.push('')

  // Glossary
  out.push('### 📖 Glossary')
  out.push('')
  out.push(glossary(spec.glossary))
  out.push('')

  // Activities
  spec.activities.forEach((act, i) => {
    const last = i === spec.activities.length - 1
    const title = last && act.extra ? `🧪 Activity ${i + 1} (Extra) Finish more` : `🧪 Activity ${i + 1} ${act.title}`
    out.push(`## ${title}`)
    out.push('')
    // ⑨ every Activity h2 is followed by one blockquote: [summary, orderedList]
    out.push(`> ${act.summary}`)
    out.push(steps(act.steps).split('\n').map(l => '> ' + l).join('\n'))
    out.push('')
    out.push(act.body.trim())
    out.push('')
  })

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/**
 * Unit group page: same opening skeleton, then roadmap h2s instead of Activities
 * (a group has no hands-on task of its own).
 */
export function unitIntro (spec) {
  const out = []
  out.push(`> 📘 ${spec.overview}`)
  out.push(spec.points.map((x, i) => `> ${i + 1}. ${x}`).join('\n'))
  out.push('')
  out.push('## 🎯 Learning Objectives')
  out.push('')
  out.push(bullets(spec.objectives))
  out.push('')
  out.push('### 📖 Glossary')
  out.push('')
  out.push(glossary(spec.glossary))
  out.push('')
  for (const sec of spec.sections) {
    out.push(`## ${sec.title}`)
    out.push('')
    out.push(`> ${sec.summary}`)
    out.push(sec.steps.map((s, i) => `> ${i + 1}. ${s}`).join('\n'))
    out.push('')
    out.push(sec.body.trim())
    out.push('')
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
