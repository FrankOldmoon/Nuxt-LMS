/**
 * formField 组件测试（wrapper）
 * @see modules/admin/components/table/formField.vue
 *
 * 根据 widgetFor(col) 返回的 widget 类型分发到对应的子组件（组件带 Table 前缀 + Field 后缀）：
 * - 'date' → TableFormFieldDateField
 * - 'boolean' → TableFormFieldBooleanField
 * - 'select' → TableFormFieldSelectField
 * - 'fk' → TableFormFieldFkField
 * - 'number' → TableFormFieldNumberField
 * - 'richEditor' → TableFormFieldRichEditorField
 * - 'json' → TableFormFieldJsonField
 * - 'icon' → TableFormFieldIconField
 * - 'file' → TableFormFieldFileField
 * - 'imageCropper' → TableFormFieldImageCropperField
 * - 'image' → TableFormFieldImageField
 * - 'password' → TableFormFieldPasswordField
 * - 其他（'text' / 'readonly'）→ TableFormFieldTextField
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

/**
 * 把所有子 FormField* 组件桩为带 data-widget 属性的 div，
 * 便于断言 wrapper 实际渲染了哪个子组件。
 */
const _globalStubs = {
  TableFormFieldDateField: { template: '<div data-widget="date" />' },
  TableFormFieldBooleanField: { template: '<div data-widget="boolean" />' },
  TableFormFieldSelectField: { template: '<div data-widget="select" />' },
  TableFormFieldFkField: { template: '<div data-widget="fk" />' },
  TableFormFieldNumberField: { template: '<div data-widget="number" />' },
  TableFormFieldRichEditorField: { template: '<div data-widget="richEditor" />' },
  TableFormFieldJsonField: { template: '<div data-widget="json" />' },
  TableFormFieldIconField: { template: '<div data-widget="icon" />' },
  TableFormFieldFileField: { template: '<div data-widget="file" />' },
  TableFormFieldImageCropperField: { template: '<div data-widget="imageCropper" />' },
  TableFormFieldImageField: { template: '<div data-widget="image" />' },
  TableFormFieldPasswordField: { template: '<div data-widget="password" />' },
  TableFormFieldTextField: { template: '<div data-widget="text" />' },
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

function baseProps(col: any) {
  return {
    col,
    form: {},
    jsonStrings: {},
    jsonErrors: {},
    fkOptions: {},
    fkLoading: {},
  }
}

describe('formField.vue (wrapper)', () => {
  it('dataType=string 默认分发到 FormFieldText', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol()),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="text"]').exists()).toBe(true)
  })

  it('dataType=boolean 分发到 FormFieldBoolean', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'boolean', columnType: 'PgBoolean', jsName: 'isActive', name: 'isActive' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="boolean"]').exists()).toBe(true)
  })

  it('dataType=number 分发到 FormFieldNumber', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'number', columnType: 'PgInteger', jsName: 'age', name: 'age' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="number"]').exists()).toBe(true)
  })

  it('dataType=json + jsName!=content 分发到 FormFieldJson', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'json', columnType: 'PgJSONB', jsName: 'metadata', name: 'metadata' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="json"]').exists()).toBe(true)
  })

  it('dataType=json + jsName=content 分发到 FormFieldRichEditor', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'json', columnType: 'PgJSONB', jsName: 'content', name: 'content' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="richEditor"]').exists()).toBe(true)
  })

  it('jsName=password 分发到 FormFieldPassword', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ jsName: 'password', name: 'password' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="password"]').exists()).toBe(true)
  })

  it('fkTable 有值时分发到 FormFieldFk', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'number', columnType: 'PgInteger', jsName: 'courseId', name: 'courseId', fkTable: 'courses' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="fk"]').exists()).toBe(true)
  })

  it('enumValues 非空时分发到 FormFieldSelect', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'string', columnType: 'PgEnum', jsName: 'status', name: 'status', enumValues: ['a', 'b'] })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="select"]').exists()).toBe(true)
  })

  it('isTimestamp=true 分发到 FormFieldDate', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    // 注意：jsName 不能用 createdAt/updatedAt/deletedAt（这些在 widgetFor 中返回 'readonly'）
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ dataType: 'date', columnType: 'PgTimestamp', jsName: 'publishedAt', name: 'publishedAt', isTimestamp: true })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="date"]').exists()).toBe(true)
  })

  it('dataType=string + jsName 以 files 结尾分发到 FormFieldFile', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ jsName: 'files', name: 'files' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="file"]').exists()).toBe(true)
  })

  it('dataType=string + jsName 以 icon 结尾分发到 FormFieldIcon', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ jsName: 'menuIcon', name: 'menuIcon' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="icon"]').exists()).toBe(true)
  })

  it('dataType=string + jsName 以 url 结尾分发到 FormFieldImage', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ jsName: 'avatarUrl', name: 'avatarUrl' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="image"]').exists()).toBe(true)
  })

  it('dataType=string + jsName 含 avatar 分发到 FormFieldImageCropper', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ jsName: 'avatar', name: 'avatar' })),
      global: _globalConfig,
    })
    expect(wrapper.find('[data-widget="imageCropper"]').exists()).toBe(true)
  })

  it('isAutoIncrement=true 分发到 FormFieldText（widget=readonly 走默认分支）', async () => {
    const { default: FormField } = await import('../../components/table/formField.vue')
    const wrapper = mount(FormField, {
      props: baseProps(makeCol({ jsName: 'id', name: 'id', dataType: 'number', columnType: 'PgSerial', isPrimaryKey: true, isAutoIncrement: true })),
      global: _globalConfig,
    })
    // widgetFor 返回 'readonly'，wrapper 中无对应分支 → 走 v-else（FormFieldText）
    expect(wrapper.find('[data-widget="text"]').exists()).toBe(true)
  })
})
