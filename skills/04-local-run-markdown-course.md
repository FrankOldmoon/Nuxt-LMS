# Skill: Local run + build a "Markdown Basics" course end to end

> Goal: start the server locally, use the API to build a course that introduces Markdown syntax,
> with a **nested chapter tree** and **enough questions embedded in every chapter**.
> Depends on skills/01, 02 and 03 for the API details.

## 1. Run locally

```bash
cd /Users/oldmoon/Documents/ubuntu/nuxt_lms_2026
pnpm install          # postinstall runs nuxt prepare automatically (and generates missing .env / ecosystem.config.cjs)
pnpm dev              # runs nuxt-hub db migrate then starts dev, default http://localhost:3000
```

- The database connection uses `POSTGRES_URL` from `.env` (local PostgreSQL)
- For a custom port / production mode: `pnpm build && pnpm server` (port 80 by default)
- After start-up, open `http://localhost:3000` first to confirm a 200 response

## 2. Prepare admin identity

- Log in explicitly: `POST /api/auth/login` with body `{ username, password }` to get a cookie
  (the previous URL auto-login `?username=&password=` has been removed — never put credentials in a URL)
- All subsequent curl calls carry that cookie, or do it in a script that logs in first

## 3. Steps (script or sequential curl recommended)

### 1. Get a course category

`GET /api/home` → use `data.categories[0].id` as categoryId (create one first if none: `POST /api/crud/categories/add` with body `{ name }`).

### 2. Create the course

`POST /api/courses/add`:

```json
{
  "name": "Markdown Basics",
  "code": "MARKDOWN-101",
  "categoryId": <categoryId>,
  "tags": ["Markdown", "writing"],
  "content": {
    "type": "doc",
    "content": []
  }
}
```

**`content` is required** (course home intro, tiptap doc JSON, structure identical to a chapter, rules in skills/03).
Recommended: write the course intro in markdown first (including rich-component `:::` fences), then convert with `markdownToTiptap()` into doc JSON.

Record the returned course `id` (call it COURSE_ID).

### 3. Create chapters in batch (including group chapters)

`POST /api/chapters/add` (loop, each body `{ "name", "courseId": COURSE_ID, "isOpen": true }`).

**Group chapters** (parent nodes, labels without numbering): Basic Syntax, Advanced Syntax, Practice
(write a short intro for each; questions optional)

**Content chapters** (leaves, labels without numbering — numbering is added by the front end; at least 3–5 questions each):

| Chapter name | Teaching topic | Suggested questions (3–5 points each) |
| --- | --- | --- |
| Headings and Paragraphs | h1/h2 headings, paragraphs, line breaks | single ×2, judge ×2 |
| Emphasis and Lists | bold/italic/strike, ordered & unordered lists, task lists | single ×2, multiple ×2, judge ×2 |
| Links and Images | inline links, reference links, images | single ×2, judge ×2 |
| Code | inline code, code blocks, syntax highlighting | single ×2, judge ×2, fill ×2 |
| Tables and Quotes | tables, blockquotes, horizontal rules | single ×2, judge ×2 |
| Math Formulas | inline/block formulas (KaTeX) | single ×2, judge ×2 |
| Guided Practice I | write an article with headings/lists/links | multiple ×2, fill ×2 |
| Guided Practice II | take study notes in Markdown | multiple ×2, judge ×2 |
| Mixed Chapter | all question types (one of each except OJ) | single/judge/multiple/fill/select/sort/classify/puzzle/html/short-answer/match/composite/video/evaluation — one each |

Record every returned `id` (chapters).

### 4. Create questions and embed them in chapter content

For each chapter:

1. **Create the questions** per the skills/03 table (`POST /api/questions/add`); write question `content` as tiptap JSON stems (code blocks allowed); collect each `cid`.
2. Assemble the chapter `content` (tiptap doc JSON):
   - Use heading/paragraph/bulletList/codeBlock/table etc. to teach that Markdown topic (see the node examples in skills/03)
   - **Embed the questions you just created** at paragraph ends: `{ "type": "vue", "attrs": { "type": "question", "content": "<cid>" } }`
   - Guarantee at least 3 questions per chapter (mix of single/multiple/judge/fill)
3. `POST /api/chapters/update`, body `{ "id": <chapterId>, "content": <doc json> }`
   (questionIds are extracted into the chapter automatically on save)

### 5. Set the nested chapter tree

Groups are implemented with **chapters** (parent chapter parentId=null, children point at it); labels carry no numbering (the front end adds it).

`POST /api/courses/update`, body:

```json
{
  "id": "COURSE_ID",
  "orders": [
    { "id": "<basic-syntax-chapter-id>", "label": "Basic Syntax", "parentId": null, "order": 0 },
    { "id": "<1.1-chapter-id>", "label": "Headings and Paragraphs", "parentId": "<basic-syntax-chapter-id>", "order": 0 },
    { "id": "<1.2-chapter-id>", "label": "Emphasis and Lists", "parentId": "<basic-syntax-chapter-id>", "order": 1 },
    { "id": "<1.3-chapter-id>", "label": "Links and Images", "parentId": "<basic-syntax-chapter-id>", "order": 2 },
    { "id": "<advanced-syntax-chapter-id>", "label": "Advanced Syntax", "parentId": null, "order": 1 },
    { "id": "<2.1-chapter-id>", "label": "Code", "parentId": "<advanced-syntax-chapter-id>", "order": 0 },
    { "id": "<2.2-chapter-id>", "label": "Tables and Quotes", "parentId": "<advanced-syntax-chapter-id>", "order": 1 },
    { "id": "<2.3-chapter-id>", "label": "Math Formulas", "parentId": "<advanced-syntax-chapter-id>", "order": 2 },
    { "id": "<practice-chapter-id>", "label": "Practice", "parentId": null, "order": 2 },
    { "id": "<3.1-chapter-id>", "label": "Guided Practice I", "parentId": "<practice-chapter-id>", "order": 0 },
    { "id": "<3.2-chapter-id>", "label": "Guided Practice II", "parentId": "<practice-chapter-id>", "order": 1 },
    { "id": "<3.3-chapter-id>", "label": "Mixed Chapter", "parentId": "<practice-chapter-id>", "order": 2 }
  ]
}
```

I.e. **3 group chapters (top level) + 9 leaf chapters** (including "Mixed Chapter"), forming a
"Basic Syntax / Advanced Syntax / Practice → sub-chapters" two-level tree (extendable to 3 levels).

> Note: the groups in the tree are not `custom-*` placeholders but real chapters (with ids, clickable), consistent
> with the live course structure; `orders` ids/parentIds must all be strings.

### 6. Mixed chapter (optional): cover every question type

To check all question types on one page, add a "Mixed Chapter": create one question of each of the 14 types
except OJ (single/judge/multiple/fill/select/sort/classify/puzzle/html/short-answer/match/composite/video/evaluation —
structure in the skills/03 type table), embed them all in that chapter's content, then hang it under "Practice" in the orders above.

### 7. Verify

- Open `http://localhost:3000/course/<COURSE_ID>`: the left tree shows the group + chapter hierarchy
- Click any chapter: the body renders (headings/code blocks/tables/question vue nodes)
- Enter a chapter with a student account: questions can be answered, graded, and points apply

## 4. FAQ

- **403 forbidden**: make sure requests carry the admin cookie
- **Foreign key failure**: categoryId must be a real category id
- **Questions not showing**: the vue node `attrs.content` in chapter content must be the question's `cid` within that course (string), and questions must be created before saving the chapter
- **Chapter name out of sync with the tree**: the orders `label` is written back to `chapters.name` on `courses/update`; orders is the source of truth
