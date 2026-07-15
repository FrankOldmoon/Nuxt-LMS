/**
 * HTML Interactive question type generation prompt
 * Output: JSON object with type='html'
 */
export default `HTML Interactive (type: "html") — A complete, runnable HTML page is the question. It has its own interaction logic and scoring ability.

Structure:
- content: a complete HTML code string, including HTML/CSS/JS, that sends the score (0~1) back to the parent page via parent.postMessage
- options: empty array []
- answer: array, typically [1] — the actual scoring is implemented by the HTML's internal logic
- point: number, the point value
- type: must be "html"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate an HTML interactive question, output as a standard JSON object. content is a complete runnable HTML code string that implements [SPECIFIC INTERACTIVE FUNCTIONALITY, e.g. card match ing, drag-and-drop, etc.]. Inside, use parent.postMessage({ type: 'correct_rate', rate: SCORE }, '*') to send the score back. options is an empty array, answer is [1]. The type is fixed as "html" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
