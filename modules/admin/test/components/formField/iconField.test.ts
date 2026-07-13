/**
 * formField/iconField 组件测试
 * @see modules/admin/components/table/formField/iconField.vue
 *
 * 嵌套 FormInputIcon + UInput 两个输入控件，都绑定到 form[col.jsName]
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

// 桩 FormInputIcon 子组件（Nuxt 自动导入的组件名）
const _globalStubs = {
  FormInputIcon: {
    template: '<div class="form-input-icon"><input type="text" class="icon-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ['modelValue', 'placeholder', 'size'],
  },
  UInput: {
    template: '<input type="text" class="text-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
    name: 'menuIcon',
    jsName: 'menuIcon',
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

describe('formField/iconField.vue', () => {
  it('同时渲染 FormInputIcon 和 UInput 两个控件', async () => {
    const { default: IconField } = await import('../../../components/table/formField/iconField.vue')
    const wrapper = mount(IconField, {
      props: { col: makeCol(), form: { menuIcon: 'book' } },
      global: _globalConfig,
    })
    expect(wrapper.find('.form-input-icon').exists()).toBe(true)
    expect(wrapper.find('.text-input').exists()).toBe(true)
  })

  it('两个控件都绑定到 form[col.jsName]', async () => {
    const { default: IconField } = await import('../../../components/table/formField/iconField.vue')
    const wrapper = mount(IconField, {
      props: { col: makeCol(), form: { menuIcon: 'home' } },
      global: _globalConfig,
    })
    const iconInput = wrapper.find('.icon-input')
    const textInput = wrapper.find('.text-input')
    expect((iconInput.element as HTMLInputElement).value).toBe('home')
    expect((textInput.element as HTMLInputElement).value).toBe('home')
  })

  it('通过 UInput 输入时 v-model 写回 form[col.jsName]', async () => {
    const { default: IconField } = await import('../../../components/table/formField/iconField.vue')
    const form = { menuIcon: '' }
    const wrapper = mount(IconField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const textInput = wrapper.find('.text-input')
    await textInput.setValue('star')
    expect(form.menuIcon).toBe('star')
  })

  it('通过 FormInputIcon 输入时 v-model 写回 form[col.jsName]', async () => {
    const { default: IconField } = await import('../../../components/table/formField/iconField.vue')
    const form = { menuIcon: '' }
    const wrapper = mount(IconField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const iconInput = wrapper.find('.icon-input')
    await iconInput.setValue('settings')
    expect(form.menuIcon).toBe('settings')
  })

  it('使用不同 jsName 列也能正确绑定', async () => {
    const { default: IconField } = await import('../../../components/table/formField/iconField.vue')
    const form = { icon: 'user' }
    const wrapper = mount(IconField, {
      props: { col: makeCol({ jsName: 'icon', name: 'icon' }), form },
      global: _globalConfig,
    })
    const iconInput = wrapper.find('.icon-input')
    const textInput = wrapper.find('.text-input')
    expect((iconInput.element as HTMLInputElement).value).toBe('user')
    expect((textInput.element as HTMLInputElement).value).toBe('user')
  })
})
