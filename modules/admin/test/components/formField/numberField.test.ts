/**
 * formField/numberField 组件测试
 * @see modules/admin/components/table/formField/numberField.vue
 *
 * UInput type="number" + v-model.number 绑定到 form[col.jsName]
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
    // 模拟 v-model.number 行为：将输入值通过 Number() 转换后 emit
    template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
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
    name: 'age',
    jsName: 'age',
    dataType: 'number',
    columnType: 'PgInteger',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('formField/numberField.vue', () => {
  it('渲染 type=number 的 UInput 并绑定数字值', async () => {
    const { default: NumberField } = await import('../../../components/table/formField/numberField.vue')
    const wrapper = mount(NumberField, {
      props: { col: makeCol(), form: { age: 42 } },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('42')
    expect((input.element as HTMLInputElement).type).toBe('number')
  })

  it('输入数字时 v-model.number 转换为 number 类型写回 form', async () => {
    const { default: NumberField } = await import('../../../components/table/formField/numberField.vue')
    const form = { age: 0 }
    const wrapper = mount(NumberField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('99')
    expect(form.age).toBe(99)
    expect(typeof form.age).toBe('number')
  })

  it('字段为 undefined 时 input 显示空字符串', async () => {
    const { default: NumberField } = await import('../../../components/table/formField/numberField.vue')
    const wrapper = mount(NumberField, {
      props: { col: makeCol(), form: {} },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    // undefined 显示为空
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('使用不同 jsName 列也能正确绑定', async () => {
    const { default: NumberField } = await import('../../../components/table/formField/numberField.vue')
    const form = { count: 10 }
    const wrapper = mount(NumberField, {
      props: { col: makeCol({ jsName: 'count', name: 'count' }), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('10')
    await input.setValue('25')
    expect(form.count).toBe(25)
  })
})
