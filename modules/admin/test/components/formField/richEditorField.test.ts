/**
 * formField/richEditorField component tests
 * @see modules/admin/components/table/formField/richEditorField.vue
 *
 * Wrapped in ClientOnly:
 * - moduleLms enabled + RichEditor component resolvable → use RichEditor
 * - Otherwise → fallback to UTextarea (binds to jsonStrings[col.jsName])
 * Shows error message when jsonErrors[col.jsName] = true
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockRuntimeConfig } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

const _globalStubs = {
  UTextarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
    props: ['modelValue', 'rows', 'size', 'placeholder'],
  },
  ClientOnly: {
    template: '<div class="client-only"><slot /><slot name="fallback" /></div>',
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

function makeCol(over: Partial<any> = {}) {
  return {
    name: 'content',
    jsName: 'content',
    dataType: 'json',
    columnType: 'PgJSONB',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('formField/richEditorField.vue', () => {
  it('moduleLms 未启用时回退 UTextarea 绑定 jsonStrings', async () => {
    // Default useRuntimeConfig().public.moduleLms = false (nuxt-stubs initial value)
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: false } })
    const { default: RichEditorField } = await import('../../../components/table/formField/richEditorField.vue')
    const wrapper = mount(RichEditorField, {
      props: {
        col: makeCol(),
        form: {},
        jsonStrings: { content: '{"type":"doc"}' },
        jsonErrors: { content: false },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{"type":"doc"}')
  })

  it('jsonErrors[col.jsName] = true 时显示错误提示', async () => {
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: false } })
    const { default: RichEditorField } = await import('../../../components/table/formField/richEditorField.vue')
    const wrapper = mount(RichEditorField, {
      props: {
        col: makeCol(),
        form: {},
        jsonStrings: { content: 'invalid' },
        jsonErrors: { content: true },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.form.invalidJson')
    expect(wrapper.find('.text-error').exists()).toBe(true)
  })

  it('jsonErrors[col.jsName] = false 时不显示错误提示', async () => {
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: false } })
    const { default: RichEditorField } = await import('../../../components/table/formField/richEditorField.vue')
    const wrapper = mount(RichEditorField, {
      props: {
        col: makeCol(),
        form: {},
        jsonStrings: { content: '{}' },
        jsonErrors: { content: false },
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.text-error').exists()).toBe(false)
  })

  it('回退 UTextarea 输入时 v-model 写回 jsonStrings', async () => {
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: false } })
    const { default: RichEditorField } = await import('../../../components/table/formField/richEditorField.vue')
    const jsonStrings = { content: '' }
    const wrapper = mount(RichEditorField, {
      props: {
        col: makeCol(),
        form: {},
        jsonStrings,
        jsonErrors: { content: false },
      },
      global: _globalConfig,
    })
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"updated":true}')
    expect(jsonStrings.content).toBe('{"updated":true}')
  })

  it('接受 rowCourseId prop（不报错）', async () => {
    setMockRuntimeConfig({ public: { moduleBase: true, moduleLms: false } })
    const { default: RichEditorField } = await import('../../../components/table/formField/richEditorField.vue')
    const wrapper = mount(RichEditorField, {
      props: {
        col: makeCol(),
        form: {},
        jsonStrings: { content: '{}' },
        jsonErrors: { content: false },
        rowCourseId: 42,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('rowCourseId')).toBe(42)
  })
})
