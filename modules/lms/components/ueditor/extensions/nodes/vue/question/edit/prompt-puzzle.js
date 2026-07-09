/**
 * Puzzle question type generation prompt
 * Output: JSON object with type='puzzle'
 */
export default `Puzzle (type: "puzzle") — An image is split into a grid of pieces; the student reassembles the original image.

Structure:
- content: usually an empty string
- options: object containing url (image path) and split (grid size, e.g. 4 means 4×4 = 16 pieces)
- answer: array of numbers, sequential 0 to split²-1, representing the correct piece order
- point: number, the point value
- type: must be "puzzle"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a puzzle question, output as a standard JSON object. options is an object containing the image url and the split number (e.g. 3 means 3×3). The answer is a sequential number array starting from 0, with length equal to split*split, representing the correct order. The type is fixed as "puzzle" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
