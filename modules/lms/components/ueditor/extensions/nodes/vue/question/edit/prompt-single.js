/**
 * Single Choice question type generation prompt
 * Output: JSON object with type='single'
 */
export default `Single Choice (type: "single") — Select the unique correct answer from multiple options.

Structure:
- content: string, the question text. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: array of strings, each element is one option. Each option also supports markdown syntax.
- answer: array of numbers containing exactly 1 element — the index of the correct option (0-based)
- point: number, the point value
- type: must be "single"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a single-choice question, output as a standard JSON object. The question text is [REPLACE WITH QUESTION CONTENT] (you may use markdown — e.g. wrap code in backticks or use **bold** for emphasis), with 4 options (each option may also contain inline markdown), only 1 correct answer. The answer field is an array containing the index of the correct option (0-based). The type is fixed as "single" and the output must include all common fields (name, content, options, answer, point, type, tags, extra, explanation).

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
