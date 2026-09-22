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
> The OJ platform base URL comes from the LMS **system config** (`oj.url`, i.e. 管理后台 → 系统设置 →
> 学习行为配置 →「OJ 基础地址」, DB key `lms:oj.url`), never hard-coded and with no env fallback.

## 1. Fetch the OJ problem statement (the source of truth)

The LMS stores only the **pid**; the statement is fetched at read time by `fetchOj(pid)`
(`modules/lms/server/utils/questions/oj.ts`) and swapped into `content` by `GET /api/questions/show`.

```bash
# 1) 先取系统设置里的 OJ 基础地址（唯一来源，别写死）
OJ=$(curl -s <lms-host>/api/config/lms-public | jq -r '.data.oj.url')

# 2) GET <oj.url>/p/<pid>  with header  Accept: application/json
#    -> body.pdoc.content  is a JSON string -> { zh, en }
curl -s -H 'Accept: application/json' "$OJ/p/P1004" \
  | jq -r '.pdoc.content' | jq -r '.en // .zh'
```

- 脚本里要读同一份配置，用 `scripts/lib/oj-config.cjs` 的 `getOjBase()`（读 `lms:oj.url`），
  不要把 OJ 地址写进脚本。

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
  heading **above each pair**, e.g. `### 🧮 <pid> <title>` (see course 5 / chapter 161 Activity 3).

### The pair heading node (copy this shape exactly)

```json
{
  "type": "heading",
  "attrs": {
    "id": "3i8tyq9t2l", "level": 3,
    "indent": null, "margin": null, "wordWrap": "normal", "textAlign": null,
    "indentUnit": null, "lineHeight": 1.75, "data-toc-id": "3i8tyq9t2l"
  },
  "content": [{ "text": "🧮 P1004 Addition and Subtraction", "type": "text", "marks": [{ "type": "bold" }] }]
}
```

- `id` / `data-toc-id` must be the **same unique** 10-char lowercase-alphanumeric string, and unique across
  the whole document — `extractTocFromContent` (`modules/lms/utils/toc.ts`) only collects headings that carry
  an id, so a missing/duplicated id means the heading is invisible in the right-hand TOC.
- Title text = `🧮 <pid> <OJ title>` (fetch the title from the OJ API; bold mark on the whole line).
- Placed **before** the OJ node, so the reading order is: heading → OJ → sort.

## 5. Verify (read back after saving)

- `GET /api/questions/show?course_id=<id>&cid=<ojCid>` → `content` is the **fetched statement** (not the bare
  pid) and `options.pid` is present.
- `GET /api/questions/show?course_id=<id>&cid=<sortCid>` → `options` are the code lines in order,
  `answer` is `[0..n-1]`, and the indent is preserved in the option text.
- Re-read the chapter row and confirm the vue order is **`oj` then `sort`** for every pair.
- `POST /api/chapters/update` returns `data` **without** `questionIds` — read `chapters.question_ids` back
  (DB or `GET /api/chapters/show`) to confirm both cids were extracted in document order.
- 回存前先把旧 content 从 `chapter_versions` 取出来做一次「只多了插入节点」的比对：
  `new.content.filter(不是本次插入的 vue)` 与旧 content `JSON.stringify` 必须完全相同，
  这样能证明没顺手改坏标题 attrs / 图片之类的既有节点。

## 6. Backfill: add the sort question to a chapter that already has its OJ questions

当章节里已经放了 OJ 题、只是缺排序题时（例：course 5 / chapter 162「Activity 4 (Extra) Finish more」），
不要重建章节，走一次增量回写即可：

1. 先定位要处理的段落：从该 h2 标题开始，到**下一个 level 2 标题**（或文档末尾）为止。
2. 段内每个 `{ type:'vue', attrs:{ type:'question', content:'<cid>' } }`，用 cid 去库里查
   `questions.type`；**只有 `type = 'oj'` 的才配排序题**（同段里可能有 `html` 之类的交互题，跳过）。
3. 依次 `POST /api/questions/add` 建 `<pid> Code Order`（options = 参考解代码行、answer 恒等数组、point 2）。
4. 在 js 里就地重建 content：原样 push 每个节点，遇到 oj 的 vue 节点就在它**后面**多 push 一个 sort 的 vue 节点，
   最后整段 `out.push(...nodes.slice(end))`。
5. `POST /api/chapters/update` 回存 → 回读校验 `question_ids` 与节点顺序。

- **题目没有 list 接口**（`server/api/questions/` 下只有 add/update/show/record/submit/verify/batch），
  判断"是否已存在同名题"要直接查库：`select cid, name from questions where course_id = <id> and name like '% Code Order'`。
- 幂等：同名题存在就复用它的 cid，不要重复建。
- **写库前先在本地把参考解跑一遍样例**（`python3 -c "<solution>"`，输入 OJ 的 sample input，比对 sample output），
  排序题的 `options` 顺序错了不会报错，只会让整道题永远判错。除了样例，把边界也补上（无解、0、边界值）。
- 登录：`POST /api/auth/login` body `{ username, password }`，拿 `data.token` 后所有请求带
  `Cookie: auth_token=<token>`。`10.28.1.151`（及 lms.minxin.app 同库站点）的 admin 密码是 `REDACTED`；
  `aics.oldmoon.cn` 的密码是 `REDACTED` —— 换个站点先试登录，别照抄。
- 章节没开放（`is_open = false`）时匿名 `GET /api/chapters/show` 返回 403「该章节尚未开放」，
  **带上 admin 的 cookie 就能读到**，不必绕去连数据库。

## 7. Quick checklist

1. `fetchOj(pid)` → statement + samples read ✅
2. `oj` question created (name/content/options.pid = pid, point 10) ✅
3. `sort` question created (name `<pid> Code Order`, options = code in order, answer `[0..n-1]`, point 2,
   indent kept) ✅
4. Two adjacent vue nodes embedded, **OJ first** ✅
5. `questionIds` contains both, in that order ✅
