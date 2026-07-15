/**
 * DocumentGenerateSystem Hintword。
 *
 * guide AI Generate markdown TeachingDocument：
 * - use ## level 2TitlePagination（each section controls one pagewithInside），Longruleuse ### level 3Titlesplit
 * - canInsertQuestion  true when，canDocumentMiddleembed ```question {json}``` Questionblock
 *   （syntaxand utils/markdown.ts AnalysiseditorRightshould），andwith full schema description for each question type JSON schema Description
 *   （from question/edit/prompts.js  allPrompts()）
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

Important:
- The \`type\` field must be one of the supported types listed above.
- The \`answer\` field must be logically correct and consistent with the question.
- The \`content\`, \`options\` and \`explanation\` fields may use markdown syntax for text-based types.
- Keep prose concise and well-structured.`
}
