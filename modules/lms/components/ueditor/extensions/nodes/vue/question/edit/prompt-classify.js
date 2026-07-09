/**
 * Classification question type generation prompt
 * Output: JSON object with type='classify'
 */
export default `Classification (type: "classify") — Distribute multiple items into the given categories.

Structure:
- content: string, the classification instruction. Supports markdown syntax (headings, bold, italic, lists, inline code, code blocks, links, images, etc.).
- options: array of objects, each with name (category name, string — supports markdown) and items (array of strings, each item supports markdown syntax)
- answer: array of numbers, length equal to the total number of items. Concatenate all items in "category order, then item order within each category", and for each item write the index of the category it belongs to (0-based)
- point: number, the point value
- type: must be "classify"
- tags: array, category tags
- extra: null or any extension field
- explanation: string, explanation shown after submission. Supports markdown syntax.

Generation prompt:
Generate a classification question, output as a standard JSON object. The question text is [CLASSIFICATION INSTRUCTION] (you may use markdown for clarity). Set up 2 categories, each containing 2-3 items. options is written in the format [{name, items[]}, ...] — both the category names and individual items may use inline markdown. The answer is a number array where, for each item in the concatenation order, fill in the index of the category it belongs to (0-based). The type is fixed as "classify" and the output must include all common fields.

Output format (STRICT):
- Return ONLY a single JSON code block wrapped in \`\`\`json ... \`\`\` fences.
- Do NOT include any prose, explanation, greeting, or text outside the code block.
- The entire response must be exactly one \`\`\`json code block and nothing else.`
