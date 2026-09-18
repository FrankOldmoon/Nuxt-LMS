# Skill: Batch-create courses

> Purpose: create multiple courses at once via the API (the system has no dedicated "batch create" endpoint; `batch.post` only handles delete/restore, so batch = loop over `add`).

## Prerequisite: log in (admin)

Most backend APIs require admin identity. Log in explicitly to get a cookie:

`POST /api/auth/login`, body `{ username, password }`; pass the returned cookie on subsequent requests.

> Note: URL auto-login (`?username=&password=`) has been removed — credentials must never be placed in a URL.
> Admin credentials come from the project's actual `.env` / `users` table. If the password is unknown, reset it directly in the database (scrypt hash in `salt:derivedKey` format, see `modules/base/server/utils/auth/password.ts`).

## Get a course category (categoryId is required)

Courses must have a `categoryId` (foreign key to categories). Query available categories via:

- `GET /api/home` (home page data, returns the `data.categories` array with `id`/`title`)
- Or generic CRUD: `GET /api/crud/categories/list` (admin only, supports pagination)

## Create a single course

`POST /api/courses/add` (admin only)

```json
{
  "name": "Course title",
  "code": "COURSE-CODE",
  "categoryId": 1,
  "tags": ["tag1", "tag2"],
  "config": {},
  "content": {
    "type": "doc",
    "content": []
  }
}
```

- `name` is required; `categoryId` is required (number)
- Optional: `code`, `tags` (array), `config` (JSON, may contain the course-level `lmsConfig`)
- `orders` (chapter tree) is not set in this step (see skills/02)
- On success `data` is an array containing the new record row; take `data[0].id` as the course id

## ⚠️ Course home content (required, same JSON structure as a chapter)

A course must have `content` (the course home page / intro, rendered in the "About this course" section of `/course/<id>`, rendered by `UeditorRender`; the structure is **exactly the same as a chapter's content**: root node `{ "type": "doc", "content": [block nodes...] }`). Include it in the create body, or update it later via `POST /api/courses/update` (old versions are snapshotted automatically).

- Structure, nodes, rich components (`:::` to tiptap), question embedding etc. are **exactly the same as chapter content** — see skills/03
- **Use plenty of emoji**: headings, paragraphs and lists of the course intro should use emoji (see the "use plenty of emoji" section in skills/03), e.g. `## 📚 Course Introduction`, `- ✅ Zero experience needed`
- **No local JSON conversion needed**: the `content` of add/update accepts a **markdown string** directly; the server runs `markdownToTiptap` and adds heading ids automatically (see skills/03 "markdown supported directly by save endpoints")
- Recommended: pass the course intro markdown text directly as `content`
- Missing content → the "About this course" section is not rendered on the course home page (`hasContent` is falsy), which counts as incomplete

## Batch creation

```text
Loop over POST /api/courses/add. Run sequentially and collect each returned id
for the later "create the chapter tree" step. Every created course broadcasts
home-changed to refresh the home navigation.
```

## 🖼️ Images: upload first to get an in-site URL (skills/07)

Images referenced in `content` / `coverImg` must **not** use external URLs directly. Upload remote images via the file upload endpoint first to convert them into in-site URLs — you can pass an external image URL and the server downloads and compresses it to webp:

`POST /api/files/upload`, JSON body `{ "url": "<external image url>", "group": "course-<id>" }`, returns `data.url` (in-site `/api/files/serve?pathname=...`); see **skills/07-file-upload.md** for rules and dedupe behaviour.

## Important: a new course may not appear in the header menu

The top navigation (useHeaderNav) shows courses based on the **category's `orders`**:
- If the category has **no** orders config → all its courses are shown
- If the category **has** orders config (e.g. the Test category in this project) → only courses whose `id` appears in orders are shown

So if a newly created course is missing from the header, add it to the category orders:
`POST /api/categories/update`, body:

```json
{
  "id": 1,
  "orders": [
    { "id": "1", "label": "tt", "order": 0, "parentId": null },
    { "id": "3", "label": "Markdown Basics", "order": 1, "parentId": null },
    { "id": "4", "label": "New course title", "order": 2, "parentId": null }
  ]
}
```

> `orders.id` is the course id as a string; `label` is written back to `courses.title`.
> The update broadcasts home-changed so the header menu refreshes automatically (no restart needed).

## Notes

- Permission: `requireAdmin`; non-admins get 403
- New courses appear on the home page immediately (WS auto-sync, no manual refresh)
- Validation: missing `name` fails; a `categoryId` pointing to a non-existent category fails on the foreign key
