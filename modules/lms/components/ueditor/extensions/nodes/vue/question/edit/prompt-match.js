/**
 * Matching question type generation prompt
 * Output: JSON object with type='match'
 */
export default `Matching (type: "match") — Pair each concept on the left with its correct description or application on the right.

Structure:
- content: string, the pairing instruction. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: array of objects, each with left (the left-side item, string — supports markdown) and right (the right-side item, string — supports markdown)
- answer: array of numbers. The i-th entry is the index of the right-side item that matches the i-th left-side item
- point: number, the point value
- type: must be "match"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a matching question, output as a standard JSON object. The question text is [PAIRING INSTRUCTION] (you may use markdown). The left side has 4 concepts, and the right side has 4 corresponding descriptions in a shuffled order. options is written in the format [{left, right}, ...] — both left and right values may contain inline markdown. The answer is a number array where the i-th value represents the right-side index matching the i-th left-side item. The type is fixed as "match" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
