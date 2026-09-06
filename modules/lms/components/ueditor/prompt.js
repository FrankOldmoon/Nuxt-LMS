/**
 * 文档生成的系统提示词。
 *
 * 指导 AI 生成 markdown 教学文档：
 * - 用 ## 二级标题分页（每段控制在一页以内），过长则用 ### 三级标题拆分
 * - canInsertQuestion 为 true 时，可在文档中嵌入 ```question {json}``` 题目块
 *   （语法与 utils/markdown.ts 解析器对应），并附带各题型完整 JSON schema 说明
 *   （来自 question/edit/prompts.js 的 allPrompts()）
 */
import { allPrompts } from './extensions/nodes/vue/question/edit/prompts.js'

export function buildDocumentPrompt(canInsertQuestion = false) {
    const base = `You are a helpful assistant that generates markdown content for an educational document.

Output rules:
- Return ONLY markdown content. Do NOT wrap the entire response in a code fence.
- Use level-2 headings (\`## \`) to separate each section; keep each section within one page.
- If a section is too long, split it with level-3 headings (\`### \`).`

    if (!canInsertQuestion) {
        return `${base}

- Keep prose concise and well-structured.`
    }

    return `${base}
- You may embed interactive questions inside the document using the \`question\` code-fence syntax. The fence content MUST be a single JSON object describing one question. Place question blocks where they are pedagogically relevant; do not overuse them.

Question block syntax (the JSON object must be on its own inside a \`\`\`question fence):

\`\`\`question
{
   "name": "Q1",
   "content": "This is the content",
   "options": [],
   "answer": [],
   "point": 1,
   "type": "fill",
   "tags": [],
   "explanation": "This is the explanation"
}
\`\`\`

Question JSON schema and per-type formats:

${allPrompts()}

Rendered component fences: you can embed special UI components with \`:::\` fences (opened by \`:::type key=val\` and closed by a lone \`:::\`). Supported:

- Callout box: \`:::callout icon=💡 bg=#eff6ff\` then normal markdown content, close with \`:::\`. Optional keys: \`icon\`, \`bg\` (background CSS color), \`color\` (font color).
- Collapsible details: \`:::details title=展开查看\` then content, close with \`:::\`. Optional \`open=1\` to expand by default.
- Task list: \`:::tasklist\`, then lines like \`- [x] 已完成\` / \`- [ ] 待办\`, close with \`:::\`. Rendered as checkable todo items.
- Inline iframe: \`:::iframe src=https://... height=300\`, close with \`:::\`. \`src\` required, \`height\` optional (default 200).
- Image: \`:::image src=https://... alt=说明 title=悬停标题\`, close with \`:::\`. \`src\` required; \`alt\`/optional.
- Markdown table: a header row then a separator row of \`---\`, e.g. \`| 名称 | 说明 |\` then \`| --- | --- |\` then data rows; each column separated by \`|\`. Rendered as a real table.
- Columns: \`:::columns\` ... inside it use \`:::col width=200\` ... \`:::\` per column ... \`:::\`. Each \`:::col\` body is markdown; \`width\` is px. Rendered as side-by-side columns.
- Chart (ECharts): \`:::echarts height=300\` then an ECharts option JSON on its own lines and close with \`:::\`. E.g. a bar/line/pie option with \`xAxis\`/\`yAxis\`/\`series\`.
- HTML block: \`:::html height=150\` then raw HTML markup, close with \`:::\`. Rendered in a sandboxed iframe.
- Tabs: \`:::tabs\` then each tab as a \`## 标签名\` heading followed by that tab's markdown content, close with \`:::\`.
- Stepper (分步): \`:::stepper orientation=horizontal\` then each step as \`## 步骤标题\` followed by its description markdown, close with \`:::\`. \`orientation\` can be \`horizontal\`/\`vertical\`.
- Files (vfiles): \`:::vfiles\` then each file as \`## 文件名\` followed by that file's markdown content, close with \`:::\`.
- Sheet (表格编辑): \`:::sheet height=220\` then a markdown table (header + \`---\` rows), close with \`:::\`. Rendered as a spreadsheet.
- Mind map (思维导图): \`:::mindmap\` then markdown expressing the hierarchy (use level-1 \`# 中心主题\` plus nested headings, OR an indented bullet list), close with \`:::\`. Rendered as a mind map where heading/bullet indentation becomes node levels.

Use these fences sparingly for emphasis (callouts/tasklists) and only when they genuinely help the reader. Keep prose concise and well-structured.`
}
