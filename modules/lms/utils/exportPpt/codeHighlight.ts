/**
 * 代码语法高亮（lowlight）
 * 将代码转换为带颜色的 pptxgenjs text runs，并按行拆分用于分页渲染
 */

import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)

/** hljs class → 颜色 hex（light 主题，与 code-block.vue 一致） */
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

/** 语言别名映射（lowlight 注册名可能与编辑器使用的不同） */
export const LANG_ALIASES: Record<string, string> = {
  'js': 'javascript', 'py': 'python', 'python3': 'python',
  'ts': 'typescript', 'sh': 'bash', 'shell': 'bash',
  'yml': 'yaml', 'c++': 'cpp', 'golang': 'go',
}

/**
 * 使用 lowlight 高亮代码，返回带颜色的 pptxgenjs text runs
 * 无法高亮的语言返回单色默认 run
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
    // 高亮失败，降级为纯文本
  }

  if (!tree) {
    return [{ text: code, options: { color: CODE_DEFAULT_COLOR } }]
  }

  const runs: any[] = []
  function walk(node: any, classes: string[] = []) {
    if (!node) return
    if (node.type === 'text') {
      // 从继承的 class 列表中查找颜色（最后匹配的优先）
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
 * 将带颜色的 text runs 按换行符拆分为行数组，用于分页渲染
 * 每行是独立的 runs 数组，可单独渲染到幻灯片
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
