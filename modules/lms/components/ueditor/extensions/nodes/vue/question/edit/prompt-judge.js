/**
 * True/False question type generation prompt
 * Output: JSON object with type='judge'
 */
export default `True/False (type: "judge") — Judge whether the statement in the question is correct. Two fixed options.

Structure:
- content: string, the question text. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: array of 2 strings, typically ["✓ Correct", "✗ Wrong"]. Each option supports markdown syntax.
- answer: array of numbers — [0] means the statement is correct, [1] means it is incorrect
- point: number, the point value
- type: must be "judge"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a true/false question, output as a standard JSON object. The question text is [REPLACE WITH QUESTION CONTENT] (you may use markdown — code blocks, formulas, etc. are encouraged for technical questions), with options fixed as ["✓ Correct", "✗ Wrong"]. The answer is an array: use [0] for correct, [1] for incorrect. The type is fixed as "judge" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
