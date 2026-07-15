/**
 * Monaco Editor: CDN loading + initialization + formatting
 */
export function useMonacoEditor(
  modelValue: () => string,
  language: () => string,
  theme: () => string,
  readOnly: () => boolean,
  fontSize: () => number,
  autoFormat: () => boolean,
  formatOptions: () => any,
  onUpdate: (val: string) => void,
  onReady: (editor: any) => void,
) {
  const editorContainer = ref<HTMLElement | null>(null)
  let editor: any = null
  let monaco: any = null

  const CDN_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'

  function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  async function loadMonaco(): Promise<any> {
    if ((window as any).monaco) {
      monaco = (window as any).monaco
      return monaco
    }

    await loadScript(`${CDN_BASE}/loader.js`)

    return new Promise((resolve) => {
      ;(window as any).require.config({ paths: { vs: CDN_BASE } })
      ;(window as any).require(['vs/editor/editor.main'], () => {
        monaco = (window as any).monaco
        resolve(monaco)
      })
    })
  }

  async function formatEditorCode() {
    if (!editor || !monaco || !autoFormat()) return
    const model = editor.getModel()
    if (!model) return

    try {
      const formatAction = editor.getAction('editor.action.formatDocument')
      if (formatAction) {
        await formatAction.run()
        const newValue = editor.getValue()
        onUpdate(newValue)
      }
    } catch (_) { /* Some languages have no formatter, silently ignore */ }
  }

  async function initEditor() {
    await loadMonaco()

    editor = monaco.editor.create(editorContainer.value, {
      value: modelValue(),
      language: language(),
      theme: theme(),
      readOnly: readOnly(),
      fontSize: fontSize(),
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: formatOptions().tabSize,
    })

    editor.onDidChangeModelContent(() => {
      onUpdate(editor.getValue())
    })

    onReady(editor)

    nextTick(() => formatEditorCode())
  }

  watch(modelValue, async (newVal) => {
    if (!editor) return
    const current = editor.getValue()
    if (newVal === current) return
    editor.setValue(newVal)
    await nextTick()
    formatEditorCode()
  })

  watch(language, (newLang) => {
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel(), newLang)
      nextTick(() => formatEditorCode())
    }
  })

  watch(theme, (newTheme) => {
    if (monaco) monaco.editor.setTheme(newTheme)
  })

  onMounted(() => {
    initEditor()
  })

  onBeforeUnmount(() => {
    if (editor) {
      editor.dispose()
      editor = null
    }
  })

  return {
    editorContainer,
    getEditor: () => editor,
    getMonaco: () => monaco,
    formatCode: formatEditorCode,
  }
}
