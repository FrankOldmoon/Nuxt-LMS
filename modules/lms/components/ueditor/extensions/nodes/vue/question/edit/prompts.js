/**
 * Aggregator for all per-type question generation prompts.
 *
 * Each type-specific file (prompt-{type}.js) exports the full English prompt
 * (structure + example + generation instruction). This module re-exports them
 * individually via `promptsByType` and provides `allPrompts()` to compose a
 * combined reference string (used by the aigenerator LLM system prompt and
 * the contentPicker "Question Format Help" viewer).
 *
 * Common fields shared by every question type (English):
 * - name: string — question number/name
 * - content: string or object — the question text (supports markdown)
 * - options: array or object — options / config (varies by type)
 * - answer: array — the correct answer (format depends on type)
 * - point: number — the point value
 * - type: string — the unique type identifier
 * - tags: array — category tags
 * - extra: null or any — extension field, usually null
 * - explanation: string or object — explanation shown after submission
 */

import single from './prompt-single.js'
import judge from './prompt-judge.js'
import multiple from './prompt-multiple.js'
import select from './prompt-select.js'
import sort from './prompt-sort.js'
import classify from './prompt-classify.js'
import match from './prompt-match.js'
import fill from './prompt-fill.js'
import shortAnswer from './prompt-short-answer.js'
import puzzle from './prompt-puzzle.js'
import html from './prompt-html.js'

/** Map of question type → English prompt string. */
export const promptsByType = {
  single,
  judge,
  multiple,
  select,
  sort,
  classify,
  match,
  fill,
  'short-answer': shortAnswer,
  puzzle,
  html,
}

/** Common-fields description included at the top of the combined reference. */
const COMMON_FIELDS = `Common fields shared by every question type:

| Field         | Type            | Description                                                          |
| ------------- | --------------- | -------------------------------------------------------------------- |
| name          | string          | Question number/name                                                 |
| content       | string / object | Question text. For text-based types, supports markdown syntax        |
| options       | array / object  | Options / config (varies by type). For text-based types, each option |
|               |                 | also supports markdown syntax                                        |
| answer        | array           | Correct answer (format depends on type)                              |
| point         | number          | Point value                                                          |
| type          | string          | Unique type identifier                                               |
| tags          | array           | Category tags                                                        |
| extra         | null / any      | Extension field, usually null                                        |
| explanation   | string / object | Explanation shown after submission. Supports markdown syntax          |

Markdown syntax supported in content / options / explanation (text-based types):
- Headings (#, ##, ###)
- Bold (**text**) and italic (*text*)
- Lists (ordered and unordered)
- Inline code (\`code\`) and code blocks (\`\`\`language ... \`\`\`)
- Links ([text](url)) and images (![alt](url))
- Blockquotes (>), tables, horizontal rules
- Math/LaTeX may be supported depending on the renderer's extensions`

/**
 * Return the combined reference string for all question types.
 * Used as the LLM system prompt and as the human-readable format help.
 */
export function allPrompts() {
  const sections = Object.entries(promptsByType).map(([type, prompt]) => {
    return `### ${type}\n\n${prompt}`
  })
  return `${COMMON_FIELDS}\n\n---\n\n${sections.join('\n\n---\n\n')}`
}

/** Convenience: get the prompt for a single type, or undefined if not registered. */
export function promptFor(type) {
  return promptsByType[type] || null
}
