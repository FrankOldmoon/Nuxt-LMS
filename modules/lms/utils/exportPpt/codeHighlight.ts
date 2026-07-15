/**
 * Code syntax highlighting (lowlight)
 * Converts code into colored pptxgenjs text runs, and splits by line for paginated rendering
 */

import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)

/** hljs class → color hex (light theme, consistent with code-block.vue) */
export const HLJS_COLORS: Record<string, string> = {
  'hljs-keyword': 'D73A49',
  'hljs-built_in': 'E36209',
  'hljs-type': 'D73A49',
  'hljs-literal': '005CC5',
  'hljs-number': '005CC5',
  'hljs-operator': '005CC5',
  'hljs-variable': '005CC5',
  'hljs-attr': '005CC5',
  'hljs-attribute': '005CC5',
  'hljs-meta': '005CC5',
  'hljs-string': '032F62',
  'hljs-regexp': '032F62',
  'hljs-title': '6F42C1',
  'hljs-title.function_': '6F42C1',
  'hljs-title.class_': '6F42C1',
  'hljs-comment': '6A737D',
  'hljs-doctag': 'D73A49',
  'hljs-name': '22863A',
  'hljs-tag': '22863A',
  'hljs-symbol': 'E36209',
  'hljs-bullet': '735C0F',
  'hljs-code': '6A737D',
  'hljs-formula': '6A737D',
  'hljs-quote': '22863A',
  'hljs-section': '005CC5',
  'hljs-subst': '24292E',
  'hljs-addition': '22863A',
  'hljs-deletion': 'B31D28',
  'hljs-template-tag': 'D73A49',
  'hljs-template-variable': 'D73A49',
  'hljs-variable.language_': 'D73A49',
}

export const CODE_DEFAULT_COLOR = '1E293B'

/** Language alias mapping (lowlight registered name may differ from what the editor uses) */
export const LANG_ALIASES: Record<string, string> = {
  'js': 'javascript', 'py': 'python', 'python3': 'python',
  'ts': 'typescript', 'sh': 'bash', 'shell': 'bash',
  'yml': 'yaml', 'c++': 'cpp', 'golang': 'go',
}

/**
 * Uses lowlight to highlight code, returns colored pptxgenjs text runs
 * Languages that cannot be highlighted return a single-color default run
 */
export function highlightCodeToRuns(code: string, language: string): any[] {
  const lang = (language || '').toLowerCase().trim()
  const langs = lowlight.listLanguages()

  let tree: any
  try {
    if (langs.includes(lang)) {
      tree = lowlight.highlight(lang, code)
    } else {
      const mapped = LANG_ALIASES[lang]
      if (mapped && langs.includes(mapped)) {
        tree = lowlight.highlight(mapped, code)
      }
    }
  } catch {
    // Highlighting failed, degrade to plain text
  }

  if (!tree) {
    return [{ text: code, options: { color: CODE_DEFAULT_COLOR } }]
  }

  const runs: any[] = []
  function walk(node: any, classes: string[] = []) {
    if (!node) return
    if (node.type === 'text') {
      // Find color from inherited class list (last match takes priority)
      let color = CODE_DEFAULT_COLOR
      for (let i = classes.length - 1; i >= 0; i--) {
        const cls = classes[i]
        if (cls && HLJS_COLORS[cls]) {
          color = HLJS_COLORS[cls]
          break
        }
      }
      runs.push({ text: node.value, options: { color } })
      return
    }
    if (node.type === 'element' || node.type === 'root') {
      const nodeClasses: string[] = node.properties?.className || []
      const allClasses = [...classes, ...nodeClasses]
      for (const child of node.children || []) {
        walk(child, allClasses)
      }
    }
  }
  walk(tree)
  return runs
}

/**
 * Split colored text runs by newline into an array of lines, for paginated rendering
 * Each line is an independent runs array that can be rendered to a slide separately
 */
export function splitRunsByLines(runs: any[]): any[][] {
  const lines: any[][] = [[]]
  for (const run of runs) {
    const text = run.text || ''
    const parts = text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) lines.push([])
      if (parts[i]) {
        const lastLine = lines[lines.length - 1]
        if (lastLine) {
          lastLine.push({
            text: parts[i],
            options: { ...run.options },
          })
        }
      }
    }
  }
  return lines
}
