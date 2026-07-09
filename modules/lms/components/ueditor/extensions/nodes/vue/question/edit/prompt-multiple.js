/**
 * Multiple Choice question type generation prompt
 * Output: JSON object with type='multiple'
 */
export default `Multiple Choice (type: "multiple") — Multiple correct options exist. The answer contains the indices of ALL correct options.

Structure:
- content: string, the question text. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: array of strings, the option list. Each option also supports markdown syntax.
- answer: array of numbers, containing the indices of all correct options
- point: number, the point value
- type: must be "multiple"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a multiple-choice question, output as a standard JSON object. The question text is [REPLACE WITH QUESTION CONTENT] (you may use markdown — e.g. **bold** for emphasis, lists, or code snippets for technical content), with 4 options (each option may also contain inline markdown) containing 2-3 correct answers. The answer is an array containing the indices of all correct options. The type is fixed as "multiple", the point value can be set to 2, and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
