/**
 * formField/imageField 组件测试
 * @see modules/admin/components/table/formField/imageField.vue
 *
 * UInput v-model 绑定 form[col.jsName]（图片 URL），有值时显示 UAvatar 预览
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
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  UAvatar: {
    template: '<span class="avatar" :data-src="src" />',
    props: ['src', 'size'],
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
    name: 'avatarUrl',
    jsName: 'avatarUrl',
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

describe('formField/imageField.vue', () => {
  it('渲染 UInput 并绑定 form[col.jsName]', async () => {
    const { default: ImageField } = await import('../../../components/table/formField/imageField.vue')
    const wrapper = mount(ImageField, {
      props: { col: makeCol(), form: { avatarUrl: 'https://example.com/a.png' } },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('https://example.com/a.png')
  })

  it('form[col.jsName] 有值时渲染 UAvatar 预览', async () => {
    const { default: ImageField } = await import('../../../components/table/formField/imageField.vue')
    const wrapper = mount(ImageField, {
      props: { col: makeCol(), form: { avatarUrl: 'https://example.com/a.png' } },
      global: _globalConfig,
    })
    const avatar = wrapper.find('.avatar')
    expect(avatar.exists()).toBe(true)
    expect(avatar.attributes('data-src')).toBe('https://example.com/a.png')
  })

  it('form[col.jsName] 为空时不渲染 UAvatar', async () => {
    const { default: ImageField } = await import('../../../components/table/formField/imageField.vue')
    const wrapper = mount(ImageField, {
      props: { col: makeCol(), form: { avatarUrl: '' } },
      global: _globalConfig,
    })
    expect(wrapper.find('.avatar').exists()).toBe(false)
  })

  it('form[col.jsName] 为 undefined 时不渲染 UAvatar', async () => {
    const { default: ImageField } = await import('../../../components/table/formField/imageField.vue')
    const wrapper = mount(ImageField, {
      props: { col: makeCol(), form: {} },
      global: _globalConfig,
    })
    expect(wrapper.find('.avatar').exists()).toBe(false)
  })

  it('输入 URL 时 v-model 写回 form', async () => {
    const { default: ImageField } = await import('../../../components/table/formField/imageField.vue')
    const form = { avatarUrl: '' }
    const wrapper = mount(ImageField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('https://example.com/new.png')
    expect(form.avatarUrl).toBe('https://example.com/new.png')
    // UAvatar 应随之出现
    expect(wrapper.find('.avatar').exists()).toBe(true)
  })
})
