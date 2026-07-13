/**
 * useConfigEditor composable 测试
 * @see modules/lms/composables/useConfigEditor.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'
import { ref, reactive } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useConfigEditor', () => {
  it('返回 config 默认对象（包含 ai/question/homework 等所有分组）', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { config } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    expect(config.ai).toBeDefined()
    expect(config.ai.enabled).toBe(true)
    expect(config.ai.mode).toBe('api')
    expect(config.question).toBeDefined()
    expect(config.question.submitExp).toBe(2)
    expect(config.homework).toBeDefined()
    expect(config.chapter).toBeDefined()
    expect(config.race).toBeDefined()
    expect(config.quiz).toBeDefined()
    expect(config.general).toBeDefined()
    expect(config.course).toBeDefined()
    expect(config.chapterBtns).toBeDefined()
    expect(config.courseBtns).toBeDefined()
    expect(config.user).toBeDefined()
    expect(config.home).toBeDefined()
    expect(config.courseList).toBeDefined()
    expect(config.chapterPage).toBeDefined()
    expect(config.storage).toBeDefined()
  })

  it('aiModeOpts 返回 api/local/ollama 三个选项', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { aiModeOpts } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    expect(aiModeOpts.value).toHaveLength(3)
    const values = aiModeOpts.value.map((o: any) => o.value)
    expect(values).toEqual(['api', 'local', 'ollama'])
  })

  it('ttsGenderOpts 返回 female/male', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { ttsGenderOpts } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    expect(ttsGenderOpts.value).toHaveLength(2)
    const values = ttsGenderOpts.value.map((o: any) => o.value)
    expect(values).toEqual(['female', 'male'])
  })

  it('defaultViewOpts 返回 grid/list', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { defaultViewOpts } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    expect(defaultViewOpts.value).toHaveLength(2)
    const values = defaultViewOpts.value.map((o: any) => o.value)
    expect(values).toEqual(['grid', 'list'])
  })

  it('modelValue 变化时 deepMerge 到 config', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const props = reactive<{ modelValue: Record<string, any> | null; hideCourse: boolean }>({
      modelValue: null,
      hideCourse: false,
    })
    const emit = vi.fn()
    const { config } = useConfigEditor(props, emit)
    expect(config.ai.mode).toBe('api')
    props.modelValue = { ai: { mode: 'ollama', model: 'llama3' } }
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(config.ai.mode).toBe('ollama')
    expect(config.ai.model).toBe('llama3')
    // 未覆盖的字段保留默认值
    expect(config.ai.enabled).toBe(true)
  })

  it('config 变化时 emit update:modelValue', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { config } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    emit.mockClear()
    config.ai.mode = 'local'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(emit).toHaveBeenCalledWith('update:modelValue', expect.any(Object))
    const emitted = emit.mock.calls[0]![1]
    expect(emitted.ai.mode).toBe('local')
  })

  it('getConfig 返回深拷贝（修改不影响 config）', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { config, getConfig } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    const data = getConfig()
    expect(data.ai).toBeDefined()
    data.ai.mode = 'modified'
    expect(config.ai.mode).toBe('api') // 原始未被修改
  })

  it('getConfig hideCourse=true 时删除 course 字段', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { getConfig } = useConfigEditor({ modelValue: null, hideCourse: true }, emit)
    const data = getConfig()
    expect(data.course).toBeUndefined()
  })

  it('getConfig hideCourse=false 时保留 course 字段', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { getConfig } = useConfigEditor({ modelValue: null, hideCourse: false }, emit)
    const data = getConfig()
    expect(data.course).toBeDefined()
  })

  it('hideCourse computed 跟随 props', async () => {
    const { useConfigEditor } = await import('../../composables/useConfigEditor')
    const emit = vi.fn()
    const { hideCourse } = useConfigEditor({ modelValue: null, hideCourse: true }, emit)
    expect(hideCourse.value).toBe(true)
  })
})
