/**
 * Short Answer question type generation prompt
 * Output: JSON object with type='short-answer'
 */
export default `Short Answer (type: "short-answer") — Open-ended answer. Scoring is automatic via a regular expression match.

Structure:
- content: string, the question text. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: empty array []
- answer: array of strings, each element is a regex pattern that matches the correct answer
- point: number, the point value
- type: must be "short-answer"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a short-answer question, output as a standard JSON object. The question text is [QUESTION CONTENT] (you may use markdown for clarity — code blocks, bold, lists, etc.); options is an empty array. The answer is an array containing a single regular expression that should match user input containing the core keywords (supporting case-insensitive matching and multiple-keyword simultaneous matching). The type is fixed as "short-answer" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
