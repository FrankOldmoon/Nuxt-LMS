/**
 * formField component tests (wrapper)
 * @see modules/admin/components/table/formField.vue
 *
 * Dispatches to the corresponding child component based on the widget type returned by widgetFor(col):
 * - 'date' → FormFieldDate
 * - 'boolean' → FormFieldBoolean
 * - 'select' → FormFieldSelect
 * - 'fk' → FormFieldFk
 * - 'number' → FormFieldNumber
 * - 'richEditor' → FormFieldRichEditor
 * - 'json' → FormFieldJson
 * - 'icon' → FormFieldIcon
 * - 'file' → FormFieldFile
 * - 'imageCropper' → FormFieldImageCropper
 * - 'image' → FormFieldImage
 * - 'password' → FormFieldPassword
 * - Others ('text' / 'readonly') → FormFieldText
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
 * Stub all child FormField* components as divs with data-widget attributes,
 * to facilitate asserting which child component the wrapper actually renders.
 */
const _globalStubs = {
  FormFieldDate: { template: '<div data-widget="date" />' },
  FormFieldBoolean: { template: '<div data-widget="boolean" />' },
  FormFieldSelect: { template: '<div data-widget="select" />' },
  FormFieldFk: { template: '<div data-widget="fk" />' },
  FormFieldNumber: { template: '<div data-widget="number" />' },
  FormFieldRichEditor: { template: '<div data-widget="richEditor" />' },
  FormFieldJson: { template: '<div data-widget="json" />' },
  FormFieldIcon: { template: '<div data-widget="icon" />' },
  FormFieldFile: { template: '<div data-widget="file" />' },
  FormFieldImageCropper: { template: '<div data-widget="imageCropper" />' },
  FormFieldImage: { template: '<div data-widget="image" />' },
  FormFieldPassword: { template: '<div data-widget="password" />' },
  FormFieldText: { template: '<div data-widget="text" />' },
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
    // Note: jsName cannot be createdAt/updatedAt/deletedAt (these return 'readonly' in widgetFor)
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
    // widgetFor returns 'readonly', no corresponding branch in wrapper → goes to v-else (FormFieldText)
    expect(wrapper.find('[data-widget="text"]').exists()).toBe(true)
  })
})
