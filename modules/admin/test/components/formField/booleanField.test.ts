/**
 * formField/booleanField component tests
 * @see modules/admin/components/table/formField/booleanField.vue
 *
 * USwitch binds to form[col.jsName]
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
  USwitch: {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'label'],
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
    name: 'isActive',
    jsName: 'isActive',
    dataType: 'boolean',
    columnType: 'PgBoolean',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('formField/booleanField.vue', () => {
  it('渲染 USwitch 并绑定 form[col.jsName] = true', async () => {
    const { default: BooleanField } = await import('../../../components/table/formField/booleanField.vue')
    const wrapper = mount(BooleanField, {
      props: { col: makeCol(), form: { isActive: true } },
      global: _globalConfig,
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('绑定为 false 时 checkbox 未选中', async () => {
    const { default: BooleanField } = await import('../../../components/table/formField/booleanField.vue')
    const wrapper = mount(BooleanField, {
      props: { col: makeCol(), form: { isActive: false } },
      global: _globalConfig,
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('切换 checkbox 时 v-model 写回 form', async () => {
    const { default: BooleanField } = await import('../../../components/table/formField/booleanField.vue')
    const form = { isActive: false }
    const wrapper = mount(BooleanField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    expect(form.isActive).toBe(true)
  })

  it('使用不同 jsName 列也能正确绑定', async () => {
    const { default: BooleanField } = await import('../../../components/table/formField/booleanField.vue')
    const form = { enabled: true }
    const wrapper = mount(BooleanField, {
      props: { col: makeCol({ jsName: 'enabled', name: 'enabled' }), form },
      global: _globalConfig,
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    await checkbox.setValue(false)
    expect(form.enabled).toBe(false)
  })
})
