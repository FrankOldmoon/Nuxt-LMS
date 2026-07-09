/**
 * Sorting question type generation prompt
 * Output: JSON object with type='sort'
 */
export default `Sorting (type: "sort") — Arrange the given items in a specified order (chronological, logical, etc.).

Structure:
- content: string, the sorting instruction. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: array of strings, the items to be sorted. Each item also supports markdown syntax.
- answer: array of numbers, the option indices in the correct order
- point: number, the point value
- type: must be "sort"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a sorting question, output as a standard JSON object. The question content is [SORT BY XX RULE] (you may use markdown — e.g. numbered lists or code blocks to clarify the ordering rule). options lists 4 items to be sorted (each item may use inline markdown). The answer is a number array, filling in the index of each item in the correct order. The type is fixed as "sort" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
