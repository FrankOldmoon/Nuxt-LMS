/**
 * formField/selectField 组件测试
 * @see modules/admin/components/table/formField/selectField.vue
 *
 * USelect v-model 绑定到 form[col.jsName]，items 来自 col.enumValues
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
  USelect: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'valueKey', 'optionAttribute', 'placeholder', 'size'],
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
    name: 'status',
    jsName: 'status',
    dataType: 'string',
    columnType: 'PgEnum',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    enumValues: ['draft', 'published', 'archived'],
    ...over,
  }
}

describe('formField/selectField.vue', () => {
  it('渲染 USelect 并展示 enumValues 作为选项', async () => {
    const { default: SelectField } = await import('../../../components/table/formField/selectField.vue')
    const wrapper = mount(SelectField, {
      props: { col: makeCol(), form: { status: 'draft' } },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].attributes('value')).toBe('draft')
    expect(options[1].attributes('value')).toBe('published')
    expect(options[2].attributes('value')).toBe('archived')
  })

  it('选项 label 与 value 相同（来自 enumValues）', async () => {
    const { default: SelectField } = await import('../../../components/table/formField/selectField.vue')
    const wrapper = mount(SelectField, {
      props: { col: makeCol(), form: { status: '' } },
      global: _globalConfig,
    })
    const options = wrapper.find('select').findAll('option')
    expect(options[0].text()).toBe('draft')
    expect(options[1].text()).toBe('published')
  })

  it('切换选项时 v-model 写回 form', async () => {
    const { default: SelectField } = await import('../../../components/table/formField/selectField.vue')
    const form = { status: 'draft' }
    const wrapper = mount(SelectField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    await select.setValue('published')
    expect(form.status).toBe('published')
  })

  it('enumValues 为空数组时无选项', async () => {
    const { default: SelectField } = await import('../../../components/table/formField/selectField.vue')
    const wrapper = mount(SelectField, {
      props: { col: makeCol({ enumValues: [] }), form: { status: '' } },
      global: _globalConfig,
    })
    const options = wrapper.find('select').findAll('option')
    expect(options).toHaveLength(0)
  })

  it('使用不同 jsName 列也能正确绑定', async () => {
    const { default: SelectField } = await import('../../../components/table/formField/selectField.vue')
    const form = { kind: 'a' }
    const wrapper = mount(SelectField, {
      props: {
        col: makeCol({ jsName: 'kind', name: 'kind', enumValues: ['a', 'b'] }),
        form,
      },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).value).toBe('a')
    await select.setValue('b')
    expect(form.kind).toBe('b')
  })
})
