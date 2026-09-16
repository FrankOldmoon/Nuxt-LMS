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

/** 外部 Python 在线运行器（codeflow）地址；换环境改这里即可 */
export const CODEFLOW_BASE_URL = 'http://10.28.1.151:3010/apps/codeflow/'

/**
 * UTF-8 安全的 base64url（无 padding）。
 * - btoa 只能处理 Latin-1，代码里的中文注释/字符串需先按 UTF-8 取字节；
 * - 转成 base64url 后只剩 A-Za-z0-9-_，放进 query 不会被 "+"（会被解码成空格）
 *   和 "/" 破坏，也不需要再做 URL 转义，与 codeflow 自身 share 链接的格式一致。
 */
export function toBase64UrlUtf8(text: string): string {
  const bytes = new TextEncoder().encode(String(text ?? ''))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] as number)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 拼 codeflow 运行链接：{base}?code=<base64url>&run=1 */
export function buildCodeflowUrl(code: string): string {
  return `${CODEFLOW_BASE_URL}?code=${toBase64UrlUtf8(code)}&run=1`
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

    // ── 运行入口 ──
    // Python 改走外部在线运行器（codeflow，iframe 打开）；其余语言仍用内置 IDE
    const isPython = computed(() => ['python', 'py', 'python3'].includes(normLang.value))
    const codeflowOpen = ref(false)
    const codeflowSrc = ref('')

    function openRunner() {
        if (!isPython.value) {
            ideOpen.value = true
            return
        }
        codeflowSrc.value = buildCodeflowUrl(codeText.value)
        codeflowOpen.value = true
    }

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

    return { hideActions, language, theme, canRun, ideLanguage, ideOpen, codeText, lineCount, highlightedHtml, copied, copyIcon, checkIcon, copyCode, isPython, codeflowOpen, codeflowSrc, openRunner }
}
