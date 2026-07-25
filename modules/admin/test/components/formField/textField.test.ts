/**
 * formField/textField 组件测试
 * @see modules/admin/components/table/formField/textField.vue
 *
 * 简单的 UInput 包装：v-model 绑定到 form[col.jsName]
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
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
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
    name: 'title',
    jsName: 'title',
    dataType: 'string',
    columnType: 'PgVarchar',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('formField/textField.vue', () => {
  it('渲染 UInput 并绑定 form[col.jsName]', async () => {
    const { default: TextField } = await import('../../../components/table/formField/textField.vue')
    const wrapper = mount(TextField, {
      props: { col: makeCol(), form: { title: 'hello' } },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('hello')
  })

  it('输入更新时通过 v-model 写回 form 对象', async () => {
    const { default: TextField } = await import('../../../components/table/formField/textField.vue')
    const form = { title: 'old' }
    const wrapper = mount(TextField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('new-value')
    // v-model 绑定到 form[col.jsName]，应直接更新 form.title
    expect(form.title).toBe('new-value')
  })

  it('使用不同 jsName 的列也能正确绑定', async () => {
    const { default: TextField } = await import('../../../components/table/formField/textField.vue')
    const form = { description: 'initial' }
    const wrapper = mount(TextField, {
      props: { col: makeCol({ jsName: 'description' }), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('initial')
    await input.setValue('changed')
    expect(form.description).toBe('changed')
  })

  it('form 中字段为 undefined 时 input 显示空字符串', async () => {
    const { default: TextField } = await import('../../../components/table/formField/textField.vue')
    const wrapper = mount(TextField, {
      props: { col: makeCol(), form: {} },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
