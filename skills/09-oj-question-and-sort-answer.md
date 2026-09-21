# Skill: Publish an OJ question followed by its answer-code sort question

> Purpose: for every OJ (Hydro) problem used in a chapter, publish **two** questions in the course and
> embed them **back-to-back, in this order**:
>
> 1. an `oj` question — the judge problem itself; then
> 2. a `sort` question whose `options` are the reference solution's code lines (already in the correct
>    order) and whose `answer` is the identity array `[0,1,…,n-1]`.
>
> The student reads the problem statement first, then re-orders the code that solves it — so the **OJ node
> must come before the sort node**.
>
> Prerequisites: the question types / `answer` formats table and the tiptap node rules are in **skills/03**.
> The OJ platform base URL comes from the LMS config `oj.url` (env `OJ`), never hard-coded.

## 1. Fetch the OJ problem statement (the source of truth)

The LMS stores only the **pid**; the statement is fetched at read time by `fetchOj(pid)`
(`modules/lms/server/utils/questions/oj.ts`) and swapped into `content` by `GET /api/questions/show`.

```bash
# GET <oj.url>/p/<pid>  with header  Accept: application/json
# -> body.pdoc.content  is a JSON string -> { zh, en }
curl -s -H 'Accept: application/json' http://10.28.1.155/p/P1004 \
  | jq -r '.pdoc.content' | jq -r '.en // .zh'
```

- ⚠️ **Do not** read statements from `storage/oj_problems/oj155_all_details.json` — that cache strips
  Unicode (`−`, `×`, …) and is lossy. Always use `fetchOj` / the OJ API.
- Read the **samples** to derive the exact output format (e.g. two decimals → `f"{x:.2f}"`,
  integer quotient → `a // b`, remainder → `a % b`).

## 2. Create the OJ question (first)

`POST /api/questions/add` (teacher/admin):

```json
{
  "course_id": 5,
  "name": "P1004",
  "type": "oj",
  "content": "P1004",
  "options": { "pid": "P1004" },
  "answer": [],
  "point": 10
}
```

| Field | Value |
| --- | --- |
| `name` | the pid (e.g. `P1004`) |
| `content` | the pid as a plain string |
| `options` | `{ "pid": "<pid>" }` — the authoritative pid source (`resolveOjPid`) |
| `answer` | `[]` (judged on the OJ platform, not by the LMS) |
| `point` | 10 for the P10xx series (match the chapter's other OJ questions) |

- `show.ts` replaces `content` with the fetched statement for display, so the pid here is a placeholder.
- The "Check Status" button queries the OJ per user: `GET <oj.url>/record?uidOrName=<user>&pid=<pid>&status=1`.

## 3. Create the answer-code sort question (second)

`POST /api/questions/add`:

```json
{
  "course_id": 5,
  "name": "P1004 Code Order",
  "type": "sort",
  "content": { "type": "doc", "content": [ { "type": "paragraph", "content": [
    { "type": "text", "text": "Arrange the lines below into the correct order to solve P1004 (Addition and Subtraction): read two integers and print their sum on the first line and their difference on the second line. (OJ: P1004 — Addition and Subtraction)" }
  ] } ] },
  "options": ["a = int(input())", "b = int(input())", "print(a + b)", "print(a - b)"],
  "answer": [0, 1, 2, 3],
  "point": 2
}
```

Rules:

- `options` = the reference solution's **code lines, one line per option, in the correct order**. The
  `sort` UI shuffles them and the student drags them back; `options` must never be pre-scrambled.
- `answer` = the **identity array** `[0,1,…,n-1]` (option *i* belongs at position *i*). Grading
  (`server/utils/submit/verify.ts`) compares `rec[i] === answer[i]` position by position, so the correct
  order is always `[0,1,2,…]`.
- `content` = a tiptap doc stem stating the goal and ending with `(OJ: <pid> — <title>)`.
- `name` = `<pid> Code Order`. `point` = **2** (the value used across the course).
- **Indentation matters for branch bodies.** Python `if/else` bodies must keep their leading 4 spaces in the
  option string, e.g. `"    n = -n"`. The sort renderer preserves whitespace (`whitespace-pre-wrap` in
  `render/sort.vue` and in the footer answer display), so the indent is visible while answering and when the
  correct answer is revealed. Always re-check that every indented line carries its indent.
- The number of lines is free (2, 3, 4, …) — it only depends on the reference solution. E.g.:

```json
// P1010 Fahrenheit: 3 lines
"options": ["c = int(input())", "f = c * 9 / 5 + 32", "print(f\"{f:.2f}\")"], "answer": [0, 1, 2]

// P1016 Absolute Value: 4 lines, single if branch (note the indent)
"options": ["n = int(input())", "if n < 0:", "    n = -n", "print(n)"], "answer": [0, 1, 2, 3]
```

## 4. Embed both — OJ node first, sort node second

In the chapter `content`, place the two `vue` nodes **adjacent**, OJ node first:

```json
{ "type": "vue", "attrs": { "type": "question", "content": "<ojCid>" } },
{ "type": "vue", "attrs": { "type": "question", "content": "<sortCid>" } }
```

- `attrs.content` is the in-course `cid` as a **string**.
- `POST /api/chapters/update` extracts both ids into `chapters.questionIds` in document order.
- One OJ problem therefore contributes **2 cids**. When an activity lists several problems, add an H3
  heading above each pair, e.g. `### 🧮 <pid> <title>` (see course 5 / chapter 161 Activity 3).

## 5. Verify (read back after saving)

- `GET /api/questions/show?course_id=<id>&cid=<ojCid>` → `content` is the **fetched statement** (not the bare
  pid) and `options.pid` is present.
- `GET /api/questions/show?course_id=<id>&cid=<sortCid>` → `options` are the code lines in order,
  `answer` is `[0..n-1]`, and the indent is preserved in the option text.
- Re-read the chapter row and confirm the vue order is **`oj` then `sort`** for every pair.

## 6. Quick checklist

1. `fetchOj(pid)` → statement + samples read ✅
2. `oj` question created (name/content/options.pid = pid, point 10) ✅
3. `sort` question created (name `<pid> Code Order`, options = code in order, answer `[0..n-1]`, point 2,
   indent kept) ✅
4. Two adjacent vue nodes embedded, **OJ first** ✅
5. `questionIds` contains both, in that order ✅
