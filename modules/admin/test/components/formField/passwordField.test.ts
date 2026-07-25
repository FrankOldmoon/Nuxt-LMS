/**
 * formField/passwordField 组件测试
 * @see modules/admin/components/table/formField/passwordField.vue
 *
 * UInput type="password" 绑定到 form[col.jsName]
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
    template: '<input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
    name: 'password',
    jsName: 'password',
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

describe('formField/passwordField.vue', () => {
  it('渲染 type=password 的 UInput', async () => {
    const { default: PasswordField } = await import('../../../components/table/formField/passwordField.vue')
    const wrapper = mount(PasswordField, {
      props: { col: makeCol(), form: { password: 'secret123' } },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).type).toBe('password')
    expect((input.element as HTMLInputElement).value).toBe('secret123')
  })

  it('输入密码时 v-model 写回 form', async () => {
    const { default: PasswordField } = await import('../../../components/table/formField/passwordField.vue')
    const form = { password: '' }
    const wrapper = mount(PasswordField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('new-password')
    expect(form.password).toBe('new-password')
  })

  it('字段为 undefined 时显示空字符串', async () => {
    const { default: PasswordField } = await import('../../../components/table/formField/passwordField.vue')
    const wrapper = mount(PasswordField, {
      props: { col: makeCol(), form: {} },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect((input.element as HTMLInputElement).type).toBe('password')
  })
})
