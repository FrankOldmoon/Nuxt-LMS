/**
 * formField/fileField 组件测试
 * @see modules/admin/components/table/formField/fileField.vue
 *
 * 嵌套 FormInputFile 子组件；form[col.jsName] 为非空数组时展示文件链接列表
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

// 桩 FormInputFile 子组件（Nuxt 自动导入的组件名）
const _globalStubs = {
  FormInputFile: {
    template: '<div class="form-input-file"><input type="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ['modelValue', 'multiple', 'placeholder', 'size'],
  },
  UIcon: {
    template: '<span class="icon" />',
    props: ['name'],
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
    name: 'fileUrls',
    jsName: 'fileUrls',
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

describe('formField/fileField.vue', () => {
  it('渲染 FormInputFile 子组件', async () => {
    const { default: FileField } = await import('../../../components/table/formField/fileField.vue')
    const wrapper = mount(FileField, {
      props: { col: makeCol(), form: { fileUrls: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.form-input-file').exists()).toBe(true)
  })

  it('form[col.jsName] 为非空数组时渲染文件链接列表', async () => {
    const { default: FileField } = await import('../../../components/table/formField/fileField.vue')
    const wrapper = mount(FileField, {
      props: {
        col: makeCol(),
        form: { fileUrls: ['https://example.com/a.pdf', 'https://example.com/b.pdf'] },
      },
      global: _globalConfig,
    })
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(2)
    expect(links[0].attributes('href')).toBe('https://example.com/a.pdf')
    expect(links[0].text()).toBe('https://example.com/a.pdf')
  })

  it('form[col.jsName] 为空数组时不渲染链接', async () => {
    const { default: FileField } = await import('../../../components/table/formField/fileField.vue')
    const wrapper = mount(FileField, {
      props: { col: makeCol(), form: { fileUrls: [] } },
      global: _globalConfig,
    })
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('form[col.jsName] 为 undefined 时不渲染链接', async () => {
    const { default: FileField } = await import('../../../components/table/formField/fileField.vue')
    const wrapper = mount(FileField, {
      props: { col: makeCol(), form: {} },
      global: _globalConfig,
    })
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('链接 target=_blank（新窗口打开）', async () => {
    const { default: FileField } = await import('../../../components/table/formField/fileField.vue')
    const wrapper = mount(FileField, {
      props: { col: makeCol(), form: { fileUrls: ['https://example.com/a.pdf'] } },
      global: _globalConfig,
    })
    const link = wrapper.find('a')
    expect(link.attributes('target')).toBe('_blank')
  })
})
