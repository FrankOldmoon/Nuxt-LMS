/**
 * Fill-in-the-Blank question type generation prompt
 * Output: JSON object with type='fill'
 */
export default `Fill in the Blank (type: "fill") — The question text contains blanks; the student types the answer directly. Two content forms are supported:
- Plain text: blanks are marked with {{placeholder}}

Structure:
- content: string, the question text with blanks marked as {{keyword}}. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.) in the surrounding text.
- options: array of empty strings, length equal to the number of blanks
- answer: array of strings, the correct answer for each blank in left-to-right order
- point: number, the point value
- type: must be "fill"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a fill-in-the-blank question, output as a standard JSON object. The question text is [REPLACE WITH CONTENT] (you may use markdown — e.g. **bold** or code blocks in the surrounding text). Blanks in the content are marked as {{keyword}}, with N blanks total. options is an array of empty strings of length N. The answer is a string array, filling in the correct answer for each blank in order. The type is fixed as "fill" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
