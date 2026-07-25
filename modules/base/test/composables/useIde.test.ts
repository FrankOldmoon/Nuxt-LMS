/**
 * composables/useIde 测试
 * @see modules/base/composables/useIde.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useIde - langItems', () => {
  it('返回 4 种语言选项', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { langItems } = useIde(() => undefined, () => 'python', () => {})
    expect(langItems.value).toHaveLength(4)
    const values = langItems.value.map((i: any) => i.value)
    expect(values).toEqual(['python', 'javascript', 'cpp', 'java'])
  })
})

describe('composables/useIde - currentLang 初始化', () => {
  it('language=javascript 时 currentLang=javascript', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { currentLang } = useIde(() => undefined, () => 'javascript', () => {})
    expect(currentLang.value).toBe('javascript')
  })

  it('language=未知值时默认 python', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { currentLang } = useIde(() => undefined, () => 'rust', () => {})
    expect(currentLang.value).toBe('python')
  })

  it('language=cpp 时 currentLang=cpp', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { currentLang } = useIde(() => undefined, () => 'cpp', () => {})
    expect(currentLang.value).toBe('cpp')
  })
})

describe('composables/useIde - monacoLanguage', () => {
  it('monacoLanguage 与 currentLang 一致', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { monacoLanguage, currentLang } = useIde(() => undefined, () => 'java', () => {})
    expect(monacoLanguage.value).toBe(currentLang.value)
    expect(monacoLanguage.value).toBe('java')
  })
})

describe('composables/useIde - code 初始化', () => {
  it('无 modelValue 时使用默认 Python 代码', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { code } = useIde(() => undefined, () => 'python', () => {})
    expect(code.value).toContain('Hello, Pyodide')
  })

  it('有 modelValue 时使用 modelValue', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { code } = useIde(() => 'print(42)', () => 'python', () => {})
    expect(code.value).toBe('print(42)')
  })

  it('javascript 默认代码包含 console.log', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { code } = useIde(() => undefined, () => 'javascript', () => {})
    expect(code.value).toContain('Hello, JavaScript')
  })
})

describe('composables/useIde - code 变化触发 onUpdate', () => {
  it('修改 code 时调用 onUpdate', async () => {
    const { useIde } = await import('../../composables/useIde')
    const calls: string[] = []
    const { code } = useIde(() => undefined, () => 'python', (v) => calls.push(v))
    code.value = 'print(99)'
    await nextTick() // watch(code) 回调异步执行
    expect(calls).toContain('print(99)')
  })
})

describe('composables/useIde - clearOutput', () => {
  it('clearOutput 清空 output', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { output, clearOutput } = useIde(() => undefined, () => 'python', () => {})
    output.value = 'some output'
    clearOutput()
    expect(output.value).toBe('')
  })
})

describe('composables/useIde - runCode', () => {
  it('无 runner 时 runCode 直接返回（不抛错）', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { runCode, running, output } = useIde(() => undefined, () => 'python', () => {})
    await runCode()
    expect(running.value).toBe(false)
    expect(output.value).toBe('')
  })
})

describe('composables/useIde - inputText', () => {
  it('inputText 初始为空', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { inputText } = useIde(() => undefined, () => 'python', () => {})
    expect(inputText.value).toBe('')
  })

  it('可设置 inputText', async () => {
    const { useIde } = await import('../../composables/useIde')
    const { inputText } = useIde(() => undefined, () => 'python', () => {})
    inputText.value = 'hello\nworld'
    expect(inputText.value).toBe('hello\nworld')
  })
})
