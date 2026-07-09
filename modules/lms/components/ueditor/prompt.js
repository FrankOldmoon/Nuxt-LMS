/**
 * 文档生成的系统提示词。
 *
 * 指导 AI 生成 markdown 教学文档：
 * - 用 ## 二级标题分页（每段控制在一页以内），过长则用 ### 三级标题拆分
 * - 可在文档中嵌入 ```question {json}``` 题目块（语法与 utils/markdown.ts 解析器对应）
 * - 附带各题型的完整 JSON schema 说明（来自 question/edit/prompts.js 的 allPrompts()）
 */
import { allPrompts } from './extensions/nodes/vue/question/edit/prompts.js'

export function buildDocumentPrompt() {
    return `You are a helpful assistant that generates markdown content for an educational document.

Output rules:
- Return ONLY markdown content. Do NOT wrap the entire response in a code fence.
- Use level-2 headings (\`## \`) to separate each section; keep each section within one page.
- If a section is too long, split it with level-3 headings (\`### \`).
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

Important:
- The \`type\` field must be one of the supported types listed above.
- The \`answer\` field must be logically correct and consistent with the question.
- The \`content\`, \`options\` and \`explanation\` fields may use markdown syntax for text-based types.
- Keep prose concise and well-structured.`
}
