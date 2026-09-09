# Skill: Generate & upload course covers (SVG → PNG)

> Purpose: batch-create cover images for courses — design SVG locally, render to PNG via
> Playwright + system Chrome, upload via multipart, and set `courses.config.coverImg`.

## Workflow (scripts/gen_covers.cjs)

1. **Design** — 1600×900 SVG from a shared template: gradient bg (two course colors) + faint
   80px grid + circuit-line decorations + category pill + big title + subtitle + emoji icon tile.
   Config table `COURSES` maps courseId → { cat, title, sub, emoji, c1, c2 }.
2. **Render** — Playwright `chromium.launch({ channel: 'chrome' })` (system Chrome — no
   `npx playwright install` needed), `page.goto('file://<svg>')`, `page.screenshot` at exact
   viewport. Needs `NODE_PATH=<managed node_modules>` for the playwright package.
3. **Upload** — `POST /api/files/upload` **multipart** mode: field `files` + `group=course-<id>`.
   Node 22 native `FormData` + `Blob`. Server dedupes by sha256 → re-running is cheap.
4. **Set cover** — ⚠️ `coverImg` lives in **`courses.config.coverImg`** (not a top-level column!).
   `courses/update` must send the **merged config**: `{ id, config: { ...existingConfig, coverImg: url } }`
   — fetch existing via `GET /api/courses/show?id=` (`data.config`) first, or you wipe icon/lmsConfig.

## Pitfalls

- **XML escaping**: raw `&` in title/subtitle breaks SVG parsing ("xmlParseEntityRef") →
  Chrome renders an error banner *into the screenshot*. Always `&amp;`-escape text nodes.
- **coverImg is inside config** — a bare `{ id, coverImg }` update silently does nothing.
- Emoji in SVG renders fine via system Chrome (Apple Color Emoji) — no tofu.
- Verify with `GET /api/home` (per-course `coverImg`) after the batch run.

## Files

- Generator: `scripts/gen_covers.cjs` (idempotent, whole pipeline in one run)
- Assets: `scripts/covers/course-<id>.svg|.png`
