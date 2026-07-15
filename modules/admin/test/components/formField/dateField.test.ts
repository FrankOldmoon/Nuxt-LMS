/**
 * formField/dateField component tests
 * @see modules/admin/components/table/formField/dateField.vue
 *
 * UInput type is determined by isDateTime(col):
 *   - columnType === 'PgTimestamp' → datetime-local
 *   - Others → date
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
    name: 'publishedAt',
    jsName: 'publishedAt',
    dataType: 'date',
    columnType: 'PgDate',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('formField/dateField.vue', () => {
  it('普通日期列渲染 type=date 的 UInput', async () => {
    const { default: DateField } = await import('../../../components/table/formField/dateField.vue')
    const wrapper = mount(DateField, {
      props: { col: makeCol(), form: { publishedAt: '2026-01-01' } },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).type).toBe('date')
    expect((input.element as HTMLInputElement).value).toBe('2026-01-01')
  })

  it('PgTimestamp 列渲染 type=datetime-local', async () => {
    const { default: DateField } = await import('../../../components/table/formField/dateField.vue')
    const wrapper = mount(DateField, {
      props: {
        col: makeCol({ columnType: 'PgTimestamp', isTimestamp: true }),
        form: { publishedAt: '2026-01-01T10:00' },
      },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).type).toBe('datetime-local')
  })

  it('输入日期时 v-model 写回 form', async () => {
    const { default: DateField } = await import('../../../components/table/formField/dateField.vue')
    const form = { publishedAt: '' }
    const wrapper = mount(DateField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('2026-07-13')
    expect(form.publishedAt).toBe('2026-07-13')
  })

  it('字段为 undefined 时显示空字符串', async () => {
    const { default: DateField } = await import('../../../components/table/formField/dateField.vue')
    const wrapper = mount(DateField, {
      props: { col: makeCol(), form: {} },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('使用不同 jsName 列也能正确绑定', async () => {
    const { default: DateField } = await import('../../../components/table/formField/dateField.vue')
    const form = { startDate: '2026-03-15' }
    const wrapper = mount(DateField, {
      props: { col: makeCol({ jsName: 'startDate', name: 'startDate' }), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('2026-03-15')
    await input.setValue('2026-04-01')
    expect(form.startDate).toBe('2026-04-01')
  })
})
