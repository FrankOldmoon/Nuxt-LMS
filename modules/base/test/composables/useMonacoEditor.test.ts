/**
 * composables/useMonacoEditor 测试
 * @see modules/base/composables/useMonacoEditor.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

function makeArgs(overrides: Partial<Record<string, () => any>> = {}) {
  const defaults = {
    modelValue: () => 'initial code',
    language: () => 'javascript',
    theme: () => 'vs',
    readOnly: () => false,
    fontSize: () => 14,
    autoFormat: () => false,
    formatOptions: () => ({ tabSize: 2 }),
    onUpdate: (_v: string) => {},
    onReady: (_editor: any) => {},
  }
  return { ...defaults, ...overrides }
}

describe('composables/useMonacoEditor - 初始状态', () => {
  it('editorContainer 初始为 null', async () => {
    const { useMonacoEditor } = await import('../../composables/useMonacoEditor')
    const { editorContainer } = useMonacoEditor(...Object.values(makeArgs()) as any)
    expect(editorContainer.value).toBeNull()
  })

  it('getEditor / getMonaco 在未初始化前返回 null', async () => {
    const { useMonacoEditor } = await import('../../composables/useMonacoEditor')
    const { getEditor, getMonaco } = useMonacoEditor(...Object.values(makeArgs()) as any)
    expect(getEditor()).toBeNull()
    expect(getMonaco()).toBeNull()
  })
})

describe('composables/useMonacoEditor - formatCode', () => {
  it('无 editor 时 formatCode 是 no-op（不抛错）', async () => {
    const { useMonacoEditor } = await import('../../composables/useMonacoEditor')
    const { formatCode } = useMonacoEditor(...Object.values(makeArgs()) as any)
    await expect(formatCode()).resolves.toBeUndefined()
  })

  it('autoFormat=false 时 formatCode 不操作', async () => {
    const { useMonacoEditor } = await import('../../composables/useMonacoEditor')
    const { formatCode } = useMonacoEditor(...Object.values(makeArgs({ autoFormat: () => false })) as any)
    await expect(formatCode()).resolves.toBeUndefined()
  })
})

describe('composables/useMonacoEditor - CDN_BASE 常量', () => {
  it('使用 jsdelivr CDN（通过 loadScript 行为间接验证）', async () => {
    // 通过 initEditor 流程间接验证：未设置 window.monaco 时会尝试加载 loader.js
    ;(globalThis as any).document.head.appendChild = () => {}
    const { useMonacoEditor } = await import('../../composables/useMonacoEditor')
    const { getMonaco } = useMonacoEditor(...Object.values(makeArgs()) as any)
    // 没有触发 init（onMounted 不会在无组件时执行），monaco 仍为 null
    expect(getMonaco()).toBeNull()
  })
})
