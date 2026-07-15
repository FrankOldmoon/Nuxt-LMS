/**
 * Dropdown (Word Selection) question type generation prompt
 * Output: JSON object with type='select'
 */
export default `Dropdown / Word Selection (type: "select") — The question text contains one or more blanks; the student picks the match ing word from a given word bank.

Structure:
- content: string, the question text with blank positions marked as ||placeholder||. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.) in the surrounding text.
- options: array of strings, all candidate words (including distractors). Each option supports markdown syntax.
- answer: array of strings, the correct words in left-to-right order match ing the blanks
- point: number, the point value
- type: must be "select"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a dropdown / word-selection question, output as a standard JSON object. The question text is [REPLACE WITH CONTENT] (you may use markdown in the surrounding text), with each blank marked as ||keyword|| (total N blanks). options provides all candidate words (including distractors, each may use inline markdown). The answer is a string array, filling in the correct words in order of the blanks. The type is fixed as "select" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
