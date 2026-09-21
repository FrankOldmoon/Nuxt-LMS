/**
 * 把 skills/*.md 发布到线上 Teacher Handbook（course 1）的「AI Skills」分组章节。
 *
 * 线上现状（courses.orders）：
 *   1081 AI Skills（分组章节，parentId=null）
 *     ├─ 1082 Batch Course Creation    ← skills/01
 *     ├─ 1083 Course Tree & Orders     ← skills/02
 *     ├─ 1084 Writing Chapter Content  ← skills/03
 *     ├─ 1085 Local Run End-to-End     ← skills/04
 *     ├─ 1086 Delete & Restore         ← skills/05
 *     ├─ 1087 Interactive Components   ← skills/06
 *     └─ 1088 File Upload              ← skills/07
 *   skills/08、09 线上没有对应章节 → 本脚本新建并挂到 1081 下（排在 File Upload 之后）。
 *
 * 转换口径（与线上既有 7 章保持一致，等价于章节保存接口的 normalizeContent）：
 *   去掉首行 `# Skill: ...` 一级标题（章节标题由课程树承担，正文按 skills/03 约定不用 h1）
 *   → markdownToTiptap（复用 modules/lms/utils/markdown.ts）→ 补 heading 的 id/data-toc-id
 *
 * 写库方式：直连 .env 的 POSTGRES_URL（当前指向 10.28.1.151）。
 *   - 覆盖已有章节前，把旧 content 存入 chapter_versions（与 /api/chapters/update 行为一致，每章保留最近 50 份）
 *   - 同步维护 courses.orders（新增两章）与 1081 概览的目录清单
 *
 * 用法：
 *   node scripts/publish_skills_handbook.mjs            # DRY-RUN：只比对并打印计划，不写库
 *   node scripts/publish_skills_handbook.mjs --apply    # 真正写库
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import postgres from 'postgres'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')

const COURSE_ID = 1
const GROUP_ID = 1081 // "AI Skills" 分组章节

/** chapterId=null 表示线上尚无对应章节，需要新建 */
const PLAN = [
  { file: '01-batch-create-courses.md', chapterId: 1082 },
  { file: '02-create-course-orders.md', chapterId: 1083 },
  { file: '03-create-chapter-content.md', chapterId: 1084 },
  { file: '04-local-run-markdown-course.md', chapterId: 1085 },
  { file: '05-delete-course-chapter.md', chapterId: 1086 },
  { file: '06-interactive-components.md', chapterId: 1087 },
  { file: '07-file-upload.md', chapterId: 1088 },
  { file: '08-course-covers.md', chapterId: null, name: 'Course Covers' },
  { file: '09-oj-question-and-sort-answer.md', chapterId: null, name: 'OJ Question & Sort Answer' },
]

/** 1081 概览里为新增章节补的两条目录项 */
const NEW_INDEX_ITEMS = [
  '✅ Generating and uploading course covers (SVG → PNG)',
  '✅ OJ questions and sort-answer authoring conventions',
]

const MAX_VERSIONS_KEPT = 50

// ---------- 数据库连接串（优先进程环境变量，其次项目根目录 .env） ----------
function loadPostgresUrl() {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL
  const envPath = resolve(ROOT, '.env')
  if (!existsSync(envPath)) throw new Error('未找到 POSTGRES_URL 环境变量或项目根目录的 .env 文件')
  const line = readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('POSTGRES_URL='))
  if (!line) throw new Error('.env 中未配置 POSTGRES_URL')
  return line.slice('POSTGRES_URL='.length).trim().replace(/^["']|["']$/g, '')
}

// ---------- markdown → tiptap（复用源码里的转换函数） ----------
const { markdownToTiptap } = await import(
  pathToFileURL(resolve(ROOT, 'modules/lms/utils/markdown.ts')).href
)

/** 去掉首行的 `# Skill: ...` 一级标题 */
function stripSkillTitle(markdown) {
  return markdown.replace(/^\s*#\s+[^\n]*\n/, '')
}

/** 与 server/utils/content.ts 的 addHeadingIds 一致：给缺 id 的 heading 补 id/data-toc-id */
function addHeadingIds(node) {
  if (!node || typeof node !== 'object') return
  if (node.type === 'heading' && !node.attrs?.id) {
    if (!node.attrs) node.attrs = {}
    const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)
    node.attrs.id = id
    node.attrs['data-toc-id'] = id
  }
  if (Array.isArray(node.content)) node.content.forEach(addHeadingIds)
  else if (node.content && typeof node.content === 'object') addHeadingIds(node.content)
}

function docOf(markdown) {
  const doc = markdownToTiptap(stripSkillTitle(markdown))
  addHeadingIds(doc)
  return doc
}

/**
 * 复用旧内容里同名 heading 的 id/data-toc-id：
 * - 重复执行本脚本时内容完全一致（幂等，不会反复写库/产生版本快照）
 * - 已有锚点链接保持稳定
 */
function adoptHeadingIds(doc, oldDoc) {
  const idByText = new Map()
  const collect = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'heading' && n.attrs?.id) {
      const text = (n.content || []).map((c) => c.text || '').join('')
      if (!idByText.has(text)) idByText.set(text, n.attrs.id)
    }
    if (Array.isArray(n.content)) n.content.forEach(collect)
    else if (n.content && typeof n.content === 'object') collect(n.content)
  }
  const apply = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'heading') {
      const text = (n.content || []).map((c) => c.text || '').join('')
      const id = idByText.get(text)
      if (id) {
        if (!n.attrs) n.attrs = {}
        n.attrs.id = id
        n.attrs['data-toc-id'] = id
      }
    }
    if (Array.isArray(n.content)) n.content.forEach(apply)
    else if (n.content && typeof n.content === 'object') apply(n.content)
  }
  collect(oldDoc)
  apply(doc)
}

// ---------- 差异比对辅助 ----------
/**
 * 规范化序列化（递归按 key 排序）。
 * Postgres jsonb 会按自己的规则重排 key，直接 JSON.stringify 比对会把"键序不同"
 * 误判成内容变化，导致每次运行都重写一遍；规范化后再比对才是真正的内容比对。
 */
function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function collectTexts(node, out = []) {
  if (!node || typeof node !== 'object') return out
  if (node.type === 'text' && typeof node.text === 'string') out.push(node.text.replace(/\s+/g, ' ').trim())
  if (Array.isArray(node.content)) node.content.forEach((c) => collectTexts(c, out))
  else if (node.content && typeof node.content === 'object') collectTexts(node.content, out)
  return out
}

function blocksOf(doc) {
  return doc && Array.isArray(doc.content) ? doc.content : []
}

const sql = postgres(loadPostgresUrl(), { max: 1, connect_timeout: 15 })

try {
  // ---------- 读取课程树 + 相关章节 ----------
  const [course] = await sql`select id, name, orders from courses where id = ${COURSE_ID}`
  if (!course) throw new Error(`course ${COURSE_ID} 不存在`)
  const orders = Array.isArray(course.orders) ? structuredClone(course.orders) : []

  const group = orders.find((o) => String(o.id) === String(GROUP_ID))
  if (!group) throw new Error(`orders 里找不到分组章节 ${GROUP_ID}`)
  const children = orders.filter((o) => String(o.parentId) === String(GROUP_ID))

  // 安全校验 + 幂等：PLAN 里 chapterId 为 null 的项，若同名子章节已存在（脚本已跑过），转为更新而非新建
  const childIdSet = new Set(children.map((c) => Number(c.id)))
  const childIdByName = new Map(children.map((c) => [String(c.label), Number(c.id)]))
  for (const item of PLAN) {
    if (item.chapterId === null && childIdByName.has(item.name)) {
      item.chapterId = childIdByName.get(item.name)
    }
    if (item.chapterId !== null && !childIdSet.has(item.chapterId)) {
      throw new Error(
        `映射不一致，已中止：章节 #${item.chapterId}（${item.file}）不是分组 ${GROUP_ID} 的子章节。\n` +
        `  订单中 ${GROUP_ID} 的子章节: ${JSON.stringify([...childIdSet].sort((a, b) => a - b))}`
      )
    }
  }

  const [groupChapter] = await sql`select id, name, content from chapters where id = ${GROUP_ID} and deleted_at is null`
  if (!groupChapter) throw new Error(`章节 ${GROUP_ID} 不存在`)

  const nextOrder = children.reduce((m, c) => Math.max(m, Number(c.order) || 0), 0) + 1

  console.log(`目标：course ${COURSE_ID}「${course.name}」/ 分组 ${GROUP_ID}「${group.label}」`)
  console.log(`模式：${APPLY ? 'APPLY（会写库）' : 'DRY-RUN（仅比对）'}\n`)

  /** 新建章节的记录（dry-run 时 id 为 null，仅用于打印计划） */
  const createdChapters = []

  for (const item of PLAN) {
    const mdPath = resolve(ROOT, 'skills', item.file)
    const md = readFileSync(mdPath, 'utf8')
    const doc = docOf(md)
    const newTexts = new Set(collectTexts(doc).filter((t) => t.length > 25))

    if (item.chapterId) {
      const [row] = await sql`select id, name, content from chapters where id = ${item.chapterId} and deleted_at is null`
      if (!row) throw new Error(`章节 ${item.chapterId} 不存在`)

      adoptHeadingIds(doc, row.content)
      const oldBlocks = blocksOf(row.content)
      const newBlocks = blocksOf(doc)
      const oldTexts = collectTexts(row.content).filter((t) => t.length > 25)
      const removed = oldTexts.filter((t) => !newTexts.has(t))
      const changed = canon(row.content) !== canon(doc)

      console.log(`#${item.chapterId} ${row.name}`)
      console.log(`   ${item.file} | blocks ${oldBlocks.length} → ${newBlocks.length} | ${changed ? '内容有变化' : '已是最新（无需写入）'}`)
      if (removed.length) {
        console.log(`   将被移除的旧文本片段（${removed.length} 处，前 3）：`)
        removed.slice(0, 3).forEach((t) => console.log(`     - ${t.slice(0, 100)}`))
      }

      if (APPLY && changed) {
        await sql.begin(async (tx) => {
          await tx`insert into chapter_versions (chapter_id, content) values (${item.chapterId}, ${tx.json(row.content)})`
          await tx`
            delete from chapter_versions
            where chapter_id = ${item.chapterId}
              and id not in (
                select id from chapter_versions
                where chapter_id = ${item.chapterId}
                order by id desc limit ${MAX_VERSIONS_KEPT}
              )`
          await tx`update chapters set content = ${tx.json(doc)}, updated_at = now() where id = ${item.chapterId}`
        })
        console.log('   ✅ 已更新（旧内容已存 chapter_versions）')
      }
    } else {
      console.log(`#(新建) ${item.name}`)
      console.log(`   ${item.file} | blocks ${blocksOf(doc).length}`)

      if (APPLY) {
        const [created] = await sql`
          insert into chapters (name, course_id, content, is_open)
          values (${item.name}, ${COURSE_ID}, ${sql.json(doc)}, true)
          returning id`
        createdChapters.push({ name: item.name, id: created.id })
        console.log(`   ✅ 已创建章节 #${created.id}`)
      } else {
        createdChapters.push({ name: item.name, id: null })
      }
    }
  }

  // ---------- 1081 概览目录：补上新增章节的两条 ----------
  const groupDoc = structuredClone(groupChapter.content)
  const bulletList = blocksOf(groupDoc).find((b) => b.type === 'bulletList')
  if (!bulletList) throw new Error(`章节 ${GROUP_ID} 里找不到目录 bulletList，已中止`)

  const existingBullets = collectTexts(bulletList)
  const missingItems = NEW_INDEX_ITEMS.filter(
    (label) => !existingBullets.some((t) => t.includes(label.replace(/^✅\s*/, '').slice(0, 20)))
  )

  console.log(`\n#${GROUP_ID} ${groupChapter.name}（概览目录）`)
  if (!missingItems.length) {
    console.log('   目录清单已包含新增章节，无需改动')
  } else {
    missingItems.forEach((label) => console.log(`   + ${label}`))
    if (APPLY) {
      for (const label of missingItems) {
        bulletList.content.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: label }] }],
        })
      }
      await sql.begin(async (tx) => {
        await tx`insert into chapter_versions (chapter_id, content) values (${GROUP_ID}, ${tx.json(groupChapter.content)})`
        await tx`update chapters set content = ${tx.json(groupDoc)}, updated_at = now() where id = ${GROUP_ID}`
      })
      console.log('   ✅ 已更新（旧内容已存 chapter_versions）')
    }
  }

  // ---------- courses.orders：新增两章挂到 1081 下 ----------
  const newOrderEntries = createdChapters.map((c, i) => ({
    id: c.id === null ? '<新建章节 id>' : String(c.id),
    label: c.name,
    order: nextOrder + i,
    parentId: String(GROUP_ID),
  }))

  console.log('\ncourses.orders')
  if (!newOrderEntries.length) {
    console.log('   无新增条目')
  } else {
    newOrderEntries.forEach((e) => console.log(`   + ${JSON.stringify(e)}`))
    if (APPLY) {
      orders.push(...newOrderEntries)
      await sql`update courses set orders = ${sql.json(orders)}, updated_at = now() where id = ${COURSE_ID}`
      console.log('   ✅ 已更新')
    }
  }

  console.log(`\n完成（${APPLY ? '已写库' : 'DRY-RUN，未写库'}）。`)
} finally {
  await sql.end()
}
