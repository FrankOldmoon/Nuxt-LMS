import { ref, computed, inject } from 'vue'
import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)

/** 语言别名 → lowlight 注册名（lowlight common 只注册官方名，html/js/ts 等别名需映射） */
const LANG_ALIASES: Record<string, string> = {
  'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript', 'node': 'javascript',
  'ts': 'typescript', 'tsx': 'typescript',
  'py': 'python', 'python3': 'python',
  'sh': 'bash', 'shell': 'bash', 'zsh': 'bash',
  'yml': 'yaml',
  'c++': 'cpp', 'cc': 'cpp', 'hpp': 'cpp',
  'golang': 'go',
  'html': 'xml', 'htm': 'xml', 'markup': 'xml', 'svg': 'xml',
  'text': 'plaintext', 'txt': 'plaintext',
  'rb': 'ruby', 'rs': 'rust', 'kt': 'kotlin', 'cs': 'csharp', 'md': 'markdown',
  'jsonc': 'json',
}

export function useCodeBlock(props: { node: any }) {
    const inQuiz = inject('inQuiz', false)
    const inQuestion = inject('inQuestion', false)
    const hideActions = computed(() => inQuiz || inQuestion)

    const attrs = computed(() => props.node.attrs || {})
    const language = computed(() => attrs.value.language || 'plaintext')
    const theme = computed(() => attrs.value.theme || 'light')
    const normLang = computed(() => (language.value || '').toLowerCase().trim())

    const canRun = computed(() => {
        const l = normLang.value
        return ['python', 'py', 'python3', 'javascript', 'js', 'node', 'cpp', 'java'].includes(l)
    })

    const ideLanguage = computed(() => {
        const l = normLang.value
        if (['python', 'py', 'python3'].includes(l)) return 'python'
        if (['javascript', 'js', 'node'].includes(l)) return 'javascript'
        if (['cpp', 'c', 'c++'].includes(l)) return 'cpp'
        if (['java'].includes(l)) return 'java'
        return 'python'
    })

    const ideOpen = ref(false)

    const codeText = computed(() =>
        (props.node.content || []).map((c: any) => c.text || '').join(''),
    )

    const lineCount = computed(() => {
        const text = codeText.value
        if (!text) return 1
        return text.split('\n').length
    })

    const escapeHtml = (str: string) =>
        String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

    const astToHtml = (node: any): string => {
        if (!node) return ''
        if (node.type === 'text') return escapeHtml(node.value)
        if (node.type === 'element' || node.type === 'root') {
            const className = node.properties?.className?.join(' ') || ''
            const tag = node.tagName || 'span'
            const attrStr = className ? ` class="${className}"` : ''
            const children = (node.children || []).map(astToHtml).join('')
            return `<${tag}${attrStr}>${children}</${tag}>`
        }
        return ''
    }

    const highlightedHtml = computed(() => {
        const text = codeText.value || ''
        const lang = normLang.value
        try {
            const langs = lowlight.listLanguages()
            // 先精确匹配，再查别名映射（html→xml、js→javascript 等）
            const target = langs.includes(lang) ? lang : LANG_ALIASES[lang]
            if (target && langs.includes(target)) {
                const tree = lowlight.highlight(target, text)
                return astToHtml(tree)
            }
            return escapeHtml(text)
        } catch (e) {
            console.error('[code-block] highlight error:', e)
            return escapeHtml(text)
        }
    })

    const copied = ref(false)
    let copyTimer: ReturnType<typeof setTimeout> | null = null

    const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
    const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(codeText.value)
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = codeText.value
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
        }
        copied.value = true
        if (copyTimer) clearTimeout(copyTimer)
        copyTimer = setTimeout(() => { copied.value = false }, 2000)
    }

    return { hideActions, language, theme, canRun, ideLanguage, ideOpen, codeText, lineCount, highlightedHtml, copied, copyIcon, checkIcon, copyCode }
}
