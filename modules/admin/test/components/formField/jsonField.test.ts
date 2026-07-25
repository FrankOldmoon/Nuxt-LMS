/**
 * formField/jsonField 组件测试
 * @see modules/admin/components/table/formField/jsonField.vue
 *
 * UTextarea v-model 绑定到 jsonStrings[col.jsName]；
 * jsonErrors[col.jsName] 为 true 时显示错误提示
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

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
    name: 'metadata',
    jsName: 'metadata',
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

describe('formField/jsonField.vue', () => {
  it('渲染 UTextarea 并绑定 jsonStrings[col.jsName]', async () => {
    const { default: JsonField } = await import('../../../components/table/formField/jsonField.vue')
    const wrapper = mount(JsonField, {
      props: {
        col: makeCol(),
        jsonStrings: { metadata: '{"key":"value"}' },
        jsonErrors: { metadata: false },
      },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{"key":"value"}')
  })

  it('输入时 v-model 写回 jsonStrings', async () => {
    const { default: JsonField } = await import('../../../components/table/formField/jsonField.vue')
    const jsonStrings = { metadata: '' }
    const wrapper = mount(JsonField, {
      props: {
        col: makeCol(),
        jsonStrings,
        jsonErrors: { metadata: false },
      },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"new":true}')
    expect(jsonStrings.metadata).toBe('{"new":true}')
  })

  it('jsonErrors[col.jsName] = true 时显示错误提示', async () => {
    const { default: JsonField } = await import('../../../components/table/formField/jsonField.vue')
    const wrapper = mount(JsonField, {
      props: {
        col: makeCol(),
        jsonStrings: { metadata: 'invalid' },
        jsonErrors: { metadata: true },
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.form.invalidJson')
    // 错误提示元素含 text-error 类
    const errEl = wrapper.find('.text-error')
    expect(errEl.exists()).toBe(true)
  })

  it('jsonErrors[col.jsName] = false 时不显示错误提示', async () => {
    const { default: JsonField } = await import('../../../components/table/formField/jsonField.vue')
    const wrapper = mount(JsonField, {
      props: {
        col: makeCol(),
        jsonStrings: { metadata: '{}' },
        jsonErrors: { metadata: false },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.text-error').exists()).toBe(false)
  })

  it('使用不同 jsName 列也能正确绑定', async () => {
    const { default: JsonField } = await import('../../../components/table/formField/jsonField.vue')
    const jsonStrings = { config: '{"x":1}' }
    const wrapper = mount(JsonField, {
      props: {
        col: makeCol({ jsName: 'config', name: 'config' }),
        jsonStrings,
        jsonErrors: { config: false },
      },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{"x":1}')
    await textarea.setValue('{"x":2}')
    expect(jsonStrings.config).toBe('{"x":2}')
  })
})
