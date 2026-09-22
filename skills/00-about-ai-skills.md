# AI Skills — about, API access and sync

> Read this page only, then fetch the one skill you need. The skill chapters are the children of
> this chapter (AI Skills, id 1081) inside course 1, so the list below stays stable.

## 🤖 About This Handbook

This chapter collects the AI course-building skill documents, covering the full workflow from course creation and tree ordering to interactive components and file uploads:

- ✅ Batch course creation and course intros
- ✅ Nested chapter tree (orders) conventions
- ✅ Writing chapter content (tiptap / markdown / rich components / question embedding)
- ✅ Local run + full course-building walkthrough
- ✅ Deleting and restoring courses & chapters
- ✅ Homework / quiz / race / comment interactive component APIs
- ✅ Image upload and in-site URL references
- ✅ Generating and uploading course covers (SVG → PNG)
- ✅ OJ questions and sort-answer authoring conventions

💡 Each sub-chapter matches one skill document (numbered 1 / 1.1 in the left tree).

## 🔌 Read the skills through the API

Two requests are enough: one for the list, one for the skill you want. No login is required while the chapters stay open (`isOpen: true`).

### 1️⃣ List the skill chapters

```bash
curl -s "http://10.28.1.151/api/courses/show?id=1"
```

- `data.orders` is the chapter tree; every entry is `{ id, label, order, parentId }` with string ids
- The skills are exactly the entries whose `parentId` is `1081`, sorted by `order`
- `data.chapters` maps chapter id to `{ title, isOpen }` for the whole course

### 2️⃣ Fetch one skill

```bash
curl -s "http://10.28.1.151/api/chapters/show?id=1084"
```

- `data.chapter.content` is the chapter body as tiptap JSON (`{"type":"doc","content":[...]}`), not markdown
- A closed chapter returns 403; swap the host for the current site origin when running elsewhere

### 🗺️ Skill file and chapter id

| Skill file | Chapter id | Title |
| --- | --- | --- |
| skills/01-batch-create-courses.md | 1082 | Batch Course Creation |
| skills/02-create-course-orders.md | 1083 | Course Tree & Orders |
| skills/03-create-chapter-content.md | 1084 | Writing Chapter Content |
| skills/04-local-run-markdown-course.md | 1085 | Local Run End-to-End |
| skills/05-delete-course-chapter.md | 1086 | Delete & Restore |
| skills/06-interactive-components.md | 1087 | Interactive Components |
| skills/07-file-upload.md | 1088 | File Upload |
| skills/08-course-covers.md | 1095 | Course Covers |
| skills/09-oj-question-and-sort-answer.md | 1096 | OJ Question & Sort Answer |

### 🤖 Ready-to-run snippet: list, pick one, flatten to text

```js
const SITE = 'http://10.28.1.151'
const GROUP = '1081'

// 1) list the skill chapters, in display order
const { data: course } = await (await fetch(SITE + '/api/courses/show?id=1')).json()
const skills = course.orders
  .filter(o => String(o.parentId) === GROUP)
  .sort((a, b) => a.order - b.order)

// 2) pick one by title and fetch its body
const skill = skills.find(s => /chapter content/i.test(s.label))
const { data } = await (await fetch(SITE + '/api/chapters/show?id=' + skill.id)).json()

// 3) flatten the tiptap JSON to plain text (a newline per block)
const text = (function walk(node, out = []) {
  if (!node || typeof node !== 'object') return out
  if (node.type === 'text' && typeof node.text === 'string') out.push(node.text)
  if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'codeBlock') out.push('\n')
  if (Array.isArray(node.content)) node.content.forEach(c => walk(c, out))
  else if (node.content && typeof node.content === 'object') walk(node.content, out)
  return out
})(data.chapter.content).join('')

console.log(skills.map(s => s.id + '  ' + s.label).join('\n'))
console.log(text)
```

## 🔄 Local files and database in sync

The same documents also live in the repository, and one script keeps both sides identical.

- **Local source of truth**: the `skills` folder in the repo, file `00-...` is this page
- **What the site serves**: the `chapters.content` column (PostgreSQL jsonb) through `/api/chapters/show`
- **Publish local to the site**:

```bash
node scripts/publish_skills_handbook.mjs          # dry-run: converts and diffs, writes nothing
node scripts/publish_skills_handbook.mjs --apply  # writes to the database
```

- The script maps each markdown file to its chapter id, converts it with `markdownToTiptap` (adding id and data-toc-id to every heading so the right-hand TOC works), reuses the existing heading ids, and is idempotent: re-running when nothing changed writes nothing
- Before overwriting a chapter it snapshots the old content into `chapter_versions`, so the editor history can still restore it
- It connects through `POSTGRES_URL` in `.env`

⚠️ Do not hand-edit a published skill chapter in the editor: the next publish overwrites it. Change the markdown file instead.
