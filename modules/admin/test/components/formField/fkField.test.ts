/**
 * formField/fkField component tests
 * @see modules/admin/components/table/formField/fkField.vue
 *
 * USelectMenu v-model binds to form[col.jsName], items come from fkOptions[col.jsName]
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
  USelectMenu: {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><option v-for="o in items" :key="o.id" :value="o.id">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'valueKey', 'optionAttribute', 'placeholder', 'loading', 'searchable', 'size'],
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
    name: 'courseId',
    jsName: 'courseId',
    dataType: 'number',
    columnType: 'PgInteger',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    fkTable: 'courses',
    ...over,
  }
}

describe('formField/fkField.vue', () => {
  it('渲染 USelectMenu 并展示 fkOptions[col.jsName] 选项', async () => {
    const { default: FkField } = await import('../../../components/table/formField/fkField.vue')
    const wrapper = mount(FkField, {
      props: {
        col: makeCol(),
        form: { courseId: 1 },
        fkOptions: { courseId: [{ id: 1, label: 'Course A' }, { id: 2, label: 'Course B' }] },
        fkLoading: { courseId: false },
      },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    const options = select.findAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].attributes('value')).toBe('1')
    expect(options[0].text()).toBe('Course A')
    expect(options[1].attributes('value')).toBe('2')
  })

  it('fkOptions[col.jsName] 缺失时回退为空数组', async () => {
    const { default: FkField } = await import('../../../components/table/formField/fkField.vue')
    const wrapper = mount(FkField, {
      props: {
        col: makeCol(),
        form: { courseId: 0 },
        fkOptions: {},
        fkLoading: {},
      },
      global: _globalConfig,
    })
    const options = wrapper.find('select').findAll('option')
    expect(options).toHaveLength(0)
  })

  it('切换选项时 v-model 写回 form（number 类型）', async () => {
    const { default: FkField } = await import('../../../components/table/formField/fkField.vue')
    const form = { courseId: 1 }
    const wrapper = mount(FkField, {
      props: {
        col: makeCol(),
        form,
        fkOptions: { courseId: [{ id: 1, label: 'Course A' }, { id: 2, label: 'Course B' }] },
        fkLoading: { courseId: false },
      },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    await select.setValue('2')
    expect(form.courseId).toBe(2)
    expect(typeof form.courseId).toBe('number')
  })

  it('使用不同 jsName 列也能正确绑定 fkOptions', async () => {
    const { default: FkField } = await import('../../../components/table/formField/fkField.vue')
    const wrapper = mount(FkField, {
      props: {
        col: makeCol({ jsName: 'categoryId', name: 'categoryId', fkTable: 'categories' }),
        form: { categoryId: 5 },
        fkOptions: { categoryId: [{ id: 5, label: 'Cat 5' }, { id: 6, label: 'Cat 6' }] },
        fkLoading: { categoryId: false },
      },
      global: _globalConfig,
    })
    const select = wrapper.find('select')
    expect((select.element as HTMLSelectElement).value).toBe('5')
  })
})
